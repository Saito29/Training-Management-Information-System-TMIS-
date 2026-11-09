<?php

namespace App\Http\Controllers\Authentication;

use App\Http\Authentication\AccountDisplay;
use App\Http\Authentication\AuditTrail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController
{
    /** Save personal profile edits and audit only the names of fields whose values actually changed. */
    public function update(Request $request, AccountDisplay $display): JsonResponse
    {
        $validated = $request->validate([
            'firstName' => ['required', 'string', 'max:150'],
            'middleName' => ['nullable', 'string', 'max:150'],
            'lastName' => ['required', 'string', 'max:150'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'dateOfBirth' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^\+?[0-9 ()-]+$/'],
        ]);
        $changes = [];
        foreach (['firstName' => 'first_name', 'middleName' => 'middle_name', 'lastName' => 'last_name', 'suffix' => 'extension_name', 'dateOfBirth' => 'date_of_birth', 'phone' => 'mobile_number'] as $field => $column) {
            $changes[$column] = $validated[$field] ?? null;
        }
        $changes['is_updated_at'] = now();
        DB::transaction(function () use ($request, $changes): void {
            $before = DB::table('users')->where('user_id', $request->user()->user_id)->lockForUpdate()->first();
            DB::table('users')->where('user_id', $request->user()->user_id)->update($changes);
            $changedFields = array_values(array_filter(
                array_keys($changes),
                fn (string $field): bool => $field !== 'is_updated_at' && $before->{$field} !== $changes[$field],
            ));
            AuditTrail::record(
                $request,
                'profile_updated',
                $request->user(),
                array_intersect_key((array) $before, $changes),
                $changes + ['changed_fields' => $changedFields],
            );
        });

        return response()->json(['message' => 'Personal information saved.', 'user' => $display->forUser($request->user())]);
    }
}
