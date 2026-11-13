<?php

namespace App\Support;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AttachmentTypeCatalog
{
    public const CATEGORIES = [
        'farmer_profile' => 'Farmer profile',
        'farmer_association' => 'Farmer association',
        'training' => 'Training',
    ];

    private const MODULE_CATEGORIES = [
        'participants' => 'farmer_profile',
        'associations' => 'farmer_association',
        'trainings' => 'training',
    ];

    public static function categoryForModule(string $module): string
    {
        abort_unless(isset(self::MODULE_CATEGORIES[$module]), 404);

        return self::MODULE_CATEGORIES[$module];
    }

    public static function names(string $category): Collection
    {
        abort_unless(isset(self::CATEGORIES[$category]), 404);

        return DB::table('attachment_type_options')
            ->where('category', $category)
            ->orderBy('name')
            ->pluck('name');
    }

    /** @return array<string, array<int, string>> */
    public static function namesByCategory(): array
    {
        return collect(array_keys(self::CATEGORIES))
            ->mapWithKeys(fn (string $category): array => [$category => self::names($category)->all()])
            ->all();
    }

    public static function resolve(string $category, string $name): string
    {
        abort_unless(isset(self::CATEGORIES[$category]), 404);

        $resolvedName = DB::table('attachment_type_options')
            ->where('category', $category)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($name))])
            ->value('name');

        if (! is_string($resolvedName)) {
            throw ValidationException::withMessages([
                'kind' => 'Select an attachment type configured for this category.',
            ]);
        }

        return $resolvedName;
    }

    public static function lock(string $category, string $name): void
    {
        abort_unless(isset(self::CATEGORIES[$category]), 404);
        $type = DB::table('attachment_type_options')
            ->where('category', $category)
            ->where('name', $name)
            ->lockForUpdate()
            ->first();

        if (! $type) {
            throw ValidationException::withMessages([
                'kind' => 'Select an attachment type configured for this category.',
            ]);
        }
    }
}
