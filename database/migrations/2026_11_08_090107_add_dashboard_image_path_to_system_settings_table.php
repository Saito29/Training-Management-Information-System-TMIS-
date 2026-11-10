<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Add an optional branded image for the dashboard welcome card. */
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
            $table->string('dashboard_image_path')->nullable();
        });
    }

    /** Remove the optional dashboard image setting when rolling back this migration. */
    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
            $table->dropColumn('dashboard_image_path');
        });
    }
};
