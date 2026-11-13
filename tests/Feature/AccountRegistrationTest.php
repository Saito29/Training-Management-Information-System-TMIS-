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

    private function signInAccountManager(array $permissions): User
    {
        $roleId = (int) DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id');
        DB::table('role_permissions')->where('role_id', $roleId)->delete();
        if ($permissions !== []) {
            DB::table('role_permissions')->insert(array_map(
                static fn (string $permission): array => ['role_id' => $roleId, 'permission' => $permission],
                $permissions,
            ));
        }

        $user = User::factory()->create(['role_id' => $roleId, 'region_id' => 4, 'org_id' => 1]);
        $hash = Hash::make('Account-manager-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);

        return $user;
    }

    private function createAccountManager(int $roleId, int $credentialId, int $officeId, string $email): User
    {
        $user = User::factory()->create([
            'email' => $email,
            'role_id' => $roleId,
            'role_credential_id' => $credentialId,
            'region_id' => 4,
            'org_id' => $officeId,
        ]);
        $hash = Hash::make('Account-manager-password-123!');
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
        $user = User::factory()->create([
            'role_id' => DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id'),
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);
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

    public function test_system_administrator_accounts_are_visible_without_becoming_assignable_roles(): void
    {
        $this->signInAdministrator();
        $administratorRoleId = DB::table('user_roles')->where('name', 'System Administrator')->value('role_id');
        $encoderRoleId = DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id');
        $pendingAdministrator = User::factory()->create([
            'email' => 'pending-admin@example.com',
            'role_id' => $administratorRoleId,
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);
        User::factory()->create([
            'email' => 'inactive-admin@example.com',
            'role_id' => $administratorRoleId,
            'status' => 'Approved & Accepted',
            'active_status' => 0,
        ]);
        User::factory()->create([
            'email' => 'approved-encoder@example.com',
            'role_id' => $encoderRoleId,
            'status' => 'Approved & Accepted',
            'active_status' => 1,
        ]);
        User::factory()->create([
            'email' => 'pending-encoder@example.com',
            'role_id' => $encoderRoleId,
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);

        $this->getJson(route('accounts.index'))
            ->assertOk()
            ->assertJsonCount(2, 'users')
            ->assertJsonFragment(['email' => 'pending-admin@example.com', 'role' => 'System Administrator'])
            ->assertJsonFragment(['email' => 'pending-encoder@example.com', 'role' => 'Data Encoder']);
        $options = $this->getJson(route('accounts.options'))->assertOk();
        $this->assertSame(false, in_array('System Administrator', $options->json('roles'), true));
        $this->assertSame(false, array_key_exists('System Administrator', $options->json('credentialTypes')));

        $managementData = $this->getJson('/ui/data', ['X-TMIS-PAGE' => '/app/admin/administration/details/all-status'])
            ->assertOk()
            ->assertJsonCount(5, 'stores.tmis-users');
        $this->assertSame(false, in_array('System Administrator', $managementData->json('roles'), true));
        $managementAccounts = $managementData->json('stores.tmis-users');
        $this->assertSame(true, in_array($pendingAdministrator->email, array_column($managementAccounts, 'email'), true));
        $this->assertSame(true, in_array('Inactive', array_column($managementAccounts, 'status'), true));
        $this->patchJson(route('accounts.update', $pendingAdministrator), ['decision' => 'Approved'])->assertNotFound();
        $this->assertDatabaseHas('users', [
            'user_id' => $pendingAdministrator->user_id,
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);

        $registration = $this->registration();
        $registration['email'] = 'admin-role@example.com';
        $registration['role'] = 'System Administrator';
        $this->postJson(route('accounts.store'), $registration)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
        $this->assertDatabaseMissing('users', ['email' => 'admin-role@example.com']);
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

    public function test_account_permissions_allow_scoped_registration_but_require_approval_permission(): void
    {
        Mail::fake();
        $this->signInAccountManager(['administration.read', 'administration.create']);

        $this->get(route('admin.administration.create.register'))->assertOk();
        $this->get(route('admin.administration.update.for-approval'))->assertNotFound();
        $this->getJson(route('accounts.options'))->assertOk();

        $this->postJson(route('accounts.store'), $this->registration())->assertCreated();
        $pendingAccount = User::where('email', 'new@example.com')->firstOrFail();
        $this->patchJson(route('accounts.update', $pendingAccount), ['decision' => 'Approved'])->assertForbidden();
        $this->assertDatabaseHas('users', ['user_id' => $pendingAccount->user_id, 'status' => 'Pending approval']);

        DB::table('role_permissions')->insert([
            'role_id' => $pendingAccount->role_id,
            'permission' => 'administration.approve',
        ]);
        $this->get(route('admin.administration.update.for-approval'))->assertOk();
        $this->patchJson(route('accounts.update', $pendingAccount), ['decision' => 'Approved'])->assertOk();
        $this->assertDatabaseHas('users', ['user_id' => $pendingAccount->user_id, 'status' => 'Approved & Accepted', 'active_status' => 1]);

        $otherOffice = DB::table('organization')->where('org_id', 2)->value('name');
        $outOfScopeRegistration = $this->registration();
        $outOfScopeRegistration['email'] = 'out-of-scope@example.com';
        $outOfScopeRegistration['office'] = $otherOffice;

        $this->postJson(route('accounts.store'), $outOfScopeRegistration)->assertForbidden();
        $this->assertDatabaseMissing('users', ['email' => 'out-of-scope@example.com']);
    }

    public function test_account_edit_permission_cannot_approve_a_pending_account(): void
    {
        $manager = $this->signInAccountManager(['administration.read', 'administration.edit']);
        $pendingAccount = User::factory()->create([
            'role_id' => DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id'),
            'region_id' => 4,
            'org_id' => 1,
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);

        $this->patchJson(route('system.accounts.update', $pendingAccount->user_id), [
            'action' => 'update',
            'role_id' => $pendingAccount->role_id,
            'region_id' => 4,
            'org_id' => 1,
            'status' => 'Approved & Accepted',
            'active_status' => 1,
        ])->assertForbidden();

        $this->assertDatabaseHas('users', [
            'user_id' => $pendingAccount->user_id,
            'status' => 'Pending approval',
            'active_status' => 0,
            'role_id' => $manager->role_id,
        ]);
    }

    public function test_same_role_account_profiles_have_distinct_permissions_and_office_scoped_lists(): void
    {
        $roleId = (int) DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id');
        DB::table('role_permissions')->where('role_id', $roleId)->delete();
        DB::table('role_permissions')->insert([
            ['role_id' => $roleId, 'permission' => 'administration.read'],
            ['role_id' => $roleId, 'permission' => 'administration.edit'],
        ]);
        $evaluatorCredentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => $roleId,
            'name' => 'Account evaluator',
            'created_at' => now(),
        ], 'role_credential_id');
        $encoderCredentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => $roleId,
            'name' => 'Account encoder',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('role_credential_permissions')->insert([
            ['role_credential_id' => $evaluatorCredentialId, 'permission' => 'administration.delete'],
            ['role_credential_id' => $evaluatorCredentialId, 'permission' => 'administration.approve'],
        ]);
        DB::table('role_credential_denied_permissions')->insert([
            'role_credential_id' => $encoderCredentialId,
            'permission' => 'administration.edit',
        ]);
        $evaluator = $this->createAccountManager($roleId, $evaluatorCredentialId, 1, 'account-evaluator@example.com');
        $encoder = $this->createAccountManager($roleId, $encoderCredentialId, 1, 'account-encoder@example.com');
        $outOfOfficeAccount = User::factory()->create([
            'email' => 'other-office@example.com',
            'role_id' => $roleId,
            'region_id' => 4,
            'org_id' => 2,
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);
        $page = '/app/admin/administration/details/all-status';

        $this->actingAs($evaluator)->withSession([
            'auth.verified_user_id' => $evaluator->user_id,
            'auth.password_fingerprint' => hash('sha256', DB::table('user_auth')->where('user_id', $evaluator->user_id)->value('password_hash')),
        ]);
        $evaluatorPermissions = $this->withHeaders(['X-TMIS-PAGE' => $page])->getJson('/ui/data')->assertOk()->json('permissions');
        $this->assertSame(true, in_array('administration.read', $evaluatorPermissions, true));
        $this->assertSame(true, in_array('administration.delete', $evaluatorPermissions, true));
        $this->getJson('/operations/administration')->assertNotFound();
        $this->getJson(route('accounts.index'))->assertOk()->assertJsonMissing(['email' => $outOfOfficeAccount->email]);
        $this->patchJson(route('accounts.update', $outOfOfficeAccount), ['decision' => 'Approved'])->assertNotFound();

        $encoderPermissions = $this->actingAs($encoder)->withSession([
            'auth.verified_user_id' => $encoder->user_id,
            'auth.password_fingerprint' => hash('sha256', DB::table('user_auth')->where('user_id', $encoder->user_id)->value('password_hash')),
        ])->withHeaders(['X-TMIS-PAGE' => $page])->getJson('/ui/data')->assertOk()->json('permissions');
        $this->assertSame(true, in_array('administration.read', $encoderPermissions, true));
        $this->assertSame(false, in_array('administration.edit', $encoderPermissions, true));
        $this->assertSame(false, in_array('administration.delete', $encoderPermissions, true));
        $this->assertSame(false, in_array('administration.approve', $encoderPermissions, true));
        $this->assertSame($evaluator->role_id, $encoder->role_id);
    }
}
