<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegistrationReferencesTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(int $role = 1): User
    {
        $user = User::factory()->create(['role_id' => $role]);
        $hash = Hash::make('Reference-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        if ($role === 1) {
            DB::table('system_super_admins')->insert(['user_id' => $user->user_id, 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);

        return $user;
    }

    private function address(): array
    {
        $ids = [];
        $parent = null;
        foreach (['province', 'district', 'municipality', 'barangay'] as $kind) {
            $parent = DB::table('geographic_locations')->insertGetId(['region_id' => 4, 'parent_id' => $parent, 'kind' => $kind, 'name' => 'Registered '.$kind, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            $ids[$kind.'_id'] = $parent;
        }

        return $ids;
    }

    private function registration(): array
    {
        $address = $this->address();

        return $address + ['fname' => 'Ana', 'lname' => 'Santos', 'dob' => '1990-01-01', 'gender' => 'Female', 'csv' => 'Single', 'nationality' => 'Filipino', 'pob' => $address['municipality_id'], 'region_id' => 4, 'org_id' => 1, 'postal_code' => '4300', 'association_status' => 'No', 'tupad' => 'Yes', 'solo_parent' => 'Yes'];
    }

    public function test_administrator_creates_each_location_level_and_records_profile_activity(): void
    {
        $user = $this->signIn();
        $region = $this->postJson('/system/locations', ['kind' => 'region', 'name' => 'Registered region'])->assertCreated()->json('id');
        $parent = null;
        foreach (['province', 'district', 'municipality', 'barangay'] as $kind) {
            $response = $this->postJson('/system/locations', ['kind' => $kind, 'name' => 'Registered '.$kind, 'region_id' => $region, 'parent_id' => $parent])->assertCreated();
            $response->assertJsonPath('location.kind', $kind)->assertJsonPath('location.name', 'Registered '.$kind)->assertJsonPath('location.region_id', $region);
            $parent = $response->json('id');
            $this->assertDatabaseHas('geographic_locations', ['id' => $parent, 'kind' => $kind, 'region_id' => $region]);
        }
        $this->assertDatabaseHas('users_log', ['actor_user_id' => $user->user_id, 'event' => 'location_barangay_created_'.$parent]);
        $this->get('/system/settings')->assertOk()->assertSee('Geographic locations')->assertSee('Registered barangay');
    }

    public function test_location_form_returns_to_locations_tab_with_success_message(): void
    {
        $this->signIn();
        $this->post('/system/locations', ['kind' => 'province', 'name' => 'New province', 'region_id' => 4])
            ->assertRedirect(route('system.settings').'#locations')
            ->assertSessionHas('operation_message', 'Location created.');
        $this->assertDatabaseHas('geographic_locations', ['name' => 'New province', 'kind' => 'province', 'region_id' => 4]);
    }

    public function test_non_administrator_cannot_create_location(): void
    {
        $this->signIn(2);
        $this->postJson('/system/locations', ['kind' => 'region', 'name' => 'Unauthorized'])->assertForbidden();
        $this->assertDatabaseMissing('region', ['name' => 'Unauthorized']);
    }

    public function test_staff_can_register_in_own_office_but_cannot_register_in_another_office(): void
    {
        $user = $this->signIn(2);
        DB::table('role_permissions')->insertOrIgnore(['role_id' => $user->role_id, 'permission' => 'participants.write']);
        $data = $this->registration();
        $data['org_id'] = 2;
        $this->postJson('/ui/participants', $data)->assertForbidden();
        $this->assertDatabaseCount('participants', 0);
        $data['org_id'] = 1;
        $this->postJson('/ui/participants', $data)->assertCreated();
        $this->assertDatabaseHas('participants', ['org_id' => 1, 'created_by' => $user->user_id]);
        DB::table('role_permissions')->where('role_id', $user->role_id)->where('permission', 'participants.write')->delete();
        $this->postJson('/ui/participants', $data)->assertForbidden();
    }

    public function test_guest_cannot_create_locations_or_participants(): void
    {
        $this->postJson('/system/locations', ['kind' => 'region', 'name' => 'Unauthorized'])->assertRedirect(route('login'));
        $this->postJson('/ui/participants', [])->assertRedirect(route('login'));
    }

    public function test_duplicate_and_invalid_parent_locations_are_rejected(): void
    {
        $this->signIn();
        $ids = $this->address();
        $this->postJson('/system/locations', ['kind' => 'province', 'name' => 'registered PROVINCE', 'region_id' => 4])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->postJson('/system/locations', ['kind' => 'barangay', 'name' => 'Wrong parent', 'region_id' => 4, 'parent_id' => $ids['province_id']])->assertUnprocessable()->assertJsonValidationErrors('parent_id');
        $this->postJson('/system/locations', ['kind' => 'district', 'name' => 'Wrong region', 'region_id' => 1, 'parent_id' => $ids['province_id']])->assertUnprocessable()->assertJsonValidationErrors('parent_id');
    }

    public function test_registration_persists_canonical_database_address_and_beneficiary_fields(): void
    {
        $user = $this->signIn();
        $data = $this->registration();
        $data['province'] = 'Forged province';
        $response = $this->postJson('/ui/participants', $data)->assertCreated();
        $this->assertDatabaseHas('participants', ['ui_id' => $response->json('participant_id'), 'first_name' => 'Ana', 'province' => 'Registered province', 'district' => 'Registered district', 'municipality' => 'Registered municipality', 'barangay' => 'Registered barangay', 'place_of_birth' => 'Registered municipality', 'created_by' => $user->user_id]);
        $this->assertDatabaseCount('participants', 1);
        $saved = $response->json('stores.tmis-farmers.0');
        $this->assertSame('Yes', $saved['tupad']);
        $this->assertSame('Yes', $saved['soloParent']);
        $this->assertDatabaseHas('users_log', ['actor_user_id' => $user->user_id, 'category' => 'participants']);
        $this->get('/ui/data')->assertOk()->assertJsonPath('registration.options.gender.0.value', 'Male')->assertJsonCount(4, 'registration.locations');
    }

    public function test_registration_requires_complete_choices_and_rejects_future_birthdays(): void
    {
        $this->signIn();
        $this->postJson('/ui/participants', [])->assertUnprocessable()->assertJsonValidationErrors(['fname', 'lname', 'dob', 'region_id', 'org_id', 'province_id', 'district_id', 'municipality_id', 'barangay_id']);
        $data = $this->registration();
        $data['dob'] = now()->addDay()->toDateString();
        $data['nationality'] = 'Unregistered nationality';
        $this->postJson('/ui/participants', $data)->assertUnprocessable()->assertJsonValidationErrors(['dob', 'nationality']);
        $this->assertDatabaseCount('participants', 0);
    }

    public function test_registration_rejects_mismatched_address_and_office(): void
    {
        $this->signIn();
        $data = $this->registration();
        $data['barangay_id'] = $data['province_id'];
        $this->postJson('/ui/participants', $data)->assertUnprocessable()->assertJsonValidationErrors('barangay_id');
        $data['region_id'] = 1;
        $this->postJson('/ui/participants', $data)->assertUnprocessable()->assertJsonValidationErrors('org_id');
        $this->assertDatabaseCount('participants', 0);
    }

    public function test_inactive_option_and_foreign_office_association_cannot_be_selected(): void
    {
        $this->signIn();
        $data = $this->registration();
        DB::table('participant_options')->where('field', 'nationality')->where('value', 'Filipino')->update(['is_active' => false]);
        $this->postJson('/ui/participants', $data)->assertUnprocessable()->assertJsonValidationErrors('nationality');
        DB::table('participant_options')->where('field', 'nationality')->where('value', 'Filipino')->update(['is_active' => true]);
        $id = DB::table('associations')->insertGetId(['region_id' => 4, 'org_id' => 2, 'created_by' => auth()->id(), 'name' => 'Other office', 'is_active' => true]);
        $data['association_status'] = 'Yes';
        $data['associate_name'] = (string) $id;
        $data['associate_role'] = 'Member';
        $this->postJson('/ui/participants', $data)->assertUnprocessable();
        $this->assertDatabaseCount('participants', 0);
    }

    public function test_rename_updates_existing_address_records_without_moving_hierarchy(): void
    {
        $user = $this->signIn();
        $ids = $this->address();
        DB::table('participants')->insert(['name' => 'Participant', 'created_by' => $user->user_id, 'region_id' => 4, 'org_id' => 1, 'province' => 'Registered province', 'district' => 'Registered district', 'municipality' => 'Registered municipality', 'barangay' => 'Registered barangay']);
        $this->patchJson('/system/locations/barangay/'.$ids['barangay_id'], ['name' => 'Updated barangay'])->assertOk()->assertJsonPath('location.name', 'Updated barangay')->assertJsonPath('location.parent_id', $ids['municipality_id']);
        $this->assertDatabaseHas('participants', ['barangay' => 'Updated barangay', 'ui_version' => 2]);
        $this->assertDatabaseHas('users_log', ['event' => 'location_barangay_updated_'.$ids['barangay_id']]);
        $this->patchJson('/system/locations/region/4', ['name' => 'Updated region'])->assertOk()->assertJsonPath('location.name', 'Updated region');
        $this->assertDatabaseHas('region', ['region_id' => 4, 'name' => 'Updated region']);
    }

    public function test_delete_unused_locations_and_region_records_activity(): void
    {
        $this->signIn();
        $ids = $this->address();
        $this->deleteJson('/system/locations/barangay/'.$ids['barangay_id'])->assertOk()->assertJsonPath('message', 'Location deleted.');
        $this->assertDatabaseMissing('geographic_locations', ['id' => $ids['barangay_id']]);
        $region = $this->postJson('/system/locations', ['kind' => 'region', 'name' => 'Unused region'])->assertCreated()->json('id');
        $this->deleteJson('/system/locations/region/'.$region)->assertOk();
        $this->assertDatabaseMissing('region', ['region_id' => $region]);
        $this->assertDatabaseHas('users_log', ['event' => 'location_region_deleted_'.$region]);
    }

    public function test_delete_rejects_locations_with_children_and_used_records(): void
    {
        $user = $this->signIn();
        $ids = $this->address();
        $this->deleteJson('/system/locations/province/'.$ids['province_id'])->assertStatus(409);
        $this->deleteJson('/system/locations/region/4')->assertStatus(409);
        DB::table('participants')->insert(['name' => 'Participant', 'created_by' => $user->user_id, 'region_id' => 4, 'org_id' => 1, 'province' => 'Registered province', 'district' => 'Registered district', 'municipality' => 'Registered municipality', 'barangay' => 'Registered barangay']);
        $this->deleteJson('/system/locations/barangay/'.$ids['barangay_id'])->assertStatus(409);
        $this->assertDatabaseHas('geographic_locations', ['id' => $ids['barangay_id']]);
    }

    public function test_non_administrator_and_guests_cannot_update_or_delete_locations(): void
    {
        $this->patchJson('/system/locations/region/4', ['name' => 'Denied'])->assertRedirect(route('login'));
        $this->deleteJson('/system/locations/region/4')->assertRedirect(route('login'));
        $this->signIn(2);
        $this->patchJson('/system/locations/region/4', ['name' => 'Denied'])->assertForbidden();
        $this->deleteJson('/system/locations/region/4')->assertForbidden();
        $this->assertDatabaseMissing('region', ['name' => 'Denied']);
    }

    public function test_update_rejects_duplicate_names_and_invalid_location_ids(): void
    {
        $this->signIn();
        $ids = $this->address();
        $this->postJson('/system/locations', ['kind' => 'province', 'name' => 'Other province', 'region_id' => 4])->assertCreated();
        $this->patchJson('/system/locations/province/'.$ids['province_id'], ['name' => 'Other province'])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->patchJson('/system/locations/barangay/'.$ids['province_id'], ['name' => 'Wrong kind'])->assertNotFound();
        $this->deleteJson('/system/locations/barangay/999999')->assertNotFound();
    }

    public function test_maintenance_form_uses_philippine_time_for_saving_and_display(): void
    {
        $this->travelTo(Carbon::parse('2026-11-06 01:00:00', 'UTC'));
        $this->signIn();
        $this->postJson('/system/settings', ['maintenance_enabled' => true, 'maintenance_message' => 'Scheduled', 'maintenance_until' => '2026-11-06T10:30', 'maintenance_timezone' => 'Asia/Manila'])->assertOk();
        $this->assertDatabaseHas('system_settings', ['maintenance_until' => '2026-11-06 02:30:00']);
        $this->get('/system/settings')->assertOk()->assertSee('2026-11-06T10:30')->assertSee('Philippine time');
        $this->postJson('/system/settings', ['maintenance_enabled' => true, 'maintenance_until' => '2026-11-06T08:30', 'maintenance_timezone' => 'Asia/Manila'])->assertUnprocessable()->assertJsonValidationErrors('maintenance_until');
    }

    public function test_administrator_can_create_offices_per_region_and_choices_are_database_backed(): void
    {
        $user = $this->signIn();
        $response = $this->postJson('/system/offices', ['region_id' => 4, 'name' => 'New regional office', 'details' => 'Training division'])->assertCreated()->assertJsonPath('office.region_id', 4);
        $id = $response->json('office.org_id');
        $this->assertDatabaseHas('organization', ['org_id' => $id, 'region_id' => 4, 'name' => 'New regional office']);
        $this->assertDatabaseHas('users_log', ['actor_user_id' => $user->user_id, 'event' => 'office_created_'.$id]);
        $this->get('/system/settings')->assertOk()->assertSee('Offices by region')->assertSee('New regional office');
        $this->getJson('/ui/data')->assertOk()->assertJsonFragment(['org_id' => $id, 'region_id' => 4, 'name' => 'New regional office']);
        $this->postJson('/system/offices', ['region_id' => 4, 'name' => 'NEW regional OFFICE'])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->postJson('/system/offices', ['region_id' => 1, 'name' => 'New regional office'])->assertCreated();
    }

    public function test_office_creation_rejects_invalid_regions_and_non_administrators(): void
    {
        $this->signIn();
        $this->postJson('/system/offices', [])->assertUnprocessable()->assertJsonValidationErrors(['name', 'region_id']);
        $this->postJson('/system/offices', ['region_id' => 999999, 'name' => 'Invalid office'])->assertUnprocessable()->assertJsonValidationErrors('region_id');
        $this->signIn(2);
        $this->postJson('/system/offices', ['region_id' => 4, 'name' => 'Denied office'])->assertForbidden();
        $this->assertDatabaseMissing('organization', ['name' => 'Denied office']);
        $this->get('/system/settings')->assertNotFound();
    }
}
