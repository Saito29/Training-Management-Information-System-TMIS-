<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->timestamp('permanent_deletion_at', 0)->nullable();
        });

        DB::table('participants')
            ->whereNotNull('deleted_at')
            ->whereNull('permanent_deletion_at')
            ->orderBy('id')
            ->chunkById(500, function ($participants): void {
                foreach ($participants as $participant) {
                    DB::table('participants')
                        ->where('id', $participant->id)
                        ->whereNull('permanent_deletion_at')
                        ->update([
                            'permanent_deletion_at' => Carbon::parse($participant->deleted_at)->addDays(30),
                        ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropColumn('permanent_deletion_at');
        });
    }
};
