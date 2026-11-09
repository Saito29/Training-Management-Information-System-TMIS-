<?php

namespace Tests\Feature;

use App\Mail\Authentication\LoginVerificationCode;
use App\Support\TmisSqlDump;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TmisPostgresImportTest extends TestCase
{
    public function test_updated_dump_imports_in_an_isolated_postgresql_schema(): void
    {
        $database = getenv('TMIS_SCHEMA_TEST_DATABASE');
        $dump = getenv('TMIS_IMPORT_TEST_DUMP');
        if (! $database || ! $dump) {
            $this->markTestSkipped('Set TMIS_SCHEMA_TEST_DATABASE and TMIS_IMPORT_TEST_DUMP for the isolated PostgreSQL import test.');
        }
        config(['database.connections.import_test' => array_replace(config('database.connections.pgsql'), ['database' => $database, 'url' => null])]);
        DB::setDefaultConnection('import_test');
        Schema::clearResolvedInstance('db.schema');
        $connection = DB::connection('import_test');
        $connection->beginTransaction();
        try {
            $schema = 'tmis_import_test_'.bin2hex(random_bytes(6));
            $connection->statement('CREATE SCHEMA "'.$schema.'"');
            $connection->statement('SET LOCAL search_path TO "'.$schema.'"');
            foreach (glob(database_path('migrations/*.php')) as $file) {
                (require $file)->up();
            }
            $options = ['path' => $dump, '--apply' => true, '--approve-legacy-status' => true];

            $this->assertSame(0, Artisan::call('tmis:import-sql', $options), Artisan::output());

            $this->assertDatabaseCount('users', 1);
            $this->assertDatabaseHas('users', ['user_id' => 1, 'role_id' => 1, 'region_id' => 4, 'org_id' => 1, 'status' => 'Approved & Accepted']);
            $this->assertDatabaseHas('user_auth', ['user_id' => 1, 'token' => null, 'code_hash' => null]);
            $this->assertDatabaseHas('users_log', ['event' => 'account_imported']);
            $this->assertSame(0, Artisan::call('tmis:import-sql', $options));
            $this->assertDatabaseCount('users', 1);
            $this->assertDatabaseCount('users_log', 1);
            $source = (new TmisSqlDump)->parse(file_get_contents($dump));
            $this->assertSame($source['user_auth'][0]['password_hash'], DB::table('user_auth')->value('password_hash'));
            $this->assertFalse(Schema::hasColumn('users', 'id'));
            $this->assertFalse(Schema::hasTable('users_role'));
            $this->assertSame(2, DB::table('users')->insertGetId([
                'first_name' => 'Sequence', 'last_name' => 'Check', 'email' => 'sequence@example.test',
                'role_id' => 2, 'region_id' => 4, 'org_id' => 2, 'position' => 'Encoder',
            ], 'user_id'));

            Mail::fake();
            DB::table('user_auth')->where('user_id', 1)->update(['password_hash' => Hash::make('Isolated-password-123!')]);
            $this->post('/login', ['email' => $source['users'][0]['email'], 'password' => 'Isolated-password-123!'])->assertRedirect(route('verification'));
            $code = Mail::sent(LoginVerificationCode::class)->last()->code;
            $this->post('/two-factor', ['verification_code' => $code])->assertRedirect(route('admin.dashboard.dashboard'));
            $this->get(route('admin.dashboard.dashboard'))->assertOk();
            $this->assertAuthenticated();
        } finally {
            $connection->rollBack();
            DB::purge('import_test');
        }
    }
}
