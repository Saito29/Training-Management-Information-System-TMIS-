<?php

namespace Tests\Feature;

use App\Mail\Authentication\LoginVerificationCode;
use App\Mail\Authentication\PasswordResetLink;
use App\Mail\TrainingStatusChanged;
use App\Models\User;
use App\Support\ModuleAccess;
use App\Support\SystemBranding;
use App\Support\TrainingNotificationDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SystemSettingsFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private function account(int $role = 1, bool $withCredential = false): User
    {
        $user = User::factory()->create(['role_id' => $role]);
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => Hash::make('Valid-password-123!')]);
        if ($role === 1) {
            DB::table('system_super_admins')->insert(['user_id' => $user->user_id, 'created_at' => now(), 'updated_at' => now()]);
        }
        if ($withCredential && $role !== 1) {
            $this->assignRoleCredential($user);
            $user->refresh();
        }

        return $user;
    }

    private function signIn(User $user): void
    {
        if ((int) $user->role_id !== (int) DB::table('user_roles')->where('name', 'System Administrator')->value('role_id')) {
            $this->assignRoleCredential($user);
            $user->refresh();
        }
        $hash = DB::table('user_auth')->where('user_id', $user->user_id)->value('password_hash');
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);
    }

    private function assignRoleCredential(User $user): void
    {
        $credentialId = $user->role_credential_id;
        $isValid = $credentialId !== null && DB::table('role_credentials')
            ->where('role_credential_id', $credentialId)
            ->where('role_id', $user->role_id)
            ->where('is_active', true)
            ->exists();
        if ($isValid) {
            return;
        }

        $credentialId = DB::table('role_credentials')
            ->where('role_id', $user->role_id)
            ->where('is_active', true)
            ->value('role_credential_id');
        if ($credentialId === null) {
            $credentialId = DB::table('role_credentials')->insertGetId([
                'role_id' => $user->role_id,
                'name' => 'Feature test access profile '.$user->role_id,
                'created_at' => now(),
            ], 'role_credential_id');
        }

        DB::table('users')->where('user_id', $user->user_id)->update(['role_credential_id' => $credentialId]);
    }

    public function test_administrator_can_manage_system_settings_but_cannot_grant_maintenance_login(): void
    {
        $administrator = $this->account();
        $user = $this->account(2);
        $this->signIn($administrator);

        $this->get(route('system.settings'))->assertOk()
            ->assertSee('System availability')
            ->assertDontSee('Maintenance-only access');
        $this->postJson('/system/maintenance-access', [
            'user_ids' => [$user->user_id],
            'action' => 'grant',
        ])->assertNotFound();
    }

    public function test_administrator_can_manage_farmer_statuses_and_cannot_delete_assigned_statuses(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);

        $created = $this->postJson(route('system.record-statuses.store'), [
            'name' => 'For monitoring',
            'description' => 'Follow up with the assigned office.',
        ])->assertCreated()
            ->assertJsonPath('status.name', 'For monitoring')
            ->assertJsonPath('status.usage_count', 0);
        $statusId = $created->json('status.id');

        $this->postJson('/ui/sync', [
            'key' => 'tmis-farmers',
            'upserts' => [[
                'id' => 'FMR-STATUS-ASSIGNED',
                'first_name' => 'Status',
                'last_name' => 'Farmer',
                'status' => 'For monitoring',
                'farmerStatusId' => (string) $statusId,
            ]],
            'deletes' => [],
        ])->assertOk()
            ->assertJsonPath('stores.tmis-farmers.0.status', 'For monitoring');

        $this->patchJson(route('system.record-statuses.update', $statusId), [
            'name' => 'For follow-up',
            'description' => 'Follow up with the assigned office.',
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('status.name', 'For follow-up')
            ->assertJsonPath('status.is_active', false);

        $statuses = $this->getJson(route('system.record-statuses.index'))->assertOk()->json('statuses');
        $customStatus = collect($statuses)->firstWhere('id', $statusId);
        $this->assertSame(1, $customStatus['farmer_count']);
        $this->assertSame(1, $customStatus['usage_count']);
        $this->deleteJson(route('system.record-statuses.destroy', $statusId))
            ->assertConflict()
            ->assertJsonPath('message', 'This status is assigned to saved records and cannot be deleted.');
        $this->assertDatabaseHas('record_statuses', ['id' => $statusId, 'name' => 'For follow-up']);

        $builtIn = collect($statuses)->firstWhere('is_builtin', true);
        $this->assertNotNull($builtIn);
        $this->patchJson(route('system.record-statuses.update', $builtIn['id']), [
            'name' => 'Unavailable',
            'description' => 'Changed built-in status',
            'is_active' => false,
        ])->assertConflict();
        $this->deleteJson(route('system.record-statuses.destroy', $builtIn['id']))->assertConflict();
        $this->postJson(route('system.record-statuses.store'), ['name' => 'Active'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertTrue(Schema::hasColumn('participants', 'record_status_id'));
        foreach (['associations', 'trainings', 'resource_persons'] as $table) {
            $this->assertFalse(Schema::hasColumn($table, 'record_status_id'));
        }
    }

    public function test_additional_status_management_is_limited_to_administrators(): void
    {
        $encoder = $this->account(2);
        $this->signIn($encoder);

        $this->getJson(route('system.record-statuses.index'))->assertForbidden();
        $this->postJson(route('system.record-statuses.store'), ['name' => 'For monitoring'])->assertForbidden();
    }

    public function test_system_settings_loads_compatible_bootstrap_for_tabs_and_notifications(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);

        $this->get(route('system.settings'))->assertOk()
            ->assertSee('https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js', false)
            ->assertSee('https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css', false)
            ->assertSee(asset('src/css/shared/system-settings.css?v=intervention-type-modals-1'), false)
            ->assertSee(asset('src/js/shared/system-settings.js?v=visibility-scope-select-all-refresh-1'), false)
            ->assertSee('modal-xl modal-dialog-centered modal-dialog-scrollable', false)
            ->assertSee('class="modal-dialog modal-dialog-centered modal-dialog-scrollable"', false)
            ->assertSee('Changes apply to every account assigned this profile.', false)
            ->assertSee('Restrict access for this profile')
            ->assertSee('Their accounts and records will not be deleted.', false)
            ->assertSee(asset('src/js/shared/maintenance-schedule.js?v=auto-expire-1'), false)
            ->assertDontSee('bootstrap@6.0.0-alpha.1', false)
            ->assertSee('id="notificationDetailModal"', false)
            ->assertSee('id="email-notification-control"', false)
            ->assertSee('id="trainingEmailNotificationRuleForm"', false)
            ->assertSee(asset('src/js/shared/system-email-notification-settings.js?v=notification-modal-previews-1'), false)
            ->assertSee('id="roles-tab"', false)
            ->assertSee('id="credentials-tab"', false)
            ->assertSee('id="database-tab"', false)
            ->assertSee('id="record-statuses-tab"', false)
            ->assertSee('id="record-statuses"', false)
            ->assertSee('record-status-settings.js?v=farmer-status-management-2', false)
            ->assertSee('Download full SQL backup')
            ->assertSee('Legacy TMIS SQL export')
            ->assertSee('SQL is parsed as data and never executed.')
            ->assertSee('credentialSearch', false)
            ->assertSee('credentialRoleFilter', false)
            ->assertSee('credentialPerPage', false)
            ->assertSee('aria-label="Access profile pagination"', false)
            ->assertSee('data-credential-submit', false)
            ->assertSee('Save changes', false)
            ->assertSee('data-credential-delete', false)
            ->assertSee('id="super-admins-tab"', false);
    }

    /** Confirm hiding the tab is backed by endpoint authorization for every database action. */
    public function test_database_backup_and_import_controls_are_super_administrator_only(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $administrator = $this->account();
        DB::table('system_super_admins')->where('user_id', $administrator->user_id)->delete();
        $this->signIn($administrator);

        $this->get(route('system.settings'))->assertOk()->assertDontSee('id="database-tab"', false);
        $this->get(route('system.database.export'))->assertNotFound();
        $this->post(route('system.database.import'))->assertNotFound();
        $this->post(route('system.database.restore'))->assertNotFound();
    }

    /** Confirm Super Administrators can see the backup, signed restore, and legacy import controls. */
    public function test_super_administrator_sees_database_backup_and_import_tab(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);

        $this->get(route('system.settings'))->assertOk()
            ->assertSee('id="database-tab"', false)
            ->assertSee('Download full SQL backup')
            ->assertSee('Restore a full backup')
            ->assertSee('Replace the current database?')
            ->assertSee('Legacy TMIS SQL export')
            ->assertSee('SQL is parsed as data and never executed.');
    }

    public function test_user_administration_shows_each_accounts_role_and_assigned_credential(): void
    {
        $administrator = $this->account();
        $assignedUser = $this->account(3);
        $baseRoleUser = $this->account(3);
        $credentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => $assignedUser->role_id,
            'name' => 'Field Evaluator',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('users')->where('user_id', $assignedUser->user_id)->update(['role_credential_id' => $credentialId]);
        $this->signIn($administrator);

        $this->get(route('system.accounts', ['search' => $assignedUser->email]))->assertOk()
            ->assertSee(asset('src/js/shared/account-management.js'), false)
            ->assertSee('Program Administrator')
            ->assertSee('Field Evaluator');
        $this->get(route('system.accounts', ['search' => $baseRoleUser->email]))->assertOk()
            ->assertSee('Role permissions only');
    }

    public function test_user_administration_hides_system_administrators_and_rejects_direct_edits(): void
    {
        $administrator = $this->account();
        $systemAdministratorRoleId = DB::table('user_roles')->where('name', 'System Administrator')->value('role_id');
        $encoderRoleId = DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id');
        $hiddenAdministrator = $this->account($systemAdministratorRoleId);
        DB::table('users')->where('user_id', $hiddenAdministrator->user_id)->update([
            'email' => 'hidden-admin@example.test',
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);
        $encoder = $this->account($encoderRoleId);
        DB::table('users')->where('user_id', $encoder->user_id)->update([
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);
        $this->signIn($administrator);

        $this->get(route('system.accounts', ['state' => 'pending']))
            ->assertOk()
            ->assertSee($encoder->email)
            ->assertDontSee($hiddenAdministrator->email)
            ->assertDontSee('>System Administrator</option>', false);
        $this->patchJson('/system/accounts/'.$hiddenAdministrator->user_id, ['action' => 'delete'])->assertNotFound();
        $this->patchJson('/system/accounts/'.$encoder->user_id, [
            'action' => 'update',
            'role_id' => $systemAdministratorRoleId,
            'region_id' => 4,
            'org_id' => 1,
            'status' => 'Approved & Accepted',
            'active_status' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors('role_id');
        $this->assertDatabaseHas('users', [
            'user_id' => $hiddenAdministrator->user_id,
            'status' => 'Pending approval',
            'active_status' => 0,
        ]);
        $this->assertDatabaseHas('users', [
            'user_id' => $encoder->user_id,
            'role_id' => $encoderRoleId,
        ]);
    }

    public function test_credential_management_links_to_users_of_its_role_and_filters_the_account_list(): void
    {
        $administrator = $this->account();
        $roleUser = $this->account(3);
        $baseRoleUser = $this->account(3);
        $otherRoleUser = $this->account(2);
        $credentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => $roleUser->role_id,
            'name' => 'Role-linked evaluator',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('users')->where('user_id', $roleUser->user_id)->update(['role_credential_id' => $credentialId]);
        DB::table('role_credential_permissions')->insert([
            'role_credential_id' => $credentialId,
            'permission' => 'participants.read',
        ]);
        DB::table('role_credential_denied_permissions')->insert([
            'role_credential_id' => $credentialId,
            'permission' => 'trainings.submit',
        ]);
        $this->signIn($administrator);

        $this->get(route('system.settings'))->assertOk()
            ->assertSee(htmlspecialchars(route('system.accounts', ['role_id' => $roleUser->role_id, 'role_credential_id' => $credentialId]), ENT_QUOTES), false);

        $accountList = $this->get(route('system.accounts', ['role_id' => $roleUser->role_id, 'role_credential_id' => $credentialId]))->assertOk()
            ->assertSee($roleUser->email)
            ->assertDontSee($otherRoleUser->email)
            ->assertDontSee($baseRoleUser->email)
            ->assertSee('Role-linked evaluator')
            ->assertSee('data-account-role', false)
            ->assertSee('data-account-credential', false)
            ->assertSee('account-table', false)
            ->assertSee('account-detail-grid', false)
            ->assertSee('Role baseline', false)
            ->assertSee('data-bs-target="#manageAccountModal-'.$roleUser->user_id.'"', false)
            ->assertSee('id="manageAccountModal-'.$roleUser->user_id.'"', false)
            ->assertSee('modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable', false)
            ->assertSee('account-detail-grid', false)
            ->assertSee('Permissions added by profile')
            ->assertSee('Participants / Read')
            ->assertSee('Permissions blocked by profile')
            ->assertSee('Trainings / Submit')
            ->assertSee('Save account changes')
            ->assertSee('Rows per page')
            ->assertSee('All regions')
            ->assertSee('All offices')
            ->assertSee('data-account-filters', false)
            ->assertSee('data-account-pagination', false);
        $this->assertSame(1, $accountList->viewData('accounts')->total());

        $tableRefresh = $this->get(route('system.accounts', ['role_id' => $roleUser->role_id]), [
            'X-Account-Table' => '1',
            'X-Requested-With' => 'XMLHttpRequest',
        ])->assertOk()
            ->assertSee('account-table', false)
            ->assertDontSee('User administration');
        $this->assertStringNotContainsString('<html', $tableRefresh->getContent());
    }

    public function test_user_administration_paginates_accounts_with_a_valid_selected_page_size(): void
    {
        $administrator = $this->account();
        $users = User::factory()->count(11)->create(['role_id' => 3]);
        $this->signIn($administrator);

        $firstPage = $this->get(route('system.accounts', ['role_id' => 3, 'per_page' => 10]))->assertOk()
            ->assertSee('Page 1 of 2');
        $this->assertSame(10, $firstPage->viewData('accounts')->perPage());
        $this->assertSame(11, $firstPage->viewData('accounts')->total());

        $secondPage = $this->get(route('system.accounts', ['role_id' => 3, 'per_page' => 10, 'accounts_page' => 2]))->assertOk()
            ->assertSee('Page 2 of 2')
            ->assertSee($users->first()->email);

        $this->assertSame(1, $secondPage->viewData('accounts')->count());

        $this->get(route('system.accounts', ['role_id' => 3, 'per_page' => 5]))->assertSessionHasErrors('per_page');
    }

    public function test_user_registration_edit_and_view_show_credential_access_details(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);

        $this->get(route('admin.administration.create.register'))->assertOk()
            ->assertSee('id="userCredentialType"', false)
            ->assertSee('id="userCredentialSummary"', false);
        $this->get(route('admin.administration.id.edit-user', ['user_id' => $administrator->user_id]))->assertOk()
            ->assertSee('id="update-credentialTypeId"', false)
            ->assertSee('id="updateCredentialSummary"', false);
        $this->get('/app/admin/administration/id/edit-user.html?id='.$administrator->user_id)
            ->assertRedirect(route('admin.administration.id.edit-user', ['user_id' => $administrator->user_id]));
        $this->get(route('admin.administration.id.view-user', ['user_id' => $administrator->user_id]))->assertOk()
            ->assertSee('id="profileAccess"', false)
            ->assertSee('Role, credential permissions, and assigned office.');
    }

    public function test_deleted_accounts_page_shows_detailed_actions_and_restores_accounts_as_inactive(): void
    {
        $administrator = $this->account();
        $deletedAccount = $this->account(2, true);
        $activeAccount = $this->account(2);
        $protectedAdministrator = $this->account();
        $this->signIn($administrator);

        $this->patchJson(route('system.accounts.update', $deletedAccount->user_id), ['action' => 'delete'])->assertOk();
        DB::table('users')->where('user_id', $protectedAdministrator->user_id)->update([
            'deleted_at' => now(),
            'active_status' => 0,
        ]);

        $deletedAccountsPage = $this->get(route('admin.administration.details.trash'))->assertOk()
            ->assertSee('Deleted accounts')
            ->assertSee('deleted-accounts-page', false)
            ->assertSee('account-filter-card', false)
            ->assertSee('account-table-card', false)
            ->assertSee('deleted-account-table', false)
            ->assertSee('Deleted on')
            ->assertSee('Registered')
            ->assertSee('aria-label="TMIS operations"', false)
            ->assertSee('id="administrationHeaderCollapse"', false)
            ->assertSee('id="administrationMobile"', false)
            ->assertSee('id="participantHeaderCollapse"', false)
            ->assertSee('id="trainingHeaderCollapse"', false)
            ->assertSee('id="evaluationHeaderCollapse"', false)
            ->assertSee(route('admin.participants.details.trash'))
            ->assertSee(route('admin.administration.details.trash'))
            ->assertSee('Restore this account?')
            ->assertSee($deletedAccount->email)
            ->assertSee(route('admin.administration.id.view-user', ['user_id' => $deletedAccount->user_id]))
            ->assertSee(route('admin.administration.id.edit-user', ['user_id' => $deletedAccount->user_id]))
            ->assertSee($protectedAdministrator->email)
            ->assertDontSee(route('admin.administration.id.edit-user', ['user_id' => $protectedAdministrator->user_id]))
            ->assertDontSee(route('system.accounts.update', $protectedAdministrator->user_id));
        $this->assertSame(
            2,
            substr_count(
                $deletedAccountsPage->getContent(),
                'href="'.route('admin.participants.details.trash').'"',
            ),
        );
        $this->assertNotContains(
            $activeAccount->email,
            $deletedAccountsPage->viewData('accounts')->getCollection()->pluck('email')->all(),
        );

        $this->withHeaders([
            'X-TMIS-PAGE' => route('admin.administration.id.edit-user', ['user_id' => $deletedAccount->user_id]),
        ])->getJson('/ui/data')->assertOk()->assertJsonFragment(['id' => (string) $deletedAccount->user_id]);

        $this->patchJson(route('system.accounts.update', $deletedAccount->user_id), [
            'action' => 'update',
            'role_id' => $deletedAccount->role_id,
            'region_id' => $deletedAccount->region_id,
            'org_id' => $deletedAccount->org_id,
            'status' => 'Approved & Accepted',
            'active_status' => 1,
        ])->assertOk();
        $this->assertDatabaseHas('users', [
            'user_id' => $deletedAccount->user_id,
            'active_status' => 0,
        ]);
        $this->assertNotNull(DB::table('users')->where('user_id', $deletedAccount->user_id)->value('deleted_at'));

        $this->patchJson(route('system.accounts.update', $deletedAccount->user_id), ['action' => 'restore'])->assertOk();
        $this->assertDatabaseHas('users', [
            'user_id' => $deletedAccount->user_id,
            'deleted_at' => null,
            'active_status' => 0,
        ]);
    }

    public function test_regular_administrator_cannot_manage_super_admin_settings(): void
    {
        $user = $this->account();
        DB::table('system_super_admins')->where('user_id', $user->user_id)->delete();
        $this->signIn($user);

        $this->get(route('system.settings'))->assertOk()
            ->assertSee('id="branding-tab"', false)
            ->assertSee('id="systemBrandingForm"', false)
            ->assertSee(asset('src/js/shared/system-branding.js?v=live-branding-1'), false)
            ->assertDontSee('id="availability-tab"', false)
            ->assertDontSee('id="roles-tab"', false)
            ->assertDontSee('id="credentials-tab"', false)
            ->assertDontSee('id="credentials"', false)
            ->assertDontSee('Account credentials')
            ->assertDontSee('id="super-admins-tab"', false);
        $this->postJson(route('system.settings.update'), [
            'maintenance_enabled' => false,
            'maintenance_message' => 'Unauthorized update',
        ])->assertForbidden();
        $this->postJson(route('system.roles.store'), [
            'name' => 'Unauthorized role',
            'permissions' => [],
        ])->assertForbidden();
        $this->postJson(route('system.role-credentials.store'), [
            'role_id' => 3,
            'name' => 'Unauthorized credential',
            'permissions' => [],
        ])->assertForbidden();
        $this->patchJson(route('system.super-admins.update'), [
            'action' => 'grant',
            'user_ids' => [$user->user_id],
        ])->assertForbidden();
    }

    public function test_super_administrator_can_grant_and_revoke_super_admin_access(): void
    {
        $administrator = $this->account();
        $candidate = $this->account();
        DB::table('system_super_admins')->where('user_id', $candidate->user_id)->delete();
        $this->signIn($administrator);

        $this->get(route('system.settings', [
            'super_admin_search' => $candidate->email,
            'super_admin_per_page' => 25,
        ]))->assertOk()
            ->assertSee('Super Admin access')
            ->assertSee($candidate->email);

        $this->from(route('system.settings'))->patch(route('system.super-admins.update'), [
            'action' => 'grant',
            'user_ids' => [$candidate->user_id],
        ])->assertRedirect(route('system.settings'));
        $this->assertDatabaseHas('system_super_admins', [
            'user_id' => $candidate->user_id,
            'granted_by' => $administrator->user_id,
        ]);
        $this->assertDatabaseHas('users_log', [
            'user_id' => $candidate->user_id,
            'actor_user_id' => $administrator->user_id,
            'event' => 'super_admin_granted',
        ]);

        $this->from(route('system.settings'))->patch(route('system.super-admins.update'), [
            'action' => 'revoke',
            'user_ids' => [$candidate->user_id],
        ])->assertRedirect(route('system.settings'));
        $this->assertDatabaseMissing('system_super_admins', ['user_id' => $candidate->user_id]);
        $this->assertDatabaseHas('users_log', [
            'user_id' => $candidate->user_id,
            'actor_user_id' => $administrator->user_id,
            'event' => 'super_admin_revoked',
        ]);
    }

    public function test_super_administrator_assignment_rejects_non_administrator_accounts(): void
    {
        $administrator = $this->account();
        $staff = $this->account(2);
        $this->signIn($administrator);

        $this->patchJson(route('system.super-admins.update'), [
            'action' => 'grant',
            'user_ids' => [$staff->user_id],
        ])->assertUnprocessable();
        $this->assertDatabaseMissing('system_super_admins', ['user_id' => $staff->user_id]);
        $this->assertDatabaseMissing('users_log', [
            'user_id' => $staff->user_id,
            'event' => 'super_admin_granted',
        ]);
    }

    public function test_super_administrator_can_assign_delete_permission_to_a_role(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);

        $settings = $this->get(route('system.settings'))->assertOk()
            ->assertSee('Delete records')
            ->assertSee('Limit access to selected pages')
            ->assertSee('Details > All status')
            ->assertSee('Details > Deleted accounts')
            ->assertSee('Individual > Details > Deleted farmers')
            ->assertSee('value="administration.view.details.trash"', false)
            ->assertSee('value="participants.view.details.trash"', false);
        foreach (['trainings', 'participants', 'associations', 'resource_persons', 'questionnaires', 'evaluations'] as $module) {
            $settings->assertSee('value="'.$module.'.delete"', false);
        }
        $this->postJson(route('system.roles.store'), [
            'name' => 'Training editor',
            'details' => 'Can manage training records.',
            'permissions' => [
                'trainings.read',
                'trainings.write',
                'trainings.delete',
                'trainings.page_access',
                'trainings.view.details.all-status',
                'trainings.view.details.approved-accepted',
                'participants.page_access',
                'participants.view.details.trash',
                'administration.page_access',
                'administration.view.details.trash',
            ],
        ])->assertOk();

        $roleId = DB::table('user_roles')->where('name', 'Training editor')->value('role_id');
        $this->assertDatabaseHas('role_permissions', ['role_id' => $roleId, 'permission' => 'trainings.delete']);
        $this->assertDatabaseHas('role_permissions', ['role_id' => $roleId, 'permission' => 'trainings.page_access']);
        $this->assertDatabaseHas('role_permissions', ['role_id' => $roleId, 'permission' => 'trainings.view.details.all-status']);
        $this->assertDatabaseHas('role_permissions', ['role_id' => $roleId, 'permission' => 'trainings.view.details.approved-accepted']);
        $this->assertDatabaseHas('role_permissions', ['role_id' => $roleId, 'permission' => 'participants.view.details.trash']);
        $this->assertDatabaseHas('role_permissions', ['role_id' => $roleId, 'permission' => 'administration.view.details.trash']);
        $this->postJson(route('system.roles.store'), [
            'name' => 'Invalid page role',
            'permissions' => ['trainings.view.details.inactive'],
        ])->assertUnprocessable();
        $this->assertDatabaseMissing('user_roles', ['name' => 'Invalid page role']);
    }

    public function test_super_administrator_can_view_role_and_profile_access_from_the_settings_tables(): void
    {
        $administrator = $this->account();
        $assignedUser = $this->account(3);
        $credentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => $assignedUser->role_id,
            'name' => 'Read-only operations',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('users')->where('user_id', $assignedUser->user_id)->update(['role_credential_id' => $credentialId]);
        DB::table('role_permissions')->insert([
            'role_id' => $assignedUser->role_id,
            'permission' => 'participants.read',
        ]);
        DB::table('role_credential_denied_permissions')->insert([
            'role_credential_id' => $credentialId,
            'permission' => 'trainings.submit',
        ]);
        $this->signIn($administrator);

        $this->get(route('system.settings'))->assertOk()
            ->assertSee('id="role-access-table"', false)
            ->assertSee('data-bs-target="#viewRoleModal-'.$assignedUser->role_id.'"', false)
            ->assertSee('data-bs-target="#editRoleModal-'.$assignedUser->role_id.'"', false)
            ->assertSee('data-bs-target="#viewCredentialModal-'.$credentialId.'"', false)
            ->assertSee('Read-only operations')
            ->assertSee('Permissions granted by role')
            ->assertSee('Permissions blocked by profile')
            ->assertSee(htmlspecialchars(route('system.accounts', ['role_id' => $assignedUser->role_id]), ENT_QUOTES), false)
            ->assertSee(htmlspecialchars(route('system.accounts', [
                'role_id' => $assignedUser->role_id,
                'role_credential_id' => $credentialId,
            ]), ENT_QUOTES), false);
    }

    public function test_regular_administrator_cannot_delete_roles(): void
    {
        $administrator = $this->account();
        DB::table('system_super_admins')->where('user_id', $administrator->user_id)->delete();
        $roleId = DB::table('user_roles')->insertGetId([
            'name' => 'Restricted role deletion',
            'details' => 'A role used to verify authorization.',
            'is_active' => 1,
            'created_at' => now(),
        ], 'role_id');
        $this->signIn($administrator);

        $this->deleteJson(route('system.roles.destroy', $roleId))->assertForbidden();
        $this->assertDatabaseHas('user_roles', ['role_id' => $roleId, 'name' => 'Restricted role deletion']);
    }

    public function test_super_administrator_can_delete_an_unused_role_and_its_permissions(): void
    {
        $administrator = $this->account();
        $roleId = DB::table('user_roles')->insertGetId([
            'name' => 'Temporary reviewer',
            'details' => 'A role created for deletion coverage.',
            'is_active' => 1,
            'created_at' => now(),
        ], 'role_id');
        DB::table('role_permissions')->insert([
            'role_id' => $roleId,
            'permission' => 'participants.read',
        ]);
        $this->signIn($administrator);

        $this->deleteJson(route('system.roles.destroy', $roleId))
            ->assertOk()
            ->assertJsonPath('message', 'Role permanently deleted.');

        $this->assertDatabaseMissing('user_roles', ['role_id' => $roleId]);
        $this->assertDatabaseMissing('role_permissions', ['role_id' => $roleId]);
        $this->assertDatabaseHas('users_log', [
            'actor_user_id' => $administrator->user_id,
            'event' => 'role_deleted_'.$roleId,
            'category' => 'settings',
        ]);
    }

    public function test_super_administrator_cannot_delete_a_role_with_assigned_accounts_or_profiles(): void
    {
        $administrator = $this->account();
        $assignedUser = $this->account(3);
        $credentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => $assignedUser->role_id,
            'name' => 'Assigned profile',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('users')->where('user_id', $assignedUser->user_id)->update(['role_credential_id' => $credentialId]);
        $this->signIn($administrator);

        $this->deleteJson(route('system.roles.destroy', $assignedUser->role_id))
            ->assertConflict()
            ->assertJsonPath('message', 'A role cannot be deleted while accounts or access profiles are assigned.');

        $this->assertDatabaseHas('user_roles', ['role_id' => $assignedUser->role_id]);
        $this->assertDatabaseHas('users', ['user_id' => $assignedUser->user_id, 'role_id' => $assignedUser->role_id]);
        $this->assertDatabaseHas('role_credentials', ['role_credential_id' => $credentialId, 'role_id' => $assignedUser->role_id]);
    }

    public function test_super_administrator_cannot_delete_the_system_administrator_role(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);
        $systemAdministratorRoleId = (int) DB::table('user_roles')->where('name', 'System Administrator')->value('role_id');

        $this->deleteJson(route('system.roles.destroy', $systemAdministratorRoleId))
            ->assertConflict()
            ->assertJsonPath('message', 'The System Administrator role is protected.');

        $this->assertDatabaseHas('user_roles', ['role_id' => $systemAdministratorRoleId, 'name' => 'System Administrator']);
    }

    public function test_super_administrator_can_manage_additive_role_credentials(): void
    {
        $administrator = $this->account();
        $assignedUser = $this->account(3);
        $this->signIn($administrator);

        $this->get(route('system.settings'))->assertOk()
            ->assertSee('id="credentials-tab"', false)
            ->assertSee('Encoder (default)')
            ->assertSee('Evaluator')
            ->assertSee('Data Encoder - Head')
            ->assertSee('value="administration.view.details.trash"', false)
            ->assertSee('value="participants.view.details.trash"', false);
        $this->postJson(route('system.role-credentials.store'), [
            'role_id' => 3,
            'name' => 'Training evaluator',
            'permissions' => [
                'trainings.read',
                'trainings.page_access',
                'trainings.view.details.all-status',
                'participants.page_access',
                'participants.view.details.trash',
            ],
        ])->assertOk()->assertJsonPath('message', 'Credential type created.');

        $credentialId = DB::table('role_credentials')->where('role_id', 3)->where('name', 'Training evaluator')->value('role_credential_id');
        $this->assertDatabaseHas('role_credential_permissions', [
            'role_credential_id' => $credentialId,
            'permission' => 'trainings.view.details.all-status',
        ]);
        $this->assertDatabaseHas('role_credential_permissions', [
            'role_credential_id' => $credentialId,
            'permission' => 'participants.view.details.trash',
        ]);
        DB::table('role_permissions')->where('role_id', 3)->delete();
        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'trainings.submit'],
            ['role_id' => 3, 'permission' => 'participants.page_access'],
            ['role_id' => 3, 'permission' => 'participants.view.details.all-with-status'],
            ['role_id' => 3, 'permission' => 'administration.page_access'],
            ['role_id' => 3, 'permission' => 'administration.view.details.trash'],
        ]);
        $this->patchJson(route('system.role-credentials.update', $credentialId), [
            'role_id' => 3,
            'name' => 'Training reviewer',
            'permissions' => ['participants.read', 'participants.page_access', 'participants.view.details.trash'],
            'denied_permissions' => ['trainings.submit', 'administration.view.details.trash'],
        ])->assertOk()->assertJsonPath('message', 'Credential type updated.');
        $this->assertDatabaseHas('role_credentials', ['role_credential_id' => $credentialId, 'name' => 'Training reviewer']);
        $this->assertDatabaseHas('role_credential_permissions', ['role_credential_id' => $credentialId, 'permission' => 'participants.read']);
        $this->assertDatabaseHas('role_credential_permissions', ['role_credential_id' => $credentialId, 'permission' => 'participants.view.details.trash']);
        $this->assertDatabaseMissing('role_credential_permissions', ['role_credential_id' => $credentialId, 'permission' => 'trainings.read']);
        $this->assertDatabaseHas('role_credential_denied_permissions', ['role_credential_id' => $credentialId, 'permission' => 'trainings.submit']);
        $this->assertDatabaseHas('role_credential_denied_permissions', ['role_credential_id' => $credentialId, 'permission' => 'administration.view.details.trash']);
        $this->patchJson(route('system.role-credentials.update', $credentialId), [
            'role_id' => 3,
            'name' => 'Training reviewer',
            'permissions' => ['trainings.submit'],
            'denied_permissions' => ['trainings.submit'],
        ])->assertUnprocessable()->assertJsonValidationErrors('denied_permissions');
        $this->assertDatabaseMissing('role_credential_permissions', ['role_credential_id' => $credentialId, 'permission' => 'trainings.submit']);
        $this->assertDatabaseHas('role_credential_denied_permissions', ['role_credential_id' => $credentialId, 'permission' => 'trainings.submit']);
        $this->patchJson(route('system.role-credentials.update', $credentialId), [
            'role_id' => 3,
            'name' => 'Training reviewer',
            'permissions' => ['participants.read', 'participants.page_access', 'participants.view.details.trash'],
            'denied_permissions' => ['trainings.page_access'],
        ])->assertUnprocessable()->assertJsonValidationErrors('denied_permissions');

        DB::table('users')->where('user_id', $assignedUser->user_id)->update(['role_credential_id' => $credentialId]);
        $assignedUser->refresh();
        $credentialTable = $this->get(route('system.settings'))->assertOk()
            ->assertSee('credential-table-card', false)
            ->assertSee('Access profile #'.$credentialId)
            ->assertSee('Participants / Read')
            ->assertSee('Accounts assigned')
            ->assertSee('Last changed')
            ->assertSee('id="credential-name-'.$credentialId.'"', false)
            ->assertSee('id="updateCredentialForm-'.$credentialId.'"', false)
            ->assertSee('name="denied_permissions[]"', false)
            ->assertSee('Save changes', false)
            ->assertSee(htmlspecialchars(route('system.accounts', ['role_id' => 3, 'role_credential_id' => $credentialId]), ENT_QUOTES), false)
            ->assertSee('Updated');
        $credentialRow = $credentialTable->viewData('credentialTypes')->getCollection()->firstWhere('role_credential_id', $credentialId);
        $this->assertSame(1, (int) $credentialRow->assigned_accounts_count);
        $this->assertDatabaseHas('role_credential_denied_permissions', ['role_credential_id' => $credentialId, 'permission' => 'trainings.submit']);

        $this->signIn($assignedUser);
        $this->get(route('admin.participants.details.trash'))->assertOk();
        $this->get(route('admin.administration.details.trash'))->assertNotFound();

        $this->signIn($administrator);
        $this->deleteJson(route('system.role-credentials.destroy', $credentialId))
            ->assertOk()
            ->assertJsonPath('message', 'Access profile permanently deleted. Assigned accounts have returned to their role permissions.');
        $this->assertDatabaseMissing('role_credentials', ['role_credential_id' => $credentialId]);
        $this->assertDatabaseMissing('role_credential_denied_permissions', ['role_credential_id' => $credentialId, 'permission' => 'trainings.submit']);
        $this->assertDatabaseHas('users', ['user_id' => $assignedUser->user_id, 'role_credential_id' => null]);
        $this->assertDatabaseHas('users_log', [
            'actor_user_id' => $administrator->user_id,
            'event' => 'role_credential_deleted_'.$credentialId,
            'category' => 'settings',
        ]);
    }

    public function test_super_administrator_can_update_credential_from_the_edit_form(): void
    {
        $administrator = $this->account();
        $credentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => 3,
            'name' => 'Original credential',
            'created_at' => now(),
        ], 'role_credential_id');
        $this->signIn($administrator);

        $response = $this->patch(route('system.role-credentials.update', $credentialId), [
            'role_id' => 3,
            'name' => 'Updated credential',
            'permissions' => ['participants.read'],
            'denied_permissions' => ['trainings.submit'],
        ]);

        $response->assertRedirect(route('system.settings').'#credentials')
            ->assertSessionHas('operation_message', 'Credential type updated.');
        $this->assertDatabaseHas('role_credentials', [
            'role_credential_id' => $credentialId,
            'name' => 'Updated credential',
        ]);
        $this->assertDatabaseHas('role_credential_permissions', [
            'role_credential_id' => $credentialId,
            'permission' => 'participants.read',
        ]);
        $this->assertDatabaseHas('role_credential_denied_permissions', [
            'role_credential_id' => $credentialId,
            'permission' => 'trainings.submit',
        ]);
    }

    public function test_credential_table_filters_and_paginates_with_selected_page_size(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);
        $roleId = (int) DB::table('user_roles')->where('name', 'Program Administrator')->value('role_id');
        foreach (range(1, 11) as $index) {
            DB::table('role_credentials')->insert([
                'role_id' => $roleId,
                'name' => 'Operations credential '.$index,
                'created_at' => now(),
            ]);
        }

        $firstPage = $this->get(route('system.settings', ['credential_per_page' => 10]))->assertOk()
            ->assertSee('credential_page=2', false)
            ->assertSee('Showing 1-10 of 15 profiles');
        $credentials = $firstPage->viewData('credentialTypes');
        $this->assertSame(15, $credentials->total());
        $this->assertSame(10, $credentials->count());

        $filteredPage = $this->get(route('system.settings', [
            'credential_search' => 'Operations credential 5',
            'credential_role_id' => $roleId,
            'credential_per_page' => 25,
        ]))->assertOk()->assertSee('Operations credential 5')->assertDontSee('Operations credential 4');
        $filteredCredentials = $filteredPage->viewData('credentialTypes');
        $this->assertSame(1, $filteredCredentials->total());
        $this->assertSame('Operations credential 5', $filteredCredentials->items()[0]->name);
    }

    public function test_account_access_updates_accept_only_a_credential_for_the_selected_role(): void
    {
        $administrator = $this->account();
        $user = $this->account(3);
        DB::table('role_permissions')->where('role_id', 3)->delete();
        $credentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => 3,
            'name' => 'Account manager test',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('role_credential_permissions')->insert([
            'role_credential_id' => $credentialId,
            'permission' => 'questionnaires.read',
        ]);
        $this->signIn($administrator);

        $payload = [
            'action' => 'update',
            'role_id' => 3,
            'role_credential_id' => $credentialId,
            'region_id' => $user->region_id,
            'org_id' => $user->org_id,
            'status' => 'Approved & Accepted',
            'active_status' => 1,
        ];
        $this->patchJson(route('system.accounts.update', $user->user_id), $payload)->assertOk();
        $this->assertDatabaseHas('users', ['user_id' => $user->user_id, 'role_credential_id' => $credentialId]);
        $assignedUser = User::findOrFail($user->user_id);
        $this->assertTrue(ModuleAccess::allows($assignedUser, 'questionnaires.read'));

        $payload['role_id'] = 2;
        $this->patchJson(route('system.accounts.update', $user->user_id), $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('role_credential_id');
        $this->assertDatabaseHas('users', ['user_id' => $user->user_id, 'role_id' => 3, 'role_credential_id' => $credentialId]);

        $payload['role_id'] = 3;
        $payload['role_credential_id'] = null;
        $this->patchJson(route('system.accounts.update', $user->user_id), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role_credential_id');
        $this->assertDatabaseHas('users', ['user_id' => $user->user_id, 'role_id' => 3, 'role_credential_id' => $credentialId]);
        $this->assertTrue(ModuleAccess::allows(User::findOrFail($user->user_id), 'questionnaires.read'));
    }

    public function test_super_administrator_can_remove_their_own_final_access(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);

        $this->patchJson(route('system.super-admins.update'), [
            'action' => 'revoke',
            'user_ids' => [$administrator->user_id],
        ])->assertOk();

        $this->assertDatabaseMissing('system_super_admins', ['user_id' => $administrator->user_id]);
        $this->assertDatabaseHas('users_log', [
            'user_id' => $administrator->user_id,
            'event' => 'super_admin_revoked',
        ]);
    }

    public function test_only_administrators_can_manage_access_and_branding(): void
    {
        $user = $this->account(2);
        $this->signIn($user);

        $this->get(route('system.settings'))->assertNotFound();
        $this->postJson('/system/maintenance-access', [
            'user_ids' => [$user->user_id],
            'action' => 'grant',
        ])->assertNotFound();
        $this->postJson(route('system.branding.update'), ['system_name' => 'Unauthorized'])->assertForbidden();
    }

    public function test_administrator_can_update_system_name_logo_and_favicon(): void
    {
        Storage::fake('local');
        $administrator = $this->account();
        $this->signIn($administrator);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6H0AAAAASUVORK5CYII=');

        $this->postJson(route('system.branding.update'), [
            'system_name' => 'Field Operations',
            'logo' => UploadedFile::fake()->createWithContent('logo.png', $png),
            'favicon' => UploadedFile::fake()->createWithContent('favicon.png', $png),
        ])->assertOk()
            ->assertJsonPath('message', 'Branding settings saved and applied.')
            ->assertJsonPath('branding.name', 'Field Operations')
            ->assertJsonPath('branding.faviconMimeType', 'image/png');

        $settings = DB::table('system_settings')->where('id', 1)->first();
        $this->assertSame('Field Operations', $settings->system_name);
        Storage::disk('local')->assertExists($settings->logo_path);
        Storage::disk('local')->assertExists($settings->favicon_path);
        $this->get(route('system-branding.asset', ['kind' => 'logo']))->assertOk();
        $this->get(route('system-branding.asset', ['kind' => 'favicon']))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
        $this->assertDatabaseHas('users_log', [
            'event' => 'system_branding_updated',
            'actor_user_id' => $administrator->user_id,
        ]);
    }

    public function test_branding_rejects_mismatched_image_extension_without_replacing_saved_asset(): void
    {
        Storage::fake('local');
        $administrator = $this->account();
        $this->signIn($administrator);
        $existingLogoPath = 'system-branding/existing-logo.png';
        Storage::disk('local')->put($existingLogoPath, 'existing logo bytes');
        DB::table('system_settings')->where('id', 1)->update([
            'system_name' => 'Existing name',
            'logo_path' => $existingLogoPath,
        ]);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6H0AAAAASUVORK5CYII=');

        $this->postJson(route('system.branding.update'), [
            'system_name' => 'Attempted name',
            'logo' => UploadedFile::fake()->createWithContent('logo.gif', $png),
        ])->assertUnprocessable()->assertJsonValidationErrors('logo');

        $this->assertDatabaseHas('system_settings', [
            'id' => 1,
            'system_name' => 'Existing name',
            'logo_path' => $existingLogoPath,
        ]);
        Storage::disk('local')->assertExists($existingLogoPath);
        $this->assertSame([$existingLogoPath], Storage::disk('local')->allFiles('system-branding'));
    }

    public function test_branding_reports_the_stored_jpeg_favicon_mime_type(): void
    {
        Storage::fake('local');
        $administrator = $this->account();
        $this->signIn($administrator);
        $faviconPath = 'system-branding/existing-favicon.jpg';
        Storage::disk('local')->put($faviconPath, file_get_contents(base_path('assets/user_profile/user_profile.jpg')));
        DB::table('system_settings')->where('id', 1)->update(['favicon_path' => $faviconPath]);

        $branding = app(SystemBranding::class)->forDisplay();

        $this->assertSame('image/jpeg', $branding['faviconMimeType']);
        $this->get(route('system-branding.asset', ['kind' => 'favicon']))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
        $this->get(route('system.settings'))->assertOk()->assertSee('type="image/jpeg"', false);
    }

    public function test_authentication_emails_embed_the_current_system_logo_and_name(): void
    {
        Storage::fake('local');
        $logoPath = 'system-branding/authentication-logo.png';
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6H0AAAAASUVORK5CYII=');
        Storage::disk('local')->put($logoPath, $png);
        DB::table('system_settings')->where('id', 1)->update([
            'system_name' => 'Field Operations',
            'logo_path' => $logoPath,
        ]);

        $messages = [
            new LoginVerificationCode('123456'),
            new PasswordResetLink('https://example.test/reset', true),
        ];

        foreach ($messages as $message) {
            $html = $message->render();
            $this->assertStringContainsString('Field Operations', $html);
            $this->assertStringContainsString('Field Operations logo', $html);
            $this->assertTrue(str_contains($html, 'src="cid:') || str_contains($html, 'src="data:image/png;base64,'));
            $this->assertStringNotContainsString('DA logo_120519.png', $html);
        }
    }

    public function test_administrator_can_create_update_and_delete_email_notification_rules(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);
        DB::table('training_email_notification_rule_roles')->delete();
        DB::table('training_email_notification_rules')->delete();
        $roles = DB::table('user_roles')->whereIn('name', ['Data Encoder', 'Program Administrator'])->pluck('role_id', 'name');
        $encoderRoleId = (int) $roles['Data Encoder'];
        $programAdministratorRoleId = (int) $roles['Program Administrator'];

        $created = $this->postJson(route('system.training-email-notification-rules.store'), [
            'from_status' => 'For review',
            'to_status' => 'For approval',
            'is_enabled' => true,
            'subject_template' => 'Review: {training_title}',
            'message_template' => 'Training {training_id} is ready for review.',
            'role_ids' => [$encoderRoleId, $programAdministratorRoleId],
        ])->assertCreated()
            ->assertJsonPath('message', 'Training email notification rule created.');
        $ruleId = $created->json('id');

        $this->assertDatabaseHas('training_email_notification_rules', [
            'id' => $ruleId,
            'from_status' => 'For review',
            'to_status' => 'For approval',
            'is_enabled' => true,
            'subject_template' => 'Review: {training_title}',
        ]);
        $this->assertDatabaseHas('training_email_notification_rule_roles', ['rule_id' => $ruleId, 'role_id' => $encoderRoleId, 'is_enabled' => true]);
        $this->assertDatabaseHas('training_email_notification_rule_roles', ['rule_id' => $ruleId, 'role_id' => $programAdministratorRoleId, 'is_enabled' => true]);
        $this->assertDatabaseHas('users_log', ['actor_user_id' => $administrator->user_id, 'event' => 'training_email_notification_rule_created_'.$ruleId]);

        $this->patchJson(route('system.training-email-notification-rules.update', $ruleId), [
            'from_status' => 'For approval',
            'to_status' => 'For acceptance',
            'is_enabled' => false,
            'subject_template' => 'Acceptance: {training_title}',
            'message_template' => 'Please accept training {training_id}.',
            'role_ids' => [$programAdministratorRoleId],
        ])->assertOk()->assertJsonPath('message', 'Training email notification rule updated.');

        $this->assertDatabaseHas('training_email_notification_rules', [
            'id' => $ruleId,
            'from_status' => 'For approval',
            'to_status' => 'For acceptance',
            'is_enabled' => false,
            'subject_template' => 'Acceptance: {training_title}',
        ]);
        $this->assertDatabaseMissing('training_email_notification_rule_roles', ['rule_id' => $ruleId, 'role_id' => $encoderRoleId]);
        $this->assertDatabaseHas('training_email_notification_rule_roles', ['rule_id' => $ruleId, 'role_id' => $programAdministratorRoleId, 'is_enabled' => true]);
        $this->assertDatabaseHas('users_log', ['actor_user_id' => $administrator->user_id, 'event' => 'training_email_notification_rule_updated_'.$ruleId]);

        $this->deleteJson(route('system.training-email-notification-rules.destroy', $ruleId))
            ->assertOk()
            ->assertJsonPath('message', 'Training email notification rule deleted.');
        $this->assertDatabaseMissing('training_email_notification_rules', ['id' => $ruleId]);
        $this->assertDatabaseMissing('training_email_notification_rule_roles', ['rule_id' => $ruleId]);
        $this->assertDatabaseHas('users_log', ['actor_user_id' => $administrator->user_id, 'event' => 'training_email_notification_rule_deleted_'.$ruleId]);
    }

    public function test_saved_email_notification_rule_controls_delivery_and_template_rendering(): void
    {
        Mail::fake();
        $administrator = $this->account();
        $this->signIn($administrator);
        DB::table('training_email_notification_rule_roles')->delete();
        DB::table('training_email_notification_rules')->delete();
        $administratorRoleId = (int) DB::table('user_roles')->where('name', 'System Administrator')->value('role_id');
        $subjectTemplate = 'Action needed: {training_title}';
        $messageTemplate = 'Training {training_id} changed to {to_status}. Reason: {reason}';

        $createdRule = $this->postJson(route('system.training-email-notification-rules.store'), [
            'from_status' => 'For acceptance',
            'to_status' => 'Approved & Accepted',
            'is_enabled' => true,
            'subject_template' => $subjectTemplate,
            'message_template' => $messageTemplate,
            'role_ids' => [$administratorRoleId],
        ])->assertCreated();
        $ruleId = $createdRule->json('id');

        $trainingId = DB::table('trainings')->insertGetId([
            'name' => 'Email-controlled training',
            'region_id' => $administrator->region_id,
            'org_id' => $administrator->org_id,
            'created_by' => $administrator->user_id,
            'status' => 'Approved & Accepted',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
            'budget' => 1000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $statusChangeId = DB::table('training_status_changes')->insertGetId([
            'training_id' => $trainingId,
            'actor_user_id' => $administrator->user_id,
            'from_status' => 'For acceptance',
            'to_status' => 'Approved & Accepted',
            'reason' => 'Final review complete.',
            'created_at' => now(),
        ]);
        $notificationId = DB::table('training_notifications')->insertGetId([
            'status_change_id' => $statusChangeId,
            'user_id' => $administrator->user_id,
            'email' => $administrator->email,
            'created_at' => now(),
        ]);

        $this->assertTrue(app(TrainingNotificationDelivery::class)->deliver($notificationId));
        Mail::assertSent(TrainingStatusChanged::class, fn (TrainingStatusChanged $mail): bool => $mail->hasTo($administrator->email)
            && $mail->subjectTemplate === $subjectTemplate
            && $mail->messageTemplate === $messageTemplate);
        $sent = Mail::sent(TrainingStatusChanged::class)->sole();
        $this->assertSame('Action needed: Email-controlled training', $sent->envelope()->subject);
        $this->assertStringContainsString('Training '.$trainingId.' changed to Approved &amp; Accepted. Reason: Final review complete.', $sent->render());
        $this->assertNotNull(DB::table('training_notifications')->where('id', $notificationId)->value('sent_at'));

        $this->patchJson(route('system.training-email-notification-rules.update', $ruleId), [
            'from_status' => 'For acceptance',
            'to_status' => 'Approved & Accepted',
            'is_enabled' => false,
            'subject_template' => $subjectTemplate,
            'message_template' => $messageTemplate,
            'role_ids' => [$administratorRoleId],
        ])->assertOk();
        $disabledStatusChangeId = DB::table('training_status_changes')->insertGetId([
            'training_id' => $trainingId,
            'actor_user_id' => $administrator->user_id,
            'from_status' => 'For acceptance',
            'to_status' => 'Approved & Accepted',
            'reason' => 'Second review complete.',
            'created_at' => now(),
        ]);
        $disabledNotificationId = DB::table('training_notifications')->insertGetId([
            'status_change_id' => $disabledStatusChangeId,
            'user_id' => $administrator->user_id,
            'email' => $administrator->email,
            'created_at' => now(),
        ]);

        $this->assertTrue(app(TrainingNotificationDelivery::class)->deliver($disabledNotificationId));
        Mail::assertSentCount(1);
        $this->assertNotNull(DB::table('training_notifications')->where('id', $disabledNotificationId)->value('cancelled_at'));
    }

    public function test_email_notification_rules_reject_duplicate_transitions_invalid_pairs_and_inactive_roles(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);
        DB::table('training_email_notification_rule_roles')->delete();
        DB::table('training_email_notification_rules')->delete();
        $encoderRoleId = (int) DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id');
        $payload = [
            'from_status' => 'For review',
            'to_status' => 'For approval',
            'is_enabled' => true,
            'role_ids' => [$encoderRoleId],
        ];

        $ruleId = $this->postJson(route('system.training-email-notification-rules.store'), $payload)->assertCreated()->json('id');
        $this->postJson(route('system.training-email-notification-rules.store'), $payload)->assertConflict();
        $this->assertDatabaseCount('training_email_notification_rules', 1);

        $invalidTransition = $payload;
        $invalidTransition['to_status'] = 'Approved & Accepted';
        $this->postJson(route('system.training-email-notification-rules.store'), $invalidTransition)->assertUnprocessable();
        $this->assertDatabaseMissing('training_email_notification_rules', ['to_status' => 'Approved & Accepted']);

        DB::table('user_roles')->where('role_id', $encoderRoleId)->update(['is_active' => false]);
        $this->patchJson(route('system.training-email-notification-rules.update', $ruleId), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role_ids.0');
        $this->assertDatabaseHas('training_email_notification_rule_roles', ['rule_id' => $ruleId, 'role_id' => $encoderRoleId]);
    }

    public function test_non_administrators_cannot_manage_email_notification_rules(): void
    {
        $administrator = $this->account();
        $this->signIn($administrator);
        DB::table('training_email_notification_rule_roles')->delete();
        DB::table('training_email_notification_rules')->delete();
        $roleId = (int) DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id');
        $ruleId = $this->postJson(route('system.training-email-notification-rules.store'), [
            'from_status' => 'For review',
            'to_status' => 'For approval',
            'is_enabled' => true,
            'role_ids' => [$roleId],
        ])->assertCreated()->json('id');

        $encoder = $this->account(2);
        $this->signIn($encoder);
        $payload = [
            'from_status' => 'For review',
            'to_status' => 'For approval',
            'is_enabled' => false,
            'role_ids' => [$roleId],
        ];
        $this->postJson(route('system.training-email-notification-rules.store'), $payload)->assertForbidden();
        $this->patchJson(route('system.training-email-notification-rules.update', $ruleId), $payload)->assertForbidden();
        $this->deleteJson(route('system.training-email-notification-rules.destroy', $ruleId))->assertForbidden();
        $this->assertDatabaseHas('training_email_notification_rules', ['id' => $ruleId, 'is_enabled' => true]);
    }
}
