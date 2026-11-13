@extends('layouts.admin')



@section('body-attributes')

class="layout-fixed"

@endsection



@section('head')
<script src="{{ asset('src/js/shared/operations.js') }}" defer></script>

<meta charset="UTF-8" />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <script src="{{ asset('src/js/shared/page-loading.js') }}"></script>

    <link

      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"

      rel="stylesheet"

      integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"

      crossorigin="anonymous"

    />

    <link

      rel="stylesheet"

      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"

    />

    <link rel="preconnect" href="https://fonts.googleapis.com" />

    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <link

      href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"

      rel="stylesheet"

    />

    <link

      href="https://db.onlinewebfonts.com/c/07e0cde7ae44d7e3cdc61a55fe9af110?family=Blanka"

      rel="stylesheet"

    />

    <!-- Box icons -->

    <!-- Basic Icons -->

    <link

      href="https://cdn.boxicons.com/3.0.8/fonts/basic/boxicons.min.css"

      rel="stylesheet"

    />

    <!-- Filled Icons -->

    <link

      href="https://cdn.boxicons.com/3.0.8/fonts/filled/boxicons-filled.min.css"

      rel="stylesheet"

    />

    <!-- Brand Icons -->

    <link

      href="https://cdn.boxicons.com/3.0.8/fonts/brands/boxicons-brands.min.css"

      rel="stylesheet"

    />

    <!-- AdminLTE 4 Template -->

    <link

      rel="stylesheet"

      href="https://cdn.jsdelivr.net/npm/overlayscrollbars@2.11.0/styles/overlayscrollbars.min.css"

    />

    <link

      rel="stylesheet"

      href="https://cdn.jsdelivr.net/npm/admin-lte@4.8.4/dist/css/adminlte.min.css"

    />

    <link rel="stylesheet" href="{{ asset('src/css/shared/main-body.css?v=notification-details-theme-1') }}" />

    <link
      rel="stylesheet"
      href="{{ asset('src/css/administration/details/all-status.css') }}"
    />

    <link rel="stylesheet" href="{{ asset('src/css/shared/account-management.css?v=deleted-account-directory-1') }}" />

    <link rel="stylesheet" href="{{ asset('src/css/shared/theme.css') }}" />

    <script src="{{ asset('src/js/shared/theme.js') }}" defer></script>

    <title>TMIS - Deleted accounts</title>

    <link rel="stylesheet" href="{{ asset('src/css/shared/table-loading.css') }}" />

    <script src="{{ asset('src/js/shared/table-loading.js') }}" defer></script>

    <!-- Backend integration disabled for now. Uncomment when ready.



-->

      <script type="module" src="{{ asset('src/js/shared/activity-log.js') }}"></script>

  <link rel="stylesheet" href="{{ asset('src/css/shared/toast.css') }}">

    <script src="{{ asset('src/js/shared/toast.js') }}" defer></script>

@endsection



@section('content')

