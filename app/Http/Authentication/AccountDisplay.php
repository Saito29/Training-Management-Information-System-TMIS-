<?php

namespace App\Http\Authentication;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AccountDisplay
{
    /**
     * Build the account summary while keeping optional credentials separate from the base role.
     *
     * @return array<string, mixed>
     */
    public function forUser(?User $user): array
    {
        $details = $user ? DB::table('users')
            ->leftJoin('user_roles', 'users.role_id', '=', 'user_roles.role_id')
            ->leftJoin('role_credentials', function ($join): void {
                $join->on('users.role_credential_id', '=', 'role_credentials.role_credential_id')
                    ->on('users.role_id', '=', 'role_credentials.role_id');
            })
            ->leftJoin('region', 'users.region_id', '=', 'region.region_id')
            ->leftJoin('organization', 'users.org_id', '=', 'organization.org_id')
            ->where('users.user_id', $user->user_id)
            ->select('users.*', 'user_roles.name as role_name', 'role_credentials.name as credential_name', 'region.name as region_name', 'organization.name as office_name')
            ->first() : null;

        $profile = [];
        foreach (['id' => 'user_id', 'firstName' => 'first_name', 'middleName' => 'middle_name', 'lastName' => 'last_name', 'suffix' => 'extension_name', 'dateOfBirth' => 'date_of_birth', 'email' => 'email', 'phone' => 'mobile_number', 'role' => 'role_name', 'region' => 'region_name', 'office' => 'office_name', 'position' => 'position', 'status' => 'status', 'activeStatus' => 'active_status', 'createdAt' => 'is_created_at', 'updatedAt' => 'is_updated_at'] as $key => $column) {
            $profile[$key] = $details?->{$column};
        }
        $profile['credential'] = $details?->credential_name;
        $profile['name'] = trim(implode(' ', array_filter([$profile['firstName'], $profile['middleName'], $profile['lastName'], $profile['suffix']]))) ?: 'Account';
        $profile['navigationName'] = $this->formatName(
            $profile['firstName'],
            $profile['middleName'],
            $profile['lastName'],
            $profile['suffix'],
        );
        $profile['initials'] = mb_strtoupper(mb_substr((string) $profile['firstName'], 0, 1).mb_substr((string) $profile['lastName'], 0, 1)) ?: 'U';
        $path = is_string($details?->profile_photo_path) ? ltrim(str_replace('\\', '/', $details->profile_photo_path), '/') : '';
        $profile['photoUrl'] = null;
        if (preg_match('~^(?:assets/|storage/|profile_photos/|profile-photos/)[a-zA-Z0-9_ /.-]+\.(?:jpe?g|png|webp|gif|avif)$~i', $path) && ! str_contains($path, '..')) {
            $publicPath = str_starts_with($path, 'profile') ? 'storage/'.$path : $path;
            if (is_file(public_path($publicPath))) {
                $profile['photoUrl'] = asset($publicPath);
            }
        }

        if ($user && str_starts_with($path, 'profile-photos/'.$user->user_id.'/') && ! str_contains($path, '..') && Storage::disk('local')->exists($path)) {
            $profile['photoUrl'] = route('profile.photo', ['v' => substr(hash('sha256', $path), 0, 12)]);
        }

        return $profile;
    }

    public function formatName(?string $firstName, ?string $middleName, ?string $lastName, ?string $suffix): string
    {
        $middleName = trim((string) $middleName);
        $middleInitial = $middleName !== '' ? mb_strtoupper(mb_substr($middleName, 0, 1)).'.' : null;

        return implode(' ', array_filter(array_map(
            fn (?string $part): string => trim((string) $part),
            [$firstName, $middleInitial, $lastName, $suffix],
        ))) ?: 'Account';
    }
}
