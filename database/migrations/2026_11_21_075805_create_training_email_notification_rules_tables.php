<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_notifications', function (Blueprint $table): void {
            $table->boolean('in_app_enabled')->default(true);
            $table->boolean('email_enabled')->default(true);
        });

        Schema::create('training_email_notification_rules', function (Blueprint $table): void {
            $table->id();
            $table->string('from_status', 40);
            $table->string('to_status', 40);
            $table->boolean('is_enabled')->default(true);
            $table->string('subject_template', 255)->nullable();
            $table->text('message_template')->nullable();
            $table->bigInteger('created_by')->nullable();
            $table->bigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->unique(['from_status', 'to_status'], 'training_email_transition_unique');
            $table->foreign('created_by')->references('user_id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('user_id')->on('users')->nullOnDelete();
        });

        Schema::create('training_email_notification_rule_roles', function (Blueprint $table): void {
            $table->foreignId('rule_id')->constrained('training_email_notification_rules')->cascadeOnDelete();
            $table->bigInteger('role_id');
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();
            $table->primary(['rule_id', 'role_id']);
            $table->foreign('role_id')->references('role_id')->on('user_roles')->cascadeOnDelete();
        });

        foreach (DB::table('training_notification_rules')->orderBy('id')->get() as $inAppRule) {
            $emailRuleId = DB::table('training_email_notification_rules')->insertGetId([
                'from_status' => $inAppRule->from_status,
                'to_status' => $inAppRule->to_status,
                'is_enabled' => $inAppRule->is_enabled,
                'created_by' => $inAppRule->created_by,
                'updated_by' => $inAppRule->updated_by,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach (DB::table('training_notification_rule_roles')->where('rule_id', $inAppRule->id)->where('is_enabled', true)->get(['role_id']) as $recipient) {
                DB::table('training_email_notification_rule_roles')->insert([
                    'rule_id' => $emailRuleId,
                    'role_id' => $recipient->role_id,
                    'is_enabled' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('training_email_notification_rule_roles');
        Schema::dropIfExists('training_email_notification_rules');
        Schema::table('training_notifications', function (Blueprint $table): void {
            $table->dropColumn(['in_app_enabled', 'email_enabled']);
        });
    }
};