<div class="app-wrapper">

      @include('admin.operation-navigation')



      <!-- Main Body page  -->

      <main class="app-main">
        <div class="container-fluid py-4 account-management-page deleted-accounts-page">
          <header class="account-page-header">
            <div>
              <span class="account-page-eyebrow">ACCOUNT RECOVERY</span>
              <nav aria-label="Breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item">Administration</li><li class="breadcrumb-item">Details</li><li class="breadcrumb-item active" aria-current="page">Deleted accounts</li></ol></nav>
              <h1>Deleted accounts</h1>
              <p>Review retained accounts, view or edit their details, and restore them as inactive. Restoring an account does not restore sign-in access.</p>
            </div>
          </header>
          @include('admin.operation-feedback')
          <form method="get" class="account-filter-card">
            <div class="account-filter-grid deleted-account-filter-grid">
              <label for="deletedAccountSearch">Search accounts
                <input id="deletedAccountSearch" name="search" value="{{ request('search') }}" class="form-control" placeholder="Name or email" type="search">
              </label>
              <label for="deletedAccountPageSize">Rows per page
                <select id="deletedAccountPageSize" name="per_page" class="form-select">
                  @foreach([10, 25, 50, 100] as $pageSize)
                    <option value="{{ $pageSize }}" @selected((int) ($accountFilters['per_page'] ?? 10) === $pageSize)>{{ $pageSize }}</option>
                  @endforeach
                </select>
              </label>
              <div class="account-filter-actions">
                <button class="btn btn-success" type="submit"><i class="bi bi-funnel" aria-hidden="true"></i> Apply</button>
                @if(request()->has('search') || request()->has('per_page'))
                  <a class="btn btn-outline-secondary" href="{{ route('admin.administration.details.trash') }}"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Clear</a>
                @endif
              </div>
            </div>
          </form>
          <section class="account-table-card" aria-labelledby="deletedAccountsTableTitle">
            <div class="account-table-heading">
              <div>
                <h2 id="deletedAccountsTableTitle">Deleted accounts</h2>
                <p>{{ $accounts->total() }} matching {{ $accounts->total() === 1 ? 'account' : 'accounts' }}</p>
              </div>
              <span class="account-table-page">Page {{ $accounts->currentPage() }} of {{ max(1, $accounts->lastPage()) }}</span>
            </div>
            <div class="account-table-scroll">
              @if($accounts->isEmpty())
                <div class="account-empty deleted-account-empty" role="status">
                  <i class="bi bi-person-x" aria-hidden="true"></i>
                  <strong>No deleted accounts found</strong>
                  <span>@if(request('search'))Try a different name or email address.@elseDeleted accounts will appear here when available.@endif</span>
                </div>
              @else
                <table class="table align-middle mb-0 account-table deleted-account-table">
                  <caption class="visually-hidden">Actions, ID, identity, role and access profile, office, status, and dates for deleted accounts</caption>
                  <thead>
                    <tr>
                      <th scope="col">Actions</th>
                      <th scope="col">ID</th>
                      <th scope="col">Account</th>
                      <th scope="col">Role &amp; profile</th>
                      <th scope="col">Region</th>
                      <th scope="col">Office</th>
                      <th scope="col">Status</th>
                      <th scope="col">Deleted on</th>
                      <th scope="col">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    @foreach($accounts as $account)
                      @php
                        $isProtectedAdministrator = ($account->role_name ?? '') === 'System Administrator';
                        $fullName = trim($account->first_name.' '.$account->middle_name.' '.$account->last_name.' '.$account->extension_name);
                        $deletedAt = \Illuminate\Support\Carbon::parse($account->deleted_at)->timezone('Asia/Manila');
                        $registeredAt = $account->is_created_at
                            ? \Illuminate\Support\Carbon::parse($account->is_created_at)->timezone('Asia/Manila')
                            : null;
                      @endphp
                      <tr>
                        <td>
                          <div class="deleted-account-actions">
                            @if($canViewAccountProfiles)
                              <a class="btn btn-sm btn-outline-primary account-manage-button" href="{{ route('admin.administration.id.view-user', ['user_id' => $account->user_id]) }}" aria-label="View {{ $fullName }}"><i class="bi bi-eye" aria-hidden="true"></i><span>View</span></a>
                            @endif
                            @if($canEditAccountProfiles && ! $isProtectedAdministrator)
                              <a class="btn btn-sm btn-outline-secondary account-manage-button" href="{{ route('admin.administration.id.edit-user', ['user_id' => $account->user_id]) }}" aria-label="Edit {{ $fullName }}"><i class="bi bi-pencil-square" aria-hidden="true"></i><span>Edit</span></a>
                            @endif
                            @if($canEditAccounts && ! $isProtectedAdministrator)
                              <button class="btn btn-sm btn-success account-manage-button" type="button" data-bs-toggle="modal" data-bs-target="#restoreAccountModal" data-restore-url="{{ route('system.accounts.update', $account->user_id) }}" data-user-id="{{ $account->user_id }}" data-name="{{ $fullName }}" data-email="{{ $account->email }}" data-role="{{ $account->role_name ?? 'Role not assigned' }}" data-credential="{{ $account->credential_name ?? 'Base role only' }}" data-region="{{ $account->region_name ?? 'Region not assigned' }}" data-office="{{ $account->office_name ?? 'Office not assigned' }}" data-status="{{ $account->status ?? 'Not specified' }}" data-deleted-at="{{ $deletedAt->format('M j, Y g:i A') }}" data-registered-at="{{ $registeredAt ? $registeredAt->format('M j, Y g:i A') : 'Not recorded' }}"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i><span>Restore</span></button>
                            @endif
                          </div>
                        </td>
                        <td class="account-directory-id">{{ $account->user_id }}</td>
                        <td class="account-table-identity-cell">
                          <div class="account-identity">
                            <span class="account-avatar"><i class="bi bi-person" aria-hidden="true"></i></span>
                            <div><strong>{{ $fullName }}</strong><small>{{ $account->email }}</small></div>
                          </div>
                        </td>
                        <td class="account-table-role"><strong>{{ $account->role_name ?? 'Role not assigned' }}</strong><small>{{ $account->credential_name ?? 'Role permissions only' }}</small></td>
                        <td class="account-directory-location">{{ $account->region_name ?? 'Region not assigned' }}</td>
                        <td class="account-directory-office">{{ $account->office_name ?? 'Office not assigned' }}</td>
                        <td class="account-status-cell">
                          <span class="account-status">{{ $account->status ?? 'Not specified' }}</span>
                          <span class="account-state is-trashed"><i aria-hidden="true"></i>Deleted</span>
                        </td>
                        <td><time class="account-registered" datetime="{{ $deletedAt->toIso8601String() }}">{{ $deletedAt->format('M j, Y') }}</time><small class="account-registered-time">{{ $deletedAt->format('g:i A') }} Manila time</small></td>
                        <td>
                          @if($registeredAt)
                            <time class="account-registered" datetime="{{ $registeredAt->toIso8601String() }}">{{ $registeredAt->format('M j, Y') }}</time>
                            <small class="account-registered-time">{{ $registeredAt->format('g:i A') }} Manila time</small>
                          @else
                            <span class="account-registered">Not recorded</span>
                          @endif
                        </td>
                      </tr>
                    @endforeach
                  </tbody>
                </table>
              @endif
            </div>
            @unless($accounts->isEmpty())
              <footer class="account-pagination">
                <span>Showing {{ $accounts->firstItem() }}–{{ $accounts->lastItem() }} of {{ $accounts->total() }} accounts</span>
                <nav aria-label="Deleted account pagination">
                  <a class="btn btn-sm btn-outline-secondary {{ $accounts->onFirstPage() ? 'disabled' : '' }}" href="{{ $accounts->previousPageUrl() ?? '#' }}" @if($accounts->onFirstPage()) aria-disabled="true" tabindex="-1" @endif>Previous</a>
                  @for($page = max(1, $accounts->currentPage() - 2); $page <= min($accounts->lastPage(), $accounts->currentPage() + 2); $page++)
                    <a class="btn btn-sm {{ $page === $accounts->currentPage() ? 'btn-success' : 'btn-outline-secondary' }}" href="{{ $accounts->url($page) }}" @if($page === $accounts->currentPage()) aria-current="page" @endif>{{ $page }}</a>
                  @endfor
                  <a class="btn btn-sm btn-outline-secondary {{ $accounts->hasMorePages() ? '' : 'disabled' }}" href="{{ $accounts->nextPageUrl() ?? '#' }}" @unless($accounts->hasMorePages()) aria-disabled="true" tabindex="-1" @endunless>Next</a>
                </nav>
              </footer>
            @endunless
          </section>
        </div>
      </main>

    </div>

    <div class="modal fade account-modal account-delete-modal" id="restoreAccountModal" tabindex="-1" aria-labelledby="restoreAccountTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <div class="account-modal-heading"><span class="account-modal-icon"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></span><div><span class="account-modal-kicker">RESTORE ACCOUNT</span><h2 class="modal-title" id="restoreAccountTitle">Restore this account?</h2></div></div>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close restore confirmation"></button>
          </div>
          <div class="modal-body">
            <p class="account-modal-intro">Review the account details before restoring. This clears the deleted marker but keeps the account inactive.</p>
            <section class="account-delete-summary" aria-labelledby="restoreSummaryTitle"><h3 id="restoreSummaryTitle">Account details</h3><dl id="restoreAccountDetails" class="account-details"></dl></section>
            <aside class="account-modal-note account-note-warning"><i class="bi bi-shield-lock" aria-hidden="true"></i><div><strong>Sign-in remains disabled</strong><p>The account will be restored as inactive. Reactivation and approval remain subject to the existing account permissions.</p></div></aside>
          </div>
          <div class="modal-footer">
            <span class="account-footer-hint"><i class="bi bi-info-circle" aria-hidden="true"></i> Restoring does not remove existing audit history.</span>
            <div class="account-modal-actions"><button class="btn account-btn-neutral" type="button" data-bs-dismiss="modal">Cancel</button><form id="restoreAccountForm" method="post">@csrf @method('PATCH')<input type="hidden" name="action" value="restore"><button class="btn btn-success" type="submit"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Restore inactive</button></form></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification detail modal -->

    <div

      class="modal fade"

      id="notificationDetailModal"

      aria-labelledby="notificationDetailModalLabel"

      aria-hidden="true"

    >

      <div

        class="modal-dialog modal-dialog-centered modal-dialog-scrollable notification-detail-dialog"

      >

        <div class="modal-content notification-detail-modal">

          <div class="modal-header notification-detail-header">

            <span class="notification-detail-icon"

              ><i class="bi bi-bell-fill"></i

            ></span>

            <button

              type="button"

              class="btn btn-modal"

              data-bs-dismiss="modal"

              aria-label="Close"

            >

              <i class="bi bi-x-octagon"></i>

            </button>

          </div>

          <div class="modal-body notification-detail-body">

            <div class="notification-detail-meta">

              <span id="notificationDetailType">Approval required</span>

              <time id="notificationDetailTime">Today, 9:20 PM</time>

            </div>

            <h5 id="notificationDetailModalLabel">

              Training proposal review needed

            </h5>

            <p id="notificationDetailDescription"></p>

          </div>

          <div class="modal-footer notification-detail-footer">

            <button

              type="button"

              class="btn notification-detail-dismiss"

              data-bs-dismiss="modal"

            >

              Close

            </button>

            <button

              type="button"

              class="btn notification-detail-action"

              id="notificationDetailAction"

            >

              Review proposal

            </button>

          </div>

        </div>

      </div>

    </div>



