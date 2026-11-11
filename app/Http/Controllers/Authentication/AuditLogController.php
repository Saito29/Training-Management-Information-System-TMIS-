<?php

namespace App\Http\Controllers\Authentication;

use App\Http\Authentication\AccountDisplay;
use App\Http\Authentication\AuditTrail;
use App\Mail\AuditDeletionRequested;
use App\Support\ModuleAccess;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class AuditLogController
{
    public function index(Request $request): JsonResponse|RedirectResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        if (! $request->expectsJson()) {
            return redirect()->to(route('admin.users.profile').'#audit');
        }

        $filters = $this->validatedFilters($request);
        $perPage = $request->validate(['per_page' => ['nullable', 'integer', 'min:1', 'max:100']])['per_page'] ?? 25;
        $entries = $this->query($filters)
            ->orderByDesc('users_log.created_at')
            ->orderByDesc('users_log.id')
            ->paginate((int) $perPage)
            ->withQueryString()
            ->through(fn (object $entry): object => $this->present($entry));

        return response()->json($entries);
    }

    public function export(Request $request): StreamedResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $filters = $this->validatedFilters($request);
        $data = $request->validate([
            'format' => ['required', Rule::in(['csv', 'txt'])],
            'filename' => ['nullable', 'string', 'max:80', 'regex:/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/'],
        ]);
        $format = $data['format'];
        $entries = $this->query($filters)->orderByDesc('users_log.created_at')->orderByDesc('users_log.id')->cursor();
        $filename = ($data['filename'] ?? 'tmis-account-security-audit-'.now()->format('Ymd-His')).'.'.$format;

        return response()->streamDownload(function () use ($entries, $format): void {
            if ($format === 'csv') {
                $output = fopen('php://output', 'wb');
                if ($output === false) {
                    throw new \RuntimeException('Unable to open the audit export stream.');
                }
                fwrite($output, "\xEF\xBB\xBF");
                fputcsv($output, ['Reference', 'Time (Asia/Manila)', 'Actor', 'Account', 'Account email', 'Event', 'Result', 'IP address', 'Details']);
                foreach ($entries as $entry) {
                    $entry = $this->present($entry);
                    fputcsv($output, array_map($this->spreadsheetSafe(...), [
                        $entry->reference,
                        $entry->created_at,
                        $entry->actor_name,
                        $entry->user_name,
                        $entry->account_email,
                        $entry->event,
                        $entry->outcome,
                        $entry->ip_address,
                        $entry->description,
                    ]));
                }
                fclose($output);

                return;
            }

            foreach ($entries as $entry) {
                $entry = $this->present($entry);
                echo implode("\n", [
                    'Reference: '.$entry->reference,
                    'Time (Asia/Manila): '.$entry->created_at,
                    'Actor: '.$entry->actor_name,
                    'Account: '.$entry->user_name,
                    'Account email: '.($entry->account_email ?? 'Not recorded'),
                    'Event: '.$entry->event,
                    'Result: '.$entry->outcome,
                    'IP address: '.$entry->ip_address,
                    'Details: '.$entry->description,
                    str_repeat('-', 72),
                ])."\n";
            }
        }, $filename, ['Content-Type' => $format === 'csv' ? 'text/csv; charset=UTF-8' : 'text/plain; charset=UTF-8']);
    }

    public function destroy(Request $request): RedirectResponse|JsonResponse
    {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        $filters = $this->validatedFilters($request);
        $selection = $request->validate([
            'ids' => ['nullable', 'array', 'max:100'],
            'ids.*' => ['required', 'integer', 'distinct'],
            'delete_all_filtered' => ['nullable', 'boolean'],
        ]);
        $deleteAllFiltered = $request->boolean('delete_all_filtered');
        $ids = $selection['ids'] ?? [];
        if ($deleteAllFiltered === ! empty($ids)) {
            throw ValidationException::withMessages([
                'ids' => 'Select audit entries or choose all entries matching the filters.',
            ]);
        }

        $filteredIds = $this->query($filters)->select('users_log.id');
        if (! $deleteAllFiltered) {
            $filteredIds->whereIn('users_log.id', $ids);
        }
        $selectedIds = (clone $filteredIds)->pluck('users_log.id')->map(static fn (int|string $id): int => (int) $id)->all();
        if ($selectedIds === []) {
            throw ValidationException::withMessages(['ids' => 'No matching audit entries were available to request for deletion.']);
        }

        $reviewers = DB::table('system_super_admins as assignments')
            ->join('users as reviewers', 'reviewers.user_id', '=', 'assignments.user_id')
            ->join('user_roles as roles', 'roles.role_id', '=', 'reviewers.role_id')
            ->where('roles.name', 'System Administrator')
            ->where('roles.is_active', 1)
            ->where('reviewers.status', 'Approved & Accepted')
            ->where('reviewers.active_status', 1)
            ->whereNull('reviewers.deleted_at')
            ->where('reviewers.user_id', '!=', $request->user()->user_id)
            ->select([
                'reviewers.user_id',
                'reviewers.email',
                'reviewers.first_name',
                'reviewers.middle_name',
                'reviewers.last_name',
                'reviewers.extension_name',
            ])
            ->get();
        abort_if($reviewers->isEmpty(), 409, 'No active Super Admin is available to review this deletion request.');

        $reference = Str::upper(Str::random(16));
        $deletionRequestId = DB::transaction(function () use ($request, $filters, $deleteAllFiltered, $selectedIds, $reference, $reviewers): int {
            $id = DB::table('audit_deletion_requests')->insertGetId([
                'reference' => $reference,
                'requester_user_id' => $request->user()->user_id,
                'filters' => json_encode($filters, JSON_THROW_ON_ERROR),
                'selected_ids' => json_encode($selectedIds, JSON_THROW_ON_ERROR),
                'delete_all_filtered' => $deleteAllFiltered,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $batchId = (string) Str::uuid();
            foreach ($reviewers as $reviewer) {
                DB::table('user_notifications')->insert([
                    'ui_id' => (string) Str::uuid(),
                    'batch_id' => $batchId,
                    'recipient_id' => $reviewer->user_id,
                    'creator_id' => $request->user()->user_id,
                    'title' => 'Audit deletion approval required',
                    'summary' => 'Review request '.$reference,
                    'message' => 'A System Administrator requested permanent deletion of '.($deleteAllFiltered ? 'all matching audit entries' : count($selectedIds).' selected audit entries').'. Review the request before any records are deleted.',
                    'type' => 'system',
                    'priority' => 'high',
                    'reference' => $reference,
                    'related_page' => 'users/profile',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $id;
        });

        $requester = app(AccountDisplay::class)->formatName(
            $request->user()->first_name,
            $request->user()->middle_name,
            $request->user()->last_name,
            $request->user()->extension_name,
        );
        $mailFailures = 0;
        foreach ($reviewers as $reviewer) {
            try {
                Mail::to($reviewer->email)->send(new AuditDeletionRequested(
                    $reference,
                    $requester,
                    $deleteAllFiltered ? null : count($selectedIds),
                    route('admin.users.profile').'#audit',
                ));
            } catch (TransportExceptionInterface $exception) {
                report($exception);
                $mailFailures++;
            }
        }
        if ($mailFailures > 0) {
            throw ValidationException::withMessages([
                'email' => 'The deletion request is pending and Super Admins were notified in-app, but one or more email alerts could not be sent.',
            ]);
        }

        return $request->expectsJson()
            ? response()->json(['message' => 'Deletion request sent to Super Admins for approval.', 'reference' => $reference, 'request_id' => $deletionRequestId], 202)
            : back()->with('operation_message', 'Deletion request sent to Super Admins for approval.');
    }

    public function pendingDeletions(Request $request): JsonResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);
        $display = app(AccountDisplay::class);
        $requests = DB::table('audit_deletion_requests as requests')
            ->join('users as requesters', 'requesters.user_id', '=', 'requests.requester_user_id')
            ->where('requests.status', 'pending')
            ->orderBy('requests.created_at')
            ->get([
                'requests.id',
                'requests.reference',
                'requests.filters',
                'requests.selected_ids',
                'requests.delete_all_filtered',
                'requests.created_at',
                'requesters.user_id as requester_id',
                'requesters.first_name',
                'requesters.middle_name',
                'requesters.last_name',
                'requesters.extension_name',
            ])
            ->map(static function (object $deletionRequest) use ($display, $request): array {
                $ids = is_string($deletionRequest->selected_ids)
                    ? json_decode($deletionRequest->selected_ids, true)
                    : $deletionRequest->selected_ids;

                return [
                    'id' => $deletionRequest->id,
                    'reference' => $deletionRequest->reference,
                    'requester' => $display->formatName(
                        $deletionRequest->first_name,
                        $deletionRequest->middle_name,
                        $deletionRequest->last_name,
                        $deletionRequest->extension_name,
                    ),
                    'can_review' => (int) $deletionRequest->requester_id !== (int) $request->user()->user_id,
                    'delete_all_filtered' => (bool) $deletionRequest->delete_all_filtered,
                    'selected_count' => is_array($ids) ? count($ids) : null,
                    'filters' => is_string($deletionRequest->filters)
                        ? json_decode($deletionRequest->filters, true)
                        : $deletionRequest->filters,
                    'created_at' => $deletionRequest->created_at,
                ];
            });

        return response()->json(['data' => $requests]);
    }

    public function resolveDeletion(Request $request, int $id): JsonResponse
    {
        abort_unless(ModuleAccess::isSuperAdministrator($request->user()), 403);
        $action = $request->validate(['action' => ['required', Rule::in(['approve', 'reject'])]])['action'];
        $message = DB::transaction(function () use ($request, $id, $action): string {
            $deletionRequest = DB::table('audit_deletion_requests')->where('id', $id)->lockForUpdate()->first();
            abort_unless($deletionRequest, 404);
            abort_unless($deletionRequest->status === 'pending', 409, 'This deletion request has already been reviewed.');
            abort_if(
                (int) $deletionRequest->requester_user_id === (int) $request->user()->user_id,
                403,
                'A different Super Admin must review this deletion request.',
            );

            $selectedIds = is_string($deletionRequest->selected_ids) ? json_decode($deletionRequest->selected_ids, true) : $deletionRequest->selected_ids;
            $selectedIds = is_array($selectedIds) ? $selectedIds : [];

            $deleted = 0;
            if ($action === 'approve') {
                $deleted = DB::table('users_log')->whereIn('id', $selectedIds)->delete();
                abort_if($deleted === 0, 409, 'No audit entries still match this deletion request.');
            }

            $status = $action === 'approve' ? 'approved' : 'rejected';
            DB::table('audit_deletion_requests')->where('id', $id)->update([
                'status' => $status,
                'reviewed_by' => $request->user()->user_id,
                'reviewed_at' => now(),
                'updated_at' => now(),
            ]);
            AuditTrail::record(
                $request,
                $action === 'approve' ? 'audit_logs_permanently_deleted' : 'audit_deletion_request_rejected',
                before: ['status' => 'pending'],
                after: ['status' => $status, 'deleted_count' => $deleted, 'reference' => $deletionRequest->reference],
                category: 'settings',
            );

            return $action === 'approve'
                ? $deleted.' audit entries permanently deleted.'
                : 'Audit deletion request rejected.';
        });

        return response()->json(['message' => $message]);
    }

    /**
     * @param  array{user?: string, event?: string, category?: string, from?: string, to?: string}  $filters
     */
    private function query(array $filters): Builder
    {
        $query = DB::table('users_log')
            ->leftJoin('users as actor', 'users_log.actor_user_id', '=', 'actor.user_id')
            ->leftJoin('organization as actor_office', 'actor.org_id', '=', 'actor_office.org_id')
            ->leftJoin('region as actor_region', 'actor.region_id', '=', 'actor_region.region_id')
            ->leftJoin('user_roles as actor_roles', 'actor.role_id', '=', 'actor_roles.role_id')
            ->leftJoin('users as subject', 'users_log.user_id', '=', 'subject.user_id')
            ->leftJoin('organization as subject_office', 'subject.org_id', '=', 'subject_office.org_id')
            ->leftJoin('region as subject_region', 'subject.region_id', '=', 'subject_region.region_id')
            ->select([
                'users_log.*',
                'actor.first_name as actor_first_name',
                'actor.middle_name as actor_middle_name',
                'actor.last_name as actor_last_name',
                'actor.extension_name as actor_suffix',
                'actor_office.name as actor_office_name',
                'actor_region.name as actor_region_name',
                'actor_roles.name as actor_role_name',
                'subject.first_name as subject_first_name',
                'subject.middle_name as subject_middle_name',
                'subject.last_name as subject_last_name',
                'subject.extension_name as subject_suffix',
                'subject.email as subject_email',
                'subject_office.name as subject_office_name',
                'subject_region.name as subject_region_name',
            ]);

        foreach (['event', 'category'] as $field) {
            if (! empty($filters[$field])) {
                $query->where('users_log.'.$field, $filters[$field]);
            }
        }
        if (! empty($filters['from'])) {
            $query->whereDate('users_log.created_at', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate('users_log.created_at', '<=', $filters['to']);
        }
        if (! empty($filters['user'])) {
            $search = '%'.$filters['user'].'%';
            $query->where(function (Builder $query) use ($search): void {
                foreach (['actor', 'subject'] as $alias) {
                    foreach (['first_name', 'middle_name', 'last_name', 'extension_name'] as $column) {
                        $query->orWhere($alias.'.'.$column, 'like', $search);
                    }
                    $query->orWhere($alias.'_office.name', 'like', $search);
                    $query->orWhere($alias.'.email', 'like', $search);
                }
            });
        }

        return $query;
    }

    /** @return array{user?: string, event?: string, category?: string, from?: string, to?: string} */
    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'user' => ['nullable', 'string', 'max:150'],
            'event' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:50'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);
    }

    private function present(object $entry): object
    {
        $display = app(AccountDisplay::class);
        $entry->actor_name = $this->accountName(
            $display,
            $entry->actor_first_name,
            $entry->actor_middle_name,
            $entry->actor_last_name,
            $entry->actor_suffix,
            $entry->actor_office_name,
            $entry->actor_region_name,
        );
        $entry->user_name = $this->accountName(
            $display,
            $entry->subject_first_name,
            $entry->subject_middle_name,
            $entry->subject_last_name,
            $entry->subject_suffix,
            $entry->subject_office_name,
            $entry->subject_region_name,
            $entry->user_id === null ? '—' : 'Account unavailable',
        );
        $entry->account_email = $entry->subject_email;
        $rawEvent = (string) $entry->event;
        $event = preg_replace('/_\d+$/', '', $rawEvent) ?? $rawEvent;
        $entry->event = $event === '' ? 'Unspecified event' : Str::headline(str_replace('_', ' ', $event));
        $beforeValues = $this->auditValues($entry->old_values);
        $afterValues = $this->auditValues($entry->new_values);
        $entry->description = $this->humanDescription(
            $rawEvent,
            (string) $entry->category,
            $entry->actor_name,
            $entry->user_name,
            $beforeValues,
            $afterValues,
        );
        unset(
            $entry->user_id,
            $entry->actor_user_id,
            $entry->actor_first_name,
            $entry->actor_middle_name,
            $entry->actor_last_name,
            $entry->actor_suffix,
            $entry->actor_office_name,
            $entry->actor_region_name,
            $entry->actor_role_name,
            $entry->subject_first_name,
            $entry->subject_middle_name,
            $entry->subject_last_name,
            $entry->subject_suffix,
            $entry->subject_email,
            $entry->subject_office_name,
            $entry->subject_region_name,
            $entry->old_values,
            $entry->new_values,
        );

        return $entry;
    }

    private function accountName(
        AccountDisplay $display,
        ?string $firstName,
        ?string $middleName,
        ?string $lastName,
        ?string $suffix,
        ?string $officeName,
        ?string $regionName = null,
        string $fallback = 'System / guest',
    ): string {
        if ($firstName === null && $middleName === null && $lastName === null) {
            return $fallback;
        }

        $name = $display->formatName($firstName, $middleName, $lastName, $suffix);

        $location = implode(', ', array_filter([
            is_string($officeName) && trim($officeName) !== '' ? trim($officeName) : null,
            is_string($regionName) && trim($regionName) !== '' ? trim($regionName) : null,
        ]));

        return $location !== '' ? $name.' - '.$location : $name;
    }

    /** @param array<string, mixed> $before
     * @param  array<string, mixed>  $after
     */
    private function humanDescription(
        string $rawEvent,
        string $category,
        string $actor,
        string $subject,
        array $before,
        array $after,
    ): string {
        if (preg_match('/^role_permissions_updated_(\d+)$/', $rawEvent, $matches) === 1) {
            $roleName = $after['role_name'] ?? $before['role_name'] ?? 'Role '.$matches[1];
            $added = array_values(array_diff($after['permissions'] ?? [], $before['permissions'] ?? []));
            $removed = array_values(array_diff($before['permissions'] ?? [], $after['permissions'] ?? []));
            $changes = [];
            if ($added !== []) {
                $changes[] = 'added '.implode(', ', array_map($this->permissionLabel(...), $added));
            }
            if ($removed !== []) {
                $changes[] = 'removed '.implode(', ', array_map($this->permissionLabel(...), $removed));
            }

            return $actor.' updated permissions for the “'.$roleName.'” role'.($changes ? ': '.implode('; ', $changes).'.' : '.');
        }

        if (preg_match('/^role_credential_(created|updated|deleted)_\d+$/', $rawEvent, $matches) === 1) {
            $action = match ($matches[1]) {
                'created' => 'created',
                'deleted' => 'removed',
                default => 'updated',
            };
            $roleName = $after['role_name'] ?? $before['role_name'] ?? 'unknown role';
            $profileName = $after['access_profile_name'] ?? $before['access_profile_name'] ?? 'unnamed access profile';
            $grants = array_values(array_diff($after['permissions'] ?? [], $before['permissions'] ?? []));
            $blocks = array_values(array_diff($after['denied_permissions'] ?? [], $before['denied_permissions'] ?? []));
            $details = [];
            if ($grants !== []) {
                $details[] = 'granted '.implode(', ', array_map($this->permissionLabel(...), $grants));
            }
            if ($blocks !== []) {
                $details[] = 'blocked '.implode(', ', array_map($this->permissionLabel(...), $blocks));
            }

            return $actor.' '.$action.' the '.$profileName.' access profile for accounts with the '.$roleName.' role'.($details ? ': '.implode('; ', $details).'.' : '.');
        }

        if (preg_match('/^(trainings|associations|participants)_document_(uploaded|updated|deleted)_\d+$/', $rawEvent, $matches) === 1) {
            $module = match ($matches[1]) {
                'trainings' => 'training',
                'associations' => 'farmer association',
                default => 'participant',
            };
            $action = match ($matches[2]) {
                'uploaded' => 'added',
                'deleted' => 'removed',
                default => 'updated',
            };
            $document = $after['document_name'] ?? $before['document_name'] ?? 'an attachment';
            $record = $after['record_name'] ?? $before['record_name'] ?? $module.' record';
            $kind = $after['document_kind'] ?? $before['document_kind'] ?? 'file';
            $recordLocation = implode(', ', array_filter([$after['office_name'] ?? $before['office_name'] ?? null, $after['region_name'] ?? $before['region_name'] ?? null]));
            $year = $after['document_year'] ?? $before['document_year'] ?? null;
            $yearDetails = is_numeric($year) ? ' for '.$year : '';

            return $actor.' '.$action.' the '.$kind.' attachment “'.$document.'”'.$yearDetails.' for '.$module.' “'.$record.'”'.($recordLocation !== '' ? ' at '.$recordLocation : '').'.';
        }

        if (in_array($rawEvent, ['account_approved', 'account_rejected'], true)) {
            $decision = $rawEvent === 'account_approved' ? 'approved' : 'rejected';

            return $actor.' '.$decision.' the user account of '.$subject.'.';
        }

        if (str_starts_with($rawEvent, 'account_access_')) {
            $changes = $this->changedFields($before, $after);
            if (($before['role_id'] ?? null) !== ($after['role_id'] ?? null)) {
                $changes = array_values(array_filter($changes, static fn (string $change): bool => ! str_starts_with($change, 'role changed')));
                $changes[] = 'account role changed from '.$this->auditValue('role_id', $before['role_id'] ?? null).' to '.$this->auditValue('role_id', $after['role_id'] ?? null);
            }
            $action = str_ends_with($rawEvent, '_delete') ? 'moved the user account of '.$subject.' to trash' : (str_ends_with($rawEvent, '_restore') ? 'restored the user account of '.$subject : 'updated the user account of '.$subject);

            return $actor.' '.$action.($changes ? ': '.implode('; ', $changes).'.' : '.');
        }

        if (in_array($rawEvent, ['account_profile_updated', 'profile_updated'], true)) {
            $changedFields = $this->changedFields($before, $after);
            if (is_array($after['changed_fields'] ?? null)) {
                foreach ($after['changed_fields'] as $field) {
                    if (is_string($field)) {
                        $changedFields[] = $this->fieldLabel($field);
                    }
                }
                $changedFields = array_values(array_unique($changedFields));
            }
            $action = $rawEvent === 'profile_updated'
                ? 'updated their own account information'
                : 'updated the account information of '.$subject;

            return $actor.' '.$action.($changedFields ? ': '.implode('; ', $changedFields).'.' : '.');
        }

        if ($rawEvent === 'office_notification_created') {
            $notificationTitle = $after['notification_title'] ?? 'Untitled notification';
            $notificationType = $after['notification_type'] ?? 'system';
            $recipientCount = max(0, (int) ($after['recipient_count'] ?? 0));
            $announcement = match ($notificationType) {
                'system' => 'system announcement',
                'account' => 'account notification',
                'training' => 'training notification',
                'participants' => 'participant notification',
                'evaluation' => 'evaluation notification',
                default => 'notification',
            };

            return $actor.' published the '.$announcement.' “'.$notificationTitle.'” to '.$recipientCount.' '.($recipientCount === 1 ? 'user' : 'users').'.';
        }

        $event = preg_replace('/_\d+$/', '', $rawEvent) ?? $rawEvent;
        $action = match (true) {
            str_contains($event, 'created'), str_contains($event, 'registered') => 'created',
            str_contains($event, 'deleted'), str_contains($event, 'removed') => 'removed',
            str_contains($event, 'restored') => 'restored',
            str_contains($event, 'updated'), str_contains($event, 'changed'), str_contains($event, 'revoked'), str_contains($event, 'granted') => 'updated',
            default => 'recorded',
        };
        $area = match ($category) {
            'security' => 'security settings',
            'settings' => 'system settings',
            'trainings' => 'training record',
            'participants' => 'participant record',
            'associations' => 'farmer association record',
            'resource_persons' => 'resource person record',
            'questionnaires', 'evaluation' => 'evaluation record',
            'account' => 'account details',
            default => Str::headline(str_replace('_', ' ', $category)).' record',
        };
        $target = $subject && $subject !== $actor && $subject !== '—' ? ' for '.$subject : '';

        return $actor.' '.$action.' '.$area.$target.'.';
    }

    /** @param array<string, mixed> $before
     * @param  array<string, mixed>  $after
     * @return array<int, string>
     */
    private function changedFields(array $before, array $after): array
    {
        $labels = [
            'role_id' => 'role', 'role_credential_id' => 'access profile', 'region_id' => 'region',
            'org_id' => 'office', 'status' => 'account status', 'active_status' => 'active status',
            'email_verified' => 'email verification', 'super_admin' => 'Super Admin access',
            'first_name' => 'first name', 'middle_name' => 'middle name', 'last_name' => 'last name',
            'extension_name' => 'name suffix', 'email' => 'email address', 'date_of_birth' => 'date of birth',
            'mobile_number' => 'mobile number', 'position' => 'position',
        ];
        $changes = [];
        foreach ($labels as $field => $label) {
            if (array_key_exists($field, $before) && array_key_exists($field, $after) && $before[$field] !== $after[$field]) {
                $changes[] = $label.' changed from '.$this->auditValue($field, $before[$field]).' to '.$this->auditValue($field, $after[$field]);
            }
        }

        return $changes;
    }

    /** Convert an audited account field identifier into a readable change description. */
    private function fieldLabel(string $field): string
    {
        return match ($field) {
            'first_name' => 'first name updated',
            'middle_name' => 'middle name updated',
            'last_name' => 'last name updated',
            'extension_name' => 'name suffix updated',
            'email' => 'email address updated',
            'date_of_birth' => 'date of birth updated',
            'mobile_number' => 'mobile number updated',
            'position' => 'position updated',
            'role_id' => 'role updated',
            'role_credential_id' => 'access profile updated',
            'region_id' => 'region updated',
            'org_id' => 'office updated',
            'status' => 'account status updated',
            'active_status' => 'activation status updated',
            default => 'account details updated',
        };
    }

    private function permissionLabel(string $permission): string
    {
        return Str::headline(str_replace(['.', '_'], ' ', $permission));
    }

    private function auditValue(string $field, mixed $value): string
    {
        if ($field === 'role_id' && is_numeric($value)) {
            static $roleNames = [];
            $id = (int) $value;

            return $roleNames[$id] ??= DB::table('user_roles')->where('role_id', $id)->value('name') ?? 'Unknown role';
        }

        if ($field === 'role_credential_id' && is_numeric($value)) {
            static $credentialNames = [];
            $id = (int) $value;

            return $credentialNames[$id] ??= DB::table('role_credentials')->where('role_credential_id', $id)->value('name') ?? 'Unknown access profile';
        }

        if ($field === 'region_id' && is_numeric($value)) {
            static $regionNames = [];
            $id = (int) $value;

            return $regionNames[$id] ??= DB::table('region')->where('region_id', $id)->value('name') ?? 'Unknown region';
        }

        if ($field === 'org_id' && is_numeric($value)) {
            static $officeNames = [];
            $id = (int) $value;

            return $officeNames[$id] ??= DB::table('organization')->where('org_id', $id)->value('name') ?? 'Unknown office';
        }

        if (is_bool($value) || $value === 0 || $value === 1 || $value === '0' || $value === '1') {
            return (bool) $value ? 'enabled' : 'disabled';
        }

        if (is_array($value)) {
            return implode(', ', array_map(fn (mixed $item): string => is_scalar($item) ? (string) $item : '', $value));
        }

        return is_scalar($value) && trim((string) $value) !== '' ? (string) $value : 'not recorded';
    }

    /** @return array<string, mixed> */
    private function auditValues(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function spreadsheetSafe(mixed $value): string
    {
        $text = (string) $value;

        return preg_match('/^[\x00-\x20]*[=+\-@]/', $text) === 1 ? "'".$text : $text;
    }
}
