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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginController
{
    public function store(LoginRequest $request, LoginChallenge $challenge, SystemMaintenance $maintenance): RedirectResponse
    {
        $challenge->forget($request);
        $attemptKey = $this->failedAttemptKey($request);

        if (RateLimiter::tooManyAttempts($attemptKey, 5)) {
            $request->session()->flash('toast_type', 'warning');
            throw ValidationException::withMessages([
                'authentication' => 'Too many failed sign-in attempts. Please wait 10 minutes before trying again.',
            ]);
        }

        $user = User::whereRaw('LOWER(email) = ?', [$request->validated('email')])->first();
        $account = $user ? DB::table('user_auth')->where('user_id', $user->user_id)->first() : null;
        $passwordHash = $account?->password_hash;

        if (! $passwordHash || ! Hash::check($request->validated('password'), $passwordHash)) {
            RateLimiter::hit($attemptKey, 600);
            AuditTrail::record($request, 'login_failed', $user, outcome: 'failure', category: 'security');
            $request->session()->flash('toast_type', RateLimiter::tooManyAttempts($attemptKey, 5) ? 'warning' : 'info');
            $rateLimited = RateLimiter::tooManyAttempts($attemptKey, 5);
            if ($rateLimited) {
                $this->notifySecurityAdministrators($request);
            }
            $message = $rateLimited
                ? 'Five sign-in attempts failed. Please wait 10 minutes before trying again.'
                : 'Unable to sign in. Please check your details and try again.';
            throw ValidationException::withMessages([
                'email' => $message,
            ]);
        }

        RateLimiter::clear($attemptKey);

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

    private function failedAttemptKey(LoginRequest $request): string
    {
        $identity = strtolower(trim($request->validated('email')));

        return 'login-failed:'.hash('sha256', $identity.'|'.$request->ip());
    }

    private function notifySecurityAdministrators(LoginRequest $request): void
    {
        $notificationWindow = 'security:login-rate-limit-notice';
        if (! Cache::add($notificationWindow, true, now()->addMinutes(10))) {
            return;
        }

        try {
            $administratorIds = DB::table('users')
                ->join('user_roles', 'user_roles.role_id', '=', 'users.role_id')
                ->whereNull('users.deleted_at')
                ->where('users.active_status', 1)
                ->where('users.status', 'Approved & Accepted')
                ->where('user_roles.name', 'System Administrator')
                ->where('user_roles.is_active', 1)
                ->distinct()
                ->pluck('users.user_id');
            $batchId = (string) Str::uuid();
            $now = now();

            foreach ($administratorIds as $administratorId) {
                DB::table('user_notifications')->insert([
                    'ui_id' => (string) Str::uuid(),
                    'batch_id' => $batchId,
                    'recipient_id' => $administratorId,
                    'creator_id' => $administratorId,
                    'title' => 'Possible unauthorized access attempt blocked',
                    'summary' => 'Repeated failed sign-ins triggered TMIS protection. Review the security audit log and caution users if needed.',
                    'message' => 'TMIS detected repeated failed sign-in attempts that may indicate an attempt to bypass system access controls. The account and source address were temporarily rate limited. This alert does not confirm a successful breach. Review the security audit log, assess the event, and caution users if further action is needed. No credentials or device location are included in this alert.',
                    'type' => 'system',
                    'priority' => 'critical',
                    'reference' => 'TMIS-SECURITY-'.Str::upper(Str::random(10)),
                    'related_page' => 'administration/audit-logs',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            Log::warning('Repeated failed sign-in attempts reached the configured account limit.', [
                'ip_hash' => hash('sha256', (string) $request->ip()),
                'account_hash' => hash('sha256', strtolower(trim($request->validated('email')))),
                'reference' => 'TMIS-SECURITY-'.Str::upper(Str::random(10)),
            ]);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
