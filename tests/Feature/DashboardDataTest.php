<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\DashboardData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DashboardDataTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(int $role = 1, int $office = 1): User
    {
        $user = User::factory()->create(['role_id' => $role, 'org_id' => $office]);
        $hash = Hash::make('Dashboard-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $hash]);
        $this->actingAs($user)->withSession(['auth.verified_user_id' => $user->user_id, 'auth.password_fingerprint' => hash('sha256', $hash)]);

        return $user;
    }

    public function test_empty_database_dashboard_has_no_demo_totals_or_upcoming_records(): void
    {
        $this->travelTo(Carbon::parse('2026-11-06 12:00:00', 'Asia/Manila'));
        $this->signIn();
        $this->getJson('/ui/data')->assertOk()->assertJsonPath('dashboard.trainingCount', 0)->assertJsonPath('dashboard.funds.current', 0)->assertJsonPath('dashboard.upcoming', [])->assertJsonPath('dashboard.groups', [0, 0, 0, 0, 0]);
        $this->get('/app/admin/dashboard/dashboard')->assertOk()->assertSee('No upcoming training')->assertDontSee('Specialized Swine Production');
    }

    public function test_yearly_funds_and_upcoming_records_use_approved_scoped_database_trainings(): void
    {
        $this->travelTo(Carbon::parse('2026-11-06 12:00:00', 'Asia/Manila'));
        $user = $this->signIn();
        $base = ['region_id' => 4, 'org_id' => 1, 'created_by' => $user->user_id, 'status' => 'Approved', 'is_active' => true, 'district' => 'First district', 'province' => 'Quezon', 'municipality' => 'Perez', 'venue' => 'Training hall', 'created_at' => now(), 'updated_at' => now()];
        foreach ([['Current', '2026-12-01', 1200], ['Previous', '2025-12-01', 800], ['Older', '2024-12-01', 9900]] as [$name, $date, $budget]) {
            DB::table('trainings')->insert($base + ['name' => $name, 'start_date' => $date, 'end_date' => $date, 'budget' => $budget]);
        }
        DB::table('trainings')->insert(array_replace($base, ['name' => 'Not approved', 'start_date' => '2026-12-01', 'end_date' => '2026-12-01', 'budget' => 5000, 'status' => 'For review']));
        $this->getJson('/ui/data')->assertOk()->assertJsonPath('dashboard.currentYear', 2026)->assertJsonPath('dashboard.previousYear', 2025)->assertJsonPath('dashboard.funds.current', 1200)->assertJsonPath('dashboard.funds.previous', 800)->assertJsonPath('dashboard.upcoming.0.title', 'Current')->assertJsonCount(1, 'dashboard.upcoming')->assertJsonPath('dashboard.allocatedBudgetByDistrict.0.current', 1200)->assertJsonPath('dashboard.allocatedBudgetByDistrict.0.previous', 800);
        if ($directory = getenv('TMIS_UI_FIXTURE_DIR')) {
            DB::table('participants')->insert(['name' => 'Test Beneficiary', 'date_of_birth' => '1990-01-01', 'sex' => 'Female', 'region_id' => 4, 'org_id' => 1, 'created_by' => $user->user_id, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            $html = $this->get('/app/admin/dashboard/dashboard')->assertOk()->getContent();
            file_put_contents($directory.'/tmis-populated-dashboard.html', str_replace('http://localhost', 'http://127.0.0.1:8000', $html));
        }
        $this->signIn(3, 2);
        DB::table('role_permissions')->insert(['role_id' => 3, 'permission' => 'trainings.read']);
        $this->getJson('/ui/data')->assertOk()->assertJsonPath('dashboard.funds.current', 0)->assertJsonPath('dashboard.upcoming', []);
    }

    public function test_age_bands_use_birthdays_and_exclude_missing_future_or_underage_dates(): void
    {
        $this->travelTo(Carbon::parse('2026-11-06 12:00:00', 'Asia/Manila'));
        $farmers = [];
        foreach ([['2011-11-06', 'Male'], ['1995-11-07', 'Female'], ['1995-11-06', 'Male'], ['1966-11-07', 'Female'], ['1966-11-06', 'Male'], ['2011-11-07', 'Male'], [null, 'Female'], ['2030-01-01', 'Male'], ['2000-02-31', 'Female']] as [$birth, $sex]) {
            $farmers[] = ['status' => 'Active', 'birthDate' => $birth, 'sex' => $sex, 'municipality' => 'Perez'];
        }
        $result = app(DashboardData::class)->build(['tmis-farmers' => $farmers]);
        $this->assertSame([1, 1, 1], $result['ageSex'][0]['data']);
        $this->assertSame([1, 1, 0], $result['ageSex'][1]['data']);
        $this->assertSame(4, $result['excludedAgeCount']);
    }

    public function test_tupad_and_solo_parent_flags_persist_encrypted_and_feed_groups(): void
    {
        $this->signIn();
        $this->postJson('/ui/sync', ['key' => 'tmis-farmers', 'upserts' => [['id' => 'FMR-GROUP', 'fname' => 'Ana', 'lname' => 'Santos', 'gender' => 'Female', 'dob' => '1990-01-01', 'tupad' => 'Yes', 'solo_parent' => 'Yes', 'pwd' => 'Yes']], 'deletes' => []])->assertOk()->assertJsonPath('dashboard.groups', [1, 0, 0, 1, 1])->assertJsonPath('stores.tmis-farmers.0.soloParent', 'Yes');
        $this->assertStringNotContainsString('solo_parent', DB::table('participants')->value('protected_details'));
        $this->getJson('/ui/data')->assertOk()->assertJsonPath('stores.tmis-farmers.0.tupad', 'Yes')->assertJsonPath('dashboard.groups.3', 1);
    }
}
