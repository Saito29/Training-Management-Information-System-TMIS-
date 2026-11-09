<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DevelopmentAdministratorSeeder;
use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TmisSqlMigrationTest extends TestCase
{
    private ?Connection $schemaConnection = null;

    protected function setUp(): void
    {
        parent::setUp();
        $database = getenv('TMIS_SCHEMA_TEST_DATABASE');
        if (! $database) {
            $this->markTestSkipped('Set TMIS_SCHEMA_TEST_DATABASE for isolated PostgreSQL schema tests.');
        }
        config(['database.connections.dump_schema_test' => array_replace(config('database.connections.pgsql'), ['database' => $database, 'url' => null])]);
        DB::setDefaultConnection('dump_schema_test');
        Schema::clearResolvedInstance('db.schema');
        $this->schemaConnection = DB::connection('dump_schema_test');
        $this->schemaConnection->beginTransaction();
        $schema = 'tmis_migration_test_'.bin2hex(random_bytes(6));
        $this->schemaConnection->statement('CREATE SCHEMA "'.$schema.'"');
        $this->schemaConnection->statement('SET LOCAL search_path TO "'.$schema.'"');
        foreach (glob(database_path('migrations/*.php')) as $file) {
            (require $file)->up();
        }
    }

    protected function tearDown(): void
    {
        if ($this->schemaConnection !== null && $this->schemaConnection->transactionLevel() > 0) {
            $this->schemaConnection->rollBack();
        }
        DB::purge('dump_schema_test');
        parent::tearDown();
    }

    /** @param array<string, mixed> $attributes */
    private function account(array $attributes = []): int
    {
        return DB::table('users')->insertGetId(array_replace([
            'email' => 'schema@example.test', 'first_name' => 'Schema', 'last_name' => 'Example',
            'role_id' => 1, 'region_id' => 4, 'org_id' => 1, 'position' => 'Officer',
        ], $attributes), 'user_id');
    }

    public function test_new_user_defaults_and_primary_key_follow_the_dump(): void
    {
        $id = $this->account();

        $this->assertSame(1, $id);
        $this->assertDatabaseHas('users', ['user_id' => 1, 'email_verified' => false, 'status' => 'Pending approval', 'active_status' => 0, 'is_updated_at' => null]);
        $this->assertFalse(Schema::hasColumn('users', 'id'));
        $this->assertFalse(Schema::hasColumn('users', 'email_verfied'));
        $this->assertFalse(Schema::hasTable('users_role'));
        $this->assertSame('user_id', (new User)->getKeyName());
    }

    public function test_reference_ids_and_sequence_defaults_match_the_new_dump(): void
    {
        $this->assertDatabaseCount('region', 17);
        $this->assertDatabaseHas('region', ['region_id' => 4, 'name' => 'Region IV-A']);
        $this->assertDatabaseHas('organization', ['org_id' => 2, 'region_id' => 4, 'name' => 'DA - 4K']);
        $this->assertDatabaseHas('user_roles', ['role_id' => 2, 'name' => 'Data Encoder']);
        $this->assertDatabaseHas('user_roles', ['role_id' => 3, 'name' => 'Program Administrator']);
        $this->assertSame(18, DB::table('region')->insertGetId(['name' => 'Test region'], 'region_id'));
        $this->assertSame(3, DB::table('organization')->insertGetId(['region_id' => 4, 'name' => 'Test office'], 'org_id'));
        $this->assertSame(5, DB::table('user_roles')->insertGetId(['name' => 'Test role'], 'role_id'));
    }

    public function test_email_uniqueness_is_case_insensitive(): void
    {
        $this->account();
        $this->expectException(QueryException::class);

        $this->account(['email' => 'SCHEMA@example.test']);
    }

    /** @return array<string, array{array<string, mixed>}> */
    public static function invalidAccounts(): array
    {
        return [
            'unknown role' => [['role_id' => 999]],
            'unknown region' => [['region_id' => 999]],
            'unknown organization' => [['org_id' => 999]],
            'missing approval' => [['status' => null]],
            'blank approval' => [['status' => '']],
            'obsolete approval label' => [['status' => 'Approved & Rejected']],
            'missing activation' => [['active_status' => null]],
            'missing verification' => [['email_verified' => null]],
            'invalid sex' => [['sex' => 'invalid']],
        ];
    }

    #[DataProvider('invalidAccounts')]
    public function test_database_rejects_invalid_account_state(array $attributes): void
    {
        $this->expectException(QueryException::class);

        $this->account($attributes);
    }

    public function test_only_one_authentication_record_is_allowed_per_user(): void
    {
        $id = $this->account();
        DB::table('user_auth')->insert(['user_id' => $id, 'password_hash' => 'first']);
        $this->expectException(QueryException::class);

        DB::table('user_auth')->insert(['user_id' => $id, 'password_hash' => 'second']);
    }

    public function test_only_one_current_challenge_is_allowed_per_user(): void
    {
        $id = $this->account();
        DB::table('user_verify')->insert(['user_id' => $id, 'code_hash' => 'first']);
        $this->expectException(QueryException::class);

        DB::table('user_verify')->insert(['user_id' => $id, 'code_hash' => 'second']);
    }

    public function test_user_id_updates_cascade_to_auth_challenges_and_logs(): void
    {
        $id = $this->account();
        DB::table('user_auth')->insert(['user_id' => $id, 'password_hash' => 'fixture']);
        DB::table('user_verify')->insert(['user_id' => $id, 'code_hash' => 'fixture']);
        DB::table('users_log')->insert(['user_id' => $id, 'actor_user_id' => $id]);

        DB::table('users')->where('user_id', $id)->update(['user_id' => 100]);

        $this->assertDatabaseHas('user_auth', ['user_id' => 100]);
        $this->assertDatabaseHas('user_verify', ['user_id' => 100]);
        $this->assertDatabaseHas('users_log', ['user_id' => 100, 'actor_user_id' => 100]);
    }

    public function test_deletion_cannot_orphan_authentication_records(): void
    {
        $id = $this->account();
        DB::table('user_auth')->insert(['user_id' => $id, 'password_hash' => 'fixture']);
        $this->expectException(QueryException::class);

        DB::table('users')->where('user_id', $id)->delete();
    }

    public function test_reference_updates_cascade_to_users_and_organizations(): void
    {
        $this->account();

        DB::table('region')->where('region_id', 4)->update(['region_id' => 40]);
        DB::table('organization')->where('org_id', 1)->update(['org_id' => 10]);
        DB::table('user_roles')->where('role_id', 1)->update(['role_id' => 10]);

        $this->assertDatabaseHas('users', ['user_id' => 1, 'region_id' => 40, 'org_id' => 10, 'role_id' => 10]);
        $this->assertDatabaseHas('organization', ['org_id' => 10, 'region_id' => 40]);
    }

    public function test_updates_touch_the_correct_timestamp_without_faking_a_login(): void
    {
        $this->account();
        DB::table('user_auth')->insert(['user_id' => 1, 'password_hash' => 'fixture']);

        DB::table('users')->where('user_id', 1)->update(['first_name' => 'Schema']);
        $this->assertNull(DB::table('users')->value('is_updated_at'));
        DB::table('users')->where('user_id', 1)->update(['first_name' => 'Changed']);
        $this->assertNotNull(DB::table('users')->value('is_updated_at'));
        DB::table('user_auth')->where('user_id', 1)->update(['password_hash' => 'changed']);
        $this->assertNotNull(DB::table('user_auth')->value('updated_at'));
        $this->assertNull(DB::table('user_auth')->value('last_login_at'));
        DB::table('users')->where('user_id', 1)->update(['first_name' => 'Explicit', 'is_updated_at' => '2020-01-01 00:00:00']);
        $this->assertDatabaseHas('users', ['is_updated_at' => '2020-01-01 00:00:00']);
    }

    public function test_migration_rolls_back_tables_and_timestamp_functions(): void
    {
        foreach (array_reverse(glob(database_path('migrations/*.php'))) as $file) {
            (require $file)->down();
        }

        $this->assertFalse(Schema::hasTable('users'));
        $this->assertFalse(Schema::hasTable('user_roles'));
        $this->assertSame(0, (int) DB::selectOne("SELECT COUNT(*) AS total FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = current_schema() AND p.proname LIKE 'tmis_%'")->total);
    }

    public function test_development_seeder_uses_new_assignments_and_valid_credentials(): void
    {
        $this->assertSame(0, Artisan::call('db:seed', ['--class' => DevelopmentAdministratorSeeder::class, '--no-interaction' => true]));
        preg_match('/Temporary password: (.+)/', Artisan::output(), $matches);
        $auth = DB::table('user_auth')->first();

        $this->assertTrue(Hash::check(trim($matches[1]), $auth->password_hash));
        $this->assertDatabaseHas('users', ['user_id' => 1, 'role_id' => 1, 'region_id' => 4, 'org_id' => 1, 'email_verified' => true, 'status' => 'Approved & Accepted']);
        $this->assertDatabaseHas('users_log', ['event' => 'development_account_created']);
    }

    public function test_development_seeder_preserves_existing_accounts(): void
    {
        $id = $this->account(['email' => 'DEV-ADMIN@example.test', 'role_id' => 2]);
        DB::table('user_auth')->insert(['user_id' => $id, 'password_hash' => 'existing']);

        (new DevelopmentAdministratorSeeder)->run();

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', ['role_id' => 2, 'status' => 'Pending approval']);
        $this->assertDatabaseHas('user_auth', ['password_hash' => 'existing']);
    }

    public function test_development_seeder_is_blocked_in_production(): void
    {
        $this->app->instance('env', 'production');
        $this->expectException(\RuntimeException::class);

        (new DevelopmentAdministratorSeeder)->run();
    }

    public function test_development_seeder_rejects_an_inactive_administrator_role(): void
    {
        DB::table('user_roles')->where('role_id', 1)->update(['is_active' => 0]);
        $this->expectException(\RuntimeException::class);

        (new DevelopmentAdministratorSeeder)->run();
    }
}
