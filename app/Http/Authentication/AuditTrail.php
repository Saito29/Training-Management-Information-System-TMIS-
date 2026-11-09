<?php

namespace App\Http\Authentication;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuditTrail
{
    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     *
     * Field-level activity summaries may include changed field names; sensitive field values remain redacted.
     */
    public static function record(Request $request, string $event, ?User $subject = null, array $before = [], array $after = [], string $outcome = 'success', string $category = 'account'): void
    {
        $safe = static function (array $values): array {
            $result = [];
            foreach ($values as $key => $value) {
                if (in_array($key, [
                    'status', 'active_status', 'role_id', 'role_credential_id', 'region_id', 'org_id', 'email_verified',
                    'maintenance_enabled', 'maintenance_until', 'maintenance_message', 'maintenance_access',
                    'system_name', 'logo_updated', 'favicon_updated', 'deleted_count', 'super_admin', 'email', 'reference',
                    'role_name', 'access_profile_name', 'permissions', 'denied_permissions', 'assigned_accounts', 'assigned_accounts_unassigned',
                    'record_name', 'document_name', 'document_kind', 'document_year', 'document_remarks', 'document_changes', 'office_name', 'region_name',
                    'notification_title', 'notification_type', 'recipient_count',
                    'record_name', 'document_name', 'document_kind', 'document_year', 'document_remarks', 'document_changes',
                ], true)) {
                    $result[$key] = $value;
                } elseif ($key === 'changed_fields' && is_array($value)) {
                    // Store field identifiers only, never the user-supplied values associated with them.
                    $result[$key] = array_values(array_filter($value, static fn (mixed $field): bool => is_string($field) && preg_match('/^[a-z_]{1,80}$/', $field) === 1));
                } elseif (in_array($key, ['first_name', 'middle_name', 'last_name', 'extension_name', 'date_of_birth', 'mobile_number', 'position', 'profile_photo_path', 'email'], true)) {
                    $result[$key] = '[redacted]';
                }
            }

            return $result;
        };
        $requestId = $request->attributes->get('audit_request_id');
        if (! $requestId) {
            $requestId = (string) Str::uuid();
            $request->attributes->set('audit_request_id', $requestId);
        }
        if ($subject && $category === 'account') {
            $before['email'] ??= $subject->email;
            $after['email'] ??= $subject->email;
        }
        DB::table('users_log')->insert([
            'user_id' => $subject?->user_id,
            'actor_user_id' => $request->user()?->user_id,
            'event' => $event, 'category' => $category, 'outcome' => $outcome,
            'description' => str_replace('_', ' ', $event),
            'old_values' => json_encode($safe($before), JSON_THROW_ON_ERROR),
            'new_values' => json_encode($safe($after), JSON_THROW_ON_ERROR),
            'ip_address' => $request->ip(), 'user_agent' => substr((string) $request->userAgent(), 0, 1000),
            'request_id' => $requestId, 'reference' => Str::upper(Str::random(16)), 'created_at' => now(),
        ]);
    }
}
