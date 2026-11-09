<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_attachments', function (Blueprint $table): void {
            $table->string('original_kind', 80)->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('remarks', 500)->nullable();
        });
        foreach (['association' => 'associations', 'participant' => 'participants'] as $name => $owner) {
            Schema::create($name.'_attachments', function (Blueprint $table) use ($name, $owner): void {
                $table->id();
                $table->foreignId($name.'_id')->constrained($owner)->restrictOnDelete();
                $table->string('kind', 80);
                $table->unsignedSmallInteger('year')->nullable();
                $table->string('remarks', 500)->nullable();
                $table->string('path');
                $table->string('original_name');
                $table->string('mime_type', 100);
                $table->unsignedBigInteger('size');
                $table->bigInteger('uploaded_by');
                $table->foreign('uploaded_by')->references('user_id')->on('users')->restrictOnDelete();
                $table->timestamps();
            });
        }
        Schema::create('training_highlights', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->restrictOnDelete();
            $table->unsignedSmallInteger('slide');
            $table->json('content');
            $table->string('image_path')->nullable();
            $table->string('logo_path')->nullable();
            $table->timestamps();
            $table->unique(['training_id', 'slide']);
        });
    }

    public function down(): void
    {
        foreach (['training_highlights', 'participant_attachments', 'association_attachments'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('training_attachments', fn (Blueprint $table) => $table->dropColumn(['original_kind', 'year', 'remarks']));
    }
};
