<?php

namespace App\Support;

use App\Http\Authentication\AccountDisplay;
use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/** Builds the original UI read model; canonical columns and scoped relationships override form metadata. */
class OriginalInterfaceData
{
    public const KEYS = [

        'tmis-trainings' => 'trainings', 'tmis-farmers' => 'participants',

        'tmis-farmer-associations' => 'associations', 'tmis-resource-persons' => 'resource_persons',

        'tmis-pre-test-questionnaires' => 'questionnaires', 'tmis-post-test-questionnaires' => 'questionnaires',

        'tmis-training-evaluation-questionnaires' => 'questionnaires', 'tmis-rp-evaluation-questionnaires' => 'questionnaires',

        'tmis-pre-test-encoded' => 'evaluations', 'tmis-post-test-encoded' => 'evaluations',

        'tmis-training-evaluation-encoded' => 'evaluations', 'tmis-rp-evaluation-encoded' => 'evaluations',

    ];

    public const KINDS = ['pre-test' => 'Pre-test', 'post-test' => 'Post-test', 'training-evaluation' => 'Training evaluation', 'rp-evaluation' => 'Resource person evaluation'];

    public static function query(User $user, string $module, bool $trash = false): Builder
    {

        $table = $module === 'evaluations' ? 'assessment_results' : $module;

        $query = DB::table($table);

        $trash ? $query->whereNotNull('deleted_at') : $query->whereNull('deleted_at');

        return ModuleAccess::scope($query, $user);

    }

    public static function find(User $user, string $module, string $id, bool $trash = false): ?object
    {

        return self::query($user, $module, $trash)->where(function (Builder $query) use ($id): void {

            $query->where('ui_id', $id);

            if (ctype_digit($id)) {

                $query->orWhere(fn (Builder $numeric) => $numeric->whereNull('ui_id')->where('id', (int) $id));

            }

        })->first();

    }

    public static function unpack(?string $payload): array
    {

        return $payload ? json_decode(Crypt::decryptString($payload), true, 512, JSON_THROW_ON_ERROR) : [];

    }

    public static function farmerNumber(object $participant): string
    {
        $year = substr((string) ($participant->created_at ?? ''), 2, 2);

        return ($year !== '' ? $year : '00').str_pad((string) $participant->id, 6, '0', STR_PAD_LEFT);
    }

    private static function findFarmerByNumber(User $user, string $farmerNumber): ?object
    {
        if (! preg_match('/^\d{8,}$/', $farmerNumber)) {
            return null;
        }

        $participantId = (int) substr($farmerNumber, 2);
        $participant = self::query($user, 'participants')->where('id', $participantId)->first();

        return $participant && hash_equals(self::farmerNumber($participant), $farmerNumber) ? $participant : null;
    }

