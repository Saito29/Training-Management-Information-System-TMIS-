<?php

namespace Tests\Feature\Authentication;

use App\Mail\Authentication\LoginVerificationCode;
use App\Mail\Authentication\PasswordResetLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\PendingMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Mockery;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private function account(): User
    {
        $user = User::factory()->create();
        DB::table('user_auth')->insert([
            'user_id' => $user->user_id,
            'password_hash' => Hash::make('Original-password-123!'),
        ]);

        return $user;
    }

    /** @return array{email: string, token: string} */
    private function requestLink(User $user): array
    {
        $this->post('/forgot-password', ['email' => $user->email])->assertRedirect(route('password.request'));
        $mail = Mail::sent(PasswordResetLink::class)->last();
        parse_str(parse_url($mail->resetUrl, PHP_URL_QUERY), $parameters);

        return $parameters;
    }

    public function test_existing_and_unknown_addresses_receive_the_same_generic_response(): void
    {
        Mail::fake();
        $user = $this->account();
        $message = 'If your details match an account, a password reset link will be sent. Please check your inbox and spam folder.';

        $this->post('/forgot-password', ['email' => 'unknown@example.test'])->assertSessionHas('status', $message)->assertSessionHas('toast_type', 'info');
        $parameters = $this->requestLink($user);

        $this->assertSame($message, session('status'));
        Mail::assertSent(PasswordResetLink::class, fn (PasswordResetLink $mail): bool => $mail->hasTo($user->email));
        $this->assertTrue(Hash::check($parameters['token'], DB::table('password_reset_tokens')->value('token')));
        $this->assertDatabaseCount('password_reset_tokens', 1);
    }

    public function test_unknown_email_shows_only_generic_information_without_sending_mail_or_creating_a_token(): void
    {
        Mail::fake();

        $this->post('/forgot-password', ['email' => 'not-registered@example.test'])
            ->assertRedirect(route('password.request'))
            ->assertSessionHas('toast_type', 'info')
            ->assertSessionHas('status', 'If your details match an account, a password reset link will be sent. Please check your inbox and spam folder.');

        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_reset_tokens', 0);
        $this->assertDatabaseCount('users', 0);
        $this->assertGuest();
    }

    public function test_account_without_saved_credentials_does_not_receive_a_reset_link(): void
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect(route('password.request'))
            ->assertSessionHas('toast_type', 'info');

        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_reset_changes_only_authentication_data_and_link_cannot_be_reused(): void
    {
        Mail::fake();
        $user = $this->account();
        $before = (array) DB::table('users')->where('user_id', $user->user_id)->first();
        $parameters = $this->requestLink($user);
        $this->get(route('password.reset', $parameters))->assertOk();

        $this->post('/reset-password', [...$parameters, 'password' => 'New-password-456!', 'password_confirmation' => 'New-password-456!'])
            ->assertRedirect(route('login'))->assertSessionHas('status', 'Your password has been reset. Sign in with your new password.');

        $this->assertTrue(Hash::check('New-password-456!', DB::table('user_auth')->value('password_hash')));
        $this->assertSame($before, (array) DB::table('users')->where('user_id', $user->user_id)->first());
        $this->assertDatabaseCount('password_reset_tokens', 0);
        $this->assertGuest();
        $this->get(route('password.reset', $parameters))->assertRedirect(route('password.request'));
    }

    public function test_reset_requires_the_session_that_opened_the_email_link(): void
    {
        Mail::fake();
        $user = $this->account();
        $parameters = $this->requestLink($user);

        $this->post('/reset-password', [...$parameters, 'password' => 'New-password-456!', 'password_confirmation' => 'New-password-456!'])->assertSessionHasErrors('token');

        $this->assertTrue(Hash::check('Original-password-123!', DB::table('user_auth')->value('password_hash')));
    }

    public function test_expired_link_is_refused_when_opened_and_submitted(): void
    {
        Mail::fake();
        $parameters = $this->requestLink($this->account());
        $this->get(route('password.reset', $parameters))->assertOk();
        $this->travel(31)->minutes();

        $this->post('/reset-password', [...$parameters, 'password' => 'New-password-456!', 'password_confirmation' => 'New-password-456!'])->assertSessionHasErrors('token');
        $this->get(route('password.reset', $parameters))->assertRedirect(route('password.request'));

        $this->assertTrue(Hash::check('Original-password-123!', DB::table('user_auth')->value('password_hash')));
    }

    public function test_reset_page_requires_a_valid_token(): void
    {
        $this->get('/reset-password')->assertRedirect(route('password.request'))->assertSessionHasErrors('email');
    }

    public function test_stale_authenticated_session_does_not_discard_a_valid_reset_link(): void
    {
        Mail::fake();
        $user = $this->account();
        $parameters = $this->requestLink($user);
        $this->actingAs($user);

        $this->get(route('password.reset', $parameters))
            ->assertOk()->assertViewIs('authentication.reset_password');

        $this->assertGuest();
    }

    public function test_changed_token_or_email_cannot_reset_a_password(): void
    {
        Mail::fake();
        $user = $this->account();
        $other = $this->account();
        $parameters = $this->requestLink($user);
        $this->get(route('password.reset', $parameters))->assertOk();

        $this->post('/reset-password', [...$parameters, 'email' => $other->email, 'password' => 'New-password-456!', 'password_confirmation' => 'New-password-456!'])->assertSessionHasErrors('token');
        $this->get(route('password.reset', [...$parameters, 'token' => str_repeat('x', 64)]))->assertRedirect(route('password.request'));

        $this->assertTrue(Hash::check('Original-password-123!', DB::table('user_auth')->where('user_id', $other->user_id)->value('password_hash')));
    }

    public function test_reset_validates_password_strength_and_confirmation(): void
    {
        Mail::fake();
        $parameters = $this->requestLink($this->account());
        $this->get(route('password.reset', $parameters))->assertOk();

        $this->post('/reset-password', [...$parameters, 'password' => 'weak', 'password_confirmation' => 'different'])->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('Original-password-123!', DB::table('user_auth')->value('password_hash')));
    }

    public function test_repeated_recovery_requests_are_throttled_without_revealing_account_existence(): void
    {
        Mail::fake();
        $user = $this->account();
        $this->requestLink($user);

        $this->post('/forgot-password', ['email' => $user->email])->assertRedirect(route('password.request'))->assertSessionHas('status');

        Mail::assertSent(PasswordResetLink::class, 1);
    }

    public function test_new_reset_link_invalidates_old_link(): void
    {
        Mail::fake();
        $user = $this->account();
        $old = $this->requestLink($user);
        $this->travel(61)->seconds();
        $new = $this->requestLink($user);

        $this->get(route('password.reset', $old))->assertRedirect(route('password.request'));
        $this->get(route('password.reset', $new))->assertOk();

        Mail::assertSent(PasswordResetLink::class, 2);
    }

    public function test_mail_failure_preserves_generic_response_and_rolls_back_token(): void
    {
        $user = $this->account();
        $pendingMail = Mockery::mock(PendingMail::class);
        Mail::shouldReceive('to')->once()->with($user->email)->andReturn($pendingMail);
        $pendingMail->shouldReceive('send')->once()->andThrow(new TransportException('Unavailable'));

        $this->post('/forgot-password', ['email' => $user->email])->assertRedirect(route('password.request'))->assertSessionHas('status');

        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_authenticated_user_cannot_open_or_submit_guest_authentication_routes_until_logout(): void
    {
        Mail::fake();
        $user = $this->account();
        $this->post('/login', ['email' => $user->email, 'password' => 'Original-password-123!']);
        $code = Mail::sent(LoginVerificationCode::class)->last()->code;
        $this->post('/two-factor', ['verification_code' => $code])->assertRedirect(route('admin.dashboard.dashboard'));

        foreach (['/', '/forgot-password', '/reset-password', '/two-factor'] as $path) {
            $this->get($path)->assertRedirect(route('admin.dashboard.dashboard'));
        }
        foreach (['/login', '/forgot-password', '/reset-password', '/two-factor', '/two-factor/resend'] as $path) {
            $this->post($path)->assertRedirect(route('admin.dashboard.dashboard'));
        }

        $this->post('/logout')->assertRedirect(route('login'));
        $this->get('/')->assertOk();
        $this->get('/forgot-password')->assertOk();
        $this->assertGuest();
    }

    public function test_changed_password_invalidates_an_existing_verified_session(): void
    {
        Mail::fake();
        $user = $this->account();
        $this->post('/login', ['email' => $user->email, 'password' => 'Original-password-123!']);
        $code = Mail::sent(LoginVerificationCode::class)->last()->code;
        $this->post('/two-factor', ['verification_code' => $code]);
        DB::table('user_auth')->where('user_id', $user->user_id)->update(['password_hash' => Hash::make('Another-password-789!')]);

        $this->get('/app/admin/dashboard/dashboard')->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_reset_email_contains_a_link_and_expiration(): void
    {
        $url = 'https://example.test/reset-password?token=example&email=person%40example.test';
        $mail = new PasswordResetLink($url);

        $mail->assertSeeInHtml($url);
        $mail->assertSeeInText($url);
        $mail->assertSeeInHtml('Reset my password');
        $mail->assertSeeInHtml('Link expired? Request a new one');
        $mail->assertSeeInText('30 minutes');
    }

    public function test_reset_invalidates_a_pending_two_factor_code(): void
    {
        Mail::fake();
        $user = $this->account();
        $this->post('/login', ['email' => $user->email, 'password' => 'Original-password-123!']);
        $code = Mail::sent(LoginVerificationCode::class)->last()->code;
        $parameters = $this->requestLink($user);
        $this->get(route('password.reset', $parameters));

        $this->post('/reset-password', [...$parameters, 'password' => 'New-password-456!', 'password_confirmation' => 'New-password-456!'])->assertRedirect(route('login'));

        $this->assertNotNull(DB::table('user_verify')->value('invalidated_at'));
        $this->post('/two-factor', ['verification_code' => $code])->assertSessionHasErrors('verification_code');
        $this->assertGuest();
    }
}
