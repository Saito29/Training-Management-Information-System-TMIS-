<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->softDeletes();
        });
        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->bigInteger('role_id');
            $table->string('permission', 80);
            $table->primary(['role_id', 'permission']);
            $table->foreign('role_id')->references('role_id')->on('user_roles')->cascadeOnDelete();
        });
        Schema::create('system_settings', function (Blueprint $table): void {
            $table->unsignedInteger('id')->primary();
            $table->boolean('maintenance_enabled')->default(false);
            $table->string('maintenance_message', 500)->nullable();
            $table->timestamp('maintenance_until')->nullable();
            $table->timestamps();
        });
        DB::table('system_settings')->insert(['id' => 1, 'maintenance_enabled' => false, 'created_at' => now(), 'updated_at' => now()]);
        Schema::create('user_data_scopes', function (Blueprint $table): void {
            $table->bigInteger('user_id')->primary();
            $table->json('region_ids')->nullable();
            $table->json('office_ids')->nullable();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        });
        foreach (['associations', 'participants', 'resource_persons', 'trainings', 'questionnaires'] as $name) {
            Schema::create($name, function (Blueprint $table) use ($name): void {
                $table->id();
                $table->bigInteger('region_id');
                $table->bigInteger('org_id');
                $table->bigInteger('created_by');
                $table->string('name');
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
                $extraColumns = match ($name) {
                    'trainings' => ['training_type', 'delivery_mode', 'partner_organization', 'district', 'province', 'municipality', 'barangay'],
                    'associations' => ['short_name', 'organization_type', 'district', 'province', 'municipality', 'barangay'],
                    'participants' => ['first_name', 'middle_name', 'last_name', 'suffix', 'nationality', 'place_of_birth', 'house_number', 'street', 'postal_code', 'telephone', 'association_role', 'district', 'province', 'municipality', 'barangay'],
                    'resource_persons' => ['title', 'first_name', 'middle_name', 'last_name', 'suffix', 'qualification', 'organization_name'],
                    default => [],
                };
                foreach ($extraColumns as $column) {
                    $table->string($column)->nullable();
                }
                if (in_array($name, ['trainings', 'associations'], true)) {
                    $table->unsignedSmallInteger('year_covered')->nullable();
                }
                if ($name === 'trainings') {
                    $table->unsignedInteger('target_participants')->nullable();
                }
                if ($name === 'associations') {
                    $table->date('registration_date')->nullable();
                }
                if ($name === 'participants') {
                    $table->text('protected_details')->nullable();
                }
                $table->foreign('region_id')->references('region_id')->on('region')->restrictOnDelete();
                $table->foreign('org_id')->references('org_id')->on('organization')->restrictOnDelete();
                $table->foreign('created_by')->references('user_id')->on('users')->restrictOnDelete();
                $table->index(['region_id', 'org_id', 'deleted_at']);
                if ($name === 'participants') {
                    $table->foreignId('association_id')->nullable()->constrained('associations')->restrictOnDelete();
                    $table->string('email')->nullable();
                    $table->string('phone', 30)->nullable();
                    $table->date('date_of_birth')->nullable();
                    $table->string('sex', 20)->nullable();
                    $table->text('address')->nullable();
                }
                if ($name === 'resource_persons') {
                    $table->string('email')->nullable();
                    $table->string('phone', 30)->nullable();
                    $table->string('expertise')->nullable();
                }
                if ($name === 'trainings') {
                    $table->date('start_date');
                    $table->date('end_date');
                    $table->string('venue');
                    $table->decimal('budget', 14, 2)->default(0);
                    $table->string('status', 40)->default('For review');
                    $table->unsignedInteger('version')->default(1);
                    $table->index(['region_id', 'org_id', 'status']);
                }
                if ($name === 'questionnaires') {
                    $table->string('kind', 40);
                    $table->json('questions');
                }
            });
        }
        Schema::create('training_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->restrictOnDelete();
            $table->string('kind', 40);
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->bigInteger('uploaded_by');
            $table->foreign('uploaded_by')->references('user_id')->on('users')->restrictOnDelete();
            $table->timestamps();
        });
        foreach (['participant' => 'participants', 'resource_person' => 'resource_persons'] as $key => $related) {
            Schema::create('training_'.$key, function (Blueprint $table) use ($key, $related): void {
                $table->foreignId('training_id')->constrained('trainings')->restrictOnDelete();
                $table->foreignId($key.'_id')->constrained($related)->restrictOnDelete();
                $table->primary(['training_id', $key.'_id']);
            });
        }
        Schema::create('evaluation_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->restrictOnDelete();
            $table->foreignId('questionnaire_id')->constrained('questionnaires')->restrictOnDelete();
            $table->foreignId('participant_id')->constrained('participants')->restrictOnDelete();
            $table->json('answers');
            $table->bigInteger('encoded_by');
            $table->foreign('encoded_by')->references('user_id')->on('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['training_id', 'questionnaire_id', 'participant_id'], 'evaluation_response_unique');
        });
        Schema::create('training_status_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->restrictOnDelete();
            $table->bigInteger('actor_user_id');
            $table->foreign('actor_user_id')->references('user_id')->on('users')->restrictOnDelete();
            $table->string('from_status', 40);
            $table->string('to_status', 40);
            $table->text('reason')->nullable();
            $table->timestamp('created_at');
        });
        Schema::create('training_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('status_change_id')->constrained('training_status_changes')->restrictOnDelete();
            $table->bigInteger('user_id');
            $table->foreign('user_id')->references('user_id')->on('users')->restrictOnDelete();
            $table->string('email');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->timestamp('retry_at')->nullable();
            $table->timestamp('created_at');
            $table->unique(['status_change_id', 'user_id']);
            $table->index(['sent_at', 'retry_at']);
        });
    }

    public function down(): void
    {
        foreach (['training_notifications', 'training_status_changes', 'evaluation_responses', 'training_resource_person', 'training_participant', 'training_attachments', 'questionnaires', 'trainings', 'resource_persons', 'participants', 'associations', 'user_data_scopes', 'system_settings', 'role_permissions'] as $name) {
            Schema::dropIfExists($name);
        }
        Schema::table('users', fn (Blueprint $table) => $table->dropSoftDeletes());
    }
};
