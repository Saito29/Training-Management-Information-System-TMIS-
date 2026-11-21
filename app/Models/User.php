<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $primaryKey = 'user_id';

    public const CREATED_AT = 'is_created_at';

    public const UPDATED_AT = 'is_updated_at';

    public function hasActiveRole(): bool
    {
        return $this->role_id !== null
            && DB::table('user_roles')->where('role_id', $this->role_id)->where('is_active', 1)->exists();
    }

    public function hasValidRoleCredential(): bool
    {
        $role = DB::table('user_roles')->where('role_id', $this->role_id)->where('is_active', 1)->first(['name']);
        if (! $role) {
            return false;
        }

        if ($role->name === 'System Administrator') {
            return true;
        }

        return $this->role_credential_id !== null
            && DB::table('role_credentials')
                ->where('role_credential_id', $this->role_credential_id)
                ->where('role_id', $this->role_id)
                ->where('is_active', 1)
                ->exists();
    }

    public function isEligibleForLogin(): bool
    {
        return $this->deleted_at === null && (int) $this->active_status === 1
            && $this->status === 'Approved & Accepted'
            && $this->hasActiveRole()
            && $this->hasValidRoleCredential();
    }
}
