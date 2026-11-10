<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('participant_association_memberships', function (Blueprint $table): void {
            $table->foreignId('participant_id')->constrained('participants')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('association_id')->constrained('associations')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('role')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->primary(['participant_id', 'association_id']);
            $table->index(['association_id', 'participant_id'], 'participant_association_memberships_roster_index');
        });

        DB::table('participants')
            ->whereNotNull('association_id')
            ->orderBy('id')
            ->chunkById(500, function ($participants): void {
                DB::table('participant_association_memberships')->insertOrIgnore($participants->map(fn (object $participant): array => [
                    'participant_id' => $participant->id,
                    'association_id' => $participant->association_id,
                    'role' => $participant->association_role,
                    'is_primary' => true,
                    'created_at' => $participant->created_at ?? now(),
                    'updated_at' => $participant->updated_at ?? now(),
                ])->all());
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('participant_association_memberships');
    }
};
