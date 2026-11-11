<?php

namespace App\Http\Controllers;

use App\Http\Authentication\AuditTrail;
use App\Models\User;
use App\Support\AccountUpdateNotifier;
use App\Support\ModuleAccess;
use App\Support\OriginalInterfaceData;
use App\Support\RegistrationReferences;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\InputBag;

/** Adapts the existing screen contracts to authorized, transactional database mutations. */
class OriginalInterfaceController
{
    private function payload(Request $request, array $data): Request
    {
        $copy = $request->duplicate();
        $copy->setJson(new InputBag($data));
        $copy->request->replace($data);

        return $copy;
    }

    private function syncParticipantAssociationMembership(int $participantId, ?int $previousAssociationId, ?int $associationId, ?string $role): void
    {
        $memberships = DB::table('participant_association_memberships')->where('participant_id', $participantId);
        if ($associationId !== null) {
            DB::table('participant_association_memberships')
                ->where('participant_id', $participantId)
                ->update(['is_primary' => false, 'updated_at' => now()]);

            $membership = DB::table('participant_association_memberships')
                ->where('participant_id', $participantId)
                ->where('association_id', $associationId)
                ->exists();
            if ($membership) {
                DB::table('participant_association_memberships')
                    ->where('participant_id', $participantId)
                    ->where('association_id', $associationId)
                    ->update(['role' => $role, 'is_primary' => true, 'updated_at' => now()]);
            } else {
                DB::table('participant_association_memberships')->insert([
                    'participant_id' => $participantId,
                    'association_id' => $associationId,
                    'role' => $role,
                    'is_primary' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('participants')->where('id', $participantId)->update([
                'association_id' => $associationId,
                'association_role' => $role,
            ]);

            return;
        }

        if ($previousAssociationId !== null) {
            DB::table('participant_association_memberships')
                ->where('participant_id', $participantId)
                ->where('association_id', $previousAssociationId)
                ->update(['is_primary' => false, 'updated_at' => now()]);
        }
        $nextMembership = (clone $memberships)
            ->when($previousAssociationId !== null, fn ($query) => $query->where('association_id', '!=', $previousAssociationId))
            ->orderBy('association_id')
            ->first();

        if ($nextMembership) {
            DB::table('participant_association_memberships')
                ->where('participant_id', $participantId)
                ->update(['is_primary' => false, 'updated_at' => now()]);
            DB::table('participant_association_memberships')
                ->where('participant_id', $participantId)
                ->where('association_id', $nextMembership->association_id)
                ->update(['is_primary' => true, 'updated_at' => now()]);
            DB::table('participants')->where('id', $participantId)->update([
                'association_id' => $nextMembership->association_id,
                'association_role' => $nextMembership->role,
            ]);

            return;
        }

        if ($previousAssociationId !== null) {
            DB::table('participant_association_memberships')
                ->where('participant_id', $participantId)
                ->where('association_id', $previousAssociationId)
                ->delete();
        }
        DB::table('participants')->where('id', $participantId)->update([
            'association_id' => null,
            'association_role' => null,
        ]);
    }

    public function registerParticipant(Request $request, RegistrationReferences $references, OriginalInterfaceData $data, OperationsController $operations): JsonResponse
    {
        ModuleAccess::authorize($request, 'participants.create');
        $record = $references->registration($request);
        $associationNames = $record['associate_names'] ?? [];
        $associations = collect($associationNames)->map(function (string $associationName) use ($request, $record): object {
            $association = OriginalInterfaceData::find($request->user(), 'associations', $associationName);
            abort_unless(
                $association
                    && $association->is_active
                    && (int) $association->region_id === (int) $record['region_id']
                    && (int) $association->org_id === (int) $record['org_id'],
                422,
                'Select active associations in the farmer\'s registering region and office.',
            );

            return $association;
        });
        unset($record['associate_names']);
        $matches = $this->matchingParticipants($record);
        if ($matches !== []) {
            return response()->json(['message' => 'A farmer with the same name is already registered for this region and office.', 'matches' => $matches], 409);
        }
        $record['id'] = 'FMR-'.Str::uuid();
        $input = $this->payload($request, ['key' => 'tmis-farmers', 'upserts' => [$record], 'deletes' => []]);
        $response = DB::transaction(function () use ($request, $input, $data, $operations, $associations, $record): JsonResponse {
            $syncResponse = $this->sync($input, $data, $operations);
            $responseData = $syncResponse->getData(true);
            $participant = OriginalInterfaceData::find($request->user(), 'participants', $record['id']);
            abort_unless($participant, 500, 'The newly registered farmer could not be loaded.');

            foreach ($associations->skip(1) as $association) {
                DB::table('participant_association_memberships')->insert([
                    'participant_id' => $participant->id,
                    'association_id' => $association->id,
                    'role' => $record['associate_role'] ?? null,
                    'is_primary' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                AuditTrail::record(
                    $request,
                    'participant_association_membership_added_'.$participant->id.'_'.$association->id,
                    $request->user(),
                    after: ['association_id' => $association->id, 'role' => $record['associate_role'] ?? null],
                    category: 'participants',
                );
            }

            if ($associations->count() > 1) {
                $responseData = $data->bootstrap($request->user()) + [
                    'message' => $responseData['message'] ?? 'Changes saved to the database.',
                    'idMappings' => $responseData['idMappings'] ?? [],
                ];
            }

            return response()->json($responseData + ['participant_id' => $record['id']], 201);
        });

        return $response;
    }

    public function participantMatches(Request $request, RegistrationReferences $references): JsonResponse
    {
        ModuleAccess::authorize($request, 'participants.create');
        $participant = $references->registration($request);

        return response()->json(['matches' => $this->matchingParticipants($participant)]);
    }

    public function addParticipantBeneficiary(Request $request, string $participant): JsonResponse
    {
        ModuleAccess::authorize($request, 'participants.create');
        $data = $request->validate([
            'fname' => ['required', 'string', 'max:255'],
            'lname' => ['required', 'string', 'max:255'],
            'dob' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'gender' => ['required', 'string', 'max:255'],
            'region_id' => ['required', 'integer', Rule::exists('region', 'region_id')->where('is_active', 1)],
            'org_id' => ['required', 'integer', Rule::exists('organization', 'org_id')->where('region_id', $request->input('region_id'))->where('is_active', 1)],
        ]);
        $this->authorizeBeneficiaryOffice($request, (int) $data['region_id'], (int) $data['org_id']);

        $participantRecord = DB::transaction(function () use ($request, $participant, $data): object {
            $query = DB::table('participants')->whereNull('deleted_at')->where('ui_id', $participant);
            if (ctype_digit($participant)) {
                $query->orWhere(fn ($numeric) => $numeric->whereNull('deleted_at')->where('id', (int) $participant));
            }
            $record = $query->lockForUpdate()->first();
            abort_unless($record && $record->is_active, 404, 'The active participant could not be found.');
            abort_unless($this->matchesParticipantIdentity($record, $data), 422, 'The participant details do not match the selected record.');

            $existingLink = DB::table('participant_beneficiaries')
                ->where('participant_id', $record->id)
                ->where('org_id', $data['org_id'])
                ->exists();
            if (! $existingLink) {
                DB::table('participant_beneficiaries')->insert([
                    'participant_id' => $record->id,
                    'region_id' => $data['region_id'],
                    'org_id' => $data['org_id'],
                    'added_by' => $request->user()->user_id,
                    'is_primary' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                AuditTrail::record($request, 'participant_beneficiary_added_'.$record->id, $request->user(), after: ['region_id' => $data['region_id'], 'org_id' => $data['org_id']], category: 'participants');
            }

            return $record;
        });

        return response()->json([
            'participant_id' => $participantRecord->ui_id ?? (string) $participantRecord->id,
            'farmer_number' => OriginalInterfaceData::farmerNumber($participantRecord),
            'can_view' => ModuleAccess::allows($request->user(), 'participants.read'),
            'message' => 'The participant is now linked as a beneficiary of this office.',
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function matchingParticipants(array $participant): array
    {
        $matches = DB::table('participants')
            ->leftJoin('region', 'participants.region_id', '=', 'region.region_id')
            ->leftJoin('organization', 'participants.org_id', '=', 'organization.org_id')
            ->leftJoin('associations', 'participants.association_id', '=', 'associations.id')
            ->whereNull('participants.deleted_at')
            ->where(function ($query) use ($participant): void {
                $query->where(function ($primary) use ($participant): void {
                    $primary->where('participants.region_id', $participant['region_id'])
                        ->where('participants.org_id', $participant['org_id']);
                })->orWhereExists(function ($beneficiary) use ($participant): void {
                    $beneficiary->selectRaw('1')
                        ->from('participant_beneficiaries')
                        ->whereColumn('participant_beneficiaries.participant_id', 'participants.id')
                        ->where('participant_beneficiaries.region_id', $participant['region_id'])
                        ->where('participant_beneficiaries.org_id', $participant['org_id']);
                });
            })
            ->whereRaw('LOWER(TRIM(participants.first_name)) = ?', [mb_strtolower(trim((string) $participant['fname']))])
            ->whereRaw('LOWER(TRIM(COALESCE(participants.middle_name, \'\'))) = ?', [mb_strtolower(trim((string) ($participant['mname'] ?? '')))])
            ->whereRaw('LOWER(TRIM(participants.last_name)) = ?', [mb_strtolower(trim((string) $participant['lname']))])
            ->orderBy('participants.last_name')
            ->orderBy('participants.first_name')
            ->limit(10)
            ->get([
                'participants.id', 'participants.ui_id', 'participants.name', 'participants.first_name',
                'participants.middle_name', 'participants.last_name', 'participants.suffix', 'participants.is_active',
                'participants.region_id', 'participants.org_id', 'region.name as region_name',
                'organization.name as office_name', 'associations.name as association_name',
            ]);

        if ($matches->isEmpty()) {
            return [];
        }

        $assignments = DB::table('participant_beneficiaries as beneficiary')
            ->join('region', 'beneficiary.region_id', '=', 'region.region_id')
            ->join('organization', 'beneficiary.org_id', '=', 'organization.org_id')
            ->whereIn('beneficiary.participant_id', $matches->pluck('id'))
            ->orderBy('beneficiary.is_primary', 'desc')
            ->orderBy('region.name')
            ->orderBy('organization.name')
            ->get(['beneficiary.participant_id', 'beneficiary.region_id', 'beneficiary.org_id', 'beneficiary.is_primary', 'region.name as region_name', 'organization.name as office_name'])
            ->groupBy('participant_id');

        return $matches->map(function (object $record) use ($assignments, $participant): array {
            $beneficiaryOffices = collect($assignments[$record->id] ?? [])->map(fn (object $assignment): array => [
                'region_id' => $assignment->region_id,
                'org_id' => $assignment->org_id,
                'region' => $assignment->region_name,
                'office' => $assignment->office_name,
                'is_primary' => (bool) $assignment->is_primary,
            ])->values()->all();
            $isCurrentBeneficiary = collect($beneficiaryOffices)->contains(fn (array $assignment): bool => (int) $assignment['region_id'] === (int) $participant['region_id']
                && (int) $assignment['org_id'] === (int) $participant['org_id']
            );
            $fullName = trim(implode(' ', array_filter([$record->first_name, $record->middle_name, $record->last_name, $record->suffix])));

            return [
                'id' => $record->ui_id ?? (string) $record->id,
                'farmerNumber' => OriginalInterfaceData::farmerNumber($record),
                'name' => $fullName !== '' ? $fullName : $record->name,
                'isActive' => (bool) $record->is_active,
                'association' => $record->association_name,
                'region' => $record->region_name,
                'office' => $record->office_name,
                'beneficiaryOffices' => $beneficiaryOffices,
                'isCurrentBeneficiary' => $isCurrentBeneficiary,
                'canView' => $isCurrentBeneficiary && ModuleAccess::allows(request()->user(), 'participants.read'),
                'canEdit' => $isCurrentBeneficiary && ModuleAccess::allows(request()->user(), 'participants.edit'),
            ];
        })->all();
    }

    private function matchesParticipantIdentity(object $record, array $participant): bool
    {
        return mb_strtolower(trim((string) $record->first_name)) === mb_strtolower(trim((string) $participant['fname']))
            && mb_strtolower(trim((string) $record->last_name)) === mb_strtolower(trim((string) $participant['lname']))
            && (string) $record->date_of_birth === (string) $participant['dob']
            && mb_strtolower(trim((string) $record->sex)) === mb_strtolower(trim((string) $participant['gender']));
    }

    private function authorizeBeneficiaryOffice(Request $request, int $regionId, int $officeId): void
    {
        abort_unless(ModuleAccess::isAdministrator($request->user())
            || ((int) $request->user()->region_id === $regionId && (int) $request->user()->org_id === $officeId), 403);
    }

    private function isParticipantBeneficiaryOf(int $participantId, int $regionId, int $officeId): bool
    {
        return DB::table('participant_beneficiaries')
            ->where('participant_id', $participantId)
            ->where('region_id', $regionId)
            ->where('org_id', $officeId)
            ->exists();
    }

    public function data(Request $request, OriginalInterfaceData $data): JsonResponse
    {
        return response()->json($data->bootstrap($request->user()));
    }

    /** The original UI submits deltas, never an authoritative replacement of the office's entire dataset. */
    public function sync(Request $request, OriginalInterfaceData $data, OperationsController $operations): JsonResponse
    {
        $input = $request->validate(['key' => ['required', 'string', 'max:120'], 'upserts' => ['present', 'array', 'max:100'], 'upserts.*' => ['array'], 'deletes' => ['present', 'array', 'max:100'], 'deletes.*' => ['string', 'max:100']]);
        $idMappings = [];
        DB::transaction(function () use ($request, $input, $operations, &$idMappings): void {
            $module = OriginalInterfaceData::KEYS[$input['key']] ?? null;
            if ($module) {
                foreach ($input['deletes'] as $id) {
                    ModuleAccess::authorize($request, $module.'.delete');
                    $record = OriginalInterfaceData::find($request->user(), $module, $id);
                    abort_unless($record, 404);
                    if ($module === 'evaluations') {
                        DB::table('assessment_results')->where('id', $record->id)->update(['deleted_at' => now(), 'updated_at' => now()]);
                        AuditTrail::record($request, 'assessment_deleted_'.$record->id, $request->user(), category: 'evaluation');
                    } else {
                        $operations->destroy($request, $module, $record->id);
                    }
                }
                foreach ($input['upserts'] as $record) {
                    $idMapping = $this->upsert($request, $input['key'], $module, $record, $operations);
                    if ($idMapping) {
                        $idMappings[$idMapping['temporaryId']] = $idMapping['id'];
                    }
                }
            } elseif ($input['key'] === 'tmis-users') {
                $this->accounts($request, $input);
            } elseif ($input['key'] === 'tmis-notifications') {
                $this->notifications($request, $input['upserts']);
            } elseif ($input['key'] === 'tmis-notification-state:'.$request->user()->user_id) {
                foreach ($input['upserts'] as $state) {
                    $this->notificationState($request, $state);
                }
            } else {
                abort(422, 'Unsupported record collection.');
            }
        });

        return response()->json($data->bootstrap($request->user()) + ['message' => 'Changes saved to the database.', 'idMappings' => $idMappings]);
    }

    /** @return array{temporaryId: string, id: string}|null */
    private function upsert(Request $request, string $key, string $module, array $raw, OperationsController $operations): ?array
    {
        if ($module === 'evaluations') {
            $this->assessment($request, $key, $raw);

            return null;
        }
        $record = $this->validatedRecord($raw);
        if ($module === 'participants') {
            Validator::make($record, [
                'status' => ['sometimes', 'required', Rule::in(['Active', 'Inactive', 'Removed', 'Deceased'])],
                'yearCovered' => ['sometimes', 'nullable', 'integer', 'min:2000', 'max:2200'],
                'year_covered' => ['sometimes', 'nullable', 'integer', 'min:2000', 'max:2200'],
            ])->validate();
        }
        if ($module === 'trainings') {
            Validator::make($record, [
                'training_type' => ['sometimes', 'nullable', 'string', Rule::exists('participant_options', 'value')->where('field', 'training_type')->where('is_active', true)],
                'year_covered' => ['sometimes', 'nullable', 'integer', 'min:2000', 'max:2200'],
                'yearCovered' => ['sometimes', 'nullable', 'integer', 'min:2000', 'max:2200'],
            ])->validate();
        }
        $id = $record['id'];
        $existing = OriginalInterfaceData::find($request->user(), $module, $id);
        $trashed = ! $existing ? OriginalInterfaceData::find($request->user(), $module, $id, true) : null;
        if ($trashed) {
            abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
            DB::table($module)->where('id', $trashed->id)->update(['deleted_at' => null, 'is_active' => false]);
            $existing = OriginalInterfaceData::find($request->user(), $module, $id);
            AuditTrail::record($request, $module.'_restored_'.$existing->id, $request->user(), category: $module);
        }
        $permissionAction = $existing ? 'edit' : 'create';
        // Authorize the record's exact mutation intent before any metadata or relationship changes.
        ModuleAccess::authorize($request, $module.'.'.$permissionAction);
        if ($module === 'resource_persons' && ! $existing) {
            $phone = trim((string) ($record['phone'] ?? $record['mobile_no'] ?? ''));
            $email = trim((string) ($record['email'] ?? $record['email_account'] ?? ''));
            if ($phone === '' && $email === '') {
                throw ValidationException::withMessages([
                    'phone' => 'A phone number or email address is required.',
                ]);
            }
        }
        if (! $existing) {
            abort_if(DB::table($module)->where('ui_id', $id)->exists(), 404);
        } else {
            $locked = DB::table($module)->where('id', $existing->id)->lockForUpdate()->first();
            abort_unless(isset($record['_version']) && (int) $record['_version'] === (int) $locked->ui_version, 409, 'This record changed. Refresh before saving.');
            $existing = $locked;
        }
        $payload = $this->canonical($request, $key, $module, $record, $existing);
        $copy = $this->payload($request, $payload);
        $metadata = $record;
        if (isset($record['csv'])) {
            $metadata['civil_status'] = $record['csv'];
        }
        if ($existing && $module === 'trainings') {
            $previousMetadata = OriginalInterfaceData::unpack($existing->ui_data);
            foreach (['interventions', 'bullets', 'dashboardSlide'] as $field) {
                if (array_key_exists($field, $record) && $record[$field] !== ($previousMetadata[$field] ?? null)) {
                    ModuleAccess::authorize($request, 'trainings.edit');
                    abort_unless($existing->status === 'For review', 409, 'Return the training to review before editing its details.');
                    AuditTrail::record($request, 'training_details_updated_'.$existing->id, $request->user(), category: 'trainings');
                    break;
                }
            }
        }
        if ($module === 'questionnaires') {
            $metadata['totalItems'] = count($payload['questions']);
            $metadata['questionnaireState'] = $record['status'] ?? 'Active';
            if ($existing) {
                abort_if(DB::table('assessment_results')->where('questionnaire_id', $existing->id)->where('state', 'complete')->whereNull('deleted_at')->exists(), 409, 'This questionnaire has submitted results. Create a new version instead.');
            }
        }
        if (! $existing) {
            $result = $operations->store($copy, $module)->getData(true);
            $databaseId = $result['id'];
        } else {
            $databaseId = $existing->id;
            $changed = false;
            foreach ($payload as $field => $value) {
                if ($field !== 'version' && $field !== 'questions' && ($existing->{$field} ?? null) != $value) {
                    $changed = true;
                }
            }
            if ($module !== 'trainings' || $changed) {
                $operations->update($copy, $module, $databaseId);
            }
        }
        $temporaryId = null;
        if ($module === 'trainings' && ! $existing && preg_match('/^TRN-TEMP-[0-9a-f-]{36}$/i', $id) === 1) {
            $temporaryId = $id;
            DB::table('system_settings')->where('id', 1)->lockForUpdate()->first();
            $year = now()->format('y');
            $sequence = 0;
            foreach (DB::table('trainings')->where('ui_id', 'like', 'TRN-'.$year.'-%')->pluck('ui_id') as $publicId) {
                if (is_string($publicId) && preg_match('/^TRN-'.preg_quote($year, '/').'-([0-9]+)$/D', $publicId, $matches) === 1) {
                    $sequence = max($sequence, (int) $matches[1]);
                }
            }
            $sequence++;
            $id = 'TRN-'.$year.'-'.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT);
            while (DB::table('trainings')->where('ui_id', $id)->exists()) {
                $sequence++;
                $id = 'TRN-'.now()->format('y').'-'.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT);
            }
            $metadata['id'] = $id;
        } elseif ($module === 'associations' && ! $existing && preg_match('/^FA-TEMP-[0-9a-f-]{36}$/i', $id) === 1) {
            $temporaryId = $id;
            DB::table('system_settings')->where('id', 1)->lockForUpdate()->first();
            $year = now()->format('Y');
            $sequence = 0;
            foreach (DB::table('associations')->where('ui_id', 'like', 'FA-'.$year.'-%')->pluck('ui_id') as $publicId) {
                if (is_string($publicId) && preg_match('/^FA-'.preg_quote($year, '/').'-([0-9]+)$/D', $publicId, $matches) === 1) {
                    $sequence = max($sequence, (int) $matches[1]);
                }
            }
            $sequence++;
            $id = 'FA-'.$year.'-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
            while (DB::table('associations')->where('ui_id', $id)->exists()) {
                $sequence++;
                $id = 'FA-'.now()->format('Y').'-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
            }
            $metadata['id'] = $id;
        }
        DB::table($module)->where('id', $databaseId)->update(['ui_id' => $id, 'ui_data' => Crypt::encryptString(json_encode($metadata, JSON_THROW_ON_ERROR)), 'ui_version' => $existing ? $existing->ui_version + 1 : 1]);
        if ($module === 'participants') {
            DB::table('participant_beneficiaries')->insertOrIgnore([
                'participant_id' => $databaseId,
                'region_id' => $payload['region_id'],
                'org_id' => $payload['org_id'],
                'added_by' => $request->user()->user_id,
                'is_primary' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->syncParticipantAssociationMembership(
                $databaseId,
                isset($existing->association_id) ? (int) $existing->association_id : null,
                isset($payload['association_id']) ? (int) $payload['association_id'] : null,
                $payload['association_role'] ?? null,
            );
        }
        $oldMetadata = $existing ? OriginalInterfaceData::unpack($existing->ui_data) : [];
        $assignmentChanged = false;
        foreach (['pretest', 'posttest', 'trainers'] as $field) {
            if (isset($record[$field]) && $record[$field] !== ($oldMetadata[$field] ?? [])) {
                $assignmentChanged = true;
            }
        }
        if ($module === 'trainings' && $assignmentChanged) {
            ModuleAccess::authorize($request, 'trainings.'.$permissionAction);
            $training = DB::table('trainings')->where('id', $databaseId)->first();
            abort_unless($training->status === 'For review', 409, 'Return the training to review before changing assignments.');
            if (isset($record['pretest']) || isset($record['posttest'])) {
                $questionnaireIds = [];
                foreach (['pretest' => 'Pre-test', 'posttest' => 'Post-test'] as $type => $kind) {
                    foreach ($record[$type] ?? [] as $id) {
                        $questionnaire = OriginalInterfaceData::find($request->user(), 'questionnaires', (string) $id);
                        abort_unless($questionnaire && $questionnaire->kind === $kind && $questionnaire->org_id === $training->org_id && $questionnaire->region_id === $training->region_id, 422, 'Select questionnaires registered in the training office.');
                        $questionnaireIds[] = $questionnaire->id;
                    }
                }
                DB::table('training_questionnaire')->where('training_id', $databaseId)->delete();
                foreach (array_unique($questionnaireIds) as $questionnaireId) {
                    DB::table('training_questionnaire')->insert(['training_id' => $databaseId, 'questionnaire_id' => $questionnaireId]);
                }
            }
            if (isset($record['trainers'])) {
                $trainerIds = [];
                foreach ($record['trainers'] as $trainer) {
                    $reference = (string) ($trainer['id'] ?? $trainer['name'] ?? '');
                    if ($reference === '') {
                        continue;
                    }
                    $resource = OriginalInterfaceData::find($request->user(), 'resource_persons', $reference);
                    if (! $resource) {
                        $resource = OriginalInterfaceData::query($request->user(), 'resource_persons')->where('name', $reference)->first();
                    }
                    abort_unless($resource && $resource->is_active, 422, 'Select an active registered resource person.');
                    $trainerIds[] = $resource->id;
                }
                DB::table('training_resource_person')->where('training_id', $databaseId)->delete();
                foreach (array_unique($trainerIds) as $resourceId) {
                    DB::table('training_resource_person')->insert(['training_id' => $databaseId, 'resource_person_id' => $resourceId]);
                }
            }
        }
        if ($module === 'associations' && array_key_exists('members', $record)) {
            ModuleAccess::authorize($request, 'associations.'.$permissionAction);
            $owner = DB::table('associations')->where('id', $databaseId)->first();
            abort_unless($owner, 404);
            $members = [];
            foreach ($record['members'] as $member) {
                $farmer = OriginalInterfaceData::find($request->user(), 'participants', (string) ($member['farmer_id'] ?? $member['id'] ?? ''));
                $currentMembership = $farmer
                    ? DB::table('participant_association_memberships')->where('participant_id', $farmer->id)->where('association_id', $databaseId)->first()
                    : null;
                abort_unless(
                    $farmer && ($farmer->is_active || $currentMembership),
                    422,
                    'Only active farmers may be added to an association.',
                );
                abort_unless($farmer && $this->isParticipantBeneficiaryOf($farmer->id, (int) $owner->region_id, (int) $owner->org_id), 422, 'Every member must be registered as a beneficiary of the association office.');
                $role = trim((string) ($member['position'] ?? $member['associate_role'] ?? $member['role'] ?? 'Member'));
                $members[$farmer->id] = ['farmer' => $farmer, 'role' => $role !== '' ? $role : 'Member'];
            }
            $ids = array_keys($members);
            $scopedParticipants = OriginalInterfaceData::query($request->user(), 'participants')->select('id');
            $existingMemberIds = DB::table('participant_association_memberships')
                ->where('association_id', $databaseId)
                ->whereIn('participant_id', $scopedParticipants)
                ->pluck('participant_id');
            $removedIds = $existingMemberIds->diff($ids)->all();
            if ($removedIds !== []) {
                abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
                foreach ($removedIds as $removedId) {
                    DB::table('participant_association_memberships')
                        ->where('participant_id', $removedId)
                        ->where('association_id', $databaseId)
                        ->delete();
                    $participant = DB::table('participants')->where('id', $removedId)->first(['association_id']);
                    if ((int) ($participant->association_id ?? 0) === $databaseId) {
                        $this->syncParticipantAssociationMembership((int) $removedId, $databaseId, null, null);
                    }
                }
            }
            foreach ($members as $participantId => ['farmer' => $farmer, 'role' => $role]) {
                $currentMembership = DB::table('participant_association_memberships')
                    ->where('participant_id', $participantId)
                    ->where('association_id', $databaseId)
                    ->first();
                $hasOtherMembership = DB::table('participant_association_memberships')
                    ->where('participant_id', $participantId)
                    ->where('association_id', '!=', $databaseId)
                    ->exists();
                $isPrimary = (int) ($farmer->association_id ?? 0) === $databaseId
                    || (bool) ($currentMembership->is_primary ?? false)
                    || (! $farmer->association_id && ! $hasOtherMembership);

                if ($currentMembership) {
                    DB::table('participant_association_memberships')
                        ->where('participant_id', $participantId)
                        ->where('association_id', $databaseId)
                        ->update(['role' => $role, 'updated_at' => now()]);
                } else {
                    DB::table('participant_association_memberships')->insert([
                        'participant_id' => $participantId,
                        'association_id' => $databaseId,
                        'role' => $role,
                        'is_primary' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                if ($isPrimary) {
                    $this->syncParticipantAssociationMembership((int) $participantId, null, $databaseId, $role);
                }
            }
        }
        if ($module === 'trainings') {
            $metadata['trainers'] = DB::table('training_resource_person')->where('training_id', $databaseId)->join('resource_persons', 'training_resource_person.resource_person_id', '=', 'resource_persons.id')->get(['resource_persons.id', 'resource_persons.ui_id', 'resource_persons.name', 'resource_persons.title'])->map(fn ($resource): array => ['id' => $resource->ui_id ?? (string) $resource->id, 'name' => $resource->name, 'role' => $resource->title ?? 'Resource person'])->all();
            DB::table('trainings')->where('id', $databaseId)->update(['ui_data' => Crypt::encryptString(json_encode($metadata, JSON_THROW_ON_ERROR))]);
            $current = DB::table('trainings')->where('id', $databaseId)->first();
            $target = match ($record['status'] ?? 'For Review') {
                'For Review', 'For review' => 'For review',
                'For Approval', 'For approval' => 'For approval',
                'For Acceptance', 'For acceptance' => 'For acceptance',
                'Approved', 'Approved & Accepted' => 'Approved & Accepted',
                default => $current->status,
            };
            if ($target !== $current->status) {
                $transition = $this->payload($request, ['status' => $target, 'version' => $current->version, 'reason' => $record['remarks'] ?? $record['statusRemarks'] ?? null]);
                $operations->transition($transition, $databaseId);
            }
        }

        return $temporaryId ? ['temporaryId' => $temporaryId, 'id' => $id] : null;
    }

    public function enrollment(Request $request, OriginalInterfaceData $interface): JsonResponse
    {
        ModuleAccess::authorize($request, 'trainings.edit');
        $data = $request->validate(['id' => ['required', 'string', 'max:100'], 'participants' => ['present', 'array', 'max:1000'], 'participants.*' => ['string', 'distinct', 'max:100'], 'version' => ['required', 'integer']]);
        DB::transaction(function () use ($request, $data): void {
            $owner = OriginalInterfaceData::find($request->user(), 'trainings', $data['id']);
            abort_unless($owner, 404);
            $owner = DB::table('trainings')->where('id', $owner->id)->lockForUpdate()->first();
            abort_unless($owner->status === 'For review', 409, 'Return the training to review before editing enrollment.');
            abort_unless($owner->ui_version === $data['version'], 409, 'The training changed. Refresh before saving enrollment.');
            $ids = [];
            foreach ($data['participants'] as $id) {
                $participant = OriginalInterfaceData::find($request->user(), 'participants', $id);
                abort_unless($participant && $participant->is_active && $this->isParticipantBeneficiaryOf($participant->id, (int) $owner->region_id, (int) $owner->org_id), 422, 'Select active participants registered as beneficiaries of the training office.');
                $ids[] = $participant->id;
            }
            $removed = DB::table('training_participant')->where('training_id', $owner->id)->whereNotIn('participant_id', $ids);
            if ((clone $removed)->exists()) {
                abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
                $removed->delete();
            }
            foreach ($ids as $id) {
                DB::table('training_participant')->insertOrIgnore(['training_id' => $owner->id, 'participant_id' => $id]);
            }
            DB::table('trainings')->where('id', $owner->id)->increment('ui_version');
            DB::table('trainings')->where('id', $owner->id)->increment('version');
            AuditTrail::record($request, 'training_enrollment_updated_'.$owner->id, $request->user(), category: 'trainings');
        });

        return response()->json($interface->bootstrap($request->user()));
    }

    private function validatedRecord(array $raw): array
    {
        $scalar = ['id', 'name', 'title', 'description', 'status', 'statusRemarks', 'remarks', 'training_title', 'training_type', 'type', 'delivery_mode', 'target_participants', 'partner_organization', 'training_description', 'training_budget', 'budget', 'venue', 'venue_location', 'start_date', 'end_date', 'startDate', 'endDate', 'region', 'region_id', 'office', 'org_id', 'implementing_office', 'implementingOffice', 'province', 'province_id', 'district', 'district_id', 'municipality', 'municipality_id', 'barangay', 'barangay_id', 'yearCovered', 'year_covered', 'firstName', 'middleName', 'lastName', 'first_name', 'middle_name', 'last_name', 'fname', 'mname', 'lname', 'sfname', 'suffix', 'sex', 'gender', 'date_of_birth', 'dateOfBirth', 'birthDate', 'birthday', 'dob', 'email', 'email_account', 'phone', 'mobile_no', 'nationality', 'place_of_birth', 'pob', 'house_building_number', 'street_purok_sitio_name', 'postal_code', 'tel_number', 'associate_name', 'association_id', 'associate_role', 'role', 'tupad', 'soloParent', 'solo_parent', 'fourPs', 'four_ps', '4ps', 'pwd', 'indigenousGroup', 'idp', 'tribeName', 'tbname', 'dietaryRestriction', 'dtrestriction', 'allergies_on', 'seniorCitizen', 'sncitizen', 'association_name', 'short_name', 'organization_type', 'registration_date', 'qualification', 'expertise', 'organization_name', 'questionnaireName', 'trainingQuestionnaire', 'totalItems', 'questionnaireId', 'trainingId', 'trainingTitle', 'trainingLocation', 'trainingVenue', 'trainingOrganization', 'trainingStartDate', 'trainingEndDate', 'farmerId', 'resourcePersonId', 'date', 'commodity', 'score', 'comments', 'csv', 'civil_status', 'extension', 'senior_citizen', 'indigenous_group', 'tribe_name', 'dietary_restriction', 'street_purok_sitio', 'tel_number', 'dashboardSlide', '_version'];
        $allowed = array_merge($scalar, ['questions', 'ratingScale', 'members', 'ratings', 'pretest', 'posttest', 'trainers', 'interventions', 'bullets']);
        $input = Arr::only($raw, $allowed);
        $input += Arr::only($raw, ['customStatusId']);
        $rules = ['id' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9:_-]+$/']];
        foreach ($scalar as $field) {
            if ($field !== 'id') {
                if (isset($input[$field]) && ! is_scalar($input[$field])) {
                    throw ValidationException::withMessages([$field => 'This field must contain a single value.']);
                }
                if (isset($input[$field]) && ! is_string($input[$field])) {
                    $input[$field] = (string) $input[$field];
                }
                $rules[$field] = ['nullable', 'string', 'max:'.(in_array($field, ['description', 'training_description', 'comments', 'remarks', 'statusRemarks'], true) ? 10000 : 255)];
            }
        }
        $rules['customStatusId'] = ['nullable', 'integer'];
        foreach (['questions', 'ratingScale', 'members', 'ratings', 'pretest', 'posttest', 'trainers', 'interventions', 'bullets'] as $field) {
            $rules[$field] = ['sometimes', 'array', 'max:500'];
        }
        $rules += ['pretest.*' => ['string', 'max:100'], 'posttest.*' => ['string', 'max:100'], 'trainers.*' => ['array'], 'trainers.*.id' => ['sometimes', 'string', 'max:100'], 'trainers.*.name' => ['sometimes', 'string', 'max:255'], 'questions.*.text' => ['sometimes', 'string', 'max:1000'], 'questions.*.maxRating' => ['sometimes', 'integer', 'min:1', 'max:10'], 'ratingScale.*.score' => ['required', 'integer', 'min:1', 'max:10'], 'ratingScale.*.label' => ['nullable', 'string', 'max:100'], 'ratingScale.*.description' => ['nullable', 'string', 'max:1000'], 'members.*.farmer_id' => ['sometimes', 'string', 'max:100'], 'members.*.position' => ['sometimes', 'nullable', 'string', 'max:255'], 'members.*.associate_role' => ['sometimes', 'nullable', 'string', 'max:255'], 'members.*.role' => ['sometimes', 'nullable', 'string', 'max:255'], 'ratings.*.rating' => ['nullable', 'numeric', 'min:0', 'max:10'], 'interventions.*.qty' => ['nullable', 'numeric', 'min:0'], 'interventions.*.title' => ['nullable', 'string', 'max:255'], 'interventions.*.remarks' => ['nullable', 'string', 'max:1000'], 'bullets.*' => ['array', 'max:100'], 'bullets.*.*' => ['string', 'max:1000']];

        return Validator::make($input, $rules)->validate();
    }

    private function canonical(Request $request, string $key, string $module, array $item, ?object $existing): array
    {
        $pick = static function (array $names, mixed $fallback = null) use ($item): mixed {
            foreach ($names as $name) {
                if (array_key_exists($name, $item) && $item[$name] !== null && $item[$name] !== '') {
                    return $item[$name];
                }
            }

            return $fallback;
        };
        $region = $existing->region_id ?? $request->user()->region_id;
        $office = $existing->org_id ?? $request->user()->org_id;
        $postedRegion = $pick(['region_id', 'region']);
        if ($postedRegion !== null) {
            $aliases = ['region_4a' => 4, 'region_4b' => 5, 'region_1' => 1, 'region_5' => 6];
            $region = $aliases[$postedRegion] ?? (ctype_digit((string) $postedRegion) ? (int) $postedRegion : DB::table('region')->where('name', trim(preg_replace('/\s*\(.*\)$/', '', (string) $postedRegion)))->value('region_id'));
            if (! $region) {
                throw ValidationException::withMessages(['region' => 'Select a registered region.']);
            }
        }
        $postedOffice = $pick(['org_id', 'implementing_office', 'implementingOffice', 'office']);
        if ($postedOffice !== null && $module !== 'resource_persons') {
            $office = ctype_digit((string) $postedOffice) ? (int) $postedOffice : DB::table('organization')->where('name', $postedOffice)->where('region_id', $region)->value('org_id');
            if (! $office) {
                throw ValidationException::withMessages(['office' => 'Select a registered office belonging to the selected region.']);
            }
        }
        $name = $pick(match ($module) {
            'trainings' => ['training_title', 'title', 'name'], 'associations' => ['association_name', 'name'], 'questionnaires' => ['trainingQuestionnaire', 'questionnaireName', 'name'], default => ['name']
        });
        $first = $pick(['first_name', 'firstName', 'fname']);
        $middle = $pick(['middle_name', 'middleName', 'mname']);
        $last = $pick(['last_name', 'lastName', 'lname']);
        if (in_array($module, ['participants', 'resource_persons'], true) && ($first || $last)) {
            $name = trim(implode(' ', array_filter([$first, $middle, $last, $pick(['suffix', 'sfname', 'extension'])])));
        }
        $payload = ['name' => $name, 'region_id' => $region, 'org_id' => $office, 'description' => $pick(['training_description', 'description']), 'is_active' => ! in_array($item['status'] ?? '', ['Inactive', 'Removed', 'Deceased', 'Draft'], true)];
        if (in_array($module, ['participants', 'associations', 'trainings', 'resource_persons'], true)) {
            $statusWasSubmitted = array_key_exists('customStatusId', $item);
            $customStatusId = $statusWasSubmitted
                ? (blank($item['customStatusId']) ? null : (int) $item['customStatusId'])
                : ($existing->record_status_id ?? null);
            if ($customStatusId !== null) {
                $statusQuery = DB::table('record_statuses')->where('id', $customStatusId);
                if ((int) ($existing->record_status_id ?? 0) !== $customStatusId) {
                    $statusQuery->where('is_active', true);
                }
                abort_unless($statusQuery->exists(), 422, 'Select an available additional status.');
            }
            $payload['record_status_id'] = $customStatusId;
        }
        foreach (['province', 'district', 'municipality', 'barangay'] as $field) {
            if (isset($item[$field])) {
                $payload[$field] = $item[$field];
            }
        }
        if ($module === 'trainings') {
            $payload += ['start_date' => $pick(['start_date', 'startDate']), 'end_date' => $pick(['end_date', 'endDate']), 'venue' => $pick(['venue_location', 'venue']), 'budget' => $pick(['training_budget', 'budget'], 0), 'training_type' => $pick(['training_type', 'type']), 'delivery_mode' => $pick(['delivery_mode']), 'partner_organization' => $pick(['partner_organization']), 'year_covered' => $pick(['year_covered', 'yearCovered']), 'version' => $existing->version ?? 1];
            if (is_numeric($pick(['target_participants']))) {
                $payload['target_participants'] = $item['target_participants'];
            }
        }
        if (in_array($module, ['participants', 'resource_persons'], true)) {
            $payload += ['first_name' => $first, 'middle_name' => $middle, 'last_name' => $last, 'suffix' => $pick(['suffix', 'sfname', 'extension']), 'email' => $pick(['email', 'email_account']), 'phone' => $pick(['phone', 'mobile_no'])];
        }
        if ($module === 'resource_persons') {
            $payload += ['title' => $pick(['title']), 'qualification' => $pick(['qualification']), 'expertise' => $pick(['expertise']), 'organization_name' => $pick(['organization_name', 'office'])];
        }
        if ($module === 'participants') {
            $payload += ['date_of_birth' => $pick(['date_of_birth', 'dateOfBirth', 'birthDate', 'birthday', 'dob']), 'sex' => $pick(['gender', 'sex']), 'nationality' => $pick(['nationality']), 'place_of_birth' => $pick(['place_of_birth', 'pob']), 'postal_code' => $pick(['postal_code']), 'house_number' => $pick(['house_building_number']), 'street' => $pick(['street_purok_sitio_name', 'street_purok_sitio']), 'telephone' => $pick(['tel_number', 'tel_number']), 'association_role' => $pick(['associate_role', 'role']), 'association_id' => null];
            $associationWasSubmitted = array_key_exists('association_id', $item) || array_key_exists('associate_name', $item);
            $association = $associationWasSubmitted
                ? $pick(['association_id', 'associate_name'])
                : $existing?->association_id;
            if ($association) {
                $found = $associationWasSubmitted
                    ? OriginalInterfaceData::find($request->user(), 'associations', (string) $association)
                    : OriginalInterfaceData::query($request->user(), 'associations')->where('id', $association)->first();
                if (! $found) {
                    $found = OriginalInterfaceData::query($request->user(), 'associations')->where('name', $association)->first();
                }
                abort_unless($found, 422, 'Select a registered association.');
                if (! $existing) {
                    abort_unless(
                        $found->is_active
                            && (int) $found->region_id === (int) $region
                            && (int) $found->org_id === (int) $office,
                        422,
                        'Select an active association in the farmer\'s registering region and office.',
                    );
                }
                $payload['association_id'] = $found->id;
            }
            $payload['sensitive'] = ['tupad' => $pick(['tupad']), 'solo_parent' => $pick(['solo_parent', 'soloParent']), 'four_ps' => $pick(['fourPs', 'four_ps', '4ps']), 'disability' => $pick(['pwd']), 'indigenous_group' => $pick(['indigenousGroup', 'idp', 'indigenous_group']), 'tribe' => $pick(['tribeName', 'tbname', 'tribe_name']), 'dietary_restriction' => $pick(['dietaryRestriction', 'dtrestriction', 'dietary_restriction']), 'allergies' => $pick(['allergies_on']), 'senior_citizen' => $pick(['seniorCitizen', 'sncitizen', 'senior_citizen'])];
        }
        if ($module === 'associations') {
            $payload += Arr::only($item, ['short_name', 'organization_type', 'registration_date', 'year_covered']);
        }
        if ($module === 'questionnaires') {
            $slug = substr($key, 5, -15);
            $kind = OriginalInterfaceData::KINDS[$slug] ?? null;
            $questions = array_map(fn ($question): string => is_array($question) ? (string) ($question['text'] ?? '') : (string) $question, $item['questions'] ?? []);
            if (! $questions) {
                $count = (int) ($item['totalItems'] ?? 0);
                abort_unless($count > 0 && $count <= 100, 422, 'Provide between 1 and 100 questionnaire items.');
                $questions = array_map(fn (int $number): string => 'Item '.$number, range(1, $count));
            }
            $payload += ['kind' => $kind, 'questions' => $questions];
        }

        return $payload;
    }

    private function assessment(Request $request, string $key, array $raw): void
    {
        $item = $this->validatedRecord($raw);
        $existing = OriginalInterfaceData::find($request->user(), 'evaluations', $item['id']);
        ModuleAccess::authorize($request, 'evaluations.'.($existing ? 'edit' : 'create'));
        abort_if(! $existing && DB::table('assessment_results')->where('ui_id', $item['id'])->exists(), 404);
        if ($existing) {
            $existing = DB::table('assessment_results')->where('id', $existing->id)->lockForUpdate()->first();
            abort_unless((int) ($item['_version'] ?? 0) === $existing->ui_version, 409, 'This result changed. Refresh before saving.');
        }
        $questionnaire = OriginalInterfaceData::find($request->user(), 'questionnaires', (string) ($item['questionnaireId'] ?? ''));
        abort_unless($questionnaire && $questionnaire->is_active, 422, 'Select an active questionnaire from your office.');
        $slug = substr($key, 5, -8);
        abort_unless($questionnaire->kind === (OriginalInterfaceData::KINDS[$slug] ?? null), 422, 'The questionnaire type does not match this assessment.');
        $farmer = OriginalInterfaceData::find($request->user(), 'participants', (string) ($item['farmerId'] ?? ''));
        $state = ($item['status'] ?? '') === 'draft' ? 'draft' : 'complete';
        if ($state === 'complete') {
            abort_unless($farmer && $farmer->is_active && $this->isParticipantBeneficiaryOf($farmer->id, (int) $questionnaire->region_id, (int) $questionnaire->org_id), 422, 'Select an active participant from the questionnaire office.');
        }
        if ($farmer) {
            abort_unless($this->isParticipantBeneficiaryOf($farmer->id, (int) $questionnaire->region_id, (int) $questionnaire->org_id), 422, 'Participant and questionnaire offices must match.');
        }
        $date = Validator::make($item, ['date' => [$state === 'complete' ? 'required' : 'nullable', 'date_format:Y-m-d']])->validate();
        $definition = OriginalInterfaceData::unpack($questionnaire->ui_data);
        $score = $item['score'] ?? null;
        $ratings = $item['ratings'] ?? [];
        if (in_array($questionnaire->kind, ['Pre-test', 'Post-test'], true)) {
            Validator::make(['score' => $score], ['score' => [$state === 'complete' ? 'required' : 'nullable', 'integer', 'min:0', 'max:'.count(json_decode($questionnaire->questions, true))]])->validate();
        } else {
            $score = null;
        }
        if (! in_array($questionnaire->kind, ['Pre-test', 'Post-test'], true) && $state === 'complete') {
            $questions = json_decode($questionnaire->questions, true);
            abort_unless(count($ratings) === count($questions), 422, 'Rate every questionnaire item.');
            foreach ($ratings as $rating) {
                Validator::make($rating, ['rating' => ['required', 'integer', 'min:1', 'max:5']])->validate();
            }
        }
        $resource = null;
        if ($questionnaire->kind === 'Resource person evaluation' && ! empty($item['resourcePersonId'])) {
            $resource = OriginalInterfaceData::find($request->user(), 'resource_persons', $item['resourcePersonId']);
            abort_unless($resource && $resource->region_id === $questionnaire->region_id && $resource->org_id === $questionnaire->org_id, 422, 'Select a resource person in the same office.');
        }
        abort_if($state === 'complete' && $questionnaire->kind === 'Resource person evaluation' && ! $resource, 422, 'Select a resource person.');
        $training = null;
        if (empty($item['trainingId']) && $farmer && ! empty($date['date'])) {
            $candidates = OriginalInterfaceData::query($request->user(), 'trainings')->where('status', 'Approved & Accepted')->where('is_active', true)->where('org_id', $questionnaire->org_id)->where('region_id', $questionnaire->region_id)->whereDate('start_date', '<=', $date['date'])->whereDate('end_date', '>=', $date['date'])->whereIn('id', DB::table('training_participant')->where('participant_id', $farmer->id)->select('training_id'));
            if (in_array($questionnaire->kind, ['Pre-test', 'Post-test'], true)) {
                $candidates->whereIn('id', DB::table('training_questionnaire')->where('questionnaire_id', $questionnaire->id)->select('training_id'));
            }
            if ($resource) {
                $candidates->whereIn('id', DB::table('training_resource_person')->where('resource_person_id', $resource->id)->select('training_id'));
            }
            $matches = $candidates->limit(2)->get();
            abort_if($matches->count() > 1, 422, 'More than one training matches this response. Open the encoder with its specific training context.');
            if ($matches->count() === 1) {
                $item['trainingId'] = $matches[0]->ui_id ?? (string) $matches[0]->id;
            }
        }
        if (! empty($item['trainingId'])) {
            $training = OriginalInterfaceData::find($request->user(), 'trainings', $item['trainingId']);
            abort_unless($training && $training->org_id === $questionnaire->org_id && $training->region_id === $questionnaire->region_id, 422, 'Select a training in the questionnaire office.');
            $training = DB::table('trainings')->where('id', $training->id)->lockForUpdate()->first();
            abort_if($state === 'complete' && ($training->status !== 'Approved & Accepted' || ! $training->is_active), 422, 'Complete responses require an active approved and accepted training.');
            abort_unless($farmer && DB::table('training_participant')->where('training_id', $training->id)->where('participant_id', $farmer->id)->exists(), 422, 'The participant must be enrolled in this training.');
            if (in_array($questionnaire->kind, ['Pre-test', 'Post-test'], true)) {
                abort_unless(DB::table('training_questionnaire')->where('training_id', $training->id)->where('questionnaire_id', $questionnaire->id)->exists(), 422, 'The questionnaire must be assigned to this training.');
            }
            if ($resource) {
                abort_unless(DB::table('training_resource_person')->where('training_id', $training->id)->where('resource_person_id', $resource->id)->exists(), 422, 'The resource person must be assigned to this training.');
            }
        }
        if ($training && $state === 'complete') {
            $duplicate = DB::table('assessment_results')->where('training_id', $training->id)->where('questionnaire_id', $questionnaire->id)->where('participant_id', $farmer->id)->where('resource_person_id', $resource?->id)->where('state', 'complete')->whereNull('deleted_at');
            if ($existing) {
                $duplicate->where('id', '!=', $existing->id);
            }
            abort_if($duplicate->exists(), 409, 'This participant already has a complete response for this training and questionnaire. Edit the existing response.');
        }
        $values = ['training_id' => $training?->id, 'ui_id' => $item['id'], 'questionnaire_id' => $questionnaire->id, 'participant_id' => $farmer?->id, 'resource_person_id' => $resource?->id, 'region_id' => $questionnaire->region_id, 'org_id' => $questionnaire->org_id, 'encoded_by' => $request->user()->user_id, 'assessed_on' => $date['date'] ?? null, 'score' => $score, 'commodity' => $item['commodity'] ?? null, 'state' => $state, 'ratings' => json_encode($ratings, JSON_THROW_ON_ERROR), 'comments' => $item['comments'] ?? null, 'ui_data' => Crypt::encryptString(json_encode(array_replace($item, ['questionnaireName' => $questionnaire->name, 'implementingOffice' => DB::table('organization')->where('org_id', $questionnaire->org_id)->value('name'), 'farmerName' => $farmer?->name ?? '', 'farmerSex' => $farmer?->sex ?? '', 'farmerBirthday' => $farmer?->date_of_birth ?? '', 'farmerLocation' => $farmer ? implode(', ', array_filter([$farmer->municipality, $farmer->province])) : '', 'resourcePersonName' => $resource?->name ?? '', 'totalItems' => count(json_decode($questionnaire->questions, true)), 'savedAt' => $existing?->created_at ?? now()->toIso8601String()]), JSON_THROW_ON_ERROR)), 'ui_version' => $existing ? $existing->ui_version + 1 : 1, 'updated_at' => now()];
        if ($existing) {
            DB::table('assessment_results')->where('id', $existing->id)->update($values);
        } else {
            DB::table('assessment_results')->insert($values + ['created_at' => now()]);
        }
        AuditTrail::record($request, 'assessment_'.($existing ? 'updated' : 'created'), $request->user(), category: 'evaluation');
    }

    /** Persist synchronized account changes and send one consolidated notice with the updater's identity. */
    private function accounts(Request $request, array $input): void
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $settings = new SystemSettingsController;
        foreach ($input['deletes'] as $id) {
            $settings->manageAccount($this->payload($request, ['action' => 'delete']), (int) $id);
        }
        foreach ($input['upserts'] as $record) {
            $id = (int) ($record['id'] ?? 0);
            $user = User::where('user_id', $id)->firstOrFail();
            $region = DB::table('region')->where('name', $record['region'] ?? '')->value('region_id');
            $office = DB::table('organization')->where('name', $record['office'] ?? '')->where('region_id', $region)->value('org_id');
            $role = DB::table('user_roles')->where('name', $record['role'] ?? '')->where('is_active', 1)->value('role_id');
            $status = match ($record['status'] ?? '') {
                'Approved', 'Active', 'Inactive', 'Approved & Accepted' => 'Approved & Accepted', 'Rejected' => 'Rejected', default => 'Pending approval'
            };
            $accessChanges = ['role_id' => $role, 'region_id' => $region, 'org_id' => $office, 'status' => $status, 'active_status' => $status === 'Approved & Accepted' && ($record['status'] ?? '') !== 'Inactive' ? 1 : 0];
            $accessRequest = $this->payload($request, ['action' => 'update'] + $accessChanges);
            $accessRequest->attributes->set('defer_account_update_notification', true);
            $settings->manageAccount($accessRequest, $id);
            $changedFields = [];
            foreach ($accessChanges as $field => $value) {
                if ($user->getRawOriginal($field) != $value) {
                    $changedFields[] = $field;
                }
            }
            $personal = Validator::make($record, ['email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($id, 'user_id')], 'firstName' => ['required', 'string', 'max:255'], 'lastName' => ['required', 'string', 'max:255'], 'middleName' => ['nullable', 'string', 'max:255'], 'suffix' => ['nullable', 'string', 'max:50'], 'phone' => ['nullable', 'string', 'max:20'], 'position' => ['nullable', 'string', 'max:255'], 'dateOfBirth' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today']])->validate();
            $map = ['email' => 'email', 'firstName' => 'first_name', 'lastName' => 'last_name', 'middleName' => 'middle_name', 'suffix' => 'extension_name', 'phone' => 'mobile_number', 'position' => 'position', 'dateOfBirth' => 'date_of_birth'];
            $changes = [];
            foreach ($personal as $name => $value) {
                $changes[$map[$name]] = $value;
                if ($user->getRawOriginal($map[$name]) != $value) {
                    $changedFields[] = $map[$name];
                }
            }
            if ($changes['email'] !== $user->email) {
                $changes['email_verified'] = false;
            }
            DB::table('users')->where('user_id', $id)->update($changes);
            AuditTrail::record($request, 'account_profile_updated', $user, [], $changes + ['changed_fields' => $changedFields]);
            app(AccountUpdateNotifier::class)->notify($request, $user, $changedFields);
        }
    }

    private function notifications(Request $request, array $records): void
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        foreach ($records as $raw) {
            $record = Validator::make($raw, ['id' => ['required', 'string', 'max:100', Rule::unique('user_notifications', 'ui_id')], 'batchId' => ['required', 'string', 'max:100'], 'recipientId' => ['required', 'integer', Rule::exists('users', 'user_id')->whereNull('deleted_at')->where('active_status', 1)->where('status', 'Approved & Accepted')], 'title' => ['required', 'string', 'max:100'], 'summary' => ['nullable', 'string', 'max:240'], 'message' => ['required', 'string', 'max:10000'], 'type' => ['required', Rule::in(['account', 'training', 'participants', 'evaluation', 'system'])], 'priority' => ['required', Rule::in(['normal', 'high'])], 'reference' => ['nullable', 'string', 'max:80'], 'href' => ['nullable', Rule::in(['', 'users/profile', 'administration/update/for-approval', 'administration/details/all-status', 'training/details/all-status', 'participants/details/all-with-status', 'evaluation/details/list-questionnaire'])]])->validate();
            DB::table('user_notifications')->insert(['ui_id' => $record['id'], 'batch_id' => $record['batchId'], 'recipient_id' => $record['recipientId'], 'creator_id' => $request->user()->user_id, 'title' => $record['title'], 'summary' => $record['summary'] ?? null, 'message' => $record['message'], 'type' => $record['type'], 'priority' => $record['priority'], 'reference' => $record['reference'] ?? null, 'related_page' => $record['href'] ?? null, 'created_at' => now(), 'updated_at' => now()]);
        }
        if ($records !== []) {
            $firstNotification = $records[0];
            AuditTrail::record(
                $request,
                'office_notification_created',
                $request->user(),
                after: [
                    'notification_title' => (string) ($firstNotification['title'] ?? 'Untitled notification'),
                    'notification_type' => (string) ($firstNotification['type'] ?? 'system'),
                    'recipient_count' => count($records),
                ],
                category: 'notification',
            );
        }
    }

    private function notificationState(Request $request, array $raw): void
    {
        $data = Validator::make($raw, ['id' => ['required', 'string', 'max:100'], 'readAt' => ['nullable', 'date'], 'archivedAt' => ['nullable', 'date']])->validate();
        if (str_starts_with($data['id'], 'status-')) {
            abort_unless(DB::table('training_notifications')->where('id', substr($data['id'], 7))->where('user_id', $request->user()->user_id)->update(['read_at' => $data['readAt'] ?? null]), 404);
        } elseif (str_starts_with($data['id'], 'approval:')) {
            abort_unless(ModuleAccess::isAdministrator($request->user()), 404);
            abort_unless(DB::table('users')->where('user_id', substr($data['id'], 9))->where('status', 'Pending approval')->whereNull('deleted_at')->exists(), 404);
        } elseif (preg_match('/^account-(pending|decision|updated):'.preg_quote((string) $request->user()->user_id, '/').'(:|$)/', $data['id'])) {
            // Account notices contain only the current authenticated account's state.
        } else {
            $query = DB::table('user_notifications')->where('ui_id', $data['id'])->where('recipient_id', $request->user()->user_id);
            abort_unless((clone $query)->exists(), 404);
            $query->update(['read_at' => $data['readAt'] ?? null, 'archived_at' => $data['archivedAt'] ?? null]);
        }
        $key = 'tmis-notification-state:'.$request->user()->user_id;
        $saved = DB::table('user_interface_drafts')->where('user_id', $request->user()->user_id)->where('draft_key', $key)->lockForUpdate()->first();
        $state = OriginalInterfaceData::unpack($saved?->payload);
        $state[$data['id']] = Arr::only($data, ['readAt', 'archivedAt']);
        DB::table('user_interface_drafts')->updateOrInsert(['user_id' => $request->user()->user_id, 'draft_key' => $key], ['payload' => Crypt::encryptString(json_encode($state, JSON_THROW_ON_ERROR)), 'created_at' => now(), 'updated_at' => now()]);
    }

    /** Save a user's working draft or an administrator's separate reusable draft collection. */
    public function draft(Request $request): JsonResponse
    {
        $data = $request->validate(['key' => ['required', 'string', 'max:120'], 'value' => ['nullable', 'array']]);
        $singleDraftKey = 'tmis-notification-draft:'.$request->user()->user_id;
        $administratorDraftKey = 'tmis-notification-drafts:'.$request->user()->user_id;
        $isPersonalDraft = $data['key'] === $singleDraftKey;
        $isAdministratorDraftList = $data['key'] === $administratorDraftKey;
        abort_unless($isPersonalDraft || $isAdministratorDraftList, 403);
        abort_unless(! $isAdministratorDraftList || ModuleAccess::isAdministrator($request->user()), 403);
        if ($data['value'] === null) {
            DB::table('user_interface_drafts')->where('user_id', $request->user()->user_id)->where('draft_key', $data['key'])->delete();
        } else {
            abort_if(strlen(json_encode($data['value'], JSON_THROW_ON_ERROR)) > ($isAdministratorDraftList ? 500000 : 20000), 422, 'The saved notification draft collection is too large. Remove old drafts and try again.');
            DB::table('user_interface_drafts')->updateOrInsert(['user_id' => $request->user()->user_id, 'draft_key' => $data['key']], ['payload' => Crypt::encryptString(json_encode($data['value'], JSON_THROW_ON_ERROR)), 'created_at' => now(), 'updated_at' => now()]);
        }

        return response()->json(['message' => 'Draft saved.']);
    }
}
