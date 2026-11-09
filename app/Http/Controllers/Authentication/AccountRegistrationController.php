<?php

namespace App\Http\Controllers\Authentication;

use App\Http\Authentication\AuditTrail;
use App\Mail\Authentication\PasswordResetLink;
use App\Models\User;
use App\Support\AccountUpdateNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class AccountRegistrationController
{
    private function authorize(Request $request): void
    {
        abort_unless(DB::table('user_roles')->where('role_id', $request->user()->role_id)->where('name', 'System Administrator')->where('is_active', 1)->exists(), 403);
    }

    public function options(Request $request): JsonResponse
    {
        $this->authorize($request);
        $credentialTypes = DB::table('role_credentials')
            ->join('user_roles', 'user_roles.role_id', '=', 'role_credentials.role_id')
            ->where('user_roles.is_active', 1)
            ->orderBy('role_credentials.role_id')
            ->orderBy('role_credentials.name')
            ->get([
                'user_roles.name as role',
                'role_credentials.role_credential_id as id',
                'role_credentials.name',
            ]);
        $credentialIds = $credentialTypes->pluck('id');
        $credentialPermissions = DB::table('role_credential_permissions')
            ->whereIn('role_credential_id', $credentialIds)
            ->orderBy('permission')
            ->get(['role_credential_id', 'permission'])
            ->groupBy('role_credential_id');
        $deniedCredentialPermissions = DB::table('role_credential_denied_permissions')
            ->whereIn('role_credential_id', $credentialIds)
            ->orderBy('permission')
            ->get(['role_credential_id', 'permission'])
            ->groupBy('role_credential_id');

        return response()->json([
            'roles' => DB::table('user_roles')->where('is_active', 1)->pluck('name'),
            'credentialTypes' => $credentialTypes
                ->groupBy('role')
                ->map(fn ($credentials) => $credentials->map(fn (object $credential): array => [
                    'id' => $credential->id,
                    'name' => $credential->name,
                    'permissions' => $credentialPermissions->get($credential->id, collect())->pluck('permission')->all(),
                    'deniedPermissions' => $deniedCredentialPermissions->get($credential->id, collect())->pluck('permission')->all(),
                ])->values())
                ->all(),
            'regions' => DB::table('region')->where('is_active', 1)->get(['region_id as id', 'name']),
            'offices' => DB::table('organization')->where('is_active', 1)->get(['region_id', 'name']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request);
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower(trim($request->input('email')))]);
        }
        $roleId = DB::table('user_roles')->where('name', $request->input('role'))->where('is_active', 1)->value('role_id');
        $data = $request->validate([
            'firstName' => ['required', 'string', 'max:150'], 'middleName' => ['nullable', 'string', 'max:150'],
            'lastName' => ['required', 'string', 'max:255'], 'suffix' => ['nullable', 'string', 'max:50'],
            'dateOfBirth' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'email' => ['required', 'email', 'max:255'], 'phone' => ['nullable', 'string', 'max:20'],
            'sex' => ['nullable', Rule::in(['Male', 'Female'])],
            'role' => ['required', 'string', Rule::exists('user_roles', 'name')->where('is_active', 1)],
            'credentialTypeId' => ['nullable', 'integer', Rule::exists('role_credentials', 'role_credential_id')->where('role_id', (int) $roleId)],
            'region' => ['required', 'string', Rule::exists('region', 'name')->where('is_active', 1)],
            'office' => ['required', 'string'], 'position' => ['required', 'string', 'max:255'],
        ]);
        if (User::whereRaw('LOWER(email) = ?', [$data['email']])->exists()) {
            throw ValidationException::withMessages(['email' => 'This email is already registered.']);
        }
        $regionId = DB::table('region')->where('name', $data['region'])->value('region_id');
        $officeId = DB::table('organization')->where('name', $data['office'])->where('region_id', $regionId)->where('is_active', 1)->value('org_id');
        if (! $officeId) {
            throw ValidationException::withMessages(['office' => 'Select an active organization belonging to the selected region.']);
        }
        $user = DB::transaction(function () use ($request, $data, $regionId, $officeId): User {
            $user = new User;
            foreach (['firstName' => 'first_name', 'middleName' => 'middle_name', 'lastName' => 'last_name', 'suffix' => 'extension_name', 'dateOfBirth' => 'date_of_birth', 'sex' => 'sex', 'email' => 'email', 'phone' => 'mobile_number', 'position' => 'position'] as $field => $column) {
                $user->{$column} = $data[$field] ?? null;
            }
            $user->role_id = DB::table('user_roles')->where('name', $data['role'])->value('role_id');
            $user->role_credential_id = $data['credentialTypeId'] ?? null;
            $user->region_id = $regionId;
            $user->org_id = $officeId;
            $user->status = 'Pending approval';
            $user->active_status = 0;
            $user->save();
            DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => Hash::make(Str::random(64)), 'email_two_factor_enabled' => true]);
            AuditTrail::record($request, 'account_created', $user, [], [
                'status' => $user->status,
                'role_id' => $user->role_id,
                'role_credential_id' => $user->role_credential_id,
            ]);

            return $user;
        });
        try {
            $token = Password::createToken($user);
            $url = rtrim(config('app.url'), '/').route('password.reset', ['token' => $token, 'email' => $user->email], false);
            Mail::to($user->email)->send(new PasswordResetLink($url, true));
        } catch (TransportExceptionInterface $exception) {
            report($exception);

            return response()->json(['message' => 'Account created, inactive and pending approval. The password email could not be sent. The user can request a new link through Forgot password.', 'mailSent' => false], 201);
        }

        return response()->json(['message' => 'Account created. A password setup link was sent. Login remains blocked until a System Administrator approves the account.', 'mailSent' => true], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize($request);
        $users = DB::table('users')->leftJoin('user_roles', 'users.role_id', '=', 'user_roles.role_id')
            ->leftJoin('role_credentials', 'users.role_credential_id', '=', 'role_credentials.role_credential_id')
            ->leftJoin('region', 'users.region_id', '=', 'region.region_id')->leftJoin('organization', 'users.org_id', '=', 'organization.org_id')
            ->whereNull('users.deleted_at')->whereIn('users.status', ['Pending approval', 'Rejected'])
            ->select('users.user_id as id', 'users.first_name as firstName', 'users.middle_name as middleName', 'users.last_name as lastName', 'users.extension_name as suffix', 'users.date_of_birth as dateOfBirth', 'users.email', 'users.mobile_number as phone', 'users.position', 'users.status', 'users.is_created_at as createdAt', 'user_roles.name as role', 'role_credentials.name as credentialType', 'region.name as region', 'organization.name as office')->get();

        return response()->json(['users' => $users]);
    }

    /** Record the approving administrator and notify the account owner of the decision. */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize($request);
        $data = $request->validate(['decision' => ['required', Rule::in(['Approved', 'Rejected'])]]);
        $approved = $data['decision'] === 'Approved';
        DB::transaction(function () use ($request, $user, $approved): void {
            $before = DB::table('users')->where('user_id', $user->user_id)->lockForUpdate()->first();
            abort_unless($before && $before->deleted_at === null && $before->status === 'Pending approval', 409, 'This account is no longer pending approval. Refresh the list.');
            $changes = ['status' => $approved ? 'Approved & Accepted' : 'Rejected', 'active_status' => $approved ? 1 : 0, 'is_updated_at' => now()];
            DB::table('users')->where('user_id', $user->user_id)->update($changes);
            AuditTrail::record($request, $approved ? 'account_approved' : 'account_rejected', $user, ['status' => $before->status, 'active_status' => $before->active_status], $changes);
            app(AccountUpdateNotifier::class)->notify($request, $user, ['status', 'active_status'], $approved ? 'approved' : 'rejected');
        });

        return response()->json(['message' => $approved ? 'Account approved and activated.' : 'Account rejected and remains inactive.']);
    }
}
