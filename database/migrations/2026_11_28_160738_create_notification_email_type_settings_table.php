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
        Schema::create('notification_email_type_settings', function (Blueprint $table) {
            $table->string('notification_type', 32)->primary();
            $table->boolean('email_enabled')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('notification_email_type_settings')->insert(array_map(
            static fn (string $type): array => [
                'notification_type' => $type,
                'email_enabled' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            ['account', 'training', 'participants', 'evaluation', 'system'],
        ));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_email_type_settings');
    }
};
