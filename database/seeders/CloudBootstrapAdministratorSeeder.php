<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class CloudBootstrapAdministratorSeeder extends Seeder
{
    private const OWNER_EMAIL = 'markkinnedyanda@gmail.com';

    public function run(): void
    {
        if (! app()->environment('production')) {
            throw new RuntimeException('The cloud bootstrap account can only be provisioned in production.');
        }

        $bootstrapKey = config('services.tmis_bootstrap_data_key');
        if (! is_string($bootstrapKey) || ! str_starts_with($bootstrapKey, 'bootstrap/') || str_contains($bootstrapKey, '..')) {
            throw new RuntimeException('TMIS_BOOTSTRAP_DATA_KEY must point to the one-time private bootstrap object.');
        }

        $disk = Storage::disk(config('filesystems.uploads_disk'));
        $owner = DB::table('users')->whereRaw('LOWER(email) = ?', [self::OWNER_EMAIL])->first();
        if ($owner !== null) {
            if (! DB::table('user_auth')->where('user_id', $owner->user_id)->exists()) {
                throw new RuntimeException('The existing owner account is missing its authentication record.');
            }

            DB::table('system_super_admins')->insertOrIgnore([
                'user_id' => $owner->user_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $disk->delete($bootstrapKey);

            return;
        }

        if (DB::table('users')->exists()) {
            throw new RuntimeException('Refusing to bootstrap the owner account because another user already exists.');
        }

        if (! $disk->exists($bootstrapKey)) {
            throw new RuntimeException('The one-time production bootstrap object is missing from private R2 storage.');
        }

        $bootstrapState = json_decode($disk->get($bootstrapKey), true, 512, JSON_THROW_ON_ERROR);
        $account = $bootstrapState['owner'] ?? null;
        $authentication = $bootstrapState['authentication'] ?? null;
        if (! is_array($account) || mb_strtolower(trim((string) ($account['email'] ?? ''))) !== self::OWNER_EMAIL) {
            throw new RuntimeException('The bootstrap payload must match the approved TMIS owner account.');
        }

        if (! is_array($authentication)) {
            throw new RuntimeException('The bootstrap payload is missing the owner authentication record.');
        }

        $passwordHash = $authentication['password_hash'] ?? null;
        if (! is_string($passwordHash) || (password_get_info($passwordHash)['algoName'] ?? 'unknown') === 'unknown') {
            throw new RuntimeException('The bootstrap payload must include the owner account password hash.');
        }

        $firstName = trim((string) ($account['first_name'] ?? ''));
        $lastName = trim((string) ($account['last_name'] ?? ''));
        $sourceUserId = (int) ($account['user_id'] ?? 0);
        if ($firstName === '' || $lastName === '' || $sourceUserId < 1) {
            throw new RuntimeException('The bootstrap payload must include the owner account ID, first name, and last name.');
        }

        $regionName = trim((string) ($account['region_name'] ?? 'Region IV-A'));
        $organizationName = trim((string) ($account['organization_name'] ?? 'DA - SAAD'));

        DB::transaction(function () use ($account, $authentication, $bootstrapState, $disk, $firstName, $lastName, $organizationName, $passwordHash, $regionName, $sourceUserId): void {
            if (DB::table('users')->exists()) {
                throw new RuntimeException('A user was registered while the owner bootstrap was in progress.');
            }

            $this->restoreReferenceData($bootstrapState);
            $roleId = DB::table('user_roles')
                ->where('name', 'System Administrator')
                ->where('is_active', 1)
                ->value('role_id');
            $location = DB::table('organization')
                ->join('region', 'region.region_id', '=', 'organization.region_id')
                ->where('organization.name', $organizationName)
                ->where('region.name', $regionName)
                ->where('organization.is_active', 1)
                ->where('region.is_active', 1)
                ->select(['organization.org_id', 'region.region_id'])
                ->first();

            if ($roleId === null || $location === null) {
                throw new RuntimeException('The required active system administrator role and office region are missing.');
            }

            $profilePhotoPath = $account['profile_photo_path'] ?? null;
            $profilePhotoPath = is_string($profilePhotoPath)
                && str_starts_with($profilePhotoPath, 'profile-photos/')
                && ! str_contains($profilePhotoPath, '..')
                && $disk->exists($profilePhotoPath)
                    ? $profilePhotoPath
                    : null;

            $roleCredentialId = $account['role_credential_id'] ?? null;
            if (! is_numeric($roleCredentialId)
                || ! DB::table('role_credentials')->where('role_credential_id', (int) $roleCredentialId)->where('role_id', $roleId)->exists()) {
                $roleCredentialId = null;
            }

            DB::table('users')->insert([
                'user_id' => $sourceUserId,
                'email' => self::OWNER_EMAIL,
                'first_name' => mb_substr($firstName, 0, 255),
                'middle_name' => mb_substr(trim((string) ($account['middle_name'] ?? '')), 0, 255) ?: null,
                'last_name' => mb_substr($lastName, 0, 255),
                'extension_name' => mb_substr(trim((string) ($account['extension_name'] ?? '')), 0, 50) ?: null,
                'date_of_birth' => $account['date_of_birth'] ?? null,
                'sex' => $account['sex'] ?? null,
                'mobile_number' => $account['mobile_number'] ?? null,
                'role_id' => $roleId,
                'role_credential_id' => $roleCredentialId,
                'region_id' => $location->region_id,
                'org_id' => $location->org_id,
                'position' => $account['position'] ?? 'System Administrator',
                'email_verified' => true,
                'status' => 'Approved & Accepted',
                'active_status' => 1,
                'profile_photo_path' => $profilePhotoPath,
                'is_created_at' => now(),
                'is_updated_at' => now(),
            ]);
            $userId = $sourceUserId;

            DB::table('user_auth')->insert([
                'user_id' => $userId,
                'password_hash' => $passwordHash,
                'email_two_factor_enabled' => (bool) ($authentication['email_two_factor_enabled'] ?? true),
                'totp_secret' => $authentication['totp_secret'] ?? null,
                'totp_last_counter' => $authentication['totp_last_counter'] ?? null,
                'totp_recovery_codes' => $authentication['totp_recovery_codes'] ?? null,
                'session_generation' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('system_super_admins')->insert([
                'user_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->restoreUserConfiguration($bootstrapState, $userId);
            $this->restoreSettings($bootstrapState, $disk);
            $this->restoreSequences();
        });

        $disk->delete($bootstrapKey);
    }

    /**
     * @param  array<string, mixed>  $bootstrapState
     */
    private function restoreReferenceData(array $bootstrapState): void
    {
        foreach ([
            ['user_roles', 'role_id'],
            ['region', 'region_id'],
            ['organization', 'org_id'],
            ['record_statuses', 'id'],
            ['participant_options', 'id'],
            ['attachment_type_options', 'id'],
            ['role_credentials', 'role_credential_id'],
            ['role_permissions', ['role_id', 'permission']],
            ['role_credential_permissions', ['role_credential_id', 'permission']],
            ['role_credential_denied_permissions', ['role_credential_id', 'permission']],
        ] as [$table, $keys]) {
            $this->restoreRows($table, $bootstrapState[$table] ?? [], (array) $keys);
        }

        $this->restoreGeographicLocations($bootstrapState['geographic_locations'] ?? []);
    }

    /**
     * @param  array<string, mixed>  $bootstrapState
     */
    private function restoreUserConfiguration(array $bootstrapState, int $userId): void
    {
        $this->restoreRows('training_notification_rules', $bootstrapState['training_notification_rules'] ?? [], ['id']);
        $this->restoreRows('training_notification_rule_roles', $bootstrapState['training_notification_rule_roles'] ?? [], ['rule_id', 'role_id']);
        $this->restoreRows('training_email_notification_rules', $bootstrapState['training_email_notification_rules'] ?? [], ['id']);
        $this->restoreRows('training_email_notification_rule_roles', $bootstrapState['training_email_notification_rule_roles'] ?? [], ['rule_id', 'role_id']);

        $this->restoreRows('user_data_scopes', $bootstrapState['user_data_scopes'] ?? [], ['user_id'], overrideUserId: $userId);
        $this->restoreRows('maintenance_access', $bootstrapState['maintenance_access'] ?? [], ['user_id'], overrideUserId: $userId);
    }

    /**
     * @param  array<string, mixed>  $bootstrapState
     */
    private function restoreSettings(array $bootstrapState, object $disk): void
    {
        $settings = $bootstrapState['system_settings'] ?? null;
        if (! is_array($settings)) {
            return;
        }

        $settingsToRestore = [];
        foreach (['system_name', 'maintenance_enabled', 'maintenance_message', 'maintenance_until', 'maintenance_starts_at'] as $field) {
            if (array_key_exists($field, $settings)) {
                $settingsToRestore[$field] = $settings[$field];
            }
        }
        foreach (['logo_path', 'favicon_path', 'dashboard_image_path'] as $field) {
            $path = $settings[$field] ?? null;
            if (is_string($path) && str_starts_with($path, 'system-branding/') && ! str_contains($path, '..') && $disk->exists($path)) {
                $settingsToRestore[$field] = $path;
            }
        }
        if ($settingsToRestore !== []) {
            DB::table('system_settings')->where('id', 1)->update($settingsToRestore + ['updated_at' => now()]);
        }
    }

    /**
     * @param  list<string>  $keyColumns
     */
    private function restoreRows(string $table, mixed $rows, array $keyColumns, ?int $overrideUserId = null): void
    {
        if (! is_array($rows)) {
            return;
        }

        foreach ($rows as $row) {
            if (! is_array($row)) {
                throw new RuntimeException('The bootstrap payload contains invalid configuration data.');
            }
            if ($overrideUserId !== null && array_key_exists('user_id', $row)) {
                $row['user_id'] = $overrideUserId;
                if (array_key_exists('assigned_by', $row)) {
                    $row['assigned_by'] = $overrideUserId;
                }
            }

            $keys = array_intersect_key($row, array_flip($keyColumns));
            if (count($keys) !== count($keyColumns)) {
                throw new RuntimeException('A bootstrap configuration row is missing its identity fields.');
            }

            DB::table($table)->updateOrInsert($keys, array_diff_key($row, $keys));
        }
    }

    private function restoreGeographicLocations(mixed $rows): void
    {
        if (! is_array($rows)) {
            return;
        }

        $pendingRows = array_values($rows);
        while ($pendingRows !== []) {
            $remainingRows = [];
            $restoredAny = false;
            foreach ($pendingRows as $row) {
                if (! is_array($row)) {
                    throw new RuntimeException('The bootstrap payload contains an invalid geographic location.');
                }
                $parentId = $row['parent_id'] ?? null;
                if ($parentId !== null && ! DB::table('geographic_locations')->where('id', $parentId)->exists()) {
                    $remainingRows[] = $row;

                    continue;
                }

                $this->restoreRows('geographic_locations', [$row], ['id']);
                $restoredAny = true;
            }
            if (! $restoredAny) {
                throw new RuntimeException('The bootstrap geographic locations contain a missing or cyclic parent.');
            }
            $pendingRows = $remainingRows;
        }
    }

    private function restoreSequences(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ([
            ['user_roles', 'role_id'],
            ['region', 'region_id'],
            ['organization', 'org_id'],
            ['geographic_locations', 'id'],
            ['record_statuses', 'id'],
            ['participant_options', 'id'],
            ['attachment_type_options', 'id'],
            ['role_credentials', 'role_credential_id'],
            ['training_notification_rules', 'id'],
            ['training_email_notification_rules', 'id'],
            ['users', 'user_id'],
            ['user_auth', 'id'],
        ] as [$table, $column]) {
            $sequence = DB::selectOne('SELECT pg_get_serial_sequence(?, ?) AS sequence', [$table, $column])?->sequence;
            if (! is_string($sequence)) {
                continue;
            }

            $maximum = DB::table($table)->max($column);
            DB::statement('SELECT setval(CAST(? AS regclass), ?, ?)', [$sequence, $maximum ?? 1, $maximum !== null]);
        }
    }
}
