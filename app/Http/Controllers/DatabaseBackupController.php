<?php

namespace App\Http\Controllers;

use App\Http\Authentication\AuditTrail;
use App\Support\DatabaseBackupSignature;
use App\Support\ModuleAccess;
use App\Support\SystemMaintenance;
use App\Support\TmisSqlDump;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;
use Throwable;

class DatabaseBackupController
{
    /** Export a signed full-database dump that this application can later verify before restoring. */
    public function export(Request $request): BinaryFileResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);
        $this->ensureSupportedDatabase();

        $binary = $this->findPostgresBinary('pg_dump');
        abort_unless($binary, 503, 'PostgreSQL pg_dump is not installed or configured on this server.');

        $restrictKey = bin2hex(random_bytes(16));
        $directory = storage_path('app/private/database-backups');
        File::ensureDirectoryExists($directory, 0700);
        $path = tempnam($directory, 'tmis-backup-');
        abort_unless($path !== false, 500, 'A secure temporary backup file could not be created.');

        $connection = DB::connection()->getConfig();
        $processEnvironment = [
            'PGPASSWORD' => $connection['password'],
            'PGCONNECT_TIMEOUT' => '10',
        ];
        foreach (['SystemRoot', 'WINDIR', 'PATH', 'TEMP', 'TMP'] as $name) {
            $value = getenv($name) ?: ($_SERVER[$name] ?? null);
            if (is_string($value) && $value !== '') {
                $processEnvironment[$name] = $value;
            }
        }

        $process = new Process([
            $binary,
            '--format=plain',
            '--clean',
            '--if-exists',
            '--no-owner',
            '--no-privileges',
            '--no-password',
            '--restrict-key='.$restrictKey,
            '--host='.$connection['host'],
            '--port='.$connection['port'],
            '--username='.$connection['username'],
            '--dbname='.$connection['database'],
            '--file='.$path,
        ], base_path(), $processEnvironment);
        $process->setTimeout(600);

        try {
            $process->mustRun();
            abort_unless(is_file($path) && filesize($path) > 0, 503, 'PostgreSQL returned an empty backup.');
            app(DatabaseBackupSignature::class)->append($path);
            AuditTrail::record($request, 'database_backup_exported', $request->user(), after: ['reference' => 'full_postgresql_sql'], category: 'security');

            return response()->download(
                $path,
                'TMIS-database-backup-'.now()->format('Ymd-His').'.sql',
                [
                    'Cache-Control' => 'private, no-store',
                    'Content-Type' => 'application/sql; charset=utf-8',
                    'X-Content-Type-Options' => 'nosniff',
                ],
            )->deleteFileAfterSend(true);
        } catch (Throwable $exception) {
            if (is_file($path)) {
                File::delete($path);
            }
            report($exception);

            abort(503, 'The database backup could not be created. Check the server PostgreSQL backup configuration.');
        }
    }

    /** Import only allowlisted legacy account data while normal users are blocked by maintenance mode. */
    public function import(Request $request, SystemMaintenance $maintenance, TmisSqlDump $parser): RedirectResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);
        $this->ensureSupportedDatabase();
        abort_unless($maintenance->isActive(), 409, 'Enable system maintenance before importing database records.');

        $data = $request->validate([
            // Cap legacy imports at 50 MB so large account exports can be reviewed safely.
            'legacy_sql' => ['required', 'file', 'extensions:sql', 'max:51200'],
            'confirm_import' => ['accepted'],
        ]);
        $file = $data['legacy_sql'];

        try {
            $tables = $parser->parse($file->get());
        } catch (Throwable) {
            $this->recordImportFailure($request);

            return back()->withErrors(['legacy_sql' => 'This file is not a supported TMIS legacy MariaDB export. No data was changed.']);
        }

        $exitCode = Artisan::call('tmis:import-sql', [
            'path' => $file->getRealPath(),
            '--no-interaction' => true,
        ]);
        if ($exitCode !== 0) {
            $this->recordImportFailure($request);

            return back()->withErrors(['legacy_sql' => trim(Artisan::output()) ?: 'The legacy import preview failed. No data was changed.']);
        }

        $exitCode = Artisan::call('tmis:import-sql', [
            'path' => $file->getRealPath(),
            '--apply' => true,
            '--no-interaction' => true,
        ]);
        if ($exitCode !== 0) {
            $this->recordImportFailure($request);

            return back()->withErrors(['legacy_sql' => trim(Artisan::output()) ?: 'The legacy import failed and its transaction was rolled back.']);
        }

        AuditTrail::record(
            $request,
            'legacy_database_import_completed',
            $request->user(),
            after: ['reference' => 'TMIS legacy account records'],
            category: 'security',
        );

        return back()->with('operation_message', 'Legacy records imported. Existing accounts with matching email addresses were preserved.');
    }

    /** Restore an intact application-signed backup atomically, then keep the system paused for verification. */
    public function restore(Request $request, SystemMaintenance $maintenance, DatabaseBackupSignature $signature): RedirectResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);
        $this->ensureSupportedDatabase();
        abort_unless($maintenance->isActive(), 409, 'Enable system maintenance before restoring a database backup.');

        $data = $request->validate([
            // Full signed backups can be larger, while the cap still bounds restore resource use.
            'backup_sql' => ['required', 'file', 'extensions:sql', 'max:102400'],
            'confirm_restore' => ['accepted'],
        ]);
        $path = $data['backup_sql']->getRealPath();
        abort_unless(is_string($path) && $signature->isValid($path), 422, 'This is not an intact SQL backup exported by this TMIS system. No data was changed.');

        $binary = $this->findPostgresBinary('psql');
        abort_unless($binary, 503, 'PostgreSQL psql is not installed or configured on this server.');

        $connection = DB::connection()->getConfig();
        $process = new Process([
            $binary,
            '--no-psqlrc',
            '--no-password',
            '--set=ON_ERROR_STOP=1',
            '--single-transaction',
            '--host='.$connection['host'],
            '--port='.$connection['port'],
            '--username='.$connection['username'],
            '--dbname='.$connection['database'],
            '--file='.$path,
            "--command=UPDATE system_settings SET maintenance_enabled = TRUE, maintenance_starts_at = NULL, maintenance_until = NULL, maintenance_message = 'Database restore completed; access remains paused for verification.' WHERE id = 1",
        ], base_path(), [
            'PGPASSWORD' => $connection['password'],
            'PGCONNECT_TIMEOUT' => '10',
        ]);
        $process->setTimeout(600);

        Log::notice('A signed TMIS database backup restore was started.', ['actor_user_id' => $request->user()->user_id]);
        try {
            $process->mustRun();
        } catch (Throwable $exception) {
            report($exception);
            Log::error('A signed TMIS database backup restore failed.', ['actor_user_id' => $request->user()->user_id]);

            return back()->withErrors(['backup_sql' => 'The database restore failed and the PostgreSQL transaction was rolled back.']);
        }

        Log::notice('A signed TMIS database backup restore completed.', ['actor_user_id' => $request->user()->user_id]);

        return back()->with('operation_message', 'The signed TMIS database backup was restored successfully.');
    }

    /** Restrict native dump and restore tools to the PostgreSQL database this workflow was built for. */
    private function ensureSupportedDatabase(): void
    {
        $connection = DB::connection();
        abort_unless($connection->getDriverName() === 'pgsql' && $connection->getDatabaseName() === 'tmis_db', 503, 'Database backup and import are configured only for PostgreSQL tmis_db.');
    }

    /** Resolve the configured PostgreSQL executable, including standard Windows installations outside PATH. */
    private function findPostgresBinary(string $tool): ?string
    {
        $configuredBinary = (string) config('database.connections.pgsql.'.$tool.'_binary', $tool);
        $binary = is_file($configuredBinary) ? $configuredBinary : (new ExecutableFinder)->find($configuredBinary);
        if ($binary) {
            return $binary;
        }

        if (DIRECTORY_SEPARATOR === '\\') {
            $installedBinaries = glob('C:/Program Files/PostgreSQL/*/bin/'.$tool.'.exe') ?: [];
            usort($installedBinaries, static fn (string $left, string $right): int => strnatcmp($right, $left));

            return $installedBinaries[0] ?? null;
        }

        return null;
    }

    /** Leave an audit event when a legacy data import is rejected or rolled back. */
    private function recordImportFailure(Request $request): void
    {
        AuditTrail::record($request, 'legacy_database_import_failed', $request->user(), outcome: 'failure', category: 'security');
    }
}
