<?php

namespace App\Http\Controllers;

use App\Http\Authentication\AccountDisplay;
use App\Http\Authentication\AuditTrail;
use App\Models\User;
use App\Support\ModuleAccess;
use App\Support\OperationalFields;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OperationsController
{
    private function query(Request $request, string $module): Builder
    {
        abort_unless(in_array($module, ModuleAccess::MODULES, true) && $module !== 'evaluations', 404);

        return ModuleAccess::scope(DB::table($module)->whereNull('deleted_at'), $request->user());
    }

    public function dashboard(Request $request): View
    {
        $summary = [];
        if ($request->user()) {
            foreach (ModuleAccess::MODULES as $module) {
                if ($module !== 'evaluations' && ModuleAccess::allows($request->user(), $module.'.read')) {
                    $summary[$module] = $this->query($request, $module)->where('is_active', true)->count();
                }
            }
        }

        return view('admin.dashboard.dashboard', compact('summary'));
    }

    public function index(Request $request, string $module = 'trainings'): View|JsonResponse
    {
        ModuleAccess::authorize($request, $module.'.read');
        $query = $this->query($request, $module);
        $filters = $request->validate([
            'id' => ['nullable', 'integer', 'min:1'],
            'search' => ['nullable', 'string', 'max:100'], 'region_id' => ['nullable', 'integer'],
            'org_id' => ['nullable', 'integer'], 'active' => ['nullable', 'boolean'],
            'status' => ['nullable', Rule::in(['For review', 'For approval', 'For acceptance', 'Approved & Accepted'])],
        ]);
        foreach (['region_id', 'org_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['active'])) {
            $query->where('is_active', $filters['active']);
        }
        if (! empty($filters['search'])) {
            $query->where('name', 'like', '%'.$filters['search'].'%');
        }
        if ($module === 'trainings' && ! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        $records = $query->orderByDesc('id')->paginate(20)->withQueryString();
        if ($module === 'participants') {
            $records->getCollection()->each(function ($record): void {
                unset($record->protected_details);
            });
        }
        if ($request->expectsJson()) {
            return response()->json($records);
        }
        $selected = $request->filled('id') ? $this->query($request, $module)->where('id', $request->integer('id'))->first() : null;
        abort_if($request->filled('id') && ! $selected, 404);
        if ($selected && $module === 'participants') {
            $selected->sensitive = $selected->protected_details ? json_decode(Crypt::decryptString($selected->protected_details), true, 512, JSON_THROW_ON_ERROR) : [];
            unset($selected->protected_details);
        }
        $regions = DB::table('region')->where('is_active', 1);
        $offices = DB::table('organization')->where('is_active', 1);
        if (! ModuleAccess::isAdministrator($request->user())) {
            $regions->where('region_id', $request->user()->region_id);
            $offices->where('org_id', $request->user()->org_id)->where('region_id', $request->user()->region_id);
        }

        return view('admin.operations', [
            'module' => $module, 'records' => $records, 'selected' => $selected,
            'participantOptions' => $selected && $module === 'trainings' ? $this->query($request, 'participants')->where('region_id', $selected->region_id)->where('org_id', $selected->org_id)->where('is_active', true)->orderBy('name')->get(['id', 'name']) : collect(),
            'resourceOptions' => $selected && $module === 'trainings' ? $this->query($request, 'resource_persons')->where('region_id', $selected->region_id)->where('org_id', $selected->org_id)->where('is_active', true)->orderBy('name')->get(['id', 'name']) : collect(),
            'enrolledParticipants' => $selected && $module === 'trainings' ? DB::table('training_participant')->join('participants', 'training_participant.participant_id', '=', 'participants.id')->where('training_id', $selected->id)->get(['participants.id', 'participants.name']) : collect(),
            'enrolledResources' => $selected && $module === 'trainings' ? DB::table('training_resource_person')->join('resource_persons', 'training_resource_person.resource_person_id', '=', 'resource_persons.id')->where('training_id', $selected->id)->get(['resource_persons.id', 'resource_persons.name']) : collect(),
            'regions' => $regions->orderBy('name')->get(), 'offices' => $offices->orderBy('name')->get(),
            'attachments' => $selected && $module === 'trainings' ? DB::table('training_attachments')->where('training_id', $selected->id)->get(['id', 'kind', 'original_name']) : collect(),
            'history' => $selected && $module === 'trainings' ? DB::table('training_status_changes')->where('training_id', $selected->id)->orderByDesc('id')->get() : collect(),
        ]);
    }

    public function store(Request $request, string $module): JsonResponse|RedirectResponse
    {
        ModuleAccess::authorize($request, $module.'.create');
        $this->query($request, $module);
        $data = $this->validated($request, $module);
        $id = DB::transaction(function () use ($request, $module, $data): int {
            $id = DB::table($module)->insertGetId($data + ['created_by' => $request->user()->user_id, 'created_at' => now(), 'updated_at' => now()]);
            if ($module === 'participants') {
                DB::table('participant_beneficiaries')->insertOrIgnore([
                    'participant_id' => $id,
                    'region_id' => $data['region_id'],
                    'org_id' => $data['org_id'],
                    'added_by' => $request->user()->user_id,
                    'is_primary' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->audit($request, $module, $id, 'created', after: ['changed_fields' => array_keys($data)]);

            return $id;
        });

        return $this->respond($request, $module, $id, 'Record created.', 201);
    }

    public function update(Request $request, string $module, int $id): JsonResponse|RedirectResponse
    {
        ModuleAccess::authorize($request, $module.'.edit');
        if ($module === 'trainings') {
            $request->validate(['version' => ['required', 'integer', 'min:1']]);
        }
        $data = $this->validated($request, $module);
        DB::transaction(function () use ($request, $module, $id, $data): void {
            $record = $this->query($request, $module)->where('id', $id)->lockForUpdate()->first();
            abort_unless($record, 404);
            abort_unless((int) $record->region_id === (int) $data['region_id'] && (int) $record->org_id === (int) $data['org_id'], 422, 'Record ownership cannot be changed.');
            if ($module === 'trainings') {
                abort_unless((int) $record->version === $request->integer('version'), 409, 'Training changed. Refresh before editing.');
                abort_unless($record->status === 'For review', 409, 'Return the training to review before editing.');
                $data['version'] = $record->version + 1;
            }
            if ($module === 'questionnaires') {
                abort_if(DB::table('evaluation_responses')->where('questionnaire_id', $id)->exists(), 409, 'A questionnaire with responses is immutable. Create a new questionnaire.');
            }
            $changedFields = $this->changedFieldNames($record, $data);
            DB::table($module)->where('id', $id)->update($data + ['updated_at' => now()]);
            $this->audit($request, $module, $id, 'updated', after: ['changed_fields' => $changedFields]);
        });

        return $this->respond($request, $module, $id, 'Record updated.');
    }

    public function destroy(Request $request, string $module, int $id): JsonResponse|RedirectResponse
    {
        ModuleAccess::authorize($request, $module.'.delete');
        DB::transaction(function () use ($request, $module, $id): void {
            $record = $this->query($request, $module)->where('id', $id)->lockForUpdate()->first();
            abort_unless($record, 404);
            DB::table($module)->where('id', $id)->update(['deleted_at' => now(), 'updated_at' => now()]);
            $this->audit($request, $module, $id, 'deleted');
        });

        return $this->respond($request, $module, null, 'Record moved to trash.');
    }

    /** Validate fields explicitly; ownership and workflow status never come from arbitrary payload keys. */
    private function validated(Request $request, string $module): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'], 'description' => ['nullable', 'string', 'max:10000'],
            'region_id' => ['required', 'integer', Rule::exists('region', 'region_id')->where('is_active', 1)],
            'org_id' => ['required', 'integer', Rule::exists('organization', 'org_id')->where('is_active', 1)->where('region_id', $request->input('region_id'))],
            'is_active' => ['sometimes', 'boolean'],
        ];
        if ($module === 'trainings') {
            $rules += ['start_date' => ['required', 'date_format:Y-m-d'], 'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'], 'venue' => ['required', 'string', 'max:255'], 'budget' => ['required', 'numeric', 'min:0', 'max:999999999999.99']];
        }
        if (in_array($module, ['participants', 'resource_persons'], true)) {
            $rules += ['email' => ['nullable', 'email', 'max:255'], 'phone' => ['nullable', 'string', 'max:30']];
        }
        if ($module === 'participants') {
            $rules += ['association_id' => ['nullable', 'integer'], 'date_of_birth' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'], 'sex' => ['nullable', Rule::in(['Male', 'Female'])], 'address' => ['nullable', 'string', 'max:2000']];
        }
        if ($module === 'resource_persons') {
            $rules['expertise'] = ['nullable', 'string', 'max:255'];
        }
        if ($module === 'questionnaires') {
            $rules += ['kind' => ['required', Rule::in(['Pre-test', 'Post-test', 'Training evaluation', 'Resource person evaluation'])], 'questions' => ['required', 'array', 'min:1', 'max:100'], 'questions.*' => ['required', 'string', 'max:1000']];
        }
        foreach (OperationalFields::forModule($module) as $field => $definition) {
            $rules[$field] = match ($definition['type']) {
                'date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
                'number' => ['nullable', 'integer', 'min:0', 'max:'.($field === 'year_covered' ? 2200 : 1000000)],
                default => ['nullable', 'string', 'max:255'],
            };
        }
        if ($module === 'participants') {
            foreach (OperationalFields::sensitiveParticipantFields() as $field => $label) {
                $rules['sensitive.'.$field] = ['nullable', 'string', 'max:500'];
            }
        }
        $data = $request->validate($rules);
        if (! ModuleAccess::isAdministrator($request->user())) {
            abort_unless((int) $data['region_id'] === (int) $request->user()->region_id && (int) $data['org_id'] === (int) $request->user()->org_id, 403);
        }
        if (! empty($data['association_id'])) {
            abort_unless($this->query($request, 'associations')->where('id', $data['association_id'])->where('region_id', $data['region_id'])->where('org_id', $data['org_id'])->where('is_active', true)->exists(), 422, 'Select an active association in the same office.');
        }
        if (isset($data['sensitive'])) {
            $data['protected_details'] = Crypt::encryptString(json_encode($data['sensitive'], JSON_THROW_ON_ERROR));
            unset($data['sensitive']);
        }
        if (isset($data['questions'])) {
            $data['questions'] = json_encode(array_values($data['questions']), JSON_THROW_ON_ERROR);
        }

        return $data;
    }

    public function transition(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['For approval', 'For acceptance', 'Approved & Accepted', 'For review'])], 'version' => ['required', 'integer', 'min:1'], 'reason' => ['nullable', 'string', 'max:2000']]);
        DB::transaction(function () use ($request, $id, $data): void {
            $this->applyTrainingTransition($request, $id, $data);
        });

        return $this->respond($request, 'trainings', $id, 'Training status updated. Office email notifications are pending delivery.');
    }

    public function bulkTransition(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['For acceptance', 'Approved & Accepted', 'For approval', 'For review'])],
            'reason' => ['nullable', 'string', 'max:2000'],
            'trainings' => ['required', 'array', 'min:1', 'max:100'],
            'trainings.*.id' => ['required', 'integer', 'distinct', 'min:1'],
            'trainings.*.version' => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $data): void {
            foreach ($data['trainings'] as $training) {
                $this->applyTrainingTransition($request, (int) $training['id'], [
                    'status' => $data['status'],
                    'version' => $training['version'],
                    'reason' => $data['reason'] ?? null,
                ]);
            }
        });

        return response()->json(['message' => count($data['trainings']).' training status(es) updated.']);
    }

    /** @param array{status: string, version: int|string, reason?: ?string} $data */
    private function applyTrainingTransition(Request $request, int $id, array $data): void
    {
        $training = $this->query($request, 'trainings')->where('id', $id)->lockForUpdate()->first();
        abort_unless($training, 404);
        abort_unless($training->is_active, 409, 'Inactive trainings cannot change status.');
        abort_unless((int) $training->version === (int) $data['version'], 409, 'Training changed. Refresh before trying again.');
        $allowed = [
            'For review' => ['For approval'],
            'For approval' => ['For acceptance', 'For review'],
            'For acceptance' => ['Approved & Accepted', 'For approval', 'For review'],
            'Approved & Accepted' => [],
        ];
        abort_unless(in_array($data['status'], $allowed[$training->status] ?? [], true), 409, 'Invalid training status transition.');
        if (in_array($training->status, ['For approval', 'For acceptance'], true)
            && in_array($data['status'], ['For approval', 'For review'], true)
            && blank($data['reason'] ?? null)) {
            throw ValidationException::withMessages(['reason' => 'Add a reason when returning a training to an earlier status.']);
        }
        $permission = match ([$training->status, $data['status']]) {
            ['For review', 'For approval'] => 'trainings.submit',
            ['For approval', 'For acceptance'], ['For approval', 'For review'] => 'trainings.approve',
            ['For acceptance', 'Approved & Accepted'], ['For acceptance', 'For approval'], ['For acceptance', 'For review'] => 'trainings.accept',
            default => null,
        };
        abort_unless($permission && ModuleAccess::allows($request->user(), $permission), 403);
        if ($data['status'] === 'Approved & Accepted') {
            abort_unless(ModuleAccess::isAdministrator($request->user()), 403, 'Only System Administrators can finalize training acceptance.');
        }
        if ($training->status === 'For review' && $data['status'] === 'For approval') {
            $hasDesign = DB::table('training_attachments')->where('training_id', $id)->where('kind', 'Training design')->get(['path'])->contains(fn ($design): bool => Storage::disk('local')->exists($design->path));
            if (! $hasDesign) {
                throw ValidationException::withMessages(['training_design' => 'Upload a training design attachment before submitting for approval.']);
            }
        }
        DB::table('trainings')->where('id', $id)->update(['status' => $data['status'], 'version' => $training->version + 1, 'updated_at' => now()]);
        $changeId = DB::table('training_status_changes')->insertGetId(['training_id' => $id, 'actor_user_id' => $request->user()->user_id, 'from_status' => $training->status, 'to_status' => $data['status'], 'reason' => $data['reason'] ?? null, 'created_at' => now()]);
        /** The outbox is committed with the status, so mail failures cannot lose the notification. */
        DB::table('users')->join('user_roles', 'users.role_id', '=', 'user_roles.role_id')->where('users.region_id', $training->region_id)->where('users.org_id', $training->org_id)
            ->where('users.status', 'Approved & Accepted')->where('users.active_status', 1)->where('user_roles.is_active', 1)
            ->select('users.user_id', 'users.email')->orderBy('users.user_id')->chunk(100, function ($users) use ($changeId): void {
                foreach ($users as $user) {
                    DB::table('training_notifications')->insert(['status_change_id' => $changeId, 'user_id' => $user->user_id, 'email' => $user->email, 'created_at' => now()]);
                }
            });
        $this->audit($request, 'trainings', $id, 'status_changed', ['status' => $training->status], ['status' => $data['status']]);
    }

    public function attachment(Request $request, int $id): JsonResponse|RedirectResponse
    {
        ModuleAccess::authorize($request, 'trainings.create');
        $data = $request->validate(['kind' => ['required', Rule::in(['Training design', 'Attendance', 'Report', 'Other'])], 'file' => ['required', 'file', 'mimes:pdf,doc,docx', 'extensions:pdf,doc,docx', 'max:10240']]);
        abort_unless($this->query($request, 'trainings')->where('id', $id)->exists(), 404);
        $file = $request->file('file');
        $path = $file->store('training-attachments', 'local');
        try {
            DB::transaction(function () use ($request, $id, $data, $file, $path): void {
                $training = $this->query($request, 'trainings')->where('id', $id)->lockForUpdate()->first();
                abort_unless($training && $training->status === 'For review', 409, 'Attachments can only be added during review.');
                DB::table('training_attachments')->insert(['training_id' => $id, 'kind' => $data['kind'], 'path' => $path, 'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'uploaded_by' => $request->user()->user_id, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('trainings')->where('id', $id)->increment('version');
                $this->audit($request, 'trainings', $id, 'attachment_added');
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return $this->respond($request, 'trainings', $id, 'Attachment uploaded.');
    }

    public function download(Request $request, int $id, int $attachment): StreamedResponse
    {
        ModuleAccess::authorize($request, 'trainings.read');
        abort_unless($this->query($request, 'trainings')->where('id', $id)->exists(), 404);
        $file = DB::table('training_attachments')->where('id', $attachment)->where('training_id', $id)->first();
        abort_unless($file && Storage::disk('local')->exists($file->path), 404);

        return Storage::disk('local')->download($file->path, $file->original_name, ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'no-store, private']);
    }

    public function link(Request $request, int $id): JsonResponse|RedirectResponse
    {
        ModuleAccess::authorize($request, 'trainings.edit');
        $data = $request->validate(['kind' => ['required', Rule::in(['participants', 'resource_persons'])], 'related_id' => ['required', 'integer']]);
        DB::transaction(function () use ($request, $id, $data): void {
            $training = $this->query($request, 'trainings')->where('id', $id)->lockForUpdate()->first();
            abort_unless($training, 404);
            abort_unless($training->status === 'For review', 409, 'Return the training to review before editing enrollment.');
            $related = $this->query($request, $data['kind'])->where('id', $data['related_id'])->where('region_id', $training->region_id)->where('org_id', $training->org_id)->where('is_active', true)->first();
            abort_unless($related, 422, 'Select an active record from the same office.');
            $key = $data['kind'] === 'participants' ? 'participant' : 'resource_person';
            DB::table('training_'.$key)->insertOrIgnore(['training_id' => $id, $key.'_id' => $related->id]);
            DB::table('trainings')->where('id', $id)->increment('version');
            $this->audit($request, 'trainings', $id, 'enrollment_updated');
        });

        return $this->respond($request, 'trainings', $id, 'Enrollment saved.');
    }

    public function evaluation(Request $request): JsonResponse|RedirectResponse
    {
        ModuleAccess::authorize($request, 'evaluations.create');
        $data = $request->validate(['training_id' => ['required', 'integer'], 'questionnaire_id' => ['required', 'integer'], 'participant_id' => ['required', 'integer'], 'answers' => ['required', 'array', 'min:1', 'max:100'], 'answers.*' => ['required', 'string', 'max:4000']]);
        DB::transaction(function () use ($request, $data): void {
            $training = $this->query($request, 'trainings')->where('id', $data['training_id'])->lockForUpdate()->first();
            abort_unless($training, 404);
            abort_unless($training->status === 'Approved & Accepted' && $training->is_active, 409, 'Only approved and accepted, active trainings accept evaluations.');
            $questionnaire = $this->query($request, 'questionnaires')->where('id', $data['questionnaire_id'])->where('org_id', $training->org_id)->where('region_id', $training->region_id)->where('is_active', true)->lockForUpdate()->first();
            abort_unless($questionnaire, 422, 'Select an active questionnaire from the same office.');
            abort_unless($this->query($request, 'participants')->where('id', $data['participant_id'])->where('org_id', $training->org_id)->where('region_id', $training->region_id)->where('is_active', true)->exists()
                && DB::table('training_participant')->where('training_id', $training->id)->where('participant_id', $data['participant_id'])->exists(), 422, 'The participant must be enrolled in this training.');
            abort_unless(count($data['answers']) === count(json_decode($questionnaire->questions, true)), 422, 'Answer every questionnaire item.');
            abort_if(DB::table('evaluation_responses')->where(Arr::only($data, ['training_id', 'questionnaire_id', 'participant_id']))->exists(), 409, 'This participant already has a response for this questionnaire.');
            DB::table('evaluation_responses')->insert(Arr::only($data, ['training_id', 'questionnaire_id', 'participant_id']) + ['answers' => json_encode(array_values($data['answers']), JSON_THROW_ON_ERROR), 'encoded_by' => $request->user()->user_id, 'created_at' => now(), 'updated_at' => now()]);
            $this->audit($request, 'trainings', $training->id, 'evaluation_encoded');
        });

        return $this->respond($request, 'questionnaires', null, 'Evaluation recorded.');
    }

    public function evaluations(Request $request): View|JsonResponse
    {
        ModuleAccess::authorize($request, 'evaluations.read');
        $trainingIds = ModuleAccess::scope(DB::table('trainings')->whereNull('deleted_at'), $request->user())->select('id');
        $responses = DB::table('evaluation_responses')->whereIn('training_id', $trainingIds)->orderByDesc('id')->paginate(25);
        if ($request->expectsJson()) {
            return response()->json($responses);
        }
        $trainingOptions = ModuleAccess::scope(DB::table('trainings')->whereNull('deleted_at')->where('is_active', true)->where('status', 'Approved & Accepted'), $request->user())->orderBy('name')->get(['id', 'name']);
        $questionnaireOptions = ModuleAccess::scope(DB::table('questionnaires')->whereNull('deleted_at')->where('is_active', true), $request->user())->orderBy('name')->get(['id', 'name', 'questions']);
        $participantOptions = ModuleAccess::scope(DB::table('participants')->whereNull('deleted_at')->where('is_active', true), $request->user())->orderBy('name')->get(['id', 'name']);

        return view('admin.operation-evaluations', compact('responses', 'trainingOptions', 'questionnaireOptions', 'participantOptions'));
    }

    public function notifications(Request $request): View|JsonResponse
    {
        $notifications = DB::table('training_notifications')
            ->join('training_status_changes', 'training_notifications.status_change_id', '=', 'training_status_changes.id')
            ->join('trainings', 'training_status_changes.training_id', '=', 'trainings.id')
            ->leftJoin('users as actor', 'training_status_changes.actor_user_id', '=', 'actor.user_id')
            ->leftJoin('organization as actor_office', 'actor.org_id', '=', 'actor_office.org_id')
            ->leftJoin('organization as training_office', 'trainings.org_id', '=', 'training_office.org_id')
            ->where('training_notifications.user_id', $request->user()->user_id)
            ->select(
                'training_notifications.*', 'training_status_changes.training_id', 'training_status_changes.from_status',
                'training_status_changes.to_status', 'training_status_changes.reason', 'training_status_changes.actor_user_id',
                'training_status_changes.created_at as changed_at', 'trainings.name as training_name',
                'training_office.name as training_office_name', 'actor.first_name as actor_first_name',
                'actor.middle_name as actor_middle_name', 'actor.last_name as actor_last_name',
                'actor.extension_name as actor_suffix', 'actor_office.name as actor_office_name',
            )
            ->orderByDesc('training_notifications.id')->paginate(25);

        $display = app(AccountDisplay::class);
        $notifications->getCollection()->transform(function (object $notification) use ($display): object {
            $notification->actor_name = $display->formatName(
                $notification->actor_first_name,
                $notification->actor_middle_name,
                $notification->actor_last_name,
                $notification->actor_suffix,
            );
            $notification->changed_at_human = Carbon::parse($notification->changed_at)
                ->timezone(config('app.timezone'))
                ->format('M j, Y g:i A');
            $notification->title = in_array($notification->to_status, ['For approval', 'For review'], true)
                ? 'Training returned for changes'
                : ($notification->to_status === 'Approved & Accepted' ? 'Training approved and accepted' : 'Training status updated');

            return $notification;
        });

        return $request->expectsJson() ? response()->json($notifications) : view('admin.operation-notifications', compact('notifications'));
    }

    public function queueCounts(Request $request): JsonResponse
    {
        $user = $request->user();
        $trainings = ModuleAccess::scope(
            DB::table('trainings')->whereNull('deleted_at')->where('is_active', true),
            $user,
        );

        return response()->json([
            'for_review' => ModuleAccess::allows($user, 'trainings.submit')
                ? (clone $trainings)->where('status', 'For review')->count()
                : null,
            'for_approval' => ModuleAccess::allows($user, 'trainings.approve')
                ? (clone $trainings)->where('status', 'For approval')->count()
                : null,
            'for_acceptance' => ModuleAccess::allows($user, 'trainings.accept')
                ? (clone $trainings)->where('status', 'For acceptance')->count()
                : null,
        ])->header('Cache-Control', 'no-store, private');
    }

    public function readNotification(Request $request, int $id): RedirectResponse|JsonResponse
    {
        abort_unless(DB::table('training_notifications')->where('id', $id)->where('user_id', $request->user()->user_id)->exists(), 404);
        DB::table('training_notifications')->where('id', $id)->where('user_id', $request->user()->user_id)->update(['read_at' => now()]);

        return $request->expectsJson() ? response()->json(['message' => 'Notification marked read.']) : back();
    }

    public function logs(Request $request): View|JsonResponse
    {
        if (! $request->user()) {
            return view('admin.users.logs');
        }

        $entries = $this->activityEntries($request->user());

        return $request->expectsJson() ? response()->json($entries) : view('admin.users.logs', compact('entries'));
    }

    public function profile(Request $request): View
    {
        return view('admin.users.profile', [
            'profileEntries' => $request->user()
                ? $this->activityEntries($request->user())
                : new \Illuminate\Pagination\LengthAwarePaginator([], 0, 25),
            'isSuperAdministrator' => ModuleAccess::isSuperAdministrator($request->user()),
            'isAdministrator' => ModuleAccess::isAdministrator($request->user()),
            'permissionBreakdown' => $request->user()
                ? ModuleAccess::permissionBreakdown($request->user())
                : ['role' => [], 'credential' => [], 'denied' => []],
        ]);
    }

    /** Present server audit entries as safe, readable summaries without exposing stored values. */
    private function activityEntries(User $user): LengthAwarePaginator
    {
        $entries = DB::table('users_log')
            ->leftJoin('users as actor', 'users_log.actor_user_id', '=', 'actor.user_id')
            ->leftJoin('organization as actor_office', 'actor.org_id', '=', 'actor_office.org_id')
            ->leftJoin('users as subject', 'users_log.user_id', '=', 'subject.user_id')
            ->where('users_log.actor_user_id', $user->user_id)
            ->whereIn('users_log.category', ['account', 'participants', 'trainings', 'associations', 'resource_persons', 'questionnaires', 'evaluation'])
            ->where('users_log.outcome', 'success')
            ->whereNotNull('users_log.event')
            ->select([
                'users_log.reference', 'users_log.user_id', 'users_log.actor_user_id', 'users_log.event',
                'users_log.category', 'users_log.outcome', 'users_log.description', 'users_log.old_values',
                'users_log.new_values', 'users_log.request_id', 'users_log.created_at',
                'subject.email as subject_email',
                'actor.first_name as actor_first_name', 'actor.middle_name as actor_middle_name',
                'actor.last_name as actor_last_name', 'actor.extension_name as actor_suffix',
                'actor_office.name as actor_office_name',
            ])
            ->orderByDesc('users_log.created_at')
            ->orderByDesc('users_log.id')
            ->paginate(25)
            ->withQueryString();

        return $entries->through(function (object $entry): object {
            $event = preg_replace('/_\d+$/', '', (string) $entry->event) ?? (string) $entry->event;
            $category = (string) $entry->category;
            if (str_starts_with($event, $category.'_')) {
                $event = substr($event, strlen($category) + 1);
            }
            $action = $this->activityAction($event);
            $module = match ($category) {
                'trainings' => 'training',
                'associations', 'participants' => 'participants',
                'resource_persons' => 'training',
                'questionnaires', 'evaluation' => 'evaluation',
                'account' => 'administration',
                default => 'system',
            };
            $actorName = app(AccountDisplay::class)->formatName(
                $entry->actor_first_name,
                $entry->actor_middle_name,
                $entry->actor_last_name,
                $entry->actor_suffix,
            );
            if (is_string($entry->actor_office_name) && trim($entry->actor_office_name) !== '') {
                $actorName .= ' - '.$entry->actor_office_name;
            }
            $entry->event = Str::headline(str_replace('_', ' ', $event));
            $entry->title = match ($category) {
                'trainings' => 'Training',
                'participants' => 'Participant',
                'associations' => 'Farmer association',
                'resource_persons' => 'Resource person',
                'questionnaires' => 'Questionnaire',
                'evaluation' => 'Evaluation',
                'account' => 'Account',
                default => Str::headline(str_replace('_', ' ', $category)),
            }.' '.$entry->event;
            $entry->date = $entry->created_at;
            $entry->actor = $actorName;
            $entry->status = $entry->outcome;
            $entry->module = $module;
            $entry->action = $action;
            $entry->source = match ($category) {
                'account' => 'account',
                'resource_persons' => 'resource',
                'associations' => 'association',
                default => $category,
            };
            $beforeValues = $this->auditValues($entry->old_values);
            $afterValues = $this->auditValues($entry->new_values);
            $entry->account_email = $afterValues['email'] ?? $beforeValues['email'] ?? $entry->subject_email;
            $reportedFields = is_array($afterValues['changed_fields'] ?? null) ? $afterValues['changed_fields'] : [];
            $changedFields = array_values(array_unique(array_merge(
                $reportedFields,
                array_diff(array_keys($afterValues), array_keys($beforeValues)),
                array_filter(array_keys($beforeValues), fn (string $field): bool => array_key_exists($field, $afterValues) && $beforeValues[$field] !== $afterValues[$field]),
            )));
            $entry->description = $this->humanActivityDescription($action, $category, $changedFields);
            $entry->category = match ($action) {
                'create' => 'registration',
                'status', 'approve', 'reject' => 'status',
                'attachment' => 'attachment',
                default => $category === 'account' ? 'profile' : 'status',
            };
            unset(
                $entry->user_id,
                $entry->actor_user_id,
                $entry->subject_email,
                $entry->actor_first_name,
                $entry->actor_middle_name,
                $entry->actor_last_name,
                $entry->actor_suffix,
                $entry->actor_office_name,
                $entry->old_values,
                $entry->new_values,
                $entry->request_id,
            );

            return $entry;
        });
    }

    /** Turn validated changed-field names into a short audit sentence while omitting private values. */
    /** Format activity as a readable event summary from safe field names, never stored values. */
    private function humanActivityDescription(string $action, string $category, array $changedFields): string
    {
        $recordName = match ($category) {
            'trainings' => 'training record',
            'participants' => 'participant record',
            'associations' => 'farmer association record',
            'resource_persons' => 'resource person record',
            'questionnaires' => 'questionnaire',
            'evaluation' => 'evaluation record',
            'account' => 'account details',
            default => Str::headline(str_replace('_', ' ', $category)).' record',
        };
        $fieldLabels = [
            'name' => 'name', 'description' => 'description', 'start_date' => 'start date', 'end_date' => 'end date',
            'venue' => 'venue', 'budget' => 'budget', 'is_active' => 'active status', 'status' => 'status',
            'region_id' => 'region', 'org_id' => 'office', 'changed_fields' => null, 'version' => null,
            'created_by' => null, 'updated_at' => null, 'deleted_at' => null, 'ui_version' => null,
            'email' => 'email address', 'phone' => 'phone number', 'date_of_birth' => 'date of birth',
            'position' => 'position', 'role_id' => 'role', 'role_credential_id' => 'access profile',
            'active_status' => 'account status', 'email_verified' => 'email verification',
            'first_name' => 'first name', 'middle_name' => 'middle name', 'last_name' => 'last name',
            'suffix' => 'suffix', 'sex' => 'sex', 'address' => 'address', 'expertise' => 'expertise',
            'kind' => 'questionnaire type', 'questions' => 'questions', 'training_id' => 'training',
            'training_type' => 'training type', 'delivery_mode' => 'delivery mode', 'target_participants' => 'target participants',
            'partner_organization' => 'partner organization', 'year_covered' => 'year covered', 'short_name' => 'short name',
            'organization_type' => 'organization type', 'registration_date' => 'registration date', 'nationality' => 'nationality',
            'place_of_birth' => 'place of birth', 'house_number' => 'house / building number', 'street' => 'street / purok / sitio',
            'postal_code' => 'postal code', 'telephone' => 'telephone', 'association_role' => 'association role',
            'title' => 'professional title', 'qualification' => 'qualification', 'organization_name' => 'organization / office',
            'district' => 'district', 'province' => 'province', 'municipality' => 'municipality / city', 'barangay' => 'barangay',
            'extension_name' => 'suffix', 'mobile_number' => 'phone number', 'is_updated_at' => null,
        ];
        $labels = array_values(array_filter(array_unique(array_map(
            fn (string $field): ?string => $fieldLabels[$field] ?? null,
            array_filter($changedFields, 'is_string'),
        ))));
        $verb = match ($action) {
            'create' => 'Created', 'delete' => 'Deleted', 'restore' => 'Restored', 'status' => 'Changed the status of',
            'approve' => 'Approved', 'reject' => 'Rejected', 'attachment' => 'Updated an attachment for',
            default => 'Updated',
        };
        $summary = $verb.' '.$recordName;

        return $summary.($labels !== [] ? ' (changed: '.implode(', ', $labels).').' : '.');
    }

    /** Compare validated edits with the locked row to avoid reporting fields that stayed unchanged. */
    private function changedFieldNames(object $record, array $changes): array
    {
        $ignoredFields = ['version', 'ui_version', 'created_at', 'updated_at', 'deleted_at'];
        $changedFields = [];

        foreach ($changes as $field => $value) {
            if (in_array($field, $ignoredFields, true)) {
                continue;
            }

            $previousValue = $record->{$field} ?? null;
            if ($field === 'questions' && is_string($previousValue)) {
                $previousValue = json_decode($previousValue, true);
            }
            $matches = $previousValue === $value
                || (is_scalar($previousValue) && is_scalar($value) && (string) $previousValue === (string) $value);

            if (! $matches) {
                $changedFields[] = $field;
            }
        }

        return $changedFields;
    }

    private function activityAction(string $event): string
    {
        return match (true) {
            str_contains($event, 'attachment') => 'attachment',
            str_contains($event, 'delete') => 'delete',
            str_contains($event, 'restore') => 'restore',
            str_contains($event, 'approve') => 'approve',
            str_contains($event, 'reject') => 'reject',
            str_contains($event, 'status') => 'status',
            str_contains($event, 'create') => 'create',
            default => 'update',
        };
    }

    /** @return array<string, mixed> */
    private function auditValues(mixed $values): array
    {
        if (is_array($values)) {
            return $values;
        }

        if (! is_string($values) || $values === '') {
            return [];
        }

        $decoded = json_decode($values, true);

        return is_array($decoded) ? $decoded : [];
    }

    /** @param array<string, mixed> $before
     * @param  array<string, mixed>  $after
     */
    /** Write safe audit metadata, including changed field names but never operational field values. */
    private function audit(Request $request, string $module, int $id, string $event, array $before = [], array $after = []): void
    {
        AuditTrail::record($request, $module.'_'.$event.'_'.$id, $request->user(), $before, $after, category: $module);
        if ($module === 'trainings') {
            DB::table('trainings_log')->insert(['training_id' => (string) $id, 'actor_user_id' => $request->user()->user_id, 'event' => $event, 'category' => 'training', 'outcome' => 'success', 'old_values' => json_encode($before, JSON_THROW_ON_ERROR), 'new_values' => json_encode($after, JSON_THROW_ON_ERROR), 'request_id' => $request->attributes->get('audit_request_id'), 'created_at' => now()]);
        }
    }

    private function respond(Request $request, string $module, ?int $id, string $message, int $status = 200): RedirectResponse|JsonResponse
    {
        return $request->expectsJson() ? response()->json(['message' => $message, 'id' => $id], $status)
            : redirect()->route('operations.index', array_filter(['module' => $module, 'id' => $id]))->with('operation_message', $message);
    }
}
