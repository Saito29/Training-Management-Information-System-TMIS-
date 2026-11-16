<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeZone;

/** Aggregates only records already filtered by module permission, region and office. */
class DashboardData
{
    private const UPCOMING_EXCLUDED_STATUSES = [
        'for approval', 'for acceptance', 'approved', 'approved & accepted', 'approved and accepted',
    ];

    public function build(array $stores): array
    {
        $today = now('Asia/Manila')->startOfDay();
        $year = (int) $today->year;
        $years = [$year, $year - 1];
        $activeTrainings = array_values(array_filter(
            $stores['tmis-trainings'] ?? [],
            fn (array $item): bool => filter_var($item['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN)
                && strtolower(trim((string) ($item['status'] ?? ''))) !== 'inactive',
        ));
        $farmers = array_values(array_filter($stores['tmis-farmers'] ?? [], fn (array $item): bool => $item['status'] === 'Active'));
        $associations = array_values(array_filter($stores['tmis-farmer-associations'] ?? [], fn (array $item): bool => $item['status'] === 'Active'));
        $towns = array_values(array_unique(array_map(fn (array $item): string => ($item['municipality'] ?? '') ?: 'Not recorded', array_merge($activeTrainings, $farmers, $associations))));
        $monthly = function (array $items, array $fields) use ($towns, $years): array {
            $totals = array_fill_keys($towns, array_fill_keys($years, array_fill(0, 12, 0)));
            foreach ($items as $item) {
                $value = null;
                foreach ($fields as $field) {
                    if (! empty($item[$field])) {
                        $value = $item[$field];
                        break;
                    }
                }
                $date = $this->date($value);
                if ($date && in_array((int) $date->format('Y'), $years, true)) {
                    $totals[($item['municipality'] ?? '') ?: 'Not recorded'][(int) $date->format('Y')][(int) $date->format('n') - 1]++;
                }
            }

            return $totals;
        };
        $funds = array_fill_keys($years, 0.0);
        $geography = ['district' => [], 'province' => [], 'municipality' => []];
        foreach ($activeTrainings as $item) {
            $date = $this->date($item['startDate'] ?? null);
            $coveredYear = (int) (($item['yearCovered'] ?? '') ?: $date?->format('Y'));
            if (! in_array($coveredYear, $years, true)) {
                continue;
            }
            $budget = (float) ($item['budget'] ?? 0);
            $funds[$coveredYear] += $budget;
            foreach ($geography as $field => &$rows) {
                $label = ($item[$field] ?? '') ?: 'Not recorded';
                $key = $field === 'municipality' ? (($item['province'] ?? '') ?: 'Not recorded').' / '.$label : $label;
                $rows[$key] ??= [$field => $label, 'province' => $item['province'] ?? '', 'current' => 0.0, 'previous' => 0.0, 'amount' => 0.0, 'activities' => 0];
                $rows[$key][$coveredYear === $year ? 'current' : 'previous'] += $budget;
                $rows[$key]['amount'] += $budget;
                $rows[$key]['activities']++;
            }
            unset($rows);
        }
        $ageLabels = ['Youth (15-30)', 'Adults (31-59)', 'Senior (60+)'];
        $ageSex = [['name' => 'Male', 'data' => [0, 0, 0]], ['name' => 'Female', 'data' => [0, 0, 0]]];
        $sexes = [0, 0];
        $groups = [0, 0, 0, 0, 0];
        $excludedAgeCount = 0;
        foreach ($farmers as $farmer) {
            $sexIndex = array_search(strtolower((string) ($farmer['sex'] ?? '')), ['male', 'female'], true);
            if ($sexIndex !== false) {
                $sexes[$sexIndex]++;
            }
            $birth = $this->date($farmer['birthDate'] ?? null);
            $age = $birth ? $year - (int) $birth->format('Y') - ($today->format('md') < $birth->format('md') ? 1 : 0) : null;
            if ($age === null || $age < 15 || $sexIndex === false) {
                $excludedAgeCount++;
            } else {
                $ageSex[$sexIndex]['data'][$age <= 30 ? 0 : ($age < 60 ? 1 : 2)]++;
            }
            foreach (['pwd', 'fourPs', 'indigenousGroup', 'tupad', 'soloParent'] as $index => $field) {
                if (in_array(strtolower(trim((string) ($farmer[$field] ?? ''))), ['yes', '1', 'true'], true)) {
                    $groups[$index]++;
                }
            }
        }
        $upcoming = $this->upcomingTrainings($activeTrainings, $this->date($today->format('Y-m-d')));
        $trainingDisplayIds = [];
        foreach ($activeTrainings as $training) {
            $id = (string) ($training['id'] ?? '');
            if ($id === '') {
                continue;
            }

            $trainingDisplayIds[$id] = preg_match('/^TRN-\d{2}-\d{6}$/D', $id) === 1
                ? $id
                : (string) ($training['_db_id'] ?? $id);
        }

        return [
            'currentYear' => $year, 'previousYear' => $year - 1, 'today' => $today->format('Y-m-d'),
            'humanDate' => $today->format('F j, Y'), 'weekday' => $today->format('l'),
            'trainingCount' => array_sum(array_map(
                fn (array $monthlyCounts): int => array_sum($monthlyCounts[$year]),
                $monthly($activeTrainings, ['startDate']),
            )),
            'participantCount' => count($farmers), 'associationCount' => count($associations),
            'trainingByMunicipality' => $monthly($activeTrainings, ['startDate']),
            'participantsByMunicipality' => $monthly($farmers, ['registered', 'createdAt']),
            'fabyMunicipality' => $monthly($associations, ['createdAt', 'registration_date']),
            'allocatedBudgetByDistrict' => array_values($geography['district']),
            'allocatedBudgetByProvince' => array_values($geography['province']),
            'municipalityAllocation' => array_values($geography['municipality']),
            'funds' => ['current' => $funds[$year], 'previous' => $funds[$year - 1]],
            'ageLabels' => $ageLabels, 'ageSex' => $ageSex, 'sexes' => $sexes,
            'groups' => $groups, 'groupLabels' => ['PWD', '4Ps', 'IP', 'TUPAD', 'Solo parent'],
            'trainingDisplayIds' => $trainingDisplayIds,
            'excludedAgeCount' => $excludedAgeCount, 'upcoming' => $upcoming,
        ];
    }

    private function date(?string $value): ?DateTimeImmutable
    {
        if (! $value) {
            return null;
        }
        $value = substr($value, 0, 10);
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('Asia/Manila'));

        return $date && $date->format('Y-m-d') === $value ? $date : null;
    }

    /** @param list<array<string, mixed>> $trainings
     * @return list<array<string, mixed>>
     */
    private function upcomingTrainings(array $trainings, ?DateTimeImmutable $today): array
    {
        if ($today === null) {
            return [];
        }

        $upcoming = [];
        foreach ($trainings as $training) {
            $status = strtolower(trim((string) ($training['status'] ?? '')));
            if (in_array($status, self::UPCOMING_EXCLUDED_STATUSES, true)) {
                continue;
            }

            $startDate = $this->date(isset($training['startDate']) ? (string) $training['startDate'] : null);
            $endDate = $this->date(isset($training['endDate']) ? (string) $training['endDate'] : ($training['startDate'] ?? null));
            if ($startDate === null || $endDate === null || $endDate < $today) {
                continue;
            }

            $daysUntilStart = (int) $today->diff($startDate)->format('%r%a');
            $upcoming[] = array_merge($training, ['daysUntilStart' => $daysUntilStart]);
        }

        usort($upcoming, static function (array $first, array $second): int {
            $firstOngoing = $first['daysUntilStart'] < 0;
            $secondOngoing = $second['daysUntilStart'] < 0;
            if ($firstOngoing !== $secondOngoing) {
                return $firstOngoing <=> $secondOngoing;
            }

            $firstScheduleDate = $firstOngoing ? ($first['endDate'] ?? $first['startDate']) : $first['startDate'];
            $secondScheduleDate = $secondOngoing ? ($second['endDate'] ?? $second['startDate']) : $second['startDate'];

            return [$firstScheduleDate, $first['id']] <=> [$secondScheduleDate, $second['id']];
        });

        return $upcoming;
    }
}
