<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_notification_rules', function (Blueprint $table): void {
            $table->id();
            $table->string('from_status', 40);
            $table->string('to_status', 40);
            $table->boolean('is_enabled')->default(true);
            $table->bigInteger('created_by')->nullable();
            $table->bigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->unique(['from_status', 'to_status'], 'training_notification_transition_unique');
            $table->foreign('created_by')->references('user_id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('user_id')->on('users')->nullOnDelete();
        });

        Schema::create('training_notification_rule_roles', function (Blueprint $table): void {
            $table->foreignId('rule_id')->constrained('training_notification_rules')->cascadeOnDelete();
            $table->bigInteger('role_id');
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();
            $table->primary(['rule_id', 'role_id']);
            $table->foreign('role_id')->references('role_id')->on('user_roles')->cascadeOnDelete();
        });

        $roleIds = DB::table('user_roles')
            ->whereIn('name', ['Program Administrator', 'System Administrator'])
            ->pluck('role_id', 'name');
        $transitions = [
            ['For review', 'For approval'],
            ['For review', 'Rejected'],
            ['For approval', 'For acceptance'],
            ['For approval', 'For review'],
            ['For acceptance', 'Approved & Accepted'],
            ['For acceptance', 'For approval'],
            ['For acceptance', 'For review'],
            ['Rejected', 'For review'],
        ];

        foreach ($transitions as [$fromStatus, $toStatus]) {
            $ruleId = DB::table('training_notification_rules')->insertGetId([
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'is_enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach (['Program Administrator', 'System Administrator'] as $roleName) {
                if (! isset($roleIds[$roleName])) {
                    continue;
                }

                DB::table('training_notification_rule_roles')->insert([
                    'rule_id' => $ruleId,
                    'role_id' => $roleIds[$roleName],
                    'is_enabled' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('training_notification_rule_roles');
        Schema::dropIfExists('training_notification_rules');
    }
};
