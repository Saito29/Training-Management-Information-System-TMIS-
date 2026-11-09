<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemMaintenance
{
    /** Resolve the scheduled availability window and turn maintenance off after its return time. */
    public function isActive(): bool
    {
        if (! Schema::hasTable('system_settings')) {
            return false;
        }

        $settings = DB::table('system_settings')->where('id', 1)->first();
        if (! $settings || ! (bool) $settings->maintenance_enabled) {
            return false;
        }

        $now = now('UTC');
        $maintenanceStartsAt = $settings->maintenance_starts_at
            ? Carbon::parse($settings->maintenance_starts_at, 'UTC')
            : null;
        $maintenanceUntil = $settings->maintenance_until
            ? Carbon::parse($settings->maintenance_until, 'UTC')
            : null;

        if ($maintenanceUntil && $now->greaterThanOrEqualTo($maintenanceUntil)) {
            DB::table('system_settings')
                ->where('id', 1)
                ->where('maintenance_enabled', true)
                ->where('maintenance_until', $settings->maintenance_until)
                ->update([
                    'maintenance_enabled' => false,
                    'maintenance_starts_at' => null,
                    'maintenance_until' => null,
                    'updated_at' => $now,
                ]);

            return false;
        }

        return $maintenanceStartsAt === null || $now->greaterThanOrEqualTo($maintenanceStartsAt);
    }

    public function canManage(?User $user): bool
    {
        return ModuleAccess::isAdministrator($user);
    }
}