    /** Build the authorized interface data, including all accounts on the administrator notification screens. */
    public function bootstrap(User $user): array
    {

        $regions = DB::table('region')->pluck('name', 'region_id');

        $offices = DB::table('organization')->pluck('name', 'org_id');

        $stores = array_fill_keys(array_keys(self::KEYS), []);

        $associations = [];

        $trainingDocuments = DB::table('training_attachments')->whereIn('training_id', self::query($user, 'trainings')->select('id'))->get()->groupBy('training_id');

        $associationDocuments = DB::table('association_attachments')->whereIn('association_id', self::query($user, 'associations')->select('id'))->get()->groupBy('association_id');

        $participantDocuments = DB::table('participant_attachments')->whereIn('participant_id', self::query($user, 'participants')->select('id'))->get()->groupBy('participant_id');

        $participantBeneficiaries = DB::table('participant_beneficiaries as beneficiary')
            ->join('organization as beneficiary_offices', 'beneficiary.org_id', '=', 'beneficiary_offices.org_id')
            ->join('region as beneficiary_regions', 'beneficiary.region_id', '=', 'beneficiary_regions.region_id')
            ->whereIn('beneficiary.participant_id', self::query($user, 'participants')->select('id'))
            ->orderBy('beneficiary.is_primary', 'desc')
            ->orderBy('beneficiary_regions.name')
            ->orderBy('beneficiary_offices.name')
            ->get(['beneficiary.participant_id', 'beneficiary.region_id', 'beneficiary.org_id', 'beneficiary.is_primary', 'beneficiary_offices.name as office_name', 'beneficiary_regions.name as region_name'])
            ->groupBy('participant_id');

        $participantAssociationMemberships = DB::table('participant_association_memberships as membership')
            ->join('associations as participant_associations', 'participant_associations.id', '=', 'membership.association_id')
            ->join('region as association_regions', 'association_regions.region_id', '=', 'participant_associations.region_id')
            ->join('organization as association_offices', 'association_offices.org_id', '=', 'participant_associations.org_id')
            ->whereIn('membership.participant_id', self::query($user, 'participants')->select('id'))
            ->whereNull('participant_associations.deleted_at')
            ->orderByDesc('membership.is_primary')
            ->orderBy('participant_associations.name')
            ->get([
                'membership.participant_id',
                'membership.association_id',
                'membership.role',
                'membership.is_primary',
                'membership.created_at as member_since',
                'participant_associations.ui_id',
                'participant_associations.name',
                'participant_associations.short_name',
                'participant_associations.organization_type',
                'participant_associations.is_active',
                'participant_associations.province',
                'participant_associations.district',
                'participant_associations.municipality',
                'participant_associations.barangay',
                'participant_associations.registration_date',
                'participant_associations.year_covered',
                'association_regions.name as region_name',
                'association_offices.name as office_name',
            ])
            ->groupBy('participant_id');

        $trainingMembers = DB::table('training_participant')->whereIn('training_id', self::query($user, 'trainings')->select('id'))->join('participants', 'training_participant.participant_id', '=', 'participants.id')->get(['training_id', 'participants.id', 'participants.ui_id'])->groupBy('training_id');

        $highlights = DB::table('training_highlights')->whereIn('training_id', self::query($user, 'trainings')->select('id'))->get()->groupBy('training_id');

        $trainingQuestionnaires = DB::table('training_questionnaire')->whereIn('training_id', self::query($user, 'trainings')->select('id'))->join('questionnaires', 'training_questionnaire.questionnaire_id', '=', 'questionnaires.id')->whereNull('questionnaires.deleted_at')->get(['training_id', 'questionnaires.id', 'questionnaires.ui_id', 'questionnaires.kind'])->groupBy('training_id');
        $trainingResources = DB::table('training_resource_person')->whereIn('training_id', self::query($user, 'trainings')->select('id'))->join('resource_persons', 'training_resource_person.resource_person_id', '=', 'resource_persons.id')->whereNull('resource_persons.deleted_at')->get(['training_id', 'resource_persons.id', 'resource_persons.ui_id', 'resource_persons.name', 'resource_persons.title'])->groupBy('training_id');
        $page = (string) request()->header('X-TMIS-PAGE', request()->fullUrl());
        parse_str((string) parse_url($page, PHP_URL_QUERY), $pageQuery);
        $pagePath = (string) parse_url($page, PHP_URL_PATH);
        $pathId = preg_match('~/(?:participants/id/(?:view|edit)-fa|participants/id/(?:view|edit)-farmer|training/id/(?:view|edit)-training)/([^/]+)$~', $pagePath, $matches) === 1
            ? rawurldecode($matches[1])
            : '';
        $farmerNumber = preg_match('~^app/admin/participants/id/(?:view|edit)-farmer/(\d+)$~', ltrim($pagePath, '/'), $matches) === 1 ? $matches[1] : '';
        $selectedFarmer = $farmerNumber !== '' ? self::findFarmerByNumber($user, $farmerNumber) : null;
        $currentId = $selectedFarmer
            ? (string) ($selectedFarmer->ui_id ?? $selectedFarmer->id)
            : (string) request()->query('id', $pageQuery['id'] ?? $pageQuery['faId'] ?? $pathId);
        $selectedRecords = [];
        if ($selectedFarmer && ModuleAccess::allows($user, 'participants.read')) {
            $selectedRecords['participants'] = $selectedFarmer;
        }
        if ($currentId !== '') {
            foreach (['trainings', 'participants', 'associations', 'resource_persons'] as $logModule) {
                if (! isset($selectedRecords[$logModule]) && ModuleAccess::allows($user, $logModule.'.read') && ($selectedRecord = self::find($user, $logModule, $currentId))) {
                    $selectedRecords[$logModule] = $selectedRecord;
                }
            }
        }
        $activityByModule = [];
        foreach ($selectedRecords as $logModule => $selectedRecord) {
            $activityByModule[$logModule] = DB::table('users_log')
                ->leftJoin('users as activity_actors', 'activity_actors.user_id', '=', 'users_log.actor_user_id')
                ->leftJoin('user_roles as activity_roles', 'activity_roles.role_id', '=', 'activity_actors.role_id')
                ->leftJoin('organization as activity_offices', 'activity_offices.org_id', '=', 'activity_actors.org_id')
                ->leftJoin('region as activity_regions', 'activity_regions.region_id', '=', 'activity_actors.region_id')
                ->where('users_log.category', $logModule)
                ->where('users_log.event', 'like', '%'.$selectedRecord->id)
                ->orderByDesc('users_log.id')
                ->limit(500)
                ->get(['users_log.*', 'activity_actors.first_name as actor_first_name', 'activity_actors.middle_name as actor_middle_name', 'activity_actors.last_name as actor_last_name', 'activity_actors.extension_name as actor_extension_name', 'activity_roles.name as actor_role', 'activity_offices.name as activity_office', 'activity_regions.name as activity_region'])
                ->filter(fn ($log): bool => str_ends_with($log->event, '_'.$selectedRecord->id))
                ->map(function ($log) use ($logModule, $selectedRecord): array {
                    $actorName = trim(implode(' ', array_filter([$log->actor_first_name ?? null, $log->actor_middle_name ?? null, $log->actor_last_name ?? null, $log->actor_extension_name ?? null]))) ?: 'Authorized system user';
                    $isFarmerCreation = $logModule === 'participants' && $log->event === 'participants_created_'.$selectedRecord->id;
                    $recordLabel = match ($logModule) {
                        'participants' => 'Farmer profile',
                        'associations' => 'Farmer association',
                        'resource_persons' => 'Resource person',
                        default => 'Training',
                    };
                    $managementLabel = match ($logModule) {
                        'participants' => 'Profile Management',
                        'associations' => 'Association Management',
                        'resource_persons' => 'Resource Person Management',
                        default => 'Training Management',
                    };
                    $action = match (true) {
                        str_contains($log->event, '_created_') => 'created',
                        str_contains($log->event, '_deleted_'), str_contains($log->event, '_removed_') => 'removed',
                        str_contains($log->event, '_restored_') => 'restored',
                        str_contains($log->event, '_updated_') => 'updated',
                        default => 'recorded',
                    };
                    $actionLabel = match ($action) {
                        'created' => 'Record Creation',
                        'removed' => 'Record Removal',
                        'restored' => 'Record Restoration',
                        'updated' => 'Information Update',
                        default => 'Record Activity',
                    };
                    $isFarmerProfileUpdate = $logModule === 'participants'
                        && $log->event === 'participants_updated_'.$selectedRecord->id;
                    $isBeneficiaryChange = str_contains($log->event, 'beneficiary');
                    $isAttachmentChange = str_contains($log->event, 'attachment') || str_contains($log->event, 'document');
                    $category = $isAttachmentChange
                        ? 'attachment'
                        : ($isBeneficiaryChange
                            ? 'membership'
                            : ($logModule === 'trainings'
                                ? (str_contains($log->event, 'enrollment') ? 'participant' : 'training')
                                : 'profile'));
                    $farmerName = trim(implode(' ', array_filter([$selectedRecord->first_name ?? null, $selectedRecord->middle_name ?? null, $selectedRecord->last_name ?? null, $selectedRecord->suffix ?? null]))) ?: 'the farmer';
                    $title = match (true) {
                        $isFarmerCreation => 'Farmer Profile Created',
                        $isFarmerProfileUpdate => 'Farmer Profile Updated',
                        $isBeneficiaryChange => 'Farmer Association Updated',
                        $isAttachmentChange => $recordLabel.' Attachment Updated',
                        $action === 'created' => $recordLabel.' Created',
                        $action === 'removed' => $recordLabel.' Removed',
                        $action === 'restored' => $recordLabel.' Restored',
                        str_contains($log->event, 'status') => $recordLabel.' Status Updated',
                        default => $recordLabel.' Updated',
                    };
                    $description = match (true) {
                        $isFarmerCreation => 'A new farmer profile was successfully registered for '.$farmerName.'.',
                        $isFarmerProfileUpdate => 'Farmer Profile information was updated.',
                        $isBeneficiaryChange => 'Farmer was linked to an association office successfully.',
                        $isAttachmentChange => $recordLabel.' attachment was updated.',
                        $action === 'created' => 'A new '.$recordLabel.' record was successfully created.',
                        $action === 'removed' => $recordLabel.' was removed.',
                        $action === 'restored' => $recordLabel.' was restored.',
                        str_contains($log->event, 'status') => $recordLabel.' status was updated.',
                        default => $recordLabel.' information was updated successfully.',
                    };

                    return [
                        'category' => $category,
                        'context' => $managementLabel.' · '.$actionLabel,
                        'title' => $title,
                        'description' => $description,
                        'actor' => $actorName,
                        'actorOffice' => $log->activity_office ?: 'Office not recorded',
                        'actorRegion' => $log->activity_region ?: 'Region not recorded',
                        'date' => $log->created_at,
                        'status' => $log->outcome === 'success' ? 'Success' : ucfirst($log->outcome),
                        'icon' => match ($category) {
                            'attachment' => 'bi-paperclip',
                            'membership' => 'bi-building-check',
                            'participant' => 'bi-people',
                            default => $isFarmerCreation ? 'bi-person-plus' : 'bi-clock-history',
                        },
                    ];
                })
                ->values()
                ->all();
        }
        $currentTraining = $currentId !== '' ? self::find($user, 'trainings', $currentId) : null;
        $trainingHistory = $currentTraining && ModuleAccess::allows($user, 'trainings.read') ? DB::table('training_status_changes')
            ->leftJoin('users as status_actors', 'status_actors.user_id', '=', 'training_status_changes.actor_user_id')
            ->leftJoin('user_roles as status_roles', 'status_roles.role_id', '=', 'status_actors.role_id')
            ->leftJoin('organization as status_offices', 'status_offices.org_id', '=', 'status_actors.org_id')
            ->leftJoin('region as status_regions', 'status_regions.region_id', '=', 'status_actors.region_id')
            ->where('training_status_changes.training_id', $currentTraining->id)
            ->orderByDesc('training_status_changes.id')
            ->get(['training_status_changes.*', 'status_actors.first_name', 'status_actors.middle_name', 'status_actors.last_name', 'status_actors.extension_name', 'status_roles.name as actor_role', 'status_offices.name as actor_office', 'status_regions.name as actor_region'])
            ->map(fn ($change): array => [
                'category' => 'status',
                'context' => 'Training Management · Status Change',
                'title' => 'Training Status Updated',
                'description' => 'Training status changed from '.$change->from_status.' to '.$change->to_status.'.',
                'actor' => trim(implode(' ', array_filter([$change->first_name, $change->middle_name, $change->last_name, $change->extension_name]))) ?: 'Authorized system user',
                'actorRole' => $change->actor_role ?: 'Authorized system user',
                'actorOffice' => $change->actor_office ?: 'Office not recorded',
                'actorRegion' => $change->actor_region ?: 'Region not recorded',
                'date' => $change->created_at,
                'status' => 'Success',
                'icon' => 'bi-arrow-left-right',
            ])->all() : [];

        $documents = static function ($items, string $module, string $id): array {

            return collect($items)->map(fn ($file): array => ['id' => (string) $file->id, 'name' => $file->original_name, 'file' => ['name' => $file->original_name, 'type' => $file->mime_type, 'size' => $file->size], 'type' => $file->original_kind ?? $file->kind, 'year' => (string) $file->year, 'remarks' => $file->remarks ?? '', 'url' => route('ui.documents.show', [$module, $id, $file->id]), 'dataUrl' => route('ui.documents.show', [$module, $id, $file->id]), 'pdf' => $file->mime_type === 'application/pdf', 'temporary' => false])->all();

        };

        foreach (['associations', 'participants', 'resource_persons', 'questionnaires', 'trainings'] as $module) {

            if (! ModuleAccess::allows($user, $module.'.read')) {

                continue;

            }

            foreach (self::query($user, $module)->orderBy('id')->get() as $record) {

                $item = self::unpack($record->ui_data);

                $id = $record->ui_id ?? (string) $record->id;

                $item = array_replace($item, ['id' => $id, '_db_id' => $record->id, '_version' => $record->ui_version, 'region_id' => $record->region_id, 'org_id' => $record->org_id, 'region' => $regions[$record->region_id] ?? '', 'office' => $offices[$record->org_id] ?? '', 'description' => $record->description ?? '', 'createdAt' => $record->created_at, 'updatedAt' => $record->updated_at]);

                $savedStatus = $item['status'] ?? null;
                $item['status'] = in_array($savedStatus, ['Active', 'Inactive', 'Removed', 'Deceased'], true)
                    ? $savedStatus
                    : ($record->is_active ? 'Active' : 'Inactive');
                $item['activityLogs'] = ($selectedRecords[$module]->id ?? null) === $record->id ? ($activityByModule[$module] ?? []) : [];
                $item['activity_logs'] = $item['activityLogs'];

                if ($module === 'associations') {

                    $item = array_replace($item, ['association_name' => $record->name, 'short_name' => $record->short_name, 'organization_type' => $record->organization_type, 'registration_date' => $record->registration_date, 'year_covered' => $record->year_covered, 'province' => $record->province, 'district' => $record->district, 'municipality' => $record->municipality, 'barangay' => $record->barangay]);
                    $item['status'] = $record->is_active
                        ? 'Active'
                        : (in_array($savedStatus, ['Removed', 'Deceased'], true) ? $savedStatus : 'Inactive');

                    $item['documents'] = $documents($associationDocuments[$record->id] ?? [], $module, $id);

                    $associations[$record->id] = $item;

                    $stores['tmis-farmer-associations'][] = $item;

                } elseif ($module === 'participants') {

                    $item['status'] = $record->is_active
                        ? 'Active'
                        : (in_array($savedStatus, ['Removed', 'Deceased'], true) ? $savedStatus : 'Inactive');

                    $sensitive = $record->protected_details ? self::unpack($record->protected_details) : [];

                    $membershipDetails = collect($participantAssociationMemberships[$record->id] ?? [])->map(fn ($membership): array => [
                        'databaseId' => (string) $membership->association_id,
                        'id' => $membership->ui_id ?? (string) $membership->association_id,
                        'name' => $membership->name,
                        'shortName' => $membership->short_name,
                        'organizationType' => $membership->organization_type,
                        'region' => $membership->region_name,
                        'office' => $membership->office_name,
                        'location' => implode(', ', array_filter([$membership->barangay, $membership->municipality, $membership->district, $membership->province])),
                        'registrationDate' => $membership->registration_date,
                        'yearCovered' => $membership->year_covered,
                        'status' => $membership->is_active ? 'Active' : 'Inactive',
                        'role' => $membership->role,
                        'isPrimary' => (bool) $membership->is_primary,
                        'memberSince' => $membership->member_since,
                    ])->values();
                    $primaryMembership = $membershipDetails->first(fn (array $membership): bool => $membership['isPrimary']) ?? $membershipDetails->first();
                    $item = array_replace($item, ['name' => $record->name, 'farmerNumber' => self::farmerNumber($record), 'beneficiaryOffices' => collect($participantBeneficiaries[$record->id] ?? [])->map(fn ($office): array => ['region_id' => $office->region_id, 'org_id' => $office->org_id, 'region' => $office->region_name, 'office' => $office->office_name, 'isPrimary' => (bool) $office->is_primary])->values()->all(), 'associationMemberships' => $membershipDetails->all(), 'firstName' => $record->first_name, 'middleName' => $record->middle_name, 'lastName' => $record->last_name, 'suffix' => $record->suffix, 'fname' => $record->first_name, 'mname' => $record->middle_name, 'lname' => $record->last_name, 'sex' => $record->sex, 'gender' => $record->sex, 'nationality' => $record->nationality, 'placeOfBirth' => $record->place_of_birth, 'postal_code' => $record->postal_code, 'house_building_number' => $record->house_number, 'street_purok_sitio_name' => $record->street, 'telephone' => $record->telephone, 'birthDate' => $record->date_of_birth, 'birthday' => $record->date_of_birth, 'dob' => $record->date_of_birth, 'phone' => $record->phone, 'email' => $record->email, 'province' => $record->province, 'municipality' => $record->municipality, 'district' => $record->district, 'barangay' => $record->barangay, 'organization' => $primaryMembership['name'] ?? '', 'association' => $primaryMembership['name'] ?? '', 'associationNumber' => $primaryMembership['id'] ?? '', 'association_id' => $primaryMembership['id'] ?? null, 'association_db_id' => $primaryMembership['databaseId'] ?? null, 'role' => $primaryMembership['role'] ?? '', 'registrationDate' => $item['registration_date'] ?? substr((string) $record->created_at, 0, 10), 'profileStatus' => $item['status'] === 'Active' ? 'Active' : 'Inactive', 'inactiveReason' => $item['status'] === 'Active' ? '' : ($item['status'] === 'Removed' ? 'Waived from Farmer Association' : $item['status']), 'yearCovered' => $item['yearCovered'] ?? $item['year_covered'] ?? '', 'tupad' => $sensitive['tupad'] ?? '', 'soloParent' => $sensitive['solo_parent'] ?? '', 'fourPs' => $sensitive['four_ps'] ?? '', 'pwd' => $sensitive['disability'] ?? '', 'indigenousGroup' => $sensitive['indigenous_group'] ?? '', 'tribeName' => $sensitive['tribe'] ?? '', 'dietaryRestriction' => $sensitive['dietary_restriction'] ?? '', 'allergies_on' => $sensitive['allergies'] ?? '', 'seniorCitizen' => $sensitive['senior_citizen'] ?? '']);

                    $item['attachments'] = $documents($participantDocuments[$record->id] ?? [], $module, $id);

                    $stores['tmis-farmers'][] = $item;

                } elseif ($module === 'resource_persons') {

                    $item = array_replace($item, ['name' => $record->name, 'title' => $record->title, 'first_name' => $record->first_name, 'middle_name' => $record->middle_name, 'last_name' => $record->last_name, 'suffix' => $record->suffix, 'qualification' => $record->qualification, 'expertise' => $record->expertise, 'phone' => $record->phone, 'email' => $record->email]);

                    $stores['tmis-resource-persons'][] = $item;

                } elseif ($module === 'questionnaires') {

                    $slug = array_search($record->kind, self::KINDS, true);

                    $item = array_replace($item, ['trainingQuestionnaire' => $record->name, 'questionnaireName' => $record->name, 'implementingOffice' => $offices[$record->org_id] ?? '', 'totalItems' => $item['totalItems'] ?? count(json_decode($record->questions, true)), 'questions' => $item['questions'] ?? array_map(fn (string $text): array => ['text' => $text, 'maxRating' => 5], json_decode($record->questions, true)), 'status' => $item['questionnaireState'] ?? ($record->is_active ? 'Active' : 'Inactive')]);

                    if ($slug !== false) {

                        $stores['tmis-'.$slug.'-questionnaires'][] = $item;

                    }

                } else {

                    $item = array_replace($item, ['title' => $record->name, 'training_title' => $record->name, 'type' => $record->training_type, 'training_type' => $record->training_type, 'delivery_mode' => $record->delivery_mode, 'startDate' => $record->start_date, 'endDate' => $record->end_date, 'start_date' => $record->start_date, 'end_date' => $record->end_date, 'venue' => $record->venue, 'venue_location' => $record->venue, 'budget' => $record->budget, 'training_budget' => $record->budget, 'yearCovered' => $record->year_covered, 'dateEncoded' => substr((string) $record->created_at, 0, 10), 'province' => $record->province, 'district' => $record->district, 'municipality' => $record->municipality, 'barangay' => $record->barangay, 'status' => ! $record->is_active ? 'Inactive' : match ($record->status) {
                        'For review' => 'For Review', 'For approval' => 'For Approval', 'For acceptance' => 'For Acceptance', 'Approved', 'Approved & Accepted' => 'Approved & Accepted', default => $record->status
                    }, 'version' => $record->version]);

                    $item['trainers'] = collect($trainingResources[$record->id] ?? [])->map(fn ($resource): array => ['id' => $resource->ui_id ?? (string) $resource->id, 'name' => $resource->name, 'role' => $resource->title ?? 'Resource person'])->all();
                    foreach (['pretest' => 'Pre-test', 'posttest' => 'Post-test'] as $key => $kind) {
                        $item[$key] = collect($trainingQuestionnaires[$record->id] ?? [])->where('kind', $kind)->map(fn ($questionnaire): string => $questionnaire->ui_id ?? (string) $questionnaire->id)->values()->all();
                    }
                    $item['activityLogs'] = $currentTraining?->id === $record->id ? array_merge($trainingHistory, $activityByModule['trainings'] ?? []) : [];
                    $item['attachments'] = $documents($trainingDocuments[$record->id] ?? [], $module, $id);

                    $item['designFile'] = collect($trainingDocuments[$record->id] ?? [])->firstWhere('kind', 'Training design')?->original_name;

                    $item['participants'] = collect($trainingMembers[$record->id] ?? [])->map(fn ($member): string => $member->ui_id ?? (string) $member->id)->all();

                    $item['highlights'] = collect($highlights[$record->id] ?? [])->mapWithKeys(fn ($highlight): array => [$highlight->slide => json_decode($highlight->content, true) + ['image' => $highlight->image_path ? route('ui.highlights.image', [$id, $highlight->slide, 'image']) : null, 'logo' => $highlight->logo_path ? route('ui.highlights.image', [$id, $highlight->slide, 'logo']) : null]])->all();

                    $stores['tmis-trainings'][] = $item;

                }

            }

        }

        $membersByAssociation = [];
        foreach ($stores['tmis-farmers'] as $farmer) {
            foreach ($farmer['associationMemberships'] ?? [] as $membership) {
                $membersByAssociation[$membership['databaseId']][] = [
                    'farmer_id' => $farmer['id'],
                    'farmerNumber' => $farmer['farmerNumber'],
                    'status' => $farmer['status'],
                    'last_name' => $farmer['lastName'],
                    'first_name' => $farmer['firstName'],
                    'middle_name' => $farmer['middleName'],
                    'sex' => $farmer['sex'],
                    'position' => $membership['role'],
                    'province' => $farmer['province'],
                    'municipality' => $farmer['municipality'],
                    'barangay' => $farmer['barangay'],
                ];
            }
        }

        foreach ($stores['tmis-farmer-associations'] as &$association) {
            $association['members'] = $membersByAssociation[(string) $association['_db_id']] ?? [];
        }

        unset($association);

        if (ModuleAccess::allows($user, 'evaluations.read')) {

            $questionnaires = DB::table('questionnaires')->pluck('kind', 'id');

            foreach (self::query($user, 'evaluations')->orderBy('id')->get() as $result) {

                $item = self::unpack($result->ui_data);

                $item = array_replace($item, ['id' => $result->ui_id, '_db_id' => $result->id, '_version' => $result->ui_version, 'status' => $result->state, 'score' => $result->score, 'date' => $result->assessed_on, 'trainingDatabaseId' => $result->training_id]);

                $slug = array_search($questionnaires[$result->questionnaire_id], self::KINDS, true);

                $stores['tmis-'.$slug.'-encoded'][] = $item;

            }

        }

        $users = DB::table('users')->whereNull('deleted_at')->orderBy('user_id');

        $page = request()->header('X-TMIS-PAGE', request()->path());

        $normalizedPage = ltrim($page, '/');
        $isAccountManagement = str_starts_with($normalizedPage, 'app/admin/administration/');
        $needsAccounts = $isAccountManagement
            || str_starts_with($normalizedPage, 'app/admin/notification/notification')
            || $normalizedPage === 'app/admin/users/profile';

        if (! ModuleAccess::isAdministrator($user) || ! $needsAccounts) {

            $users->where('user_id', $user->user_id);

        } elseif ($isAccountManagement) {

            $users->whereNotIn('users.role_id', DB::table('user_roles')->where('name', 'System Administrator')->select('role_id'));

        }

        $roles = DB::table('user_roles')->pluck('name', 'role_id');
        $users->leftJoin('role_credentials', 'users.role_credential_id', '=', 'role_credentials.role_credential_id')
            ->select('users.*', 'role_credentials.name as role_credential_name');

        $stores['tmis-users'] = $users->get()->map(fn ($account): array => ['id' => (string) $account->user_id, 'firstName' => $account->first_name, 'middleName' => $account->middle_name, 'lastName' => $account->last_name, 'suffix' => $account->extension_name, 'dateOfBirth' => $account->date_of_birth, 'email' => $account->email, 'phone' => $account->mobile_number, 'position' => $account->position, 'role' => $roles[$account->role_id] ?? '', 'credentialType' => $account->role_credential_name, 'region' => $regions[$account->region_id] ?? '', 'office' => $offices[$account->org_id] ?? '', 'status' => $account->active_status ? $account->status : ($account->status === 'Approved & Accepted' ? 'Inactive' : $account->status), 'activeStatus' => $account->active_status, 'hasProfilePicture' => filled($account->profile_photo_path), 'createdAt' => $account->is_created_at])->all();

        $stores['tmis-notifications'] = DB::table('user_notifications')->where('recipient_id', $user->user_id)->orderBy('id')->get()->map(fn ($notification): array => ['id' => $notification->ui_id, 'batchId' => $notification->batch_id, 'recipientId' => (string) $notification->recipient_id, 'creatorId' => (string) $notification->creator_id, 'title' => $notification->title, 'summary' => $notification->summary, 'message' => $notification->message, 'type' => $notification->type, 'priority' => $notification->priority, 'reference' => $notification->reference, 'href' => $notification->related_page ?? '', 'createdAt' => $notification->created_at, 'readAt' => $notification->read_at, 'archivedAt' => $notification->archived_at])->all();

        foreach (DB::table('training_notifications')
            ->join('training_status_changes', 'training_notifications.status_change_id', '=', 'training_status_changes.id')
            ->join('trainings', 'training_status_changes.training_id', '=', 'trainings.id')
            ->leftJoin('users as actor', 'training_status_changes.actor_user_id', '=', 'actor.user_id')
            ->leftJoin('organization as actor_office', 'actor.org_id', '=', 'actor_office.org_id')
            ->leftJoin('region as actor_region', 'actor.region_id', '=', 'actor_region.region_id')
            ->leftJoin('user_roles as actor_role', 'actor.role_id', '=', 'actor_role.role_id')
            ->leftJoin('organization as training_office', 'trainings.org_id', '=', 'training_office.org_id')
            ->leftJoin('region as training_region', 'trainings.region_id', '=', 'training_region.region_id')
            ->where('training_notifications.user_id', $user->user_id)
            ->get([
                'training_notifications.*', 'training_status_changes.training_id', 'training_status_changes.from_status',
                'training_status_changes.to_status', 'training_status_changes.reason', 'training_status_changes.actor_user_id',
                'training_status_changes.created_at as changed_at', 'trainings.name as training_name',
                'trainings.ui_id as training_public_id', 'training_office.name as training_office_name',
                'actor.first_name as actor_first_name', 'actor.middle_name as actor_middle_name',
                'actor.last_name as actor_last_name', 'actor.extension_name as actor_suffix',
                'actor_office.name as actor_office_name',
                'actor_region.name as actor_region_name', 'actor_role.name as actor_role_name',
                'training_region.name as training_region_name',
            ]) as $notification) {

            $actorName = app(AccountDisplay::class)->formatName(
                $notification->actor_first_name,
                $notification->actor_middle_name,
                $notification->actor_last_name,
                $notification->actor_suffix,
            );
            $changedAt = Carbon::parse($notification->changed_at)
                ->timezone(config('app.timezone'))
                ->format('M j, Y g:i A');
            $isRevert = in_array($notification->to_status, ['For approval', 'For review'], true);
            $title = $isRevert ? 'Training returned for changes' : ($notification->to_status === 'Approved & Accepted' ? 'Training approved and accepted' : 'Training status updated');
            $action = $isRevert ? 'returned from '.$notification->from_status.' to '.$notification->to_status : 'moved from '.$notification->from_status.' to '.$notification->to_status;
            $reason = trim((string) $notification->reason);
            $officeName = $notification->training_office_name ?: 'Office not recorded';
            $actorOffice = $notification->actor_office_name ?: 'Office not recorded';
            $actorRegion = $notification->actor_region_name ?: 'Region not recorded';
            $actorRole = $notification->actor_role_name ?: 'User';
            $trainingRegion = $notification->training_region_name ?: 'Region not recorded';
            $summary = 'Training '.$action.'. Changed by '.$actorName.' · '.$actorOffice.' - '.$actorRegion.' · '.$changedAt.'.';
            $message = 'Training “'.$notification->training_name.'” (ID '.($notification->training_public_id ?? $notification->training_id).') was '.$action.'.';
            if ($isRevert && $reason !== '') {
                $message .= ' Reason: '.$reason;
            }
            $message .= ' Changed by '.$actorName.' ('.$actorRole.', '.$actorOffice.' - '.$actorRegion.') on '.$changedAt.'. Training office / organization: '.$officeName.' - '.$trainingRegion.'.';

            $stores['tmis-notifications'][] = [
                'id' => 'status-'.$notification->id,
                'recipientId' => (string) $user->user_id,
                'creatorId' => (string) $notification->actor_user_id,
                'type' => 'training',
                'priority' => 'normal',
                'title' => $title,
                'summary' => $summary,
                'message' => $message,
                'reference' => (string) ($notification->training_public_id ?? $notification->training_id),
                'changedBy' => $actorName,
                'actorOffice' => $actorOffice,
                'actorRegion' => $actorRegion,
                'actorRole' => $actorRole,
                'office' => $officeName,
                'region' => $trainingRegion,
                'reason' => $reason,
                'fromStatus' => $notification->from_status,
                'toStatus' => $notification->to_status,
                'createdAt' => $notification->changed_at,
                'readAt' => $notification->read_at,
                'archivedAt' => null,
                'href' => 'training/id/view-training?id='.rawurlencode($notification->training_public_id ?? (string) $notification->training_id),
            ];

        }

        foreach (DB::table('user_interface_drafts')->where('user_id', $user->user_id)->get() as $draft) {

            $stores[$draft->draft_key] = self::unpack($draft->payload);

        }

        $isAdministrator = ModuleAccess::isAdministrator($user);
        $registrationScope = ModuleAccess::registrationScope($user);
        $registrationRegions = DB::table('region')->where('is_active', 1)
            ->when($registrationScope['regionIds'] !== null, fn ($query) => $query->whereIn('region_id', $registrationScope['regionIds']))
            ->orderBy('name')
            ->get(['region_id', 'name']);
        $registrationOffices = DB::table('organization')->where('is_active', 1)
            ->when($registrationScope['regionIds'] !== null, fn ($query) => $query->whereIn('region_id', $registrationScope['regionIds']))
            ->when($registrationScope['officeIds'] !== null, fn ($query) => $query->whereIn('org_id', $registrationScope['officeIds']))
            ->orderBy('name')
            ->get(['org_id', 'region_id', 'name']);

        return [
            'registration' => app(RegistrationReferences::class)->choices() + [
                'regionId' => $user->region_id,
                'officeId' => $user->org_id,
                'regionIds' => $registrationScope['regionIds'],
                'officeIds' => $registrationScope['officeIds'],
                'regions' => $registrationRegions,
                'offices' => $registrationOffices,
            ],
            'dashboard' => app(DashboardData::class)->build($stores),
            'roles' => $isAdministrator ? DB::table('user_roles')->where('is_active', 1)->where('name', '<>', 'System Administrator')->pluck('name')->all() : [],
            'stores' => $stores,
            'actor' => (new AccountDisplay)->forUser($user),
            'regions' => DB::table('region')->where('is_active', 1)->get(['region_id', 'name']),
            'offices' => DB::table('organization')->where('is_active', 1)->get(['org_id', 'region_id', 'name']),
            'permissions' => array_values(array_filter(ModuleAccess::permissions(), fn (string $permission): bool => ModuleAccess::allows($user, $permission))),
            'administrator' => $isAdministrator,
        ];

    }
}
