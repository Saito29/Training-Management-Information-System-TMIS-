<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('geographic_locations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('region_id');
            $table->foreign('region_id')->references('region_id')->on('region')->restrictOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('geographic_locations')->restrictOnDelete();
            $table->string('kind', 20);
            $table->string('name', 150);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['region_id', 'kind', 'parent_id']);
            $table->unique(['parent_id', 'kind', 'name']);
        });
        Schema::create('participant_options', function (Blueprint $table): void {
            $table->id();
            $table->string('field', 40);
            $table->string('value', 100);
            $table->string('label', 150);
            $table->boolean('is_active')->default(true);
            $table->unique(['field', 'value']);
        });
        $options = json_decode('{"sfname": [{"value": "Jr.", "label": "Jr."}, {"value": "Sr.", "label": "Sr."}, {"value": "I", "label": "I"}, {"value": "II", "label": "II"}, {"value": "III", "label": "III"}, {"value": "IV", "label": "IV"}, {"value": "V", "label": "V"}], "gender": [{"value": "Male", "label": "Male"}, {"value": "Female", "label": "Female"}], "csv": [{"value": "Single", "label": "Single"}, {"value": "Married", "label": "Married"}, {"value": "Separated", "label": "Separated"}, {"value": "Widow", "label": "Widow"}], "nationality": [{"value": "Filipino", "label": "Filipino"}, {"value": "American", "label": "American"}, {"value": "Japanese", "label": "Japanese"}, {"value": "Chinese", "label": "Chinese"}], "4ps": [{"value": "Yes", "label": "Yes"}, {"value": "No", "label": "No"}], "tupad": [{"value": "Yes", "label": "Yes"}, {"value": "No", "label": "No"}], "solo_parent": [{"value": "Yes", "label": "Yes"}, {"value": "No", "label": "No"}], "pwd": [{"value": "Yes", "label": "Yes"}, {"value": "No", "label": "No"}], "idp": [{"value": "Yes", "label": "Yes"}, {"value": "No", "label": "No"}], "dtrestriction": [{"value": "None", "label": "None"}, {"value": "Non-meat", "label": "Non-meat"}, {"value": "Vegetarian", "label": "Vegetarian"}, {"value": "Allergies", "label": "Allergies"}], "sncitizen": [{"value": "Yes", "label": "Yes"}, {"value": "No", "label": "No"}]}', true, 512, JSON_THROW_ON_ERROR);
        foreach ($options as $field => $values) {
            foreach ($values as $option) {
                DB::table('participant_options')->insert(['field' => $field] + $option);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('participant_options');
        Schema::dropIfExists('geographic_locations');
    }
};
