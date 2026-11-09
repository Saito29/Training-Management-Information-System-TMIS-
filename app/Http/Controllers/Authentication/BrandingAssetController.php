<?php

namespace App\Http\Controllers\Authentication;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class BrandingAssetController
{
    public function show(string $kind): Response
    {
        abort_unless(in_array($kind, ['logo', 'favicon', 'dashboard'], true), 404);

        $assetKind = $kind === 'dashboard' ? 'dashboard_image' : $kind;
        $path = DB::table('system_settings')->where('id', 1)->value($assetKind.'_path');
        abort_unless(
            is_string($path)
                && str_starts_with($path, 'system-branding/')
                && ! str_contains($path, '..')
                && Storage::disk('local')->exists($path),
            404,
        );

        return Storage::disk('local')->response($path, headers: [
            'Cache-Control' => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
