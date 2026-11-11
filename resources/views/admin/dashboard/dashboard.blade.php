@extends('layouts.admin')

@section('body-attributes')
class="layout-fixed"
@endsection

@section('head')
<link rel="stylesheet" href="{{ asset('src/css/dashboard/database-dashboard.css') }}">
<script src="{{ asset('src/js/dashboard/database-dashboard.js') }}" defer></script>
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
    <link
      rel="shortcut icon"
      href="{{ asset('assets/logo/Child Logo DA-SAAD/with DA [White Text].png') }}"
      type="image/x-icon"
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
    <!-- DataTables css -->
    <link
      rel="stylesheet"
      href="https://cdn.datatables.net/2.3.5/css/dataTables.dataTables.min.css"
    />
    <link
      rel="stylesheet"
      href="https://cdn.datatables.net/buttons/3.2.5/css/buttons.dataTables.min.css"
    />
    <link rel="stylesheet" href="{{ asset('src/css/shared/main-body.css?v=notification-details-theme-1') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/dashboard/app.css?v=dashboard-tooltip-report-layout-3') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/shared/theme.css') }}" />
    <script src="{{ asset('src/js/shared/theme.js') }}" defer></script>
    <title>Dashboard | TMIS</title>
    <link rel="stylesheet" href="{{ asset('src/css/shared/table-loading.css') }}" />
    <script src="{{ asset('src/js/shared/table-loading.js') }}" defer></script>
    <!-- Backend integration disabled for now. Uncomment when ready.
<script type="module" src="{{ asset('src/js/shared/auth-client.js') }}"></script>
-->
      <script type="module" src="{{ asset('src/js/shared/activity-log.js') }}"></script>
  <link rel="stylesheet" href="{{ asset('src/css/shared/toast.css') }}">
    <script src="{{ asset('src/js/shared/toast.js') }}" defer></script>
@endsection

