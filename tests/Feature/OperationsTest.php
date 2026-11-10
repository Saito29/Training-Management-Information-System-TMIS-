<?php

namespace Tests\Feature;

use App\Http\Authentication\AccountDisplay;
use App\Mail\TrainingStatusChanged;
use App\Models\User;
use App\Support\ModuleAccess;
use App\Support\TrainingNotificationDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class OperationsTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(int $role = 1, int $office = 1): User
    {
        $user = User::factory()->create(['role_id' => $role, 'org_id' => $office]);
        $hash = Hash::make('Operations-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        if ($role === 1) {
            DB::table('system_super_admins')->insert(['user_id' => $user->user_id, 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);

        return $user;
    }

    private function training(User $user, array $attributes = []): int
    {
        return DB::table('trainings')->insertGetId($attributes + ['name' => 'Office training', 'region_id' => 4, 'org_id' => 1, 'created_by' => $user->user_id, 'start_date' => '2026-12-01', 'end_date' => '2026-12-02', 'venue' => 'Training hall', 'budget' => 1000, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/operations/trainings')->assertRedirect(route('login'));
        $this->postJson('/operations/trainings', [])->assertRedirect(route('login'));
    }

    public function test_training_queue_counts_are_database_backed_scoped_and_permission_aware(): void
    {
        $user = $this->signIn(3);
        $this->getJson(route('operations.training-queue-counts'))
            ->assertOk()
            ->assertJsonPath('for_review', null)
            ->assertJsonPath('for_approval', null)
            ->assertJsonPath('for_acceptance', null);

        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'trainings.submit'],
            ['role_id' => 3, 'permission' => 'trainings.approve'],
            ['role_id' => 3, 'permission' => 'trainings.accept'],
        ]);

        $this->training($user, ['name' => 'Review queue item', 'status' => 'For review']);
        $this->training($user, ['name' => 'Approval queue item', 'status' => 'For approval']);
        $this->training($user, ['name' => 'Acceptance queue item', 'status' => 'For acceptance']);
        $this->training($user, ['name' => 'Other office item', 'status' => 'For approval', 'org_id' => 2]);
        $this->training($user, ['name' => 'Inactive item', 'status' => 'For review', 'is_active' => false]);
        $this->training($user, ['name' => 'Deleted item', 'status' => 'For review', 'deleted_at' => now()]);

        $this->getJson(route('operations.training-queue-counts'))
            ->assertOk()
            ->assertJsonPath('for_review', 1)
            ->assertJsonPath('for_approval', 1)
            ->assertJsonPath('for_acceptance', 1);
    }

    public function test_admin_creates_validated_training_and_audit_but_cannot_inject_status(): void
    {
        $user = $this->signIn();
        $this->postJson('/operations/trainings', ['name' => 'New training', 'region_id' => 4, 'org_id' => 1, 'start_date' => '2026-12-01', 'end_date' => '2026-12-02', 'venue' => 'Hall', 'budget' => 500, 'status' => 'Approved', 'created_by' => 999])->assertCreated();

        $this->assertDatabaseHas('trainings', ['name' => 'New training', 'status' => 'For review', 'created_by' => $user->user_id]);
        $this->assertDatabaseHas('users_log', ['actor_user_id' => $user->user_id, 'category' => 'trainings']);
        $this->get('/operations/trainings')->assertOk()->assertSee('New training');
    }

    public function test_invalid_training_and_mismatched_office_return_422_without_records(): void
    {
        $this->signIn();
        $this->postJson('/operations/trainings', [])->assertUnprocessable()->assertJsonValidationErrors(['name', 'region_id', 'org_id', 'start_date', 'end_date', 'venue', 'budget']);
        $this->postJson('/operations/trainings', ['name' => 'Bad', 'region_id' => 5, 'org_id' => 1, 'start_date' => '2026-12-02', 'end_date' => '2026-12-01', 'venue' => 'Hall', 'budget' => -1])->assertUnprocessable()->assertJsonValidationErrors(['org_id', 'end_date', 'budget']);
        $this->assertDatabaseCount('trainings', 0);
    }

    public function test_nonadmin_requires_grant_and_is_restricted_to_own_office(): void
    {
        $user = $this->signIn(3);
        $this->getJson('/operations/trainings')->assertForbidden();
        $this->get('/app/admin/administration/create/register')->assertNotFound();
        $this->get('/app/admin/training/create/register')->assertNotFound();
        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'trainings.read']);
        $own = $this->training($user);
        $other = $this->training($user, ['org_id' => 2, 'name' => 'Other office']);

        $this->getJson('/operations/trainings')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $own);
        $this->get('/operations/trainings?id='.$other)->assertNotFound();
        $this->deleteJson('/operations/trainings/'.$own)->assertForbidden();
        $this->postJson('/operations/trainings', [])->assertForbidden();
        $this->assertDatabaseHas('trainings', ['id' => $own, 'deleted_at' => null]);
    }

    public function test_role_delete_permission_controls_the_record_delete_button_and_endpoint(): void
    {
        $user = $this->signIn(3);
        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'trainings.read']);
        $trainingId = $this->training($user);

        $this->get('/operations/trainings?id='.$trainingId)->assertOk()->assertDontSee('Move this record to trash');
        $this->deleteJson('/operations/trainings/'.$trainingId)->assertForbidden();
        $this->assertDatabaseHas('trainings', ['id' => $trainingId, 'deleted_at' => null]);

        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'trainings.delete']);

        $this->get('/operations/trainings?id='.$trainingId)->assertOk()->assertSee('Move this record to trash');
        $this->deleteJson('/operations/trainings/'.$trainingId)->assertOk();
        $this->assertSoftDeleted('trainings', ['id' => $trainingId]);
    }

    public function test_desktop_and_mobile_navigation_receive_only_the_signed_in_roles_permissions(): void
    {
        $user = $this->signIn(3);
        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'trainings.read'],
            ['role_id' => 3, 'permission' => 'trainings.submit'],
        ]);

        $response = $this->get(route('admin.dashboard.dashboard'))->assertOk()
            ->assertSee('navigation-access.js?v=training-acceptance-1', false)
            ->assertSee('window.TMIS_NAV_ACCESS =', false)
            ->assertSee('trainings.read', false)
            ->assertDontSee('participants.read', false);

        $navigationAccess = ModuleAccess::navigationAccess($user);
        $this->assertFalse($navigationAccess['administrator']);
        $this->assertSame(['trainings.read', 'trainings.submit'], $navigationAccess['permissions']);
        $this->assertSame(
            ['module' => 'trainings', 'permission' => 'trainings.view.details.all-status'],
            $navigationAccess['page_permissions']['/app/admin/training/details/all-status']
        );
        $this->get('/app/admin/training/details/all-status')->assertOk();
        $this->get('/app/admin/training/create/register')->assertNotFound();
        $this->get('/app/admin/participants/details/all-with-status')->assertNotFound();
    }

    public function test_page_view_permissions_override_module_read_for_navigation_pages_and_direct_urls(): void
    {
        $user = $this->signIn(3);
        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'trainings.page_access'],
            ['role_id' => 3, 'permission' => 'trainings.view.details.all-status'],
            ['role_id' => 3, 'permission' => 'trainings.view.details.approved-accepted'],
        ]);

        $this->get(route('admin.dashboard.dashboard'))->assertOk()
            ->assertSee('trainings.view.details.all-status', false)
            ->assertSee('trainings.view.details.approved-accepted', false)
            ->assertSee('trainings.page_access', false);
        $this->get('/app/admin/training/details/all-status')->assertOk();
        $this->get('/app/admin/training/details/approved-accepted')->assertOk();
        $this->get('/app/admin/training/details/incomplete')->assertNotFound();
        $this->get('/app/admin/training/details/inactive.html')->assertNotFound();
        $this->get('/app/admin/training/create/register')->assertNotFound();

        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'trainings.read']);
        $this->get('/app/admin/training/details/inactive')->assertNotFound();
    }

    public function test_resource_person_create_page_permission_still_requires_write_access(): void
    {
        $this->signIn(3);
        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'resource_persons.page_access'],
            ['role_id' => 3, 'permission' => 'resource_persons.view.create.rp-register'],
        ]);

        $this->get('/app/admin/training/create/rp-register')->assertNotFound();

        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'resource_persons.write']);
        $this->get('/app/admin/training/create/rp-register')->assertOk();
    }

    public function test_credential_grants_add_access_without_narrowing_base_role_pages(): void
    {
        $user = $this->signIn(3);
        $credentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => 3,
            'name' => 'Evaluator and resource person',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('users')->where('user_id', $user->user_id)->update(['role_credential_id' => $credentialId]);
        $user->role_credential_id = $credentialId;
        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'trainings.read']);
        DB::table('role_credential_permissions')->insert([
            ['role_credential_id' => $credentialId, 'permission' => 'trainings.page_access'],
            ['role_credential_id' => $credentialId, 'permission' => 'trainings.view.details.all-status'],
            ['role_credential_id' => $credentialId, 'permission' => 'resource_persons.read'],
            ['role_credential_id' => $credentialId, 'permission' => 'resource_persons.write'],
            ['role_credential_id' => $credentialId, 'permission' => 'questionnaires.page_access'],
            ['role_credential_id' => $credentialId, 'permission' => 'questionnaires.view.details.list-questionnaire'],
        ]);

        $navigationPermissions = ModuleAccess::navigationAccess($user)['permissions'];
        $this->assertContains('trainings.view.details.inactive', $navigationPermissions);
        $this->assertContains('resource_persons.write', $navigationPermissions);
        $this->assertContains('questionnaires.view.details.list-questionnaire', $navigationPermissions);
        $this->assertNotContains('questionnaires.view.details.inactive', $navigationPermissions);
        $this->assertTrue(ModuleAccess::allowsNavigationPage($user, 'trainings', 'details.inactive'));
        $this->assertTrue(ModuleAccess::allowsNavigationPage($user, 'questionnaires', 'details.list-questionnaire'));
        $this->assertFalse(ModuleAccess::allowsNavigationPage($user, 'questionnaires', 'details.inactive'));
        $this->get('/app/admin/training/details/inactive')->assertOk();
        $this->get('/app/admin/evaluation/details/list-questionnaire')->assertOk();
        $this->get('/app/admin/evaluation/details/inactive')->assertNotFound();
        $this->get('/app/admin/training/create/rp-register')->assertOk();
    }

    public function test_approval_requires_design_and_stale_requests_cannot_repeat_notifications(): void
    {
        Storage::fake('local');
        Mail::fake();
        $user = $this->signIn();
        $recipient = User::factory()->create(['org_id' => 1]);
        User::factory()->create(['org_id' => 2]);
        User::factory()->create(['org_id' => 1, 'active_status' => 0]);
        $id = $this->training($user);

        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'For approval', 'version' => 1])->assertUnprocessable()->assertJsonValidationErrors('training_design');
        $this->assertDatabaseCount('training_status_changes', 0);
        $this->assertDatabaseCount('training_notifications', 0);
        $this->post('/operations/trainings/'.$id.'/attachments', ['kind' => 'Training design', 'file' => UploadedFile::fake()->createWithContent('design.pdf', "%PDF-1.4\nTraining design")])->assertRedirect();
        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'For approval', 'version' => 2])->assertOk();

        $this->assertDatabaseHas('trainings', ['id' => $id, 'status' => 'For approval', 'version' => 3]);
        $this->assertDatabaseCount('training_notifications', 2);
        $this->assertDatabaseHas('training_notifications', ['user_id' => $recipient->user_id, 'sent_at' => null]);
        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'Approved & Accepted', 'version' => 2])->assertConflict();
        $this->assertDatabaseCount('training_status_changes', 1);
        Mail::assertNothingSent();
    }

    public function test_training_workflow_requires_approval_then_acceptance_and_final_status_is_terminal(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $id = $this->training($user);
        $this->post('/operations/trainings/'.$id.'/attachments', [
            'kind' => 'Training design',
            'file' => UploadedFile::fake()->createWithContent('workflow-design.pdf', "%PDF-1.4\nTraining design"),
        ])->assertRedirect();

        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'For approval', 'version' => 2])->assertOk();
        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'Approved & Accepted', 'version' => 3])->assertConflict();
        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'For acceptance', 'version' => 3])->assertOk();
        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'Approved & Accepted', 'version' => 4])->assertOk();
        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'For review', 'version' => 5, 'reason' => 'Reopen'])->assertConflict();

        $this->assertDatabaseHas('trainings', ['id' => $id, 'status' => 'Approved & Accepted', 'version' => 5]);
    }

    public function test_final_acceptance_requires_the_accept_permission(): void
    {
        $user = $this->signIn(3);
        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'trainings.read'],
            ['role_id' => 3, 'permission' => 'trainings.approve'],
            ['role_id' => 3, 'permission' => 'trainings.accept'],
        ]);
        $id = $this->training($user, ['status' => 'For acceptance']);

        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'Approved & Accepted', 'version' => 1])->assertForbidden();
        $this->postJson(route('operations.trainings.bulk-status'), [
            'status' => 'Approved & Accepted',
            'trainings' => [['id' => $id, 'version' => 1]],
        ])->assertForbidden();
        $this->assertDatabaseHas('trainings', ['id' => $id, 'status' => 'For acceptance', 'version' => 1]);
    }

    public function test_bulk_acceptance_reversion_can_return_to_approval_with_remarks(): void
    {
        $user = $this->signIn(3);
        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'trainings.read'],
            ['role_id' => 3, 'permission' => 'trainings.accept'],
        ]);
        $first = $this->training($user, ['status' => 'For acceptance']);
        $second = $this->training($user, ['status' => 'For acceptance', 'name' => 'Second training']);

        $this->postJson(route('operations.trainings.bulk-status'), [
            'status' => 'For approval',
            'reason' => 'Approval details need correction.',
            'trainings' => [['id' => $first, 'version' => 1], ['id' => $second, 'version' => 1]],
        ])->assertOk()->assertJsonPath('message', '2 training status(es) updated.');

        $this->assertDatabaseHas('trainings', ['id' => $first, 'status' => 'For approval', 'version' => 2]);
        $this->assertDatabaseHas('trainings', ['id' => $second, 'status' => 'For approval', 'version' => 2]);
        $this->assertDatabaseHas('training_status_changes', ['training_id' => $first, 'to_status' => 'For approval', 'reason' => 'Approval details need correction.']);
    }

    public function test_bulk_status_transition_rolls_back_every_record_when_one_version_is_stale(): void
    {
        $user = $this->signIn();
        $first = $this->training($user, ['status' => 'For approval']);
        $second = $this->training($user, ['status' => 'For approval', 'name' => 'Second training']);

        $this->postJson(route('operations.trainings.bulk-status'), [
            'status' => 'For acceptance',
            'trainings' => [['id' => $first, 'version' => 1], ['id' => $second, 'version' => 9]],
        ])->assertConflict();

        $this->assertDatabaseHas('trainings', ['id' => $first, 'status' => 'For approval', 'version' => 1]);
        $this->assertDatabaseHas('trainings', ['id' => $second, 'status' => 'For approval', 'version' => 1]);
        $this->assertDatabaseCount('training_status_changes', 0);
    }

    public function test_credential_block_prevents_inherited_training_submission_while_head_can_submit(): void
    {
        Storage::fake('local');
        Mail::fake();
        $encoderCredentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => 3,
            'name' => 'Encoder permission test',
            'created_at' => now(),
        ], 'role_credential_id');
        $headCredentialId = DB::table('role_credentials')->insertGetId([
            'role_id' => 3,
            'name' => 'Head permission test',
            'created_at' => now(),
        ], 'role_credential_id');
        DB::table('role_permissions')->where('role_id', 3)->delete();
        DB::table('role_permissions')->insert([
            ['role_id' => 3, 'permission' => 'trainings.write'],
            ['role_id' => 3, 'permission' => 'trainings.submit'],
        ]);
        DB::table('role_credential_denied_permissions')->insert([
            'role_credential_id' => $encoderCredentialId,
            'permission' => 'trainings.submit',
        ]);

        $encoder = $this->signIn(3);
        DB::table('users')->where('user_id', $encoder->user_id)->update(['role_credential_id' => $encoderCredentialId]);
        $encoder->role_credential_id = $encoderCredentialId;
        $encoderTrainingId = $this->training($encoder);

        $this->postJson('/operations/trainings/'.$encoderTrainingId.'/status', [
            'status' => 'For approval',
            'version' => 1,
        ])->assertForbidden();
        $this->assertDatabaseHas('trainings', ['id' => $encoderTrainingId, 'status' => 'For review', 'version' => 1]);

        DB::table('role_permissions')->where('role_id', 3)->where('permission', 'trainings.submit')->delete();
        DB::table('role_credential_permissions')->insert([
            'role_credential_id' => $headCredentialId,
            'permission' => 'trainings.submit',
        ]);
        $head = $this->signIn(3);
        DB::table('users')->where('user_id', $head->user_id)->update(['role_credential_id' => $headCredentialId]);
        $head->role_credential_id = $headCredentialId;
        $headTrainingId = $this->training($head);
        $this->post('/operations/trainings/'.$headTrainingId.'/attachments', [
            'kind' => 'Training design',
            'file' => UploadedFile::fake()->createWithContent('head-design.pdf', "%PDF-1.4\nTraining design"),
        ])->assertRedirect();

        $this->postJson('/operations/trainings/'.$headTrainingId.'/status', [
            'status' => 'For approval',
            'version' => 2,
        ])->assertOk();
        $this->assertDatabaseHas('trainings', ['id' => $headTrainingId, 'status' => 'For approval', 'version' => 3]);
        $this->assertTrue(ModuleAccess::allows($head, 'trainings.submit'));
        $this->assertFalse(ModuleAccess::allows($encoder, 'trainings.submit'));
    }

    public function test_approval_and_acceptance_transitions_create_notifications_and_final_is_terminal(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $id = $this->training($user, ['status' => 'For approval']);
        Storage::disk('local')->put('design.pdf', '%PDF-1.4');
        DB::table('training_attachments')->insert(['training_id' => $id, 'kind' => 'Training design', 'path' => 'design.pdf', 'original_name' => 'design.pdf', 'mime_type' => 'application/pdf', 'size' => 8, 'uploaded_by' => $user->user_id]);

        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'For acceptance', 'version' => 1])->assertOk();
        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'Approved & Accepted', 'version' => 2])->assertOk();
        $this->postJson('/operations/trainings/'.$id.'/status', ['status' => 'For review', 'version' => 3, 'reason' => 'Reopen'])->assertConflict();

        $this->assertDatabaseHas('trainings', ['id' => $id, 'status' => 'Approved & Accepted', 'version' => 3]);
        $this->assertDatabaseCount('training_status_changes', 2);
        $this->assertDatabaseCount('training_notifications', 2);
        $this->getJson(route('admin.users.logs'))->assertOk()->assertJsonPath('total', 2);
    }

    public function test_training_reversion_and_final_acceptance_notices_show_reason_actor_office_and_time(): void
    {
        $this->freezeTime();
        Mail::fake();
        $actor = $this->signIn();
        $recipient = User::factory()->create(['role_id' => 3, 'org_id' => 1]);
        $recipientHash = Hash::make('Operations-password-123!');
        DB::table('user_auth')->insert(['user_id' => $recipient->user_id, 'password_hash' => $recipientHash]);
        User::factory()->create(['org_id' => 2]);
        $returnTraining = $this->training($actor, ['name' => 'Returned workshop', 'status' => 'For acceptance']);
        $acceptedTraining = $this->training($actor, ['name' => 'Accepted workshop', 'status' => 'For acceptance']);

        $this->postJson('/operations/trainings/'.$returnTraining.'/status', [
            'status' => 'For review',
            'version' => 1,
            'reason' => 'Please correct the participant count and attach the updated plan.',
        ])->assertOk();
        $this->postJson('/operations/trainings/'.$acceptedTraining.'/status', [
            'status' => 'Approved & Accepted',
            'version' => 1,
        ])->assertOk();

        $officeName = DB::table('organization')->where('org_id', 1)->value('name');
        $actorName = app(AccountDisplay::class)->forUser($actor)['navigationName'];
        $returnChangeId = DB::table('training_status_changes')->where('training_id', $returnTraining)->value('id');
        $returnNotificationId = DB::table('training_notifications')
            ->where('status_change_id', $returnChangeId)
            ->where('user_id', $recipient->user_id)
            ->value('id');
        $this->assertTrue(app(TrainingNotificationDelivery::class)->deliver((int) $returnNotificationId));
        Mail::assertSent(TrainingStatusChanged::class, function (TrainingStatusChanged $mail) use ($recipient, $actorName, $officeName): bool {
            $mail->assertSeeInText('Reason for return: Please correct the participant count and attach the updated plan.');
            $mail->assertSeeInText('Status changed by: '.$actorName.' ('.$officeName.')');

            return $mail->hasTo($recipient->email)
                && $mail->status === 'For review'
                && $mail->reason === 'Please correct the participant count and attach the updated plan.';
        });
        $this->actingAs($recipient)->withSession([
            'auth.verified_user_id' => $recipient->user_id,
            'auth.password_fingerprint' => hash('sha256', $recipientHash),
        ]);
        $this->getJson('/operations/notifications')->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonFragment([
                'title' => 'Training returned for changes',
                'from_status' => 'For acceptance',
                'to_status' => 'For review',
                'reason' => 'Please correct the participant count and attach the updated plan.',
                'actor_name' => $actorName,
                'actor_office_name' => $officeName,
                'training_office_name' => $officeName,
                'changed_at_human' => now()->format('M j, Y g:i A'),
            ])
            ->assertJsonFragment([
                'title' => 'Training approved and accepted',
                'from_status' => 'For acceptance',
                'to_status' => 'Approved & Accepted',
                'actor_name' => $actorName,
                'actor_office_name' => $officeName,
                'training_office_name' => $officeName,
            ]);

        $this->getJson('/ui/data')->assertOk()
            ->assertJsonFragment([
                'title' => 'Training returned for changes',
                'changedBy' => $actorName,
                'actorOffice' => $officeName,
                'office' => $officeName,
                'reason' => 'Please correct the participant count and attach the updated plan.',
            ]);
        $this->get('/operations/notifications')->assertOk()
            ->assertSee('Reason for return:')
            ->assertSee('Please correct the participant count and attach the updated plan.')
            ->assertSee($actorName)
            ->assertSee($officeName)
            ->assertSee(now()->format('M j, Y g:i A'));
    }

    public function test_private_attachments_reject_invalid_types_and_other_office_downloads(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $id = $this->training($user);
        $this->postJson('/operations/trainings/'.$id.'/attachments', ['kind' => 'Training design', 'file' => UploadedFile::fake()->createWithContent('bad.php', '<?php echo 1;')])->assertUnprocessable();
        $this->assertDatabaseCount('training_attachments', 0);
        $this->postJson('/operations/trainings/'.$id.'/attachments', ['kind' => 'Training design', 'file' => UploadedFile::fake()->createWithContent('design.pdf', "%PDF-1.4\nDesign")])->assertOk();
        $attachment = DB::table('training_attachments')->first();
        Storage::disk('local')->assertExists($attachment->path);
        $this->get('/operations/trainings/'.$id.'/attachments/'.$attachment->id)->assertDownload('design.pdf');
        $this->signIn(3, 2);
        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'trainings.read']);
        $this->get('/operations/trainings/'.$id.'/attachments/'.$attachment->id)->assertNotFound();
    }

    public function test_maintenance_blocks_staff_keeps_admin_settings_and_resumes_at_return_time(): void
    {
        $this->freezeTime();
        $this->signIn();
        $this->postJson('/system/settings', ['maintenance_enabled' => true, 'maintenance_message' => 'Scheduled upgrade', 'maintenance_until' => now()->addHour()->toDateTimeString()])->assertOk();
        $this->get('/system/settings')->assertOk()->assertSee('System settings');
        $this->signIn(3);
        $this->get('/app/admin/dashboard/dashboard')->assertStatus(503)->assertSee('Scheduled upgrade')->assertHeader('Retry-After', '60');
        $this->get('/two-factor')->assertStatus(503);
        $this->travel(61)->minutes();
        $this->get('/app/admin/dashboard/dashboard')->assertOk();
        $this->assertDatabaseHas('users_log', ['event' => 'maintenance_settings_updated']);
    }

    public function test_admin_scope_filters_multiple_regions_and_offices_without_changing_staff_scope(): void
    {
        $admin = $this->signIn();
        $this->training($admin);
        $other = $this->training($admin, ['org_id' => 2]);
        $this->postJson('/system/data-scope', ['region_ids' => [4], 'office_ids' => [2]])->assertOk();
        $this->getJson('/operations/trainings')->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $other);
        $this->postJson('/system/data-scope', ['region_ids' => [5], 'office_ids' => [2]])->assertUnprocessable();
        $this->postJson('/system/data-scope', [])->assertOk();
        $this->getJson('/operations/trainings')->assertJsonPath('total', 2);
        $this->signIn(3);
        $this->postJson('/system/data-scope', [])->assertForbidden();
    }

    public function test_custom_role_can_grant_deletion_without_modifying_system_admin(): void
    {
        $this->signIn();
        $this->postJson('/system/roles', ['name' => 'Training reader', 'permissions' => ['trainings.read']])->assertOk();
        $role = DB::table('user_roles')->where('name', 'Training reader')->value('role_id');
        $this->assertDatabaseHas('role_permissions', ['role_id' => $role, 'permission' => 'trainings.read']);
        $this->postJson('/system/roles', ['name' => 'Delete role', 'permissions' => ['trainings.delete']])->assertOk();
        $deleteRole = DB::table('user_roles')->where('name', 'Delete role')->value('role_id');
        $this->assertDatabaseHas('role_permissions', ['role_id' => $deleteRole, 'permission' => 'trainings.delete']);
        $this->patchJson('/system/roles/1', ['name' => 'Renamed', 'permissions' => []])->assertUnprocessable();
        $user = $this->signIn($role);
        $this->getJson('/operations/trainings')->assertOk();
        $this->get('/system/settings')->assertNotFound();
        $this->assertTrue(ModuleAccess::allows($user, 'trainings.read'));
        $this->assertFalse(ModuleAccess::allows($user, 'trainings.write'));
        $this->assertFalse(ModuleAccess::allows($user, 'trainings.delete'));
        $deleteUser = User::factory()->create(['role_id' => $deleteRole]);
        $this->assertTrue(ModuleAccess::allows($deleteUser, 'trainings.delete'));
    }

    public function test_email_outbox_delivers_once_and_records_recipient_activity(): void
    {
        Mail::fake();
        $user = $this->signIn();
        $id = $this->training($user, ['status' => 'Approved & Accepted']);
        $change = DB::table('training_status_changes')->insertGetId(['training_id' => $id, 'actor_user_id' => $user->user_id, 'from_status' => 'For acceptance', 'to_status' => 'Approved & Accepted', 'reason' => 'Final review complete.', 'created_at' => now()]);
        $notification = DB::table('training_notifications')->insertGetId(['status_change_id' => $change, 'user_id' => $user->user_id, 'email' => $user->email, 'created_at' => now()]);

        $this->artisan('tmis:deliver-training-notifications')->assertSuccessful();
        $this->artisan('tmis:deliver-training-notifications')->assertSuccessful();

        Mail::assertSent(TrainingStatusChanged::class, fn ($mail) => $mail->hasTo($user->email) && $mail->status === 'Approved & Accepted' && $mail->reason === 'Final review complete.' && $mail->changedBy === app(AccountDisplay::class)->forUser($user)['navigationName']);
        Mail::assertSentCount(1);
        $this->assertDatabaseHas('users_log', ['user_id' => $user->user_id, 'event' => 'training_email_sent']);
        $this->getJson('/operations/notifications')->assertJsonPath('total', 1);
        $this->patchJson('/operations/notifications/'.$notification)->assertOk();
        $this->assertNotNull(DB::table('training_notifications')->where('id', $notification)->value('read_at'));
    }

    public function test_evaluations_require_enrollment_matching_office_and_complete_answers(): void
    {
        $user = $this->signIn();
        $training = $this->training($user, ['status' => 'Approved & Accepted']);
        $participant = DB::table('participants')->insertGetId(['name' => 'Participant', 'region_id' => 4, 'org_id' => 1, 'created_by' => $user->user_id]);
        $questionnaire = DB::table('questionnaires')->insertGetId(['name' => 'Feedback', 'region_id' => 4, 'org_id' => 1, 'created_by' => $user->user_id, 'kind' => 'Training evaluation', 'questions' => json_encode(['Was this useful?'])]);
        $data = ['training_id' => $training, 'participant_id' => $participant, 'questionnaire_id' => $questionnaire, 'answers' => ['Yes']];
        $this->postJson('/operations/evaluations', $data)->assertUnprocessable();
        DB::table('training_participant')->insert(['training_id' => $training, 'participant_id' => $participant]);
        $this->postJson('/operations/evaluations', $data)->assertOk();
        $this->postJson('/operations/evaluations', $data)->assertConflict();
        $this->assertDatabaseCount('evaluation_responses', 1);
        $this->get('/operations/evaluations')->assertOk()->assertSee('Yes');
        $this->get('/operations/questionnaires?id='.$questionnaire)->assertOk()->assertSee('Was this useful?');
    }

    public function test_account_access_changes_are_admin_only_and_trash_blocks_login(): void
    {
        $admin = $this->signIn();
        $subject = User::factory()->create(['role_id' => 3]);
        $this->patchJson('/system/accounts/'.$subject->user_id, ['action' => 'update', 'role_id' => 2, 'region_id' => 4, 'org_id' => 2, 'status' => 'Approved & Accepted', 'active_status' => 1])->assertOk();
        $this->assertDatabaseHas('users', ['user_id' => $subject->user_id, 'role_id' => 2, 'org_id' => 2]);
        $this->patchJson('/system/accounts/'.$admin->user_id, ['action' => 'delete'])->assertUnprocessable();
        $this->patchJson('/system/accounts/'.$subject->user_id, ['action' => 'delete'])->assertOk();
        $this->assertFalse($subject->fresh()->isEligibleForLogin());
        $this->get('/system/accounts?state=trash')->assertOk()->assertSee($subject->email);
        $this->patchJson('/system/accounts/'.$subject->user_id, ['action' => 'restore'])->assertOk();
        $this->assertDatabaseHas('users', ['user_id' => $subject->user_id, 'deleted_at' => null, 'active_status' => 0]);
        $this->assertDatabaseHas('users_log', ['user_id' => $subject->user_id, 'actor_user_id' => $admin->user_id, 'event' => 'account_access_delete']);
        $this->signIn(3);
        $this->patchJson('/system/accounts/'.$subject->user_id, ['action' => 'delete'])->assertForbidden();
        $this->get('/system/accounts')->assertNotFound();
    }

    public function test_email_failure_is_retained_for_retry_and_cancelled_for_a_transferred_recipient(): void
    {
        $this->freezeTime();
        $user = $this->signIn();
        $training = $this->training($user, ['status' => 'Approved & Accepted']);
        $change = DB::table('training_status_changes')->insertGetId(['training_id' => $training, 'actor_user_id' => $user->user_id, 'from_status' => 'For acceptance', 'to_status' => 'Approved & Accepted', 'created_at' => now()]);
        $notification = DB::table('training_notifications')->insertGetId(['status_change_id' => $change, 'user_id' => $user->user_id, 'email' => $user->email, 'created_at' => now()]);
        Mail::shouldReceive('to')->once()->with($user->email)->andThrow(new TransportException('Mail offline'));

        $this->assertFalse(app(TrainingNotificationDelivery::class)->deliver($notification));
        $this->assertDatabaseHas('training_notifications', ['id' => $notification, 'sent_at' => null, 'attempts' => 1]);
        $this->assertDatabaseHas('users_log', ['user_id' => $user->user_id, 'event' => 'training_email_failed']);
        $this->travel(3)->minutes();
        DB::table('users')->where('user_id', $user->user_id)->update(['org_id' => 2]);
        $this->assertTrue(app(TrainingNotificationDelivery::class)->deliver($notification));
        $this->assertNotNull(DB::table('training_notifications')->where('id', $notification)->value('cancelled_at'));
    }

    public function test_notification_emails_escape_training_titles_in_html_and_include_plain_text(): void
    {
        $mail = new TrainingStatusChanged('<script>alert(1)</script>', 42, 'Approved');
        $mail->assertSeeInHtml('&lt;script&gt;alert(1)&lt;/script&gt;', false);
        $mail->assertDontSeeInHtml('<script>alert(1)</script>', false);
        $mail->assertSeeInText('New status: Approved');
    }

    /** @return array<string, array{string, array<string, mixed>}> */
    public static function records(): array
    {
        return [
            'participant' => ['participants', ['email' => 'participant@example.test', 'phone' => '09123456789']],
            'association' => ['associations', []],
            'resource person' => ['resource_persons', ['expertise' => 'Agriculture']],
            'questionnaire' => ['questionnaires', ['kind' => 'Pre-test', 'questions' => ['Question one?']]],
        ];
    }

    #[DataProvider('records')]
    public function test_module_records_can_be_created_updated_and_trashed(string $module, array $extra): void
    {
        $actor = $this->signIn();
        $payload = ['name' => 'New record', 'region_id' => 4, 'org_id' => 1] + $extra;
        $id = $this->postJson('/operations/'.$module, $payload)->assertCreated()->json('id');
        $this->get('/operations/'.$module.'?id='.$id)->assertOk()->assertSee('New record');
        $payload['name'] = 'Updated record';
        $this->patchJson('/operations/'.$module.'/'.$id, $payload)->assertOk();
        $this->assertDatabaseHas($module, ['id' => $id, 'name' => 'Updated record']);
        $this->deleteJson('/operations/'.$module.'/'.$id)->assertOk();
        $this->assertSoftDeleted($module, ['id' => $id]);
        $this->get('/operations/'.$module.'?id='.$id)->assertNotFound();
        $this->assertDatabaseHas('users_log', ['actor_user_id' => $actor->user_id, 'category' => $module, 'event' => $module.'_deleted_'.$id]);
    }

    public function test_existing_module_urls_keep_their_original_views_and_navigation(): void
    {
        $this->signIn();
        $this->get('/app/admin/training/id/view-training')->assertOk()->assertViewIs('admin.training.id.view-training');
        $this->get('/app/admin/training/update/for-approval')->assertOk()->assertViewIs('admin.training.update.for-approval');
        $this->get('/app/admin/participants/details/fa-all-list')->assertOk()->assertViewIs('admin.participants.details.fa-all-list');
        $this->get('/app/admin/evaluation/encode/pre-test')->assertOk()->assertViewIs('admin.evaluation.encode.pre-test');
        $this->get('/app/admin/dashboard/dashboard')->assertOk()->assertSee('app-wrapper')->assertDontSee('TMIS database operations:');
        $this->get('/app/admin/users/logs')->assertOk()->assertViewIs('admin.users.logs');
    }

    public function test_sensitive_requirements_are_encrypted_and_omitted_from_lists_and_audit(): void
    {
        $this->signIn();
        $id = $this->postJson('/operations/participants', ['name' => 'Private participant', 'region_id' => 4, 'org_id' => 1, 'sensitive' => ['allergies' => 'Private allergy details', 'unknown' => 'Unvalidated detail']])->assertCreated()->json('id');
        $stored = DB::table('participants')->where('id', $id)->value('protected_details');
        $this->assertStringNotContainsString('Private allergy details', $stored);
        $this->getJson('/operations/participants')->assertOk()->assertDontSee('Private allergy details')->assertDontSee('protected_details');
        $this->get('/operations/participants?id='.$id)->assertOk()->assertSee('Private allergy details')->assertDontSee('Unvalidated detail');
        $this->assertStringNotContainsString('Private allergy details', DB::table('users_log')->value('new_values'));
    }

    public function test_concurrent_training_edit_and_upload_after_approval_do_not_overwrite_workflow(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $id = $this->training($user);
        $payload = ['name' => 'Updated training', 'region_id' => 4, 'org_id' => 1, 'start_date' => '2026-12-01', 'end_date' => '2026-12-02', 'venue' => 'Hall', 'budget' => 500, 'version' => 1];
        $this->patchJson('/operations/trainings/'.$id, $payload)->assertOk();
        $this->patchJson('/operations/trainings/'.$id, $payload)->assertConflict();
        $this->assertDatabaseHas('trainings', ['id' => $id, 'name' => 'Updated training', 'version' => 2]);
        DB::table('trainings')->where('id', $id)->update(['status' => 'Approved & Accepted']);
        $this->postJson('/operations/trainings/'.$id.'/attachments', ['kind' => 'Training design', 'file' => UploadedFile::fake()->createWithContent('design.pdf', "%PDF-1.4\nDesign")])->assertConflict();
        $this->assertDatabaseCount('training_attachments', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('training-attachments'));
    }

    /** Keep activity private to its actor and verify the page loads the current safe renderer. */
    public function test_logs_are_actor_only_and_operation_content_is_html_escaped(): void
    {
        $user = $this->signIn();
        $other = User::factory()->create();
        DB::table('users_log')->insert([
            'user_id' => $other->user_id,
            'actor_user_id' => $other->user_id,
            'event' => 'private_other_event',
            'category' => 'account',
            'outcome' => 'success',
        ]);
        DB::table('users_log')->insert([
            'user_id' => $user->user_id,
            'actor_user_id' => $user->user_id,
            'event' => 'profile_updated',
            'category' => 'account',
            'outcome' => 'success',
        ]);
        $this->training($user, ['name' => '<script>alert(1)</script>']);
        $office = DB::table('organization')->where('org_id', $user->org_id)->value('name');
        $response = $this->getJson(route('admin.users.logs'));
        $response->assertJsonPath('total', 1)->assertJsonPath('data.0.event', 'Profile Updated')
            ->assertJsonPath('data.0.actor', $user->first_name.' '.$user->last_name.' - '.$office);
        $entry = $response->json('data.0');
        $this->assertArrayNotHasKey('user_id', $entry);
        $this->assertArrayNotHasKey('actor_user_id', $entry);
        $this->get(route('admin.users.logs'))->assertOk()
            ->assertDontSee('private_other_event')
            ->assertSee('src/css/users/logs.css?v=human-activity-summary-2', false)
            ->assertSee('src/js/users/logs.js?v=human-activity-summary-2', false);
        $this->get(route('admin.users.logs'))->assertSee('class="journal-dialog"', false)
            ->assertSee('id="activityDetailsFields"', false)
            ->assertDontSee('Changed fields');
        $this->get('/operations/trainings')->assertOk()->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)->assertDontSee('<script>alert(1)</script>', false);
    }

    /** Verify activity summaries name edited fields without exposing the stored field values. */
    public function test_activity_log_uses_a_concise_operation_summary(): void
    {
        $user = $this->signIn();
        $id = $this->training($user);
        $payload = [
            'name' => 'Updated training record',
            'region_id' => 4,
            'org_id' => 1,
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Updated training hall',
            'budget' => 500,
            'version' => 1,
        ];

        $this->patchJson('/operations/trainings/'.$id, $payload)->assertOk();

        $response = $this->getJson(route('admin.users.logs'))->assertOk();
        $response->assertJsonPath('data.0.description', 'Updated training record.');
        $this->assertStringNotContainsString('Updated training hall', $response->getContent());
        $auditValues = json_decode(DB::table('users_log')->where('event', 'trainings_updated_'.$id)->value('new_values'), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(['name', 'venue', 'budget'], $auditValues['changed_fields']);
    }
}
