@extends('layouts.admin')
@section('head')
<meta name="viewport" content="width=device-width, initial-scale=1"><title>TMIS My activity logs</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
@endsection
@section('content')
<main class="container py-4">@include('admin.operation-navigation')<h1 class="my-4">My activity logs</h1><p>Server-recorded account, security, training and settings events involving your account.</p><div class="table-responsive"><table class="table"><thead><tr><th>Time</th><th>Event</th><th>Category</th><th>Result</th></tr></thead><tbody>@forelse($entries as $entry)<tr><td>{{ $entry->created_at }}</td><td>{{ $entry->event }}</td><td>{{ $entry->category }}</td><td>{{ $entry->outcome }}</td></tr>@empty<tr><td colspan="4">No activity yet.</td></tr>@endforelse</tbody></table></div><nav class="d-flex gap-3" aria-label="Activity pagination">@if($entries->previousPageUrl())<a href="{{ $entries->previousPageUrl() }}">Previous</a>@endif @if($entries->nextPageUrl())<a href="{{ $entries->nextPageUrl() }}">Next</a>@endif</nav></main>
@endsection
