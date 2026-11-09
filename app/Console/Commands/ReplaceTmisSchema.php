<?php

namespace App\Console\Commands;

use App\Support\TmisSqlDump;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

class ReplaceTmisSchema extends Command
{
    protected $signature = 'tmis:replace-schema {path : Updated SQL dump} {--apply : Replace all old tables and data} {--backup= : Existing pg_dump backup path}';

    protected $description = 'Build the exact updated schema and atomically replace the old TMIS schema; preview by default';

    public function handle(TmisSqlDump $parser): int
    {
        $connection = DB::connection();
        if ($connection->getDriverName() !== 'pgsql' || $connection->getDatabaseName() !== 'tmis_db' || $connection->transactionLevel() !== 0) {
            $this->error('This operation requires a standalone connection to PostgreSQL tmis_db.');

            return self::FAILURE;
        }
        if ($this->option('apply') && (! app()->maintenanceMode()->active() || ! is_file((string) $this->option('backup')) || filesize($this->option('backup')) < 128)) {
            $this->error('Applying requires maintenance mode and an existing database backup supplied with --backup.');

            return self::FAILURE;
        }
        if (! is_readable($this->argument('path'))) {
            $this->error('The source SQL dump is not readable.');

            return self::FAILURE;
        }
        $staging = 'tmis_replacement_'.bin2hex(random_bytes(6));
        $previous = 'tmis_previous_'.bin2hex(random_bytes(6));
        try {
            $source = $parser->parse(file_get_contents($this->argument('path')));
            $connection->beginTransaction();
            $connection->select('SELECT pg_advisory_xact_lock(826491, 1)');
            $unexpected = $connection->select("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('users', 'user_auth', 'user_verify', 'users_role', 'user_roles', 'region', 'organization', 'password_reset_tokens', 'users_log', 'trainings_log', 'farmers_log', 'migrations')");
            $extensions = $connection->select("SELECT extname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE n.nspname = 'public'");
            if ($unexpected !== [] || $extensions !== []) {
                throw new RuntimeException('The old schema contains unexpected tables or extensions. Review them before replacement.');
            }
            $connection->statement('CREATE SCHEMA "'.$staging.'"');
            $connection->statement('SET LOCAL search_path TO "'.$staging.'"');
            Schema::clearResolvedInstance('db.schema');
            if (Artisan::call('migrate', ['--force' => true, '--no-interaction' => true]) !== 0) {
                throw new RuntimeException('Staged migrations failed.');
            }
            if (Artisan::call('tmis:import-sql', ['path' => $this->argument('path'), '--apply' => true, '--approve-legacy-status' => true, '--no-interaction' => true]) !== 0) {
                throw new RuntimeException('Staged SQL import failed: '.Artisan::output());
            }
            foreach (['users', 'user_auth', 'user_roles', 'region', 'organization'] as $table) {
                if (DB::table($table)->count() !== count($source[$table])) {
                    throw new RuntimeException('Staged record count differs from the SQL dump for '.$table.'.');
                }
            }
            foreach ($source['users'] as $user) {
                if (! DB::table('users')->where('user_id', $user['user_id'])->where('role_id', $user['role_id'])->where('region_id', $user['region_id'])->where('org_id', $user['org_id'])->exists()) {
                    throw new RuntimeException('Source user assignments were not preserved.');
                }
            }
            $this->info('Staged schema and source record counts verified.');
            if (! $this->option('apply')) {
                $connection->rollBack();
                $this->info('Preview rolled back; the old database is unchanged.');

                return self::SUCCESS;
            }
            $connection->statement('ALTER SCHEMA public RENAME TO "'.$previous.'"');
            $connection->statement('ALTER SCHEMA "'.$staging.'" RENAME TO public');
            $connection->statement('SET LOCAL search_path TO public');
            $connection->statement('DROP SCHEMA "'.$previous.'" CASCADE');
            $connection->commit();
            $this->info('Old tables and data removed. The new schema is now active in tmis_db.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            if ($connection->transactionLevel() > 0) {
                $connection->rollBack();
            }
            $this->error($exception instanceof RuntimeException && ! $exception instanceof QueryException ? $exception->getMessage() : 'Replacement failed and rolled back. Check database permissions and schema compatibility.');

            return self::FAILURE;
        } finally {
            Schema::clearResolvedInstance('db.schema');
        }
    }
}
