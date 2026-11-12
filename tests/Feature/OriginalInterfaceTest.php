<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
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

    public function test_custom_statuses_are_primary_farmer_statuses_only(): void
    {
        $this->signIn();
        $statusId = DB::table('record_statuses')->insertGetId([
            'name' => 'For monitoring',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $associationResponse = $this->save('tmis-farmer-associations', [
            'id' => 'FA-CUSTOM-STATUS',
            'association_name' => 'Custom-status association',
            'status' => 'Active',
            'customStatusId' => (string) $statusId,
        ])->assertOk();
        $this->assertArrayNotHasKey('customStatus', $associationResponse->json('stores.tmis-farmer-associations.0'));

        $farmerResponse = $this->save('tmis-farmers', [
            'id' => 'FMR-CUSTOM-STATUS',
            'first_name' => 'Status',
            'last_name' => 'Farmer',
            'farmerStatusId' => (string) $statusId,
        ])->assertOk()
            ->assertJsonPath('stores.tmis-farmers.0.farmerStatusId', (string) $statusId)
            ->assertJsonPath('stores.tmis-farmers.0.status', 'For monitoring');
        $this->assertDatabaseHas('participants', ['record_status_id' => $statusId]);
        $this->assertArrayNotHasKey('customStatus', $farmerResponse->json('stores.tmis-farmers.0'));

        $resourcePersonResponse = $this->save('tmis-resource-persons', [
            'id' => 'RP-CUSTOM-STATUS',
            'first_name' => 'Status',
            'last_name' => 'Resource',
            'email' => 'resource-status@example.test',
            'customStatusId' => (string) $statusId,
        ])->assertOk();
        $this->assertArrayNotHasKey('customStatus', $resourcePersonResponse->json('stores.tmis-resource-persons.0'));

        $trainingResponse = $this->save('tmis-trainings', [
            'id' => 'TRN-CUSTOM-STATUS',
            'training_title' => 'Custom-status training',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
            'customStatusId' => (string) $statusId,
        ])->assertOk()
            ->assertJsonPath('stores.tmis-trainings.0.workflowStatus', 'For Review');
        $this->assertArrayNotHasKey('customStatus', $trainingResponse->json('stores.tmis-trainings.0'));

        foreach (['associations', 'trainings', 'resource_persons'] as $table) {
            $this->assertFalse(Schema::hasColumn($table, 'record_status_id'));
        }

        DB::table('record_statuses')->where('id', $statusId)->update(['is_active' => false]);
        $association = $associationResponse->json('stores.tmis-farmer-associations.0');
        $association['association_name'] = 'Updated custom-status association';
        $this->save('tmis-farmer-associations', $association)->assertOk()
            ->assertJsonPath('stores.tmis-farmer-associations.0.status', 'Active');
        $farmer = $farmerResponse->json('stores.tmis-farmers.0');
        $farmer['first_name'] = 'Updated';
        $this->save('tmis-farmers', $farmer)->assertOk()
            ->assertJsonPath('stores.tmis-farmers.0.status', 'For monitoring');
        $this->save('tmis-farmers', [
            'id' => 'FMR-UNAVAILABLE-STATUS',
            'first_name' => 'Unavailable',
            'last_name' => 'Farmer',
            'farmerStatusId' => (string) $statusId,
        ])->assertUnprocessable();
    }

    public function test_dashboard_association_count_uses_database_active_status(): void
    {
        $this->signIn();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-STALE-STATUS',
            'association_name' => 'Inactive Association',
            'region_id' => '4',
            'org_id' => '1',
            'status' => 'Active',
        ])->assertOk();

        DB::table('associations')->where('ui_id', 'FA-STALE-STATUS')->update(['is_active' => false]);

        $this->getJson('/ui/data')
            ->assertOk()
            ->assertJsonPath('stores.tmis-farmer-associations.0.status', 'Inactive')
            ->assertJsonPath('dashboard.associationCount', 0);
    }

    public function test_inactive_training_data_preserves_its_active_state_and_workflow_status(): void
    {
        $this->signIn();
        $this->save('tmis-trainings', [
            'id' => 'TRN-INACTIVE-WORKFLOW',
            'training_title' => 'Inactive workflow training',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
            'budget' => 1000,
        ])->assertOk();
        DB::table('trainings')->where('ui_id', 'TRN-INACTIVE-WORKFLOW')->update([
            'status' => 'For acceptance',
            'is_active' => false,
            'status_remarks' => 'The training location is unavailable.',
        ]);

        $this->getJson('/ui/data')
            ->assertOk()
            ->assertJsonPath('stores.tmis-trainings.0.status', 'Inactive')
            ->assertJsonPath('stores.tmis-trainings.0.workflowStatus', 'For Acceptance')
            ->assertJsonPath('stores.tmis-trainings.0.is_active', false)
            ->assertJsonPath('stores.tmis-trainings.0.statusRemarks', 'The training location is unavailable.');
    }

    public function test_association_registration_saves_a_region_and_its_matching_office(): void
    {
        $this->signIn(1, 2);
        $this->get(route('admin.participants.create.fa-register'))
            ->assertOk()
            ->assertSee('id="faRegion" name="region_id"', false)
            ->assertSee('id="faOffice" name="org_id"', false);

        $response = $this->save('tmis-farmer-associations', [
            'id' => 'FA-2026-002',
            'association_name' => 'Region-scoped Association',
            'region_id' => '4',
            'org_id' => '2',
            'organization_type' => 'Association',
            'registration_date' => '2026-01-01',
            'year_covered' => '2026',
            'status' => 'Active',
        ])->assertOk();

        $this->assertDatabaseHas('associations', [
            'ui_id' => 'FA-2026-002',
            'region_id' => 4,
            'org_id' => 2,
            'name' => 'Region-scoped Association',
        ]);
        $association = collect($response->json('stores.tmis-farmer-associations'))
            ->firstWhere('id', 'FA-2026-002');

        $this->assertSame(4, $association['region_id']);
        $this->assertSame(2, $association['org_id']);
        $this->assertSame('Region IV-A', $association['region']);
        $this->assertSame('DA - 4K', $association['office']);
    }

    public function test_administrator_association_choices_follow_saved_region_and_office_visibility(): void
    {
        $user = $this->signIn(1, 1);
        DB::table('user_data_scopes')->insert([
            'user_id' => $user->user_id,
            'region_ids' => json_encode([4], JSON_THROW_ON_ERROR),
            'office_ids' => json_encode([2], JSON_THROW_ON_ERROR),
        ]);

        $response = $this->getJson('/ui/data')->assertOk();

        $this->assertSame([4], $response->json('registration.regionIds'));
        $this->assertSame([2], $response->json('registration.officeIds'));
        $this->assertSame([4], array_column($response->json('registration.regions'), 'region_id'));
        $this->assertSame([2], array_column($response->json('registration.offices'), 'org_id'));
    }

    public function test_administrator_with_unrestricted_saved_visibility_gets_unrestricted_choices(): void
    {
        $user = $this->signIn(1, 1);
        DB::table('user_data_scopes')->insert([
            'user_id' => $user->user_id,
            'region_ids' => null,
            'office_ids' => null,
        ]);

        $response = $this->getJson('/ui/data')->assertOk();

        $this->assertNull($response->json('registration.regionIds'));
        $this->assertNull($response->json('registration.officeIds'));
        $this->assertNotEmpty($response->json('regions'));
        $this->assertNotEmpty($response->json('offices'));
    }

    public function test_administrator_without_saved_visibility_can_register_training_in_another_office(): void
    {
        $this->signIn(1, 1);
        $response = $this->save('tmis-trainings', [
            'id' => 'TRN-ADMIN-OTHER-OFFICE',
            'training_title' => 'Administrator cross-office training',
            'region_id' => '4',
            'org_id' => '2',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
        ])->assertOk();

        $training = collect($response->json('stores.tmis-trainings'))
            ->firstWhere('id', 'TRN-ADMIN-OTHER-OFFICE');
        $this->assertSame(2, $training['org_id']);
        $this->assertDatabaseHas('trainings', [
            'ui_id' => 'TRN-ADMIN-OTHER-OFFICE',
            'region_id' => 4,
            'org_id' => 2,
        ]);
    }

    public function test_staff_cannot_register_training_outside_their_account_office(): void
    {
        $this->signIn(2, 2);
        DB::table('role_permissions')->insert([
            'role_id' => 2,
            'permission' => 'trainings.create',
        ]);

        $this->save('tmis-trainings', [
            'id' => 'TRN-STAFF-OTHER-OFFICE',
            'training_title' => 'Out-of-scope training',
            'region_id' => '4',
            'org_id' => '1',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
        ])->assertForbidden()
            ->assertJsonPath('message', 'The selected training office is outside your data visibility settings.');

        $this->assertDatabaseMissing('trainings', ['ui_id' => 'TRN-STAFF-OTHER-OFFICE']);
    }

    public function test_training_affiliations_are_persisted_and_returned_for_association_and_training(): void
    {
        $this->signIn();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-TRAINING-LINK',
            'association_name' => 'Training-linked association',
            'region_id' => '4',
            'org_id' => '1',
            'status' => 'Active',
        ])->assertOk();
        $trainingResponse = $this->save('tmis-trainings', [
            'id' => 'TRN-ASSOCIATION-LINK',
            'training_title' => 'Association-linked training',
            'region_id' => '4',
            'org_id' => '1',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
            'associationIds' => ['FA-TRAINING-LINK'],
        ])->assertOk();

        $training = collect($trainingResponse->json('stores.tmis-trainings'))
            ->firstWhere('id', 'TRN-ASSOCIATION-LINK');
        $association = collect($trainingResponse->json('stores.tmis-farmer-associations'))
            ->firstWhere('id', 'FA-TRAINING-LINK');
        $trainingId = DB::table('trainings')->where('ui_id', 'TRN-ASSOCIATION-LINK')->value('id');
        $associationId = DB::table('associations')->where('ui_id', 'FA-TRAINING-LINK')->value('id');

        $this->assertDatabaseHas('training_association', [
            'training_id' => $trainingId,
            'association_id' => $associationId,
        ]);
        $this->assertSame(['FA-TRAINING-LINK'], $training['associationIds']);
        $this->assertSame('TRN-ASSOCIATION-LINK', $association['trainings'][0]['id']);

        $training['associationIds'] = [];
        $updated = $this->save('tmis-trainings', $training)->assertOk();
        $this->assertDatabaseMissing('training_association', [
            'training_id' => $trainingId,
            'association_id' => $associationId,
        ]);
        $this->assertSame(
            [],
            collect($updated->json('stores.tmis-trainings'))->firstWhere('id', 'TRN-ASSOCIATION-LINK')['associationIds'],
        );
    }

    public function test_training_affiliation_updates_require_association_read_access(): void
    {
        $this->signIn(1, 2);
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-PRIVATE-TRAINING-LINK',
            'association_name' => 'Scoped association',
            'region_id' => '4',
            'org_id' => '2',
            'status' => 'Active',
        ])->assertOk();

        $this->signIn(2, 2);
        DB::table('role_permissions')->insert([
            'role_id' => 2,
            'permission' => 'trainings.create',
        ]);
        $this->save('tmis-trainings', [
            'id' => 'TRN-PRIVATE-ASSOCIATION-LINK',
            'training_title' => 'Association permission check',
            'region_id' => '4',
            'org_id' => '2',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
            'associationIds' => ['FA-PRIVATE-TRAINING-LINK'],
        ])->assertForbidden();

        $this->assertDatabaseMissing('trainings', ['ui_id' => 'TRN-PRIVATE-ASSOCIATION-LINK']);
        $this->assertDatabaseCount('training_association', 0);
    }

    public function test_staff_registration_choices_are_limited_to_their_account_region_and_office(): void
    {
        $this->signIn(2, 2);

        $response = $this->getJson('/ui/data')->assertOk();

        $this->assertSame([4], $response->json('registration.regionIds'));
        $this->assertSame([2], $response->json('registration.officeIds'));
        $this->assertSame([4], array_column($response->json('registration.regions'), 'region_id'));
        $this->assertSame([2], array_column($response->json('registration.offices'), 'org_id'));
    }

    public function test_association_registration_rejects_an_office_outside_administrator_visibility(): void
    {
        $user = $this->signIn(1, 1);
        DB::table('user_data_scopes')->insert([
            'user_id' => $user->user_id,
            'region_ids' => json_encode([4], JSON_THROW_ON_ERROR),
            'office_ids' => json_encode([2], JSON_THROW_ON_ERROR),
        ]);

        $this->save('tmis-farmer-associations', [
            'id' => 'FA-OUTSIDE-SCOPE',
            'association_name' => 'Outside scope association',
            'region_id' => '4',
            'org_id' => '1',
            'status' => 'Active',
        ])->assertForbidden()
            ->assertJsonPath('message', 'The selected association office is outside your data visibility settings.');

        $this->assertDatabaseMissing('associations', ['ui_id' => 'FA-OUTSIDE-SCOPE']);
    }

    public function test_association_location_remains_locked_after_registration(): void
    {
        $user = $this->signIn(1, 1);
        DB::table('user_data_scopes')->insert([
            'user_id' => $user->user_id,
            'region_ids' => null,
            'office_ids' => null,
        ]);
        $response = $this->save('tmis-farmer-associations', [
            'id' => 'FA-LOCKED-LOCATION',
            'association_name' => 'Locked location association',
            'region_id' => '4',
            'org_id' => '1',
            'status' => 'Active',
        ])->assertOk();
        $association = collect($response->json('stores.tmis-farmer-associations'))->firstWhere('id', 'FA-LOCKED-LOCATION');
        $association['org_id'] = 2;

        $this->save('tmis-farmer-associations', $association)->assertUnprocessable();

        $this->assertDatabaseHas('associations', [
            'ui_id' => 'FA-LOCKED-LOCATION',
            'region_id' => 4,
            'org_id' => 1,
        ]);
    }

    public function test_association_registration_generates_a_globally_sequential_reference_id(): void
    {
        $this->signIn(1, 1);
        $this->travelTo(Carbon::parse('2026-11-09 12:00:00', 'Asia/Manila'));
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-2026-001',
            'association_name' => 'Existing Association',
            'region_id' => '4',
            'org_id' => '1',
            'status' => 'Active',
        ])->assertOk();

        $this->signIn(1, 2);
        $temporaryId = 'FA-TEMP-550e8400-e29b-41d4-a716-446655440000';
        $response = $this->save('tmis-farmer-associations', [
            'id' => $temporaryId,
            'association_name' => 'Newly Registered Association',
            'region_id' => '4',
            'org_id' => '2',
            'status' => 'Active',
        ])->assertOk();

        $this->assertSame('FA-2026-002', $response->json('idMappings.'.$temporaryId));
        $this->assertDatabaseHas('associations', [
            'ui_id' => 'FA-2026-002',
            'name' => 'Newly Registered Association',
            'region_id' => 4,
            'org_id' => 2,
            'is_active' => true,
        ]);
        $this->assertSame(
            'Newly Registered Association',
            collect($response->json('stores.tmis-farmer-associations'))->firstWhere('id', 'FA-2026-002')['association_name'],
        );
    }

    public function test_active_and_inactive_association_tables_render_their_database_records(): void
    {
        $this->signIn();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-LIST-ACTIVE',
            'association_name' => 'Active list association',
            'region_id' => '4',
            'office' => 'DA - SAAD',
            'status' => 'Active',
        ])->assertOk();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-LIST-INACTIVE',
            'association_name' => 'Inactive list association',
            'region_id' => '4',
            'office' => 'DA - SAAD',
            'status' => 'Inactive',
        ])->assertOk();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-LIST-DECEASED',
            'association_name' => 'Deceased list association',
            'region_id' => '4',
            'office' => 'DA - SAAD',
            'status' => 'Deceased',
        ])->assertOk();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-LIST-WAIVED',
            'association_name' => 'Waived list association',
            'region_id' => '4',
            'office' => 'DA - SAAD',
            'status' => 'Removed',
        ])->assertOk();

        $this->get(route('admin.participants.details.fa-all-list'))
            ->assertOk()
            ->assertSee('data-fa-list-status="Active"', false)
            ->assertSee('Active Farmer Associations')
            ->assertSee('Only active association registrations appear here.')
            ->assertDontSee('including inactive associations')
            ->assertSee('Active Associations')
            ->assertDontSee('All association statuses')
            ->assertSee('id="refreshReviewTable"', false)
            ->assertSee('id="regionFilter"', false)
            ->assertSee('data-column="region"', false);
        $inactivePage = $this->get(route('admin.participants.details.fa-inactive'))
            ->assertOk()
            ->assertSee('data-fa-list-status="Inactive"', false)
            ->assertSee('Only inactive association registrations appear here.')
            ->assertDontSee('deceased')
            ->assertSee('id="refreshReviewTable"', false)
            ->assertSee('id="regionFilter"', false)
            ->assertSee('data-column="region"', false);
        $this->assertDoesNotMatchRegularExpression(
            '/<span class="status-badge status-inactive">(?:Deceased|Waived)<\/span>/',
            $inactivePage->getContent(),
        );

        $associations = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmer-associations'));
        $this->assertSame('Active', $associations->firstWhere('id', 'FA-LIST-ACTIVE')['status']);
        $this->assertSame('Inactive', $associations->firstWhere('id', 'FA-LIST-INACTIVE')['status']);
        $this->assertSame('Deceased', $associations->firstWhere('id', 'FA-LIST-DECEASED')['status']);
        $this->assertSame('Removed', $associations->firstWhere('id', 'FA-LIST-WAIVED')['status']);
        $this->assertSame('Region IV-A', $associations->firstWhere('id', 'FA-LIST-ACTIVE')['region']);
    }

    public function test_all_farmer_status_page_lists_only_active_profiles(): void
    {
        $this->signIn();
        $this->save('tmis-farmers', [
            'id' => 'FMR-LIST-ACTIVE',
            'fname' => 'Active',
            'lname' => 'Farmer',
            'gender' => 'Female',
            'dob' => '1990-01-01',
            'status' => 'Active',
        ])->assertOk();
        $this->save('tmis-farmers', [
            'id' => 'FMR-LIST-INACTIVE',
            'fname' => 'Inactive',
            'lname' => 'Farmer',
            'gender' => 'Female',
            'dob' => '1990-01-01',
            'status' => 'Inactive',
        ])->assertOk();

        $this->get(route('admin.participants.details.all-with-status'))
            ->assertOk()
            ->assertSee('Active Farmer Profiles')
            ->assertSee('Active Farmers')
            ->assertSee('View and manage active farmer profiles.')
            ->assertSee('Inactive farmer profiles are excluded from this list.')
            ->assertDontSee('This list includes active and inactive farmer profiles.')
            ->assertSee('all-status.js?v=farmer-status-directory-2', false);
        $farmers = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmers'));
        $this->assertSame('Active', $farmers->firstWhere('id', 'FMR-LIST-ACTIVE')['status']);
        $this->assertSame('Inactive', $farmers->firstWhere('id', 'FMR-LIST-INACTIVE')['status']);
    }

    public function test_farmer_association_view_and_edit_pages_accept_the_association_id_in_the_path(): void
    {
        $this->signIn();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-PATH-001',
            'association_name' => 'Path-based Association',
            'region_id' => '4',
            'org_id' => '1',
            'status' => 'Active',
        ])->assertOk();

        $this->get(route('admin.participants.id.view-fa', ['id' => 'FA-PATH-001']))
            ->assertOk()
            ->assertViewIs('admin.participants.id.view-fa')
            ->assertSee('FA-PATH-001')
            ->assertSee('Path-based Association')
            ->assertSee('data-fa-field="region"', false);
        $this->get(route('admin.participants.id.edit-fa', ['id' => 'FA-PATH-001']))
            ->assertOk()
            ->assertViewIs('admin.participants.id.edit-fa')
            ->assertSee('FA-PATH-001')
            ->assertSee('Path-based Association')
            ->assertSee('id="faEditRegion" name="region_id" required disabled', false)
            ->assertSee('id="faEditOffice" name="org_id" required disabled', false);
        $this->get('/app/admin/participants/id/view-fa.html?faId=FA-PATH-001')
            ->assertRedirect(route('admin.participants.id.view-fa', ['id' => 'FA-PATH-001']), 301);
    }

    public function test_association_registration_renders_active_geographic_locations_from_the_database(): void
    {
        $this->signIn();
        $provinceId = DB::table('geographic_locations')->insertGetId([
            'region_id' => 4,
            'kind' => 'province',
            'name' => 'Association Test Province',
            'is_active' => true,
        ]);
        $districtId = DB::table('geographic_locations')->insertGetId([
            'region_id' => 4,
            'parent_id' => $provinceId,
            'kind' => 'district',
            'name' => 'Association Test District',
            'is_active' => true,
        ]);
        $municipalityId = DB::table('geographic_locations')->insertGetId([
            'region_id' => 4,
            'parent_id' => $districtId,
            'kind' => 'municipality',
            'name' => 'Association Test Municipality',
            'is_active' => true,
        ]);
        DB::table('geographic_locations')->insert([
            'region_id' => 4,
            'parent_id' => $municipalityId,
            'kind' => 'barangay',
            'name' => 'Association Test Barangay',
            'is_active' => true,
        ]);
        DB::table('geographic_locations')->insert([
            'region_id' => 4,
            'kind' => 'province',
            'name' => 'Inactive Association Province',
            'is_active' => false,
        ]);

        $response = $this->get(route('admin.participants.create.fa-register'))
            ->assertOk()
            ->assertSee('id="faRegion" name="region_id"', false)
            ->assertSee('Association Test Province')
            ->assertSee('Association Test District')
            ->assertSee('Association Test Municipality')
            ->assertSee('Association Test Barangay')
            ->assertDontSee('Inactive Association Province');
    }

    public function test_training_registration_and_edit_forms_receive_active_database_locations(): void
    {
        $this->signIn();
        $provinceId = DB::table('geographic_locations')->insertGetId([
            'region_id' => 4,
            'kind' => 'province',
            'name' => 'Training Form Province',
            'is_active' => true,
        ]);
        $districtId = DB::table('geographic_locations')->insertGetId([
            'region_id' => 4,
            'parent_id' => $provinceId,
            'kind' => 'district',
            'name' => 'Training Form District',
            'is_active' => true,
        ]);
        $municipalityId = DB::table('geographic_locations')->insertGetId([
            'region_id' => 4,
            'parent_id' => $districtId,
            'kind' => 'municipality',
            'name' => 'Training Form Municipality',
            'is_active' => true,
        ]);
        DB::table('geographic_locations')->insert([
            'region_id' => 4,
            'parent_id' => $municipalityId,
            'kind' => 'barangay',
            'name' => 'Training Form Barangay',
            'is_active' => true,
        ]);
        DB::table('geographic_locations')->insert([
            'region_id' => 4,
            'kind' => 'province',
            'name' => 'Inactive Training Province',
            'is_active' => false,
        ]);

        foreach ([
            route('admin.training.create.register'),
            route('admin.training.id.edit-training'),
        ] as $url) {
            $this->get($url)
                ->assertOk()
                ->assertSee('Training Form Province')
                ->assertSee('Training Form District')
                ->assertSee('Training Form Municipality')
                ->assertSee('Training Form Barangay')
                ->assertDontSee('Inactive Training Province');
        }
    }

    public function test_training_participant_editor_uses_search_refresh_export_and_select_all_controls(): void
    {
        $this->signIn();

        $this->get(route('admin.training.id.edit-training'))
            ->assertOk()
            ->assertSee('Search ID, name, or barangay')
            ->assertSee('data-refresh-participants="current"', false)
            ->assertSee('data-refresh-participants="available"', false)
            ->assertSee('data-export-participants="current"', false)
            ->assertSee('data-export-participants="available"', false)
            ->assertSee('id="editSelectAll"', false)
            ->assertDontSee('data-location-filter=', false)
            ->assertDontSee('id="editAvailableClear"', false);
    }

    public function test_training_editor_renders_active_status_modal_with_conditional_remarks(): void
    {
        $this->signIn();

        $this->get(route('admin.training.id.edit-training'))
            ->assertOk()
            ->assertSee('id="editTrainingStatusButton"', false)
            ->assertSee('id="editTrainingStatusModal"', false)
            ->assertSee('id="editTrainingActiveStatus"', false)
            ->assertSee('id="editTrainingStatusRemarks"', false)
            ->assertSee('Current workflow status');
    }

    public function test_training_edit_and_view_pages_render_status_badges(): void
    {
        $this->signIn();
        $this->save('tmis-trainings', [
            'id' => 'TRN-STATUS-BADGE',
            'training_title' => 'Status badge training',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
        ])->assertOk();

        $this->get(route('admin.training.id.edit-training', ['id' => 'TRN-STATUS-BADGE']))
            ->assertOk()
            ->assertSee('id="editTrainingStatusBadge"', false)
            ->assertSee('data-status="neutral"', false);

        $this->get(route('admin.training.id.view-training', ['id' => 'TRN-STATUS-BADGE']))
            ->assertOk()
            ->assertSee('data-training-field="status"', false)
            ->assertSee('data-status="neutral"', false);
    }

    public function test_association_registration_rejects_an_office_from_a_different_region(): void
    {
        $this->signIn();

        $this->save('tmis-farmer-associations', [
            'id' => 'FA-2026-003',
            'association_name' => 'Mismatched Association',
            'region_id' => '1',
            'org_id' => '2',
        ])->assertUnprocessable()->assertJsonValidationErrors('org_id');

        $this->assertDatabaseMissing('associations', ['ui_id' => 'FA-2026-003']);
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

        $this->get(route('admin.participants.id.view-farmer', ['id' => $farmerNumber]))
            ->assertOk()
            ->assertViewIs('admin.participants.id.view-farmer');
        $this->get(route('admin.participants.id.edit-farmer', ['id' => $farmerNumber]))
            ->assertOk()
            ->assertViewIs('admin.participants.id.edit-farmer');
        $this->get('/app/admin/participants/id/view-farmer?id=FMR-ROUTE-001')->assertOk();
        $this->getJson('/ui/data', [
            'X-TMIS-PAGE' => '/app/admin/participants/id/view-farmer/'.$farmerNumber,
        ])->assertOk()
            ->assertJsonPath('stores.tmis-farmers.0.activityLogs.0.title', 'Farmer Profile Created')
            ->assertJsonPath('stores.tmis-farmers.0.activityLogs.0.status', 'Success');
    }

    public function test_association_roster_exposes_farmer_number_separately_from_internal_id(): void
    {
        $this->signIn();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-ROSTER-001',
            'association_name' => 'Roster Association',
            'region_id' => '4',
            'org_id' => '1',
            'status' => 'Active',
        ])->assertOk();
        $this->save('tmis-farmers', [
            'id' => 'FMR-ROSTER-001',
            'fname' => 'Ana',
            'lname' => 'Santos',
            'status' => 'Active',
            'association_id' => 'FA-ROSTER-001',
        ])->assertOk();

        $association = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmer-associations'))
            ->firstWhere('id', 'FA-ROSTER-001');
        $member = $association['members'][0];

        $this->assertSame('FMR-ROSTER-001', $member['farmer_id']);
        $this->assertMatchesRegularExpression('/^\d{8}$/', $member['farmerNumber']);
        $this->assertSame('Active', $member['status']);
        $this->assertNotEmpty($member['member_since']);

        $association['members'] = [
            ['farmer_id' => 'FMR-ROSTER-001', 'position' => 'Member'],
            ['farmer_id' => 'FMR-ROSTER-001', 'position' => 'Secretary'],
        ];
        $updated = $this->save('tmis-farmer-associations', $association)->assertOk();
        $updatedMembers = collect($updated->json('stores.tmis-farmer-associations'))
            ->firstWhere('id', 'FA-ROSTER-001')['members'];

        $this->assertCount(1, $updatedMembers);
        $this->assertSame('Secretary', $updatedMembers[0]['position']);
        $this->assertSame(1, DB::table('participant_association_memberships')
            ->where('participant_id', DB::table('participants')->where('ui_id', 'FMR-ROSTER-001')->value('id'))
            ->where('association_id', DB::table('associations')->where('ui_id', 'FA-ROSTER-001')->value('id'))
            ->count());
    }

    public function test_farmer_can_keep_multiple_association_memberships_with_distinct_roles(): void
    {
        $this->signIn();
        foreach ([
            ['FA-MULTI-PRIMARY', 'Primary Association'],
            ['FA-MULTI-SECONDARY', 'Secondary Association'],
        ] as [$id, $name]) {
            $this->save('tmis-farmer-associations', [
                'id' => $id,
                'association_name' => $name,
                'region_id' => '4',
                'org_id' => '1',
                'status' => 'Active',
            ])->assertOk();
        }
        $this->save('tmis-farmers', [
            'id' => 'FMR-MULTI-ASSOCIATION',
            'fname' => 'Ana',
            'lname' => 'Santos',
            'status' => 'Active',
            'association_id' => 'FA-MULTI-PRIMARY',
            'associate_role' => 'Chairperson',
        ])->assertOk();
        $secondaryAssociation = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmer-associations'))
            ->firstWhere('id', 'FA-MULTI-SECONDARY');
        $secondaryAssociation['members'] = [[
            'farmer_id' => 'FMR-MULTI-ASSOCIATION',
            'position' => 'Treasurer',
        ]];

        $this->save('tmis-farmer-associations', $secondaryAssociation)->assertOk();
        $farmer = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmers'))
            ->firstWhere('id', 'FMR-MULTI-ASSOCIATION');

        $this->assertSame([
            ['Primary Association', 'Chairperson', true],
            ['Secondary Association', 'Treasurer', false],
        ], array_map(
            fn (array $membership): array => [$membership['name'], $membership['role'], $membership['isPrimary']],
            $farmer['associationMemberships'],
        ));
        $this->assertDatabaseHas('participant_association_memberships', [
            'participant_id' => DB::table('participants')->where('ui_id', 'FMR-MULTI-ASSOCIATION')->value('id'),
            'association_id' => DB::table('associations')->where('ui_id', 'FA-MULTI-PRIMARY')->value('id'),
            'role' => 'Chairperson',
            'is_primary' => true,
        ]);
        $this->assertDatabaseHas('participant_association_memberships', [
            'participant_id' => DB::table('participants')->where('ui_id', 'FMR-MULTI-ASSOCIATION')->value('id'),
            'association_id' => DB::table('associations')->where('ui_id', 'FA-MULTI-SECONDARY')->value('id'),
            'role' => 'Treasurer',
            'is_primary' => false,
        ]);

        $farmer['associate_role'] = 'Secretary';
        $this->save('tmis-farmers', $farmer)->assertOk();

        $this->assertDatabaseHas('participant_association_memberships', [
            'participant_id' => DB::table('participants')->where('ui_id', 'FMR-MULTI-ASSOCIATION')->value('id'),
            'association_id' => DB::table('associations')->where('ui_id', 'FA-MULTI-PRIMARY')->value('id'),
            'role' => 'Secretary',
            'is_primary' => true,
        ]);
        $this->assertDatabaseHas('participant_association_memberships', [
            'participant_id' => DB::table('participants')->where('ui_id', 'FMR-MULTI-ASSOCIATION')->value('id'),
            'association_id' => DB::table('associations')->where('ui_id', 'FA-MULTI-SECONDARY')->value('id'),
            'role' => 'Treasurer',
            'is_primary' => false,
        ]);

        $this->get(route('admin.participants.id.view-farmer', ['id' => 'FMR-MULTI-ASSOCIATION']))
            ->assertOk()
            ->assertSee('data-association-memberships', false)
            ->assertSee('Secondary Association')
            ->assertSee('Treasurer');
        $this->get(route('admin.participants.id.edit-farmer', ['id' => 'FMR-MULTI-ASSOCIATION']))
            ->assertOk()
            ->assertSee('id="farmer_association_id" name="association_id" disabled', false)
            ->assertSee('data-association-memberships', false)
            ->assertSee('Secondary Association')
            ->assertSee('Treasurer');

        $updatedFarmer = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmers'))
            ->firstWhere('id', 'FMR-MULTI-ASSOCIATION');
        unset($updatedFarmer['association_id']);
        $this->save('tmis-farmers', $updatedFarmer)->assertOk();

        $this->assertDatabaseHas('participant_association_memberships', [
            'participant_id' => DB::table('participants')->where('ui_id', 'FMR-MULTI-ASSOCIATION')->value('id'),
            'association_id' => DB::table('associations')->where('ui_id', 'FA-MULTI-PRIMARY')->value('id'),
            'role' => 'Secretary',
            'is_primary' => true,
        ]);

        $primaryAssociation = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmer-associations'))
            ->firstWhere('id', 'FA-MULTI-PRIMARY');
        $primaryAssociation['members'] = [];
        $this->save('tmis-farmer-associations', $primaryAssociation)->assertOk();

        $this->assertDatabaseMissing('participant_association_memberships', [
            'participant_id' => DB::table('participants')->where('ui_id', 'FMR-MULTI-ASSOCIATION')->value('id'),
            'association_id' => DB::table('associations')->where('ui_id', 'FA-MULTI-PRIMARY')->value('id'),
        ]);
        $this->assertDatabaseHas('participant_association_memberships', [
            'participant_id' => DB::table('participants')->where('ui_id', 'FMR-MULTI-ASSOCIATION')->value('id'),
            'association_id' => DB::table('associations')->where('ui_id', 'FA-MULTI-SECONDARY')->value('id'),
            'role' => 'Treasurer',
            'is_primary' => true,
        ]);
        $this->assertDatabaseHas('participants', [
            'ui_id' => 'FMR-MULTI-ASSOCIATION',
            'association_id' => DB::table('associations')->where('ui_id', 'FA-MULTI-SECONDARY')->value('id'),
            'association_role' => 'Treasurer',
        ]);
    }

    public function test_inactive_farmer_cannot_be_added_to_an_association(): void
    {
        $this->signIn();
        $this->save('tmis-farmer-associations', [
            'id' => 'FA-INACTIVE-MEMBER',
            'association_name' => 'Inactive Member Association',
            'region_id' => '4',
            'org_id' => '1',
            'status' => 'Active',
        ])->assertOk();
        $this->save('tmis-farmers', [
            'id' => 'FMR-INACTIVE-MEMBER',
            'fname' => 'Ana',
            'lname' => 'Santos',
            'status' => 'Inactive',
        ])->assertOk();
        $association = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmer-associations'))
            ->firstWhere('id', 'FA-INACTIVE-MEMBER');
        $association['members'] = [['farmer_id' => 'FMR-INACTIVE-MEMBER']];

        $this->save('tmis-farmer-associations', $association)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Only active farmers may be added to an association.');
        $this->assertDatabaseHas('participants', [
            'ui_id' => 'FMR-INACTIVE-MEMBER',
            'association_id' => null,
        ]);
    }

    public function test_inactive_farmer_statuses_and_waived_reason_are_preserved_in_the_data_feed(): void
    {
        $this->signIn();
        $statuses = [
            'FMR-STATUS-INACTIVE' => ['Inactive', 'Inactive'],
            'FMR-STATUS-DECEASED' => ['Deceased', 'Deceased'],
            'FMR-STATUS-REMOVED' => ['Waived', 'Waived'],
        ];

        foreach ($statuses as $id => [$status, $inactiveReason]) {
            $response = $this->save('tmis-farmers', [
                'id' => $id,
                'fname' => 'Ana',
                'lname' => 'Santos',
                'status' => $status,
            ])->assertOk();
            $farmer = collect($response->json('stores.tmis-farmers'))->firstWhere('id', $id);

            $this->assertSame($status, $farmer['status']);
            $this->assertSame('Inactive', $farmer['profileStatus']);
            $this->assertSame($inactiveReason, $farmer['inactiveReason']);
        }
    }

    public function test_inactive_database_participant_is_not_returned_as_active_when_saved_status_is_stale(): void
    {
        $this->signIn();
        $this->save('tmis-farmers', [
            'id' => 'FMR-STALE-ACTIVE',
            'fname' => 'Ana',
            'lname' => 'Santos',
            'status' => 'Active',
        ])->assertOk();
        DB::table('participants')->where('ui_id', 'FMR-STALE-ACTIVE')->update(['is_active' => false]);

        $farmer = collect($this->getJson('/ui/data')->assertOk()->json('stores.tmis-farmers'))
            ->firstWhere('id', 'FMR-STALE-ACTIVE');

        $this->assertSame('Inactive', $farmer['status']);
        $this->assertSame('Inactive', $farmer['profileStatus']);
    }

    public function test_farmer_data_includes_each_beneficiary_region_and_office(): void
    {
        $user = $this->signIn();
        $this->save('tmis-farmers', [
            'id' => 'FMR-MULTI-OFFICE',
            'fname' => 'Ana',
            'lname' => 'Santos',
            'status' => 'Active',
        ])->assertOk();
        $participantId = (int) DB::table('participants')->where('ui_id', 'FMR-MULTI-OFFICE')->value('id');

        DB::table('participant_beneficiaries')->insert([
            'participant_id' => $participantId,
            'region_id' => 4,
            'org_id' => 2,
            'added_by' => $user->user_id,
            'is_primary' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/ui/data')->assertOk()
            ->assertJsonPath('stores.tmis-farmers.0.beneficiaryOffices.0.region', 'Region IV-A')
            ->assertJsonPath('stores.tmis-farmers.0.beneficiaryOffices.0.office', 'DA - SAAD')
            ->assertJsonPath('stores.tmis-farmers.0.beneficiaryOffices.1.region', 'Region IV-A')
            ->assertJsonPath('stores.tmis-farmers.0.beneficiaryOffices.1.office', 'DA - 4K');
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

    public function test_training_registration_accepts_an_active_resource_person_from_another_office(): void
    {
        $this->signIn(1, 2);
        $this->save('tmis-resource-persons', [
            'id' => 'RP-OTHER-OFFICE',
            'first_name' => 'Ramon',
            'last_name' => 'Santos',
            'email' => 'ramon.santos@example.test',
            'region_id' => '4',
            'status' => 'Active',
        ])->assertOk();

        $user = $this->signIn(1, 1);
        DB::table('user_data_scopes')->insert([
            'user_id' => $user->user_id,
            'region_ids' => null,
            'office_ids' => null,
        ]);
        $response = $this->save('tmis-trainings', [
            'id' => 'TRN-CROSS-OFFICE-RP',
            'training_title' => 'Cross-office resource person training',
            'region_id' => '4',
            'org_id' => '1',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
            'trainers' => [['id' => 'RP-OTHER-OFFICE']],
        ])->assertOk();

        $training = collect($response->json('stores.tmis-trainings'))
            ->firstWhere('id', 'TRN-CROSS-OFFICE-RP');
        $resourcePersonId = (int) DB::table('resource_persons')
            ->where('ui_id', 'RP-OTHER-OFFICE')
            ->value('id');
        $trainingId = (int) DB::table('trainings')
            ->where('ui_id', 'TRN-CROSS-OFFICE-RP')
            ->value('id');

        $this->assertSame('For Review', $training['status']);
        $this->assertSame('RP-OTHER-OFFICE', $training['trainers'][0]['id']);
        $this->assertDatabaseHas('training_resource_person', [
            'training_id' => $trainingId,
            'resource_person_id' => $resourcePersonId,
        ]);
    }

    public function test_resource_person_creation_requires_at_least_one_contact_method(): void
    {
        $this->signIn();

        $this->save('tmis-resource-persons', [
            'id' => 'RP-NO-CONTACT',
            'first_name' => 'Ramon',
            'last_name' => 'Santos',
            'status' => 'Active',
        ])->assertUnprocessable()->assertJsonValidationErrors('phone');

        $this->assertDatabaseMissing('resource_persons', ['ui_id' => 'RP-NO-CONTACT']);
    }

    public function test_temporary_training_ids_are_replaced_with_sequential_public_ids(): void
    {
        $this->signIn();
        $this->travelTo(Carbon::parse('2026-11-09 12:00:00'));
        $this->save('tmis-trainings', [
            'id' => 'TRN-25-000888',
            'training_title' => 'Previous year training',
            'training_type' => 'Workshop',
            'start_date' => '2025-12-01',
            'end_date' => '2025-12-02',
            'venue' => 'Training hall',
        ])->assertOk();
        $firstTemporaryId = 'TRN-TEMP-11111111-1111-4111-8111-111111111111';
        $secondTemporaryId = 'TRN-TEMP-22222222-2222-4222-8222-222222222222';

        $firstResponse = $this->save('tmis-trainings', [
            'id' => $firstTemporaryId,
            'training_title' => 'First sequential training',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
        ])->assertOk();
        $secondResponse = $this->save('tmis-trainings', [
            'id' => $secondTemporaryId,
            'training_title' => 'Second sequential training',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
        ])->assertOk();

        $firstId = $firstResponse->json('idMappings.'.$firstTemporaryId);
        $secondId = $secondResponse->json('idMappings.'.$secondTemporaryId);
        $this->assertSame(1, preg_match('/^TRN-\d{2}-\d{6}$/', $firstId));
        $this->assertSame(1, preg_match('/^TRN-\d{2}-\d{6}$/', $secondId));
        $this->assertSame('TRN-26-000001', $firstId);
        $this->assertSame('TRN-26-000002', $secondId);
        $this->assertDatabaseHas('trainings', ['ui_id' => $firstId, 'name' => 'First sequential training']);
        $this->assertDatabaseHas('trainings', ['ui_id' => $secondId, 'name' => 'Second sequential training']);
        $this->assertSame($firstId, collect($firstResponse->json('stores.tmis-trainings'))->firstWhere('id', $firstId)['id']);
        $this->assertSame($secondId, collect($secondResponse->json('stores.tmis-trainings'))->firstWhere('id', $secondId)['id']);
    }

    public function test_farmer_activity_feed_omits_actor_role_for_profile_creation_and_updates(): void
    {
        $user = $this->signIn(1, 2);
        DB::table('users')->where('user_id', $user->user_id)->update(['region_id' => 4]);
        $createdResponse = $this->save('tmis-farmers', [
            'id' => 'FMR-AUDIT-001',
            'fname' => 'Ana',
            'lname' => 'Santos',
        ])->assertOk();

        $createdActivity = $this->withHeaders([
            'X-TMIS-PAGE' => '/app/admin/participants/update/view-farmer?id=FMR-AUDIT-001',
        ])->getJson('/ui/data')->assertOk()
            ->json('stores.tmis-farmers.0.activityLogs.0');

        $this->assertSame('Farmer Profile Created', $createdActivity['title']);
        $this->assertSame('Profile Management · Record Creation', $createdActivity['context']);
        $this->assertSame('Success', $createdActivity['status']);
        $this->assertArrayNotHasKey('reference', $createdActivity);
        $this->assertArrayNotHasKey('actorRole', $createdActivity);
        $this->assertSame('DA - 4K', $createdActivity['actorOffice']);
        $this->assertSame('Region IV-A', $createdActivity['actorRegion']);
        $this->assertStringContainsString('Ana Santos', $createdActivity['description']);
        $this->assertStringNotContainsString(' by ', $createdActivity['description']);
        $this->assertNotSame('', $createdActivity['date']);

        $farmer = $createdResponse->json('stores.tmis-farmers.0');
        $farmer['fname'] = 'Anna';
        $farmer['firstName'] = 'Anna';
        $farmer['name'] = 'Anna Santos';
        $this->save('tmis-farmers', $farmer)->assertOk();

        $updatedActivity = $this->withHeaders([
            'X-TMIS-PAGE' => '/app/admin/participants/update/view-farmer?id=FMR-AUDIT-001',
        ])->getJson('/ui/data')->assertOk()
            ->json('stores.tmis-farmers.0.activityLogs.0');

        $this->assertSame('Farmer Profile Updated', $updatedActivity['title']);
        $this->assertSame('Profile Management · Information Update', $updatedActivity['context']);
        $this->assertArrayNotHasKey('actorRole', $updatedActivity);
        $this->assertSame('Farmer Profile information was updated.', $updatedActivity['description']);
        $this->assertStringNotContainsString(' by ', $updatedActivity['description']);
        $this->assertDatabaseHas('participants', ['ui_id' => 'FMR-AUDIT-001', 'first_name' => 'Anna']);
    }

    public function test_farmer_activity_logs_are_available_on_the_profile_page(): void
    {
        $this->signIn();
        $this->save('tmis-farmers', [
            'id' => 'FMR-AUDIT-PAGE',
            'fname' => 'Ana',
            'lname' => 'Santos',
        ])->assertOk();

        $this->get(route('admin.participants.id.view-farmer', ['id' => 'FMR-AUDIT-PAGE']))
            ->assertOk()
            ->assertSee('activityLogList')
            ->assertSee('Farmer Profile Created')
            ->assertDontSee('VMNF')
            ->assertDontSee('Reference ID');

        $this->get(route('admin.participants.id.edit-farmer', ['id' => 'FMR-AUDIT-PAGE']))
            ->assertOk()
            ->assertDontSee('VMNF');
    }

    public function test_training_activity_feed_contains_context_and_uses_the_training_filter_category(): void
    {
        $this->signIn();
        $this->save('tmis-trainings', [
            'id' => 'TRN-AUDIT-001',
            'training_title' => 'Audit trail training',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
        ])->assertOk();

        $activity = $this->withHeaders([
            'X-TMIS-PAGE' => '/app/admin/training/id/view-training/TRN-AUDIT-001',
        ])->getJson('/ui/data')->assertOk()
            ->json('stores.tmis-trainings.0.activityLogs.0');

        $this->assertSame('training', $activity['category']);
        $this->assertSame('Training Management · Record Creation', $activity['context']);
        $this->assertSame('Training Created', $activity['title']);
        $this->assertArrayNotHasKey('reference', $activity);
        $this->assertSame('Success', $activity['status']);
    }

    public function test_training_status_history_includes_the_actor_office_and_region(): void
    {
        $user = $this->signIn(1, 2);
        DB::table('users')->where('user_id', $user->user_id)->update(['region_id' => 4]);
        $this->save('tmis-trainings', [
            'id' => 'TRN-ACTOR-LOCATION',
            'training_title' => 'Training status actor location',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-02',
            'venue' => 'Training hall',
        ])->assertOk();
        $trainingId = (int) DB::table('trainings')->where('ui_id', 'TRN-ACTOR-LOCATION')->value('id');
        DB::table('training_status_changes')->insert([
            'training_id' => $trainingId,
            'actor_user_id' => $user->user_id,
            'from_status' => 'For Review',
            'to_status' => 'For Approval',
            'reason' => null,
            'created_at' => now(),
        ]);

        $activity = $this->withHeaders([
            'X-TMIS-PAGE' => '/app/admin/training/id/view-training?id=TRN-ACTOR-LOCATION',
        ])->getJson('/ui/data')->assertOk()
            ->json('stores.tmis-trainings.0.activityLogs.0');

        $this->assertSame('DA - 4K', $activity['actorOffice']);
        $this->assertSame('Region IV-A', $activity['actorRegion']);
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

    public function test_questionnaire_registration_pages_load_account_scoped_location_choices(): void
    {
        $user = $this->signIn(1, 1);
        DB::table('user_data_scopes')->insert([
            'user_id' => $user->user_id,
            'region_ids' => json_encode([4], JSON_THROW_ON_ERROR),
            'office_ids' => json_encode([2], JSON_THROW_ON_ERROR),
        ]);

        foreach ([
            '/app/admin/evaluation/create/pre-test-register',
            '/app/admin/evaluation/create/post-test-register',
            '/app/admin/evaluation/create/training-evaluation-register',
            '/app/admin/evaluation/create/rp-evaluation-register',
            '/app/admin/evaluation/id/edit-pre-test',
            '/app/admin/evaluation/id/edit-post-test',
            '/app/admin/evaluation/id/edit-training-evaluation',
            '/app/admin/evaluation/id/edit-rp-evaluation',
        ] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertSee('officeIds', false)
                ->assertSee('src/js/evaluation/create/office-region.js');
        }
    }

    public function test_questionnaire_registration_enforces_the_account_location_scope(): void
    {
        $this->signIn(2, 2);
        DB::table('role_permissions')->insert([
            'role_id' => 2,
            'permission' => 'questionnaires.create',
        ]);

        $this->save('tmis-pre-test-questionnaires', [
            'id' => 'PRE-OUT-OF-SCOPE',
            'trainingQuestionnaire' => 'Out-of-scope questionnaire',
            'region_id' => '4',
            'org_id' => '1',
            'totalItems' => 10,
        ])->assertForbidden()
            ->assertJsonPath('message', 'The selected questionnaire office is outside your data visibility settings.');

        $this->assertDatabaseMissing('questionnaires', ['ui_id' => 'PRE-OUT-OF-SCOPE']);

        $this->save('tmis-pre-test-questionnaires', [
            'id' => 'PRE-IN-SCOPE',
            'trainingQuestionnaire' => 'In-scope questionnaire',
            'region_id' => '4',
            'org_id' => '2',
            'totalItems' => 10,
        ])->assertOk();

        $this->assertDatabaseHas('questionnaires', [
            'ui_id' => 'PRE-IN-SCOPE',
            'region_id' => 4,
            'org_id' => 2,
        ]);
    }

    public function test_questionnaire_registration_rejects_an_office_from_a_different_region(): void
    {
        $user = $this->signIn(1, 1);
        DB::table('user_data_scopes')->insert([
            'user_id' => $user->user_id,
            'region_ids' => json_encode([4, 5], JSON_THROW_ON_ERROR),
            'office_ids' => json_encode([2], JSON_THROW_ON_ERROR),
        ]);

        $this->save('tmis-pre-test-questionnaires', [
            'id' => 'PRE-MISMATCHED-LOCATION',
            'trainingQuestionnaire' => 'Mismatched questionnaire',
            'region_id' => '5',
            'org_id' => '2',
            'totalItems' => 10,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('office')
            ->assertJsonPath('errors.office.0', 'Select a registered office belonging to the selected region.');

        $this->assertDatabaseMissing('questionnaires', ['ui_id' => 'PRE-MISMATCHED-LOCATION']);
    }

    public function test_new_questionnaires_receive_sequential_year_based_ids_across_types(): void
    {
        $this->signIn();
        $this->travelTo(Carbon::parse('2026-11-12 14:00:00'));

        $questionnaireTypes = [
            ['tmis-pre-test-questionnaires', 'Pre-test', 'trainingQuestionnaire'],
            ['tmis-post-test-questionnaires', 'Post-test', 'trainingQuestionnaire'],
            ['tmis-training-evaluation-questionnaires', 'Training evaluation', 'questionnaireName'],
            ['tmis-rp-evaluation-questionnaires', 'Resource person evaluation', 'questionnaireName'],
        ];

        foreach ($questionnaireTypes as $index => [$key, $kind, $nameField]) {
            $temporaryId = 'Q-TEMP-questionnaire-'.$index;
            $questionnaireId = '26'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);
            $response = $this->save($key, [
                'id' => $temporaryId,
                $nameField => 'Questionnaire '.$kind,
                'region_id' => '4',
                'org_id' => '2',
                'totalItems' => 3,
                'status' => 'Draft',
            ])->assertOk();

            $this->assertSame($questionnaireId, $response->json('idMappings.'.$temporaryId));
            $this->assertDatabaseHas('questionnaires', [
                'ui_id' => $questionnaireId,
                'kind' => $kind,
            ]);
        }
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
            if ($page === 'view-training') {
                $rendered->assertSee('TRN · two-digit year · annual sequence');
            }
            $this->get(route('admin.training.id.'.$page, ['id' => 'TRN-LINK']))
                ->assertOk()
                ->assertViewIs('admin.training.id.'.$page);
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
