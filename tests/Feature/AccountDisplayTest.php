<?php

namespace Tests\Feature;

use App\Http\Authentication\AccountDisplay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccountDisplayTest extends TestCase
{
    use RefreshDatabase;

    public function test_pages_display_only_the_authenticated_database_account(): void
    {
        $other = User::factory()->create();
        $user = User::factory()->create(['role_id' => 3, 'first_name' => 'Maria <script>', 'middle_name' => 'Cruz', 'last_name' => 'Santos']);
        $hash = Hash::make('Private-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);
        foreach (['admin.dashboard.dashboard', 'admin.users.profile', 'admin.users.logs'] as $route) {
            $response = $this->get(route($route))->assertOk()->assertSee('Maria &lt;script&gt; C. Santos', false)->assertDontSee('Maria <script>', false)->assertDontSee($other->email)->assertDontSee($hash, false)->assertDontSee(hash('sha256', $hash), false);
            $profile = $response->viewData('accountDisplay');
            $this->assertSame($user->email, $profile['email']);
            $this->assertSame('Approved & Accepted', $profile['status']);
            $this->assertSame(1, (int) $profile['activeStatus']);
            $this->assertSame(DB::table('user_roles')->where('role_id', $user->role_id)->value('name'), $profile['role']);
            $this->assertSame(DB::table('region')->where('region_id', $user->region_id)->value('name'), $profile['region']);
            $this->assertSame(DB::table('organization')->where('org_id', $user->org_id)->value('name'), $profile['office']);
        }
        $this->get(route('system.accounts'))->assertNotFound()->assertDontSee($other->email);
        $this->get(route('admin.administration.id.view-user', ['user_id' => $user->user_id]))->assertNotFound();
        DB::table('users')->where('user_id', $user->user_id)->update(['first_name' => 'Updated', 'middle_name' => null]);
        $this->get(route('admin.dashboard.dashboard'))->assertOk()->assertSee('Updated Santos')->assertDontSee('Updated . Santos');
    }

    public function test_system_administrator_can_access_user_administration_and_other_account_emails(): void
    {
        $other = User::factory()->create(['role_id' => 3, 'email' => 'other-account@example.test']);
        $administrator = User::factory()->create(['role_id' => 1]);
        $hash = Hash::make('Private-password-123!');
        DB::table('user_auth')->insert(['user_id' => $administrator->user_id, 'password_hash' => $hash]);
        $this->actingAs($administrator)->withSession(['auth.verified_user_id' => $administrator->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);

        $this->assertDatabaseMissing('system_super_admins', ['user_id' => $administrator->user_id]);
        $this->get(route('admin.administration.id.view-user', ['user_id' => $other->user_id]))->assertOk();
        $this->get(route('system.accounts'))->assertOk()->assertSee($other->email);
    }

    public function test_profile_displays_the_assigned_credential_with_the_base_role(): void
    {
        $user = User::factory()->create(['role_id' => 2]);
        $credentialId = DB::table('role_credentials')->where('role_id', 2)->where('name', 'Evaluator')->value('role_credential_id');
        DB::table('users')->where('user_id', $user->user_id)->update(['role_credential_id' => $credentialId]);
        $user->role_credential_id = $credentialId;
        DB::table('role_permissions')->insert([
            ['role_id' => 2, 'permission' => 'participants.read'],
            ['role_id' => 2, 'permission' => 'trainings.submit'],
        ]);
        DB::table('role_credential_permissions')->insert(['role_credential_id' => $credentialId, 'permission' => 'questionnaires.read']);
        DB::table('role_credential_denied_permissions')->insert(['role_credential_id' => $credentialId, 'permission' => 'participants.read']);
        $hash = Hash::make('Private-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);

        $this->get(route('admin.users.profile'))->assertOk()
            ->assertSee('Data Encoder')
            ->assertDontSee('Data Encoder - Evaluator')
            ->assertSee('Your assigned access')
            ->assertSee('Base role permissions')
            ->assertSee('Trainings / Submit')
            ->assertSee('Credential add-on: Evaluator')
            ->assertSee('Questionnaires / Read')
            ->assertSee('Blocked by your credential')
            ->assertSee('Participants / Read');
        $this->assertSame('Evaluator', app(AccountDisplay::class)->forUser($user)['credential']);
        $this->assertSame('Data Encoder', app(AccountDisplay::class)->forUser($user)['role']);
    }

    public function test_personal_updates_are_scoped_and_do_not_change_account_permissions(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $hash = Hash::make('Private-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        $this->patchJson(route('profile.update'), ['firstName' => 'Guest'])->assertRedirect(route('login'));
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);
        $this->patchJson(route('profile.update'), ['firstName' => '', 'lastName' => 'Name', 'dateOfBirth' => '2999-01-01'])
            ->assertUnprocessable()->assertJsonValidationErrors(['firstName', 'dateOfBirth']);
        $this->patchJson(route('profile.update'), [
            'id' => $other->user_id, 'firstName' => 'Updated', 'lastName' => 'Person', 'middleName' => null,
            'phone' => '+639123456789', 'role_id' => 999, 'active_status' => 0, 'status' => 'rejected', 'email' => 'changed@example.com',
        ])->assertOk()->assertJsonPath('user.navigationName', 'Updated Person');
        $this->assertDatabaseHas('users', ['user_id' => $user->user_id, 'first_name' => 'Updated', 'middle_name' => null, 'email' => $user->email, 'role_id' => $user->role_id, 'active_status' => 1, 'status' => 'Approved & Accepted']);
        $this->assertDatabaseHas('users', ['user_id' => $other->user_id, 'first_name' => $other->first_name]);
    }

    public function test_missing_and_invalid_account_photos_use_initials_in_navigation(): void
    {
        $user = User::factory()->create(['first_name' => 'Ana', 'last_name' => 'Santos']);
        $display = app(AccountDisplay::class);
        foreach ([null, 'storage/profile-photos/missing.jpg', '../../secret.png', 'https://example.com/avatar.png'] as $path) {
            DB::table('users')->where('user_id', $user->user_id)->update(['profile_photo_path' => $path]);
            $profile = $display->forUser($user);
            $this->assertNull($profile['photoUrl']);
            $this->assertSame('AS', $profile['initials']);
        }
        $markup = view('layouts.account-avatar', ['accountDisplay' => $profile])->render();
        $this->assertStringContainsString('account-avatar-initials', $markup);
        $this->assertStringContainsString('AS', $markup);
        $this->assertStringNotContainsString('<img', $markup);
    }

    public function test_existing_public_account_image_resolves_its_database_path(): void
    {
        $user = User::factory()->create(['profile_photo_path' => '/assets/user_profile/user_profile.jpg']);
        $profile = app(AccountDisplay::class)->forUser($user);
        $this->assertSame(asset('assets/user_profile/user_profile.jpg'), $profile['photoUrl']);
    }
}
