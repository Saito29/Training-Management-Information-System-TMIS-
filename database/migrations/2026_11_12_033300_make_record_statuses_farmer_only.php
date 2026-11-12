<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('record_statuses', function (Blueprint $table): void {
            $table->boolean('is_builtin')->default(false);
        });

        $builtInStatuses = [
            'Active' => 'Farmer is currently participating.',
            'Inactive' => 'Farmer is not currently participating.',
            'Waived' => 'Farmer has waived or withdrawn from the farmer association.',
            'Deceased' => 'Farmer has passed away.',
        ];
        $statusIds = [];

        foreach ($builtInStatuses as $name => $description) {
            $existing = DB::table('record_statuses')
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->first();

            if ($existing) {
                DB::table('record_statuses')->where('id', $existing->id)->update([
                    'name' => $name,
                    'description' => $description,
                    'is_builtin' => true,
                    'is_active' => true,
                    'updated_at' => now(),
                ]);
                $statusIds[mb_strtolower($name)] = (int) $existing->id;

                continue;
            }

            $statusIds[mb_strtolower($name)] = (int) DB::table('record_statuses')->insertGetId([
                'name' => $name,
                'description' => $description,
                'is_active' => true,
                'is_builtin' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (DB::table('participants')->orderBy('id')->get(['id', 'record_status_id', 'is_active', 'ui_data']) as $participant) {
            $metadata = $this->decodeMetadata($participant->ui_data);
            $statusId = $participant->record_status_id === null ? null : (int) $participant->record_status_id;
            $statusName = $statusId === null
                ? null
                : DB::table('record_statuses')->where('id', $statusId)->value('name');

            if (is_string($statusName) && in_array(mb_strtolower(trim($statusName)), ['removed', 'waived from farmer association'], true)) {
                $statusId = $statusIds['waived'];
                $statusName = 'Waived';
            }

            if (is_string($statusName) && in_array(mb_strtolower($statusName), ['active', 'inactive'], true)) {
                $statusId = $statusIds[$participant->is_active ? 'active' : 'inactive'];
                $statusName = $participant->is_active ? 'Active' : 'Inactive';
            }

            if (! is_string($statusName)) {
                $legacyStatus = is_array($metadata) ? trim((string) ($metadata['status'] ?? '')) : '';
                $legacyStatus = match (mb_strtolower($legacyStatus)) {
                    'removed', 'waived from farmer association' => 'Waived',
                    default => $legacyStatus,
                };
                if (mb_strtolower($legacyStatus) === 'active' && ! $participant->is_active) {
                    $legacyStatus = 'Inactive';
                }
                $statusId = $statusIds[mb_strtolower($legacyStatus)]
                    ?? ($participant->is_active ? $statusIds['active'] : $statusIds['inactive']);
                $statusName = DB::table('record_statuses')->where('id', $statusId)->value('name');
            }

            $changes = [
                'record_status_id' => $statusId,
                'is_active' => $statusName === 'Active',
            ];

            if (is_array($metadata)) {
                $metadata['status'] = $statusName;
                $metadata['farmerStatusId'] = (string) $statusId;
                unset($metadata['customStatusId'], $metadata['customStatus'], $metadata['customStatusActive']);
                $changes['ui_data'] = Crypt::encryptString(json_encode($metadata, JSON_THROW_ON_ERROR));
            }

            DB::table('participants')->where('id', $participant->id)->update($changes);
        }

        foreach (['associations', 'trainings', 'resource_persons'] as $tableName) {
            foreach (DB::table($tableName)->whereNotNull('ui_data')->orderBy('id')->get(['id', 'ui_data']) as $record) {
                $metadata = $this->decodeMetadata($record->ui_data);

                if (! is_array($metadata)) {
                    continue;
                }

                $previous = $metadata;
                unset($metadata['farmerStatusId'], $metadata['customStatusId'], $metadata['customStatus'], $metadata['customStatusActive']);

                if ($metadata !== $previous) {
                    DB::table($tableName)->where('id', $record->id)->update([
                        'ui_data' => Crypt::encryptString(json_encode($metadata, JSON_THROW_ON_ERROR)),
                    ]);
                }
            }
        }

        foreach (['associations', 'trainings', 'resource_persons'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropConstrainedForeignId('record_status_id');
            });
        }
    }

    public function down(): void
    {
        foreach (['associations', 'trainings', 'resource_persons'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId('record_status_id')
                    ->nullable()
                    ->constrained('record_statuses')
                    ->restrictOnDelete();
            });
        }

        Schema::table('record_statuses', function (Blueprint $table): void {
            $table->dropColumn('is_builtin');
        });
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeMetadata(?string $payload): ?array
    {
        if ($payload === null || $payload === '') {
            return [];
        }

        try {
            $decoded = json_decode(Crypt::decryptString($payload), true);
        } catch (DecryptException) {
            $decoded = json_decode($payload, true);
        }

        return is_array($decoded) ? $decoded : null;
    }
};
