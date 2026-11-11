<?php

namespace Tests\Feature;

use App\Mail\AuditDeletionRequested;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AccountAuditTest extends TestCase
{
    use RefreshDatabase;

    private function account(int $role = 1, bool $superAdministrator = false): User
    {
        $user = User::factory()->create(['role_id' => $role]);
        $hash = Hash::make('Audit-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        if ($superAdministrator) {
            DB::table('system_super_admins')->insert(['user_id' => $user->user_id, 'created_at' => now(), 'updated_at' => now()]);
        }

        return $user;
    }

    private function authenticate(User $user): void
    {
        $hash = DB::table('user_auth')->where('user_id', $user->user_id)->value('password_hash');
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);
    }

    private function signIn(int $role = 1, bool $superAdministrator = false): User
    {
        $user = $this->account($role, $superAdministrator);
        $this->authenticate($user);

        return $user;
    }

    public function test_approval_records_actor_and_before_after_values_atomically(): void
    {
        $actor = $this->signIn();
        $subject = User::factory()->create(['role_id' => 3, 'status' => 'Pending approval', 'active_status' => 0]);

        $this->patchJson(route('accounts.update', $subject), ['decision' => 'Approved'])->assertOk();

        $this->assertDatabaseHas('users_log', ['actor_user_id' => $actor->user_id, 'user_id' => $subject->user_id, 'event' => 'account_approved']);
        $entry = DB::table('users_log')->where('event', 'account_approved')->first();
        $this->assertSame('Pending approval', json_decode($entry->old_values, true)['status']);
        $this->assertSame('Approved & Accepted', json_decode($entry->new_values, true)['status']);
        $this->assertNotNull($entry->request_id);
        $this->patchJson(route('accounts.update', $subject), ['decision' => 'Rejected'])->assertConflict();
        $this->assertDatabaseCount('users_log', 1);
    }

    public function test_profile_audit_masks_personal_values(): void
    {
        $user = $this->signIn();

        $this->patchJson(route('profile.update'), ['firstName' => 'Private Name', 'lastName' => 'Private Family', 'phone' => '09123456789'])->assertOk();

        $entry = DB::table('users_log')->where('event', 'profile_updated')->first();
        $this->assertSame($user->user_id, $entry->actor_user_id);
        $this->assertSame('[redacted]', json_decode($entry->new_values, true)['first_name']);
        $this->assertStringNotContainsString('Private Name', $entry->new_values);
        $this->assertStringNotContainsString('09123456789', $entry->new_values);
    }

    public function test_failed_login_records_no_credentials(): void
    {
        $this->post('/login', ['email' => 'unknown@example.test', 'password' => 'private-password'])->assertSessionHasErrors('email');

        $entry = DB::table('users_log')->where('event', 'login_failed')->first();
        $this->assertSame('security', $entry->category);
        $this->assertNull($entry->user_id);
        $this->assertStringNotContainsString('private-password', json_encode($entry));
        $this->assertStringNotContainsString('unknown@example.test', json_encode($entry));
    }

    public function test_audit_viewer_is_admin_only_and_paginated(): void
    {
        $user = $this->signIn();
        DB::table('users_log')->insert([
            ['user_id' => $user->user_id, 'event' => 'one', 'category' => 'security'],
            ['user_id' => $user->user_id, 'event' => 'two', 'category' => 'account'],
        ]);

        $this->getJson(route('audit.index', ['per_page' => 1]))->assertOk()->assertJsonPath('total', 2)->assertJsonCount(1, 'data');
        $this->getJson(route('audit.index', ['category' => 'security']))->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.event', 'One');
        $this->get(route('audit.index'))->assertRedirect(route('admin.users.profile').'#audit');
        $this->getJson(route('audit.index', ['per_page' => 1000]))->assertUnprocessable();
        $this->get(route('admin.users.profile'))->assertOk()
            ->assertSee('id="audit-tab"', false)
            ->assertSee('id="audit-panel"', false)
            ->assertSee('id="profileAuditExportDialog"', false)
            ->assertSee('value="csv" checked required', false)
            ->assertSee('value="txt" required', false)
            ->assertSee('Plain text (.txt)')
            ->assertSee('id="profileAuditDeleteDialog"', false)
            ->assertDontSee('Manage, export, or delete logs');
        $this->get(route('admin.users.logs'))->assertOk()
            ->assertDontSee('Open server account and security audit history')
            ->assertDontSee('Only completed record changes', false)
            ->assertDontSee('Navigation and export events are excluded');
        $this->signIn(3);
        $this->getJson(route('audit.index'))->assertForbidden();
        $this->get(route('admin.users.profile'))->assertOk()->assertDontSee('id="audit-tab"', false)->assertDontSee('id="audit-panel"', false);
    }

    public function test_audit_results_show_account_names_instead_of_user_identifiers(): void
    {
        $actor = $this->signIn();
        DB::table('users')->where('user_id', $actor->user_id)->update(['first_name' => 'Mark', 'middle_name' => 'Kinnedy', 'last_name' => 'Anda']);
        $subject = User::factory()->create(['first_name' => 'Jamie', 'middle_name' => null, 'last_name' => 'Farmer']);
        $office = DB::table('organization')->where('org_id', $actor->org_id)->value('name');
        $region = DB::table('region')->where('region_id', $actor->region_id)->value('name');
        $subjectOffice = DB::table('organization')->where('org_id', $subject->org_id)->value('name');
        $subjectRegion = DB::table('region')->where('region_id', $subject->region_id)->value('name');
        DB::table('users_log')->insert([
            'user_id' => $subject->user_id,
            'actor_user_id' => $actor->user_id,
            'event' => 'account_updated_'.$subject->user_id,
            'category' => 'account',
            'outcome' => 'success',
        ]);

        $response = $this->getJson(route('audit.index', ['user' => 'Mark']));

        $response->assertOk()->assertJsonPath('data.0.actor_name', 'Mark K. Anda - '.$office.', '.$region)
            ->assertJsonPath('data.0.user_name', 'Jamie Farmer - '.$subjectOffice.', '.$subjectRegion)
            ->assertJsonPath('data.0.account_email', $subject->email);
        $entry = $response->json('data.0');
        $this->assertArrayNotHasKey('actor_user_id', $entry);
        $this->assertArrayNotHasKey('user_id', $entry);
        $this->get(route('audit.index'))->assertRedirect(route('admin.users.profile').'#audit');
    }

    public function test_audit_api_returns_human_readable_role_permission_changes_without_raw_json(): void
    {
        $actor = $this->signIn();
        DB::table('users_log')->insert([
            'actor_user_id' => $actor->user_id,
            'event' => 'role_permissions_updated_2',
            'category' => 'settings',
            'old_values' => json_encode(['role_name' => 'Data Encoder', 'permissions' => ['participants.view']], JSON_THROW_ON_ERROR),
            'new_values' => json_encode(['role_name' => 'Data Encoder', 'permissions' => ['participants.view', 'training.update']], JSON_THROW_ON_ERROR),
            'outcome' => 'success',
        ]);

        $response = $this->getJson(route('audit.index'));

        $response->assertOk()
            ->assertJsonPath('data.0.description', fn (string $description): bool => str_contains($description, 'updated permissions for the “Data Encoder” role') && str_contains($description, 'Training Update'))
            ->assertJsonMissingPath('data.0.old_values')
            ->assertJsonMissingPath('data.0.new_values');
    }

    public function test_audit_details_resolve_role_ids_to_role_names(): void
    {
        $actor = $this->signIn();
        $subject = User::factory()->create();
        DB::table('users_log')->insert([
            'user_id' => $subject->user_id,
            'actor_user_id' => $actor->user_id,
            'event' => 'account_access_update',
            'category' => 'account',
            'old_values' => json_encode(['role_id' => 1], JSON_THROW_ON_ERROR),
            'new_values' => json_encode(['role_id' => 2], JSON_THROW_ON_ERROR),
            'outcome' => 'success',
        ]);

        $this->getJson(route('audit.index'))
            ->assertOk()
            ->assertJsonPath('data.0.description', fn (string $description): bool => str_contains($description, 'role changed from System Administrator to Data Encoder'));
    }

    public function test_admin_requests_audit_deletion_and_super_admin_approval_permanently_deletes_entries(): void
    {
        Mail::fake();
        $actor = $this->account();
        $superAdministrator = $this->account(1, true);
        $selected = DB::table('users_log')->insertGetId([
            'actor_user_id' => $actor->user_id, 'event' => 'login_failed', 'category' => 'security',
        ]);
        $otherSecurity = DB::table('users_log')->insertGetId([
            'actor_user_id' => $actor->user_id, 'event' => 'password_changed', 'category' => 'security',
        ]);
        $account = DB::table('users_log')->insertGetId([
            'actor_user_id' => $actor->user_id, 'event' => 'profile_updated', 'category' => 'account',
        ]);

        $this->authenticate($actor);
        $request = $this->deleteJson(route('audit.destroy'), ['category' => 'security', 'ids' => [$selected]])
            ->assertAccepted()
            ->assertJsonPath('message', 'Deletion request sent to Super Admins for approval.');
        $requestId = $request->json('request_id');
        $reference = $request->json('reference');
        $this->assertSame(16, strlen($reference));
        $this->assertDatabaseHas('audit_deletion_requests', ['id' => $requestId, 'requester_user_id' => $actor->user_id, 'status' => 'pending']);
        $this->assertDatabaseHas('user_notifications', ['recipient_id' => $superAdministrator->user_id, 'reference' => $reference]);
        $this->assertDatabaseHas('users_log', ['id' => $selected]);
        Mail::assertSent(AuditDeletionRequested::class, fn (AuditDeletionRequested $mail): bool => $mail->reference === $reference);

        $otherAdministrator = $this->account();
        $this->authenticate($otherAdministrator);
        $this->patchJson(route('audit.deletions.resolve', $requestId), ['action' => 'approve'])->assertForbidden();
        $this->assertDatabaseHas('users_log', ['id' => $selected]);

        $this->authenticate($superAdministrator);
        $this->get(route('admin.users.profile'))->assertOk()->assertSee('id="profileAuditApprovals"', false);
        $this->getJson(route('audit.deletions.pending'))->assertOk()->assertJsonPath('data.0.reference', $reference);
        $this->patchJson(route('audit.deletions.resolve', $requestId), ['action' => 'approve'])->assertOk();
        $this->assertDatabaseMissing('users_log', ['id' => $selected]);
        $this->assertDatabaseHas('users_log', ['id' => $otherSecurity]);

        $this->authenticate($actor);
        $secondRequest = $this->deleteJson(route('audit.destroy'), ['category' => 'security', 'delete_all_filtered' => '1'])->assertAccepted();
        $this->assertDatabaseHas('users_log', ['id' => $otherSecurity]);
        $this->authenticate($superAdministrator);
        $this->patchJson(route('audit.deletions.resolve', $secondRequest->json('request_id')), ['action' => 'approve'])->assertOk();
        $this->assertDatabaseMissing('users_log', ['id' => $otherSecurity]);
        $this->assertDatabaseHas('users_log', ['id' => $account]);
        $this->assertDatabaseHas('users_log', ['event' => 'audit_logs_permanently_deleted', 'actor_user_id' => $superAdministrator->user_id]);

        $rejectedEntry = DB::table('users_log')->insertGetId([
            'actor_user_id' => $actor->user_id,
            'event' => 'login_failed',
            'category' => 'security',
        ]);
        $this->authenticate($actor);
        $rejectedRequest = $this->deleteJson(route('audit.destroy'), ['category' => 'security', 'ids' => [$rejectedEntry]])->assertAccepted();
        $this->authenticate($superAdministrator);
        $this->patchJson(route('audit.deletions.resolve', $rejectedRequest->json('request_id')), ['action' => 'reject'])->assertOk();
        $this->assertDatabaseHas('users_log', ['id' => $rejectedEntry]);
        $this->assertDatabaseHas('audit_deletion_requests', ['id' => $rejectedRequest->json('request_id'), 'status' => 'rejected']);
    }

    public function test_super_admin_cannot_approve_their_own_audit_deletion_request(): void
    {
        Mail::fake();
        $requester = $this->account(1, true);
        $entryId = DB::table('users_log')->insertGetId(['event' => 'login_failed', 'category' => 'security']);
        $this->authenticate($requester);

        $this->deleteJson(route('audit.destroy'), ['ids' => [$entryId]])->assertConflict();
        $this->assertDatabaseCount('audit_deletion_requests', 0);

        $reviewer = $this->account(1, true);
        $deletionRequest = $this->deleteJson(route('audit.destroy'), ['ids' => [$entryId]])->assertAccepted();
        $requestId = $deletionRequest->json('request_id');
        $this->patchJson(route('audit.deletions.resolve', $requestId), ['action' => 'approve'])->assertForbidden();
        $this->assertDatabaseHas('users_log', ['id' => $entryId]);

        $this->authenticate($reviewer);
        $this->patchJson(route('audit.deletions.resolve', $requestId), ['action' => 'approve'])->assertOk();
        $this->assertDatabaseMissing('users_log', ['id' => $entryId]);
    }

    public function test_audit_deletion_email_escapes_requester_name(): void
    {
        $mail = new AuditDeletionRequested('ABCDEFGHIJKLMNOP', '<script>alert(1)</script>', 1, 'https://tmis.example.test/app/admin/users/profile#audit');

        $content = $mail->render();

        $this->assertStringContainsString('&lt;script&gt;', $content);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $content);
    }

    public function test_audit_entries_record_a_16_character_reference_and_account_email(): void
    {
        $user = $this->signIn();

        $this->patchJson(route('profile.update'), ['firstName' => 'Updated', 'lastName' => 'Account'])->assertOk();

        $entry = DB::table('users_log')->where('event', 'profile_updated')->first();
        $this->assertMatchesRegularExpression('/^[A-Z0-9]{16}$/', $entry->reference);
        $this->assertSame($user->email, json_decode($entry->new_values, true)['email']);
    }

    public function test_user_activity_details_include_the_account_email_and_generated_reference(): void
    {
        $actor = $this->signIn();
        $subject = User::factory()->create();
        $reference = 'ACTIVITYREF12345';
        DB::table('users_log')->insert([
            'user_id' => $subject->user_id,
            'actor_user_id' => $actor->user_id,
            'event' => 'account_updated_'.$subject->user_id,
            'category' => 'account',
            'outcome' => 'success',
            'reference' => $reference,
            'old_values' => json_encode(['email' => $subject->email], JSON_THROW_ON_ERROR),
            'new_values' => json_encode(['email' => $subject->email], JSON_THROW_ON_ERROR),
        ]);

        $this->getJson(route('admin.users.logs'))->assertOk()
            ->assertJsonPath('data.0.reference', $reference)
            ->assertJsonPath('data.0.account_email', $subject->email);
    }

    public function test_audit_export_is_excel_compatible_csv_and_respects_filters(): void
    {
        $actor = $this->signIn();
        DB::table('users')->where('user_id', $actor->user_id)->update(['first_name' => 'Mark', 'middle_name' => 'Kinnedy', 'last_name' => 'Anda']);
        DB::table('users_log')->insert([
            'actor_user_id' => $actor->user_id, 'event' => 'profile_updated', 'category' => 'account',
            'description' => 'Profile updated',
        ]);

        $response = $this->get(route('audit.export', ['format' => 'csv', 'category' => 'account', 'filename' => 'account-audit-export']));

        $response->assertDownload('account-audit-export.csv');
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
        $content = $response->streamedContent();
        $this->assertStringContainsString('Mark', $content);
        $this->assertStringContainsString('Profile Updated', $content);
        $textResponse = $this->get(route('audit.export', ['format' => 'txt', 'category' => 'account', 'filename' => 'account-audit-export']));
        $textResponse->assertDownload('account-audit-export.txt');
        $this->assertStringContainsString('Event: Profile Updated', $textResponse->streamedContent());
        $this->getJson(route('audit.export', ['format' => 'txt', 'filename' => '../unsafe']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('filename');
    }
}
