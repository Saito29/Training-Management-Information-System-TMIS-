<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AuditLogSchemaTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, array{string, string, string}> */
    public static function subjects(): array
    {
        return [
            'training' => ['trainings_log', 'training_id', 'TRN-2026-001'],
            'farmer' => ['farmers_log', 'farmer_id', 'FMR-2026-001'],
        ];
    }

    #[DataProvider('subjects')]
    public function test_stores_subject_history_with_public_actor_id_and_change_values(string $table, string $column, string $reference): void
    {
        $actor = User::factory()->create(['user_id' => 260001]);

        $id = DB::table($table)->insertGetId([
            $column => $reference,
            'actor_user_id' => $actor->user_id,
            'event' => 'status_changed',
            'category' => 'status',
            'old_values' => json_encode(['status' => 'Pending'], JSON_THROW_ON_ERROR),
            'new_values' => json_encode(['status' => 'Approved'], JSON_THROW_ON_ERROR),
            'request_id' => '598e0785-523d-4b3c-81d6-c1472b67cfe6',
            'ip_address' => '::1',
        ]);

        $entry = DB::table($table)->find($id);
        $this->assertSame(['status' => 'Pending'], json_decode($entry->old_values, true, 512, JSON_THROW_ON_ERROR));
        $this->assertSame(['status' => 'Approved'], json_decode($entry->new_values, true, 512, JSON_THROW_ON_ERROR));
        $this->assertDatabaseHas($table, [
            'id' => $id, $column => $reference, 'actor_user_id' => 260001, 'outcome' => 'success',
        ]);
        $this->assertNotNull($entry->created_at);
    }

    #[DataProvider('subjects')]
    public function test_accepts_system_events_without_an_actor(string $table, string $column, string $reference): void
    {
        DB::table($table)->insert([$column => $reference, 'event' => 'imported', 'category' => 'import']);

        $this->assertDatabaseHas($table, [$column => $reference, 'actor_user_id' => null]);
    }

    #[DataProvider('subjects')]
    public function test_rejects_an_unknown_actor(string $table, string $column, string $reference): void
    {
        $this->expectException(QueryException::class);

        DB::table($table)->insert([
            $column => $reference, 'actor_user_id' => 999999, 'event' => 'created', 'category' => 'record',
        ]);
    }

    #[DataProvider('subjects')]
    public function test_actor_id_changes_preserve_the_reference(string $table, string $column, string $reference): void
    {
        $actor = User::factory()->create(['user_id' => 260001]);
        DB::table($table)->insert([
            $column => $reference, 'actor_user_id' => $actor->user_id, 'event' => 'created', 'category' => 'record',
        ]);

        DB::table('users')->where('user_id', $actor->user_id)->update(['user_id' => 260002]);

        $this->assertDatabaseHas($table, [$column => $reference, 'actor_user_id' => 260002]);
    }

    #[DataProvider('subjects')]
    public function test_cannot_delete_an_actor_with_recorded_history(string $table, string $column, string $reference): void
    {
        $actor = User::factory()->create();
        DB::table($table)->insert([
            $column => $reference, 'actor_user_id' => $actor->user_id, 'event' => 'created', 'category' => 'record',
        ]);
        $this->expectException(QueryException::class);

        $actor->delete();
    }

    public function test_new_schema_stores_structured_user_log_changes(): void
    {
        $user = User::factory()->create();
        $id = DB::table('users_log')->insertGetId([
            'user_id' => $user->user_id, 'event' => 'account_approved',
            'old_values' => '{"status":"Pending approval"}',
            'new_values' => '{"status":"Approved & Accepted"}',
        ]);

        $this->assertSame(['status' => 'Pending approval'], json_decode(DB::table('users_log')->find($id)->old_values, true));
        $this->assertSame(['status' => 'Approved & Accepted'], json_decode(DB::table('users_log')->find($id)->new_values, true));
        $this->assertDatabaseHas('users_log', ['id' => $id, 'event' => 'account_approved']);
    }
}
