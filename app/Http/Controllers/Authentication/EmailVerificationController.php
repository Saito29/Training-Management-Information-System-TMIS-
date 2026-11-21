<?php

namespace App\Http\Controllers\Authentication;

use App\Http\Authentication\LoginChallenge;
use App\Http\Requests\Authentication\VerifyLoginCodeRequest;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class EmailVerificationController
{
    public function show(Request $request, LoginChallenge $challenge): View|RedirectResponse
    {
        $pending = $challenge->pending($request)->first();
        $user = $pending ? User::where('user_id', $pending->user_id)->first() : null;

        if (! $user || ! $user->isEligibleForLogin() || $pending->attempts >= 3) {
            $challenge->forget($request);
            $credentialMissing = $user && $user->hasActiveRole() && ! $user->hasValidRoleCredential();

            return redirect()->route('login')
                ->withErrors(['email' => $credentialMissing
                    ? 'Your account has no active role credential assigned. Contact a System Administrator before signing in.'
                    : 'Please sign in again to request a verification code.'])
                ->with('toast_type', $credentialMissing ? 'info' : 'warning');
        }

        [$local, $domain] = explode('@', $user->email, 2);

        return view('authentication.two_factor', [
            'authenticatorChallenge' => $request->session()->get('login_challenge.method') === 'authenticator',
            'maskedEmail' => mb_substr($local, 0, 1).'***@'.$domain,
            'expiresAt' => Carbon::parse($pending->expires_at)->toIso8601String(),
            'resendAvailableAt' => Carbon::parse($pending->resend_available_at)->toIso8601String(),
        ]);
    }

    public function store(VerifyLoginCodeRequest $request, LoginChallenge $challenge): RedirectResponse
    {
        $user = $challenge->verify($request, $request->validated('verification_code'));
        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('admin.dashboard.dashboard');
    }

    public function resend(Request $request, LoginChallenge $challenge): RedirectResponse
    {
        $challenge->resend($request);

        return redirect()->route('verification')->with('status', 'A new verification code has been sent.');
    }
}
