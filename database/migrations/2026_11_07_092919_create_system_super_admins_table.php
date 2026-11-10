<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_super_admins', function (Blueprint $table): void {
            $table->unsignedBigInteger('user_id')->primary();
            $table->unsignedBigInteger('granted_by')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
            $table->foreign('granted_by')->references('user_id')->on('users')->nullOnDelete();
        });

        $activeAdministrators = DB::table('users as u')
            ->join('user_roles as r', 'r.role_id', '=', 'u.role_id')
            ->where('r.name', 'System Administrator')
            ->where('r.is_active', 1)
            ->where('u.active_status', 1)
            ->where('u.status', 'Approved & Accepted')
            ->whereNull('u.deleted_at')
            ->pluck('u.user_id');

        if ($activeAdministrators->count() === 1) {
            DB::table('system_super_admins')->insert([
                'user_id' => $activeAdministrators->first(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('system_super_admins');
    }
};
