<?php

namespace Tests\Feature;

use App\Mail\Authentication\PasswordResetLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\PendingMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class AccountRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function signInAdministrator(): User
    {
        $user = User::factory()->create(['role_id' => DB::table('user_roles')->where('name', 'System Administrator')->value('role_id')]);
        $hash = Hash::make('Valid-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);

        return $user;
    }

    private function registration(): array
    {
        return ['firstName' => 'New', 'lastName' => 'Account', 'email' => 'new@example.com', 'role' => 'Data Encoder', 'region' => 'Region IV-A', 'office' => 'DA - SAAD', 'position' => 'Officer'];
    }

    public function test_new_account_can_set_password_but_cannot_login_until_approved(): void
    {
        Mail::fake();
        $admin = $this->signInAdministrator();
        $this->postJson(route('accounts.store'), $this->registration() + ['active_status' => 1, 'status' => 'approved & accepted'])->assertCreated()->assertJsonPath('mailSent', true);
        $user = User::where('email', 'new@example.com')->firstOrFail();
        $this->assertSame($admin->user_id + 1, $user->user_id);
        $this->assertSame('Pending approval', $user->status);
        $this->assertSame(0, (int) $user->active_status);
        $this->getJson(route('accounts.index'))->assertOk()->assertJsonFragment(['email' => $user->email, 'status' => 'Pending approval']);
        $mail = Mail::sent(PasswordResetLink::class)->first();
        $this->assertTrue($mail->accountSetup);
        parse_str(parse_url($mail->resetUrl, PHP_URL_QUERY), $query);
        $this->assertTrue(Password::tokenExists($user, $query['token']));
        $this->post(route('logout'));
        $this->get($mail->resetUrl)->assertOk();
        $this->post(route('password.update'), $query + ['password' => 'New-password-123!', 'password_confirmation' => 'New-password-123!'])->assertRedirect(route('login'));
        $this->assertTrue(Hash::check('New-password-123!', DB::table('user_auth')->where('user_id', $user->user_id)->value('password_hash')));
        $this->assertFalse($user->fresh()->isEligibleForLogin());
        $this->post('/login', ['email' => $user->email, 'password' => 'New-password-123!'])->assertSessionHasErrors('email');
        $this->assertGuest();
        $hash = DB::table('user_auth')->where('user_id', $admin->user_id)->value('password_hash');
        $this->actingAs($admin)->withSession(['auth.verified_user_id' => $admin->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);
        $this->patchJson(route('accounts.update', $user), ['decision' => 'Approved'])->assertOk();
        $this->assertTrue($user->fresh()->isEligibleForLogin());
        $this->patchJson(route('accounts.update', $user), ['decision' => 'Rejected'])->assertConflict();
    }

    public function test_rejection_keeps_account_inactive_and_other_roles_cannot_manage_accounts(): void
    {
        $admin = $this->signInAdministrator();
        $user = User::factory()->create(['status' => 'Pending approval', 'active_status' => 0]);
        $this->patchJson(route('accounts.update', $user), ['decision' => 'Rejected'])->assertOk();
        $this->assertDatabaseHas('users', ['user_id' => $user->user_id, 'status' => 'Rejected', 'active_status' => 0]);
        $admin->role_id = DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id');
        $admin->save();
        $this->getJson(route('accounts.index'))->assertForbidden();
        $this->postJson(route('accounts.store'), $this->registration())->assertForbidden();
        $this->patchJson(route('accounts.update', $user), ['decision' => 'Approved'])->assertForbidden();
    }

    public function test_duplicate_email_and_incorrect_region_office_are_rejected(): void
    {
        Mail::fake();
        $this->signInAdministrator();
        User::factory()->create(['email' => 'new@example.com']);
        $this->postJson(route('accounts.store'), $this->registration())->assertUnprocessable()->assertJsonValidationErrors('email');
        $data = $this->registration();
        $data['email'] = 'different@example.com';
        $data['office'] = 'Nonexistent office';
        $this->postJson(route('accounts.store'), $data)->assertUnprocessable()->assertJsonValidationErrors('office');
        Mail::assertNothingSent();
    }

    public function test_registration_assigns_only_a_credential_owned_by_the_selected_role(): void
    {
        Mail::fake();
        $this->signInAdministrator();
        $options = $this->getJson(route('accounts.options'))->assertOk();
        $options->assertJsonPath('credentialTypes.Data Encoder.0.name', 'Encoder (default)')
            ->assertJsonFragment(['name' => 'Evaluator'])
            ->assertJsonFragment(['name' => 'Data Encoder - Head']);

        $credentialId = DB::table('role_credentials')
            ->where('role_id', DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id'))
            ->where('name', 'Evaluator')
            ->value('role_credential_id');
        $this->postJson(route('accounts.store'), $this->registration() + ['credentialTypeId' => $credentialId])
            ->assertCreated();

        $user = User::where('email', 'new@example.com')->firstOrFail();
        $this->assertDatabaseHas('users', [
            'user_id' => $user->user_id,
            'role_id' => $user->role_id,
            'role_credential_id' => $credentialId,
        ]);
        $this->getJson(route('accounts.index'))->assertJsonPath('users.0.credentialType', 'Evaluator');

        $headCredentialId = DB::table('role_credentials')->where('name', 'Data Encoder - Head')->value('role_credential_id');
        $data = $this->registration();
        $data['email'] = 'mismatched@example.com';
        $data['credentialTypeId'] = $headCredentialId;
        $this->postJson(route('accounts.store'), $data)->assertUnprocessable()->assertJsonValidationErrors('credentialTypeId');
        $this->assertDatabaseMissing('users', ['email' => 'mismatched@example.com']);
    }

    public function test_registration_options_include_credential_permission_grants_and_blocks(): void
    {
        $this->signInAdministrator();
        $roleId = DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id');
        $credentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => $roleId,
            'name' => 'Permission preview credential',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('role_credential_permissions')->insert([
            'role_credential_id' => $credentialId,
            'permission' => 'participants.read',
        ]);
        DB::table('role_credential_denied_permissions')->insert([
            'role_credential_id' => $credentialId,
            'permission' => 'trainings.submit',
        ]);

        $this->getJson(route('accounts.options'))->assertOk()
            ->assertJsonFragment([
                'id' => $credentialId,
                'name' => 'Permission preview credential',
                'permissions' => ['participants.read'],
                'deniedPermissions' => ['trainings.submit'],
            ]);
    }

    public function test_mail_failure_keeps_pending_account_and_reports_delivery_failure(): void
    {
        $this->signInAdministrator();
        $pending = \Mockery::mock(PendingMail::class);
        $pending->shouldReceive('send')->once()->andThrow(new TransportException('Mail unavailable'));
        Mail::shouldReceive('to')->once()->with('new@example.com')->andReturn($pending);
        $this->postJson(route('accounts.store'), $this->registration())->assertCreated()->assertJsonPath('mailSent', false);
        $this->assertDatabaseHas('users', ['email' => 'new@example.com', 'status' => 'Pending approval', 'active_status' => 0]);
    }
}
