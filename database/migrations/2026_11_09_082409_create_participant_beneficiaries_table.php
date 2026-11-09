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
        Schema::create('participant_beneficiaries', function (Blueprint $table): void {
            $table->foreignId('participant_id')->constrained('participants')->restrictOnDelete();
            $table->unsignedBigInteger('region_id');
            $table->unsignedBigInteger('org_id');
            $table->bigInteger('added_by');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->primary(['participant_id', 'org_id']);
            $table->foreign('region_id')->references('region_id')->on('region')->restrictOnDelete();
            $table->foreign('org_id')->references('org_id')->on('organization')->restrictOnDelete();
            $table->foreign('added_by')->references('user_id')->on('users')->restrictOnDelete();
            $table->index(['region_id', 'org_id', 'participant_id'], 'participant_beneficiaries_scope_index');
        });

        DB::table('participants')->orderBy('id')->chunkById(500, function ($participants): void {
            DB::table('participant_beneficiaries')->insertOrIgnore($participants->map(fn (object $participant): array => [
                'participant_id' => $participant->id,
                'region_id' => $participant->region_id,
                'org_id' => $participant->org_id,
                'added_by' => $participant->created_by,
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
        Schema::dropIfExists('participant_beneficiaries');
    }
};
