<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('role_credential_denied_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('role_credential_id');
            $table->string('permission', 100);
            $table->foreign('role_credential_id')
                ->references('role_credential_id')
                ->on('role_credentials')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->primary(['role_credential_id', 'permission']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_credential_denied_permissions');
    }
};
