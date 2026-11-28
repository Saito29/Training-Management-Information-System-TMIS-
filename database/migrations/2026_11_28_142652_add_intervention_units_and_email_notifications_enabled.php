<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
            $table->boolean('email_notifications_enabled')->default(true);
        });

        foreach (['bags', 'hectares', 'heads', 'kilograms', 'liters', 'packs', 'pieces', 'plants', 'sessions', 'sets', 'units'] as $unit) {
            DB::table('participant_options')->insertOrIgnore([
                'field' => 'intervention_unit',
                'value' => $unit,
                'label' => ucfirst($unit),
                'is_active' => true,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('participant_options')
            ->where('field', 'intervention_unit')
            ->whereIn('value', ['bags', 'hectares', 'heads', 'kilograms', 'liters', 'packs', 'pieces', 'plants', 'sessions', 'sets', 'units'])
            ->delete();

        Schema::table('system_settings', function (Blueprint $table): void {
            $table->dropColumn('email_notifications_enabled');
        });
    }
};
