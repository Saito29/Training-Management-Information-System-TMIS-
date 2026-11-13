<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachment_type_options', function (Blueprint $table): void {
            $table->id();
            $table->string('category', 40);
            $table->string('name', 80);
            $table->boolean('is_builtin')->default(false);
            $table->timestamps();
            $table->unique(['category', 'name']);
        });

        $defaultNames = [
            'farmer_profile' => ['Profile Form', 'Profile Picture', 'ID', 'Other Files', 'Other', 'Status supporting document'],
            'farmer_association' => ['Association Document', 'Registration Certificate', 'Membership List', 'Other File', 'Other'],
            'training' => ['Training design', 'Attendance', 'Report', 'Other', 'Training Program', 'Attendance Sheet', 'Training Materials', 'Photos', 'Other Files'],
        ];
        $builtInNames = [
            'farmer_profile' => ['Status supporting document'],
            'farmer_association' => [],
            'training' => ['Training design'],
        ];
        $attachmentTables = [
            'farmer_profile' => ['participant_attachments', ['kind']],
            'farmer_association' => ['association_attachments', ['kind']],
            'training' => ['training_attachments', ['kind', 'original_kind']],
        ];
        $rows = [];

        foreach ($defaultNames as $category => $names) {
            [$table, $columns] = $attachmentTables[$category];
            foreach ($columns as $column) {
                $names = array_merge($names, DB::table($table)->whereNotNull($column)->distinct()->pluck($column)->all());
            }

            $seen = [];
            foreach ($names as $name) {
                $name = trim((string) $name);
                $normalizedName = mb_strtolower($name);
                if ($name === '' || isset($seen[$normalizedName])) {
                    continue;
                }

                $seen[$normalizedName] = true;
                $rows[] = [
                    'category' => $category,
                    'name' => $name,
                    'is_builtin' => in_array($name, $builtInNames[$category], true),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('attachment_type_options')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('attachment_type_options');
    }
};
