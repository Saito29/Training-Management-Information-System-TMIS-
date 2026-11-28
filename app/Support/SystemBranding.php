<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class SystemBranding
{
    /** @return array{name: string, logoUrl: string, faviconUrl: string, faviconMimeType: string, dashboardImageUrl: string} */
    public function forDisplay(): array
    {
        $settings = $this->settings();
        $logoPath = $this->existingAssetPath($settings?->logo_path);
        $faviconPath = $this->existingAssetPath($settings?->favicon_path);
        $dashboardImagePath = $this->existingAssetPath($settings?->dashboard_image_path);
        $disk = config('filesystems.uploads_disk');
        $faviconMimeType = $faviconPath && Storage::disk($disk)->exists($faviconPath)
            ? Storage::disk($disk)->mimeType($faviconPath)
            : null;

        return [
            'name' => $this->displayName($settings),
            'logoUrl' => $logoPath
                ? route('system-branding.asset', ['kind' => 'logo', 'v' => substr(hash('sha256', $logoPath), 0, 12)])
                : asset('assets/logo/DA Logo/DA logo_120519.png'),
            'faviconUrl' => $faviconPath
                ? route('system-branding.asset', ['kind' => 'favicon', 'v' => substr(hash('sha256', $faviconPath), 0, 12)])
                : asset('assets/logo/DA Logo/DA logo_120519.png'),
            'faviconMimeType' => is_string($faviconMimeType) && str_starts_with($faviconMimeType, 'image/')
                ? $faviconMimeType
                : 'image/png',
            'dashboardImageUrl' => $dashboardImagePath
                ? route('system-branding.asset', ['kind' => 'dashboard', 'v' => substr(hash('sha256', $dashboardImagePath), 0, 12)])
                : asset('assets/img/ricefield_with_farmer-Picsart-AiImageEnhancer.png'),
        ];
    }

    /** @return array{name: string, logoData: string, logoName: string, logoMimeType: string, logoWidth: int, logoHeight: int} */
    public function forEmail(): array
    {
        $settings = $this->settings();
        $relativePath = $this->existingAssetPath($settings?->logo_path);
        $disk = config('filesystems.uploads_disk');
        $logoData = $relativePath
            ? Storage::disk($disk)->get($relativePath)
            : file_get_contents(public_path('assets/logo/DA Logo/DA logo_120519.png'));
        $logoName = $relativePath ? basename($relativePath) : 'tmis-logo.png';
        $logoMimeType = $relativePath ? (Storage::disk($disk)->mimeType($relativePath) ?: 'image/png') : 'image/png';
        if (! is_string($logoData) || $logoData === '') {
            $logoData = (string) file_get_contents(public_path('assets/logo/DA Logo/DA logo_120519.png'));
            $logoName = 'tmis-logo.png';
            $logoMimeType = 'image/png';
        }
        $dimensions = getimagesizefromstring($logoData);
        $sourceWidth = is_array($dimensions) ? max(1, (int) $dimensions[0]) : 48;
        $sourceHeight = is_array($dimensions) ? max(1, (int) $dimensions[1]) : 48;
        $scale = min(160 / $sourceWidth, 56 / $sourceHeight);

        return [
            'name' => $this->displayName($settings),
            'logoData' => $logoData,
            'logoName' => $logoName,
            'logoMimeType' => $logoMimeType,
            'logoWidth' => max(1, (int) round($sourceWidth * $scale)),
            'logoHeight' => max(1, (int) round($sourceHeight * $scale)),
        ];
    }

    private function existingAssetPath(mixed $path): ?string
    {
        if (! is_string($path)
            || ! str_starts_with($path, 'system-branding/')
            || str_contains($path, '..')
            || ! Storage::disk(config('filesystems.uploads_disk'))->exists($path)) {
            return null;
        }

        return $path;
    }

    private function settings(): ?object
    {
        return Schema::hasTable('system_settings')
            ? DB::table('system_settings')->where('id', 1)->first()
            : null;
    }

    private function displayName(?object $settings): string
    {
        return is_string($settings?->system_name) && trim($settings->system_name) !== ''
            ? trim($settings->system_name)
            : 'TMIS';
    }
}
