<?php

namespace App\Support;

use App\Http\Authentication\AccountDisplay;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AccountUpdateNotifier
{
    /** Store an actor-attributed notice for the account whose access or information changed. */
    public function notify(Request $request, User $subject, array $changedFields, string $action = 'updated', array $before = [], array $after = []): void
    {
        $actor = $request->user();
        if (! $actor || (int) $actor->user_id === (int) $subject->user_id || $changedFields === []) {
            return;
        }

        $display = app(AccountDisplay::class);
        $actorProfile = $display->forUser($actor->fresh() ?? $actor);
        $subjectProfile = $display->forUser($subject->fresh() ?? $subject);
        $actorName = $actorProfile['navigationName'] ?: 'A System Administrator';
        $subjectName = $subjectProfile['navigationName'] ?: 'the account holder';
        $actorOffice = $actorProfile['office'] ?: 'office not assigned';
        $actorRegion = $actorProfile['region'] ?: 'region not assigned';
        $actorRole = $actorProfile['role'] ?: 'System user';
        $subjectOffice = $subjectProfile['office'] ?: 'office not assigned';
        $subjectRegion = $subjectProfile['region'] ?: 'region not assigned';
        $fieldLabels = [
            'role_id' => 'role',
            'role_credential_id' => 'access profile',
            'region_id' => 'region',
            'org_id' => 'office',
            'status' => 'account approval status',
            'active_status' => 'account activation status',
            'deleted_at' => 'account availability',
            'first_name' => 'first name',
            'middle_name' => 'middle name',
            'last_name' => 'last name',
            'extension_name' => 'name suffix',
            'email' => 'email address',
            'date_of_birth' => 'date of birth',
            'mobile_number' => 'mobile number',
            'position' => 'position',
        ];
        $changedLabels = array_values(array_unique(array_map(
            static fn (string $field): string => $fieldLabels[$field] ?? str_replace('_', ' ', $field),
            array_filter($changedFields, 'is_string'),
        )));
        $roleChanged = in_array('role_id', $changedFields, true) && ($before['role_id'] ?? null) != ($after['role_id'] ?? null);
        $credentialChanged = in_array('role_credential_id', $changedFields, true)
            && ($before['role_credential_id'] ?? null) != ($after['role_credential_id'] ?? null);
        $accessSuspended = $action === 'delete'
            || (in_array('active_status', $changedFields, true) && (int) ($before['active_status'] ?? 0) === 1 && (int) ($after['active_status'] ?? 0) === 0);
        $accessRevoked = $action === 'rejected' || ($after['status'] ?? null) === 'Rejected';
        if ($roleChanged) {
            $oldRole = $this->roleName($before['role_id'] ?? null) ?: 'no role';
            $newRole = $this->roleName($after['role_id'] ?? null) ?: 'no role';
            $changedLabels = array_values(array_filter($changedLabels, static fn (string $label): bool => $label !== 'role'));
            $changedLabels[] = 'account role changed from '.($oldRole ?: 'unknown role').' to '.($newRole ?: 'unknown role');
        }
        $actionText = match ($action) {
            'approved' => 'approved',
            'rejected' => 'rejected',
            'delete' => 'moved to trash',
            'restore' => 'restored',
            default => 'updated',
        };
        $changeText = $changedLabels === [] ? '' : ' Updated information: '.implode(', ', $changedLabels).'.';
        $notificationTitle = match ($action) {
            'approved' => 'Your account was approved',
            'rejected' => 'Your account was rejected',
            'delete' => 'Your account was moved to trash',
            'restore' => 'Your account was restored',
            default => 'Your account information was updated',
        };
        $now = now();
        $summary = $actorName.' ('.$actorRole.', '.$actorOffice.', '.$actorRegion.') '.$actionText.' '.$subjectName."'s account.";
        $message = $actorName.' ('.$actorRole.', '.$actorOffice.', '.$actorRegion.') '.$actionText.' '.$subjectName."'s user account at ".$subjectOffice.', '.$subjectRegion.'.'.$changeText;
        if ($action === 'update' && ($roleChanged || $credentialChanged)) {
            $notificationTitle = $credentialChanged && ! $roleChanged
                ? 'Credential access configuration updated'
                : 'Account role successfully updated';
            $oldCredential = $credentialChanged ? $this->credentialName($before['role_credential_id'] ?? null) : null;
            $newCredential = $credentialChanged ? $this->credentialName($after['role_credential_id'] ?? null) : null;
            $lines = [
                '## Account Role & Access Management',
                '',
                $credentialChanged && ! $roleChanged
                    ? 'The credential access configuration associated with your account was updated.'
                    : 'The role assigned to your account was successfully updated.',
                '',
                '**Update Details**',
                '- Account: '.$subjectName,
                '- Previous role: '.($roleChanged ? ($this->roleName($before['role_id'] ?? null) ?: 'No role assigned') : ($subjectProfile['role'] ?: 'No role assigned')),
                '- New role: '.($roleChanged ? ($this->roleName($after['role_id'] ?? null) ?: 'No role assigned') : ($subjectProfile['role'] ?: 'No role assigned')),
            ];
            if ($credentialChanged) {
                $lines[] = '- Credential access: '.($oldCredential ?: 'No access profile').' → '.($newCredential ?: 'No access profile');
            }
            $lines[] = '- Updated by: '.$actorName;
            $lines[] = '- Date & time: '.$now->timezone('Asia/Manila')->format('M j, Y g:i A').' (Asia/Manila)';
            $lines[] = '';
            $lines[] = 'Your account access and permissions now follow the updated role and access configuration. Contact your system administrator if you have questions.';
            $message = implode("\n", $lines);
            $summary = $credentialChanged && ! $roleChanged
                ? 'Your credential access configuration was updated by '.$actorName.'.'
                : 'Your account role was updated by '.$actorName.'.';
        } elseif ($accessRevoked || $accessSuspended) {
            $notificationTitle = $accessRevoked ? 'Account Access Revoked' : 'Account Access Temporarily Suspended';
            $lines = [
                '## Account Access Management',
                '',
                $accessRevoked
                    ? 'Access to your account has been revoked following an administrative review.'
                    : 'Your account access has been temporarily suspended.',
                '',
                '**Action Details**',
                '- Account: '.$subjectName,
                '- Action: '.($accessRevoked ? 'Access revoked' : 'Account access suspended'),
                '- Authorized by: '.$actorName,
                '- Effective date: '.$now->timezone('Asia/Manila')->format('M j, Y g:i A').' (Asia/Manila)',
                '',
                $accessRevoked
                    ? 'The account is no longer authorized to access TMIS. Contact your system administrator for further information.'
                    : 'You may be unable to access TMIS while this restriction is in effect. Contact your system administrator for assistance.',
            ];
            $message = implode("\n", $lines);
            $summary = $accessRevoked
                ? 'Your account access was revoked by '.$actorName.'.'
                : 'Your account access was temporarily suspended by '.$actorName.'.';
        }

        DB::table('user_notifications')->insert([
            'ui_id' => (string) Str::uuid(),
            'batch_id' => (string) Str::uuid(),
            'recipient_id' => $subject->user_id,
            'creator_id' => $actor->user_id,
            'title' => $notificationTitle,
            'summary' => mb_substr($summary, 0, 240),
            'message' => $message,
            'type' => 'account',
            'priority' => 'normal',
            'reference' => $this->notificationReference(),
            'related_page' => 'users/profile',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /** Notify affected users with the administrator's office and region and a readable permission summary. */
    public function notifyPermissionChange(
        Request $request,
        int $roleId,
        ?int $profileId,
        string $roleName,
        ?string $profileName,
        array $granted,
        array $removed,
        array $blocked = [],
        array $unblocked = [],
        string $action = 'updated',
    ): void {
        $actor = $request->user();
        if (! $actor) {
            return;
        }

        $users = DB::table('users')
            ->whereNull('deleted_at')
            ->where('status', 'Approved & Accepted')
            ->where('active_status', 1)
            // New profiles are announced to users in their role; later edits and deletion target assigned users only.
            ->when($profileId !== null && $action !== 'created', fn ($query) => $query->where('role_credential_id', $profileId))
            ->when($profileId !== null || $action !== 'created', fn ($query) => $query->where('role_id', $roleId))
            // A newly created role has no account members yet, so notify the super administrators who manage roles.
            ->when($profileId === null && $action === 'created', fn ($query) => $query->whereIn('user_id', DB::table('system_super_admins')->select('user_id')))
            ->where('user_id', '!=', $actor->user_id)
            ->pluck('user_id');
        if ($users->isEmpty()) {
            return;
        }

        $actorProfile = app(AccountDisplay::class)->forUser($actor->fresh() ?? $actor);
        $actorOffice = trim((string) ($actorProfile['office'] ?? '')) ?: 'Office not assigned';
        $actorRegion = trim((string) ($actorProfile['region'] ?? '')) ?: 'Region not assigned';
        $actorAttribution = $actorProfile['navigationName'].', '.$actorOffice.' - '.$actorRegion;
        $roleLabel = '"'.$roleName.'"';
        $scope = $profileName !== null
            ? 'the "'.$profileName.'" access profile for the '.$roleLabel.' role'
            : 'the '.$roleLabel.' role';
        $changes = [];
        if ($granted !== []) {
            $changes[] = 'added access: '.$this->permissionChangeLabels($granted);
        }
        if ($removed !== []) {
            $changes[] = 'removed access: '.$this->permissionChangeLabels($removed);
        }
        if ($blocked !== []) {
            $changes[] = 'blocked access: '.$this->permissionChangeLabels($blocked);
        }
        if ($unblocked !== []) {
            $changes[] = 'restored access: '.$this->permissionChangeLabels($unblocked);
        }
        $changeSummary = $changes === [] ? 'No individual permission changes were recorded.' : implode('; ', $changes).'.';
        $notificationTitle = match (true) {
            $action === 'removed' => 'Access profile deleted: '.$profileName,
            $profileName !== null && $action === 'created' => 'New access profile: '.$profileName,
            $profileName !== null => 'Access profile updated: '.$profileName,
            $action === 'created' => 'Role created: '.$roleName,
            default => 'Role permissions updated: '.$roleName,
        };
        $summary = match ($action) {
            'created' => $profileName !== null
                ? 'A new access profile was configured for the '.$roleLabel.' role by '.$actorAttribution.'.'
                : 'The '.$roleLabel.' role was created by '.$actorAttribution.'.',
            'removed' => 'The "'.$profileName.'" access profile for the '.$roleLabel.' role was removed by '.$actorAttribution.'.',
            default => 'Role and access settings for '.$scope.' were updated by '.$actorAttribution.'.',
        };
        $timestamp = now()->timezone('Asia/Manila')->format('M j, Y g:i A').' (Asia/Manila)';
        $eventType = $profileName !== null ? 'Credential access configuration' : 'Role and permission update';
        $credentialStatus = match (true) {
            $profileName === null => 'Not changed',
            $action === 'removed' => 'Revoked; assigned accounts now use their role permissions',
            $action === 'created' => 'Configured; assignment is managed separately',
            default => 'Updated for accounts assigned to this access profile',
        };
        $lines = [
            '## Account Role & Access Management',
            '',
            'An account access management event has been processed.',
            '',
            '**Event Summary**',
            '- Event type: '.$eventType,
            '- Role: '.$roleName,
        ];
        if ($profileName !== null) {
            $lines[] = '- Access profile: '.$profileName;
        }
        $lines[] = '- Permission changes: '.$changeSummary;
        $lines[] = '- Credential access: '.$credentialStatus;
        $lines[] = '- Account status: Active';
        $lines[] = '- Processed by: '.$actorAttribution;
        $lines[] = '- Event timestamp: '.$timestamp;
        $lines[] = '';
        $lines[] = '**Security Notice**';
        $lines[] = 'This change has been recorded in the system audit log. Access is governed by the role and any access profile assigned to each account.';
        if ($action === 'created' && $profileName !== null) {
            $lines[] = 'Creating an access profile does not assign it automatically; current account access remains unchanged until an administrator assigns the profile.';
        } elseif ($action === 'removed' && $profileName !== null) {
            $lines[] = 'Accounts previously assigned to this profile now use the permissions defined by their role.';
        } else {
            $lines[] = 'Updated access settings are effective immediately for affected accounts.';
        }
        $message = implode("\n", $lines);
        $batchId = (string) Str::uuid();
        $now = now();
        foreach ($users as $recipientId) {
            DB::table('user_notifications')->insert([
                'ui_id' => (string) Str::uuid(),
                'batch_id' => $batchId,
                'recipient_id' => $recipientId,
                'creator_id' => $actor->user_id,
                'title' => mb_substr($notificationTitle, 0, 100),
                'summary' => mb_substr($summary, 0, 240),
                'message' => $message.' Your account role remains '.$roleName.'.',
                'type' => 'account',
                'priority' => 'normal',
                'reference' => $this->notificationReference(),
                'related_page' => 'users/profile',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /** Convert permission keys into concise phrases users can understand in notification details. */
    private function permissionChangeLabels(array $permissions): string
    {
        $modules = [
            'trainings' => 'training records',
            'participants' => 'participant records',
            'associations' => 'farmer association records',
            'resource_persons' => 'resource person records',
            'questionnaires' => 'questionnaires',
            'evaluations' => 'assessments and evaluations',
        ];
        $actions = [
            'read' => 'view records',
            'create' => 'create records',
            'edit' => 'edit records',
            'write' => 'create and edit records',
            'delete' => 'delete records',
            'page_access' => 'limit access to selected pages',
            'submit' => 'submit for approval',
            'approve' => 'review approval requests',
            'accept' => 'manage the acceptance queue',
        ];

        return implode(', ', array_map(static function (string $permission) use ($actions, $modules): string {
            $parts = explode('.', $permission);
            $module = $modules[$parts[0]] ?? ucfirst(str_replace('_', ' ', $parts[0]));
            if (($parts[1] ?? null) === 'view') {
                $pageKey = implode('.', array_slice($parts, 2));
                $pageLabel = ModuleAccess::navigationPages()[$parts[0]][$pageKey]['label'] ?? ucfirst(str_replace('.', ' ', $pageKey));

                return ucfirst($module).': view '.$pageLabel;
            }
            $action = $actions[$parts[1] ?? ''] ?? ucfirst(str_replace('_', ' ', $parts[1] ?? $permission));

            return ucfirst($module).': '.$action;
        }, $permissions));
    }

    /** Notify the record creator about an attachment change and identify who made it. */
    public function notifyRecordAttachment(Request $request, object $record, string $module, string $action, string $documentName, string $kind): void
    {
        $actor = $request->user();
        $recipientId = $record->created_by ?? null;
        if (! $actor) {
            return;
        }

        if ($module === 'trainings' && isset($record->org_id, $record->region_id)) {
            $recipientIds = DB::table('users')
                ->where('org_id', $record->org_id)
                ->where('region_id', $record->region_id)
                ->whereNull('deleted_at')
                ->where('status', 'Approved & Accepted')
                ->where('active_status', 1)
                ->pluck('user_id')
                ->all();
        } else {
            $recipientIds = is_numeric($recipientId) && (int) $recipientId !== (int) $actor->user_id && User::where('user_id', (int) $recipientId)->exists()
                ? [(int) $recipientId]
                : [];
        }
        if ($recipientIds === []) {
            return;
        }

        $actorProfile = app(AccountDisplay::class)->forUser($actor->fresh() ?? $actor);
        $officeId = $record->org_id ?? null;
        $regionId = $record->region_id ?? null;
        $recordOffice = $officeId ? DB::table('organization')->where('org_id', $officeId)->value('name') : null;
        $recordRegion = $regionId ? DB::table('region')->where('region_id', $regionId)->value('name') : null;
        $recordLocation = implode(', ', array_filter([$recordOffice, $recordRegion]));
        $recordName = $record->name ?? trim(implode(' ', array_filter([$record->first_name ?? null, $record->last_name ?? null]))) ?: ucfirst(rtrim($module, 's')).' record';
        $title = match ($action) {
            'uploaded' => 'An attachment was added',
            'deleted' => 'An attachment was removed',
            default => 'An attachment was updated',
        };
        $actorRole = $actorProfile['role'] ?? null;
        $actorLocation = implode(', ', array_filter([$actorProfile['office'] ?? null, $actorProfile['region'] ?? null]));
        $actorIdentity = $actorProfile['navigationName'].($actorRole ? ' ('.$actorRole.')' : '').' ('.($actorLocation !== '' ? $actorLocation : 'office and region not assigned').')';
        $message = $actorIdentity.' '.$action.' the '.$kind.' attachment “'.$documentName.'” for “'.$recordName.'”'.($recordLocation !== '' ? ' at '.$recordLocation : '').'.';
        $now = now();

        $batchId = (string) Str::uuid();
        foreach ($recipientIds as $recipientId) {
            DB::table('user_notifications')->insert([
                'ui_id' => (string) Str::uuid(),
                'batch_id' => $batchId,
                'recipient_id' => $recipientId,
                'creator_id' => $actor->user_id,
                'title' => $title,
                'summary' => mb_substr($message, 0, 240),
                'message' => $message,
                'type' => $module === 'trainings' ? 'training' : 'system',
                'priority' => 'normal',
                'reference' => (string) ($record->ui_id ?? $record->id ?? ''),
                'related_page' => 'users/profile',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    private function notificationReference(): string
    {
        return 'TMIS-'.Str::upper(Str::random(12));
    }

    private function roleName(mixed $roleId): ?string
    {
        return is_numeric($roleId) ? DB::table('user_roles')->where('role_id', $roleId)->value('name') : null;
    }

    private function credentialName(mixed $credentialId): ?string
    {
        return is_numeric($credentialId) ? DB::table('role_credentials')->where('role_credential_id', $credentialId)->value('name') : null;
    }
}
