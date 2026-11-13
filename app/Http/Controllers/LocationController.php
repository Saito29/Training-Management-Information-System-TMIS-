<?php

namespace App\Http\Controllers;

use App\Http\Authentication\AuditTrail;
use App\Support\LocationWorkbook;
use App\Support\ModuleAccess;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LocationController
{
    public function template(Request $request, LocationWorkbook $workbook): BinaryFileResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $path = $workbook->createTemplate();

        return response()->download($path, 'location-template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store, private',
        ])->deleteFileAfterSend(true);
    }

    public function import(Request $request, LocationWorkbook $workbook): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate([
            'file' => ['required', 'file', 'extensions:xlsx', 'max:20480'],
        ]);
        $paths = $workbook->read($data['file']);

        $counts = DB::transaction(function () use ($request, $paths): array {
            $counts = [
                'createdRegions' => 0,
                'createdLocations' => 0,
                'existingRegions' => 0,
                'existingLocations' => 0,
            ];
            DB::table('region')->orderBy('region_id')->lockForUpdate()->get(['region_id']);

            $regionIndex = [];
            foreach (DB::table('region')->get(['region_id', 'name']) as $region) {
                $regionIndex[mb_strtolower(trim($region->name))] = (int) $region->region_id;
            }
            $regionNames = [];
            foreach ($paths as $path) {
                $key = mb_strtolower($path['region']);
                $regionNames[$key] = $path['region'];
            }
            $newRegions = [];
            foreach ($regionNames as $key => $name) {
                if (! isset($regionIndex[$key])) {
                    $newRegions[] = [
                        'name' => $name,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
            foreach (array_chunk($newRegions, 500) as $regionBatch) {
                DB::table('region')->insert($regionBatch);
            }
            if ($newRegions !== []) {
                $regionIndex = [];
                foreach (DB::table('region')->get(['region_id', 'name']) as $region) {
                    $regionIndex[mb_strtolower(trim($region->name))] = (int) $region->region_id;
                }
            }
            $counts['createdRegions'] = count($newRegions);
            $counts['existingRegions'] = count($regionNames) - count($newRegions);

            $locationIndex = [];
            foreach (DB::table('geographic_locations')->get(['id', 'region_id', 'parent_id', 'kind', 'name']) as $location) {
                $key = $this->locationIndexKey($location->kind, (int) $location->region_id, $location->parent_id === null ? null : (int) $location->parent_id, $location->name);
                $locationIndex[$key] = (int) $location->id;
            }
            $pathParentIds = [];
            foreach ($paths as $index => $path) {
                $pathParentIds[$index] = null;
            }

            foreach ([
                'province' => 'province',
                'district' => 'district',
                'municipality' => 'municipality',
                'barangay' => 'barangay',
            ] as $kind => $field) {
                $newLocations = [];
                $existingKeys = [];
                $pathKeys = [];
                foreach ($paths as $pathIndex => $path) {
                    $name = $path[$field];
                    if ($name === '') {
                        continue;
                    }

                    $regionId = $regionIndex[mb_strtolower($path['region'])];
                    $parentId = $pathParentIds[$pathIndex];
                    $key = $this->locationIndexKey($kind, $regionId, $parentId, $name);
                    $pathKeys[$pathIndex] = $key;
                    if (isset($locationIndex[$key])) {
                        $existingKeys[$key] = true;
                    } else {
                        $newLocations[$key] = [
                            'name' => $name,
                            'kind' => $kind,
                            'region_id' => $regionId,
                            'parent_id' => $parentId,
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }

                foreach (array_chunk(array_values($newLocations), 500) as $locationBatch) {
                    DB::table('geographic_locations')->insert($locationBatch);
                }
                $counts['createdLocations'] += count($newLocations);
                $counts['existingLocations'] += count($existingKeys);

                if ($newLocations !== []) {
                    foreach (DB::table('geographic_locations')->where('kind', $kind)->get(['id', 'region_id', 'parent_id', 'name']) as $location) {
                        $key = $this->locationIndexKey($kind, (int) $location->region_id, $location->parent_id === null ? null : (int) $location->parent_id, $location->name);
                        $locationIndex[$key] = (int) $location->id;
                    }
                }

                foreach ($pathKeys as $pathIndex => $key) {
                    $pathParentIds[$pathIndex] = $locationIndex[$key];
                }
            }

            AuditTrail::record(
                $request,
                'location_excel_imported',
                $request->user(),
                after: $counts + ['rows_imported' => count($paths)],
                category: 'settings',
            );

            return $counts;
        });

        $message = 'Location import complete: '.$counts['createdRegions'].' region(s) and '
            .$counts['createdLocations'].' location(s) added. Existing paths were left unchanged.';

        return response()->json($counts + [
            'rowsImported' => count($paths),
            'message' => $message,
        ], 201);
    }

    private function locationIndexKey(string $kind, int $regionId, ?int $parentId, string $name): string
    {
        return implode("\x1f", [$kind, (string) $regionId, (string) ($parentId ?? 0), mb_strtolower(trim($name))]);
    }

    /** Create a location and return timestamps needed to refresh the hierarchy directory immediately. */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $data = $request->validate([
            'kind' => ['required', Rule::in(['region', 'province', 'district', 'municipality', 'barangay'])],
            'name' => ['required', 'string', 'max:'.($request->input('kind') === 'region' ? 64 : 150)],
            'region_id' => ['required_unless:kind,region', 'nullable', 'integer', Rule::exists('region', 'region_id')->where('is_active', 1)],
            'parent_id' => ['required_unless:kind,region,province', 'nullable', 'integer'],
        ]);
        $id = DB::transaction(function () use ($request, $data): int {
            $name = trim($data['name']);
            if ($name === '') {
                throw ValidationException::withMessages(['name' => 'Enter a location name.']);
            }
            if ($data['kind'] === 'region') {
                DB::table('region')->orderBy('region_id')->lockForUpdate()->get();
                $query = DB::table('region');
                $table = 'region';
                $values = ['name' => $name, 'is_active' => 1];
                $key = 'region_id';
            } else {
                DB::table('region')->where('region_id', $data['region_id'])->lockForUpdate()->first();
                $expectedParent = ['district' => 'province', 'municipality' => 'district', 'barangay' => 'municipality'][$data['kind']] ?? null;
                $parent = $expectedParent ? ($data['parent_id'] ?? null) : null;
                if ($expectedParent && ! DB::table('geographic_locations')->where('id', $parent)->where('kind', $expectedParent)->where('region_id', $data['region_id'])->where('is_active', true)->exists()) {
                    throw ValidationException::withMessages(['parent_id' => 'Select an active '.$expectedParent.' in this region.']);
                }
                $table = 'geographic_locations';
                $key = 'id';
                $values = ['name' => $name, 'kind' => $data['kind'], 'region_id' => $data['region_id'], 'parent_id' => $parent, 'is_active' => true];
                $query = DB::table($table)->where('kind', $data['kind'])->where('region_id', $data['region_id'])->where('parent_id', $parent);
            }
            if ($query->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
                throw ValidationException::withMessages(['name' => 'This location is already registered under this parent.']);
            }
            $id = DB::table($table)->insertGetId($values + ['created_at' => now(), 'updated_at' => now()], $key);
            AuditTrail::record($request, 'location_'.$data['kind'].'_created_'.$id, $request->user(), after: ['region_id' => $data['region_id'] ?? $id], category: 'settings');

            return $id;
        });

        $location = $data['kind'] === 'region'
            ? (array) DB::table('region')->where('region_id', $id)->first(['region_id', 'name', 'is_active', 'created_at', 'updated_at'])
            : (array) DB::table('geographic_locations')->where('id', $id)->first(['id', 'region_id', 'parent_id', 'kind', 'name', 'is_active', 'created_at', 'updated_at']);

        return $request->expectsJson() ? response()->json(['id' => $id, 'location' => $location + ['kind' => $data['kind']], 'message' => 'Location created.'], 201) : redirect()->to(route('system.settings').'#locations')->with('operation_message', 'Location created.');
    }

    /** Rename within the existing hierarchy and keep canonical address labels consistent. */
    public function update(Request $request, string $kind, int $id): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $input = $request->validate(['name' => ['required', 'string', 'max:'.($kind === 'region' ? 64 : 150)]]);
        $location = DB::transaction(function () use ($request, $kind, $id, $input): array {
            [$table, $key, $record] = $this->lockedLocation($kind, $id);
            $name = trim($input['name']);
            $query = DB::table($table)->where($key, '!=', $id);
            if ($kind !== 'region') {
                $query->where('kind', $kind)->where('region_id', $record->region_id)->where('parent_id', $record->parent_id);
            }
            if ($name === '' || $query->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
                throw ValidationException::withMessages(['name' => 'Enter a unique location name under this parent.']);
            }
            DB::table($table)->where($key, $id)->update(['name' => $name, 'updated_at' => now()]);
            if ($kind !== 'region') {
                foreach (['participants', 'associations', 'trainings'] as $module) {
                    $changes = [$kind => $name, 'updated_at' => now(), 'ui_version' => DB::raw('ui_version + 1')];
                    if ($module === 'trainings') {
                        $changes['version'] = DB::raw('version + 1');
                    }
                    $this->addressRecords($module, $record)->update($changes);
                }
            }
            AuditTrail::record($request, 'location_'.$kind.'_updated_'.$id, $request->user(), category: 'settings');

            return (array) DB::table($table)->where($key, $id)->first() + ['kind' => $kind];
        });

        return response()->json(['location' => $location, 'message' => 'Location updated.']);
    }

    public function destroy(Request $request, string $kind, int $id): JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        DB::transaction(function () use ($request, $kind, $id): void {
            [$table, $key, $record] = $this->lockedLocation($kind, $id);
            if ($kind === 'region') {
                foreach (['geographic_locations', 'organization', 'users', 'participants', 'associations', 'trainings', 'resource_persons', 'questionnaires', 'assessment_results'] as $module) {
                    abort_if(DB::table($module)->where('region_id', $id)->exists(), 409, 'This region is in use. Remove its dependent records before deleting it.');
                }
                foreach (DB::table('user_data_scopes')->whereNotNull('region_ids')->pluck('region_ids') as $scope) {
                    abort_if(in_array($id, array_map('intval', json_decode($scope, true)), true), 409, 'This region is selected in data visibility settings. Remove that selection first.');
                }
            } else {
                abort_if(DB::table('geographic_locations')->where('parent_id', $id)->exists(), 409, 'This location has child locations. Delete its children first.');
                foreach (['participants', 'associations', 'trainings'] as $module) {
                    abort_if($this->addressRecords($module, $record)->exists(), 409, 'This location is used by saved records and cannot be deleted.');
                }
                if ($kind === 'municipality') {
                    abort_if(DB::table('participants')->where('place_of_birth', $record->name)->exists(), 409, 'This municipality is used as a place of birth and cannot be deleted.');
                }
            }
            DB::table($table)->where($key, $id)->delete();
            AuditTrail::record($request, 'location_'.$kind.'_deleted_'.$id, $request->user(), category: 'settings');
        });

        return response()->json(['message' => 'Location deleted.']);
    }

    /** @return array{string, string, object} */
    private function lockedLocation(string $kind, int $id): array
    {
        abort_unless(in_array($kind, ['region', 'province', 'district', 'municipality', 'barangay'], true), 404);
        if ($kind === 'region') {
            $record = DB::table('region')->where('region_id', $id)->lockForUpdate()->first();
            abort_unless($record, 404);

            return ['region', 'region_id', $record];
        }
        $regionId = DB::table('geographic_locations')->where('id', $id)->where('kind', $kind)->value('region_id');
        abort_unless($regionId, 404);
        DB::table('region')->where('region_id', $regionId)->lockForUpdate()->first();
        $record = DB::table('geographic_locations')->where('id', $id)->where('kind', $kind)->lockForUpdate()->first();
        abort_unless($record, 404);

        return ['geographic_locations', 'id', $record];
    }

    private function addressRecords(string $module, object $location): Builder
    {
        $query = DB::table($module)->where('region_id', $location->region_id)->where($location->kind, $location->name);
        $parentId = $location->parent_id;
        while ($parentId) {
            $ancestor = DB::table('geographic_locations')->where('id', $parentId)->first();
            if (! $ancestor) {
                break;
            }
            $query->where($ancestor->kind, $ancestor->name);
            $parentId = $ancestor->parent_id;
        }

        return $query;
    }
}
