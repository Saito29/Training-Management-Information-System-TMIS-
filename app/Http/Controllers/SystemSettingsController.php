<?php

namespace App\Http\Controllers;

use App\Http\Authentication\AuditTrail;
use App\Models\User;
use App\Support\AccountUpdateNotifier;
use App\Support\ModuleAccess;
use App\Support\OriginalInterfaceData;
use App\Support\SystemMaintenance;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class SystemSettingsController
{
    public function trash(Request $request): View
    {
        $request->merge(['state' => 'trash']);

        return $this->accounts($request);
    }

    public function accounts(Request $request): View|string
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate([
            'state' => ['nullable', Rule::in(['active', 'inactive', 'trash', 'pending'])],
            'search' => ['nullable', 'string', 'max:100'],
            'role_id' => ['nullable', 'integer', Rule::exists('user_roles', 'role_id')->where('is_active', 1)->whereNot('name', 'System Administrator')],
            'role_credential_id' => ['nullable', 'integer', Rule::exists('role_credentials', 'role_credential_id')],
            'region_id' => ['nullable', 'integer', Rule::exists('region', 'region_id')],
            'org_id' => ['nullable', 'integer', Rule::exists('organization', 'org_id')],
            'per_page' => ['nullable', 'integer', Rule::in([10, 25, 50, 100])],
        ]);
        $query = DB::table('users')
            ->leftJoin('user_roles as account_roles', 'users.role_id', '=', 'account_roles.role_id')
            ->leftJoin('region as account_regions', 'users.region_id', '=', 'account_regions.region_id')
            ->leftJoin('organization as account_offices', 'users.org_id', '=', 'account_offices.org_id')
            ->leftJoin('role_credentials as account_credentials', function ($join): void {
                $join->on('users.role_credential_id', '=', 'account_credentials.role_credential_id')
                    ->on('users.role_id', '=', 'account_credentials.role_id');
            })
            ->where('account_roles.name', '<>', 'System Administrator')
            ->select([
                'users.*',
                'account_roles.name as role_name',
                'account_regions.name as region_name',
                'account_offices.name as office_name',
                'account_credentials.name as credential_name',
            ]);
        if (($data['state'] ?? '') === 'trash') {
            $query->whereNotNull('deleted_at');
        } else {
            $query->whereNull('deleted_at');
            if (in_array($data['state'] ?? '', ['active', 'inactive'], true)) {
                $query->where('active_status', $data['state'] === 'active' ? 1 : 0);
            }
            if (($data['state'] ?? '') === 'pending') {
                $query->where('status', 'Pending approval');
            }
        }
        if (! empty($data['search'])) {
            $search = '%'.$data['search'].'%';
            $query->where(fn ($query) => $query->where('first_name', 'like', $search)
                ->orWhere('middle_name', 'like', $search)
                ->orWhere('last_name', 'like', $search)
                ->orWhere('email', 'like', $search));
        }
        if (! empty($data['role_id'])) {
            $query->where('users.role_id', $data['role_id']);
        }
        if (! empty($data['role_credential_id'])) {
            $query->where('users.role_credential_id', $data['role_credential_id']);
        }
        if (! empty($data['region_id'])) {
            $query->where('users.region_id', $data['region_id']);
        }
        if (! empty($data['org_id'])) {
            $query->where('users.org_id', $data['org_id']);
        }

        $accounts = $query->orderByDesc('users.user_id')
            ->paginate((int) ($data['per_page'] ?? 10), ['*'], 'accounts_page')
            ->withQueryString();
        $credentialIds = $accounts->getCollection()->pluck('role_credential_id')->filter()->unique()->values();
        $credentialGrants = DB::table('role_credential_permissions')
            ->whereIn('role_credential_id', $credentialIds)
            ->orderBy('permission')
            ->get(['role_credential_id', 'permission'])
            ->groupBy('role_credential_id')
            ->map(fn ($permissions) => ModuleAccess::normalizePermissionRows($permissions)->pluck('permission')->all());
        $credentialDenials = DB::table('role_credential_denied_permissions')
            ->whereIn('role_credential_id', $credentialIds)
            ->orderBy('permission')
            ->get(['role_credential_id', 'permission'])
            ->groupBy('role_credential_id')
            ->map(fn ($permissions) => ModuleAccess::normalizePermissionRows($permissions)->pluck('permission')->all());

        $view = view($request->routeIs('admin.administration.details.trash') ? 'admin.administration.details.trash' : 'admin.operation-accounts', [
            'accounts' => $accounts,
            'accountFilters' => $data,
            'credentialGrants' => $credentialGrants,
            'credentialDenials' => $credentialDenials,
            'roles' => DB::table('user_roles')->where('is_active', 1)->where('name', '<>', 'System Administrator')->orderBy('name')->get(),
            'credentialTypes' => DB::table('role_credentials')
                ->join('user_roles', 'user_roles.role_id', '=', 'role_credentials.role_id')
                ->where('user_roles.is_active', 1)
                ->where('user_roles.name', '<>', 'System Administrator')
                ->orderBy('role_credentials.role_id')
                ->orderBy('role_credentials.name')
                ->get(['role_credentials.role_credential_id', 'role_credentials.role_id', 'role_credentials.name']),
            'regions' => DB::table('region')->where('is_active', 1)->orderBy('name')->get(),
            'offices' => DB::table('organization')->where('is_active', 1)->orderBy('name')->get(),
        ]);

        if ($request->header('X-Account-Table') === '1' && $request->routeIs('system.accounts')) {
            return $view->fragment('account-results');
        }

        return $view;
    }

    /** Update another account's access and notify its owner with the acting administrator's identity. */
    public function manageAccount(Request $request, int $id): JsonResponse|RedirectResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate([
            'action' => ['required', Rule::in(['update', 'delete', 'restore'])],
            'role_id' => ['required_if:action,update', 'integer', Rule::exists('user_roles', 'role_id')->where('is_active', 1)->whereNot('name', 'System Administrator')],
            'role_credential_id' => ['nullable', 'integer', Rule::exists('role_credentials', 'role_credential_id')->where('role_id', $request->input('role_id'))],
            'region_id' => ['required_if:action,update', 'integer', Rule::exists('region', 'region_id')->where('is_active', 1)],
            'org_id' => ['required_if:action,update', 'integer', Rule::exists('organization', 'org_id')->where('is_active', 1)->where('region_id', $request->input('region_id'))],
            'status' => ['required_if:action,update', Rule::in(['Pending approval', 'Rejected', 'Approved & Accepted'])],
            'active_status' => ['required_if:action,update', 'boolean'],
        ]);
        DB::transaction(function () use ($request, $id, $data): void {
            $user = User::where('user_id', $id)->lockForUpdate()->firstOrFail();
            abort_if((int) $request->user()->user_id === $id, 422, 'Use your profile for personal changes. You cannot change your own access or delete your own account.');
            abort_if(DB::table('user_roles')->where('role_id', $user->role_id)->where('name', 'System Administrator')->exists(), 404);
            if ($data['action'] === 'update') {
                abort_if($user->deleted_at !== null, 409, 'Restore this account before editing access.');
                abort_if($data['status'] !== 'Approved & Accepted' && $data['active_status'], 422, 'Only approved accounts can be activated.');
                $changes = Arr::only($data, ['role_id', 'region_id', 'org_id', 'status', 'active_status']);
                $credentialMatchesRole = $user->role_credential_id
                    && DB::table('role_credentials')
                        ->where('role_credential_id', $user->role_credential_id)
                        ->where('role_id', $data['role_id'])
                        ->exists();
                $changes['role_credential_id'] = array_key_exists('role_credential_id', $data)
                    ? $data['role_credential_id']
                    : ($credentialMatchesRole ? $user->role_credential_id : null);
            } elseif ($data['action'] === 'delete') {
                $changes = ['deleted_at' => now(), 'active_status' => 0];
            } else {
                $changes = ['deleted_at' => null, 'active_status' => 0];
            }
            DB::table('users')->where('user_id', $id)->update($changes + ['is_updated_at' => now()]);
            $before = $user->only(['status', 'active_status', 'role_id', 'role_credential_id', 'region_id', 'org_id']);
            AuditTrail::record($request, 'account_access_'.$data['action'], $user, $before, $changes);

            // Consolidated interface syncs send one notice after access and personal details are both saved.
            if (! $request->attributes->get('defer_account_update_notification')) {
                $changedFields = array_keys(array_filter(
                    $changes,
                    static fn (mixed $value, string $field): bool => $user->getRawOriginal($field) != $value,
                    ARRAY_FILTER_USE_BOTH,
                ));
                app(AccountUpdateNotifier::class)->notify($request, $user, $changedFields, $data['action'], $before, $changes);
            }
        });

        return $request->expectsJson() ? response()->json(['message' => 'Account access saved.']) : back()->with('operation_message', 'Account access saved.');
    }

    public function accountProfile(Request $request, User $user): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);

        $account = DB::table('users')
            ->leftJoin('user_roles', 'users.role_id', '=', 'user_roles.role_id')
            ->leftJoin('role_credentials', function ($join): void {
                $join->on('users.role_credential_id', '=', 'role_credentials.role_credential_id')
                    ->on('users.role_id', '=', 'role_credentials.role_id');
            })
            ->leftJoin('region', 'users.region_id', '=', 'region.region_id')
            ->leftJoin('organization', 'users.org_id', '=', 'organization.org_id')
            ->where('users.user_id', $user->user_id)
            ->first([
                'users.user_id as id', 'users.first_name as firstName', 'users.middle_name as middleName',
                'users.last_name as lastName', 'users.extension_name as suffix', 'users.date_of_birth as dateOfBirth',
                'users.email', 'users.mobile_number as phone', 'users.position', 'users.status',
                'users.active_status as activeStatus', 'users.is_created_at as createdAt',
                'users.is_updated_at as updatedAt', 'users.deleted_at as deletedAt',
                'user_roles.name as role', 'role_credentials.name as credentialType',
                'region.name as region', 'organization.name as office',
            ]);

        abort_unless($account, 404);

        $account->credentialPermissions = DB::table('role_credential_permissions')
            ->where('role_credential_id', $user->role_credential_id)
            ->orderBy('permission')
            ->pluck('permission')
            ->all();
        $account->deniedCredentialPermissions = DB::table('role_credential_denied_permissions')
            ->where('role_credential_id', $user->role_credential_id)
            ->orderBy('permission')
            ->pluck('permission')
            ->all();

        return response()->json(['user' => $account]);
    }

    /** Load authorized settings data and directory aggregates used by the locations and offices tables. */
    public function index(Request $request): View
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $isSuperAdministrator = ModuleAccess::isSuperAdministrator($request->user());
        $superAdminFilters = $isSuperAdministrator ? $request->validate([
            'super_admin_search' => ['nullable', 'string', 'max:100'],
            'super_admin_region' => ['nullable', 'integer', Rule::exists('region', 'region_id')],
            'super_admin_office' => ['nullable', 'integer', Rule::exists('organization', 'org_id')],
            'super_admin_per_page' => ['nullable', 'integer', Rule::in([10, 25, 50, 100])],
        ]) : [];
        if (! empty($superAdminFilters['super_admin_region']) && ! empty($superAdminFilters['super_admin_office'])) {
            abort_if(
                ! DB::table('organization')->where('org_id', $superAdminFilters['super_admin_office'])
                    ->where('region_id', $superAdminFilters['super_admin_region'])->exists(),
                422,
                'The selected office does not belong to the selected region.',
            );
        }

        $superAdministrators = null;
        $credentialTypes = null;
        $credentialGrants = collect();
        $credentialDenials = collect();
        $credentialFilters = [];
        if ($isSuperAdministrator) {
            $credentialFilters = $request->validate([
                'credential_search' => ['nullable', 'string', 'max:120'],
                'credential_role_id' => ['nullable', 'integer', Rule::exists('user_roles', 'role_id')->where('is_active', 1)],
                'credential_per_page' => ['nullable', 'integer', Rule::in([10, 25, 50, 100])],
            ]);

            $credentialQuery = DB::table('role_credentials')
                ->join('user_roles', 'user_roles.role_id', '=', 'role_credentials.role_id')
                ->where('user_roles.is_active', 1)
                ->where('user_roles.name', '!=', 'System Administrator');
            if (! empty($credentialFilters['credential_search'])) {
                $search = mb_strtolower($credentialFilters['credential_search']);
                $pattern = '%'.$search.'%';
                $credentialQuery->where(function ($query) use ($pattern): void {
                    $query->whereRaw('LOWER(role_credentials.name) LIKE ?', [$pattern])
                        ->orWhereRaw('LOWER(user_roles.name) LIKE ?', [$pattern]);
                });
            }
            if (! empty($credentialFilters['credential_role_id'])) {
                $credentialQuery->where('role_credentials.role_id', $credentialFilters['credential_role_id']);
            }
            $credentialTypes = $credentialQuery
                ->select([
                    'role_credentials.role_credential_id',
                    'role_credentials.role_id',
                    'role_credentials.name',
                    'user_roles.name as role_name',
                    'role_credentials.created_at',
                    'role_credentials.updated_at',
                ])
                ->addSelect([
                    'assigned_accounts_count' => DB::table('users')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('users.role_credential_id', 'role_credentials.role_credential_id'),
                ])
                ->orderBy('user_roles.name')
                ->orderBy('role_credentials.name')
                ->paginate((int) ($credentialFilters['credential_per_page'] ?? 10), ['*'], 'credential_page')
                ->withQueryString();

            $credentialGrants = DB::table('role_credential_permissions')
                ->whereIn('role_credential_id', $credentialTypes->getCollection()->pluck('role_credential_id'))
                ->orderBy('permission')
                ->get()
                ->groupBy('role_credential_id')
                ->map(fn ($permissions) => ModuleAccess::normalizePermissionRows($permissions));
            $credentialDenials = DB::table('role_credential_denied_permissions')
                ->whereIn('role_credential_id', $credentialTypes->getCollection()->pluck('role_credential_id'))
                ->orderBy('permission')
                ->get()
                ->groupBy('role_credential_id')
                ->map(fn ($permissions) => ModuleAccess::normalizePermissionRows($permissions));

            $superAdminQuery = DB::table('users as u')
                ->join('user_roles as r', 'r.role_id', '=', 'u.role_id')
                ->join('region as regions', 'regions.region_id', '=', 'u.region_id')
                ->join('organization as offices', 'offices.org_id', '=', 'u.org_id')
                ->leftJoin('system_super_admins as sa', 'sa.user_id', '=', 'u.user_id')
                ->leftJoin('users as grantors', 'grantors.user_id', '=', 'sa.granted_by')
                ->where('r.name', 'System Administrator')
                ->where('r.is_active', 1)
                ->where('u.status', 'Approved & Accepted')
                ->where('u.active_status', 1)
                ->whereNull('u.deleted_at');

            if (! empty($superAdminFilters['super_admin_search'])) {
                $search = mb_strtolower($superAdminFilters['super_admin_search']);
                $pattern = '%'.$search.'%';
                $superAdminQuery->where(function ($query) use ($pattern): void {
                    foreach (['u.first_name', 'u.middle_name', 'u.last_name', 'u.email', 'regions.name', 'offices.name'] as $column) {
                        $query->orWhereRaw('LOWER('.$column.') LIKE ?', [$pattern]);
                    }
                });
            }
            if (! empty($superAdminFilters['super_admin_region'])) {
                $superAdminQuery->where('u.region_id', $superAdminFilters['super_admin_region']);
            }
            if (! empty($superAdminFilters['super_admin_office'])) {
                $superAdminQuery->where('u.org_id', $superAdminFilters['super_admin_office']);
            }

            $superAdministrators = $superAdminQuery
                ->select([
                    'u.user_id', 'u.first_name', 'u.middle_name', 'u.last_name', 'u.email',
                    'u.status', 'u.region_id', 'u.org_id',
                    'regions.name as region_name', 'offices.name as office_name',
                    'sa.user_id as super_admin_user_id', 'sa.granted_by', 'sa.created_at as granted_at',
                    'grantors.first_name as grantor_first_name', 'grantors.last_name as grantor_last_name',
                ])
                ->orderByRaw('CASE WHEN sa.user_id IS NULL THEN 1 ELSE 0 END')
                ->orderBy('u.last_name')
                ->orderBy('u.first_name')
                ->paginate((int) ($superAdminFilters['super_admin_per_page'] ?? 10), ['*'], 'super_admin_page')
                ->withQueryString();
        }

        $scope = DB::table('user_data_scopes')->where('user_id', $request->user()->user_id)->first();
        if (! $scope) {
            $scope = (object) [
                'region_ids' => $request->user()->region_id === null ? null : json_encode([(int) $request->user()->region_id], JSON_THROW_ON_ERROR),
                'office_ids' => $request->user()->org_id === null ? null : json_encode([(int) $request->user()->org_id], JSON_THROW_ON_ERROR),
            ];
        }

        return view('admin.system-settings', [
            'settings' => DB::table('system_settings')->where('id', 1)->first(),
            'roles' => $isSuperAdministrator ? DB::table('user_roles')->orderBy('role_id')->get() : collect(),
            'credentialTypes' => $credentialTypes,
            'credentialGrants' => $credentialGrants,
            'credentialDenials' => $credentialDenials,
            'credentialFilters' => $credentialFilters,
            'locations' => DB::table('geographic_locations')->orderBy('name')->get(),
            'nationalityOptions' => DB::table('participant_options')
                ->where('field', 'nationality')
                ->select('participant_options.*')
                ->addSelect([
                    'participant_count' => DB::table('participants')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('participants.nationality', 'participant_options.value'),
                ])
                ->orderBy('label')
                ->get(),
            'trainingTypeOptions' => $this->trainingTypeOptions(),
            'grants' => $isSuperAdministrator
                ? DB::table('role_permissions')->get()->groupBy('role_id')->map(fn ($permissions) => ModuleAccess::normalizePermissionRows($permissions))
                : collect(),
            'permissions' => $isSuperAdministrator ? ModuleAccess::permissions() : [],
            'navigationPages' => $isSuperAdministrator ? ModuleAccess::navigationPages() : [],
            'regions' => DB::table('region')->where('is_active', 1)->orderBy('name')->get(),
            'directoryRegions' => DB::table('region')->orderBy('name')->get(),
            'offices' => DB::table('organization')
                ->where('is_active', 1)
                ->select('organization.*')
                ->addSelect([
                    'account_count' => DB::table('users')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('users.org_id', 'organization.org_id')
                        ->whereNull('users.deleted_at'),
                    'training_count' => DB::table('trainings')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('trainings.org_id', 'organization.org_id')
                        ->whereNull('trainings.deleted_at'),
                ])
                ->orderBy('name')
                ->get(),
            'registeredOffices' => DB::table('organization')
                ->leftJoin('region as office_regions', 'office_regions.region_id', '=', 'organization.region_id')
                ->select('organization.*', 'office_regions.name as region_name', 'office_regions.is_active as region_is_active')
                ->addSelect([
                    'account_count' => DB::table('users')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('users.org_id', 'organization.org_id')
                        ->whereNull('users.deleted_at'),
                    'training_count' => DB::table('trainings')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('trainings.org_id', 'organization.org_id')
                        ->whereNull('trainings.deleted_at'),
                ])
                ->orderBy('name')
                ->get(),
            'scope' => $scope,
            'isSuperAdministrator' => $isSuperAdministrator,
            'superAdministrators' => $superAdministrators,
            'superAdminFilters' => $superAdminFilters,
        ]);
    }

    public function update(Request $request): RedirectResponse|JsonResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);

        return $this->saveMaintenanceSettings($request);
    }

    public function manageSuperAdministrators(Request $request): RedirectResponse|JsonResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);
        $data = $request->validate([
            'action' => ['required', Rule::in(['grant', 'revoke'])],
            'user_ids' => ['required', 'array', 'min:1', 'max:100'],
            'user_ids.*' => ['required', 'integer', 'distinct', Rule::exists('users', 'user_id')],
        ]);

        DB::transaction(function () use ($request, $data): void {
            $targetIds = DB::table('users as u')
                ->join('user_roles as r', 'r.role_id', '=', 'u.role_id')
                ->whereIn('u.user_id', $data['user_ids'])
                ->where('r.name', 'System Administrator')
                ->where('r.is_active', 1)
                ->where('u.status', 'Approved & Accepted')
                ->where('u.active_status', 1)
                ->whereNull('u.deleted_at')
                ->lockForUpdate()
                ->pluck('u.user_id')
                ->map(static fn (int|string $id): int => (int) $id)
                ->all();

            abort_if(count($targetIds) !== count($data['user_ids']), 422, 'Only active, approved System Administrator accounts can receive this access.');

            $existingIds = DB::table('system_super_admins')->whereIn('user_id', $targetIds)->pluck('user_id')
                ->map(static fn (int|string $id): int => (int) $id)->all();
            $targetUsers = User::whereIn('user_id', $targetIds)->get()->keyBy('user_id');
            $timestamp = now();

            foreach ($targetIds as $targetId) {
                $hadAccess = in_array($targetId, $existingIds, true);
                $shouldHaveAccess = $data['action'] === 'grant';
                if ($hadAccess === $shouldHaveAccess) {
                    continue;
                }

                if ($shouldHaveAccess) {
                    DB::table('system_super_admins')->insert([
                        'user_id' => $targetId,
                        'granted_by' => $request->user()->user_id,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                } else {
                    DB::table('system_super_admins')->where('user_id', $targetId)->delete();
                }

                AuditTrail::record(
                    $request,
                    $shouldHaveAccess ? 'super_admin_granted' : 'super_admin_revoked',
                    $targetUsers->get($targetId),
                    ['super_admin' => $hadAccess],
                    ['super_admin' => $shouldHaveAccess],
                    category: 'security',
                );
            }
        });

        $message = 'Super Admin access changes saved.';

        return $request->expectsJson()
            ? response()->json(['message' => $message])
            : back()->with('operation_message', $message);
    }

    public function maintenancePage(Request $request, SystemMaintenance $maintenance): Response|RedirectResponse
    {
        if (! $maintenance->isActive()) {
            return redirect()->route('login');
        }

        $settings = DB::table('system_settings')->where('id', 1)->first();

        return response()->view('errors.503', [
            'maintenanceMessage' => $settings?->maintenance_message,
            'maintenanceUntil' => $settings?->maintenance_until,
        ], 503, ['Retry-After' => '60', 'Cache-Control' => 'no-store']);
    }

    public function maintenanceSettings(Request $request, SystemMaintenance $maintenance): View
    {
        abort_unless($maintenance->canManage($request->user()), 403);

        return view('admin.maintenance-settings', [
            'settings' => DB::table('system_settings')->where('id', 1)->first(),
        ]);
    }

    public function updateMaintenance(Request $request, SystemMaintenance $maintenance): RedirectResponse|JsonResponse
    {
        abort_unless($maintenance->canManage($request->user()), 403);

        return $this->saveMaintenanceSettings($request);
    }

    /** Validate Philippine schedule times, store them in UTC, and audit each availability change. */
    private function saveMaintenanceSettings(Request $request): RedirectResponse|JsonResponse
    {
        if (! $request->boolean('maintenance_enabled')) {
            $request->merge(['maintenance_starts_at' => null, 'maintenance_until' => null]);
        }
        $data = $request->validate([
            'maintenance_enabled' => ['required', 'boolean'],
            'maintenance_message' => ['nullable', 'string', 'max:500'],
            'maintenance_starts_at' => ['nullable', 'date'],
            'maintenance_until' => ['nullable', 'date'],
            'maintenance_timezone' => ['nullable', Rule::in(['Asia/Manila'])],
        ]);
        if (! empty($data['maintenance_starts_at'])) {
            $startsAt = Carbon::parse($data['maintenance_starts_at'], $data['maintenance_timezone'] ?? 'UTC')->utc();
            if (! $startsAt->isFuture()) {
                throw ValidationException::withMessages(['maintenance_starts_at' => 'The start time must be in the future (Philippine time).']);
            }
            $data['maintenance_starts_at'] = $startsAt->toDateTimeString();
        }
        if (! empty($data['maintenance_until'])) {
            $until = Carbon::parse($data['maintenance_until'], $data['maintenance_timezone'] ?? 'UTC')->utc();
            if (! $until->isFuture()) {
                throw ValidationException::withMessages(['maintenance_until' => 'The return time must be in the future (Philippine time).']);
            }
            if (isset($startsAt) && $until->lessThanOrEqualTo($startsAt)) {
                throw ValidationException::withMessages(['maintenance_until' => 'The return time must be after the maintenance start time.']);
            }
            $data['maintenance_until'] = $until->toDateTimeString();
        }
        unset($data['maintenance_timezone']);
        DB::transaction(function () use ($request, $data): void {
            $before = DB::table('system_settings')->where('id', 1)->lockForUpdate()->first();
            DB::table('system_settings')->where('id', 1)->update($data + ['updated_at' => now()]);
            AuditTrail::record(
                $request,
                'maintenance_settings_updated',
                $request->user(),
                ['maintenance_enabled' => $before?->maintenance_enabled, 'maintenance_starts_at' => $before?->maintenance_starts_at, 'maintenance_until' => $before?->maintenance_until, 'maintenance_message' => $before?->maintenance_message],
                $data,
                category: 'settings',
            );
        });

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Maintenance settings saved.']);
        }

        return $request->routeIs('maintenance.settings.update')
            ? redirect()->route('maintenance.settings')->with('operation_message', 'Maintenance settings saved.')
            : back()->with('operation_message', 'Maintenance settings saved.');
    }

    /** Save system identity images and the dashboard greeting image, replacing prior files after commit. */
    public function updateBranding(Request $request): RedirectResponse|JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate([
            'system_name' => ['required', 'string', 'max:120'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:20480', 'dimensions:max_width=4000,max_height=2000'],
            'favicon' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:20480', 'dimensions:max_width=512,max_height=512'],
            'dashboard_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:20480', 'dimensions:max_width=6000,max_height=4000'],
        ]);
        $data['system_name'] = trim($data['system_name']);
        $newPaths = [];
        foreach (['logo', 'favicon', 'dashboard_image'] as $field) {
            if ($request->hasFile($field)) {
                $newPaths[$field.'_path'] = $request->file($field)->store('system-branding', 'local');
            }
        }

        try {
            $oldPaths = DB::transaction(function () use ($request, $data, $newPaths): array {
                $before = DB::table('system_settings')->where('id', 1)->lockForUpdate()->first();
                $changes = ['system_name' => $data['system_name'], 'updated_at' => now()] + $newPaths;
                DB::table('system_settings')->where('id', 1)->update($changes);
                AuditTrail::record(
                    $request,
                    'system_branding_updated',
                    $request->user(),
                    ['system_name' => $before?->system_name, 'logo_updated' => false, 'favicon_updated' => false, 'dashboard_image_updated' => false],
                    ['system_name' => $data['system_name'], 'logo_updated' => isset($newPaths['logo_path']), 'favicon_updated' => isset($newPaths['favicon_path']), 'dashboard_image_updated' => isset($newPaths['dashboard_image_path'])],
                    category: 'settings',
                );

                return array_filter([
                    'logo_path' => isset($newPaths['logo_path']) ? $before?->logo_path : null,
                    'favicon_path' => isset($newPaths['favicon_path']) ? $before?->favicon_path : null,
                    'dashboard_image_path' => isset($newPaths['dashboard_image_path']) ? $before?->dashboard_image_path : null,
                ]);
            });
        } catch (\Throwable $error) {
            foreach ($newPaths as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $error;
        }

        foreach ($oldPaths as $path) {
            if (is_string($path) && str_starts_with($path, 'system-branding/') && ! str_contains($path, '..')) {
                Storage::disk('local')->delete($path);
            }
        }

        return $request->expectsJson()
            ? response()->json(['message' => 'System branding saved.'])
            : back()->with('operation_message', 'System branding saved.');
    }

    public function office(Request $request): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate([
            'region_id' => ['required', 'integer', Rule::exists('region', 'region_id')->where('is_active', 1)],
            'name' => ['required', 'string', 'max:300'],
            'details' => ['nullable', 'string', 'max:300'],
        ]);
        $office = DB::transaction(function () use ($request, $data): object {
            DB::table('region')->where('region_id', $data['region_id'])->lockForUpdate()->first();
            $name = trim($data['name']);
            if ($name === '' || DB::table('organization')->where('region_id', $data['region_id'])->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
                throw ValidationException::withMessages(['name' => 'Enter a unique office name in the selected region.']);
            }
            $id = DB::table('organization')->insertGetId(['region_id' => $data['region_id'], 'name' => $name, 'details' => $data['details'] ?? null, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()], 'org_id');
            AuditTrail::record($request, 'office_created_'.$id, $request->user(), after: ['region_id' => $data['region_id'], 'org_id' => $id], category: 'settings');

            return DB::table('organization')->where('org_id', $id)->first(['org_id', 'region_id', 'name', 'details', 'is_active']);
        });

        return response()->json(['office' => $office, 'message' => 'Office created.'], 201);
    }

    public function updateOffice(Request $request, int $id): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate(['name' => ['required', 'string', 'max:300'], 'details' => ['nullable', 'string', 'max:300']]);
        $office = DB::transaction(function () use ($request, $id, $data): object {
            $office = DB::table('organization')->where('org_id', $id)->first();
            abort_unless($office, 404);
            DB::table('region')->where('region_id', $office->region_id)->lockForUpdate()->first();
            $office = DB::table('organization')->where('org_id', $id)->lockForUpdate()->first();
            abort_unless($office, 404);
            $name = trim($data['name']);
            if ($name === '' || DB::table('organization')->where('region_id', $office->region_id)->where('org_id', '!=', $id)->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
                throw ValidationException::withMessages(['name' => 'Enter a unique office name in this region.']);
            }
            DB::table('organization')->where('org_id', $id)->update(['name' => $name, 'details' => $data['details'] ?? null, 'updated_at' => now()]);
            AuditTrail::record($request, 'office_updated_'.$id, $request->user(), category: 'settings');

            return DB::table('organization')->where('org_id', $id)->first(['org_id', 'region_id', 'name', 'details', 'is_active']);
        });

        return response()->json(['office' => $office, 'message' => 'Office updated.']);
    }

    public function deleteOffice(Request $request, int $id): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        DB::transaction(function () use ($request, $id): void {
            $office = DB::table('organization')->where('org_id', $id)->lockForUpdate()->first();
            abort_unless($office, 404);
            foreach (['users', 'participants', 'associations', 'trainings', 'resource_persons', 'questionnaires', 'assessment_results'] as $module) {
                abort_if(DB::table($module)->where('org_id', $id)->exists(), 409, 'This office is used by accounts or saved records and cannot be deleted.');
            }
            foreach (DB::table('user_data_scopes')->whereNotNull('office_ids')->pluck('office_ids') as $scope) {
                abort_if(in_array($id, array_map('intval', json_decode($scope, true)), true), 409, 'Remove this office from data visibility settings before deleting it.');
            }
            DB::table('organization')->where('org_id', $id)->delete();
            AuditTrail::record($request, 'office_deleted_'.$id, $request->user(), category: 'settings');
        });

        return response()->json(['message' => 'Office deleted.']);
    }

    public function scopeOptions(Request $request): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);

        $scope = DB::table('user_data_scopes')->where('user_id', $request->user()->user_id)->first();
        $regions = DB::table('region')->where('is_active', 1)->orderBy('name')->get(['region_id', 'name']);
        $offices = DB::table('organization')->where('is_active', 1)->orderBy('name')->get(['org_id', 'region_id', 'name']);

        return response()->json([
            'regions' => $regions,
            'offices' => $offices,
            'selectedRegions' => $scope
                ? array_map('intval', json_decode($scope->region_ids ?? '[]', true) ?? [])
                : ($request->user()->region_id === null ? [] : [(int) $request->user()->region_id]),
            'selectedOffices' => $scope
                ? array_map('intval', json_decode($scope->office_ids ?? '[]', true) ?? [])
                : ($request->user()->org_id === null ? [] : [(int) $request->user()->org_id]),
        ]);
    }

    public function scope(Request $request): RedirectResponse|JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate([
            'region_ids' => ['nullable', 'array', 'max:100'], 'region_ids.*' => ['integer', 'distinct', Rule::exists('region', 'region_id')->where('is_active', 1)],
            'office_ids' => ['nullable', 'array', 'max:500'], 'office_ids.*' => ['integer', 'distinct', Rule::exists('organization', 'org_id')->where('is_active', 1)],
        ]);
        if (! empty($data['region_ids']) && ! empty($data['office_ids'])) {
            abort_if(DB::table('organization')->whereIn('org_id', $data['office_ids'])->whereNotIn('region_id', $data['region_ids'])->exists(), 422, 'Every selected office must belong to a selected region.');
        }
        DB::transaction(function () use ($request, $data): void {
            DB::table('user_data_scopes')->updateOrInsert(['user_id' => $request->user()->user_id], [
                'region_ids' => empty($data['region_ids']) ? null : json_encode(array_map('intval', $data['region_ids']), JSON_THROW_ON_ERROR),
                'office_ids' => empty($data['office_ids']) ? null : json_encode(array_map('intval', $data['office_ids']), JSON_THROW_ON_ERROR),
            ]);
            AuditTrail::record($request, 'data_scope_updated', $request->user(), category: 'settings');
        });

        return $request->expectsJson() ? response()->json(['message' => 'Data visibility saved.']) : back()->with('operation_message', 'Data visibility saved.');
    }

    public function storeNationality(Request $request): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $name = trim($data['name']);

        if ($name === '' || DB::table('participant_options')->where('field', 'nationality')->whereRaw('LOWER(value) = ?', [mb_strtolower($name)])->exists()) {
            throw ValidationException::withMessages(['name' => 'Enter a unique nationality.']);
        }

        $id = DB::table('participant_options')->insertGetId([
            'field' => 'nationality', 'value' => $name, 'label' => $name, 'is_active' => true,
        ]);
        AuditTrail::record($request, 'nationality_option_created_'.$id, $request->user(), after: ['option_label' => $name], category: 'settings');

        return response()->json(['option' => ['id' => $id, 'field' => 'nationality', 'value' => $name, 'label' => $name, 'is_active' => true, 'participant_count' => 0], 'message' => 'Nationality added.'], 201);
    }

    public function updateNationality(Request $request, int $option): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $name = trim($data['name']);

        $updated = DB::transaction(function () use ($request, $option, $name): array {
            $existing = DB::table('participant_options')->where('id', $option)->where('field', 'nationality')->lockForUpdate()->first();
            abort_unless($existing, 404);
            if ($name === '' || DB::table('participant_options')->where('field', 'nationality')->where('id', '!=', $option)->whereRaw('LOWER(value) = ?', [mb_strtolower($name)])->exists()) {
                throw ValidationException::withMessages(['name' => 'Enter a unique nationality.']);
            }

            $participants = DB::table('participants')->where('nationality', $existing->value)->lockForUpdate()->get(['id', 'ui_data', 'ui_version']);
            DB::table('participant_options')->where('id', $option)->update(['value' => $name, 'label' => $name]);
            foreach ($participants as $participant) {
                $metadata = OriginalInterfaceData::unpack($participant->ui_data);
                if (array_key_exists('nationality', $metadata)) {
                    $metadata['nationality'] = $name;
                }
                DB::table('participants')->where('id', $participant->id)->update([
                    'nationality' => $name,
                    'ui_data' => Crypt::encryptString(json_encode($metadata, JSON_THROW_ON_ERROR)),
                    'ui_version' => (int) $participant->ui_version + 1,
                    'updated_at' => now(),
                ]);
            }
            AuditTrail::record($request, 'nationality_option_updated_'.$option, $request->user(), before: ['option_label' => $existing->label], after: ['option_label' => $name], category: 'settings');

            return ['id' => $option, 'field' => 'nationality', 'value' => $name, 'label' => $name, 'is_active' => (bool) $existing->is_active, 'participant_count' => $participants->count()];
        });

        return response()->json(['option' => $updated, 'message' => 'Nationality updated.']);
    }

    public function deleteNationality(Request $request, int $option): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        DB::transaction(function () use ($request, $option): void {
            $existing = DB::table('participant_options')->where('id', $option)->where('field', 'nationality')->lockForUpdate()->first();
            abort_unless($existing, 404);
            abort_if(DB::table('participants')->where('nationality', $existing->value)->exists(), 409, 'This nationality is used by saved participants and cannot be deleted.');
            DB::table('participant_options')->where('id', $option)->delete();
            AuditTrail::record($request, 'nationality_option_deleted_'.$option, $request->user(), before: ['option_label' => $existing->label], category: 'settings');
        });

        return response()->json(['message' => 'Nationality deleted.']);
    }

    public function trainingTypes(Request $request): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);

        return response()->json(['options' => $this->trainingTypeOptions()]);
    }

    public function storeTrainingType(Request $request): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $name = trim($data['name']);

        $option = DB::transaction(function () use ($request, $name): array {
            DB::table('system_settings')->where('id', 1)->lockForUpdate()->first();
            if ($name === '' || DB::table('participant_options')->where('field', 'training_type')->whereRaw('LOWER(value) = ?', [mb_strtolower($name)])->exists()) {
                throw ValidationException::withMessages(['name' => 'Enter a unique training type.']);
            }

            $id = DB::table('participant_options')->insertGetId([
                'field' => 'training_type',
                'value' => $name,
                'label' => $name,
                'is_active' => true,
            ]);
            AuditTrail::record($request, 'training_type_created_'.$id, $request->user(), category: 'settings');

            return ['id' => $id, 'field' => 'training_type', 'value' => $name, 'label' => $name, 'is_active' => true, 'training_count' => 0];
        });

        return response()->json(['option' => $option, 'message' => 'Training type added.'], 201);
    }

    public function updateTrainingType(Request $request, int $option): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $name = trim($data['name']);

        $updated = DB::transaction(function () use ($request, $option, $name): array {
            DB::table('system_settings')->where('id', 1)->lockForUpdate()->first();
            $existing = DB::table('participant_options')
                ->where('id', $option)
                ->where('field', 'training_type')
                ->lockForUpdate()
                ->first();
            abort_unless($existing, 404);
            if ($name === '' || DB::table('participant_options')->where('field', 'training_type')->where('id', '!=', $option)->whereRaw('LOWER(value) = ?', [mb_strtolower($name)])->exists()) {
                throw ValidationException::withMessages(['name' => 'Enter a unique training type.']);
            }

            $trainings = DB::table('trainings')
                ->where('training_type', $existing->value)
                ->lockForUpdate()
                ->get(['id', 'ui_data']);
            DB::table('participant_options')->where('id', $option)->update(['value' => $name, 'label' => $name]);
            DB::table('trainings')->where('training_type', $existing->value)->update([
                'training_type' => $name,
                'updated_at' => now(),
                'version' => DB::raw('version + 1'),
                'ui_version' => DB::raw('ui_version + 1'),
            ]);
            foreach ($trainings as $training) {
                $metadata = OriginalInterfaceData::unpack($training->ui_data);
                foreach (['training_type', 'type'] as $field) {
                    if (array_key_exists($field, $metadata)) {
                        $metadata[$field] = $name;
                    }
                }
                DB::table('trainings')->where('id', $training->id)->update([
                    'ui_data' => Crypt::encryptString(json_encode($metadata, JSON_THROW_ON_ERROR)),
                ]);
            }
            AuditTrail::record($request, 'training_type_updated_'.$option, $request->user(), category: 'settings');

            return [
                'id' => $option,
                'field' => 'training_type',
                'value' => $name,
                'label' => $name,
                'is_active' => (bool) $existing->is_active,
                'training_count' => $trainings->count(),
            ];
        });

        return response()->json(['option' => $updated, 'message' => 'Training type updated.']);
    }

    public function deleteTrainingType(Request $request, int $option): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        DB::transaction(function () use ($request, $option): void {
            DB::table('system_settings')->where('id', 1)->lockForUpdate()->first();
            $existing = DB::table('participant_options')
                ->where('id', $option)
                ->where('field', 'training_type')
                ->lockForUpdate()
                ->first();
            abort_unless($existing, 404);
            abort_if(
                DB::table('trainings')->where('training_type', $existing->value)->exists(),
                409,
                'This training type is used by saved trainings and cannot be deleted.',
            );

            DB::table('participant_options')->where('id', $option)->delete();
            AuditTrail::record($request, 'training_type_deleted_'.$option, $request->user(), category: 'settings');
        });

        return response()->json(['message' => 'Training type deleted.']);
    }

    private function trainingTypeOptions(): Collection
    {
        return DB::table('participant_options')
            ->where('field', 'training_type')
            ->select('participant_options.*')
            ->addSelect([
                'training_count' => DB::table('trainings')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('trainings.training_type', 'participant_options.value'),
            ])
            ->orderBy('label')
            ->get();
    }

    public function role(Request $request, ?int $role = null): RedirectResponse|JsonResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('user_roles', 'name')->ignore($role, 'role_id')],
            'details' => ['nullable', 'string', 'max:300'],
            'permissions' => ['nullable', 'array', 'max:'.count(ModuleAccess::permissions())], 'permissions.*' => ['string', 'distinct', Rule::in(ModuleAccess::permissions())],
        ]);
        // Normalize older bundled write values before saving split create and edit assignments.
        $data['permissions'] = ModuleAccess::normalizePermissions($data['permissions'] ?? []);
        foreach (ModuleAccess::navigationPages() as $module => $pages) {
            $pagePermissions = array_map(fn (string $page): string => ModuleAccess::pagePermission($module, $page), array_keys($pages));
            abort_if(
                ! empty(array_intersect($data['permissions'] ?? [], $pagePermissions))
                    && ! in_array(ModuleAccess::pageAccessPermission($module), $data['permissions'] ?? [], true),
                422,
                'Enable page-specific access before granting individual page access.'
            );
        }
        abort_if(mb_strtolower(trim($data['name'])) === 'system administrator', 422, 'The System Administrator role is protected.');
        $isCreatingRole = $role === null;
        DB::transaction(function () use ($request, $data, $role, $isCreatingRole): void {
            $beforePermissions = [];
            $beforeRoleName = $data['name'];
            if ($role) {
                $existing = DB::table('user_roles')->where('role_id', $role)->lockForUpdate()->first();
                abort_unless($existing, 404);
                abort_if($existing->name === 'System Administrator', 422, 'The System Administrator role is protected.');
                $beforeRoleName = $existing->name;
                $beforePermissions = ModuleAccess::normalizePermissions(DB::table('role_permissions')->where('role_id', $role)->orderBy('permission')->pluck('permission')->all());
                DB::table('user_roles')->where('role_id', $role)->update(['name' => $data['name'], 'details' => $data['details'] ?? null, 'updated_at' => now()]);
            } else {
                $role = DB::table('user_roles')->insertGetId(['name' => $data['name'], 'details' => $data['details'] ?? null, 'is_active' => 1, 'created_at' => now()], 'role_id');
            }
            DB::table('role_permissions')->where('role_id', $role)->delete();
            foreach ($data['permissions'] ?? [] as $permission) {
                DB::table('role_permissions')->insert(['role_id' => $role, 'permission' => $permission]);
            }
            AuditTrail::record(
                $request,
                'role_permissions_updated_'.$role,
                $request->user(),
                ['role_name' => $beforeRoleName, 'permissions' => $beforePermissions],
                ['role_name' => $data['name'], 'permissions' => $data['permissions'] ?? []],
                category: 'settings',
            );
            app(AccountUpdateNotifier::class)->notifyPermissionChange(
                $request,
                (int) $role,
                null,
                (string) $data['name'],
                null,
                array_values(array_diff($data['permissions'] ?? [], $beforePermissions)),
                array_values(array_diff($beforePermissions, $data['permissions'] ?? [])),
                [],
                [],
                $isCreatingRole ? 'created' : 'updated',
            );
        });

        return $request->expectsJson() ? response()->json(['message' => 'Role permissions saved.']) : back()->with('operation_message', 'Role permissions saved.');
    }

    public function roleCredential(Request $request, ?int $credential = null): RedirectResponse|JsonResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);
        if (is_string($request->input('name'))) {
            $request->merge(['name' => trim($request->input('name'))]);
        }

        $data = $request->validate([
            'role_id' => ['required', 'integer', Rule::exists('user_roles', 'role_id')->where('is_active', 1)],
            'name' => ['required', 'string', 'max:120', Rule::unique('role_credentials', 'name')->where('role_id', $request->input('role_id'))->ignore($credential, 'role_credential_id')],
            'permissions' => ['nullable', 'array', 'max:'.count(ModuleAccess::permissions())],
            'permissions.*' => ['string', 'distinct', Rule::in(ModuleAccess::permissions())],
            'denied_permissions' => ['nullable', 'array', 'max:'.count(ModuleAccess::permissions())],
            'denied_permissions.*' => ['string', 'distinct', Rule::in(ModuleAccess::permissions())],
        ]);
        // Normalize older bundled write values before saving split create and edit assignments.
        $data['permissions'] = ModuleAccess::normalizePermissions($data['permissions'] ?? []);
        $data['denied_permissions'] = ModuleAccess::normalizePermissions($data['denied_permissions'] ?? []);

        abort_if(
            DB::table('user_roles')->where('role_id', $data['role_id'])->where('name', 'System Administrator')->exists(),
            422,
            'System Administrator accounts already have full access and cannot use credential types.',
        );

        $deniedPermissions = $data['denied_permissions'];
        $grantedPermissions = $data['permissions'];
        if (array_filter($deniedPermissions, fn (string $permission): bool => str_ends_with($permission, '.page_access')) !== []) {
            throw ValidationException::withMessages([
                'denied_permissions' => 'Block individual pages instead of changing the role page-access setting.',
            ]);
        }
        if (array_intersect($deniedPermissions, $grantedPermissions) !== []) {
            throw ValidationException::withMessages([
                'denied_permissions' => 'A permission cannot be both granted and blocked by the same credential.',
            ]);
        }
        $credentialId = DB::transaction(function () use ($request, $data, $credential, $deniedPermissions, $grantedPermissions): int {
            $role = DB::table('user_roles')->where('role_id', $data['role_id'])->lockForUpdate()->first();
            abort_unless($role && (int) $role->is_active === 1, 422, 'Select an active role.');
            abort_if($role->name === 'System Administrator', 422, 'System Administrator accounts already have full access and cannot use credential types.');
            if ($credential !== null) {
                $existing = DB::table('role_credentials')->where('role_credential_id', $credential)->lockForUpdate()->first();
                abort_unless($existing, 404);
                abort_if((int) $existing->role_id !== (int) $data['role_id'], 422, 'A credential type cannot be moved to another role.');
                $before = [
                    'role_name' => $role->name,
                    'access_profile_name' => $existing->name,
                    'permissions' => ModuleAccess::normalizePermissions(DB::table('role_credential_permissions')->where('role_credential_id', $credential)->orderBy('permission')->pluck('permission')->all()),
                    'denied_permissions' => ModuleAccess::normalizePermissions(DB::table('role_credential_denied_permissions')->where('role_credential_id', $credential)->orderBy('permission')->pluck('permission')->all()),
                ];
                DB::table('role_credentials')->where('role_credential_id', $credential)->update(['name' => $data['name'], 'updated_at' => now()]);
                $credentialId = $credential;
            } else {
                $before = [];
                $credentialId = DB::table('role_credentials')->insertGetId([
                    'role_id' => $data['role_id'],
                    'name' => $data['name'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ], 'role_credential_id');
            }

            DB::table('role_credential_permissions')->where('role_credential_id', $credentialId)->delete();
            foreach ($grantedPermissions as $permission) {
                DB::table('role_credential_permissions')->insert([
                    'role_credential_id' => $credentialId,
                    'permission' => $permission,
                ]);
            }
            DB::table('role_credential_denied_permissions')->where('role_credential_id', $credentialId)->delete();
            foreach ($deniedPermissions as $permission) {
                DB::table('role_credential_denied_permissions')->insert([
                    'role_credential_id' => $credentialId,
                    'permission' => $permission,
                ]);
            }

            AuditTrail::record(
                $request,
                $credential === null ? 'role_credential_created_'.$credentialId : 'role_credential_updated_'.$credentialId,
                $request->user(),
                $before,
                ['role_name' => $role->name, 'access_profile_name' => $data['name'], 'permissions' => $grantedPermissions, 'denied_permissions' => $deniedPermissions],
                category: 'settings',
            );
            app(AccountUpdateNotifier::class)->notifyPermissionChange(
                $request,
                (int) $role->role_id,
                (int) $credentialId,
                (string) $role->name,
                (string) $data['name'],
                array_values(array_diff($grantedPermissions, $before['permissions'] ?? [])),
                array_values(array_diff($before['permissions'] ?? [], $grantedPermissions)),
                array_values(array_diff($deniedPermissions, $before['denied_permissions'] ?? [])),
                array_values(array_diff($before['denied_permissions'] ?? [], $deniedPermissions)),
                $credential === null ? 'created' : 'updated',
            );

            return (int) $credentialId;
        });

        $message = $credential === null ? 'Credential type created.' : 'Credential type updated.';

        return $request->expectsJson()
            ? response()->json(['credentialId' => $credentialId, 'message' => $message])
            : redirect()->to(route('system.settings').'#credentials')->with('operation_message', $message);
    }

    /** Permanently remove an access profile, clear assignments, and delete all saved permission changes. */
    public function destroyRoleCredential(Request $request, int $credential): RedirectResponse|JsonResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);

        DB::transaction(function () use ($request, $credential): void {
            $existing = DB::table('role_credentials')->where('role_credential_id', $credential)->lockForUpdate()->first();
            abort_unless($existing, 404);
            $assignedAccounts = DB::table('users')->where('role_credential_id', $credential)->count();
            $permissions = ModuleAccess::normalizePermissions(DB::table('role_credential_permissions')->where('role_credential_id', $credential)->orderBy('permission')->pluck('permission')->all());
            $deniedPermissions = ModuleAccess::normalizePermissions(DB::table('role_credential_denied_permissions')->where('role_credential_id', $credential)->orderBy('permission')->pluck('permission')->all());

            app(AccountUpdateNotifier::class)->notifyPermissionChange(
                $request,
                (int) $existing->role_id,
                $credential,
                (string) (DB::table('user_roles')->where('role_id', $existing->role_id)->value('name') ?: 'Unknown role'),
                (string) $existing->name,
                [],
                [],
                [],
                [],
                'removed',
            );

            DB::table('users')->where('role_credential_id', $credential)->update(['role_credential_id' => null]);
            DB::table('role_credential_permissions')->where('role_credential_id', $credential)->delete();
            DB::table('role_credential_denied_permissions')->where('role_credential_id', $credential)->delete();
            DB::table('role_credentials')->where('role_credential_id', $credential)->delete();

            AuditTrail::record(
                $request,
                'role_credential_deleted_'.$credential,
                $request->user(),
                ['role_name' => DB::table('user_roles')->where('role_id', $existing->role_id)->value('name') ?: 'Unknown role', 'access_profile_name' => $existing->name, 'permissions' => $permissions, 'denied_permissions' => $deniedPermissions, 'assigned_accounts' => $assignedAccounts],
                ['assigned_accounts_unassigned' => $assignedAccounts],
                category: 'settings',
            );
        });

        return $request->expectsJson()
            ? response()->json(['message' => 'Access profile permanently deleted. Assigned accounts have returned to their role permissions.'])
            : back()->with('operation_message', 'Access profile permanently deleted. Assigned accounts have returned to their role permissions.');
    }
}
