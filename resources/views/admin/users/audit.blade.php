@extends('layouts.admin')

@section('head')
    <title>Account audit history</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
    <script src="{{ asset('src/js/users/audit.js') }}" defer></script>
@endsection

@section('content')
<main class="container py-4">
    <a href="{{ route('admin.users.logs') }}">Back to activity logs</a>
    <header class="d-flex flex-wrap justify-content-between align-items-start gap-3 mt-4 mb-3">
        <div>
            <h1>Account audit history</h1>
            <p class="mb-0">Server-recorded account and security events. Personal values are redacted.</p>
        </div>
        <button class="btn btn-outline-success" type="button" data-bs-toggle="modal" data-bs-target="#auditExportModal">
            <i class="bi bi-download" aria-hidden="true"></i> Export filtered logs
        </button>
    </header>
    @if ($errors->any())
        <div class="alert alert-danger" role="alert">{{ $errors->first() }}</div>
    @endif
    @if (session('operation_message'))
        <div class="alert alert-success" role="status">{{ session('operation_message') }}</div>
    @endif
    <form method="get" action="{{ route('audit.index') }}" class="row g-3 mb-4">
        <label class="col-sm-6 col-lg-3">Actor or account name<input class="form-control" name="user" type="search" value="{{ request('user') }}" maxlength="150"></label>
        <label class="col-sm-6 col-lg-2">Event<input class="form-control" name="event" value="{{ request('event') }}" maxlength="100"></label>
        <label class="col-sm-6 col-lg-2">Category<select class="form-select" name="category"><option value="">All</option>@foreach(['account', 'security', 'import', 'settings', 'trainings', 'participants', 'associations', 'resource_persons', 'questionnaires', 'evaluation', 'notification'] as $category)<option value="{{ $category }}" @selected(request('category') === $category)>{{ ucfirst(str_replace('_', ' ', $category)) }}</option>@endforeach</select></label>
        <label class="col-sm-6 col-lg-2">From<input class="form-control" name="from" type="date" value="{{ request('from') }}"></label>
        <label class="col-sm-6 col-lg-2">To<input class="form-control" name="to" type="date" value="{{ request('to') }}"></label>
        <div class="col-lg-1 align-self-end d-grid"><button class="btn btn-success">Filter</button></div>
    </form>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <p class="mb-0">{{ $entries->total() }} events · Page {{ $entries->currentPage() }} of {{ $entries->lastPage() }}</p>
        <label class="form-check-label"><input id="deleteAllFiltered" class="form-check-input me-2" type="checkbox" name="delete_all_filtered" value="1" form="auditDeleteForm">Permanently delete all matching filters</label>
    </div>
    <form id="auditDeleteForm" method="post" action="{{ route('audit.destroy') }}">
        @csrf
        @method('DELETE')
        @foreach(['user', 'event', 'category', 'from', 'to'] as $filter)
            @if(request()->filled($filter))
                <input type="hidden" name="{{ $filter }}" value="{{ request($filter) }}">
            @endif
        @endforeach
        <div class="table-responsive">
            <table class="table table-striped table-hover align-middle">
                <thead><tr>
                    <th scope="col"><input id="selectVisibleAuditRows" class="form-check-input" type="checkbox" aria-label="Select audit entries on this page"></th>
                    <th scope="col">Time (Asia/Manila)</th><th scope="col">Actor</th><th scope="col">Account</th><th scope="col">Event</th><th scope="col">Result</th><th scope="col">IP address</th><th scope="col">Details</th>
                </tr></thead>
                <tbody>
                @forelse($entries as $entry)
                    <tr>
                        <td><input class="form-check-input audit-entry-choice" type="checkbox" name="ids[]" value="{{ $entry->id }}" aria-label="Select {{ $entry->event }} event"></td>
                        <td>{{ $entry->created_at ? Illuminate\Support\Carbon::parse($entry->created_at)->timezone('Asia/Manila')->format('Y-m-d H:i:s') : '—' }}</td>
                        <td>{{ $entry->actor_name }}</td><td>{{ $entry->user_name }}</td><td>{{ $entry->event }}</td><td>{{ $entry->outcome }}</td><td>{{ $entry->ip_address ?? '—' }}</td>
                        <td><details><summary>View changes</summary><p>Request: {{ $entry->request_id ?? '—' }}</p><p>{{ $entry->description }}</p><dl>
                            <dt>Before</dt><dd><pre>{{ json_encode(is_string($entry->old_values) ? json_decode($entry->old_values) : $entry->old_values, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) }}</pre></dd>
                            <dt>After</dt><dd><pre>{{ json_encode(is_string($entry->new_values) ? json_decode($entry->new_values) : $entry->new_values, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) }}</pre></dd>
                        </dl></details></td>
                    </tr>
                @empty
                    <tr><td colspan="8" class="text-center">No events match these filters.</td></tr>
                @endforelse
                </tbody>
            </table>
        </div>
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <p class="small text-body-secondary mb-0">Permanent deletion removes the selected audit entries from the database. It cannot be undone.</p>
            <button class="btn btn-danger" type="submit"><i class="bi bi-trash3" aria-hidden="true"></i> Permanently delete selected</button>
        </div>
    </form>
    <nav aria-label="Audit pagination" class="d-flex gap-3">
        @if($entries->previousPageUrl())<a href="{{ $entries->previousPageUrl() }}">Previous</a>@endif
        @if($entries->nextPageUrl())<a href="{{ $entries->nextPageUrl() }}">Next</a>@endif
    </nav>

    <div class="modal fade" id="auditExportModal" tabindex="-1" aria-labelledby="auditExportTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <form method="get" action="{{ route('audit.export') }}">
                    <div class="modal-header"><h2 class="modal-title fs-5" id="auditExportTitle">Export audit logs</h2><button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button></div>
                    <div class="modal-body">
                        <p>Export entries matching the filters currently applied to this page.</p>
                        <label class="form-label" for="auditExportFormat">File format</label>
                        <select id="auditExportFormat" class="form-select" name="format" required>
                            <option value="csv">CSV for Excel or spreadsheet apps</option>
                            <option value="txt">Plain text (.txt)</option>
                        </select>
                        @foreach(['user', 'event', 'category', 'from', 'to'] as $filter)
                            @if(request()->filled($filter))
                                <input type="hidden" name="{{ $filter }}" value="{{ request($filter) }}">
                            @endif
                        @endforeach
                    </div>
                    <div class="modal-footer"><button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button><button class="btn btn-success" type="submit">Download</button></div>
                </form>
            </div>
        </div>
    </div>
</main>
@endsection
