<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
            $table->string('system_name', 120)->default('TMIS');
            $table->string('logo_path')->nullable();
            $table->string('favicon_path')->nullable();
        });

        Schema::create('maintenance_access', function (Blueprint $table): void {
            $table->unsignedBigInteger('user_id')->primary();
            $table->unsignedBigInteger('assigned_by')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('user_id')->on('users')->restrictOnDelete();
            $table->foreign('assigned_by')->references('user_id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_access');
        Schema::table('system_settings', function (Blueprint $table): void {
            $table->dropColumn(['system_name', 'logo_path', 'favicon_path']);
        });
    }
};
