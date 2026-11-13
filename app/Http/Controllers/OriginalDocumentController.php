<?php

namespace App\Http\Controllers;

use App\Http\Authentication\AuditTrail;
use App\Support\AccountUpdateNotifier;
use App\Support\AttachmentTypeCatalog;
use App\Support\ModuleAccess;
use App\Support\OriginalInterfaceData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** Stores original-screen documents privately and rechecks workflow state under the owner lock. */
class OriginalDocumentController
{
    /** Build a human-readable record name for attachment activity and owner notifications. */
    private function recordLabel(object $owner, string $module): string
    {
        $name = $owner->name ?? trim(implode(' ', array_filter([
            $owner->first_name ?? null,
            $owner->middle_name ?? null,
            $owner->last_name ?? null,
        ])));

        return $name !== '' ? $name : ucfirst(rtrim($module, 's')).' record #'.$owner->id;
    }

    /** Attach the document metadata to an activity entry and notify the record owner. */
    private function auditAttachmentChange(Request $request, object $owner, string $module, string $action, string $documentName, string $kind, ?int $year = null, ?string $remarks = null): void
    {
        $officeName = isset($owner->org_id) ? DB::table('organization')->where('org_id', $owner->org_id)->value('name') : null;
        $regionName = isset($owner->region_id) ? DB::table('region')->where('region_id', $owner->region_id)->value('name') : null;
        $metadata = [
            'record_name' => $this->recordLabel($owner, $module),
            'document_name' => mb_substr($documentName, 0, 255),
            'document_kind' => mb_substr($kind, 0, 80),
            'office_name' => $officeName,
            'region_name' => $regionName,
        ];
        if ($year !== null) {
            $metadata['document_year'] = $year;
        }
        if ($remarks !== null && trim($remarks) !== '') {
            $metadata['document_remarks'] = mb_substr($remarks, 0, 500);
        }
        $actionPast = match ($action) {
            'uploaded' => 'uploaded',
            'deleted' => 'deleted',
            default => 'updated',
        };

        AuditTrail::record(
            $request,
            $module.'_document_'.$action.'_'.$owner->id,
            $request->user(),
            after: $metadata + ['document_changes' => [$actionPast]],
            category: $module,
        );
        app(AccountUpdateNotifier::class)->notifyRecordAttachment($request, $owner, $module, $actionPast, $documentName, $kind);
    }

    private function owner(Request $request, string $module, string $id, string $action): object
    {
        abort_unless(in_array($module, ['trainings', 'associations', 'participants'], true), 404);
        ModuleAccess::authorize($request, $module.'.'.$action);
        $record = $module === 'trainings' && $action === 'read'
            ? OriginalInterfaceData::findTrainingForRead($request->user(), $id)
            : OriginalInterfaceData::find($request->user(), $module, $id);
        abort_unless($record, 404);
        if (in_array($action, ['create', 'edit', 'delete'], true) && $module === 'trainings') {
            abort_unless($record->status === 'For review', 409, 'Return the training to review before changing documents.');
        }

        return $record;
    }

    private function table(string $module): array
    {
        return match ($module) {
            'trainings' => ['training_attachments', 'training_id'], 'associations' => ['association_attachments', 'association_id'], default => ['participant_attachments', 'participant_id']
        };
    }

