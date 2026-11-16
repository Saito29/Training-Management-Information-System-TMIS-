@extends('layouts.admin')

@section('head')
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="{{ asset('src/css/shared/main-body.css') }}">
<link rel="stylesheet" href="{{ asset('src/css/participants/details/all-status.css') }}">
<link rel="stylesheet" href="{{ asset('src/css/shared/theme.css') }}">
<link rel="stylesheet" href="{{ asset('src/css/participants/details/deleted-farmers.css?v=farmer-table-details-1') }}">
<title>DA-TMIS - Permanently Deleted Farmers</title>
@endsection

@section('content')
<div class="app-wrapper">
  @include('admin.operation-navigation')
  <main class="app-main deleted-farmers-page">
    <div class="app-main-body container-fluid px-3 px-md-4">
      <div class="deleted-farmers-content">
        <nav aria-label="Breadcrumb" class="deleted-farmers-breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="{{ route('admin.dashboard.dashboard') }}">Dashboard</a></li>
            <li class="breadcrumb-item">Participants</li>
            <li class="breadcrumb-item"><a href="{{ route('admin.participants.details.trash') }}">Deleted farmers</a></li>
            <li class="breadcrumb-item active" aria-current="page">Permanently deleted</li>
          </ol>
        </nav>

        <header class="deleted-farmers-hero">
          <div>
            <span class="deleted-farmers-eyebrow"><i class="bi bi-trash3-fill" aria-hidden="true"></i> Participant records</span>
            <h1>Permanently deleted farmers</h1>
            <p>Audit history for farmer profiles that were permanently removed. Personal profile details are not retained after deletion.</p>
          </div>
          <div class="deleted-farmers-page-actions">
            <a class="btn btn-outline-success" href="{{ route('admin.participants.details.trash') }}"><i class="bi bi-arrow-return-left" aria-hidden="true"></i> Deleted farmers</a>
          </div>
        </header>

        <section class="card deleted-farmers-card">
          <div class="card-header deleted-farmers-card-header">
            <div>
              <span class="deleted-farmers-eyebrow">Permanent deletion audit</span>
              <h2>Deletion history</h2>
              <p>Only successful permanent deletion events are listed here.</p>
            </div>
            <div class="deleted-farmers-total" aria-label="{{ $records->total() }} permanent deletion records">
              <span class="deleted-farmers-total-icon"><i class="bi bi-shield-check" aria-hidden="true"></i></span>
              <span><strong>{{ $records->total() }}</strong><small>{{ \Illuminate\Support\Str::plural('record', $records->total()) }} found</small></span>
            </div>
          </div>
          <div class="card-body deleted-farmers-card-body">
            <form method="get" action="{{ route('admin.participants.details.trash.permanently-deleted') }}" class="deleted-farmers-filters">
              <div class="deleted-farmers-search">
                <label for="permanentlyDeletedSearch">Search audit history</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
                  <input id="permanentlyDeletedSearch" class="form-control" type="search" name="search" value="{{ request('search') }}" maxlength="100" placeholder="Farmer ID, administrator, or reference">
                </div>
              </div>
              <div class="deleted-farmers-page-size">
                <label for="permanentlyDeletedPageSize">Rows per page</label>
                <select id="permanentlyDeletedPageSize" class="form-select" name="per_page" onchange="this.form.requestSubmit()">
                  @foreach([20, 50, 100] as $pageSize)
                    <option value="{{ $pageSize }}" @selected((int) request('per_page', 20) === $pageSize)>{{ $pageSize }} rows</option>
                  @endforeach
                </select>
              </div>
              <div class="deleted-farmers-filter-actions">
                <button class="btn btn-success" type="submit"><i class="bi bi-search" aria-hidden="true"></i> Search</button>
                <a class="btn btn-outline-secondary" href="{{ route('admin.participants.details.trash.permanently-deleted') }}"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset</a>
              </div>
            </form>

            <div class="deleted-farmers-table-wrap">
              <div class="deleted-farmers-table-meta"><span>Showing {{ $records->firstItem() ?? 0 }}–{{ $records->lastItem() ?? 0 }} of {{ $records->total() }} permanent deletions</span></div>
              <div class="table-responsive">
                <table class="table review-data-table deleted-farmers-table permanently-deleted-farmers-table">
                  <thead><tr>
                    <th scope="col">Farmer ID</th>
                    <th scope="col">Deletion status</th>
                    <th scope="col">Deleted by</th>
                    <th scope="col">Deleted at</th>
                    <th scope="col">System reference</th>
                  </tr></thead>
                  <tbody>
                    @forelse($records as $record)
                      <tr>
                        <td><strong>{{ $record->farmer_number }}</strong></td>
                        <td><span class="badge text-bg-secondary">Permanently deleted</span></td>
                        <td>{{ $record->deleted_by }}</td>
                        <td>{{ \Illuminate\Support\Carbon::parse($record->created_at)->timezone('Asia/Manila')->format('M j, Y · g:i A') }}</td>
                        <td><code>{{ $record->reference }}</code></td>
                      </tr>
                    @empty
                      <tr><td colspan="5" class="deleted-farmers-empty"><i class="bi bi-inbox" aria-hidden="true"></i><strong>No permanently deleted farmer records</strong><span>Successful permanent deletions will appear here as audit entries.</span></td></tr>
                    @endforelse
                  </tbody>
                </table>
              </div>
              @if($records->hasPages())
                <div class="deleted-farmers-pagination">{{ $records->links() }}</div>
              @endif
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</div>
@endsection
