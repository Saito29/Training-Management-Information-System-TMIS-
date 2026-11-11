<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ModuleAccess
{
    public const MODULES = ['trainings', 'participants', 'associations', 'resource_persons', 'questionnaires', 'evaluations'];

    private const NAVIGATION_PAGES = [
        'trainings' => [
            'create.register' => ['label' => 'Create > Register', 'path' => 'app/admin/training/create/register'],
            'update.for-review' => ['label' => 'Update > For review', 'path' => 'app/admin/training/update/for-review'],
            'update.for-approval' => ['label' => 'Update > For approval', 'path' => 'app/admin/training/update/for-approval'],
            'update.for-acceptance' => ['label' => 'Update > For acceptance', 'path' => 'app/admin/training/update/for-acceptance'],
            'details.all-status' => ['label' => 'Details > All status', 'path' => 'app/admin/training/details/all-status'],
            'details.approved-accepted' => ['label' => 'Details > Approved & accepted', 'path' => 'app/admin/training/details/approved-accepted'],
            'details.incomplete' => ['label' => 'Details > Incomplete', 'path' => 'app/admin/training/details/incomplete'],
            'details.inactive' => ['label' => 'Details > Inactive', 'path' => 'app/admin/training/details/inactive'],
        ],
        'participants' => [
            'create.register' => ['label' => 'Individual > Create > Register', 'path' => 'app/admin/participants/create/register'],
            'details.all-with-status' => ['label' => 'Individual > Details > List of Farmers', 'path' => 'app/admin/participants/details/all-with-status'],
            'details.inactive' => ['label' => 'Individual > Details > Inactive', 'path' => 'app/admin/participants/details/inactive'],
        ],
        'associations' => [
            'create.fa-register' => ['label' => 'Farmer association > Create > Register', 'path' => 'app/admin/participants/create/fa-register'],
            'details.fa-all-list' => ['label' => 'Farmer association > Details > List of FA', 'path' => 'app/admin/participants/details/fa-all-list'],
            'details.fa-inactive' => ['label' => 'Farmer association > Details > Inactive', 'path' => 'app/admin/participants/details/fa-inactive'],
        ],
        'resource_persons' => [
            'create.rp-register' => ['label' => 'Create > Register', 'path' => 'app/admin/training/create/rp-register'],
            'details.rp-list' => ['label' => 'Details > List of RP', 'path' => 'app/admin/training/details/rp-list'],
            'details.rp-inactive' => ['label' => 'Details > Inactive', 'path' => 'app/admin/training/details/rp-inactive'],
        ],
        'questionnaires' => [
            'create.pre-test-register' => ['label' => 'Create > Pre-test questionnaire', 'path' => 'app/admin/evaluation/create/pre-test-register'],
            'create.post-test-register' => ['label' => 'Create > Post-test questionnaire', 'path' => 'app/admin/evaluation/create/post-test-register'],
            'create.training-evaluation-register' => ['label' => 'Create > Training evaluation', 'path' => 'app/admin/evaluation/create/training-evaluation-register'],
            'create.rp-evaluation-register' => ['label' => 'Create > Resource person evaluation', 'path' => 'app/admin/evaluation/create/rp-evaluation-register'],
            'details.list-questionnaire' => ['label' => 'Details > List questionnaire', 'path' => 'app/admin/evaluation/details/list-questionnaire'],
            'details.draft-questionnaire' => ['label' => 'Details > Draft questionnaires', 'path' => 'app/admin/evaluation/details/draft-questionnaire'],
            'details.inactive' => ['label' => 'Details > Inactive', 'path' => 'app/admin/evaluation/details/inactive'],
        ],
        'evaluations' => [
            'encode.pre-test' => ['label' => 'Encode > Pre-test evaluation', 'path' => 'app/admin/evaluation/encode/pre-test'],
            'encode.post-test' => ['label' => 'Encode > Post-test evaluation', 'path' => 'app/admin/evaluation/encode/post-test'],
            'encode.training-evaluation' => ['label' => 'Encode > Training evaluation', 'path' => 'app/admin/evaluation/encode/training-evaluation'],
            'encode.rp-evaluation' => ['label' => 'Encode > Resource person evaluation', 'path' => 'app/admin/evaluation/encode/rp-evaluation'],
        ],
    ];

    public static function isAdministrator(?User $user): bool
    {
        return $user && DB::table('user_roles')->where('role_id', $user->role_id)->where('name', 'System Administrator')->where('is_active', 1)->exists();
    }

    public static function isSuperAdministrator(?User $user): bool
    {
        return self::isAdministrator($user)
            && DB::table('system_super_admins')->where('user_id', $user->user_id)->exists();
    }

    /** @return array{administrator: bool, permissions: list<string>, page_permissions: array<string, array{module: string, permission: string}>} */
    public static function navigationAccess(?User $user): array
    {
        $isAdministrator = self::isAdministrator($user);
        $permissions = [];
        if ($user) {
            $permissions = $isAdministrator
                ? self::permissions()
                : self::navigationPermissions(
                    self::permissionSets($user),
                    self::permissionBreakdown($user)['denied'],
                );
        }

        return [
            'administrator' => $isAdministrator,
            'permissions' => $permissions,
            'page_permissions' => self::navigationPageAccessMap(),
        ];
    }

    /** @return list<string> */
    public static function permissions(): array
    {
        $permissions = ['trainings.submit', 'trainings.approve', 'trainings.accept'];
        foreach (self::MODULES as $module) {
            foreach (['read', 'create', 'edit', 'write', 'delete'] as $action) {
                $permissions[] = $module.'.'.$action;
            }
            $permissions[] = self::pageAccessPermission($module);
        }
        foreach (self::navigationPages() as $module => $pages) {
            foreach (array_keys($pages) as $page) {
                $permissions[] = self::pagePermission($module, $page);
            }
        }

        return $permissions;
    }

    /**
     * Expand legacy write grants into the distinct permissions used by new role and access profile editors.
     *
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function normalizePermissions(array $permissions): array
    {
        $normalized = [];
        foreach ($permissions as $permission) {
            if (str_ends_with($permission, '.write')) {
                $module = substr($permission, 0, -6);
                if (in_array($module, self::MODULES, true)) {
                    $normalized[] = $module.'.create';
                    $normalized[] = $module.'.edit';

                    continue;
                }
            }
            $normalized[] = $permission;
        }

        return array_values(array_unique($normalized));
    }

    /** Expand legacy write rows for permission summaries while retaining their associated record identifiers. */
    public static function normalizePermissionRows(Collection $rows): Collection
    {
        return $rows->flatMap(static function (object $row): Collection {
            return collect(self::normalizePermissions([$row->permission]))
                ->map(static fn (string $permission): object => (object) array_merge(get_object_vars($row), ['permission' => $permission]));
        })->values();
    }

    /** @return array<string, array<string, array{label: string, path: string}>> */
    public static function navigationPages(): array
    {
        return self::NAVIGATION_PAGES;
    }

    /** @return array<string, array{module: string, permission: string}> */
    private static function navigationPageAccessMap(): array
    {
        $pages = [];
        foreach (self::navigationPages() as $module => $modulePages) {
            foreach ($modulePages as $page => $details) {
                $pages['/'.$details['path']] = [
                    'module' => $module,
                    'permission' => self::pagePermission($module, $page),
                ];
            }
        }

        return $pages;
    }

    /** @return array{module: string, page: string}|null */
    public static function navigationPage(string $path): ?array
    {
        $normalizedPath = trim($path, '/');
        if (str_ends_with($normalizedPath, '.html')) {
            $normalizedPath = substr($normalizedPath, 0, -5);
        }

        foreach (self::navigationPages() as $module => $pages) {
            foreach ($pages as $page => $details) {
                if ($normalizedPath === $details['path']) {
                    return ['module' => $module, 'page' => $page];
                }
            }
        }

        return null;
    }

    public static function pageAccessPermission(string $module): string
    {
        return $module.'.page_access';
    }

    public static function pagePermission(string $module, string $page): string
    {
        return $module.'.view.'.$page;
    }

    public static function allows(User $user, string $permission): bool
    {
        if (self::isAdministrator($user)) {
            return true;
        }
        if (str_ends_with($permission, '.write')) {
            $module = substr($permission, 0, -6);

            return self::allows($user, $module.'.create') && self::allows($user, $module.'.edit');
        }
        if (! in_array($permission, self::permissions(), true)) {
            return false;
        }

        foreach (self::permissionSets($user) as $permissions) {
            if (in_array($permission, $permissions, true)) {
                return true;
            }
        }

        return false;
    }

    public static function allowsNavigationPage(User $user, string $module, string $page): bool
    {
        if (self::isAdministrator($user)) {
            return true;
        }

        $pages = self::navigationPages();
        if (! isset($pages[$module][$page])) {
            return false;
        }

        $pagePermission = self::pagePermission($module, $page);
        $permissionBreakdown = self::permissionBreakdown($user);
        if (in_array($pagePermission, $permissionBreakdown['denied'], true)) {
            return false;
        }

        foreach (self::permissionSets($user) as $permissions) {
            if (in_array(self::pageAccessPermission($module), $permissions, true)) {
                if (in_array($pagePermission, $permissions, true)) {
                    return true;
                }
            } elseif (in_array($module.'.read', $permissions, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{role: list<string>, credential: list<string>, denied: list<string>}
     */
    public static function permissionBreakdown(User $user): array
    {
        $roleIsActive = DB::table('user_roles')
            ->where('role_id', $user->role_id)
            ->where('is_active', 1)
            ->exists();
        if (! $roleIsActive) {
            return ['role' => [], 'credential' => [], 'denied' => []];
        }

        $validPermissions = self::permissions();
        $rolePermissions = self::normalizePermissions(DB::table('role_permissions')
            ->where('role_id', $user->role_id)
            ->whereIn('permission', $validPermissions)
            ->orderBy('permission')
            ->pluck('permission')
            ->all());
        $credentialPermissions = [];
        $deniedPermissions = [];
        if ($user->role_credential_id) {
            $credentialPermissions = self::normalizePermissions(DB::table('role_credential_permissions')
                ->join('role_credentials', 'role_credentials.role_credential_id', '=', 'role_credential_permissions.role_credential_id')
                ->where('role_credential_permissions.role_credential_id', $user->role_credential_id)
                ->where('role_credentials.role_id', $user->role_id)
                ->whereIn('role_credential_permissions.permission', $validPermissions)
                ->orderBy('role_credential_permissions.permission')
                ->pluck('role_credential_permissions.permission')
                ->all());
            $deniedPermissions = self::normalizePermissions(DB::table('role_credential_denied_permissions')
                ->join('role_credentials', 'role_credentials.role_credential_id', '=', 'role_credential_denied_permissions.role_credential_id')
                ->where('role_credential_denied_permissions.role_credential_id', $user->role_credential_id)
                ->where('role_credentials.role_id', $user->role_id)
                ->whereIn('role_credential_denied_permissions.permission', $validPermissions)
                ->orderBy('role_credential_denied_permissions.permission')
                ->pluck('role_credential_denied_permissions.permission')
                ->all());
        }

        return [
            'role' => array_values(array_diff($rolePermissions, $deniedPermissions)),
            'credential' => array_values(array_diff($credentialPermissions, $deniedPermissions)),
            'denied' => $deniedPermissions,
        ];
    }

    /**
     * @return list<list<string>>
     */
    private static function permissionSets(User $user): array
    {
        $permissions = self::permissionBreakdown($user);

        return [$permissions['role'], $permissions['credential']];
    }

    /**
     * @param  list<list<string>>  $permissionSets
     * @return list<string>
     */
    private static function navigationPermissions(array $permissionSets, array $deniedPermissions = []): array
    {
        $permissions = $permissionSets === []
            ? []
            : array_values(array_unique(array_merge(...$permissionSets)));
        foreach (self::navigationPages() as $module => $pages) {
            $hasPageAccess = false;
            $allowedPages = [];
            foreach ($permissionSets as $sourcePermissions) {
                if (in_array(self::pageAccessPermission($module), $sourcePermissions, true)) {
                    $hasPageAccess = true;
                    foreach (array_keys($pages) as $page) {
                        $permission = self::pagePermission($module, $page);
                        if (in_array($permission, $sourcePermissions, true)) {
                            $allowedPages[$permission] = true;
                        }
                    }
                } elseif (in_array($module.'.read', $sourcePermissions, true)) {
                    foreach (array_keys($pages) as $page) {
                        $allowedPages[self::pagePermission($module, $page)] = true;
                    }
                }
            }

            if ($hasPageAccess) {
                $permissions[] = self::pageAccessPermission($module);
                foreach (array_keys($pages) as $page) {
                    $permissions = array_values(array_filter(
                        $permissions,
                        fn (string $permission): bool => $permission !== self::pagePermission($module, $page),
                    ));
                    $pagePermission = self::pagePermission($module, $page);
                    if (isset($allowedPages[$pagePermission])) {
                        $permissions[] = $pagePermission;
                    }
                }
            }
        }

        $permissions = array_values(array_diff(array_unique($permissions), $deniedPermissions));
        sort($permissions);

        return $permissions;
    }

    public static function authorize(Request $request, string $permission): void
    {
        abort_unless($request->user() && self::allows($request->user(), $permission), 403);
    }

    public static function authorizeNavigationPage(Request $request, string $module, string $page): void
    {
        abort_unless($request->user() && self::allowsNavigationPage($request->user(), $module, $page), 403);
    }

    /**
     * @return array{regionIds: ?list<int>, officeIds: ?list<int>}
     */
    public static function registrationScope(User $user): array
    {
        if (! self::isAdministrator($user)) {
            return [
                'regionIds' => $user->region_id === null ? [] : [(int) $user->region_id],
                'officeIds' => $user->org_id === null ? [] : [(int) $user->org_id],
            ];
        }

        $scope = DB::table('user_data_scopes')->where('user_id', $user->user_id)->first();
        if (! $scope) {
            return [
                'regionIds' => $user->region_id === null ? null : [(int) $user->region_id],
                'officeIds' => $user->org_id === null ? null : [(int) $user->org_id],
            ];
        }

        return [
            'regionIds' => $scope->region_ids === null
                ? null
                : array_map('intval', json_decode($scope->region_ids, true, 512, JSON_THROW_ON_ERROR)),
            'officeIds' => $scope->office_ids === null
                ? null
                : array_map('intval', json_decode($scope->office_ids, true, 512, JSON_THROW_ON_ERROR)),
        ];
    }

    public static function authorizeRegistrationScope(User $user, int $regionId, int $officeId, string $message): void
    {
        $scope = self::registrationScope($user);
        $regionIsAllowed = $scope['regionIds'] === null || in_array($regionId, $scope['regionIds'], true);
        $officeIsAllowed = $scope['officeIds'] === null || in_array($officeId, $scope['officeIds'], true);

        abort_unless($regionIsAllowed && $officeIsAllowed, 403, $message);
    }

    /** Apply ownership before lookup so other offices cannot enumerate records. */
    public static function scope(Builder $query, User $user, bool $preferences = true): Builder
    {
        $isParticipants = $query->from === 'participants';
        if (! self::isAdministrator($user)) {
            if ($isParticipants) {
                return self::scopeParticipants($query, [$user->region_id], [$user->org_id]);
            }

            return $query->where('region_id', $user->region_id)->where('org_id', $user->org_id);
        }
        $scope = $preferences ? DB::table('user_data_scopes')->where('user_id', $user->user_id)->first() : null;
        if ($preferences && ! $scope) {
            if ($isParticipants) {
                return self::scopeParticipants(
                    $query,
                    $user->region_id === null ? null : [(int) $user->region_id],
                    $user->org_id === null ? null : [(int) $user->org_id],
                );
            }

            if ($user->region_id !== null) {
                $query->where('region_id', $user->region_id);
            }

            if ($user->org_id !== null) {
                $query->where('org_id', $user->org_id);
            }

            return $query;
        }

        if ($isParticipants) {
            return self::scopeParticipants(
                $query,
                $scope && $scope->region_ids !== null ? json_decode($scope->region_ids, true, 512, JSON_THROW_ON_ERROR) : null,
                $scope && $scope->office_ids !== null ? json_decode($scope->office_ids, true, 512, JSON_THROW_ON_ERROR) : null,
            );
        }

        foreach (['region_ids' => 'region_id', 'office_ids' => 'org_id'] as $field => $column) {
            if ($scope && $scope->{$field} !== null) {
                $query->whereIn($column, json_decode($scope->{$field}, true, 512, JSON_THROW_ON_ERROR));
            }
        }

        return $query;
    }

    /** Restrict participant queries to offices the participant is registered as a beneficiary of. */
    private static function scopeParticipants(Builder $query, ?array $regionIds, ?array $officeIds): Builder
    {
        if ($regionIds === null && $officeIds === null) {
            return $query;
        }

        return $query->whereExists(function (Builder $beneficiaryQuery) use ($regionIds, $officeIds): void {
            $beneficiaryQuery->selectRaw('1')
                ->from('participant_beneficiaries as beneficiary')
                ->whereColumn('beneficiary.participant_id', 'participants.id')
                ->when($regionIds !== null, fn (Builder $builder): Builder => $builder->whereIn('beneficiary.region_id', $regionIds))
                ->when($officeIds !== null, fn (Builder $builder): Builder => $builder->whereIn('beneficiary.org_id', $officeIds));
        });
    }
}
