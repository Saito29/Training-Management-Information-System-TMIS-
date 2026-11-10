<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class DevelopmentAdministratorSeeder extends Seeder
{
    public string $firstName = 'Development';

    public string $lastName = 'Administrator';

    public string $email = 'dev-admin@example.test';

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Development administrator accounts can only be created in local or testing environments.');
        }

        $password = Str::password(24);

        $publicUserId = DB::transaction(function () use ($password): ?int {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('LOCK TABLE users, user_auth IN EXCLUSIVE MODE');
            }

            if (DB::table('users')->whereRaw('lower(email) = ?', [Str::lower($this->email)])->exists()) {
                return null;
            }

            $roleId = DB::table('user_roles')
                ->where('name', 'System Administrator')
                ->where('is_active', 1)
                ->value('role_id');

            $assignment = DB::table('organization')
                ->join('region', 'organization.region_id', '=', 'region.region_id')
                ->where('organization.name', 'DA - SAAD')
                ->where('organization.is_active', 1)
                ->where('region.is_active', 1)
                ->select(['organization.org_id', 'region.region_id'])
                ->first();

            if ($roleId === null || $assignment === null) {
                throw new RuntimeException('An active System Administrator role and DA-SAAD organization/region must exist first.');
            }

            $userId = DB::table('users')->insertGetId([
                'first_name' => $this->firstName,
                'last_name' => $this->lastName,
                'email' => Str::lower($this->email),
                'role_id' => $roleId,
                'region_id' => $assignment->region_id,
                'org_id' => $assignment->org_id,
                'position' => 'Development System Administrator',
                'status' => 'Approved & Accepted',
                'email_verified' => true,
                'active_status' => 1,
            ], 'user_id');

            DB::table('user_auth')->insert([
                'user_id' => $userId,
                'password_hash' => Hash::make($password),
                'email_two_factor_enabled' => true,
            ]);

            DB::table('users_log')->insert([
                'user_id' => $userId,
                'actor_user_id' => $userId,
                'event' => 'development_account_created',
                'outcome' => 'success',
                'metadata' => json_encode(['source' => self::class], JSON_THROW_ON_ERROR),
            ]);

            return $userId;
        });

        if ($publicUserId === null) {
            $this->command?->warn('This email already exists. No account details, permissions, or password were changed.');

            return;
        }

        $this->command?->info('Development System Administrator account created.');
        $this->command?->line('User ID: '.$publicUserId);
        $this->command?->line('Email: '.$this->email);
        $this->command?->line('Temporary password: '.$password);
        $this->command?->warn('Change the temporary password before using this development account.');
    }
}
