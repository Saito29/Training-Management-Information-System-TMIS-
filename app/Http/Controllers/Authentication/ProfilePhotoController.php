<?php

namespace App\Http\Controllers\Authentication;

use App\Http\Authentication\AccountDisplay;
use App\Http\Authentication\AuditTrail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class ProfilePhotoController
{
    public function store(Request $request, AccountDisplay $display): JsonResponse
    {
        $request->validate(['photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:max_width=8000,max_height=8000']]);
        $userId = $request->user()->user_id;
        $path = $request->file('photo')->store('profile-photos/'.$userId, 'local');
        try {
            $old = DB::transaction(function () use ($request, $userId, $path): ?string {
                $old = DB::table('users')->where('user_id', $userId)->lockForUpdate()->value('profile_photo_path');
                DB::table('users')->where('user_id', $userId)->update(['profile_photo_path' => $path, 'is_updated_at' => now()]);
                AuditTrail::record($request, 'profile_photo_updated', $request->user());

                return $old;
            });
        } catch (\Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }
        $this->deleteOwned($old, $userId);

        return response()->json(['message' => 'Profile photo saved.', 'user' => $display->forUser($request->user())]);
    }

    public function show(Request $request): Response
    {
        $path = DB::table('users')->where('user_id', $request->user()->user_id)->value('profile_photo_path');
        abort_unless(is_string($path) && str_starts_with($path, 'profile-photos/'.$request->user()->user_id.'/') && ! str_contains($path, '..') && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, headers: ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function destroy(Request $request, AccountDisplay $display): JsonResponse
    {
        $old = DB::transaction(function () use ($request): ?string {
            $old = DB::table('users')->where('user_id', $request->user()->user_id)->lockForUpdate()->value('profile_photo_path');
            DB::table('users')->where('user_id', $request->user()->user_id)->update(['profile_photo_path' => null, 'is_updated_at' => now()]);
            AuditTrail::record($request, 'profile_photo_removed', $request->user());

            return $old;
        });
        $this->deleteOwned($old, $request->user()->user_id);

        return response()->json(['message' => 'Profile photo removed.', 'user' => $display->forUser($request->user())]);
    }

    private function deleteOwned(?string $path, int $userId): void
    {
        if ($path && str_starts_with($path, 'profile-photos/'.$userId.'/') && ! str_contains($path, '..')) {
            Storage::disk('local')->delete($path);
        }
    }
}
