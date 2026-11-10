<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['trainings', 'participants', 'associations', 'resource_persons', 'questionnaires'] as $name) {
            Schema::table($name, function (Blueprint $table) use ($name): void {
                $table->string('ui_id', 100)->nullable();
                $table->text('ui_data')->nullable();
                $table->unsignedInteger('ui_version')->default(1);
                $table->unique(['region_id', 'org_id', 'ui_id'], $name.'_interface_identity');
            });
        }
        Schema::create('assessment_results', function (Blueprint $table): void {
            $table->id();
            $table->string('ui_id', 100)->unique();
            $table->foreignId('questionnaire_id')->constrained('questionnaires')->restrictOnDelete();
            $table->foreignId('participant_id')->nullable()->constrained('participants')->restrictOnDelete();
            $table->foreignId('resource_person_id')->nullable()->constrained('resource_persons')->restrictOnDelete();
            $table->foreignId('training_id')->nullable()->constrained('trainings')->restrictOnDelete();
            $table->bigInteger('region_id');
            $table->bigInteger('org_id');
            $table->bigInteger('encoded_by');
            $table->foreign('region_id')->references('region_id')->on('region')->restrictOnDelete();
            $table->foreign('org_id')->references('org_id')->on('organization')->restrictOnDelete();
            $table->foreign('encoded_by')->references('user_id')->on('users')->restrictOnDelete();
            $table->date('assessed_on')->nullable();
            $table->unsignedInteger('score')->nullable();
            $table->string('commodity')->nullable();
            $table->string('state', 20)->default('draft');
            $table->json('ratings')->nullable();
            $table->text('comments')->nullable();
            $table->text('ui_data');
            $table->unsignedInteger('ui_version')->default(1);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['region_id', 'org_id', 'deleted_at']);
        });
        Schema::create('training_questionnaire', function (Blueprint $table): void {
            $table->foreignId('training_id')->constrained('trainings')->restrictOnDelete();
            $table->foreignId('questionnaire_id')->constrained('questionnaires')->restrictOnDelete();
            $table->primary(['training_id', 'questionnaire_id']);
        });
        Schema::create('user_notifications', function (Blueprint $table): void {
            $table->id();
            $table->string('ui_id', 100)->unique();
            $table->string('batch_id', 100);
            $table->bigInteger('recipient_id');
            $table->bigInteger('creator_id');
            $table->foreign('recipient_id')->references('user_id')->on('users')->restrictOnDelete();
            $table->foreign('creator_id')->references('user_id')->on('users')->restrictOnDelete();
            $table->string('title', 100);
            $table->string('summary', 240)->nullable();
            $table->text('message');
            $table->string('type', 30);
            $table->string('priority', 20)->default('normal');
            $table->string('reference', 80)->nullable();
            $table->string('related_page', 100)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index(['recipient_id', 'created_at']);
        });
        Schema::create('user_interface_drafts', function (Blueprint $table): void {
            $table->bigInteger('user_id');
            $table->string('draft_key', 120);
            $table->text('payload');
            $table->timestamps();
            $table->primary(['user_id', 'draft_key']);
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        foreach (['user_interface_drafts', 'user_notifications', 'training_questionnaire', 'assessment_results'] as $name) {
            Schema::dropIfExists($name);
        }
        foreach (['trainings', 'participants', 'associations', 'resource_persons', 'questionnaires'] as $name) {
            Schema::table($name, function (Blueprint $table) use ($name): void {
                $table->dropUnique($name.'_interface_identity');
                $table->dropColumn(['ui_id', 'ui_data', 'ui_version']);
            });
        }
    }
};
