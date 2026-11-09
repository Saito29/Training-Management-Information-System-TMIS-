<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemBranding
{
    /** @return array{name: string, logoUrl: string, faviconUrl: string, dashboardImageUrl: string} */
    public function forDisplay(): array
    {
        $settings = Schema::hasTable('system_settings')
            ? DB::table('system_settings')->where('id', 1)->first()
            : null;
        $logoPath = is_string($settings?->logo_path) ? $settings->logo_path : null;
        $faviconPath = is_string($settings?->favicon_path) ? $settings->favicon_path : null;
        $dashboardImagePath = is_string($settings?->dashboard_image_path) ? $settings->dashboard_image_path : null;

        return [
            'name' => is_string($settings?->system_name) && trim($settings->system_name) !== ''
                ? trim($settings->system_name)
                : 'TMIS',
            'logoUrl' => $logoPath
                ? route('system-branding.asset', ['kind' => 'logo', 'v' => substr(hash('sha256', $logoPath), 0, 12)])
                : asset('assets/logo/DA Logo/DA logo_120519.png'),
            'faviconUrl' => $faviconPath
                ? route('system-branding.asset', ['kind' => 'favicon', 'v' => substr(hash('sha256', $faviconPath), 0, 12)])
                : asset('assets/logo/DA Logo/DA logo_120519.png'),
            'dashboardImageUrl' => $dashboardImagePath
                ? route('system-branding.asset', ['kind' => 'dashboard', 'v' => substr(hash('sha256', $dashboardImagePath), 0, 12)])
                : asset('assets/img/ricefield_with_farmer-Picsart-AiImageEnhancer.png'),
        ];
    }
}
