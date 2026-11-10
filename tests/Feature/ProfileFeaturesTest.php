<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Authenticator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProfileFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private function account(int $role = 1): User
    {
        $user = User::factory()->create(['role_id' => $role]);
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => Hash::make('Valid-password-123!')]);

        return $user;
    }

    private function signIn(User $user): void
    {
        $hash = DB::table('user_auth')->where('user_id', $user->user_id)->value('password_hash');
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);
    }

    private function enableAuthenticator(): array
    {
        $setup = $this->postJson('/profile/security/setup', ['current_password' => 'Valid-password-123!'])->assertOk();
        $secret = $setup->json('secret');
        $response = $this->postJson('/profile/security/enable', ['code' => app(Authenticator::class)->code($secret, now()->timestamp)])->assertOk();

        return [$secret, $response->json('recoveryCodes')];
    }

    public function test_profile_photo_accepts_ten_megabytes_and_is_private_to_its_owner(): void
    {
        Storage::fake('local');
        $user = $this->account(2);
        $this->signIn($user);
        $response = $this->postJson('/profile/photo', ['photo' => UploadedFile::fake()->createWithContent('avatar.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6H0AAAAASUVORK5CYII='))->size(10240)])->assertOk();
        $path = DB::table('users')->where('user_id', $user->user_id)->value('profile_photo_path');
        Storage::disk('local')->assertExists($path);
        $this->assertStringContainsString('/profile/photo', $response->json('user.photoUrl'));
        $this->get(route('admin.users.profile'))->assertOk()
            ->assertSee(route('profile.photo', ['v' => substr(hash('sha256', $path), 0, 12)]), false)
            ->assertSee('id="myProfileAvatar"', false);
        $this->get('/profile/photo')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $other = $this->account(2);
        $this->signIn($other);
        $this->get('/profile/photo')->assertNotFound();
        $this->signIn($user);
        $this->deleteJson('/profile/photo')->assertOk()->assertJsonPath('user.photoUrl', null);
        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseHas('users_log', ['event' => 'profile_photo_removed', 'actor_user_id' => $user->user_id]);
    }

    public function test_profile_activity_uses_server_entries_and_actor_names_without_user_ids(): void
    {
        $user = $this->account();
        DB::table('users')->where('user_id', $user->user_id)->update([
            'first_name' => 'Mark',
            'middle_name' => 'Kinnedy',
            'last_name' => 'Anda',
        ]);
        $this->signIn($user);
        DB::table('users_log')->insert([
            'actor_user_id' => $user->user_id,
            'user_id' => $user->user_id,
            'event' => 'profile_updated',
            'category' => 'account',
            'outcome' => 'success',
        ]);
        $office = DB::table('organization')->where('org_id', $user->org_id)->value('name');

        $this->get(route('admin.users.profile'))->assertOk()
            ->assertSee('window.TMIS_PROFILE_LOG_DATA', false)
            ->assertSee('Profile Updated')
            ->assertSee('Mark K. Anda - '.$office)
            ->assertDontSee('actor_user_id');
    }

    public function test_profile_photo_rejects_oversized_and_non_image_uploads(): void
    {
        Storage::fake('local');
        $this->signIn($this->account());
        $this->postJson('/profile/photo', ['photo' => UploadedFile::fake()->createWithContent('big.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6H0AAAAASUVORK5CYII='))->size(10241)])->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->postJson('/profile/photo', ['photo' => UploadedFile::fake()->createWithContent('fake.jpg', '<script>alert(1)</script>')])->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->assertCount(0, Storage::disk('local')->allFiles());
    }

    public function test_authenticator_setup_requires_password_encrypts_secret_and_enables_only_after_proof(): void
    {
        $user = $this->account();
        $this->signIn($user);
        $this->postJson('/profile/security/setup', ['current_password' => 'Wrong-password'])->assertUnprocessable()->assertJsonValidationErrors('current_password');
        [$secret, $codes] = $this->enableAuthenticator();
        $this->assertCount(8, $codes);
        $account = DB::table('user_auth')->where('user_id', $user->user_id)->first();
        $this->assertNotSame($secret, $account->totp_secret);
        $this->assertSame($secret, Crypt::decryptString($account->totp_secret));
        $this->assertStringNotContainsString($codes[0], $account->totp_recovery_codes);
        $this->getJson('/profile/security')->assertOk()->assertJsonPath('enabled', true)->assertJsonPath('recoveryRemaining', 8)->assertDontSee($secret);
        $this->assertDatabaseHas('users_log', ['event' => 'authenticator_enabled', 'actor_user_id' => $user->user_id]);
    }

    public function test_authenticator_login_rejects_replayed_code_accepts_one_time_recovery_and_sends_no_email(): void
    {
        Mail::fake();
        $this->freezeTime();
        $user = $this->account();
        $this->signIn($user);
        [$secret,$codes] = $this->enableAuthenticator();
        $this->post('/logout')->assertRedirect();
        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])->assertRedirect(route('verification'));
        $this->get('/two-factor')->assertOk()->assertSee('Open your authenticator.');
        $this->post('/two-factor', ['verification_code' => app(Authenticator::class)->code($secret, now()->timestamp)])->assertSessionHasErrors('verification_code');
        $this->post('/two-factor', ['verification_code' => $codes[0]])->assertRedirect(route('admin.dashboard.dashboard'));
        $this->get('/app/admin/users/profile')->assertOk();
        $this->getJson('/profile/security')->assertJsonPath('recoveryRemaining', 7);
        $this->post('/logout')->assertRedirect();
        $this->travel(31)->seconds();
        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!'])->assertRedirect(route('verification'));
        $this->post('/two-factor', ['verification_code' => app(Authenticator::class)->code($secret, now()->timestamp)])->assertRedirect(route('admin.dashboard.dashboard'));
        $this->get('/app/admin/users/profile')->assertOk();
        Mail::assertNothingSent();
    }

    public function test_authenticator_disable_requires_password_and_valid_code_and_invalidates_recovery_codes(): void
    {
        $user = $this->account();
        $this->signIn($user);
        [$secret,$codes] = $this->enableAuthenticator();
        $this->postJson('/profile/security/disable', ['current_password' => 'wrong', 'code' => $codes[0]])->assertUnprocessable();
        $this->postJson('/profile/security/disable', ['current_password' => 'Valid-password-123!', 'code' => 'bad'])->assertUnprocessable();
        $this->postJson('/profile/security/disable', ['current_password' => 'Valid-password-123!', 'code' => $codes[0]])->assertOk();
        $this->getJson('/profile/security')->assertJsonPath('enabled', false)->assertJsonPath('recoveryRemaining', 0);
        $this->assertDatabaseHas('user_auth', ['user_id' => $user->user_id, 'totp_secret' => null, 'totp_recovery_codes' => null]);
    }

    public function test_expired_authenticator_setup_and_wrong_proof_are_rejected(): void
    {
        $this->freezeTime();
        $this->signIn($this->account());
        $secret = $this->postJson('/profile/security/setup', ['current_password' => 'Valid-password-123!'])->assertOk()->json('secret');
        $this->postJson('/profile/security/enable', ['code' => 'abcdef'])->assertUnprocessable();
        $this->travel(11)->minutes();
        $this->postJson('/profile/security/enable', ['code' => app(Authenticator::class)->code($secret, now()->timestamp)])->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_device_list_is_scoped_and_revoked_session_cannot_open_protected_pages(): void
    {
        $user = $this->account();
        $other = $this->account();
        $this->signIn($user);
        $own = $this->getJson('/profile/security/sessions')->assertOk()->json('sessions.0');
        $this->assertTrue($own['isCurrent']);
        $this->assertArrayNotHasKey('session_hash', $own);
        $foreign = (string) Str::uuid();
        DB::table('user_device_sessions')->insert(['id' => $foreign, 'user_id' => $other->user_id, 'session_hash' => hash('sha256', 'foreign-session'), 'created_at' => now(), 'last_activity_at' => now()]);
        $this->getJson('/profile/security/sessions')->assertJsonCount(1, 'sessions');
        $this->postJson('/profile/security/sessions/revoke', ['id' => $foreign])->assertNotFound();
        $this->postJson('/profile/security/sessions/revoke', ['id' => $own['id']])->assertUnprocessable();
        DB::table('user_device_sessions')->where('id', $own['id'])->update(['revoked_at' => now()]);
        $this->get('/app/admin/users/profile')->assertRedirect(route('login'));
    }

    public function test_sign_out_other_sessions_keeps_current_session_and_invalidates_old_generations(): void
    {
        $user = $this->account();
        $this->signIn($user);
        $this->getJson('/profile/security/sessions')->assertOk();
        $id = (string) Str::uuid();
        DB::table('user_device_sessions')->insert(['id' => $id, 'user_id' => $user->user_id, 'session_hash' => hash('sha256', 'other-session'), 'created_at' => now(), 'last_activity_at' => now()]);
        $this->postJson('/profile/security/sessions/revoke-others', [])->assertOk();
        $this->assertNotNull(DB::table('user_device_sessions')->where('id', $id)->value('revoked_at'));
        $this->getJson('/profile/security/sessions')->assertOk()->assertJsonCount(1, 'sessions');
        $this->withSession(['auth.session_generation' => 0])->get('/app/admin/users/profile')->assertRedirect(route('login'));
    }

    public function test_password_change_requires_current_password_and_keeps_current_session(): void
    {
        $user = $this->account();
        $this->signIn($user);
        $this->postJson('/profile/security/password', ['current_password' => 'wrong', 'password' => 'New-password-456!', 'password_confirmation' => 'New-password-456!'])->assertUnprocessable();
        $this->postJson('/profile/security/password', ['current_password' => 'Valid-password-123!', 'password' => 'New-password-456!', 'password_confirmation' => 'New-password-456!'])->assertOk();
        $this->assertTrue(Hash::check('New-password-456!', DB::table('user_auth')->where('user_id', $user->user_id)->value('password_hash')));
        $this->getJson('/profile/security')->assertOk();
    }

    public function test_office_update_delete_are_admin_only_and_used_offices_are_protected(): void
    {
        $this->signIn($this->account());
        $id = $this->postJson('/system/offices', ['region_id' => 4, 'name' => 'Temporary office'])->assertCreated()->json('office.org_id');
        $this->patchJson('/system/offices/'.$id, ['name' => 'Renamed office', 'details' => 'Updated'])->assertOk()->assertJsonPath('office.name', 'Renamed office');
        $this->assertDatabaseHas('organization', ['org_id' => $id, 'name' => 'Renamed office', 'region_id' => 4]);
        $this->patchJson('/system/offices/'.$id, ['name' => 'DA - SAAD'])->assertUnprocessable();
        $this->deleteJson('/system/offices/1')->assertStatus(409);
        $this->deleteJson('/system/offices/'.$id)->assertOk();
        $this->assertDatabaseMissing('organization', ['org_id' => $id]);
        $this->signIn($this->account(2));
        $this->patchJson('/system/offices/1', ['name' => 'Denied'])->assertForbidden();
        $this->deleteJson('/system/offices/1')->assertForbidden();
    }

    public function test_guest_cannot_access_account_security_photo_or_devices(): void
    {
        foreach (['/profile/security', '/profile/security/sessions', '/profile/photo'] as $path) {
            $this->get($path)->assertRedirect(route('login'));
        }
        $this->postJson('/profile/security/setup', ['current_password' => 'anything'])->assertRedirect(route('login'));
    }

    public function test_recovery_code_cannot_be_reused_and_session_revocation_is_enforced(): void
    {
        $this->freezeTime();
        $user = $this->account();
        $this->signIn($user);
        [$secret, $codes] = $this->enableAuthenticator();
        $this->post('/logout');
        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!']);
        $this->post('/two-factor', ['verification_code' => $codes[0]])->assertRedirect(route('admin.dashboard.dashboard'));
        $this->post('/logout');
        $this->post('/login', ['email' => $user->email, 'password' => 'Valid-password-123!']);
        $this->post('/two-factor', ['verification_code' => $codes[0]])->assertSessionHasErrors('verification_code');
        $this->assertGuest();
    }

    public function test_individual_other_device_can_be_revoked_without_revoking_current_device(): void
    {
        $user = $this->account();
        $this->signIn($user);
        $this->getJson('/profile/security/sessions')->assertOk();
        $id = (string) Str::uuid();
        DB::table('user_device_sessions')->insert(['id' => $id, 'user_id' => $user->user_id, 'session_hash' => hash('sha256', 'second-device'), 'created_at' => now(), 'last_activity_at' => now()]);
        $this->postJson('/profile/security/sessions/revoke', ['id' => $id])->assertOk();
        $this->assertNotNull(DB::table('user_device_sessions')->where('id', $id)->value('revoked_at'));
        $this->getJson('/profile/security/sessions')->assertOk()->assertJsonCount(1, 'sessions');
    }
}
