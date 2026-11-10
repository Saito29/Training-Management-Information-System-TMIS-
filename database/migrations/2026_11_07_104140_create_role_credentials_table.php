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
        Schema::create('role_credentials', function (Blueprint $table) {
            $table->bigIncrements('role_credential_id');
            $table->unsignedBigInteger('role_id');
            $table->string('name', 120);
            $table->timestamp('created_at', 0)->useCurrent();
            $table->timestamp('updated_at', 0)->nullable();
            $table->foreign('role_id')->references('role_id')->on('user_roles')->cascadeOnUpdate()->restrictOnDelete();
            $table->unique(['role_id', 'name']);
        });

        Schema::create('role_credential_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('role_credential_id');
            $table->string('permission', 100);
            $table->foreign('role_credential_id')->references('role_credential_id')->on('role_credentials')->cascadeOnUpdate()->cascadeOnDelete();
            $table->primary(['role_credential_id', 'permission']);
        });

        if (DB::getDriverName() === 'sqlite') {
            DB::statement('ALTER TABLE users ADD COLUMN role_credential_id INTEGER NULL REFERENCES role_credentials(role_credential_id) ON DELETE SET NULL');
        } else {
            Schema::table('users', function (Blueprint $table): void {
                $table->unsignedBigInteger('role_credential_id')->nullable()->after('role_id');
                $table->foreign('role_credential_id')->references('role_credential_id')->on('role_credentials')->nullOnDelete();
            });
        }

        $roleIds = DB::table('user_roles')->whereIn('name', ['Data Encoder', 'Program Head'])->pluck('role_id', 'name');
        foreach ([
            'Data Encoder' => ['Encoder (default)', 'Evaluator', 'Head'],
            'Program Head' => ['Data Encoder - Head'],
        ] as $roleName => $credentialNames) {
            $roleId = $roleIds->get($roleName);
            if ($roleId === null) {
                continue;
            }

            foreach ($credentialNames as $credentialName) {
                DB::table('role_credentials')->insert([
                    'role_id' => $roleId,
                    'name' => $credentialName,
                    'created_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('ALTER TABLE users DROP COLUMN role_credential_id');
        } else {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropForeign(['role_credential_id']);
                $table->dropColumn('role_credential_id');
            });
        }
        Schema::dropIfExists('role_credential_permissions');
        Schema::dropIfExists('role_credentials');
    }
};
