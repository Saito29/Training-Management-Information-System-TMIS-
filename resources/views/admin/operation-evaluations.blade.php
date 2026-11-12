@extends('layouts.admin')
@section('head')
<meta name="viewport" content="width=device-width, initial-scale=1"><title>TMIS Evaluations</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
<link href="{{ asset('src/css/shared/toast.css') }}" rel="stylesheet"><script src="{{ asset('src/js/shared/toast.js') }}" defer></script><script src="{{ asset('src/js/shared/operations.js') }}" defer></script>
@endsection
@section('content')
<main class="container py-4">@include('admin.operation-navigation')<h1 class="my-4">Training evaluations</h1>@include('admin.operation-feedback')
@if(\App\Support\ModuleAccess::allows(auth()->user(), 'evaluations.create'))<form method="post" action="{{ route('operations.evaluations.store') }}" class="row g-3 mb-4">@csrf
<label class="col-md-4">Approved training<select name="training_id" required class="form-select"><option value="">Select a training</option>@foreach($trainingOptions as $training)<option value="{{ $training->id }}">{{ $training->name }}</option>@endforeach</select></label>
<label class="col-md-4">Participant<select name="participant_id" required class="form-select"><option value="">Select an enrolled participant</option>@foreach($participantOptions as $participant)<option value="{{ $participant->id }}">{{ $participant->name }}</option>@endforeach</select></label>
<label class="col-md-4">Questionnaire<select name="questionnaire_id" required class="form-select" data-evaluation-questionnaire><option value="">Select a questionnaire</option>@foreach($questionnaireOptions as $questionnaire)<option value="{{ $questionnaire->id }}" data-questions="{{ $questionnaire->questions }}">{{ $questionnaire->name }}</option>@endforeach</select></label>
<fieldset class="col-12" data-evaluation-answers><legend class="fs-5">Answers</legend><p>Select a questionnaire to load its questions.</p></fieldset><div><button class="btn btn-success">Record evaluation</button></div></form>@endif
<div class="table-responsive"><table class="table"><thead><tr><th>Training</th><th>Questionnaire</th><th>Participant</th><th>Answers</th><th>Encoded at</th><th>Actions</th></tr></thead><tbody>@forelse($responses as $response)
@php($questions = json_decode($response->questionnaire_questions, true) ?? [])
@php($answers = json_decode($response->answers, true) ?? [])
<tr><td>{{ $response->training_name }}</td><td>{{ $response->questionnaire_name }}</td><td>{{ $response->participant_name }}</td><td><ol>@foreach($answers as $answer)<li>{{ $answer }}</li>@endforeach</ol></td><td>{{ $response->created_at }}</td><td class="d-flex flex-column gap-2">
@if(\App\Support\ModuleAccess::allows(auth()->user(), 'evaluations.edit'))
<details><summary>Edit response</summary><form method="post" action="{{ route('operations.evaluations.update', $response->id) }}" class="mt-2">@csrf @method('PATCH')
<input type="hidden" name="training_id" value="{{ $response->training_id }}"><input type="hidden" name="questionnaire_id" value="{{ $response->questionnaire_id }}"><input type="hidden" name="participant_id" value="{{ $response->participant_id }}">
@foreach($questions as $index => $question)<label class="d-block mb-2">{{ $question }}<textarea class="form-control" name="answers[]" maxlength="4000" required>{{ $answers[$index] ?? '' }}</textarea></label>@endforeach
<button class="btn btn-sm btn-primary" type="submit">Save response</button></form></details>
@endif
@if(\App\Support\ModuleAccess::allows(auth()->user(), 'evaluations.delete'))
<form method="post" action="{{ route('operations.evaluations.destroy', $response->id) }}" data-confirm-evaluation-delete>@csrf @method('DELETE')<button class="btn btn-sm btn-outline-danger" type="submit">Delete response</button></form>
@endif
</td></tr>@empty<tr><td colspan="6">No evaluations recorded.</td></tr>@endforelse</tbody></table></div><nav class="d-flex gap-3" aria-label="Evaluation pagination">@if($responses->previousPageUrl())<a href="{{ $responses->previousPageUrl() }}">Previous</a>@endif @if($responses->nextPageUrl())<a href="{{ $responses->nextPageUrl() }}">Next</a>@endif</nav></main>
@endsection