@section('content')
<div class="app-wrapper">
      <nav class="app-header navbar navbar-expand">
        <div
          class="app-header-main d-flex justify-content-between align-items-center"
        >
          <!-- logo and TMIS -->
          <div
            class="app-header-left d-flex align-items-center justify-content-start"
          >
            <!-- Hide in large size -->
            <button
              class="btn app-mobile-toggle d-lg-none"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#mobileNavMenu"
              aria-controls="mobileNavMenu"
            >
              <i class="bi bi-list"></i>
            </button>
            <!-- Bootstrap hides the logo below sm to keep the mobile header compact. -->
            <div
              class="app-logo d-none d-sm-flex align-items-center justify-content-start"
            >
              <a href="{{ route('admin.dashboard.dashboard') }}" class="text-decoration-none">
                <img
                  src="{{ asset('assets/logo/DA Logo/DA logo_120519.png') }}"
                  alt="App_logo"
                  class="image-logo"
                />
              </a>
              <div
                class="app-logo-text d-flex align-items-center justify-content-start"
              >
                <!-- Bootstrap hides the TMIS wordmark below sm (576px), preserving space for mobile navigation. -->
                <h3 class="app-name d-none d-sm-block">TMIS</h3>
                <!-- <span class="text-logo-name">Training Management Information System</span> -->
              </div>
            </div>
          </div>

          <!-- Navigation Bar -->
          <div
            class="app-navigation-bar d-none d-lg-flex justify-content-center"
          >
            <ul class="navbar-nav">
              <li class="nav-item">
                <a href="{{ route('admin.dashboard.dashboard') }}" class="nav-link active-page">
                  <i class="bi bi-columns-gap"></i>
                  <span class="text-icon-active">Dashboard</span>
                </a>
              </li>
              <li class="nav-item">
                <a
                  href="#"
                  class="nav-link"
                  role="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#participantHeaderCollapse"
                  aria-expanded="false"
                  aria-controls="participantHeaderCollapse"
                >
                  <i class="bi bi-people-fill"></i>
                  <span class="text-icon">Participants</span>
                  <i class="bi bi-chevron-down ms-2"></i>
                </a>
                <div
                  class="collapse header-collapse"
                  id="participantHeaderCollapse"
                >
                  <div class="header-collapse-menu">
                  <div class="participant-nav-section-label">Individual</div>
                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#createParticipantHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-plus-circle"></i>
                      <span>Create</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div class="collapse" id="createParticipantHeaderCollapse">
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.participants.create.register') }}" class="header-sub-collapse-item">
                          <i class="bi bi-person-fill-add"></i>
                          <span>Register</span>
                        </a>
                      </div>
                    </div>

                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#detailsParticipantHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-file-earmark-text"></i>
                      <span>Details</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div class="collapse" id="detailsParticipantHeaderCollapse">
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.participants.details.all-with-status') }}" class="header-sub-collapse-item">
                          <i class="bi bi-list-check"></i>
                          <span>List of Farmers</span>
                        </a>
                        <a href="{{ route('admin.participants.details.inactive') }}" class="header-sub-collapse-item">
                          <i class="bi bi-person-walking"></i>
                          <span>Inactive</span>
                        </a>
                      </div>
                    </div>
                  <div class="participant-nav-section-label">Farmer Association</div>
                  <a href="#" class="header-collapse-item" role="button" data-bs-toggle="collapse" data-bs-target="#createFarmerAssociationHeaderCollapse" aria-expanded="false" aria-controls="createFarmerAssociationHeaderCollapse">
                    <i class="bi bi-plus-circle"></i>
                    <span>Create</span>
                    <i class="bi bi-chevron-down ms-auto"></i>
                  </a>
                  <div class="collapse" id="createFarmerAssociationHeaderCollapse">
                    <div class="header-sub-collapse-menu">
                      <a href="{{ route('admin.participants.create.fa-register') }}" class="header-sub-collapse-item">
                        <i class="bi bi-building-add"></i>
                        <span>Register</span>
                      </a>
                    </div>
                  </div>
                  <a href="#" class="header-collapse-item" role="button" data-bs-toggle="collapse" data-bs-target="#detailsFarmerAssociationHeaderCollapse" aria-expanded="false" aria-controls="detailsFarmerAssociationHeaderCollapse">
                    <i class="bi bi-file-earmark-text"></i>
                    <span>Details</span>
                    <i class="bi bi-chevron-down ms-auto"></i>
                  </a>
                  <div class="collapse" id="detailsFarmerAssociationHeaderCollapse">
                    <div class="header-sub-collapse-menu">
                      <a href="{{ route('admin.participants.details.fa-all-list') }}" class="header-sub-collapse-item">
                        <i class="bi bi-list-ul"></i>
                        <span>List of FA</span>
                      </a>
                      <a href="{{ route('admin.participants.details.fa-inactive') }}" class="header-sub-collapse-item">
                        <i class="bi bi-x-circle-fill"></i>
                        <span>Inactive</span>
                      </a>
                    </div>
                  </div>
                  </div>
                </div>
              </li>
              <li class="nav-item">
                <a
                  href="#"
                  class="nav-link"
                  role="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#trainingHeaderCollapse"
                  aria-expanded="false"
                  aria-controls="trainingHeaderCollapse"
                >
                  <i class="bi bi-book-fill"></i>
                  <span class="text-icon">Training</span>
                  <i class="bi bi-chevron-down ms-2"></i>
                </a>
                <div
                  class="collapse header-collapse"
                  id="trainingHeaderCollapse"
                >
                  <div class="header-collapse-menu">
                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#createTrainingHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-plus-circle"></i>
                      <span>Create</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div class="collapse" id="createTrainingHeaderCollapse">
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.training.create.register') }}" class="header-sub-collapse-item">
                          <i class="bi bi-clipboard-plus-fill"></i>
                          <span>Register</span>
                        </a>
                      </div>
                    </div>

                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#updateTrainingHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-arrow-repeat"></i>
                      <span>Update</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div class="collapse" id="updateTrainingHeaderCollapse">
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.training.update.for-review') }}" class="header-sub-collapse-item">
                          <i class="bi bi-clipboard2-check-fill"></i>
                          <span>For Review</span>
                          <span class="badge badge-review">34</span>
                        </a>
                        <a href="{{ route('admin.training.update.for-approval') }}" class="header-sub-collapse-item">
                          <i class="bi bi-clipboard2-check-fill"></i>
                          <span>For Approval</span>
                          <span class="badge badge-approval">23</span>
                        </a>
                        <a href="{{ route('admin.training.update.for-acceptance') }}" class="header-sub-collapse-item">
                          <i class="bi bi-patch-check-fill"></i>
                          <span>For Acceptance</span>
                          <span class="badge badge-acceptance">0</span>
                        </a>

                      </div>
                    </div>

                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#detailsTrainingHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-file-earmark-text"></i>
                      <span>Details</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div class="collapse" id="detailsTrainingHeaderCollapse">
                      <div class="header-sub-collapse-menu">
                        <a
                          href="{{ route('admin.training.details.all-status') }}"
                          class="header-sub-collapse-item"
                        >
                          <i class="bi bi-person-video3"></i>
                          <span>All Status</span>
                        </a>
                        <a
                          href="{{ route('admin.training.details.approved-accepted') }}"
                          class="header-sub-collapse-item"
                        >
                          <i class="bi bi-person-workspace"></i>
                          <span>Approved & Accepted</span>
                        </a>
                        <a
                          href="{{ route('admin.training.details.incomplete') }}"
                          class="header-sub-collapse-item"
                        >
                          <i class="bi bi-person-fill-gear"></i>
                          <span>Incomplete</span>
                        </a>
                        <a
                          href="{{ route('admin.training.details.inactive') }}"
                          class="header-sub-collapse-item"
                        >
                          <i class="bi bi-envelope-exclamation-fill"></i>
                          <span>Inactive</span>
                        </a>
                      </div>
                    </div>
                  <div class="training-nav-section-label">Facilitator / Resource Person</div>
                  <a href="#" class="header-collapse-item" role="button" data-bs-toggle="collapse" data-bs-target="#createFacilitatorRpHeaderCollapse" aria-expanded="false" aria-controls="createFacilitatorRpHeaderCollapse">
                    <i class="bi bi-plus-circle"></i>
                    <span>Create</span>
                    <i class="bi bi-chevron-down ms-auto"></i>
                  </a>
                  <div class="collapse" id="createFacilitatorRpHeaderCollapse">
                    <div class="header-sub-collapse-menu">
                      <a href="{{ route('admin.training.create.rp-register') }}" class="header-sub-collapse-item">
                        <i class="bi bi-person-fill-add"></i>
                        <span>Register</span>
                      </a>
                    </div>
                  </div>
                  <a href="#" class="header-collapse-item" role="button" data-bs-toggle="collapse" data-bs-target="#detailsFacilitatorRpHeaderCollapse" aria-expanded="false" aria-controls="detailsFacilitatorRpHeaderCollapse">
                    <i class="bi bi-file-earmark-text"></i>
                    <span>Details</span>
                    <i class="bi bi-chevron-down ms-auto"></i>
                  </a>
                  <div class="collapse" id="detailsFacilitatorRpHeaderCollapse">
                    <div class="header-sub-collapse-menu">
                      <a href="{{ route('admin.training.details.rp-list') }}" class="header-sub-collapse-item">
                        <i class="bi bi-list-ul"></i>
                        <span>List of RP</span>
                      </a>
                      <a href="{{ route('admin.training.details.rp-inactive') }}" class="header-sub-collapse-item">
                        <i class="bi bi-x-circle-fill"></i>
                        <span>Inactive</span>
                      </a>
                    </div>
                  </div>
                  </div>
                </div>
              </li>
              <li class="nav-item">
                <a
                  href="#"
                  class="nav-link"
                  role="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#evaluationHeaderCollapse"
                  aria-expanded="false"
                  aria-controls="evaluationHeaderCollapse"
                >
                  <i class="bi bi-file-earmark-check"></i>
                  <span class="text-icon">Evaluation</span>
                  <i class="bi bi-chevron-down ms-2"></i>
                </a>
                <div
                  class="collapse header-collapse"
                  id="evaluationHeaderCollapse"
                >
                  <div class="header-collapse-menu">
                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#createEvaluationHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-plus-circle"></i>
                      <span>Create</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div class="collapse" id="createEvaluationHeaderCollapse">
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.evaluation.create.pre-test-register') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-text"></i>
                          <span>Pre-test Questionaire</span>
                        </a>
                        <a href="{{ route('admin.evaluation.create.post-test-register') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-text"></i>
                          <span>Post-test Questionaire</span>
                        </a>
                        <a href="{{ route('admin.evaluation.create.training-evaluation-register') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-text"></i>
                          <span>Training Evaluation</span>
                        </a>
                        <a href="{{ route('admin.evaluation.create.rp-evaluation-register') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-text"></i>
                          <span>Resource Person Evaluation</span>
                        </a>
                      </div>
                    </div>

                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#encodeEvaluationHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-code-slash"></i>
                      <span>Encode</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div class="collapse" id="encodeEvaluationHeaderCollapse">
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.evaluation.encode.pre-test') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-ruled"></i>
                          <span>Pre-test Evaluation</span>
                        </a>
                        <a href="{{ route('admin.evaluation.encode.post-test') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-ruled"></i>
                          <span>Post-test Evaluation</span>
                        </a>
                        <a href="{{ route('admin.evaluation.encode.training-evaluation') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-ruled"></i>
                          <span>Training Evaluation</span>
                        </a>
                        <a href="{{ route('admin.evaluation.encode.rp-evaluation') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-ruled"></i>
                          <span>Resource Person Evaluation</span>
                        </a>
                      </div>
                    </div>

                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#detailsEvaluationHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-file-earmark-text"></i>
                      <span>Details</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div class="collapse" id="detailsEvaluationHeaderCollapse">
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.evaluation.details.list-questionnaire') }}" class="header-sub-collapse-item">
                          <i class="bi bi-journal-text"></i>
                          <span>List Questionnaire</span>
                        </a>
                        <a href="{{ route('admin.evaluation.details.draft-questionnaire') }}" class="header-sub-collapse-item">
                          <i class="bi bi-file-earmark-text"></i>
                          <span>Draft Questionnaires</span>
                        </a>
                        <a href="{{ route('admin.evaluation.details.inactive') }}" class="header-sub-collapse-item">
                          <i class="bi bi-journal-x"></i>
                          <span>Inactive</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              <li class="nav-item">
                <a
                  href="#"
                  class="nav-link"
                  role="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#administrationHeaderCollapse"
                  aria-expanded="false"
                  aria-controls="administrationHeaderCollapse"
                >
                  <i class="bi bi-sliders"></i>
                  <span class="text-icon">Administration</span>
                  <i class="bi bi-chevron-down ms-2"></i>
                </a>
                <div
                  class="collapse header-collapse"
                  id="administrationHeaderCollapse"
                >
                  <div class="header-collapse-menu">
                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#createAdministrationHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-plus-circle"></i>
                      <span>Create</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div
                      class="collapse"
                      id="createAdministrationHeaderCollapse"
                    >
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.administration.create.register') }}" class="header-sub-collapse-item">
                          <i class="bi bi-person-add"></i>
                          <span>Register</span>
                        </a>
                      </div>
                    </div>

                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#updateAdministrationHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-arrow-repeat"></i>
                      <span>Update</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div
                      class="collapse"
                      id="updateAdministrationHeaderCollapse"
                    >
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.administration.update.for-approval') }}" class="header-sub-collapse-item">
                          <i class="bi bi-person-check"></i>
                          <span>For approval</span>
                        </a>
                      </div>
                    </div>

                    <a
                      href="#"
                      class="header-collapse-item"
                      role="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#detailsAdministrationHeaderCollapse"
                      aria-expanded="false"
                    >
                      <i class="bi bi-file-earmark-text"></i>
                      <span>Details</span>
                      <i class="bi bi-chevron-down ms-auto"></i>
                    </a>
                    <div
                      class="collapse"
                      id="detailsAdministrationHeaderCollapse"
                    >
                      <div class="header-sub-collapse-menu">
                        <a href="{{ route('admin.administration.details.all-status') }}" class="header-sub-collapse-item">
                          <i class="bi bi-person-arms-up"></i>
                          <span>All status</span>
                        </a>
                        <a href="{{ route('admin.administration.details.approved-accepted') }}" class="header-sub-collapse-item">
                          <i class="bi bi-person-hearts"></i>
                          <span>Approved & accepted</span>
                        </a>
                        <a href="{{ route('admin.administration.details.inactive') }}" class="header-sub-collapse-item">
                          <i class="bi bi-person-fill-gear"></i>
                          <span>Inactive</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <!-- Notification & User profile -->
          <div class="app-noti-profile d-flex align-items-center">
            <!-- Notification menu stays end-aligned so its wide content cannot enlarge the mobile layout. -->
            <div class="app-notification dropdown">
              <button
                class="notification-btn position-relative"
                type="button"
                id="notificationDropdown"
                data-bs-toggle="dropdown"
                data-bs-auto-close="outside"
                aria-expanded="false"
                aria-label="Open notifications"
              >
                <i class="bi bi-bell-fill"></i>
                <span
                  class="position-absolute top-0 start-100 translate-middle badge rounded-pill notification-count"
                  >3</span
                >
              </button>
              <!-- Notification Dropdown -->
              <div
                class="dropdown-menu dropdown-menu-end notification-menu"
                aria-labelledby="notificationDropdown"
              >
                <div class="notification-menu-header">
                  <div>
                    <span class="notification-menu-title">Notifications</span>
                    <span class="notification-menu-subtitle"
                      >3 unread updates</span
                    >
                  </div>
                  <div class="notification-menu-actions">
                    <button type="button" class="notification-mark-read">
                      Mark all read
                    </button>
                    <button type="button" class="notification-clear-all">
                      Clear all
                    </button>
                  </div>
                </div>
                <div class="notification-menu-list">
                  <button
                    type="button"
                    class="notification-menu-item is-unread"
                    data-bs-toggle="modal"
                    data-bs-target="#notificationDetailModal"
                    data-notification-type="Approval required"
                    data-notification-time="Today, 9:20 PM"
                    data-notification-title="Training proposal review needed"
                    data-notification-description="The Advanced Data Analysis training proposal submitted by John Doe is ready for your review. Your feedback is required before it can proceed to approval."
                    data-notification-action="Review proposal"
                  >
                    <span
                      class="notification-item-icon notification-item-icon--approval"
                      ><i class="bi bi-clipboard2-check"></i
                    ></span>
                    <span class="notification-item-copy">
                      <span class="notification-item-title"
                        >Training proposal review needed</span
                      >
                      <span class="notification-item-summary"
                        >Advanced Data Analysis needs your feedback.</span
                      >
                      <span class="notification-item-time">Today, 9:20 PM</span>
                    </span>
                    <span
                      class="notification-unread-dot"
                      aria-label="Unread"
                    ></span>
                  </button>
                  <button
                    type="button"
                    class="notification-menu-item is-unread"
                    data-bs-toggle="modal"
                    data-bs-target="#notificationDetailModal"
                    data-notification-type="Budget update"
                    data-notification-time="Today, 2:45 PM"
                    data-notification-title="District allocation records updated"
                    data-notification-description="The beneficiary district allocation records have been updated. Open this notification to review the updated district entries."
                    data-notification-action="View allocation records"
                  >
                    <span
                      class="notification-item-icon notification-item-icon--budget"
                      ><i class="bi bi-wallet2"></i
                    ></span>
                    <span class="notification-item-copy">
                      <span class="notification-item-title"
                        >District allocation records updated</span
                      >
                      <span class="notification-item-summary"
                        >Beneficiary district entries are ready to review.</span
                      >
                      <span class="notification-item-time">Today, 2:45 PM</span>
                    </span>
                    <span
                      class="notification-unread-dot"
                      aria-label="Unread"
                    ></span>
                  </button>
                  <button
                    type="button"
                    class="notification-menu-item is-unread"
                    data-bs-toggle="modal"
                    data-bs-target="#notificationDetailModal"
                    data-notification-type="Participant update"
                    data-notification-time="Yesterday, 4:10 PM"
                    data-notification-title="Participant registration approved"
                    data-notification-description="A participant registration has been approved and is now included in the beneficiary record for its assigned district."
                    data-notification-action="View participant"
                  >
                    <span
                      class="notification-item-icon notification-item-icon--participant"
                      ><i class="bi bi-person-check"></i
                    ></span>
                    <span class="notification-item-copy">
                      <span class="notification-item-title"
                        >Participant registration approved</span
                      >
                      <span class="notification-item-summary"
                        >A new beneficiary record is now active.</span
                      >
                      <span class="notification-item-time"
                        >Yesterday, 4:10 PM</span
                      >
                    </span>
                    <span
                      class="notification-unread-dot"
                      aria-label="Unread"
                    ></span>
                  </button>
                </div>
                <button type="button" class="notification-view-all">
                  View all notifications <i class="bi bi-arrow-right"></i>
                </button>
              </div>
            </div>

            <!-- User profile and role -->
            <div class="app-profile dropdown-center">
              <a
                href="#"
                class="nav-link dropdown-toggle profile-button"
                role="button"
                data-bs-auto-close="outside"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <!-- User profile -->
                <span class="user-avatar-wrap">
                  @include('layouts.account-avatar')
                  <span class="user-status-dot"></span>
                </span>

                <!-- User name -->
                <div class="profile-meta">
                  <span class="profile-name">{{ $accountDisplay['navigationName'] }}</span>
                  <small class="profile-role">{{ $accountDisplay['role'] ?? 'Role not assigned' }}</small>
                </div>
              </a>
              <ul class="dropdown-menu dropdown-menu-end user-menu">
                <li>
                  <h6 class="dropdown-header user-menu-header">
                    {{ $accountDisplay['navigationName'] }}
                  </h6>
                </li>
                <li>
                  <span class="dropdown-item-text">{{ $accountDisplay['role'] ?? 'Role not assigned' }}</span>
                </li>
                <li>
                  <hr class="dropdown-divider" />
                </li>
                <li>
                  <a href="{{ route('admin.users.profile') }}" class="dropdown-item">
                    <i class="bi bi-person-fill-gear"></i>
                    <span>Profile</span>
                  </a>
                </li>
                <li>
                  <a href="{{ route('admin.users.logs') }}" class="dropdown-item">
                    <i class="bi bi-substack"></i>
                    <span>Logs</span>
                  </a>
                </li>
                
                <li>
                  <hr class="dropdown-divider" />
                </li>
                <li>
                  <a href="{{ route('login') }}" class="dropdown-item sign-out-item">
                    <i class="bi bi-box-arrow-in-right"></i>
                    <span>Sign out</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Body page  -->
      <main class="app-main">
        <!-- Dashboard data handoff: replace the sample welcome, date, totals, and training text below with escaped server values. Keep chart IDs and data-report-key values in sync with scriptv2.js. -->
        <!-- Bootstrap container and grid keep dashboard cards fluid on every viewport. -->
        <div class="app-main-body container-fluid px-3 px-md-4">
          <!-- first row -->
          <!-- Responsive grid: cards stack on phones, then use the dashboard split from lg screens. -->
          <div class="row first-row g-4" id="summary-report">
            <!-- App left main content first row -->
            <div class="col-12 col-lg-4">
              <div class="app-left-main-content-body h-100" style="--dashboard-welcome-image: url('{{ $systemBranding['dashboardImageUrl'] }}');">
                <!-- User intro left -->
                <div class="app-left-main-content-user-intro">
                  <h5 class="app-left-main-content-user-hello">Hello,</h5>
                  <h5 class="app-left-main-content-user-name">
                    {{ $accountDisplay['navigationName'] }}!👋
                  </h5>
                  <small class="app-left-main-content-user-details"
                    >Here's what's happening with your training programs
                    today.</small
                  >
                </div>
                <div class="app-left-main-content-date">
                  <i class="bi bi-calendar3"></i>
                  <span class="app-left-content-date">{{ now('Asia/Manila')->format('F j, Y') }}</span>
                  <span class="app-left-content-divider"></span>
                  <span class="app-left-content-day">{{ now('Asia/Manila')->format('l') }}</span>
                </div>
                <div class="app-left-main-content-training">
                  <h6 class="app-left-main-content-title">{{ $originalInterfaceData['dashboard']['upcoming'][0]['title'] ?? 'No upcoming training' }}</h6>
                </div>
              </div>
            </div>
            <!-- app right main content first row -->
            <div class="col-12 col-lg-8">
              <div class="row first-row-right g-2">
                <!-- Trainings -->
                <div class="col-12 col-md-6">
                  <!-- Card wrapper -->
                  <div class="card card-app-right-main-content h-100">
                    <div class="card-header">
                      <div
                        class="card-header-wrapper px-3 py-2 px-md-3 py-md-2"
                      >
                        <div class="card-header-icon">
                          <i class="bi bi-tv"></i>
                        </div>
                        <div class="card-header-title">
                          <h5 class="card-header-text">
                            Active Capacity-Building Activities
                          </h5>
                          <span class="card-header-context">{{ $originalInterfaceData['dashboard']['trainingCount'] ?? 0 }}</span>
                        </div>
                        <div class="card-tools">
                          <!-- card-tools -->
                          <button
                            type="button"
                            class="btn btn-modal"
                            aria-label="Summary view"
                            title="Summary view"
                            data-bs-toggle="modal"
                            data-bs-target="#dashboardReportModal"
                            data-report-key="activities"
                          >
                            <i class="bi bi-filter-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="card-body px-3 px-md-3 pt-3 pb-3">
                      <div
                        class="card-summary-row d-flex flex-column flex-sm-row align-items-start align-items-sm-center"
                      >
                        <div class="card-chart-label">
                          <span class="card-chart-eyebrow"
                            >Training activity</span
                          >
                          <span class="card-chart-period"
                            >January - December</span
                          >
                        </div>
                        <div
                          class="card-vs-year align-self-stretch align-self-sm-end"
                        >
                          <div class="card-vs-year-percentage">
                            <i class="bi bi-arrow-up-short"></i>
                            <span class="card-data-text-vs-year">No comparison yet</span>
                          </div>
                          <span class="card-data-vs-year">vs Last year</span>
                        </div>
                      </div>
                      <div class="card-chart-helper">
                        <i class="bi bi-cursor-fill"></i>
                        <span>Hover a month to see municipality details</span>
                      </div>
                      <div class="card-chart" id="totalTrainingChart"></div>
                    </div>
                    <div class="card-footer">
                      <span class="card-footer-context"
                        >Total training sessions conducted across all
                        municipalities.</span
                      >
                    </div>
                  </div>
                </div>
                <!-- Active Farmers -->
                <div class="col-12 col-md-6">
                  <!-- Card wrapper -->
                  <div class="card card-app-right-main-content h-100">
                    <div class="card-header">
                      <div
                        class="card-header-wrapper px-3 py-2 px-md-3 py-md-2"
                      >
                        <div class="card-header-icon participants-icon">
                          <i class="bi bi-people"></i>
                        </div>
                        <div class="card-header-title">
                          <h5 class="card-header-text">Active Farmers</h5>
                          <span class="card-header-context">{{ $originalInterfaceData['dashboard']['participantCount'] ?? 0 }}</span>
                        </div>
                        <div class="card-tools">
                          <!-- card-tools -->
                          <button
                            type="button"
                            class="btn btn-modal"
                            aria-label="Summary view"
                            title="Summary view"
                            data-bs-toggle="modal"
                            data-bs-target="#dashboardReportModal"
                            data-report-key="participants"
                          >
                            <i class="bi bi-filter-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="card-body px-3 px-md-3 pt-3 pb-3">
                      <div
                        class="card-summary-row d-flex flex-column flex-sm-row align-items-start align-items-sm-center"
                      >
                        <div class="card-chart-label">
                          <span class="card-chart-eyebrow"
                            >Farmer registrations</span
                          >
                          <span class="card-chart-period"
                            >January - December</span
                          >
                        </div>
                        <div
                          class="card-vs-year align-self-stretch align-self-sm-end"
                        >
                          <div class="card-vs-year-percentage">
                            <i class="bi bi-arrow-up-short"></i>
                            <span class="card-data-text-vs-year">No comparison yet</span>
                          </div>
                          <span class="card-data-vs-year">vs Last year</span>
                        </div>
                      </div>
                      <div class="card-chart-helper">
                        <i class="bi bi-cursor-fill"></i>
                        <span>Hover a month to see municipality details</span>
                      </div>
                      <div class="card-chart" id="totalParticipantsChart"></div>
                    </div>
                    <div class="card-footer">
                      <span class="card-footer-context"
                        >Active farmers registered across all municipalities.</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- second row -->
          <!-- Responsive chart cards: one column on small screens, two columns from lg upward. -->
          <div class="row second-row g-4">
            <!-- Total FCA     -->
            <div class="col-12 col-lg-6">
              <!-- Card wrapper -->
              <div class="card card-app-right-main-content h-100">
                <div class="card-header">
                  <div class="card-header-wrapper px-3 py-2 px-md-3 py-md-2">
                    <div class="card-header-icon fca-icon">
                      <i class="bi bi-diagram-3-fill"></i>
                    </div>
                    <div class="card-header-title">
                      <h5 class="card-header-text">Total FCA</h5>
                      <span class="card-header-context">{{ $originalInterfaceData['dashboard']['associationCount'] ?? 0 }}</span>
                    </div>
                    <div class="card-tools">
                      <!-- card-tools -->
                      <button
                        type="button"
                        class="btn btn-modal"
                        aria-label="Summary view"
                        title="Summary view"
                        data-bs-toggle="modal"
                        data-bs-target="#dashboardReportModal"
                        data-report-key="fca"
                      >
                        <i class="bi bi-filter-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="card-body px-3 px-md-3 pt-3 pb-3">
                  <div
                    class="card-summary-row d-flex flex-column flex-sm-row align-items-start align-items-sm-center"
                  >
                    <div class="card-chart-label">
                      <span class="card-chart-eyebrow">FCA Uploaded</span>
                      <span class="card-chart-period">January - December</span>
                    </div>
                    <div
                      class="card-vs-year align-self-stretch align-self-sm-end"
                    >
                      <div class="card-vs-year-percentage">
                        <i class="bi bi-arrow-up-short"></i>
                        <span class="card-data-text-vs-year">No comparison yet</span>
                      </div>
                      <span class="card-data-vs-year">vs Last year</span>
                    </div>
                  </div>
                  <div class="card-chart-helper">
                    <i class="bi bi-cursor-fill"></i>
                    <span>Hover a month to see municipality details</span>
                  </div>
                  <div class="card-chart" id="totalFAChart"></div>
                </div>
                <div class="card-footer">
                  <span class="card-footer-context"
                    >Total Farmer Association uploaded across all
                    municipalities.</span
                  >
                </div>
              </div>
            </div>
            <!-- Per District  -->
            <div class="col-12 col-lg-6">
              <!-- Card wrapper -->
              <div class="card card-app-right-main-content h-100">
                <div class="card-header">
                  <div class="card-header-wrapper px-3 py-2 px-md-3 py-md-2">
                    <div class="card-header-icon district-icon">
                      <i class="bi bi-geo"></i>
                    </div>
                    <div class="card-header-title">
                      <h5 class="card-header-text">
                        Allocated Training Budget by District
                      </h5>
                    </div>
                    <div class="card-tools">
                      <!-- card-tools -->
                      <button
                        type="button"
                        class="btn btn-modal"
                        aria-label="Summary view"
                        title="Summary view"
                        data-bs-toggle="modal"
                        data-bs-target="#dashboardReportModal"
                        data-report-key="budget"
                      >
                        <i class="bi bi-filter-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="card-body px-3 px-md-3 pt-3 pb-3">
                  <div
                    class="card-summary-row d-flex flex-column flex-sm-row align-items-start align-items-sm-center"
                  >
                    <div class="card-chart-label">
                      <span class="card-chart-eyebrow"
                        >Total allocated training funds by district</span
                      >
                      <span class="card-chart-period"
                        >8 beneficiary districts</span
                      >
                    </div>
                  </div>
                  <div class="card-chart-helper">
                    <i class="bi bi-cursor-fill"></i>
                    <span
                      >Hover a district to see its total allocated amount</span
                    >
                  </div>
                  <div
                    class="card-chart"
                    id="totalAllocatedDistrictChart"
                  ></div>
                </div>
                <div class="card-footer">
                  <span class="card-footer-context"
                    >Total training funds allocated across the eight beneficiary
                    districts.</span
                  >
                </div>
              </div>
            </div>
          </div>
          <!-- third row -->
          <!-- Province and municipality allocation report. -->
          <div class="row third-row g-4">
            <div class="col-12 col-xl-6">
              <div class="row g-4">
                <!-- Allocated training funds by province -->
                <div class="col-12">
                  <div
                    class="card card-app-right-main-content card-allocation-breakdown province-allocation-card h-100"
                  >
                    <div class="card-header card-allocation-header">
                      <div class="card-allocation-title-group">
                        <div class="card-allocation-title-row">
                          <span class="card-allocation-icon"
                            ><i class="bi bi-map-fill"></i
                          ></span>
                          <h5>Allocated Training Funds by Province</h5>
                          <button
                            type="button"
                            class="btn btn-toggle-info"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Shows the total training funds allocated to each province."
                            aria-label="About allocated training funds by province"
                          >
                            <i class="bi bi-exclamation-circle"></i>
                          </button>
                        </div>
                        <span
                          >Provincial allocation overview for the current
                          reporting period.</span
                        >
                      </div>
                      <button
                        type="button"
                        class="btn btn-modal"
                        data-bs-toggle="modal"
                        data-bs-target="#dashboardReportModal"
                        data-report-key="provinceBudget"
                        title="View province allocation details"
                        aria-label="View province allocation details"
                      >
                        <i class="bi bi-filter-right"></i>
                      </button>
                    </div>
                    <div class="card-body card-allocation-body">
                      <div class="card-allocation-summary"><div><span>{{ $originalInterfaceData['dashboard']['currentYear'] ?? now()->year }} allocated</span><strong>PHP {{ number_format($originalInterfaceData['dashboard']['funds']['current'] ?? 0) }}</strong></div><div><span>{{ $originalInterfaceData['dashboard']['previousYear'] ?? now()->year - 1 }} allocated</span><strong>PHP {{ number_format($originalInterfaceData['dashboard']['funds']['previous'] ?? 0) }}</strong></div><div><span>Areas covered</span><strong>{{ count($originalInterfaceData['dashboard']['allocatedBudgetByProvince'] ?? []) }}</strong></div></div>
                      <div
                        class="card-allocation-chart"
                        id="allocatedProvinceChart"
                      ></div>
                    </div>
                  </div>
                </div>
                <!-- Moved to the full-width sixth dashboard row. -->
                <div class="d-none">
                  <div
                    class="card card-app-right-main-content card-allocation-breakdown h-100"
                  >
                    <div class="card-header card-allocation-header">
                      <div class="card-allocation-title-group">
                        <div class="card-allocation-title-row">
                          <span class="card-allocation-icon"
                            ><i class="bi bi-geo-alt-fill"></i
                          ></span>
                          <h5>Allocated Training Funds by Municipality</h5>
                          <button
                            type="button"
                            class="btn btn-toggle-info"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Shows the total training funds allocated to each beneficiary municipality."
                            aria-label="About allocated training funds by municipality"
                          >
                            <i class="bi bi-exclamation-circle"></i>
                          </button>
                        </div>
                        <span
                          >Municipality allocation comparison across the covered
                          provinces.</span
                        >
                      </div>
                      <button
                        type="button"
                        class="btn btn-modal"
                        data-bs-toggle="modal"
                        data-bs-target="#dashboardReportModal"
                        data-report-key="municipalityBudget"
                        title="View municipality allocation details"
                        aria-label="View municipality allocation details"
                      >
                        <i class="bi bi-filter-right"></i>
                      </button>
                    </div>
                    <div class="card-body card-allocation-body">
                      <div class="card-allocation-summary"><div><span>{{ $originalInterfaceData['dashboard']['currentYear'] ?? now()->year }} allocated</span><strong>PHP {{ number_format($originalInterfaceData['dashboard']['funds']['current'] ?? 0) }}</strong></div><div><span>{{ $originalInterfaceData['dashboard']['previousYear'] ?? now()->year - 1 }} allocated</span><strong>PHP {{ number_format($originalInterfaceData['dashboard']['funds']['previous'] ?? 0) }}</strong></div><div><span>Areas covered</span><strong>{{ count($originalInterfaceData['dashboard']['municipalityAllocation'] ?? []) }}</strong></div></div>
                      <div
                        class="card-allocation-chart"
                        id="allocatedMunicipalityChartLegacy"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-12 col-xl-6">
              <div
                class="card card-app-right-main-content card-allocation-breakdown municipality-allocation-card h-100"
              >
                <div class="card-header card-allocation-header">
                  <div class="card-allocation-title-group">
                    <div class="card-allocation-title-row">
                      <span class="card-allocation-icon"
                        ><i class="bi bi-geo-alt-fill"></i
                      ></span>
                      <h5>Allocated Training Funds by Municipality</h5>
                      <button
                        type="button"
                        class="btn btn-toggle-info"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Shows the total training funds allocated to each beneficiary municipality."
                        aria-label="About allocated training funds by municipality"
                      >
                        <i class="bi bi-exclamation-circle"></i>
                      </button>
                    </div>
                    <span
                      >Municipality allocation comparison across the covered
                      provinces.</span
                    >
                  </div>
                  <button
                    type="button"
                    class="btn btn-modal"
                    data-bs-toggle="modal"
                    data-bs-target="#dashboardReportModal"
                    data-report-key="municipalityBudget"
                    title="View municipality allocation details"
                    aria-label="View municipality allocation details"
                  >
                    <i class="bi bi-filter-right"></i>
                  </button>
                </div>
                <div class="card-body card-allocation-body">
                  <div class="card-allocation-summary"><div><span>{{ $originalInterfaceData['dashboard']['currentYear'] ?? now()->year }} allocated</span><strong>PHP {{ number_format($originalInterfaceData['dashboard']['funds']['current'] ?? 0) }}</strong></div><div><span>{{ $originalInterfaceData['dashboard']['previousYear'] ?? now()->year - 1 }} allocated</span><strong>PHP {{ number_format($originalInterfaceData['dashboard']['funds']['previous'] ?? 0) }}</strong></div><div><span>Areas covered</span><strong>{{ count($originalInterfaceData['dashboard']['municipalityAllocation'] ?? []) }}</strong></div></div>
                  <div
                    class="card-allocation-chart"
                    id="allocatedMunicipalityChart"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <!-- fourth row -->
          <!-- Beneficiary card grows from full width to a compact dashboard column. -->
          <div class="row fourth-row g-4">
            <!-- Total Gender per youth, adult, senior -->
            <div class="col-12 col-md-6 col-xl-3">
              <div class="card card-beneficiary">
                <div
                  class="card-header d-flex align-items-start position-relative p-3 pe-5 pb-2 lh-sm bg-transparent border-0"
                >
                  <div class="card-title-group">
                    <h6 class="card-title-gender">
                      Beneficiaries by Age &amp; Sex
                    </h6>
                    <p class="card-beneficiary-description">
                      Distribution of beneficiaries across age groups, separated
                      by sex.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-modal position-absolute top-0 end-0 m-3"
                    title="View beneficiary summary"
                    aria-label="View beneficiary summary"
                    data-bs-toggle="modal"
                    data-bs-target="#dashboardReportModal"
                    data-report-key="ageSex"
                  >
                    <i class="bi bi-filter-right"></i>
                  </button>
                </div>
                <!-- beneficiary data of age / sex -->
                <div class="card-body px-2 px-sm-3 pt-0 pb-3">
                  <div
                    class="card-chart-beneficiary"
                    id="beneficiaryAgeSexChart"
                  ></div>
                </div>
              </div>
            </div>
            <!-- Total Gender per male and female -->
            <div class="col-12 col-md-6 col-xl-3">
              <div class="card card-beneficiary">
                <div
                  class="card-header d-flex align-items-start position-relative p-3 pe-5 pb-2 lh-sm bg-transparent border-0"
                >
                  <div class="card-title-group">
                    <h6 class="card-title-gender">Beneficiaries by sex</h6>
                    <p class="card-beneficiary-description">
                      Distribution of beneficiaries across by sex
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-modal position-absolute top-0 end-0 m-3"
                    title="View beneficiary summary"
                    aria-label="View beneficiary summary"
                    data-bs-toggle="modal"
                    data-bs-target="#dashboardReportModal"
                    data-report-key="sex"
                  >
                    <i class="bi bi-filter-right"></i>
                  </button>
                </div>
                <!-- beneficiary data of age / sex -->
                <div class="card-body px-2 px-sm-3 pt-0 pb-3">
                  <div
                    class="card-chart-beneficiary"
                    id="beneficiarySexChart"
                  ></div>
                </div>
              </div>
            </div>
            <!-- Total PWD, 4ps, IP -->
            <div class="col-12 col-md-6 col-xl-6">
              <div class="card card-beneficiary">
                <div
                  class="card-header d-flex align-items-start position-relative p-3 pe-5 pb-2 lh-sm bg-transparent border-0"
                >
                  <div class="card-title-group">
                    <h6 class="card-title-gender">Beneficiary Groups</h6>
                    <p class="card-beneficiary-description">
                      Distribution of beneficiaries across by group
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-modal position-absolute top-0 end-0 m-3"
                    title="View beneficiary summary"
                    aria-label="View beneficiary summary"
                    data-bs-toggle="modal"
                    data-bs-target="#dashboardReportModal"
                    data-report-key="groups"
                  >
                    <i class="bi bi-filter-right"></i>
                  </button>
                </div>
                <!-- beneficiary data of age / sex -->
                <div class="card-body px-2 px-sm-3 pt-0 pb-3">
                  <!-- Bootstrap w-100 keeps this chart fluid within every grid column. -->
                  <div
                    class="card-chart-beneficiary w-100"
                    id="beneficiaryGroupChart"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <!-- fifth row -->
          <!-- Upcoming training and Highlights and recommendation  -->
          <div class="row fifth-row g-4">
            <div class="col-12 col-xl-4">
              <div class="card card-upcoming-training">
                <div class="card-header">
                  <h5 class="card-header-text">Upcoming Training</h5>
                  <button
                    type="button"
                    class="btn btn-modal"
                    data-bs-toggle="modal"
                    data-bs-target="#dashboardReportModal"
                    data-report-key="upcoming"
                    title="View all upcoming trainings"
                    aria-label="View all upcoming trainings"
                  >
                    <i class="bi bi-list-ul" aria-hidden="true"></i>
                  </button>
                </div>
                <div class="card-body">
                  <div class="row">
