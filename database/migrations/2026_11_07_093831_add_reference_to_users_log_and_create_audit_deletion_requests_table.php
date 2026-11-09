<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users_log', function (Blueprint $table): void {
            $table->string('reference', 16)->nullable();
        });

        DB::table('users_log')->select('id')->orderBy('id')->chunkById(500, function ($entries): void {
            foreach ($entries as $entry) {
                DB::table('users_log')->where('id', $entry->id)->update([
                    'reference' => Str::upper(Str::random(16)),
                ]);
            }
        });

        Schema::table('users_log', function (Blueprint $table): void {
            $table->unique('reference');
        });

        Schema::create('audit_deletion_requests', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 16)->unique();
            $table->foreignId('requester_user_id')->constrained('users', 'user_id')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->json('filters')->nullable();
            $table->json('selected_ids')->nullable();
            $table->boolean('delete_all_filtered')->default(false);
            $table->string('status', 20)->default('pending');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_deletion_requests');

        Schema::table('users_log', function (Blueprint $table): void {
            $table->dropUnique(['reference']);
            $table->dropColumn('reference');
        });
    }
};
