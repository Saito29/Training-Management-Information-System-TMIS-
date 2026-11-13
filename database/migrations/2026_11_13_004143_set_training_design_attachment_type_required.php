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
        DB::table('attachment_type_options')
            ->where('category', 'training')
            ->where('name', 'Training design')
            ->where('is_builtin', true)
            ->update(['is_required' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('attachment_type_options')
            ->where('category', 'training')
            ->where('name', 'Training design')
            ->where('is_builtin', true)
            ->update(['is_required' => false]);
    }
};