@forelse($originalInterfaceData['dashboard']['upcoming'] ?? [] as $upcomingTraining)
@php
  $upcomingStart = \Illuminate\Support\Carbon::parse($upcomingTraining['startDate'], 'Asia/Manila');
  $upcomingEnd = \Illuminate\Support\Carbon::parse($upcomingTraining['endDate'] ?? $upcomingTraining['startDate'], 'Asia/Manila');
  $upcomingDateRange = match (true) {
    $upcomingStart->format('Y-m-d') === $upcomingEnd->format('Y-m-d') => $upcomingStart->format('M j, Y'),
    $upcomingStart->format('Y-m') === $upcomingEnd->format('Y-m') => $upcomingStart->format('M j').'–'.$upcomingEnd->format('j, Y'),
    $upcomingStart->format('Y') === $upcomingEnd->format('Y') => $upcomingStart->format('M j').'–'.$upcomingEnd->format('M j, Y'),
    default => $upcomingStart->format('M j, Y').'–'.$upcomingEnd->format('M j, Y'),
  };
@endphp
<div class="card-wrapper col-12 mb-3"><div class="card-date" aria-label="Starts {{ $upcomingStart->format('F j, Y') }}"><span class="card-month">{{ $upcomingStart->format('M') }}</span><span class="card-date-text">{{ $upcomingStart->format('j') }}</span></div><div class="card-training-wrapper"><div class="card-training-title"><a href="{{ route('admin.training.id.view-training', ['id' => $upcomingTraining['id']]) }}" class="card-text-title nav-link">{{ $upcomingTraining['title'] }}</a></div><div class="card-dl-range"><div class="card-date-range"><i class="bi bi-calendar3" aria-hidden="true"></i><span class="card-range-date">{{ $upcomingDateRange }}</span></div><div class="card-location"><i class="bi bi-geo-alt" aria-hidden="true"></i><span class="card-location-text">{{ $upcomingTraining['venue'] }}</span></div></div></div><div class="card-slot"><span class="slot-text">Participants</span><span class="slot-number">{{ $upcomingTraining['target_participants'] ?? count($upcomingTraining['participants']) }}</span></div></div>
@empty
<div class="card-wrapper col-12 mb-3"><div class="card-date"><span class="card-month"></span><span class="card-date-text"></span></div><div class="card-training-wrapper"><div class="card-training-title"><span class="card-text-title">No upcoming training</span></div><div class="card-dl-range"><div class="card-date-range"><i class="bi bi-calendar3" aria-hidden="true"></i><span class="card-range-date">No upcoming date</span></div><div class="card-location"><span class="card-location-text"></span></div></div></div><div class="card-slot" hidden><span class="slot-number"></span></div></div>
@endforelse
</div>
                </div>
              </div>
            </div>
            <div class="col-12 col-xl-8">
              <div class="card community-feedback-card h-100">
                <div
                  id="communityFeedbackCarousel"
                  class="carousel slide community-feedback-carousel"
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Community feedback"
                >
                  <div class="carousel-inner"><article class="carousel-item active dashboard-highlight-empty"><div><i class="bi bi-images" aria-hidden="true"></i><h3>No highlights yet</h3><p>Training highlights and community feedback will appear here when they are available.</p></div></article></div>
                  <div class="carousel-indicators community-feedback-indicators">
                    <button
                      type="button"
                      data-bs-target="#communityFeedbackCarousel"
                      data-bs-slide-to="0"
                      class="active"
                      aria-current="true"
                      aria-label="Show feedback slide 1"
                    ></button>
                    <button
                      type="button"
                      data-bs-target="#communityFeedbackCarousel"
                      data-bs-slide-to="1"
                      aria-label="Show feedback slide 2"
                    ></button>
                  </div>
                  <button
                    class="carousel-control-prev community-feedback-control"
                    type="button"
                    data-bs-target="#communityFeedbackCarousel"
                    data-bs-slide="prev"
                    aria-label="Previous feedback"
                  >
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                  </button>
                  <button
                    class="carousel-control-next community-feedback-control"
                    type="button"
                    data-bs-target="#communityFeedbackCarousel"
                    data-bs-slide="next"
                    aria-label="Next feedback"
                  >
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                  </button>
                </div>
                <div class="card-header training-insights-header">
                  <div class="training-insights-heading">
                    <span class="training-insights-icon"
                      ><i class="bi bi-stars"></i
                    ></span>
                    <div>
                      <span class="training-insights-eyebrow"
                        >Community feedback</span
                      >
                      <h5>Training Highlights &amp; Farmer Recommendations</h5>
                      <p>
                        Key takeaways and requests gathered from the latest
                        farmer training sessions.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="card-body training-insights-body">
                  <div class="training-insights-grid">
                    <section class="training-insights-section">
                      <div class="training-insights-section-title">
                        <i class="bi bi-lightning-charge-fill"></i>
                        <h6>Highlights</h6>
                      </div>
                      <ul class="training-insights-list">
                        <li>
                          <span
                            class="insight-bullet insight-bullet-success"
                          ></span>
                          <div>
                            <strong
                              >Practical sessions encouraged sharing</strong
                            >
                            <p>
                              Participants exchanged farm experiences and local
                              solutions during group activities.
                            </p>
                          </div>
                        </li>
                        <li>
                          <span
                            class="insight-bullet insight-bullet-info"
                          ></span>
                          <div>
                            <strong>Demonstrations made lessons clearer</strong>
                            <p>
                              Live examples on feeding, budgeting, and record
                              keeping were easier for farmers to follow.
                            </p>
                          </div>
                        </li>
                        <li>
                          <span
                            class="insight-bullet insight-bullet-warning"
                          ></span>
                          <div>
                            <strong>Farm planning was a priority topic</strong>
                            <p>
                              Many participants asked how to plan expenses,
                              monitor production, and prepare for seasonal
                              needs.
                            </p>
                          </div>
                        </li>
                      </ul>
                    </section>
                    <section
                      class="training-insights-section training-recommendations-section"
                    >
                      <div class="training-insights-section-title">
                        <i class="bi bi-chat-heart-fill"></i>
                        <h6>Farmer Recommendations</h6>
                      </div>
                      <ul class="training-insights-list">
                        <li>
                          <span class="recommendation-number">1</span>
                          <div>
                            <strong>Extend practical activities</strong>
                            <p>
                              Farmers requested more time for hands-on
                              exercises, especially on feed preparation and farm
                              records.
                            </p>
                          </div>
                        </li>
                        <li>
                          <span class="recommendation-number">2</span>
                          <div>
                            <strong>Share simple reference materials</strong>
                            <p>
                              Provide easy-to-read guides, sample forms, and
                              checklists that can be used at home or on the
                              farm.
                            </p>
                          </div>
                        </li>
                        <li>
                          <span class="recommendation-number">3</span>
                          <div>
                            <strong>Hold barangay-level follow-ups</strong>
                            <p>
                              Conduct short follow-up meetings so farmers can
                              raise concerns after applying the training
                              lessons.
                            </p>
                          </div>
                        </li>
                      </ul>
                    </section>
                  </div>
                </div>
                <div class="card-footer training-insights-footer">
                  <span
                    ><i class="bi bi-clock-history"></i> Updated from the latest
                    training feedback</span
                  ><a href="#" class="training-insights-link"
                    >Read all feedback <i class="bi bi-arrow-right"></i
                  ></a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Offcanvas side navigation bar in mobile -->
    <div
      class="offcanvas offcanvas-start app-mobile-menu"
      tabindex="-1"
      id="mobileNavMenu"
      aria-labelledby="mobileNavMenuLabel"
    >
      <!-- header -->
      <div class="offcanvas-header">
        <!-- Image logo and title -->
        <div class="offcanvas-brand">
          <img
            src="{{ asset('assets/logo/DA SAAD LOGO FULL - GREEN TEXT.png') }}"
            alt="DA-logo"
            class="image-logo"
          />
          <div class="title-wrapper">
            <h5 class="offcanvas-title" id="mobileNavMenuLabel">TMIS</h5>
            <small>Training Management Information System</small>
          </div>
        </div>
        <button
          type="button"
          class="btn offcanvas-close-btn"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        >
          <i class="bi bi-x-octagon-fill"></i>
          <span class="close-btn">Close</span>
        </button>
      </div>
      <!-- Offcanvas body -->
      <div class="offcanvas-body">
        <div class="mobile-user-panel">
          @include('layouts.account-avatar')
          <div class="mobile-user-name-role">
            <strong class="user-name">{{ $accountDisplay['navigationName'] }}</strong>
            <small class="user-role">{{ $accountDisplay['role'] ?? 'Role not assigned' }}</small>
          </div>
        </div>
        <!-- User list navigation bar -->
        <ul class="mobile-nav">
          <li class="mobile-list-navigation">
            <a href="{{ route('admin.dashboard.dashboard') }}" class="nav-link">
              <i class="bi bi-columns-gap"></i>
              <span>Dashboard</span>
            </a>
          </li>
          <li class="mobile-list-navigation">
            <a
              href="#"
              class="nav-link"
              data-bs-toggle="collapse"
              data-bs-target="#participantMobile"
              aria-controls="participantMobile"
              aria-expanded="false"
            >
              <i class="bi bi-people-fill"></i>
              <span>Participants</span>
              <i class="bi bi-chevron-down ms-auto"></i>
            </a>
            <ul class="collapse mobile-subnav" id="participantMobile">
              <li class="mobile-subnav-section-label">Individual</li>
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#createParticipantMobile"
                  aria-controls="createParticipantMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-plus-circle"></i>
                  <span>Create</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul
                  class="collapse mobile-submenu"
                  id="createParticipantMobile"
                >
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.participants.create.register') }}" class="nav-link">
                      <i class="bi bi-person-fill-add"></i>
                      <span>Register</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#detailsParticipantMobile"
                  aria-controls="detailsParticipantMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-file-earmark-text"></i>
                  <span>Details</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul
                  class="collapse mobile-submenu"
                  id="detailsParticipantMobile"
                >
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.participants.details.all-with-status') }}" class="nav-link">
                      <i class="bi bi-list-check"></i>
                      <span>List of Farmers</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.participants.details.inactive') }}" class="nav-link">
                      <i class="bi bi-x-circle-fill"></i>
                      <span>Inactive</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-subnav-section-label">Farmer Association</li>
              <li class="mobile-list-navigation">
                <a href="#" class="nav-link" data-bs-toggle="collapse" data-bs-target="#createFarmerAssociationMobile" aria-controls="createFarmerAssociationMobile" aria-expanded="false">
                  <i class="bi bi-plus-circle"></i>
                  <span>Create</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="createFarmerAssociationMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.participants.create.fa-register') }}" class="nav-link">
                      <i class="bi bi-building-add"></i>
                      <span>Register</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a href="#" class="nav-link" data-bs-toggle="collapse" data-bs-target="#detailsFarmerAssociationMobile" aria-controls="detailsFarmerAssociationMobile" aria-expanded="false">
                  <i class="bi bi-file-earmark-text"></i>
                  <span>Details</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="detailsFarmerAssociationMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.participants.details.fa-all-list') }}" class="nav-link">
                      <i class="bi bi-list-ul"></i>
                      <span>List of FA</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.participants.details.fa-inactive') }}" class="nav-link">
                      <i class="bi bi-x-circle-fill"></i>
                      <span>Inactive</span>
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li class="mobile-list-navigation">
            <a
              href="#"
              class="nav-link"
              data-bs-toggle="collapse"
              data-bs-target="#trainingMobile"
              aria-controls="trainingMobile"
              aria-expanded="false"
            >
              <i class="bi bi-book-fill"></i>
              <span>Training</span>
              <i class="bi bi-chevron-down ms-auto"></i>
            </a>
            <ul class="collapse mobile-subnav" id="trainingMobile">
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#createTrainingMobile"
                  aria-controls="createTrainingMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-plus-circle"></i>
                  <span>Create</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="createTrainingMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.create.register') }}" class="nav-link">
                      <i class="bi bi-pencil-square"></i>
                      <span>Register</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#updateTrainingMobile"
                  aria-controls="updateTrainingMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-arrow-repeat"></i>
                  <span>Update</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="updateTrainingMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.update.for-review') }}" class="nav-link">
                      <i class="bi bi-person-fill-check"></i>
                      <span>For review</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.update.for-approval') }}" class="nav-link">
                      <i class="bi bi-person-fill-check"></i>
                      <span>For approval</span>
                    </a>
                    <a href="{{ route('admin.training.update.for-acceptance') }}" class="nav-link">
                      <i class="bi bi-patch-check-fill"></i>
                      <span>For acceptance</span>
                    </a>
                  </li>


                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#detailsTrainingMobile"
                  aria-controls="detailsTrainingMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-file-earmark-text"></i>
                  <span>Details</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="detailsTrainingMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.details.all-status') }}" class="nav-link">
                      <i class="bi bi-list-check"></i>
                      <span>All status</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.details.approved-accepted') }}" class="nav-link">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>Approved & accepted</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.details.incomplete') }}" class="nav-link">
                      <i class="bi bi-exclamation-circle-fill"></i>
                      <span>Incomplete</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.details.inactive') }}" class="nav-link">
                      <i class="bi bi-x-circle-fill"></i>
                      <span>Inactive</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-subnav-section-label">Facilitator / Resource Person</li>
              <li class="mobile-list-navigation">
                <a href="#" class="nav-link" data-bs-toggle="collapse" data-bs-target="#createFacilitatorRpMobile" aria-controls="createFacilitatorRpMobile" aria-expanded="false">
                  <i class="bi bi-plus-circle"></i>
                  <span>Create</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="createFacilitatorRpMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.create.rp-register') }}" class="nav-link">
                      <i class="bi bi-person-fill-add"></i>
                      <span>Register</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a href="#" class="nav-link" data-bs-toggle="collapse" data-bs-target="#detailsFacilitatorRpMobile" aria-controls="detailsFacilitatorRpMobile" aria-expanded="false">
                  <i class="bi bi-file-earmark-text"></i>
                  <span>Details</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="detailsFacilitatorRpMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.details.rp-list') }}" class="nav-link">
                      <i class="bi bi-list-ul"></i>
                      <span>List of RP</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.training.details.rp-inactive') }}" class="nav-link">
                      <i class="bi bi-x-circle-fill"></i>
                      <span>Inactive</span>
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li class="mobile-list-navigation">
            <a
              href="#"
              class="nav-link"
              data-bs-toggle="collapse"
              data-bs-target="#evaluationMobile"
              aria-controls="evaluationMobile"
              aria-expanded="false"
            >
              <i class="bi bi-file-earmark-check"></i>
              <span>Evaluation</span>
              <i class="bi bi-chevron-down ms-auto"></i>
            </a>
            <ul class="collapse mobile-subnav" id="evaluationMobile">
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#createEvaluationMobile"
                  aria-controls="createEvaluationMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-plus-circle"></i>
                  <span>Create</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="createEvaluationMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.create.pre-test-register') }}" class="nav-link">
                      <i class="bi bi-file-earmark-text"></i>
                      <span>Pre-test Questionaire</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.create.post-test-register') }}" class="nav-link">
                      <i class="bi bi-file-earmark-text"></i>
                      <span>Post-test Questionaire</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.create.training-evaluation-register') }}" class="nav-link">
                      <i class="bi bi-file-earmark-check"></i>
                      <span>Training Evaluation</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.create.rp-evaluation-register') }}" class="nav-link">
                      <i class="bi bi-star-fill"></i>
                      <span>Resource Person Evaluation</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#encodeEvaluationMobile"
                  aria-controls="encodeEvaluationMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-pencil-square"></i>
                  <span>Encode</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul class="collapse mobile-submenu" id="encodeEvaluationMobile">
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.encode.pre-test') }}" class="nav-link">
                      <i class="bi bi-pencil-square"></i>
                      <span>Pre-test Evaluation</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.encode.post-test') }}" class="nav-link">
                      <i class="bi bi-pencil-square"></i>
                      <span>Post-test Evaluation</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.encode.training-evaluation') }}" class="nav-link">
                      <i class="bi bi-pencil-square"></i>
                      <span>Training Evaluation</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.encode.rp-evaluation') }}" class="nav-link">
                      <i class="bi bi-pencil-square"></i>
                      <span>Resource Person Evaluation</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#detailsEvaluationMobile"
                  aria-controls="detailsEvaluationMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-file-earmark-text"></i>
                  <span>Details</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul
                  class="collapse mobile-submenu"
                  id="detailsEvaluationMobile"
                >
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.details.list-questionnaire') }}" class="nav-link">
                      <i class="bi bi-list-check"></i>
                      <span>List Questionnaire</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.details.draft-questionnaire') }}" class="nav-link">
                      <i class="bi bi-file-earmark-text"></i>
                      <span>Draft Questionnaires</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.evaluation.details.inactive') }}" class="nav-link">
                      <i class="bi bi-x-circle-fill"></i>
                      <span>Inactive</span>
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li class="mobile-list-navigation">
            <a
              href="#"
              class="nav-link"
              data-bs-toggle="collapse"
              data-bs-target="#administrationMobile"
              aria-controls="administrationMobile"
              aria-expanded="false"
            >
              <i class="bi bi-sliders"></i>
              <span>Administration</span>
              <i class="bi bi-chevron-down ms-auto"></i>
            </a>
            <ul class="collapse mobile-subnav" id="administrationMobile">
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#createAdministrationMobile"
                  aria-controls="createAdministrationMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-plus-circle"></i>
                  <span>Create</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul
                  class="collapse mobile-submenu"
                  id="createAdministrationMobile"
                >
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.administration.create.register') }}" class="nav-link">
                      <i class="bi bi-pencil-square"></i>
                      <span>Register</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#updateAdministrationMobile"
                  aria-controls="updateAdministrationMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-arrow-repeat"></i>
                  <span>Update</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul
                  class="collapse mobile-submenu"
                  id="updateAdministrationMobile"
                >
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.administration.update.for-approval') }}" class="nav-link">
                      <i class="bi bi-person-fill-check"></i>
                      <span>For approval</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li class="mobile-list-navigation">
                <a
                  href="#"
                  class="nav-link"
                  data-bs-toggle="collapse"
                  data-bs-target="#detailsAdministrationMobile"
                  aria-controls="detailsAdministrationMobile"
                  aria-expanded="false"
                >
                  <i class="bi bi-file-earmark-text"></i>
                  <span>Details</span>
                  <i class="bi bi-chevron-down ms-auto"></i>
                </a>
                <ul
                  class="collapse mobile-submenu"
                  id="detailsAdministrationMobile"
                >
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.administration.details.all-status') }}" class="nav-link">
                      <i class="bi bi-list-check"></i>
                      <span>All status</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.administration.details.approved-accepted') }}" class="nav-link">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>Approved & accepted</span>
                    </a>
                  </li>
                  <li class="mobile-subnav-panel-navigation">
                    <a href="{{ route('admin.administration.details.inactive') }}" class="nav-link">
                      <i class="bi bi-x-circle-fill"></i>
                      <span>Inactive</span>
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li class="mobile-list-navigation">
            <a href="{{ route('admin.users.profile') }}" class="nav-link">
              <i class="bi bi-person-circle"></i>
              <span>Profile</span>
            </a>
          </li>
          <li class="mobile-list-navigation">
            <a href="{{ route('admin.users.logs') }}" class="nav-link">
              <i class="bi bi-journal-text"></i>
              <span>Logs</span>
            </a>
          </li>
          
          <li class="mobile-list-navigation">
            <a href="{{ route('login') }}" class="nav-link sign-out-item">
              <i class="bi bi-box-arrow-right"></i>
              <span>Sign Out</span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- Dashboard report modal -->
    <div
      class="modal fade"
      id="dashboardReportModal"
      tabindex="-1"
      aria-labelledby="dashboardReportModalTitle"
      aria-hidden="true"
    >
      <div
        class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable dashboard-report-dialog"
      >
        <div class="modal-content dashboard-report-modal">
          <div class="modal-header dashboard-report-header">
            <div class="dashboard-report-heading">
              <span class="dashboard-report-icon"
                ><i id="dashboardReportIcon" class="bi bi-table"></i
              ></span>
              <div>
                <span class="dashboard-report-eyebrow">Dashboard details</span>
                <h5 id="dashboardReportModalTitle">Report details</h5>
                <p id="dashboardReportDescription">
                  Review, search, and export the detailed records.
                </p>
              </div>
            </div>
            <button
              type="button"
              class="btn dashboard-report-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body dashboard-report-body">
            <div class="dashboard-report-summary">
              <div>
                <span>Report total</span>
                <strong id="dashboardReportTotal">0</strong>
              </div>
              <p>
                Use the search field to narrow results, or export the records in
                your preferred format.
              </p>
            </div>
            <div class="dashboard-report-table-wrap">
              <table
                id="dashboardReportTable"
                class="display dashboard-report-table w-100"
              >
                <thead></thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer dashboard-report-footer">
            <span
              ><i class="bi bi-shield-check"></i> Dashboard reporting data</span
            >
            <button
              type="button"
              class="btn dashboard-report-dismiss"
              data-bs-dismiss="modal"
            >
              Close
            </button>
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

    <!-- Apexchart js -->
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>

    <!-- DataTables js -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/2.3.5/js/dataTables.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.2.5/js/dataTables.buttons.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.2.5/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.2.5/js/buttons.print.min.js"></script>

    <script src="{{ asset('src/js/shared/nav.js?v=admin-account-visibility-inline-1') }}"></script>
    <script src="{{ asset('src/js/shared/navigation-state.js') }}"></script>
    <script src="{{ asset('src/js/dashboard/scriptv2.js?v=dashboard-card-reports-2') }}"></script>
    <script src="{{ asset('src/js/dashboard/training-highlight-carousel.js') }}"></script>
@endsection
