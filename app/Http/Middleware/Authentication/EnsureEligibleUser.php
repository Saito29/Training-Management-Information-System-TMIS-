<?php

namespace App\Http\Middleware\Authentication;

use App\Http\Middleware\EnsureModuleAccess;
use App\Support\DeviceSessions;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureEligibleUser
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $mode = 'required'): Response
    {
        $user = $request->user();
        if (! $user && $mode === 'optional') {
            return $next($request);
        }

        $passwordHash = $user ? DB::table('user_auth')->where('user_id', $user->user_id)->value('password_hash') : null;

        if (! $user || ! $user->isEligibleForLogin()
            || (int) $request->session()->get('auth.verified_user_id') !== (int) $user->user_id
            || ! $passwordHash || ! hash_equals(hash('sha256', $passwordHash), $request->session()->get('auth.password_fingerprint', ''))
            || ! app(DeviceSessions::class)->touch($request)) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($mode === 'optional') {
                return $next($request);
            }

            return redirect()->route('login');
        }

        $response = app(EnsureModuleAccess::class)->handle($request, $next);
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
