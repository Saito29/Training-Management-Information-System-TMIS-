<?php

namespace Tests\Feature\Authentication;

use App\Mail\Authentication\LoginVerificationCode;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\PendingMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    /** @param array<string, mixed> $attributes */
    private function account(array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        DB::table('user_auth')->insert([
            'user_id' => $user->user_id,
            'password_hash' => Hash::make('Valid-password-123!'),
        ]);

        return $user;
    }

    private function signIn(User $user): string
    {
        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertRedirect(route('verification'));

        return Mail::sent(LoginVerificationCode::class)->last()->code;
    }

    public function test_disabled_two_factor_signs_in_directly_without_a_code_or_email(): void
    {
        Mail::fake();
        $this->freezeTime();
        $user = $this->account();
        DB::table('user_auth')->where('user_id', $user->user_id)->update(['email_two_factor_enabled' => 0]);
        $this->withSession(['login_challenge' => ['id' => 999, 'binding' => 'stale']]);
        $sessionId = session()->getId();

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertRedirect(route('admin.dashboard.dashboard'))
            ->assertSessionMissing('login_challenge');

        $this->assertAuthenticatedAs($user);
        $this->assertNotSame($sessionId, session()->getId());
        Mail::assertNothingSent();
        $this->assertDatabaseCount('user_verify', 0);
        $this->assertDatabaseHas('user_auth', ['user_id' => $user->user_id, 'last_login_at' => now()]);
        $this->get(route('admin.dashboard.dashboard'))->assertOk();
        $this->get(route('verification'))->assertRedirect(route('admin.dashboard.dashboard'));
        DB::table('user_auth')->where('user_id', $user->user_id)->update(['password_hash' => Hash::make('Changed-password-123!')]);
        $this->get(route('admin.dashboard.dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_disabled_two_factor_still_requires_the_correct_password(): void
    {
        Mail::fake();
        $user = $this->account();
        DB::table('user_auth')->where('user_id', $user->user_id)->update(['email_two_factor_enabled' => 0]);

        $this->post('/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        Mail::assertNothingSent();
        $this->assertDatabaseCount('user_verify', 0);
    }

    #[DataProvider('ineligibleAccounts')]
    public function test_disabled_two_factor_does_not_bypass_account_eligibility(array $attributes): void
    {
        Mail::fake();
        $user = $this->account($attributes);
        DB::table('user_auth')->where('user_id', $user->user_id)->update(['email_two_factor_enabled' => 0]);

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        Mail::assertNothingSent();
        $this->assertDatabaseCount('user_verify', 0);
    }

    public function test_null_two_factor_setting_is_rejected_by_the_new_schema(): void
    {
        $user = $this->account();
        $this->expectException(QueryException::class);

        DB::table('user_auth')->where('user_id', $user->user_id)->update(['email_two_factor_enabled' => null]);
    }

    public function test_eligible_user_receives_a_hashed_six_digit_code_before_authentication(): void
    {
        Mail::fake();
        $user = $this->account();
        $before = (array) DB::table('users')->where('user_id', $user->user_id)->first();

        $code = $this->signIn($user);

        $this->assertGuest();
        Mail::assertSent(LoginVerificationCode::class, fn (LoginVerificationCode $mail): bool => $mail->hasTo($user->email));
        $this->assertMatchesRegularExpression('/^[0-9]{6}$/', $code);
        $this->assertTrue(Hash::check($code, DB::table('user_verify')->value('code_hash')));
        $this->assertSame($before, (array) DB::table('users')->where('user_id', $user->user_id)->first());
        $this->get('/two-factor')->assertOk()->assertSee('Check your inbox.')->assertDontSee($code);
    }

    #[DataProvider('ineligibleAccounts')]
    public function test_ineligible_account_is_refused_without_sending_email(array $attributes): void
    {
        Mail::fake();
        $user = $this->account($attributes);

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        Mail::assertNothingSent();
        $this->assertDatabaseCount('user_verify', 0);
    }

    /** @return array<string, array{array<string, mixed>}> */
    public static function ineligibleAccounts(): array
    {
        return [
            'inactive but approved' => [['active_status' => 0]],
            'invalid active status' => [['active_status' => 2]],
            'active but pending review' => [['status' => 'Pending approval']],
            'active but rejected' => [['status' => 'Rejected']],
        ];
    }

    public function test_disabled_role_cannot_receive_a_code(): void
    {
        Mail::fake();
        $user = $this->account();
        DB::table('user_roles')->where('role_id', $user->role_id)->update(['is_active' => 0]);

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])->assertSessionHasErrors('email');

        Mail::assertNothingSent();
        $this->assertGuest();
    }

    public function test_incorrect_password_cannot_receive_a_code(): void
    {
        Mail::fake();
        $user = $this->account();

        $this->post('/login', ['email' => $user->email, 'password' => 'wrong-password'])->assertSessionHasErrors('email');

        Mail::assertNothingSent();
        $this->assertGuest();
    }

    public function test_valid_code_signs_in_once_and_updates_only_authentication_data(): void
    {
        Mail::fake();
        $user = $this->account();
        $before = (array) DB::table('users')->where('user_id', $user->user_id)->first();
        $code = $this->signIn($user);

        $this->post('/two-factor', ['verification_code' => $code])->assertRedirect(route('admin.dashboard.dashboard'));

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull(DB::table('user_verify')->value('invalidated_at'));
        $this->assertNotNull(DB::table('user_auth')->value('last_login_at'));
        $this->assertSame($before, (array) DB::table('users')->where('user_id', $user->user_id)->first());
        $this->get('/app/admin/dashboard/dashboard')->assertOk();
        $this->post('/logout')->assertRedirect(route('login'));
        $this->post('/two-factor', ['verification_code' => $code])->assertSessionHasErrors('verification_code');
        $this->assertGuest();
    }

    public function test_admin_pages_and_verification_cannot_be_opened_without_signing_in(): void
    {
        $this->get('/app/admin/dashboard/dashboard')->assertRedirect(route('login'));
        $this->get('/two-factor')->assertRedirect(route('login'));
    }

    public function test_account_deactivated_after_password_check_cannot_verify(): void
    {
        Mail::fake();
        $user = $this->account();
        $code = $this->signIn($user);
        DB::table('users')->where('user_id', $user->user_id)->update(['active_status' => 0]);

        $this->post('/two-factor', ['verification_code' => $code])->assertSessionHasErrors('verification_code');

        $this->assertGuest();
    }

    public function test_expired_code_cannot_verify(): void
    {
        Mail::fake();
        $user = $this->account();
        $code = $this->signIn($user);
        $this->travel(5)->minutes();

        $this->post('/two-factor', ['verification_code' => $code])->assertSessionHasErrors('verification_code');

        $this->assertGuest();
    }

    public function test_three_incorrect_attempts_invalidate_the_code(): void
    {
        Mail::fake();
        $user = $this->account();
        $code = $this->signIn($user);

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->post('/two-factor', ['verification_code' => '000000'])->assertSessionHasErrors('verification_code');
        }
        $this->post('/two-factor', ['verification_code' => $code])->assertSessionHasErrors('verification_code');

        $this->assertGuest();
        $this->assertSame(3, DB::table('user_verify')->value('attempts'));
    }

    public function test_resend_obeys_cooldown_and_replaces_the_previous_code(): void
    {
        Mail::fake();
        $user = $this->account();
        $oldCode = $this->signIn($user);
        $this->post('/two-factor/resend')->assertSessionHasErrors('verification_code');
        $this->travel(31)->seconds();

        $this->post('/two-factor/resend')->assertRedirect(route('verification'));

        Mail::assertSent(LoginVerificationCode::class, 2);
        $newCode = Mail::sent(LoginVerificationCode::class)->last()->code;
        $this->post('/two-factor', ['verification_code' => $oldCode])->assertSessionHasErrors('verification_code');
        $this->post('/two-factor', ['verification_code' => $newCode])->assertRedirect(route('admin.dashboard.dashboard'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_code_is_bound_to_the_browser_session(): void
    {
        Mail::fake();
        $code = $this->signIn($this->account());
        $this->withSession(['login_challenge' => ['id' => DB::table('user_verify')->value('id'), 'binding' => 'another-browser']]);

        $this->post('/two-factor', ['verification_code' => $code])->assertSessionHasErrors('verification_code');

        $this->assertGuest();
    }

    public function test_mail_contains_the_code_and_expiration(): void
    {
        $mail = new LoginVerificationCode('827491');

        $mail->assertSeeInHtml('827491');
        $mail->assertSeeInText('827491');
        $mail->assertSeeInHtml('Forgot password? Request a reset link');
        $mail->assertSeeInText(rtrim(config('app.url'), '/').'/forgot-password');
        $mail->assertSeeInHtml('alt="Department of Agriculture"', false);
        $mail->assertSeeInHtml('data:image/png;base64,', false);
        $mail->assertSeeInText('5 minutes');
    }

    public function test_verification_email_escapes_dynamic_html(): void
    {
        $mail = new LoginVerificationCode('<script>alert(1)</script>');

        $mail->assertSeeInHtml('&lt;script&gt;alert(1)&lt;/script&gt;', false);
        $mail->assertDontSeeInHtml('<script>', false);
    }

    public function test_missing_or_unknown_roles_are_ineligible(): void
    {
        $unassigned = User::factory()->make(['role_id' => null]);
        $unknown = User::factory()->make(['role_id' => 999]);

        $this->assertFalse($unassigned->isEligibleForLogin());
        $this->assertFalse($unknown->isEligibleForLogin());
    }

    public function test_more_than_three_resends_are_refused(): void
    {
        Mail::fake();
        $this->signIn($this->account());

        for ($resend = 0; $resend < 3; $resend++) {
            $this->travel(31)->seconds();
            $this->post('/two-factor/resend')->assertRedirect(route('verification'));
        }
        $this->travel(31)->seconds();
        $this->post('/two-factor/resend')->assertSessionHasErrors('verification_code');

        Mail::assertSent(LoginVerificationCode::class, 4);
    }

    public function test_login_attempts_are_rate_limited(): void
    {
        Mail::fake();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/login', ['email' => 'unknown@example.test', 'password' => 'incorrect'])
                ->assertSessionHasErrors('email');
        }
        $this->post('/login', ['email' => 'unknown@example.test', 'password' => 'incorrect'])
            ->assertRedirect(route('login'))->assertSessionHas('toast_type', 'warning');
        $this->postJson('/login', ['email' => 'unknown@example.test', 'password' => 'incorrect'])->assertTooManyRequests();

        Mail::assertNothingSent();
    }

    public function test_mail_delivery_failure_does_not_leave_a_valid_challenge(): void
    {
        $user = $this->account();
        $pendingMail = Mockery::mock(PendingMail::class);
        Mail::shouldReceive('to')->once()->with($user->email)->andReturn($pendingMail);
        $pendingMail->shouldReceive('send')->once()->andThrow(new TransportException('Mail service unavailable'));

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertDatabaseCount('user_verify', 0);
        $this->assertFalse(session()->has('login_challenge'));
    }

    public function test_disabled_account_loses_access_after_signing_in(): void
    {
        $user = $this->account();
        $this->actingAs($user);
        $user->active_status = 0;
        $user->save();

        $this->get('/app/admin/dashboard/dashboard')->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_restarting_login_cannot_bypass_the_four_email_limit(): void
    {
        Mail::fake();
        $user = $this->account();
        for ($send = 0; $send < 4; $send++) {
            $this->signIn($user);
        }

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertSessionHasErrors('verification_code');

        Mail::assertSent(LoginVerificationCode::class, 4);
    }

    public function test_unknown_email_and_wrong_password_have_identical_information_toasts(): void
    {
        Mail::fake();
        $user = $this->account();
        $message = 'Unable to sign in. Please check your details and try again.';

        foreach (['unknown@example.test', $user->email] as $email) {
            $this->post('/login', ['email' => $email, 'password' => 'wrong'])
                ->assertSessionHasErrors(['email' => $message])->assertSessionHas('toast_type', 'info');
        }

        Mail::assertNothingSent();
    }

    public function test_empty_and_malformed_codes_produce_validation_feedback(): void
    {
        Mail::fake();
        $this->signIn($this->account());

        $this->post('/two-factor', [])->assertSessionHasErrors(['verification_code' => 'Enter the 6-digit verification code.']);
        $this->post('/two-factor', ['verification_code' => 'abcdef'])
            ->assertSessionHasErrors(['verification_code' => 'Enter a valid 6-digit verification code.']);

        $this->assertGuest();
    }

    public function test_authentication_without_the_completed_two_factor_session_is_refused(): void
    {
        $this->actingAs($this->account());

        $this->get('/app/admin/dashboard/dashboard')->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_restarting_login_reuses_the_verification_row_and_resets_resend_counters(): void
    {
        Mail::fake();
        $user = $this->account();
        $this->signIn($user);
        $id = DB::table('user_verify')->value('id');
        $this->assertDatabaseHas('user_verify', ['id' => $id, 'attempts' => 0, 'resend_count' => 0, 'last_send_count' => 0]);
        $this->travel(31)->seconds();
        $this->post('/two-factor/resend')->assertRedirect(route('verification'));
        $this->assertDatabaseHas('user_verify', ['id' => $id, 'resend_count' => 1, 'last_send_count' => 1]);
        $this->signIn($user);
        $this->assertDatabaseCount('user_verify', 1);
        $this->assertDatabaseHas('user_verify', ['id' => $id, 'attempts' => 0, 'resend_count' => 0, 'last_send_count' => 0, 'invalidated_at' => null]);
    }
}