    public function store(Request $request, string $module, string $id, OriginalInterfaceData $interface): JsonResponse
    {
        $action = $module === 'participants' && $request->input('kind') === 'Status supporting document' ? 'edit' : 'create';
        $owner = $this->owner($request, $module, $id, $action);
        $data = $request->validate(['kind' => ['required', 'string', 'max:80'], 'year' => ['nullable', 'integer', 'min:2000', 'max:2200'], 'remarks' => ['nullable', 'string', 'max:500'], 'file' => ['required', 'file', 'mimes:pdf,doc,docx,png,jpg,jpeg,webp', 'extensions:pdf,doc,docx,png,jpg,jpeg,webp', 'max:10240']]);
        $data['kind'] = AttachmentTypeCatalog::resolve(AttachmentTypeCatalog::categoryForModule($module), $data['kind']);
        if ($module === 'participants' && $data['kind'] === 'Status supporting document') {
            $request->validate(['file' => ['required', 'file', 'mimes:pdf,png,jpg,jpeg,webp,gif', 'extensions:pdf,png,jpg,jpeg,webp,gif', 'max:10240']]);
        }
        $design = in_array($data['kind'], ['Training Design', 'Training design'], true);
        if ($design) {
            $request->validate(['file' => ['mimes:pdf,doc,docx', 'extensions:pdf,doc,docx']]);
        }
        $file = $request->file('file');
        $path = $file->store('record-documents', 'local');
        try {
            DB::transaction(function () use ($request, $module, $owner, $data, $design, $file, $path): void {
                AttachmentTypeCatalog::lock(AttachmentTypeCatalog::categoryForModule($module), $data['kind']);
                $locked = DB::table($module)->where('id', $owner->id)->lockForUpdate()->first();
                abort_unless($locked && ! $locked->deleted_at, 404);
                if ($module === 'trainings') {
                    abort_unless($locked->status === 'For review', 409, 'Return the training to review before changing documents.');
                }
                [$table, $foreign] = $this->table($module);
                $values = [$foreign => $owner->id, 'kind' => $module === 'trainings' ? ($design ? 'Training design' : 'Other') : $data['kind'], 'year' => $data['year'] ?? null, 'remarks' => $data['remarks'] ?? null, 'path' => $path, 'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'uploaded_by' => $request->user()->user_id, 'created_at' => now(), 'updated_at' => now()];
                if ($module === 'trainings') {
                    $values['original_kind'] = $data['kind'];
                    DB::table($module)->where('id', $owner->id)->increment('version');
                }
                DB::table($table)->insert($values);
                DB::table($module)->where('id', $owner->id)->increment('ui_version');
                $this->auditAttachmentChange($request, $owner, $module, 'uploaded', basename($file->getClientOriginalName()), (string) $data['kind'], $data['year'] ?? null, $data['remarks'] ?? null);
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json($interface->bootstrap($request->user()) + ['message' => 'Document uploaded.']);
    }

    public function show(Request $request, string $module, string $id, int $document): BinaryFileResponse
    {
        $owner = $this->owner($request, $module, $id, 'read');
        [$table, $foreign] = $this->table($module);
        $file = DB::table($table)->where('id', $document)->where($foreign, $owner->id)->first();
        abort_unless($file && Storage::disk('local')->exists($file->path), 404);

        return response()->file(Storage::disk('local')->path($file->path), ['Content-Type' => $file->mime_type, 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'no-store, private', 'Content-Security-Policy' => "sandbox; default-src 'none'; style-src 'unsafe-inline'"]);
    }

    public function update(Request $request, string $module, string $id, int $document, OriginalInterfaceData $interface): JsonResponse
    {
        $owner = $this->owner($request, $module, $id, 'edit');
        $data = $request->validate(['kind' => ['required', 'string', 'max:80'], 'year' => ['nullable', 'integer', 'min:2000', 'max:2200'], 'remarks' => ['nullable', 'string', 'max:500']]);
        $data['kind'] = AttachmentTypeCatalog::resolve(AttachmentTypeCatalog::categoryForModule($module), $data['kind']);
        [$table, $foreign] = $this->table($module);
        DB::transaction(function () use ($request, $module, $owner, $document, $data, $table, $foreign): void {
            AttachmentTypeCatalog::lock(AttachmentTypeCatalog::categoryForModule($module), $data['kind']);
            $locked = DB::table($module)->where('id', $owner->id)->lockForUpdate()->first();
            abort_unless($locked && ! $locked->deleted_at, 404);
            if ($module === 'trainings') {
                abort_unless($locked->status === 'For review', 409, 'Return the training to review before changing documents.');
            }
            $file = DB::table($table)->where('id', $document)->where($foreign, $owner->id)->first();
            abort_unless($file, 404);
            $values = $data + ['updated_at' => now()];
            if ($module === 'trainings') {
                $design = in_array($data['kind'], ['Training Design', 'Training design'], true);
                abort_if($design && ! in_array($file->mime_type, ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], true), 422, 'Training designs must be PDF or Word documents.');
                $values['original_kind'] = $data['kind'];
                $values['kind'] = $design ? 'Training design' : 'Other';
                DB::table($module)->where('id', $owner->id)->increment('version');
            }
            DB::table($table)->where('id', $document)->update($values);
            DB::table($module)->where('id', $owner->id)->increment('ui_version');
            $this->auditAttachmentChange($request, $owner, $module, 'updated', (string) $file->original_name, (string) $data['kind'], $data['year'] ?? null, $data['remarks'] ?? null);
        });

        return response()->json($interface->bootstrap($request->user()));
    }

    public function destroy(Request $request, string $module, string $id, int $document, OriginalInterfaceData $interface): JsonResponse
    {
        $owner = $this->owner($request, $module, $id, 'delete');
        [$table, $foreign] = $this->table($module);
        DB::transaction(function () use ($request, $module, $owner, $document, $table, $foreign): void {
            $locked = DB::table($module)->where('id', $owner->id)->lockForUpdate()->first();
            abort_unless($locked && ! $locked->deleted_at, 404);
            if ($module === 'trainings') {
                abort_unless($locked->status === 'For review', 409, 'Return the training to review before changing documents.');
            }
            $file = DB::table($table)->where('id', $document)->where($foreign, $owner->id)->first();
            abort_unless($file, 404);
            DB::table($table)->where('id', $document)->delete();
            if ($module === 'trainings') {
                DB::table('trainings')->where('id', $owner->id)->increment('version');
            }
            DB::table($module)->where('id', $owner->id)->increment('ui_version');
            $this->auditAttachmentChange($request, $owner, $module, 'deleted', (string) $file->original_name, (string) $file->kind, $file->year === null ? null : (int) $file->year, $file->remarks);
            DB::afterCommit(fn () => Storage::disk('local')->delete($file->path));
        });

        return response()->json($interface->bootstrap($request->user()));
    }

    public function highlight(Request $request, string $id, OriginalInterfaceData $interface): JsonResponse
    {
        $owner = $this->owner($request, 'trainings', $id, 'edit');
        $data = $request->validate(['slide' => ['required', 'integer', 'min:0', 'max:1'], 'content' => ['required', 'json'], 'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'], 'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']]);
        $raw = json_decode($data['content'], true, 512, JSON_THROW_ON_ERROR);
        $rules = [];
        foreach (['heading' => 100, 'description' => 300, 'quote' => 300, 'trainingTitle' => 120, 'officeName' => 100] as $field => $max) {
            $rules[$field] = ['nullable', 'string', 'max:'.$max];
        }
        foreach (['titleSize', 'headingSize', 'bodySize', 'quoteSize', 'officeSize', 'logoSize'] as $field) {
            $rules[$field] = ['nullable', 'integer', 'min:10', 'max:300'];
        }
        $rules += ['bold' => ['nullable', 'boolean'], 'italic' => ['nullable', 'boolean'], 'branding' => ['nullable', Rule::in(['office', 'logo'])]];
        $content = Validator::make($raw, $rules)->validate();
        $paths = [];
        try {
            foreach (['image', 'logo'] as $field) {
                if ($request->hasFile($field)) {
                    $paths[$field.'_path'] = $request->file($field)->store('training-highlights', 'local');
                }
            }
            DB::transaction(function () use ($request, $owner, $data, $content, $paths): void {
                $training = DB::table('trainings')->where('id', $owner->id)->lockForUpdate()->first();
                abort_unless($training->status === 'For review', 409, 'Return the training to review before editing highlights.');
                DB::table('training_highlights')->updateOrInsert(['training_id' => $owner->id, 'slide' => $data['slide']], ['content' => json_encode($content, JSON_THROW_ON_ERROR), 'updated_at' => now(), 'created_at' => now()] + $paths);
                DB::table('trainings')->where('id', $owner->id)->increment('ui_version');
                AuditTrail::record($request, 'training_highlight_updated_'.$owner->id, $request->user(), category: 'trainings');
            });
        } catch (\Throwable $exception) {
            foreach ($paths as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json($interface->bootstrap($request->user()));
    }

    public function highlightImage(Request $request, string $id, int $slide, string $kind): BinaryFileResponse
    {
        $owner = $this->owner($request, 'trainings', $id, 'read');
        abort_unless(in_array($kind, ['image', 'logo'], true), 404);
        $path = DB::table('training_highlights')->where('training_id', $owner->id)->where('slide', $slide)->value($kind.'_path');
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'no-store, private']);
    }
}
