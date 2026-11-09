<?php

namespace App\Http\Middleware;

use App\Http\Authentication\LoginChallenge;
use App\Models\User;
use App\Support\SystemMaintenance;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class EnsureSystemAvailable
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Schema::hasTable('system_settings')) {
            return $next($request);
        }
        $settings = DB::table('system_settings')->where('id', 1)->first();
        $maintenance = app(SystemMaintenance::class);
        if ($maintenance->isActive()) {
            if ($request->routeIs('maintenance.login', 'maintenance.login.store', 'login', 'login.store', 'maintenance.page', 'system-branding.asset', 'logout')) {
                return $next($request);
            }

            if ($request->routeIs('verification', 'verification.store', 'verification.resend')) {
                $pending = app(LoginChallenge::class)->pending($request)->first();
                $candidate = $pending ? User::find($pending->user_id) : null;
                if ($candidate && $candidate->isEligibleForLogin() && $maintenance->canManage($candidate)
                    && $pending && now()->lt($pending->expires_at) && $pending->attempts < 3) {
                    return $next($request);
                }

                return $this->unavailable($request, $settings);
            }

            $user = $request->user();
            $hash = $user ? DB::table('user_auth')->where('user_id', $user->user_id)->value('password_hash') : null;
            $verifiedUser = $user && $user->isEligibleForLogin() && $maintenance->canManage($user)
                && (int) $request->session()->get('auth.verified_user_id') === (int) $user->user_id
                && $hash && hash_equals(hash('sha256', $hash), $request->session()->get('auth.password_fingerprint', ''));
            if ($verifiedUser && $maintenance->canManage($user)) {
                return $next($request);
            }

            return $this->unavailable($request, $settings);
        }

        return $next($request);
    }

    private function unavailable(Request $request, ?object $settings): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $settings?->maintenance_message ?: 'TMIS is under maintenance.',
                'maintenance_until' => $settings?->maintenance_until,
            ], 503, ['Retry-After' => '60', 'Cache-Control' => 'no-store']);
        }

        return response()->view('errors.503', [
            'maintenanceMessage' => $settings?->maintenance_message,
            'maintenanceUntil' => $settings?->maintenance_until,
        ], 503, ['Retry-After' => '60', 'Cache-Control' => 'no-store']);
    }
}