<div class="toast-container account-toast-region position-fixed end-0 p-3">

  <div id="reviewToast" class="toast account-toast" role="status" aria-live="polite" aria-atomic="true" data-type="success">

    <div class="account-toast-layout">

      <span class="account-toast-symbol" aria-hidden="true"><i id="reviewToastIcon" class="bi bi-check-circle-fill"></i></span>

      <div class="account-toast-content"><div class="account-toast-heading"><strong id="reviewToastTitle">Success</strong><small>Just now</small></div><p id="reviewToastMessage">Account updated successfully.</p></div>

      <button type="button" class="account-toast-close" data-bs-dismiss="toast" aria-label="Dismiss notification"><i class="bi bi-x-lg" aria-hidden="true"></i></button>

    </div>

  </div>

</div>



    <!-- Scripts -->

    <script

      src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"

      integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI"

      crossorigin="anonymous"

    ></script>



    <!-- AdminLTE 4 Template -->

    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/overlayscrollbars@2.11.0/browser/overlayscrollbars.browser.es6.min.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/admin-lte@4.8.4/dist/js/adminlte.min.js"></script>

    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>



    <!-- nav -->

    <script src="{{ asset('src/js/shared/nav.js?v=admin-account-visibility-inline-1') }}"></script>
    <script src="{{ asset('src/js/administration/details/deleted-accounts.js') }}"></script>

    <script src="{{ asset('src/js/shared/navigation-state.js') }}"></script>

@endsection
