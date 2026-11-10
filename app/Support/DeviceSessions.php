<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Session metadata is independent of the configured Laravel file/database session driver. */
class DeviceSessions
{
    public function hash(Request $request): string
    {
        if (! $request->session()->has('auth.device_token')) {
            $request->session()->put('auth.device_token', Str::random(64));
        }

        return hash('sha256', $request->user()->user_id.'|'.$request->session()->get('auth.device_token'));
    }

    public function touch(Request $request): bool
    {
        $generation = (int) DB::table('user_auth')->where('user_id', $request->user()->user_id)->value('session_generation');
        if ((int) $request->session()->get('auth.session_generation', 0) !== $generation) {
            return false;
        }
        $hash = $this->hash($request);
        $record = DB::table('user_device_sessions')->where('session_hash', $hash)->first();
        if ($record && ($record->revoked_at || (int) $record->user_id !== (int) $request->user()->user_id)) {
            return false;
        }
        if (! $record) {
            DB::table('user_device_sessions')->insertOrIgnore(['id' => (string) Str::uuid(), 'user_id' => $request->user()->user_id, 'session_hash' => $hash, 'ip_address' => $request->ip(), 'user_agent' => substr((string) $request->userAgent(), 0, 1000), 'last_activity_at' => now(), 'created_at' => now()]);
        } else {
            DB::table('user_device_sessions')->where('id', $record->id)->update(['last_activity_at' => now()]);
        }

        return true;
    }

    public function revokeOthers(Request $request): void
    {
        $userId = $request->user()->user_id;
        $account = DB::table('user_auth')->where('user_id', $userId)->lockForUpdate()->first();
        $generation = $account->session_generation + 1;
        DB::table('user_auth')->where('user_id', $userId)->update(['session_generation' => $generation]);
        $request->session()->put('auth.session_generation', $generation);
        DB::table('user_device_sessions')->where('user_id', $userId)->where('session_hash', '!=', $this->hash($request))->whereNull('revoked_at')->update(['revoked_at' => now()]);
    }
}
