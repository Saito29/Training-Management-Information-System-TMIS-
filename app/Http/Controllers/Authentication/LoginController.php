<?php

namespace App\Http\Controllers\Authentication;

use App\Http\Authentication\AuditTrail;
use App\Http\Authentication\LoginChallenge;
use App\Http\Requests\Authentication\LoginRequest;
use App\Models\User;
use App\Support\DeviceSessions;
use App\Support\SystemMaintenance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginController
{
    public function store(LoginRequest $request, LoginChallenge $challenge, SystemMaintenance $maintenance): RedirectResponse
    {
        $challenge->forget($request);
        $user = User::whereRaw('LOWER(email) = ?', [$request->validated('email')])->first();
        $account = $user ? DB::table('user_auth')->where('user_id', $user->user_id)->first() : null;
        $passwordHash = $account?->password_hash;

        if (! $passwordHash || ! Hash::check($request->validated('password'), $passwordHash)) {
            AuditTrail::record($request, 'login_failed', $user, outcome: 'failure', category: 'security');
            $request->session()->flash('toast_type', 'info');
            throw ValidationException::withMessages([
                'email' => 'Unable to sign in. Please check your details and try again.',
            ]);
        }

        if ($request->routeIs('maintenance.login.store') && ! $maintenance->canManage($user)) {
            AuditTrail::record($request, 'maintenance_login_denied', $user, outcome: 'failure', category: 'security');
            throw ValidationException::withMessages(['email' => 'Unable to sign in. Please check your details and try again.']);
        }

        if (! $user->isEligibleForLogin()) {
            AuditTrail::record($request, 'login_denied', $user, outcome: 'failure', category: 'security');
            $request->session()->flash('toast_type', 'warning');
            throw ValidationException::withMessages([
                'email' => 'Access is not enabled. Your account must be approved & accepted, active, and assigned an active role. Contact your administrator.',
            ]);
        }

        if ($maintenance->isActive() && ! $maintenance->canManage($user)) {
            AuditTrail::record($request, 'maintenance_login_denied', $user, outcome: 'failure', category: 'security');

            return redirect()->route('maintenance.page')->with('maintenance_notice', 'The system is under maintenance. Please try again after service resumes.');
        }

        if ($account->totp_secret) {
            $challenge->startAuthenticator($request, $user, $passwordHash);

            return redirect()->route('verification')->with('status', 'Enter a code from your authenticator app or an unused recovery code.');
        }

        if (in_array($account->email_two_factor_enabled, [false, 0, '0'], true)) {
            DB::table('user_auth')->where('id', $account->id)->update(['last_login_at' => now()]);
            $request->session()->put('auth.password_fingerprint', hash('sha256', $passwordHash));
            $request->session()->put('auth.verified_user_id', $user->user_id);
            $request->session()->put('auth.session_generation', (int) $account->session_generation);
            $request->session()->put('auth.device_token', Str::random(64));
            Auth::login($user);
            $request->session()->regenerate();

            return redirect()->route('admin.dashboard.dashboard');
        }

        $challenge->start($request, $user, $passwordHash);

        return redirect()->route('verification')->with('status', 'A verification code has been sent. It expires in 5 minutes.');
    }

    public function destroy(Request $request, LoginChallenge $challenge): RedirectResponse
    {
        $challenge->forget($request);
        if ($request->user()) {
            DB::table('user_device_sessions')->where('user_id', $request->user()->user_id)->where('session_hash', app(DeviceSessions::class)->hash($request))->update(['revoked_at' => now()]);
        }
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
