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
<link rel="stylesheet" href="{{ asset('src/css/participants/details/deleted-farmers.css?v=farmer-table-details-2') }}">
<script src="{{ asset('src/js/shared/theme.js') }}" defer></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous" defer></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" defer></script>
<script src="{{ asset('src/js/participants/details/deleted-farmers.js?v=farmer-table-details-1') }}" defer></script>
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
      @if($canRestore)<a class="btn btn-outline-dark" href="{{ route('admin.participants.details.trash.permanently-deleted') }}"><i class="bi bi-trash3-fill" aria-hidden="true"></i> Permanently deleted</a>@endif
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
      <form id="deletedFarmersFilters" method="get" action="{{ route('admin.participants.details.trash') }}" class="deleted-farmers-filters">
        <input type="hidden" name="sort" value="{{ request('sort', 'deleted_at') }}">
        <input type="hidden" name="direction" value="{{ request('direction', 'desc') }}">
        <div class="deleted-farmers-search">
          <label for="deletedFarmerSearch">Search deleted farmers</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
            <input id="deletedFarmerSearch" class="form-control" type="search" name="search" value="{{ request('search') }}" maxlength="100" placeholder="Name, farmer ID, region, or location">
          </div>
        </div>
        <div><label for="deletedFarmerYear">Year registered</label><select id="deletedFarmerYear" class="form-select" name="year"><option value="">All years</option>@foreach($filterOptions['years'] as $year)<option value="{{ $year }}" @selected((string) request('year') === (string) $year)>{{ $year }}</option>@endforeach</select></div>
        <div><label for="deletedFarmerRegion">Region</label><select id="deletedFarmerRegion" class="form-select" name="region_id"><option value="">All regions</option>@foreach($filterOptions['regions'] as $region)<option value="{{ $region->region_id }}" @selected((string) request('region_id') === (string) $region->region_id)>{{ $region->name }}</option>@endforeach</select></div>
        <div><label for="deletedFarmerProvince">Province</label><select id="deletedFarmerProvince" class="form-select" name="province"><option value="">All provinces</option>@foreach($filterOptions['provinces'] as $province)<option value="{{ $province }}" @selected(request('province') === $province)>{{ $province }}</option>@endforeach</select></div>
        <div><label for="deletedFarmerDistrict">District</label><select id="deletedFarmerDistrict" class="form-select" name="district"><option value="">All districts</option>@foreach($filterOptions['districts'] as $district)<option value="{{ $district }}" @selected(request('district') === $district)>{{ $district }}</option>@endforeach</select></div>
        <div><label for="deletedFarmerMunicipality">Municipality / City</label><select id="deletedFarmerMunicipality" class="form-select" name="municipality"><option value="">All municipalities</option>@foreach($filterOptions['municipalities'] as $municipality)<option value="{{ $municipality }}" @selected(request('municipality') === $municipality)>{{ $municipality }}</option>@endforeach</select></div>
        <div><label for="deletedFarmerBarangay">Barangay</label><select id="deletedFarmerBarangay" class="form-select" name="barangay"><option value="">All barangays</option>@foreach($filterOptions['barangays'] as $barangay)<option value="{{ $barangay }}" @selected(request('barangay') === $barangay)>{{ $barangay }}</option>@endforeach</select></div>
        <div><label for="deletedFarmerOffice">Organization / office</label><select id="deletedFarmerOffice" class="form-select" name="org_id"><option value="">All organizations</option>@foreach($filterOptions['offices'] as $office)<option value="{{ $office->org_id }}" @selected((string) request('org_id') === (string) $office->org_id)>{{ $office->name }}</option>@endforeach</select></div>
        <div class="deleted-farmers-page-size">
          <label for="deletedFarmerPageSize">Rows per page</label>
          <select id="deletedFarmerPageSize" class="form-select" name="per_page">
            @foreach([20, 50, 100] as $pageSize)
              <option value="{{ $pageSize }}" @selected((int) request('per_page', 20) === $pageSize)>{{ $pageSize }} rows</option>
            @endforeach
          </select>
        </div>
        <div class="deleted-farmers-filter-actions">
          <button class="btn btn-success" type="submit"><i class="bi bi-search" aria-hidden="true"></i> Apply</button>
          <a class="btn btn-outline-secondary" href="{{ route('admin.participants.details.trash') }}"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset</a>
          <button class="btn btn-outline-secondary" type="button" id="refreshDeletedFarmers"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh</button>
          <button class="btn btn-outline-success" type="button" id="exportDeletedFarmers" data-export-url="{{ route('admin.participants.details.trash.export') }}"><i class="bi bi-file-earmark-excel" aria-hidden="true"></i> Export Excel</button>
        </div>
      </form>
      <div class="deleted-farmers-table-summary" role="status">Showing {{ $participants->firstItem() ?? 0 }}–{{ $participants->lastItem() ?? 0 }} of {{ $participants->total() }} deleted farmers</div>

      @php
        $currentTrashSort = (string) request('sort', 'deleted_at');
        $currentTrashDirection = (string) request('direction', 'desc');
        $trashSortUrl = static fn (string $key): string => route('admin.participants.details.trash', array_merge(request()->except('page'), [
            'sort' => $key,
            'direction' => $currentTrashSort === $key && $currentTrashDirection === 'asc' ? 'desc' : 'asc',
        ]));
      @endphp
      @if($participants->hasPages())
        <div class="deleted-farmers-pagination-top">{{ $participants->links() }}</div>
      @endif
      <div class="table-responsive deleted-farmers-table-wrap">
      <table class="table align-middle deleted-farmers-table mb-0">
        <caption class="visually-hidden">Soft-deleted farmer profiles and restoration actions</caption>
        <thead>
          <tr>
            <th scope="col">Actions</th>
            <th scope="col"><a href="{{ $trashSortUrl('farmerNumber') }}">Farmer ID <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('year') }}">Year registered <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('last_name') }}">Last name <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('first_name') }}">First name <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('middle_name') }}">Middle name <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('status') }}">Previous status <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('region_name') }}">Region <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('province') }}">Province <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('district') }}">District <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('municipality') }}">Municipality / City <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('barangay') }}">Barangay <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('office_name') }}">Office <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col">Farmer Organization</th>
            <th scope="col">Farmer Role</th>
            <th scope="col">Sex</th>
            <th scope="col">Date of Birth</th>
            <th scope="col"><a href="{{ $trashSortUrl('created_at') }}">Registered <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('deleted_at') }}">Deleted <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
            <th scope="col"><a href="{{ $trashSortUrl('permanent_deletion_at') }}">Permanent deletion <i class="bi bi-arrow-down-up" aria-hidden="true"></i></a></th>
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
              <td class="deleted-farmers-row-actions"><div class="deleted-farmers-row-actions-inner">
                <a class="btn btn-sm btn-outline-primary deleted-farmers-view" href="{{ route('admin.participants.id.view-farmer', ['id' => $farmerNumber]) }}" aria-label="View deleted farmer {{ $farmerName }}"><i class="bi bi-eye" aria-hidden="true"></i></a>
                @if($canRestore)<button class="btn btn-sm btn-outline-success deleted-farmers-restore" type="button" data-restore-farmer data-restore-url="{{ route('ui.participants.trash.restore', ['participant' => $participant->ui_id ?: $participant->id]) }}" data-farmer-number="{{ $farmerNumber }}" data-farmer-name="{{ $farmerName }}" data-farmer-status="{{ $status }}" data-farmer-sex="{{ $participant->sex ?: 'Not recorded' }}" data-farmer-office="{{ $office ?: 'Not recorded' }}" data-farmer-location="{{ $location ?: 'Not recorded' }}" data-deleted-at="{{ $participant->deleted_at ? \Illuminate\Support\Carbon::parse($participant->deleted_at)->timezone('Asia/Manila')->format('M j, Y g:i A') : 'Not recorded' }}" data-deletion-deadline="{{ $participant->permanent_deletion_at ? \Illuminate\Support\Carbon::parse($participant->permanent_deletion_at)->timezone('Asia/Manila')->format('M j, Y g:i A') : 'Not scheduled' }}" aria-haspopup="dialog" aria-label="Restore {{ $farmerName }}"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>@endif
              </div></td>
              <td><span class="deleted-farmers-id">{{ $participant->farmer_number }}</span></td>
              <td>{{ $participant->registration_year }}</td>
              <td>{{ $participant->last_name ?: 'Not recorded' }}</td>
              <td>{{ $participant->first_name ?: 'Not recorded' }}</td>
              <td>{{ $participant->middle_name ?: 'Not recorded' }}</td>
              <td><span class="deleted-farmers-status">{{ $status }}</span></td>
              <td>{{ $participant->region_name ?: 'Not recorded' }}</td>
              <td>{{ $participant->province ?: 'Not recorded' }}</td>
              <td>{{ $participant->district ?: 'Not recorded' }}</td>
              <td>{{ $participant->municipality ?: 'Not recorded' }}</td>
              <td>{{ $participant->barangay ?: 'Not recorded' }}</td>
              <td>{{ $participant->office_name ?: 'Not recorded' }}</td>
              <td>{{ $participant->farmer_organization ?: 'Not recorded' }}</td>
              <td>{{ $participant->farmer_role ?: 'Not recorded' }}</td>
              <td>{{ $participant->sex ?: 'Not recorded' }}</td>
              <td>{{ $participant->date_of_birth ?: 'Not recorded' }}</td>
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
            </tr>
          @empty
            <tr>
              <td class="deleted-farmers-empty-cell" colspan="20">
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
