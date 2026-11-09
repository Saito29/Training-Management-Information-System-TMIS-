<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_auth', function (Blueprint $table): void {
            $table->text('totp_secret')->nullable();
            $table->text('totp_pending_secret')->nullable();
            $table->timestamp('totp_pending_until')->nullable();
            $table->bigInteger('totp_last_counter')->nullable();
            $table->text('totp_recovery_codes')->nullable();
            $table->unsignedInteger('session_generation')->default(0);
        });
        Schema::create('user_device_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('user_id')->on('users')->restrictOnDelete();
            $table->char('session_hash', 64)->unique();
            $table->string('ip_address', 64)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('last_activity_at');
            $table->timestamp('created_at');
            $table->timestamp('revoked_at')->nullable();
            $table->index(['user_id', 'revoked_at', 'last_activity_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_device_sessions');
        Schema::table('user_auth', function (Blueprint $table): void {
            $table->dropColumn(['totp_secret', 'totp_pending_secret', 'totp_pending_until', 'totp_last_counter', 'totp_recovery_codes', 'session_generation']);
        });
    }
};
