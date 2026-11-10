<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Shared database choices and canonical address resolution for participant registration. */
class RegistrationReferences
{
    public function choices(): array
    {
        return [
            'locations' => DB::table('geographic_locations')->where('is_active', true)->orderBy('name')->get(['id', 'region_id', 'parent_id', 'kind', 'name']),
            'options' => DB::table('participant_options')->where('is_active', true)->orderBy('id')->get(['field', 'value', 'label'])->groupBy('field'),
        ];
    }

    public function registration(Request $request): array
    {
        $rules = [
            'fname' => ['required', 'string', 'max:255'],
            'mname' => ['nullable', 'string', 'max:255'],
            'lname' => ['required', 'string', 'max:255'],
            'dob' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'yearCovered' => ['nullable', 'integer', 'min:2000', 'max:2200'],
            'region_id' => ['required', 'integer', Rule::exists('region', 'region_id')->where('is_active', 1)],
            'org_id' => ['required', 'integer', Rule::exists('organization', 'org_id')->where('region_id', $request->input('region_id'))->where('is_active', 1)],
            'pob' => ['required', 'integer', Rule::exists('geographic_locations', 'id')->where('kind', 'municipality')->where('is_active', true)],
            'postal_code' => ['required', 'string', 'max:20'],
            'mobile_no' => ['nullable', 'regex:/^9[0-9]{9}$/'],
            'email_account' => ['nullable', 'email', 'max:255'],
            'association_status' => ['required', Rule::in(['Yes', 'No'])],
            'associate_name' => ['required_if:association_status,Yes', 'nullable', 'string', 'max:100'],
            'associate_role' => ['required_if:association_status,Yes', 'nullable', 'string', 'max:255'],
            'house_building_number' => ['nullable', 'string', 'max:255'],
            'street_purok_sitio_name' => ['nullable', 'string', 'max:255'],
            'tel_number' => ['nullable', 'string', 'max:255'],
            'tbname' => ['required_if:idp,Yes', 'nullable', 'string', 'max:255'],
            'allergies_on' => ['required_if:dtrestriction,Allergies', 'nullable', 'string', 'max:500'],
        ];
        foreach (['sfname', 'gender', 'csv', 'nationality', '4ps', 'tupad', 'solo_parent', 'pwd', 'idp', 'dtrestriction', 'sncitizen'] as $field) {
            $rules[$field] = [in_array($field, ['gender', 'csv', 'nationality'], true) ? 'required' : 'nullable', 'string', Rule::exists('participant_options', 'value')->where('field', $field)->where('is_active', true)];
        }
        foreach (['province', 'district', 'municipality', 'barangay'] as $kind) {
            $rules[$kind.'_id'] = ['required', 'integer'];
        }
        $data = $request->validate($rules);
        $data['yearCovered'] = isset($data['yearCovered']) ? (int) $data['yearCovered'] : (int) now()->format('Y');
        $user = $request->user();
        $scope = ModuleAccess::registrationScope($user);
        $regionIsAllowed = $scope['regionIds'] === null || in_array((int) $data['region_id'], $scope['regionIds'], true);
        $officeIsAllowed = $scope['officeIds'] === null || in_array((int) $data['org_id'], $scope['officeIds'], true);
        abort_unless($regionIsAllowed && $officeIsAllowed, 403, 'The selected region or office is outside your data visibility settings.');
        $parent = null;
        foreach (['province', 'district', 'municipality', 'barangay'] as $kind) {
            $location = DB::table('geographic_locations')->where('id', $data[$kind.'_id'])->where('kind', $kind)->where('region_id', $data['region_id'])->where('parent_id', $parent)->where('is_active', true)->first();
            if (! $location) {
                throw ValidationException::withMessages([$kind.'_id' => 'Select a registered '.$kind.' belonging to the selected parent location.']);
            }
            $data[$kind] = $location->name;
            $parent = $location->id;
        }
        $data['pob'] = DB::table('geographic_locations')->where('id', $data['pob'])->value('name');
        if ($data['association_status'] === 'No') {
            unset($data['associate_name'], $data['associate_role']);
        }
        if (($data['idp'] ?? null) !== 'Yes') {
            unset($data['tbname']);
        }
        if (($data['dtrestriction'] ?? null) !== 'Allergies') {
            unset($data['allergies_on']);
        }

        return $data;
    }
}
