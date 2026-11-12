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
        Schema::create('training_association', function (Blueprint $table) {
            $table->foreignId('training_id')->constrained('trainings')->cascadeOnDelete();
            $table->foreignId('association_id')->constrained('associations')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['training_id', 'association_id']);
            $table->index(['association_id', 'training_id'], 'training_association_association_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_association');
    }
};
