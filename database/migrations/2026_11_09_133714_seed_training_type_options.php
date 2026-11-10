<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $trainingTypes = [
        'Crop Production',
        'Organic Agriculture',
        'Agribusiness',
        'Livestock and Poultry',
        'Fisheries',
        'Post-harvest and Processing',
        'Farm Mechanization',
        'In-Plant Training',
        'Skills Training',
        'Field Training',
        'Seminar',
        'Workshop',
        'Farmer Field School',
        'Technical Skills Training',
        'Livelihood Training',
        'Cooperative Management Training',
        'Seminar / Workshop',
    ];

    public function up(): void
    {
        foreach ($this->trainingTypes as $trainingType) {
            $exists = DB::table('participant_options')
                ->where('field', 'training_type')
                ->whereRaw('LOWER(value) = ?', [mb_strtolower($trainingType)])
                ->exists();

            if (! $exists) {
                DB::table('participant_options')->insert([
                    'field' => 'training_type',
                    'value' => $trainingType,
                    'label' => $trainingType,
                    'is_active' => true,
                ]);
            }
        }
    }

    public function down(): void
    {
        foreach ($this->trainingTypes as $trainingType) {
            DB::table('participant_options')
                ->where('field', 'training_type')
                ->where('value', $trainingType)
                ->whereNotExists(function ($query): void {
                    $query->selectRaw('1')
                        ->from('trainings')
                        ->whereColumn('trainings.training_type', 'participant_options.value');
                })
                ->delete();
        }
    }
};
