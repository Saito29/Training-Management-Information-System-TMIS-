<?php

namespace App\Console\Commands;

use App\Support\TmisSqlDump;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ImportTmisSql extends Command
{
    protected $signature = 'tmis:import-sql {path : MariaDB SQL export} {--apply : Commit instead of previewing} {--approve-legacy-status : Treat Approved & Rejected as approved}';

    protected $description = 'Import updated TMIS records without executing SQL or replacing existing accounts';

    public function handle(TmisSqlDump $parser): int
    {
        $path = $this->argument('path');
        if (! is_file($path) || ! is_readable($path)) {
            $this->error('The SQL export is not readable.');

            return self::FAILURE;
        }
        $level = DB::transactionLevel();
        try {
            $tables = $parser->parse(file_get_contents($path));
            DB::beginTransaction();
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('LOCK TABLE users, user_auth, region, organization, user_roles IN SHARE ROW EXCLUSIVE MODE');
            }
            $regions = $roles = $offices = [];
            foreach ($tables['region'] as $row) {
                $regions[$row['region_id']] = $this->reference('region', 'region_id', $row);
            }
            foreach ($tables['user_roles'] as $row) {
                $roles[$row['role_id']] = $this->reference('user_roles', 'role_id', $row);
            }
            foreach ($tables['organization'] as $row) {
                $region = $regions[$row['region_id']] ?? throw new RuntimeException('Unknown organization region.');
                $offices[$row['org_id']] = $this->reference('organization', 'org_id', $row, $region);
            }
            $created = $skipped = 0;
            foreach ($tables['users'] as $row) {
                if (DB::table('users')->whereRaw('LOWER(email) = ?', [strtolower(trim($row['email']))])->exists()) {
                    $skipped++;
                    $this->warn('Existing email retained unchanged for source user '.$row['user_id'].'.');

                    continue;
                }
                if (DB::table('users')->where('user_id', $row['user_id'])->exists()) {
                    throw new RuntimeException('Source user ID '.$row['user_id'].' conflicts with another account. No records imported.');
                }
                $authRows = array_values(array_filter($tables['user_auth'], fn (array $auth): bool => $auth['user_id'] === $row['user_id']));
                if (count($authRows) !== 1 || ! in_array(password_get_info($authRows[0]['password_hash'])['algoName'], ['bcrypt', 'argon2id', 'argon2i'], true)) {
                    throw new RuntimeException('Each imported user must have exactly one supported password hash.');
                }
                $status = match ($row['status']) {
                    'Pending approval' => 'Pending approval',
                    'Rejected' => 'Rejected',
                    'Approved & Accepted' => 'Approved & Accepted',
                    'Approved & Rejected' => $this->option('approve-legacy-status') ? 'Approved & Accepted' : throw new RuntimeException('Confirm legacy approval using --approve-legacy-status.'),
                    default => throw new RuntimeException('Unknown source approval status.'),
                };
                $region = $regions[$row['region_id']] ?? throw new RuntimeException('Unknown user region.');
                $office = $offices[$row['org_id']] ?? throw new RuntimeException('Unknown user organization.');
                if ((int) DB::table('organization')->where('org_id', $office)->value('region_id') !== $region) {
                    throw new RuntimeException('User organization does not belong to the selected region.');
                }
                DB::table('users')->insert([
                    'user_id' => $row['user_id'], 'email' => strtolower(trim($row['email'])),
                    'first_name' => $row['first_name'], 'last_name' => $row['last_name'],
                    'middle_name' => $row['middle_name'], 'extension_name' => $row['extension_name'],
                    'date_of_birth' => $row['date_of_birth'], 'sex' => $row['sex'],
                    'mobile_number' => $row['mobile_number'], 'position' => $row['position'],
                    'role_id' => $roles[$row['role_id']] ?? throw new RuntimeException('Unknown user role.'),
                    'region_id' => $region, 'org_id' => $office,
                    'email_verified' => (bool) $row['email_verified'], 'status' => $status,
                    'active_status' => $row['active_status'], 'profile_photo_path' => $row['profile_photo_path'],
                    'is_created_at' => $row['is_created_at'], 'is_updated_at' => $row['is_updated_at'],
                ]);
                $auth = $authRows[0];
                DB::table('user_auth')->insert([
                    'id' => $auth['id'],
                    'user_id' => $row['user_id'], 'password_hash' => $auth['password_hash'],
                    'email_two_factor_enabled' => (bool) $auth['email_two_factor_enabled'],
                    'created_at' => $auth['created_at'], 'updated_at' => $auth['updated_at'],
                ]);
                DB::table('users_log')->insert([
                    'user_id' => $row['user_id'], 'event' => 'account_imported', 'category' => 'import',
                    'outcome' => 'success', 'description' => 'Account imported from MariaDB export; live challenges were not imported.',
                    'metadata' => json_encode(['source_user_id' => $row['user_id'], 'source_role_id' => $row['role_id'], 'source_region_id' => $row['region_id'], 'source_org_id' => $row['org_id'], 'legacy_status_corrected' => $row['status'] === 'Approved & Rejected'], JSON_THROW_ON_ERROR),
                    'request_id' => (string) Str::uuid(),
                ]);
                $created++;
            }
            $this->info("Users: {$created} imported, {$skipped} existing accounts preserved.");
            if ($this->option('apply')) {
                if (DB::getDriverName() === 'pgsql') {
                    foreach (['users' => 'user_id', 'user_auth' => 'id', 'region' => 'region_id', 'organization' => 'org_id', 'user_roles' => 'role_id'] as $table => $key) {
                        DB::statement("SELECT setval(pg_get_serial_sequence('{$table}', '{$key}'), GREATEST(COALESCE((SELECT MAX({$key}) FROM {$table}), 0), 1), EXISTS(SELECT 1 FROM {$table}))");
                    }
                }
                DB::commit();
                $this->info('Import committed.');
            } else {
                DB::rollBack();
                $this->info('Preview rolled back. Use --apply to commit.');
            }

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            if (DB::transactionLevel() > $level) {
                DB::rollBack();
            }
            $safe = $exception instanceof RuntimeException && ! $exception instanceof QueryException;
            $this->error($safe || $exception instanceof \InvalidArgumentException ? $exception->getMessage() : 'Import failed; changes rolled back. Check schema compatibility.');

            return self::FAILURE;
        }
    }

    /** @param array<string, int|string|null> $row */
    private function reference(string $table, string $key, array $row, ?int $region = null): int
    {
        $existing = DB::table($table)->where($key, $row[$key])->first();
        if ($existing !== null) {
            if ($existing->name !== $row['name'] || ($region !== null && (int) $existing->region_id !== $region)) {
                throw new RuntimeException('Conflicting source identifier in '.$table.'. Import into the new schema instead of remapping IDs.');
            }

            return (int) $row[$key];
        }
        $values = [$key => $row[$key], 'name' => $row['name'], 'is_active' => $row['is_active'], 'created_at' => $row['created_at'], 'updated_at' => $row['updated_at']];
        if ($table !== 'region') {
            $values['details'] = $row['details'] ?? '';
        }
        if ($region !== null) {
            $values['region_id'] = $region;
        }

        return (int) DB::table($table)->insertGetId($values, $key);
    }
}
