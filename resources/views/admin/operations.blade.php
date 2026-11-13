@extends('layouts.admin')
@section('head')
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TMIS Operations</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
<link href="{{ asset('src/css/shared/toast.css') }}" rel="stylesheet">
<script src="{{ asset('src/js/shared/toast.js') }}" defer></script>
<script src="{{ asset('src/js/shared/operations.js') }}" defer></script>
@endsection
@section('content')
<main class="container py-4">
    @include('admin.operation-navigation')
    <h1 class="my-4">{{ ucwords(str_replace('_', ' ', $module)) }}</h1>
    <p>Office records stored in TMIS. Use the filters to choose a region, office or status.</p>
    @include('admin.operation-feedback')
    <form method="get" class="row g-3 mb-4">
        <label class="col-md-3">Search<input name="search" class="form-control" placeholder="Search by name" value="{{ request('search') }}"></label>
        <label class="col-md-3">Region<select name="region_id" class="form-select"><option value="">All accessible regions</option>@foreach($regions as $region)<option value="{{ $region->region_id }}" @selected(request('region_id') == $region->region_id)>{{ $region->name }}</option>@endforeach</select></label>
        <label class="col-md-3">Office<select name="org_id" class="form-select"><option value="">All accessible offices</option>@foreach($offices as $office)<option value="{{ $office->org_id }}" @selected(request('org_id') == $office->org_id)>{{ $office->name }}</option>@endforeach</select></label>
        @if($module === 'trainings')<label class="col-md-3">Status<select name="status" class="form-select"><option value="">All statuses</option>@foreach(['For review', 'For approval', 'Approved'] as $status)<option @selected(request('status') === $status)>{{ $status }}</option>@endforeach</select></label>@endif
        <label class="col-md-3">Activity<select name="active" class="form-select"><option value="">All records</option><option value="1" @selected(request('active') === '1')>Active</option><option value="0" @selected(request('active') === '0')>Inactive</option></select></label>
        <div class="col-md-3 align-self-end"><button class="btn btn-success">Filter</button> <a href="{{ route('operations.index', $module) }}">Clear</a></div>
    </form>
    <div class="table-responsive"><table class="table table-striped"><thead><tr><th>ID</th><th>Name</th><th>Office ID</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    @forelse($records as $record)<tr><td>{{ $record->id }}</td><td>{{ $record->name }}</td><td>{{ $record->org_id }}</td><td>{{ $record->status ?? ($record->is_active ? 'Active' : 'Inactive') }}</td><td><a href="{{ route('operations.index', ['module' => $module, 'id' => $record->id]) }}">View / edit</a></td></tr>
    @empty<tr><td colspan="5">No records match your filters.</td></tr>@endforelse
    </tbody></table></div>
    <nav class="d-flex gap-3" aria-label="Records pagination">@if($records->previousPageUrl())<a href="{{ $records->previousPageUrl() }}">Previous</a>@endif<span>Page {{ $records->currentPage() }} of {{ $records->lastPage() }}</span>@if($records->nextPageUrl())<a href="{{ $records->nextPageUrl() }}">Next</a>@endif</nav>
    @if($selected)<section class="card my-4"><div class="card-body"><h2>{{ $selected->name }}</h2><p>{{ $selected->description }}</p><p>Region {{ $selected->region_id }} / Office {{ $selected->org_id }}</p>@if($module === 'questionnaires')<ol>@foreach(json_decode($selected->questions, true) as $question)<li>{{ $question }}</li>@endforeach</ol>@endif</div></section>@endif
    @if(\App\Support\ModuleAccess::allows(auth()->user(), $module.($selected ? '.edit' : '.create')))
    <section class="card my-4"><div class="card-body">
    <h2>{{ $selected ? 'Edit record' : 'Create record' }}</h2>
    <form method="post" action="{{ $selected ? route('operations.update', [$module, $selected->id]) : route('operations.store', $module) }}" class="row g-3">
        @csrf @if($selected) @method('PATCH') @if($module === 'trainings')<input type="hidden" name="version" value="{{ $selected->version }}">@endif @endif
        <fieldset class="col-12"><legend class="fs-5">Record details</legend><div class="row g-3">
        <label class="col-md-6">Name<input class="form-control" name="name" required maxlength="255" placeholder="Enter name or title" value="{{ old('name', $selected->name ?? '') }}"></label>
        <label class="col-md-3">Region<select class="form-select" name="region_id" required data-region-select><option value="">Select a region</option>@foreach($regions as $region)<option value="{{ $region->region_id }}" @selected(old('region_id', $selected->region_id ?? auth()->user()->region_id) == $region->region_id)>{{ $region->name }}</option>@endforeach</select></label>
        <label class="col-md-3">Office<select class="form-select" name="org_id" required data-office-select><option value="">Select an office</option>@foreach($offices as $office)<option data-region="{{ $office->region_id }}" value="{{ $office->org_id }}" @selected(old('org_id', $selected->org_id ?? auth()->user()->org_id) == $office->org_id)>{{ $office->name }}</option>@endforeach</select></label>
        <label class="col-12">Description<textarea class="form-control" name="description" maxlength="10000" placeholder="Add a description">{{ old('description', $selected->description ?? '') }}</textarea></label>
        <label class="col-md-3">Activity<select class="form-select" name="is_active"><option value="1" @selected(old('is_active', $selected->is_active ?? 1) == 1)>Active</option><option value="0" @selected(old('is_active', $selected->is_active ?? 1) == 0)>Inactive</option></select></label>
        @if($module === 'trainings')
        <label class="col-md-3">Start date<input name="start_date" type="date" class="form-control" value="{{ old('start_date', $selected->start_date ?? '') }}" required></label>
        <label class="col-md-3">End date<input name="end_date" type="date" class="form-control" value="{{ old('end_date', $selected->end_date ?? '') }}" required></label>
        <label class="col-md-3">Budget (PHP)<input name="budget" type="number" min="0" step="0.01" class="form-control" value="{{ old('budget', $selected->budget ?? 0) }}" required></label>
        <label class="col-md-6">Venue<input name="venue" class="form-control" maxlength="255" placeholder="Enter training venue" value="{{ old('venue', $selected->venue ?? '') }}" required></label>
        @endif
        @if(in_array($module, ['participants', 'resource_persons']))
        <label class="col-md-6">Email<input name="email" type="email" class="form-control" maxlength="255" placeholder="name@example.com" value="{{ old('email', $selected->email ?? '') }}"></label>
        <label class="col-md-6">Phone<input name="phone" class="form-control" maxlength="30" placeholder="Enter phone number" value="{{ old('phone', $selected->phone ?? '') }}"></label>
        @endif
        @if($module === 'participants')
        <label class="col-md-4">Association ID<input name="association_id" type="number" min="1" class="form-control" placeholder="Optional association ID" value="{{ old('association_id', $selected->association_id ?? '') }}"></label>
        <label class="col-md-4">Date of birth<input name="date_of_birth" type="date" class="form-control" value="{{ old('date_of_birth', $selected->date_of_birth ?? '') }}"></label>
        <label class="col-md-4">Sex<select name="sex" class="form-select"><option value="">Select if provided</option>@foreach(['Male', 'Female'] as $sex)<option @selected(old('sex', $selected->sex ?? '') === $sex)>{{ $sex }}</option>@endforeach</select></label>
        <label class="col-12">Address<textarea name="address" class="form-control" maxlength="2000" placeholder="Enter address">{{ old('address', $selected->address ?? '') }}</textarea></label>
        @endif
        @if($module === 'resource_persons')<label class="col-12">Expertise<input name="expertise" class="form-control" maxlength="255" placeholder="Enter specialization" value="{{ old('expertise', $selected->expertise ?? '') }}"></label>@endif
        @if($module === 'questionnaires')
        <label class="col-md-6">Questionnaire type<select name="kind" class="form-select" required><option value="">Select a type</option>@foreach(['Pre-test', 'Post-test', 'Training evaluation', 'Resource person evaluation'] as $kind)<option @selected(old('kind', $selected->kind ?? '') === $kind)>{{ $kind }}</option>@endforeach</select></label>
        <fieldset class="col-12" data-questions><legend class="fs-5">Questions</legend>@foreach(old('questions', $selected ? json_decode($selected->questions, true) : ['']) as $question)<label class="d-block mb-2">Question<input name="questions[]" class="form-control" required maxlength="1000" placeholder="Enter question" value="{{ $question }}"></label>@endforeach<button class="btn btn-outline-secondary" type="button" data-add-question>Add question</button></fieldset>
        @endif
        @foreach(\App\Support\OperationalFields::forModule($module) as $field => $definition)
        <label class="col-md-4">{{ $definition['label'] }}<input class="form-control" name="{{ $field }}" type="{{ $definition['type'] }}" @if($definition['type'] === 'text') maxlength="255" @elseif($definition['type'] === 'number') min="0" @endif placeholder="Enter {{ strtolower($definition['label']) }}" value="{{ old($field, $selected?->{$field} ?? '') }}"></label>
        @endforeach
        @if($module === 'participants')<fieldset class="col-12"><legend class="fs-5">Optional personal requirements</legend><p>Only provide information needed to organize the training. These fields are encrypted in storage.</p><div class="row g-3">@foreach(\App\Support\OperationalFields::sensitiveParticipantFields() as $field => $label)<label class="col-md-4">{{ $label }}<input class="form-control" name="sensitive[{{ $field }}]" maxlength="500" placeholder="Optional" value="{{ old('sensitive.'.$field, $selected->sensitive[$field] ?? '') }}"></label>@endforeach</div></fieldset>@endif
        </div></fieldset>
        <div><button class="btn btn-success">Save record</button>@if($selected) <a href="{{ route('operations.index', $module) }}">Create another</a>@endif</div>
    </form></div></section>
    @endif
    @if($selected && $module === 'trainings')
    <section class="card my-4"><div class="card-body"><h2>Attachments</h2><ul>@forelse($attachments as $attachment)<li>{{ $attachment->original_kind ?? $attachment->kind }}: <a href="{{ route('operations.trainings.download', [$selected->id, $attachment->id]) }}">{{ $attachment->original_name }}</a></li>@empty<li>No attachments uploaded.</li>@endforelse</ul>
    @if(\App\Support\ModuleAccess::allows(auth()->user(), 'trainings.create') && $selected->status === 'For review')
    <form method="post" action="{{ route('operations.trainings.attachments', $selected->id) }}" enctype="multipart/form-data" class="row g-3">@csrf
    <label class="col-md-4">Attachment type<select name="kind" class="form-select" required><option value="">Select attachment type</option>@foreach($trainingAttachmentTypes as $kind)<option>{{ $kind }}</option>@endforeach</select></label>
    <label class="col-md-6">Document (PDF, DOC, DOCX; 10 MB maximum)<input name="file" type="file" class="form-control" required accept=".pdf,.doc,.docx"></label><div><button class="btn btn-success">Upload</button></div></form>
    @endif
    @if(\App\Support\ModuleAccess::allows(auth()->user(), 'trainings.edit') && $selected->status === 'For review')
    <hr><h3>Enroll a participant or resource person</h3>
    @foreach(['participants' => $participantOptions, 'resource_persons' => $resourceOptions] as $enrollmentKind => $options)
    <form method="post" action="{{ route('operations.trainings.enrollment', $selected->id) }}" class="row g-3 mb-3">@csrf<input type="hidden" name="kind" value="{{ $enrollmentKind }}"><label class="col-md-8">{{ $enrollmentKind === 'participants' ? 'Participant' : 'Resource person' }}<select name="related_id" class="form-select" required><option value="">Select from this training's office</option>@foreach($options as $option)<option value="{{ $option->id }}">{{ $option->name }}</option>@endforeach</select></label><div class="col-md-4 align-self-end"><button class="btn btn-success">Enroll</button></div></form>
    @endforeach
    @endif
    </div></section>
    <section class="card my-4"><div class="card-body"><h2>Enrollment</h2><h3 class="fs-5">Participants</h3><ul>@forelse($enrolledParticipants as $person)<li>{{ $person->name }}</li>@empty<li>None enrolled.</li>@endforelse</ul><h3 class="fs-5">Resource persons</h3><ul>@forelse($enrolledResources as $person)<li>{{ $person->name }}</li>@empty<li>None enrolled.</li>@endforelse</ul></div></section>
    <section class="card my-4"><div class="card-body"><h2>Approval workflow</h2><p>Current status: <strong>{{ $selected->status }}</strong></p><p>A training design is required before submitting for approval. Return a training to review to edit it.</p>
    <form method="post" action="{{ route('operations.trainings.status', $selected->id) }}" class="row g-3">@csrf<input type="hidden" name="version" value="{{ $selected->version }}">
    <label class="col-md-4">Next status<select name="status" class="form-select" required><option value="">Select next status</option>@if($selected->status === 'For review' && \App\Support\ModuleAccess::allows(auth()->user(), 'trainings.submit'))<option>For approval</option>@endif @if($selected->status !== 'For review' && \App\Support\ModuleAccess::allows(auth()->user(), 'trainings.approve')) @if($selected->status === 'For approval')<option>Approved</option>@endif<option>For review</option>@endif</select></label><label class="col-md-8">Reason (required when returning to review)<input name="reason" class="form-control" maxlength="2000" placeholder="Explain why the training is being returned"></label><div><button class="btn btn-success">Update status</button></div></form>
    <h3 class="mt-4">Status history</h3><ol>@forelse($history as $change)<li>{{ $change->created_at }}: {{ $change->from_status }} ? {{ $change->to_status }}. {{ $change->reason }}</li>@empty<li>No status changes yet.</li>@endforelse</ol>
    </div></section>
    @endif
    @if($selected && \App\Support\ModuleAccess::allows(auth()->user(), $module.'.delete'))
    <form method="post" action="{{ route('operations.destroy', [$module, $selected->id]) }}" data-confirm-delete>@csrf @method('DELETE')<button class="btn btn-outline-danger">Move this record to trash</button></form>
    @endif
</main>
@endsection


