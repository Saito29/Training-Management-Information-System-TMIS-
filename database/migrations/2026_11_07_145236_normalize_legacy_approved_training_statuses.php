<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('trainings')
            ->where('status', 'Approved')
            ->update(['status' => 'Approved & Accepted']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This data normalization cannot be reversed without downgrading later accepted records.
    }
};
