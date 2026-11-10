<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class OriginalInterfaceTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(int $role = 1, int $office = 1): User
    {
        $user = User::factory()->create(['role_id' => $role, 'org_id' => $office]);
        $hash = Hash::make('Interface-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);

        return $user;
    }

    private function save(string $key, array $record): TestResponse
    {
        return $this->postJson('/ui/sync', ['key' => $key, 'upserts' => [$record], 'deletes' => []]);
    }

    public function test_original_association_form_saves_database_record_and_versioned_data(): void
    {
        $user = $this->signIn();
        $record = ['id' => 'FA-2026-001', 'association_name' => 'Original Association', 'office' => 'DA - SAAD', 'organization_type' => 'Association', 'registration_date' => '2026-01-01', 'province' => 'Quezon', 'year_covered' => '2026', 'status' => 'Active'];
        $response = $this->save('tmis-farmer-associations', $record)->assertOk();
        $this->assertDatabaseHas('associations', ['ui_id' => 'FA-2026-001', 'name' => 'Original Association', 'org_id' => 1, 'created_by' => $user->user_id]);
        $saved = $response->json('stores.tmis-farmer-associations.0');
        $this->assertSame('Original Association', $saved['association_name']);
        $this->assertSame(1, $saved['_version']);
        $saved['association_name'] = 'Updated Association';
        $this->save('tmis-farmer-associations', $saved)->assertOk();
        $this->save('tmis-farmer-associations', $saved)->assertConflict();
        $this->get('/app/admin/participants/details/fa-all-list')->assertOk()->assertViewIs('admin.participants.details.fa-all-list')->assertSee('TMIS_PAGE')->assertDontSee('TMIS database operations:');
    }

    public function test_original_participant_form_preserves_demographics_and_encrypted_requirements(): void
    {
        $this->signIn();
        $record = ['id' => 'FMR-2026-001', 'fname' => 'Ana', 'mname' => 'Cruz', 'lname' => 'Santos', 'gender' => 'Female', 'dob' => '1990-01-01', 'region_id' => 'region_4a', 'mobile_no' => '9123456789', 'email_account' => 'ana@example.test', 'pwd' => 'Confidential disability', '4ps' => 'Yes', 'status' => 'Active'];
        $this->save('tmis-farmers', $record)->assertOk()->assertJsonPath('stores.tmis-farmers.0.firstName', 'Ana');
        $this->assertDatabaseHas('participants', ['ui_id' => 'FMR-2026-001', 'name' => 'Ana Cruz Santos', 'sex' => 'Female', 'date_of_birth' => '1990-01-01']);
        $this->assertStringNotContainsString('Confidential disability', DB::table('participants')->value('ui_data'));
        $this->assertStringNotContainsString('Confidential disability', DB::table('participants')->value('protected_details'));
    }

    public function test_farmer_number_routes_open_the_profile_and_use_the_number_in_activity_logs(): void
    {
        $this->signIn();
        $response = $this->save('tmis-farmers', [
            'id' => 'FMR-ROUTE-001',
            'fname' => 'Ana',
            'lname' => 'Santos',
            'gender' => 'Female',
            'dob' => '1990-01-01',
            'region_id' => 'region_4a',
            'status' => 'Active',
        ])->assertOk();
        $farmerNumber = $response->json('stores.tmis-farmers.0.farmerNumber');

        $this->get(route('admin.participants.id.view-farmer', ['farmer' => $farmerNumber]))
            ->assertOk()
            ->assertViewIs('admin.participants.id.view-farmer');
        $this->get(route('admin.participants.id.edit-farmer', ['farmer' => $farmerNumber]))
            ->assertOk()
            ->assertViewIs('admin.participants.id.edit-farmer');
        $this->get('/app/admin/participants/id/view-farmer?id=FMR-ROUTE-001')->assertOk();
        $this->getJson('/ui/data', [
            'X-TMIS-PAGE' => '/app/admin/participants/id/view-farmer/'.$farmerNumber,
        ])->assertOk()
            ->assertJsonPath('stores.tmis-farmers.0.activityLogs.0.reference', $farmerNumber)
            ->assertJsonPath('stores.tmis-farmers.0.activityLogs.0.description', 'Farmer profile was registered successfully.');
    }

    public function test_original_training_form_creates_review_and_submission_still_requires_design(): void
    {
        Mail::fake();
        $this->signIn();
        $record = ['id' => 'TRN-2026-001', 'training_title' => 'Original training', 'training_type' => 'Workshop', 'region_id' => 'region_4a', 'implementing_office' => 'DA - SAAD', 'start_date' => '2026-12-01', 'end_date' => '2026-12-02', 'venue_location' => 'Training hall', 'training_budget' => '5000'];
        $response = $this->save('tmis-trainings', $record)->assertOk();
        $saved = $response->json('stores.tmis-trainings.0');
        $this->assertSame('For Review', $saved['status']);
        $saved['status'] = 'For Approval';
        $this->save('tmis-trainings', $saved)->assertUnprocessable()->assertJsonValidationErrors('training_design');
        $this->assertDatabaseHas('trainings', ['name' => 'Original training', 'status' => 'For review']);
        $this->assertDatabaseCount('training_notifications', 0);
        Mail::assertNothingSent();
    }

    public function test_original_test_questionnaire_and_score_encoding_are_validated_on_server(): void
    {
        $this->signIn();
        $this->save('tmis-farmers', ['id' => 'FMR-1', 'fname' => 'Ana', 'lname' => 'Santos'])->assertOk();
        $this->save('tmis-pre-test-questionnaires', ['id' => 'PRE-1', 'trainingQuestionnaire' => 'Pre-test', 'region' => 'Region IV-A', 'implementingOffice' => 'DA - SAAD', 'totalItems' => 10, 'status' => 'Active'])->assertOk();
        $this->assertDatabaseHas('questionnaires', ['ui_id' => 'PRE-1', 'kind' => 'Pre-test']);
        $record = ['id' => 'RESULT-1', 'questionnaireId' => 'PRE-1', 'farmerId' => 'FMR-1', 'date' => '2026-11-01', 'score' => 11, 'status' => 'complete'];
        $this->save('tmis-pre-test-encoded', $record)->assertUnprocessable();
        $this->assertDatabaseCount('assessment_results', 0);
        $record['score'] = 8;
        $this->save('tmis-pre-test-encoded', $record)->assertOk()->assertJsonPath('stores.tmis-pre-test-encoded.0.score', 8);
        $this->assertDatabaseHas('assessment_results', ['ui_id' => 'RESULT-1', 'score' => 8, 'state' => 'complete']);
    }

    public function test_cross_office_records_are_not_loaded_or_deleted_and_role_delete_permission_applies(): void
    {
        $this->signIn();
        $this->save('tmis-farmer-associations', ['id' => 'FA-1', 'association_name' => 'Private office association'])->assertOk();
        $staff = $this->signIn(3, 2);
        DB::table('role_permissions')->insert([['role_id' => 3, 'permission' => 'associations.read'], ['role_id' => 3, 'permission' => 'associations.write']]);
        $this->getJson('/ui/data')->assertOk()->assertJsonCount(0, 'stores.tmis-farmer-associations');
        $this->save('tmis-farmer-associations', ['id' => 'FA-1', 'association_name' => 'Cross office overwrite'])->assertNotFound();
        $this->postJson('/ui/sync', ['key' => 'tmis-farmer-associations', 'upserts' => [], 'deletes' => ['FA-1']])->assertForbidden();
        $this->assertDatabaseHas('associations', ['name' => 'Private office association']);

        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'associations.delete']);
        $office = DB::table('organization')->where('org_id', 2)->value('name');
        $this->save('tmis-farmer-associations', ['id' => 'FA-2', 'association_name' => 'Own office association', 'office' => $office])->assertOk();
        $this->postJson('/ui/sync', ['key' => 'tmis-farmer-associations', 'upserts' => [], 'deletes' => ['FA-2']])->assertOk();
        $this->assertSoftDeleted('associations', ['ui_id' => 'FA-2']);
        $this->assertDatabaseHas('associations', ['ui_id' => 'FA-1', 'deleted_at' => null]);
    }

    public function test_notification_creation_and_recipient_state_persist_without_client_privilege(): void
    {
        $this->signIn();
        $recipient = User::factory()->create();
        $record = ['id' => 'NOTICE-1', 'batchId' => 'BATCH-1', 'recipientId' => (string) $recipient->user_id, 'title' => 'Office update', 'message' => 'Read the update', 'type' => 'system', 'priority' => 'normal', 'href' => ''];
        $this->save('tmis-notifications', $record)->assertOk();
        $this->assertDatabaseHas('user_notifications', ['recipient_id' => $recipient->user_id, 'title' => 'Office update']);
        $other = $this->signIn(3);
        $this->save('tmis-notification-state:'.$other->user_id, ['id' => 'NOTICE-1', 'readAt' => now()->toDateTimeString()])->assertNotFound();
        $this->save('tmis-notifications', $record)->assertForbidden();
    }

    public function test_original_design_upload_allows_status_email_outbox_and_locks_documents_until_review(): void
    {
        Mail::fake();
        Storage::fake('local');
        $user = $this->signIn();
        $response = $this->save('tmis-trainings', ['id' => 'TRN-DESIGN', 'training_title' => 'Design workflow', 'start_date' => '2026-12-01', 'end_date' => '2026-12-02', 'venue' => 'Hall', 'budget' => 100])->assertOk();
        $file = UploadedFile::fake()->createWithContent('design.pdf', "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");
        $uploaded = $this->post('/ui/documents/trainings/TRN-DESIGN', ['kind' => 'Training Design', 'year' => 2026, 'file' => $file], ['Accept' => 'application/json'])->assertOk();
        $training = $uploaded->json('stores.tmis-trainings.0');
        $document = $training['attachments'][0];
        $this->get($document['url'])->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $training['status'] = 'For Approval';
        $submitted = $this->save('tmis-trainings', $training)->assertOk();
        $this->assertDatabaseHas('training_notifications', ['user_id' => $user->user_id]);
        $this->patchJson('/ui/documents/trainings/TRN-DESIGN/'.$document['id'], ['kind' => 'Other', 'year' => 2026])->assertConflict();
        $this->deleteJson('/ui/documents/trainings/TRN-DESIGN/'.$document['id'])->assertConflict();
        $training = $submitted->json('stores.tmis-trainings.0');
        $training['status'] = 'For Acceptance';
        $accepted = $this->save('tmis-trainings', $training)->assertOk();
        $training = $accepted->json('stores.tmis-trainings.0');
        $training['status'] = 'Approved & Accepted';
        $this->save('tmis-trainings', $training)->assertOk();
        $training['status'] = 'For Review';
        $training['remarks'] = 'Revise delivery dates.';
        $this->save('tmis-trainings', $training)->assertConflict();
        $this->assertDatabaseCount('training_status_changes', 3);
        $this->assertDatabaseCount('training_notifications', 3);
        $notice = DB::table('training_notifications')->first();
        $this->save('tmis-notification-state:'.$user->user_id, ['id' => 'status-'.$notice->id, 'readAt' => now()->toIso8601String(), 'archivedAt' => now()->toIso8601String()])->assertOk();
        $this->getJson('/ui/data')->assertOk()->assertJsonStructure(['stores' => ['tmis-notification-state:'.$user->user_id => ['status-'.$notice->id => ['readAt', 'archivedAt']]]]);
        Mail::assertNothingSent();
    }

    public function test_original_enrollment_and_assessment_relationships_are_validated_and_projected(): void
    {
        $this->signIn();
        $this->save('tmis-farmers', ['id' => 'FMR-LINK', 'fname' => 'Ana', 'lname' => 'Santos'])->assertOk();
        $this->save('tmis-pre-test-questionnaires', ['id' => 'PRE-LINK', 'trainingQuestionnaire' => 'Linked pretest', 'totalItems' => 5, 'status' => 'Active'])->assertOk();
        $created = $this->save('tmis-trainings', ['id' => 'TRN-LINK', 'training_title' => 'Linked training', 'start_date' => '2026-12-01', 'end_date' => '2026-12-02', 'venue' => 'Hall', 'budget' => 100, 'pretest' => ['PRE-LINK']])->assertOk();
        $assessment = ['id' => 'RESULT-LINK', 'questionnaireId' => 'PRE-LINK', 'trainingId' => 'TRN-LINK', 'farmerId' => 'FMR-LINK', 'date' => '2026-12-01', 'score' => 4, 'status' => 'complete'];
        $this->save('tmis-pre-test-encoded', $assessment)->assertUnprocessable();
        $this->postJson('/ui/training-enrollment', ['id' => 'TRN-LINK', 'participants' => ['FMR-LINK'], 'version' => $created->json('stores.tmis-trainings.0._version')])->assertOk()->assertJsonPath('stores.tmis-trainings.0.participants', ['FMR-LINK']);
        DB::table('trainings')->where('ui_id', 'TRN-LINK')->update(['status' => 'Approved & Accepted']);
        $this->save('tmis-pre-test-encoded', $assessment)->assertOk();
        $duplicate = $assessment;
        $duplicate['id'] = 'RESULT-DUPLICATE';
        unset($duplicate['trainingId']);
        $this->save('tmis-pre-test-encoded', $duplicate)->assertConflict();
        $this->assertDatabaseHas('assessment_results', ['training_id' => DB::table('trainings')->value('id'), 'participant_id' => DB::table('participants')->value('id'), 'state' => 'complete']);
        $this->getJson('/ui/data')->assertOk()->assertJsonPath('stores.tmis-trainings.0.pretest', ['PRE-LINK']);
        foreach (['view-training', 'edit-training'] as $page) {
            $rendered = $this->get('/app/admin/training/id/'.$page.'?id=TRN-LINK')->assertOk()->assertViewIs('admin.training.id.'.$page)->assertSee('TMIS_PAGE');
            if ($directory = getenv('TMIS_UI_FIXTURE_DIR')) {
                file_put_contents($directory.'/tmis-'.$page.'.html', str_replace('http://localhost', 'http://127.0.0.1:8000', $rendered->getContent()));
            }
        }
        $dashboard = $this->get('/app/admin/dashboard/dashboard')->assertOk();
        if ($directory = getenv('TMIS_UI_FIXTURE_DIR')) {
            file_put_contents($directory.'/tmis-dashboard.html', str_replace('http://localhost', 'http://127.0.0.1:8000', $dashboard->getContent()));
        }

    }

    public function test_original_document_content_and_cross_office_access_are_enforced(): void
    {
        Storage::fake('local');
        $this->signIn();
        $this->save('tmis-farmers', ['id' => 'FMR-PRIVATE', 'fname' => 'Ana', 'lname' => 'Santos'])->assertOk();
        $this->post('/ui/documents/participants/FMR-PRIVATE', ['kind' => 'Other', 'file' => UploadedFile::fake()->createWithContent('payload.php', '<?php echo "unsafe";')], ['Accept' => 'application/json'])->assertUnprocessable();
        $saved = $this->post('/ui/documents/participants/FMR-PRIVATE', ['kind' => 'Other', 'file' => UploadedFile::fake()->createWithContent('record.pdf', "%PDF-1.4\n%%EOF")], ['Accept' => 'application/json'])->assertOk();
        $url = $saved->json('stores.tmis-farmers.0.attachments.0.url');
        $this->signIn(3, 2);
        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'participants.read']);
        $this->get($url)->assertNotFound();
    }

    public function test_module_delete_permission_allows_document_removal_without_write_permission(): void
    {
        Storage::fake('local');
        $this->signIn();
        $this->save('tmis-trainings', ['id' => 'TRN-DOCUMENT', 'training_title' => 'Document access test', 'start_date' => '2026-12-01', 'end_date' => '2026-12-02', 'venue' => 'Hall', 'budget' => 100])->assertOk();
        $upload = $this->post('/ui/documents/trainings/TRN-DOCUMENT', ['kind' => 'Other', 'file' => UploadedFile::fake()->createWithContent('report.pdf', "%PDF-1.4\nReport")], ['Accept' => 'application/json'])->assertOk();
        $attachmentId = $upload->json('stores.tmis-trainings.0.attachments.0.id');
        $attachmentPath = DB::table('training_attachments')->where('id', $attachmentId)->value('path');

        $this->signIn(3);
        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'trainings.read'],
            ['role_id' => 3, 'permission' => 'trainings.delete'],
        ]);
        $this->deleteJson('/ui/documents/trainings/TRN-DOCUMENT/'.$attachmentId)->assertOk();

        $this->assertDatabaseMissing('training_attachments', ['id' => $attachmentId]);
        Storage::disk('local')->assertMissing($attachmentPath);
    }

    public function test_metadata_edits_require_write_permission_and_questionnaire_pages_use_questionnaire_grants(): void
    {
        $this->signIn();
        $created = $this->save('tmis-trainings', ['id' => 'TRN-META', 'training_title' => 'Read only metadata', 'start_date' => '2026-12-01', 'end_date' => '2026-12-02', 'venue' => 'Hall', 'budget' => 100])->assertOk();
        $this->signIn(3);
        DB::table('role_permissions')->insert([['role_id' => 3, 'permission' => 'trainings.read'], ['role_id' => 3, 'permission' => 'questionnaires.read']]);
        $training = $created->json('stores.tmis-trainings.0');
        $training['bullets'] = [['Unauthorized change'], []];
        $this->save('tmis-trainings', $training)->assertForbidden();
        $this->get('/app/admin/evaluation/id/view-pre-test')->assertOk();
        $this->get('/app/admin/evaluation/id/edit-pre-test')->assertNotFound();
        $this->get('/app/admin/training/create/register')->assertNotFound();
    }

    public function test_original_account_edit_can_reactivate_and_update_email_and_trash_is_functional(): void
    {
        $this->signIn();
        $account = User::factory()->create([
            'role_id' => DB::table('user_roles')->where('name', 'Data Encoder')->value('role_id'),
            'active_status' => 0,
            'email_verified' => true,
        ]);
        $record = $this->withHeaders(['X-TMIS-PAGE' => '/app/admin/administration/id/edit-user'])->getJson('/ui/data')->assertOk()->json('stores.tmis-users');
        $record = collect($record)->firstWhere('id', (string) $account->user_id);
        $record['status'] = 'Approved & Accepted';
        $record['email'] = 'updated-office@example.test';
        $this->save('tmis-users', $record)->assertOk();
        $this->assertDatabaseHas('users', ['user_id' => $account->user_id, 'active_status' => 1, 'email' => 'updated-office@example.test', 'email_verified' => false]);
        $this->postJson('/ui/sync', ['key' => 'tmis-users', 'upserts' => [], 'deletes' => [(string) $account->user_id]])->assertOk();
        $this->get('/app/admin/administration/details/trash')->assertOk()->assertViewIs('admin.administration.details.trash')->assertSee('updated-office@example.test');
        $this->patchJson('/system/accounts/'.$account->user_id, ['action' => 'restore'])->assertOk();
        $this->assertDatabaseHas('users', ['user_id' => $account->user_id, 'active_status' => 0, 'deleted_at' => null]);
    }

    public function test_assessment_scores_use_database_question_count_even_when_client_spoofs_metadata(): void
    {
        $this->signIn();
        $this->save('tmis-farmers', ['id' => 'FMR-SCORE', 'fname' => 'Ana', 'lname' => 'Santos'])->assertOk();
        $this->save('tmis-pre-test-questionnaires', ['id' => 'PRE-SCORE', 'trainingQuestionnaire' => 'Score bounds', 'questions' => [['text' => 'One item']], 'totalItems' => 99999])->assertOk()->assertJsonPath('stores.tmis-pre-test-questionnaires.0.totalItems', 1);
        $this->save('tmis-pre-test-encoded', ['id' => 'RESULT-SCORE', 'questionnaireId' => 'PRE-SCORE', 'farmerId' => 'FMR-SCORE', 'date' => '2026-11-01', 'score' => 2, 'totalItems' => 99999, 'status' => 'complete'])->assertUnprocessable();
        $this->assertDatabaseCount('assessment_results', 0);
    }
}
