<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TmisImportTest extends TestCase
{
    use RefreshDatabase;

    private ?string $dumpPath = null;

    protected function tearDown(): void
    {
        if ($this->dumpPath !== null) {
            unlink($this->dumpPath);
        }
        parent::tearDown();
    }

    private function dump(string $status = 'Approved & Rejected', int $role = 2): string
    {
        $hash = Hash::make('Import-password-123!');
        $sql = <<<SQL
        INSERT INTO `region` (`region_id`, `name`, `is_active`, `created_at`, `updated_at`) VALUES
        (4, 'Region IV-A', 1, '2026-11-05 07:08:50', NULL);
        INSERT INTO `organization` (`org_id`, `region_id`, `name`, `details`, `is_active`, `created_at`, `updated_at`) VALUES
        (3, 4, 'Imported Office', 'Director''s office; data', 1, '2026-11-05 07:08:50', NULL);
        INSERT INTO `user_roles` (`role_id`, `name`, `details`, `is_active`, `created_at`, `updated_at`) VALUES
        (2, 'Data Encoder', NULL, 1, '2026-11-05 07:08:50', NULL);
        INSERT INTO `users` (`user_id`, `email`, `last_name`, `first_name`, `middle_name`, `extension_name`, `date_of_birth`, `sex`, `mobile_number`, `role_id`, `region_id`, `org_id`, `position`, `email_verified`, `status`, `active_status`, `profile_photo_path`, `is_created_at`, `is_updated_at`) VALUES
        (1, 'import@example.test', 'Example', 'Import', NULL, NULL, NULL, 'Male', NULL, {$role}, 4, 3, 'Officer', 1, '{$status}', 1, NULL, '2026-11-05 07:08:50', NULL);
        INSERT INTO `user_auth` (`id`, `user_id`, `password_hash`, `email_two_factor_enabled`, `token`, `created_at`, `updated_at`) VALUES
        (1, 1, '{$hash}', 1, 'stale-token', '2026-11-05 07:08:50', NULL);
        SQL;
        $this->dumpPath = tempnam(sys_get_temp_dir(), 'tmis-import-');
        file_put_contents($this->dumpPath, $sql);

        return $this->dumpPath;
    }

    public function test_import_preserves_source_assignments_and_can_be_repeated(): void
    {
        $existing = User::factory()->create(['user_id' => 260001, 'role_id' => 2]);
        $path = $this->dump();

        $this->artisan('tmis:import-sql', ['path' => $path, '--apply' => true, '--approve-legacy-status' => true])->assertSuccessful();

        $this->assertDatabaseHas('users', ['user_id' => 1, 'role_id' => 2, 'region_id' => 4, 'status' => 'Approved & Accepted', 'email_verified' => true, 'sex' => 'Male']);
        $this->assertDatabaseHas('users', ['user_id' => $existing->user_id, 'role_id' => 2]);
        $auth = DB::table('user_auth')->where('user_id', 1)->first();
        $this->assertTrue(Hash::check('Import-password-123!', $auth->password_hash));
        $this->assertNull($auth->token);
        $this->assertDatabaseHas('organization', ['org_id' => 3, 'name' => 'Imported Office', 'region_id' => 4, 'details' => "Director's office; data"]);
        $this->assertDatabaseHas('users_log', ['user_id' => 1, 'event' => 'account_imported']);

        $this->artisan('tmis:import-sql', ['path' => $path, '--apply' => true, '--approve-legacy-status' => true])->assertSuccessful();

        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseCount('user_auth', 1);
        $this->assertDatabaseCount('users_log', 1);
    }

    public function test_preview_writes_no_records(): void
    {
        $this->artisan('tmis:import-sql', ['path' => $this->dump(), '--approve-legacy-status' => true])->assertSuccessful();

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('organization', 2);
        $this->assertDatabaseCount('users_log', 0);
    }

    public function test_unconfirmed_approval_rolls_back_reference_imports(): void
    {
        $this->artisan('tmis:import-sql', ['path' => $this->dump(), '--apply' => true])->assertFailed();

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('organization', 2);
    }

    public function test_conflicting_public_id_aborts_without_overwriting_the_account(): void
    {
        $user = User::factory()->create(['user_id' => 1]);

        $this->artisan('tmis:import-sql', ['path' => $this->dump(), '--apply' => true, '--approve-legacy-status' => true])->assertFailed();

        $this->assertDatabaseHas('users', ['user_id' => 1, 'email' => $user->email]);
        $this->assertDatabaseCount('organization', 2);
        $this->assertDatabaseCount('user_auth', 0);
    }

    public function test_invalid_foreign_reference_rolls_back_everything(): void
    {
        $this->artisan('tmis:import-sql', ['path' => $this->dump('Pending approval', 999), '--apply' => true])->assertFailed();

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('organization', 2);
    }

    public function test_existing_email_and_credentials_are_preserved(): void
    {
        $user = User::factory()->create(['email' => 'IMPORT@example.test', 'user_id' => 260001]);
        DB::table('user_auth')->insert(['id' => 90, 'user_id' => $user->user_id, 'password_hash' => 'existing-hash']);

        $this->artisan('tmis:import-sql', ['path' => $this->dump(), '--apply' => true, '--approve-legacy-status' => true])->assertSuccessful();

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('user_auth', ['id' => 90, 'password_hash' => 'existing-hash']);
        $this->assertDatabaseCount('users_log', 0);
    }
}
