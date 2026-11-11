<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('record_statuses', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        foreach (['participants', 'associations', 'trainings', 'resource_persons'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId('record_status_id')
                    ->nullable()
                    ->constrained('record_statuses')
                    ->restrictOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['participants', 'associations', 'trainings', 'resource_persons'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropConstrainedForeignId('record_status_id');
            });
        }

        Schema::dropIfExists('record_statuses');
    }
};
