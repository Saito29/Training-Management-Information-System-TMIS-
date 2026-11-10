@extends('layouts.admin')
@section('head')
<meta name="viewport" content="width=device-width, initial-scale=1"><title>TMIS Office notifications</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
@endsection
@section('content')
<main class="container py-4">
  @include('admin.operation-navigation')
  <h1 class="my-4">Office notifications</h1>
  <ul class="list-group">
    @forelse($notifications as $notification)
      <li class="list-group-item">
        <h2 class="h5">{{ $notification->title }}</h2>
        <p><strong>{{ $notification->training_name }}</strong> (ID {{ $notification->training_id }}) moved from {{ $notification->from_status }} to <strong>{{ $notification->to_status }}</strong>.</p>
        @if(in_array($notification->to_status, ['For approval', 'For review'], true))
          <p><strong>Reason for return:</strong> {{ $notification->reason ?: 'No reason was recorded.' }}</p>
        @endif
        <p><strong>Status changed by:</strong> {{ $notification->actor_name }} ({{ $notification->actor_office_name ?: 'Office not recorded' }}) on <time datetime="{{ $notification->changed_at }}">{{ $notification->changed_at_human }}</time>.</p>
        <p><strong>Training office / organization:</strong> {{ $notification->training_office_name ?: 'Office not recorded' }}</p>
        <p class="text-body-secondary">Email: {{ $notification->sent_at ? 'Sent' : ($notification->cancelled_at ? 'Cancelled because recipient access changed' : 'Pending delivery') }}. {{ $notification->read_at ? 'Read' : 'Unread' }}</p>
        @if(!$notification->read_at)
          <form method="post" action="{{ route('operations.notifications.read', $notification->id) }}">@csrf @method('PATCH')<button class="btn btn-outline-success btn-sm">Mark read</button></form>
        @endif
      </li>
    @empty
      <li class="list-group-item">No office notifications yet.</li>
    @endforelse
  </ul>
  <nav class="d-flex gap-3 mt-3" aria-label="Notification pagination">
    @if($notifications->previousPageUrl())<a href="{{ $notifications->previousPageUrl() }}">Previous</a>@endif
    @if($notifications->nextPageUrl())<a href="{{ $notifications->nextPageUrl() }}">Next</a>@endif
  </nav>
</main>
@endsection
