<?php

namespace Tests\Feature;

use App\Mail\Authentication\LoginVerificationCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MaintenanceAccessTest extends TestCase
{
    use RefreshDatabase;

    private function account(int $role = 1): User
    {
        $user = User::factory()->create(['role_id' => $role]);
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => Hash::make('Valid-password-123!')]);
        if ($role === 1) {
            DB::table('system_super_admins')->insert(['user_id' => $user->user_id, 'created_at' => now(), 'updated_at' => now()]);
        }

        return $user;
    }

    private function signIn(User $user): void
    {
        $hash = DB::table('user_auth')->where('user_id', $user->user_id)->value('password_hash');
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);
    }

    private function maintenance(): void
    {
        DB::table('system_settings')->where('id', 1)->update(['maintenance_enabled' => true, 'maintenance_message' => 'Scheduled service pause', 'maintenance_until' => now()->addHour()]);
    }

    public function test_maintenance_blocks_public_authentication_pages_and_posts(): void
    {
        Mail::fake();
        $this->maintenance();
        $this->get('/')->assertOk()->assertSee('Welcome back.');
        foreach (['/maintenance', '/forgot-password', '/reset-password?token=anything', '/two-factor', '/app/authentication/login.html', '/app/admin/dashboard/dashboard'] as $path) {
            $this->get($path)->assertStatus(503)->assertSee('Scheduled service pause')->assertHeader('Retry-After', '60');
        }
        $this->postJson('/login', [])->assertUnprocessable();
        foreach (['/forgot-password', '/reset-password', '/two-factor', '/two-factor/resend'] as $path) {
            $this->postJson($path, [])->assertStatus(503)->assertJsonPath('message', 'Scheduled service pause');
        }
        Mail::assertNothingSent();
        $this->assertGuest();
    }

    public function test_administrator_recovery_requires_credentials_and_two_factor_before_access(): void
    {
        Mail::fake();
        $user = $this->account();
        $this->maintenance();
        $this->get('/maintenance/sign-in')->assertOk()->assertSee(route('maintenance.login.store'));
        $this->from('/maintenance/sign-in')->post('/maintenance/sign-in', ['email' => $user->email, 'password' => 'wrong'])->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->post('/maintenance/sign-in', ['email' => $user->email, 'password' => 'Valid-password-123!'])->assertRedirect(route('verification'));
        $this->get('/system/settings')->assertStatus(503);
        $this->get('/two-factor')->assertOk();
        $code = Mail::sent(LoginVerificationCode::class)->last()->code;
        $this->post('/two-factor', ['verification_code' => $code])->assertRedirect(route('admin.dashboard.dashboard'));
        $this->get('/system/settings')->assertOk();
        $this->get(route('maintenance.settings'))->assertOk()
            ->assertSee(asset('src/js/shared/maintenance-schedule.js?v=auto-expire-1'), false);
        $this->post(route('maintenance.settings.update'), [
            'maintenance_enabled' => '1',
            'maintenance_message' => 'Administrator is performing maintenance',
        ])->assertRedirect(route('maintenance.settings'));
        $this->assertDatabaseHas('system_settings', [
            'maintenance_enabled' => true,
            'maintenance_message' => 'Administrator is performing maintenance',
        ]);
        $this->assertAuthenticatedAs($user);
        $this->post('/logout')->assertRedirect(route('login'));
        $this->get('/')->assertOk();
    }

    public function test_non_administrator_cannot_use_recovery_login_even_with_valid_credentials(): void
    {
        Mail::fake();
        $user = $this->account(2);
        $this->maintenance();
        $this->from('/maintenance/sign-in')->post('/maintenance/sign-in', ['email' => $user->email, 'password' => 'Valid-password-123!'])->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->assertDatabaseCount('user_verify', 0);
        Mail::assertNothingSent();
        $this->assertDatabaseHas('users_log', ['event' => 'maintenance_login_denied']);
    }

    public function test_standard_login_denies_non_administrators_to_maintenance_page_with_toast(): void
    {
        Mail::fake();
        $user = $this->account(2);
        $this->maintenance();

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertRedirect(route('maintenance.page'))
            ->assertSessionHas('maintenance_notice', 'The system is under maintenance. Please try again after service resumes.');

        $this->assertGuest();
        $this->assertDatabaseCount('user_verify', 0);
        $this->assertDatabaseHas('users_log', ['event' => 'maintenance_login_denied', 'user_id' => $user->user_id]);
        $this->get(route('maintenance.page'))->assertStatus(503)->assertSee('The system is under maintenance. Please try again after service resumes.');
        Mail::assertNothingSent();
    }

    public function test_expired_maintenance_schedule_turns_off_saved_availability(): void
    {
        $this->freezeTime();
        $administrator = $this->account();
        DB::table('system_settings')->where('id', 1)->update([
            'maintenance_enabled' => true,
            'maintenance_until' => now()->copy()->utc()->subMinute(),
        ]);
        $this->signIn($administrator);

        $this->get(route('maintenance.settings'))->assertOk()
            ->assertDontSee('name="maintenance_enabled" value="1" checked', false);

        $this->assertDatabaseHas('system_settings', ['id' => 1, 'maintenance_enabled' => false]);
    }

    /** Prove requests are blocked and resumed at the persisted schedule boundaries. */
    public function test_scheduled_maintenance_starts_and_ends_at_the_saved_boundaries(): void
    {
        $this->travelTo('2026-11-08 00:00:00 UTC');
        $user = $this->account(2);
        $this->signIn($user);
        DB::table('system_settings')->where('id', 1)->update([
            'maintenance_enabled' => true,
            'maintenance_starts_at' => '2026-11-08 00:01:00',
            'maintenance_until' => '2026-11-08 00:03:00',
            'maintenance_message' => 'Scheduled service pause',
        ]);

        $this->get('/app/admin/dashboard/dashboard')->assertOk();
        $this->travelTo('2026-11-08 00:01:00 UTC');
        $this->get('/app/admin/dashboard/dashboard')->assertStatus(503)->assertSee('Scheduled service pause');
        $this->travelTo('2026-11-08 00:03:00 UTC');
        $this->get('/app/admin/dashboard/dashboard')->assertOk();

        $this->assertDatabaseHas('system_settings', [
            'id' => 1,
            'maintenance_enabled' => false,
            'maintenance_starts_at' => null,
            'maintenance_until' => null,
        ]);
    }

    public function test_system_administrator_sign_in_skips_two_factor_only_when_disabled(): void
    {
        Mail::fake();
        $user = $this->account();
        DB::table('user_auth')->where('user_id', $user->user_id)->update(['email_two_factor_enabled' => false]);
        $this->maintenance();

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertRedirect(route('admin.dashboard.dashboard'));

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseCount('user_verify', 0);
        Mail::assertNothingSent();
    }

    public function test_administrator_can_open_all_admin_pages_during_maintenance_after_two_factor(): void
    {
        Mail::fake();
        $user = $this->account();
        $this->maintenance();

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertRedirect(route('verification'));
        $code = Mail::sent(LoginVerificationCode::class)->last()->code;
        $this->post('/two-factor', ['verification_code' => $code])
            ->assertRedirect(route('admin.dashboard.dashboard'));

        foreach (BladePagesTest::pages() as [$path]) {
            $this->get('/app/'.$path)->assertOk();
        }
    }

    public function test_system_administrator_without_super_admin_assignment_can_sign_in_during_maintenance(): void
    {
        Mail::fake();
        $user = $this->account();
        DB::table('system_super_admins')->where('user_id', $user->user_id)->delete();
        $this->maintenance();

        $this->post('/maintenance/sign-in', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertRedirect(route('verification'));

        $code = Mail::sent(LoginVerificationCode::class)->last()->code;
        $this->post('/two-factor', ['verification_code' => $code])
            ->assertRedirect(route('admin.dashboard.dashboard'));

        $this->assertAuthenticatedAs($user);
        $this->get('/system/accounts')->assertOk();
    }

    public function test_regular_user_session_survives_maintenance_and_resumes_afterward(): void
    {
        $user = $this->account(2);
        $this->signIn($user);
        $this->maintenance();

        $this->get('/app/admin/dashboard/dashboard')->assertStatus(503);
        $this->assertAuthenticatedAs($user);

        DB::table('system_settings')->where('id', 1)->update(['maintenance_enabled' => false]);
        $this->get('/app/admin/dashboard/dashboard')->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_maintenance_grant_does_not_allow_non_administrators_to_sign_in_or_manage_availability(): void
    {
        Mail::fake();
        $user = $this->account(2);
        DB::table('maintenance_access')->insert(['user_id' => $user->user_id, 'created_at' => now(), 'updated_at' => now()]);
        $this->maintenance();

        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])
            ->assertRedirect(route('maintenance.page'))
            ->assertSessionHas('maintenance_notice', 'The system is under maintenance. Please try again after service resumes.');
        $this->assertGuest();
        $this->assertDatabaseHas('maintenance_access', ['user_id' => $user->user_id]);
        $this->assertDatabaseCount('user_verify', 0);
        $this->assertDatabaseHas('users_log', ['event' => 'maintenance_login_denied', 'user_id' => $user->user_id]);
        $this->get(route('maintenance.settings'))->assertStatus(503);
        $this->post(route('maintenance.settings.update'), [
            'maintenance_enabled' => '0',
            'maintenance_message' => 'Unauthorized change',
        ])->assertStatus(503);
        Mail::assertNothingSent();
    }

    public function test_existing_staff_challenge_cannot_bypass_maintenance(): void
    {
        Mail::fake();
        $user = $this->account(2);
        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])->assertRedirect(route('verification'));
        $code = Mail::sent(LoginVerificationCode::class)->last()->code;
        DB::table('maintenance_access')->insert(['user_id' => $user->user_id, 'created_at' => now(), 'updated_at' => now()]);
        $this->maintenance();
        $this->get('/two-factor')->assertStatus(503);
        $this->post('/two-factor', ['verification_code' => $code])->assertStatus(503);
        $this->assertGuest();
    }

    public function test_expired_maintenance_restores_public_authentication(): void
    {
        $this->freezeTime();
        $this->maintenance();
        $this->get('/forgot-password')->assertStatus(503);
        $this->travel(61)->minutes();
        $this->get('/')->assertOk()->assertSee('Welcome back.');
        $this->get('/forgot-password')->assertOk();
    }

    public function test_direct_module_links_require_login_and_current_role_permission(): void
    {
        $paths = ['/app/admin/participants/create/register', '/app/admin/participants/details/all-with-status', '/app/admin/participants/details/fa-all-list', '/app/admin/training/create/register', '/app/admin/training/details/approved-accepted', '/app/admin/training/create/rp-register', '/app/admin/evaluation/create/pre-test-register', '/app/admin/evaluation/encode/pre-test', '/app/admin/administration/create/register', '/system/settings', '/app/admin/training/create/register.html'];
        foreach ($paths as $path) {
            $this->get($path)->assertRedirect(route('login'));
        }
        $user = $this->account(2);
        DB::table('role_permissions')->where('role_id', $user->role_id)->delete();
        $this->signIn($user);
        foreach ($paths as $path) {
            $this->get($path)->assertNotFound();
        }
        $this->get('/app/admin/dashboard/dashboard')->assertOk();
        DB::table('role_permissions')->insert(['role_id' => $user->role_id, 'permission' => 'participants.read']);
        $this->get('/app/admin/participants/details/all-with-status')->assertOk();
        $this->get('/app/admin/participants/create/register')->assertNotFound();
    }

    public function test_direct_record_link_cannot_open_another_offices_participant(): void
    {
        $user = $this->account(2);
        DB::table('role_permissions')->insertOrIgnore(['role_id' => $user->role_id, 'permission' => 'participants.read']);
        DB::table('participants')->insert(['ui_id' => 'FOREIGN-PARTICIPANT', 'region_id' => 4, 'org_id' => 2, 'created_by' => $user->user_id, 'name' => 'Confidential participant']);
        $this->signIn($user);
        $this->get('/app/admin/participants/id/view-farmer?id=FOREIGN-PARTICIPANT')->assertNotFound()->assertDontSee('Confidential participant');
        $this->get('/app/admin/participants/id/view-farmer?id=missing')->assertNotFound();
    }
}
