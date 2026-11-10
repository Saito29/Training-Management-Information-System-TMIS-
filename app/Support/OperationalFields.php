<?php

namespace App\Support;

class OperationalFields
{
    /** @return array<string, array{label: string, type: string}> */
    public static function forModule(string $module): array
    {
        $fields = match ($module) {
            'trainings' => ['training_type' => 'Training type', 'delivery_mode' => 'Delivery mode', 'target_participants' => 'Target participants', 'partner_organization' => 'Partner organization', 'year_covered' => 'Year covered'],
            'associations' => ['short_name' => 'Short name', 'organization_type' => 'Organization type', 'registration_date' => 'Registration date', 'year_covered' => 'Year covered'],
            'participants' => ['first_name' => 'First name', 'middle_name' => 'Middle name', 'last_name' => 'Last name', 'suffix' => 'Suffix', 'nationality' => 'Nationality', 'place_of_birth' => 'Place of birth', 'house_number' => 'House / building number', 'street' => 'Street / purok / sitio', 'postal_code' => 'Postal code', 'telephone' => 'Telephone', 'association_role' => 'Association role'],
            'resource_persons' => ['title' => 'Professional title', 'first_name' => 'First name', 'middle_name' => 'Middle name', 'last_name' => 'Last name', 'suffix' => 'Suffix', 'qualification' => 'Qualification', 'organization_name' => 'Organization / office'],
            default => [],
        };
        if (in_array($module, ['trainings', 'associations', 'participants'], true)) {
            $fields += ['district' => 'District', 'province' => 'Province', 'municipality' => 'Municipality / city', 'barangay' => 'Barangay'];
        }
        $result = [];
        foreach ($fields as $name => $label) {
            $result[$name] = ['label' => $label, 'type' => match ($name) {
                'registration_date' => 'date',
                'year_covered', 'target_participants' => 'number',
                default => 'text',
            }];
        }

        return $result;
    }

    /** @return array<string, string> */
    public static function sensitiveParticipantFields(): array
    {
        return ['tupad' => 'TUPAD beneficiary', 'solo_parent' => 'Solo parent', 'four_ps' => '4Ps beneficiary', 'disability' => 'Disability information', 'indigenous_group' => 'Indigenous group', 'tribe' => 'Tribe', 'dietary_restriction' => 'Dietary restriction', 'allergies' => 'Allergies', 'senior_citizen' => 'Senior citizen'];
    }
}
