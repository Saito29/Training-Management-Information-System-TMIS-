@extends('layouts.admin')

@section('head')
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://db.onlinewebfonts.com/c/07e0cde7ae44d7e3cdc61a55fe9af110?family=Blanka" rel="stylesheet">
<link rel="stylesheet" href="{{ asset('src/css/shared/main-body.css') }}">
<link rel="stylesheet" href="{{ asset('src/css/participants/details/all-status.css') }}">
<link rel="stylesheet" href="{{ asset('src/css/shared/theme.css') }}">
<link rel="stylesheet" href="{{ asset('src/css/notification/notification.css') }}">
<link rel="stylesheet" href="{{ asset('src/css/participants/details/deleted-farmers.css?v=deleted-farmers-breadcrumb-spacing-5') }}">
<script src="{{ asset('src/js/shared/theme.js') }}" defer></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous" defer></script>
<script src="{{ asset('src/js/participants/details/deleted-farmers.js?v=purge-review-1') }}" defer></script>
<title>DA-TMIS - Deleted Farmers</title>
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
      <li class="breadcrumb-item active" aria-current="page">Deleted farmers</li>
    </ol>
  </nav>

  <header class="deleted-farmers-hero">
    <div>
      <span class="deleted-farmers-eyebrow"><i class="bi bi-people" aria-hidden="true"></i> Participant records</span>
      <h1>Deleted farmers</h1>
      <p>Review deleted farmer profiles and their scheduled permanent-deletion date. Profiles are retained for 30 days and are never purged automatically.</p>
    </div>
    <div class="deleted-farmers-page-actions">
      <a class="btn btn-outline-success" href="{{ route('admin.participants.details.all-with-status') }}"><i class="bi bi-list-ul" aria-hidden="true"></i> Farmer list</a>
      <a class="btn btn-outline-secondary" href="{{ route('admin.participants.details.inactive') }}"><i class="bi bi-person-slash" aria-hidden="true"></i> Inactive farmers</a>
    </div>
  </header>

  @if(session('operation_message'))
    <div class="alert alert-success deleted-farmers-alert" role="status"><i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>{{ session('operation_message') }}</span></div>
  @endif

  <section class="card deleted-farmers-card">
    <div class="card-header deleted-farmers-card-header">
      <div>
        <span class="deleted-farmers-eyebrow">Recovery queue</span>
        <h2>Soft-deleted farmer records</h2>
        <p>Search by name, farmer ID, or location, then review a record before restoring it.</p>
      </div>
      <div class="deleted-farmers-total" aria-label="{{ $participants->total() }} {{ \Illuminate\Support\Str::plural('deleted record', $participants->total()) }}">
        <span class="deleted-farmers-total-icon"><i class="bi bi-trash3" aria-hidden="true"></i></span>
        <span><strong>{{ $participants->total() }}</strong><small>{{ \Illuminate\Support\Str::plural('record', $participants->total()) }} found</small></span>
      </div>
    </div>

    <div class="card-body deleted-farmers-card-body">
      <form method="get" action="{{ route('admin.participants.details.trash') }}" class="deleted-farmers-filters">
        <div class="deleted-farmers-search">
          <label for="deletedFarmerSearch">Search deleted farmers</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
            <input id="deletedFarmerSearch" class="form-control" type="search" name="search" value="{{ request('search') }}" maxlength="100" placeholder="Name, farmer ID, region, or location">
          </div>
        </div>
        <div class="deleted-farmers-page-size">
          <label for="deletedFarmerPageSize">Rows per page</label>
          <select id="deletedFarmerPageSize" class="form-select" name="per_page">
            @foreach([20, 50, 100] as $pageSize)
              <option value="{{ $pageSize }}" @selected((int) request('per_page', 20) === $pageSize)>{{ $pageSize }} rows</option>
            @endforeach
          </select>
        </div>
        <div class="deleted-farmers-filter-actions">
          <button class="btn btn-success" type="submit"><i class="bi bi-search" aria-hidden="true"></i> Search</button>
          @if(request()->filled('search'))
            <a class="btn btn-outline-secondary" href="{{ route('admin.participants.details.trash') }}">Clear</a>
          @endif
        </div>
      </form>

      <div class="table-responsive deleted-farmers-table-wrap">
      <table class="table align-middle deleted-farmers-table mb-0">
        <caption class="visually-hidden">Soft-deleted farmer profiles and restoration actions</caption>
        <thead>
          <tr>
            <th scope="col">Farmer ID</th>
            <th scope="col">Name</th>
            <th scope="col">Previous status</th>
            <th scope="col">Sex</th>
            <th scope="col">Region / office</th>
            <th scope="col">Location</th>
            <th scope="col">Registered</th>
            <th scope="col">Deleted</th>
            <th scope="col">Permanent deletion</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          @forelse($participants as $participant)
            @php
              $farmerName = trim(implode(' ', array_filter([
                $participant->first_name,
                $participant->middle_name,
                $participant->last_name,
                $participant->suffix,
              ]))) ?: $participant->name;
              $farmerNumber = \App\Support\OriginalInterfaceData::farmerNumber($participant);
              $status = $participant->record_status_name ?: ($participant->is_active ? 'Active' : 'Inactive');
              $location = collect([$participant->province, $participant->municipality, $participant->barangay])->filter()->implode(', ');
              $office = collect([$participant->region_name, $participant->office_name])->filter()->implode(' / ');
            @endphp
            <tr>
              <td><span class="deleted-farmers-id">{{ $farmerNumber }}</span></td>
              <td><span class="deleted-farmers-name">{{ $farmerName }}</span></td>
              <td><span class="deleted-farmers-status">{{ $status }}</span></td>
              <td>{{ $participant->sex ?: 'Not recorded' }}</td>
              <td>{{ $office ?: 'Not recorded' }}</td>
              <td>{{ $location ?: 'Not recorded' }}</td>
              <td>
                <span class="deleted-farmers-date">{{ $participant->created_at ? \Illuminate\Support\Carbon::parse($participant->created_at)->timezone('Asia/Manila')->format('M j, Y') : 'Not recorded' }}</span>
                @if($participant->created_at)
                  <small class="deleted-farmers-time">{{ \Illuminate\Support\Carbon::parse($participant->created_at)->timezone('Asia/Manila')->format('g:i A') }}</small>
                @endif
              </td>
              <td>
                <span class="deleted-farmers-date">{{ $participant->deleted_at ? \Illuminate\Support\Carbon::parse($participant->deleted_at)->timezone('Asia/Manila')->format('M j, Y') : 'Not recorded' }}</span>
                @if($participant->deleted_at)
                  <small class="deleted-farmers-time">{{ \Illuminate\Support\Carbon::parse($participant->deleted_at)->timezone('Asia/Manila')->format('g:i A') }}</small>
                @endif
              </td>
              <td>
                @if($participant->permanent_deletion_at)
                  @php($deletionDeadline = \Illuminate\Support\Carbon::parse($participant->permanent_deletion_at))
                  <span class="deleted-farmers-date">{{ $deletionDeadline->copy()->timezone('Asia/Manila')->format('M j, Y') }}</span>
                  <small class="deleted-farmers-time">{{ $deletionDeadline->copy()->timezone('Asia/Manila')->format('g:i A') }}</small>
                  @if($deletionDeadline->lte(now()))
                    <span class="deleted-farmers-deadline-badge is-due">Ready for admin review</span>
                  @else
                    <span class="deleted-farmers-deadline-badge">Manual review after retention</span>
                  @endif
                @else
                  <span class="deleted-farmers-deadline-badge is-missing">Not scheduled</span>
                @endif
              </td>
              <td class="deleted-farmers-row-actions">
                <div class="deleted-farmers-row-actions-inner">
                  <a
                    class="btn btn-sm btn-outline-primary deleted-farmers-view"
                    href="{{ route('admin.participants.id.view-farmer', ['id' => $farmerNumber]) }}"
                    aria-label="View deleted farmer {{ $farmerName }}"
                  >
                    <i class="bi bi-eye" aria-hidden="true"></i> View
                  </a>
                  @if($canRestore)
                    <button
                      class="btn btn-sm btn-outline-success deleted-farmers-restore"
                      type="button"
                      data-restore-farmer
                      data-restore-url="{{ route('ui.participants.trash.restore', ['participant' => $participant->ui_id ?: $participant->id]) }}"
                      data-farmer-number="{{ $farmerNumber }}"
                      data-farmer-name="{{ $farmerName }}"
                      data-farmer-status="{{ $status }}"
                      data-farmer-sex="{{ $participant->sex ?: 'Not recorded' }}"
                      data-farmer-office="{{ $office ?: 'Not recorded' }}"
                      data-farmer-location="{{ $location ?: 'Not recorded' }}"
                      data-deleted-at="{{ $participant->deleted_at ? \Illuminate\Support\Carbon::parse($participant->deleted_at)->timezone('Asia/Manila')->format('M j, Y g:i A') : 'Not recorded' }}"
                      data-deletion-deadline="{{ $participant->permanent_deletion_at ? \Illuminate\Support\Carbon::parse($participant->permanent_deletion_at)->timezone('Asia/Manila')->format('M j, Y g:i A') : 'Not scheduled' }}"
                      aria-haspopup="dialog"
                    >
                      <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Restore
                    </button>
                  @endif
                </div>
              </td>
            </tr>
          @empty
            <tr>
              <td class="deleted-farmers-empty-cell" colspan="10">
                <div class="deleted-farmers-empty">
                  <span class="deleted-farmers-empty-icon"><i class="bi bi-trash3" aria-hidden="true"></i></span>
                  <h3>{{ request()->filled('search') ? 'No matching records' : 'No deleted farmers yet' }}</h3>
                  <p>{{ request()->filled('search') ? 'Try another name, farmer ID, or location.' : 'Soft-deleted farmer profiles will appear here for review and recovery.' }}</p>
                  @if(request()->filled('search'))
                    <a class="btn btn-outline-secondary btn-sm" href="{{ route('admin.participants.details.trash') }}">Clear search</a>
                  @endif
                </div>
              </td>
            </tr>
          @endforelse
        </tbody>
      </table>
      </div>
    </div>
    @if($participants->hasPages())
      <div class="card-footer deleted-farmers-card-footer">{{ $participants->links() }}</div>
    @endif
  </section>
  </div>

  @if($canRestore)
    <dialog id="restoreDeletedFarmerDialog" class="compose-dialog" aria-labelledby="restoreDeletedFarmerTitle" aria-describedby="restoreDeletedFarmerDescription">
      <header>
        <span class="compose-section-icon"><i class="bi bi-person-check" aria-hidden="true"></i></span>
        <div><span class="compose-eyebrow">RESTORE FARMER PROFILE</span><h2 id="restoreDeletedFarmerTitle">Restore this farmer?</h2></div>
        <button type="button" class="compose-close" data-close-restore-dialog aria-label="Close dialog"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
      </header>
      <div class="compose-dialog-body">
        <p id="restoreDeletedFarmerDescription">The profile will be restored as inactive. An administrator can activate it later from the farmer list.</p>
        <dl>
          <div><dt>Farmer ID</dt><dd id="restoreFarmerNumber"></dd></div>
          <div><dt>Name</dt><dd id="restoreFarmerName"></dd></div>
          <div><dt>Status before deletion</dt><dd id="restoreFarmerStatus"></dd></div>
          <div><dt>Sex</dt><dd id="restoreFarmerSex"></dd></div>
          <div><dt>Region / office</dt><dd id="restoreFarmerOffice"></dd></div>
          <div><dt>Location</dt><dd id="restoreFarmerLocation"></dd></div>
          <div><dt>Deleted</dt><dd id="restoreFarmerDeletedAt"></dd></div>
          <div><dt>Permanent deletion</dt><dd id="restoreFarmerDeletionDeadline"></dd></div>
        </dl>
      </div>
      <form id="restoreDeletedFarmerForm" method="post" action="">
        @csrf
        @method('PATCH')
      </form>
      <footer>
        <button type="button" class="btn compose-secondary" data-close-restore-dialog>Cancel</button>
        <button type="submit" form="restoreDeletedFarmerForm" class="btn compose-primary">Restore as inactive</button>
      </footer>
    </dialog>
  @endif
    </div>
  </main>
</div>
@endsection
