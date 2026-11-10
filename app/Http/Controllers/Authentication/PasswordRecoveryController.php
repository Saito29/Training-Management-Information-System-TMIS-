<?php

namespace App\Http\Controllers\Authentication;

use App\Http\Authentication\AuditTrail;
use App\Http\Requests\Authentication\RequestPasswordReset;
use App\Http\Requests\Authentication\ResetPasswordRequest;
use App\Mail\Authentication\PasswordResetLink;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class PasswordRecoveryController
{
    public function send(RequestPasswordReset $request): RedirectResponse
    {
        $email = strtolower(trim($request->validated('email')));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        try {
            if ($user) {
                DB::transaction(function () use ($user): void {
                    $account = DB::table('user_auth')->where('user_id', $user->user_id)->lockForUpdate()->first();
                    if (! $account) {
                        return;
                    }

                    Password::sendResetLink(['email' => $user->email], function (User $user, string $token): void {
                        $url = rtrim(config('app.url'), '/').route('password.reset', ['token' => $token, 'email' => $user->email], false);
                        Mail::to($user->email)->send(new PasswordResetLink($url));
                    });
                });
            }
        } catch (TransportExceptionInterface $exception) {
            report($exception);
        }

        return redirect()->route('password.request')
            ->with('status', 'If your details match an account, a password reset link will be sent. Please check your inbox and spam folder.')
            ->with('toast_type', 'info');
    }

    public function show(Request $request): View|RedirectResponse
    {
        $email = $request->query('email');
        $token = $request->query('token');
        $user = is_string($email) ? User::whereRaw('LOWER(email) = ?', [strtolower($email)])->first() : null;

        if (! $user || ! is_string($token) || strlen($token) !== 64 || ! Password::tokenExists($user, $token)) {
            return redirect()->route('password.request')->withErrors(['email' => 'This reset link is invalid or expired. Please request a new link.'])->with('toast_type', 'warning');
        }

        $request->session()->regenerate();
        $request->session()->put('password_reset_binding', hash('sha256', $user->email.'|'.$token));

        return view('authentication.reset_password', ['email' => $user->email, 'token' => $token]);
    }

    public function update(ResetPasswordRequest $request): RedirectResponse
    {
        $credentials = $request->validated();
        $user = User::whereRaw('LOWER(email) = ?', [strtolower($credentials['email'])])->first();
        $binding = $user ? hash('sha256', $user->email.'|'.$credentials['token']) : '';

        if (! $user || ! hash_equals($binding, $request->session()->get('password_reset_binding', ''))) {
            throw ValidationException::withMessages(['token' => 'This reset session is invalid. Open the link from your email again.']);
        }

        $credentials['email'] = $user->email;
        $result = DB::transaction(function () use ($request, $credentials, $user): string {
            $account = DB::table('user_auth')->where('user_id', $user->user_id)->lockForUpdate()->first();
            if (! $account) {
                return Password::INVALID_USER;
            }

            return Password::reset($credentials, function (User $user, string $password) use ($request): void {
                DB::table('user_auth')->where('user_id', $user->user_id)->update([
                    'password_hash' => Hash::make($password),
                    'session_generation' => DB::raw('session_generation + 1'),
                    'totp_pending_secret' => null,
                    'totp_pending_until' => null,
                    'token' => null,
                    'token_time' => null,
                ]);
                DB::table('user_verify')->where('user_id', $user->user_id)->whereNull('invalidated_at')
                    ->update(['invalidated_at' => now(), 'updated_at' => now()]);
                DB::table('user_device_sessions')->where('user_id', $user->user_id)->whereNull('revoked_at')->update(['revoked_at' => now()]);
                AuditTrail::record($request, 'password_reset', $user, category: 'security');
            });
        });

        if ($result !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => 'This reset link is invalid or expired. Please request a new link.']);
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('status', $user->isEligibleForLogin() ? 'Your password has been reset. Sign in with your new password.' : 'Your password has been set. Login is unavailable until your account is approved and activated.');
    }
}
