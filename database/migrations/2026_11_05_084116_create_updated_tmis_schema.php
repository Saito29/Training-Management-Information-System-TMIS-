<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('region', function (Blueprint $table): void {
            $table->bigIncrements('region_id');
            $table->string('name', 64);
            $table->smallInteger('is_active')->default(1);
            $table->timestamp('created_at', 0)->useCurrent();
            $table->timestamp('updated_at', 0)->nullable();
        });
        Schema::create('organization', function (Blueprint $table): void {
            $table->bigIncrements('org_id');
            $table->bigInteger('region_id');
            $table->string('name', 300);
            $table->string('details', 300)->nullable();
            $table->smallInteger('is_active')->default(1);
            $table->timestamp('created_at', 0)->useCurrent();
            $table->timestamp('updated_at', 0)->nullable();
            $table->foreign('region_id')->references('region_id')->on('region')->cascadeOnUpdate()->restrictOnDelete();
            $table->index('region_id');
        });
        Schema::create('user_roles', function (Blueprint $table): void {
            $table->bigIncrements('role_id');
            $table->string('name', 255);
            $table->string('details', 300)->nullable();
            $table->smallInteger('is_active')->default(1);
            $table->timestamp('created_at', 0)->useCurrent();
            $table->timestamp('updated_at', 0)->nullable();
        });
        Schema::create('users', function (Blueprint $table): void {
            $table->bigIncrements('user_id');
            $table->string('email');
            $table->string('last_name');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('extension_name', 50)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('sex', ['Male', 'Female'])->nullable();
            $table->string('mobile_number', 20)->nullable();
            $table->bigInteger('role_id');
            $table->bigInteger('region_id');
            $table->bigInteger('org_id');
            $table->string('position');
            $table->boolean('email_verified')->default(false);
            $table->enum('status', ['Pending approval', 'Rejected', 'Approved & Accepted'])->default('Pending approval');
            $table->smallInteger('active_status')->default(0);
            $table->text('profile_photo_path')->nullable();
            $table->timestamp('is_created_at', 0)->useCurrent();
            $table->timestamp('is_updated_at', 0)->nullable();
            $table->foreign('role_id')->references('role_id')->on('user_roles')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreign('region_id')->references('region_id')->on('region')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreign('org_id')->references('org_id')->on('organization')->cascadeOnUpdate()->restrictOnDelete();
            $table->index('role_id');
            $table->index('region_id');
            $table->index('org_id');
        });
        if (DB::getDriverName() === 'pgsql' || DB::getDriverName() === 'sqlite') {
            DB::statement('CREATE UNIQUE INDEX users_email_unique ON users (lower(email))');
        } else {
            Schema::table('users', fn (Blueprint $table) => $table->unique('email'));
        }
        Schema::create('user_auth', function (Blueprint $table): void {
            $table->id();
            $table->bigInteger('user_id')->unique();
            $table->string('password_hash');
            $table->boolean('email_two_factor_enabled')->default(true);
            $table->string('token', 64)->nullable();
            $table->timestamp('token_time', 0)->nullable();
            $table->smallInteger('attempts')->nullable();
            $table->smallInteger('resend_count')->nullable();
            $table->smallInteger('last_send_count')->nullable();
            $table->string('code_hash')->nullable();
            $table->timestamp('resend_available_at', 0)->nullable();
            $table->timestamp('expires_at', 0)->nullable();
            $table->timestamp('created_at', 0)->useCurrent();
            $table->timestamp('updated_at', 0)->nullable();
            $table->timestamp('last_login_at', 0)->nullable();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnUpdate()->restrictOnDelete();
        });
        Schema::create('user_verify', function (Blueprint $table): void {
            $table->id();
            $table->bigInteger('user_id')->unique();
            $table->string('code_hash');
            $table->string('session_binding_hash')->nullable();
            $table->smallInteger('attempts')->default(0);
            $table->smallInteger('resend_count')->default(0);
            $table->smallInteger('last_send_count')->default(0);
            $table->timestamp('resend_available_at', 0)->nullable();
            $table->timestamp('expires_at', 0)->nullable();
            $table->timestamp('invalidated_at', 0)->nullable();
            $table->timestamp('created_at', 0)->nullable();
            $table->timestamp('updated_at', 0)->nullable();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnUpdate()->restrictOnDelete();
        });
        Schema::create('password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
        foreach (['users_log' => 'user_id', 'trainings_log' => 'training_id', 'farmers_log' => 'farmer_id'] as $name => $subject) {
            Schema::create($name, function (Blueprint $table) use ($subject): void {
                $table->id();
                if ($subject === 'user_id') {
                    $table->bigInteger($subject)->nullable();
                    $table->foreign($subject)->references('user_id')->on('users')->cascadeOnUpdate()->restrictOnDelete();
                } else {
                    $table->string($subject);
                }
                $table->bigInteger('actor_user_id')->nullable();
                $table->string('event')->nullable();
                $table->string('category', 50)->nullable();
                $table->string('outcome', 50)->default('success');
                $table->text('description')->nullable();
                $table->jsonb('old_values')->nullable();
                $table->jsonb('new_values')->nullable();
                $table->jsonb('metadata')->nullable();
                $table->string('ip_address', 64)->nullable();
                $table->text('user_agent')->nullable();
                $table->uuid('request_id')->nullable();
                $table->timestamp('created_at', 0)->useCurrent();
                $table->foreign('actor_user_id')->references('user_id')->on('users')->cascadeOnUpdate()->restrictOnDelete();
                $table->index([$subject, 'created_at', 'id']);
                $table->index(['actor_user_id', 'created_at', 'id']);
                $table->index('request_id');
            });
        }
        $regions = ['Region I', 'Region II', 'Region III', 'Region IV-A', 'Region IV-B', 'Region V', 'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X', 'Region XI', 'Region XII', 'Region XIII', 'NCR', 'CAR', 'BARMM'];
        foreach ($regions as $index => $name) {
            DB::table('region')->insert(['region_id' => $index + 1, 'name' => $name, 'is_active' => 1, 'created_at' => '2026-11-05 07:08:50']);
        }
        foreach (['System Administrator', 'Data Encoder', 'Program Administrator', 'Program Head'] as $index => $name) {
            DB::table('user_roles')->insert(['role_id' => $index + 1, 'name' => $name, 'is_active' => 1, 'created_at' => '2026-11-05 07:13:20']);
        }
        DB::table('organization')->insert([
            ['org_id' => 1, 'region_id' => 4, 'name' => 'DA - SAAD', 'details' => 'Special Area for Agricultural Development', 'is_active' => 1, 'created_at' => '2026-11-05 07:09:47'],
            ['org_id' => 2, 'region_id' => 4, 'name' => 'DA - 4K', 'details' => null, 'is_active' => 1, 'created_at' => '2026-11-05 07:09:47'],
        ]);
        if (DB::getDriverName() === 'pgsql') {
            foreach (['region' => 'region_id', 'organization' => 'org_id', 'user_roles' => 'role_id'] as $table => $key) {
                DB::statement("SELECT setval(pg_get_serial_sequence('{$table}', '{$key}'), (SELECT MAX({$key}) FROM {$table}), true)");
            }
            foreach (['users' => 'is_updated_at', 'region' => 'updated_at', 'organization' => 'updated_at', 'user_roles' => 'updated_at', 'user_auth' => 'updated_at'] as $table => $column) {
                DB::unprepared("CREATE FUNCTION tmis_{$table}_timestamp() RETURNS trigger LANGUAGE plpgsql AS \$\$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW.{$column} IS NOT DISTINCT FROM OLD.{$column} THEN NEW.{$column} := CURRENT_TIMESTAMP; END IF; RETURN NEW; END; \$\$; CREATE TRIGGER tmis_{$table}_timestamp BEFORE UPDATE ON {$table} FOR EACH ROW EXECUTE FUNCTION tmis_{$table}_timestamp();");
            }
        }
    }

    public function down(): void
    {
        foreach (['farmers_log', 'trainings_log', 'users_log', 'password_reset_tokens', 'user_verify', 'user_auth', 'users', 'user_roles', 'organization', 'region'] as $table) {
            Schema::dropIfExists($table);
        }
        if (DB::getDriverName() === 'pgsql') {
            foreach (['users', 'region', 'organization', 'user_roles', 'user_auth'] as $table) {
                DB::unprepared("DROP FUNCTION IF EXISTS tmis_{$table}_timestamp()");
            }
        }
    }
};
