<?php

namespace App\Http\Controllers\Authentication;

use App\Http\Authentication\AuditTrail;
use App\Support\Authenticator;
use App\Support\DeviceSessions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileSecurityController
{
    public function show(Request $request): JsonResponse
    {
        $account = DB::table('user_auth')->where('user_id', $request->user()->user_id)->first();
        $codes = $account->totp_recovery_codes ? json_decode(Crypt::decryptString($account->totp_recovery_codes), true, 512, JSON_THROW_ON_ERROR) : [];

        return response()->json(['enabled' => (bool) $account->totp_secret, 'emailVerificationEnabled' => (bool) $account->email_two_factor_enabled, 'recoveryRemaining' => count($codes), 'passwordChangeAvailable' => true]);
    }

    private function confirmPassword(Request $request, object $account): void
    {
        $data = $request->validate(['current_password' => ['required', 'string', 'max:1024']]);
        if (! Hash::check($data['current_password'], $account->password_hash)) {
            throw ValidationException::withMessages(['current_password' => 'Your current password does not match.']);
        }
    }

    public function action(Request $request, string $action, Authenticator $authenticator, DeviceSessions $sessions): JsonResponse
    {
        $result = DB::transaction(function () use ($request, $action, $authenticator, $sessions): array {
            $account = DB::table('user_auth')->where('user_id', $request->user()->user_id)->lockForUpdate()->first();
            if ($action === 'cancel') {
                DB::table('user_auth')->where('id', $account->id)->update(['totp_pending_secret' => null, 'totp_pending_until' => null]);

                return ['message' => 'Authenticator setup cancelled.'];
            }
            if ($action === 'enable') {
                $input = $request->validate(['code' => ['required', 'string', 'regex:/^[0-9]{6}$/']]);
                if ($account->totp_secret || ! $account->totp_pending_secret || ! $account->totp_pending_until || now()->gte($account->totp_pending_until)) {
                    throw ValidationException::withMessages(['code' => 'Setup expired or is unavailable. Start setup again.']);
                }
                $counter = $authenticator->counter(Crypt::decryptString($account->totp_pending_secret), $input['code']);
                if ($counter === null) {
                    throw ValidationException::withMessages(['code' => 'The authenticator code does not match.']);
                }
                DB::table('user_auth')->where('id', $account->id)->update(['totp_secret' => $account->totp_pending_secret, 'totp_pending_secret' => null, 'totp_pending_until' => null, 'totp_last_counter' => $counter]);
                DB::table('user_verify')->where('user_id', $account->user_id)->whereNull('invalidated_at')->update(['invalidated_at' => now()]);
                $codes = $authenticator->recoveryCodes($account->id);
                $sessions->revokeOthers($request);
                AuditTrail::record($request, 'authenticator_enabled', $request->user(), category: 'security');

                return ['message' => 'Authenticator enabled. Save your recovery codes.', 'recoveryCodes' => $codes];
            }
            $this->confirmPassword($request, $account);
            if ($action === 'setup') {
                abort_if((bool) $account->totp_secret, 409, 'Authenticator is already enabled.');
                $secret = $authenticator->secret();
                $expires = now()->addMinutes(10);
                DB::table('user_auth')->where('id', $account->id)->update(['totp_pending_secret' => Crypt::encryptString($secret), 'totp_pending_until' => $expires]);

                return ['secret' => $secret, 'expiresAt' => $expires->toIso8601String(), 'message' => 'Enter the setup key in your authenticator app.'];
            }
            if ($account->totp_secret) {
                $input = $request->validate(['code' => ['required', 'string', 'max:40']]);
                if (! $authenticator->consume($account, $input['code'])) {
                    throw ValidationException::withMessages(['code' => 'Use a current authenticator code or an unused recovery code.']);
                }
            }
            if ($action === 'disable') {
                abort_unless((bool) $account->totp_secret, 409, 'Authenticator is not enabled.');
                DB::table('user_auth')->where('id', $account->id)->update(['totp_secret' => null, 'totp_last_counter' => null, 'totp_recovery_codes' => null, 'totp_pending_secret' => null, 'totp_pending_until' => null]);
                $message = 'Authenticator disabled. Email verification settings are unchanged.';
            } elseif ($action === 'recovery') {
                abort_unless((bool) $account->totp_secret, 409, 'Enable the authenticator first.');
                $codes = $authenticator->recoveryCodes($account->id);
                AuditTrail::record($request, 'recovery_codes_replaced', $request->user(), category: 'security');

                return ['recoveryCodes' => $codes, 'message' => 'Recovery codes replaced.'];
            } elseif ($action === 'password') {
                $input = $request->validate(['password' => ['required', 'string', 'max:128', Password::min(8)->mixedCase()->numbers()->symbols()], 'password_confirmation' => ['required', 'same:password']]);
                $hash = Hash::make($input['password']);
                DB::table('user_auth')->where('id', $account->id)->update(['password_hash' => $hash]);
                DB::table('user_verify')->where('user_id', $account->user_id)->whereNull('invalidated_at')->update(['invalidated_at' => now()]);
                $request->session()->put('auth.password_fingerprint', hash('sha256', $hash));
                $message = 'Password updated. Other sessions were signed out.';
            } else {
                abort(404);
            }
            DB::table('user_verify')->where('user_id', $account->user_id)->whereNull('invalidated_at')->update(['invalidated_at' => now()]);
            $sessions->revokeOthers($request);
            AuditTrail::record($request, $action === 'disable' ? 'authenticator_disabled' : 'password_changed', $request->user(), category: 'security');

            return ['message' => $message];
        });

        return response()->json($result, 200, ['Cache-Control' => 'no-store']);
    }

    public function sessions(Request $request, DeviceSessions $sessions): JsonResponse
    {
        $records = DB::table('user_device_sessions')->where('user_id', $request->user()->user_id)->whereNull('revoked_at')->where('last_activity_at', '>=', now()->subMinutes((int) config('session.lifetime')))->orderByDesc('last_activity_at')->get();
        $current = $sessions->hash($request);

        return response()->json(['sessions' => $records->map(fn ($record): array => ['id' => $record->id, 'userAgent' => $record->user_agent, 'deviceName' => hash_equals($current, $record->session_hash) ? 'This browser' : 'Signed-in browser', 'isCurrent' => hash_equals($current, $record->session_hash), 'location' => $record->ip_address ?: 'Not available', 'lastActiveAt' => Carbon::parse($record->last_activity_at)->toIso8601String(), 'createdAt' => Carbon::parse($record->created_at)->toIso8601String()])->all()]);
    }

    public function revoke(Request $request, DeviceSessions $sessions, string $action): JsonResponse
    {
        DB::transaction(function () use ($request, $sessions, $action): void {
            if ($action === 'revoke-others') {
                $sessions->revokeOthers($request);
            } else {
                $input = $request->validate(['id' => ['required', 'uuid']]);
                $record = DB::table('user_device_sessions')->where('id', $input['id'])->where('user_id', $request->user()->user_id)->whereNull('revoked_at')->lockForUpdate()->first();
                abort_unless($record, 404);
                abort_if(hash_equals($sessions->hash($request), $record->session_hash), 422, 'Use Sign out to end your current session.');
                DB::table('user_device_sessions')->where('id', $record->id)->update(['revoked_at' => now()]);
            }
            AuditTrail::record($request, 'device_sessions_revoked', $request->user(), category: 'security');
        });

        return response()->json(['message' => 'Device sessions signed out.']);
    }

    public function logs(Request $request): JsonResponse
    {
        $logs = DB::table('users_log')->where('actor_user_id', $request->user()->user_id)->where('category', 'security')->orderByDesc('id')->limit(100)->get()->map(fn ($log): array => ['id' => (string) $log->id, 'title' => ucfirst(str_replace('_', ' ', $log->event)), 'date' => Carbon::parse($log->created_at)->toIso8601String(), 'category' => 'security']);

        return response()->json(['logs' => $logs]);
    }
}
