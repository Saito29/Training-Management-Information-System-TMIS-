<?php

namespace App\Http\Authentication;

use App\Mail\Authentication\LoginVerificationCode;
use App\Models\User;
use App\Support\Authenticator;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class LoginChallenge
{
    public function pending(Request $request): Builder
    {
        return DB::table('user_verify')
            ->where('id', $request->session()->get('login_challenge.id', 0))
            ->where('session_binding_hash', hash('sha256', $request->session()->get('login_challenge.binding', '')))
            ->whereNull('invalidated_at');
    }

    public function forget(Request $request): void
    {
        if ($request->session()->has('login_challenge')) {
            $this->pending($request)->update(['invalidated_at' => now(), 'updated_at' => now()]);
        }

        $request->session()->forget('login_challenge');
    }

    public function start(Request $request, User $user, string $passwordHash): void
    {
        $binding = Str::random(64);
        $code = (string) random_int(100000, 999999);

        $id = DB::transaction(function () use ($binding, $code, $user, $passwordHash): int {
            $account = DB::table('user_auth')->where('user_id', $user->user_id)->lockForUpdate()->first();
            if (! $account || ! hash_equals($account->password_hash, $passwordHash)) {
                throw ValidationException::withMessages(['email' => 'Unable to sign in. Please check your details and try again.']);
            }
            $this->checkSendLimit($user);
            $existing = DB::table('user_verify')->where('user_id', $user->user_id)->orderByDesc('updated_at')->lockForUpdate()->first();
            $id = $existing?->id ?? random_int(1, PHP_INT_MAX);
            $values = [
                'id' => $id,
                'user_id' => $user->user_id,
                'code_hash' => Hash::make($code),
                'session_binding_hash' => hash('sha256', $binding),
                'attempts' => 0,
                'resend_count' => 0,
                'last_send_count' => 0,
                'resend_available_at' => now()->addSeconds(30),
                'expires_at' => now()->addMinutes(5),
                'invalidated_at' => null,
                'created_at' => $existing?->created_at ?? now(),
                'updated_at' => now(),
            ];
            if ($existing) {
                DB::table('user_verify')->where('user_id', $user->user_id)->update(['invalidated_at' => now()]);
                DB::table('user_verify')->where('id', $id)->where('user_id', $user->user_id)->update($values);
            } else {
                DB::table('user_verify')->insert($values);
            }
            $this->send($user, $code);

            return (int) $id;
        });

        $request->session()->regenerate();
        $request->session()->put('login_challenge', [
            'id' => $id,
            'binding' => $binding,
            'password_fingerprint' => hash('sha256', $passwordHash),
        ]);
    }

    public function startAuthenticator(Request $request, User $user, string $passwordHash): void
    {
        $binding = Str::random(64);
        $id = DB::transaction(function () use ($user, $binding): int {
            DB::table('user_auth')->where('user_id', $user->user_id)->lockForUpdate()->first();
            $existing = DB::table('user_verify')->where('user_id', $user->user_id)->first();
            $values = ['user_id' => $user->user_id, 'session_binding_hash' => hash('sha256', $binding), 'code_hash' => Hash::make(Str::random(64)), 'attempts' => 0, 'resend_count' => 0, 'last_send_count' => 0, 'resend_available_at' => now()->addMinutes(5), 'expires_at' => now()->addMinutes(5), 'invalidated_at' => null, 'updated_at' => now(), 'created_at' => $existing?->created_at ?? now()];
            if ($existing) {
                DB::table('user_verify')->where('id', $existing->id)->update($values);

                return $existing->id;
            }

            return DB::table('user_verify')->insertGetId($values);
        });
        $request->session()->regenerate();
        $request->session()->put('login_challenge', ['id' => $id, 'binding' => $binding, 'password_fingerprint' => hash('sha256', $passwordHash), 'method' => 'authenticator']);
    }

    public function verify(Request $request, string $code): User
    {
        $result = DB::transaction(function () use ($request, $code): User|string {
            $userId = $this->pending($request)->value('user_id');
            $account = DB::table('user_auth')->where('user_id', $userId)->lockForUpdate()->first();
            $pending = $this->pending($request)->lockForUpdate()->first();
            $user = $pending ? User::where('user_id', $pending->user_id)->first() : null;

            if (! $pending || ! $user || ! $account || ! $user->isEligibleForLogin()
                || ! hash_equals(hash('sha256', $account->password_hash), $request->session()->get('login_challenge.password_fingerprint', ''))) {
                $this->forget($request);

                return 'Your sign-in is no longer valid. Please sign in again.';
            }

            if (Carbon::parse($pending->expires_at)->lessThanOrEqualTo(now()) || $pending->attempts >= 3) {
                $request->session()->flash('toast_type', 'warning');

                return 'This code has expired or reached its attempt limit. Request a new code or sign in again.';
            }

            $isAuthenticator = $request->session()->get('login_challenge.method') === 'authenticator';
            if ($isAuthenticator !== (bool) $account->totp_secret) {
                $this->forget($request);

                return 'Your sign-in settings changed. Please sign in again.';
            }
            $valid = $isAuthenticator ? app(Authenticator::class)->consume($account, $code) : Hash::check($code, $pending->code_hash);
            if (! $valid) {
                $this->pending($request)->update([
                    'attempts' => $pending->attempts + 1,
                    'invalidated_at' => $pending->attempts + 1 >= 3 ? now() : null,
                    'updated_at' => now(),
                ]);

                return 'That code does not match. Check the six digits and try again.';
            }

            $this->forget($request);
            DB::table('user_auth')->where('user_id', $user->user_id)->update(['last_login_at' => now()]);
            $request->session()->put('auth.password_fingerprint', hash('sha256', $account->password_hash));
            $request->session()->put('auth.verified_user_id', $user->user_id);
            $request->session()->put('auth.session_generation', (int) $account->session_generation);
            $request->session()->put('auth.device_token', Str::random(64));

            return $user;
        });

        if (is_string($result)) {
            throw ValidationException::withMessages(['verification_code' => $result]);
        }

        return $result;
    }

    public function resend(Request $request): void
    {
        abort_if($request->session()->get('login_challenge.method') === 'authenticator', 422, 'Use the current code from your authenticator app.');
        DB::transaction(function () use ($request): void {
            $userId = $this->pending($request)->value('user_id');
            DB::table('user_auth')->where('user_id', $userId)->lockForUpdate()->first();
            $pending = $this->pending($request)->lockForUpdate()->first();
            $user = $pending ? User::where('user_id', $pending->user_id)->first() : null;

            if (! $pending || ! $user || ! $user->isEligibleForLogin() || $pending->attempts >= 3) {
                throw ValidationException::withMessages(['verification_code' => 'Please sign in again to request a new code.']);
            }

            $this->checkSendLimit($user);
            if ($pending->resend_count >= 3 || $pending->last_send_count >= 3 || Carbon::parse($pending->resend_available_at)->isFuture()) {
                throw ValidationException::withMessages(['verification_code' => 'Please wait 30 seconds before resending. Only three resends are allowed.']);
            }

            $code = (string) random_int(100000, 999999);
            while (Hash::check($code, $pending->code_hash)) {
                $code = (string) random_int(100000, 999999);
            }

            $this->pending($request)->update([
                'code_hash' => Hash::make($code),
                'resend_count' => $pending->resend_count + 1,
                'last_send_count' => $pending->last_send_count + 1,
                'resend_available_at' => now()->addSeconds(30),
                'expires_at' => now()->addMinutes(5),
                'updated_at' => now(),
            ]);
            $this->send($user, $code);
        });
    }

    private function checkSendLimit(User $user): void
    {
        if (RateLimiter::tooManyAttempts('verification-email:'.$user->user_id, 4)) {
            throw ValidationException::withMessages(['verification_code' => 'The email limit has been reached. Please wait 15 minutes before requesting another code.']);
        }
    }

    private function send(User $user, string $code): void
    {
        try {
            Mail::to($user->email)->send(new LoginVerificationCode($code));
            RateLimiter::hit('verification-email:'.$user->user_id, 900);
        } catch (TransportExceptionInterface $exception) {
            report($exception);

            throw ValidationException::withMessages(['email' => 'The verification email could not be sent. Please try again later.']);
        }
    }
}
