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
<div class="table-responsive"><table class="table"><thead><tr><th>Training ID</th><th>Questionnaire ID</th><th>Participant ID</th><th>Answers</th><th>Encoded at</th></tr></thead><tbody>@forelse($responses as $response)<tr><td>{{ $response->training_id }}</td><td>{{ $response->questionnaire_id }}</td><td>{{ $response->participant_id }}</td><td><ol>@foreach(json_decode($response->answers, true) as $answer)<li>{{ $answer }}</li>@endforeach</ol></td><td>{{ $response->created_at }}</td></tr>@empty<tr><td colspan="5">No evaluations recorded.</td></tr>@endforelse</tbody></table></div><nav class="d-flex gap-3" aria-label="Evaluation pagination">@if($responses->previousPageUrl())<a href="{{ $responses->previousPageUrl() }}">Previous</a>@endif @if($responses->nextPageUrl())<a href="{{ $responses->nextPageUrl() }}">Next</a>@endif</nav></main>
@endsection
