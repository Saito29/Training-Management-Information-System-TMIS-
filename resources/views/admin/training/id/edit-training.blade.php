@extends('layouts.admin')

@section('body-attributes')
class="layout-fixed"
@endsection

@section('head')
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
      href="{{ asset('src/css/training/id/view-training.css?v=training-status-badge-1') }}"
    />
    <link rel="stylesheet" href="{{ asset('src/css/training/id/view-training-participants.css') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/training/id/view-training-highlights.css') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/training/id/edit-training-highlights.css') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/training/id/edit-training-attachments-cards.css') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/training/id/view-training-logs.css') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/training/id/edit-training.css?v=training-status-badge-1') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/training/id/edit-training-participants.css?v=training-participant-controls-5') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/shared/theme.css') }}" />
    <link rel="stylesheet" href="{{ asset('src/css/shared/activity-logs.css?v=design-20261109-1') }}" />
    <script src="{{ asset('src/js/shared/theme.js') }}" defer></script>
    <title>DA-TMIS - Edit Training</title>
    <meta name="description" content="Edit Training | DA-TMIS" />
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
              <a
                href="{{ route('admin.dashboard.dashboard') }}"
                class="text-decoration-none"
              >
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
                <a href="{{ route('admin.dashboard.dashboard') }}" class="nav-link">
                  <i class="bi bi-columns-gap"></i>
                  <span class="text-icon-active">Dashboard</span>
                </a>
              </li>
              <li class="nav-item">
                <a
                  href="#"
                  class="nav-link active-page"
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
                        <a
                          href="{{ route('admin.participants.create.register') }}"
                          class="header-sub-collapse-item"
                        >
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
                  <h6 class="dropdown-header user-menu-header">{{ $accountDisplay['navigationName'] }}</h6>
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
      <main class="app-main training-view">
        <div class="app-main-body container-fluid px-3 px-md-4">
          <header class="training-page-header">
            <div>
              <nav aria-label="breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item">Training</li><li class="breadcrumb-item"><a href="{{ route('admin.training.details.all-status') }}">Training List</a></li><li class="breadcrumb-item active" aria-current="page">Edit Training</li></ol></nav>
              <h1>Edit Training Information</h1>
              <p>Complete details, participants, test results, evaluations, and attachments for this training.</p>
            </div>
            <div class="training-header-actions"><button class="btn training-status-update" id="editTrainingStatusButton" type="button" data-bs-toggle="modal" data-bs-target="#editTrainingStatusModal" hidden><i class="bi bi-toggle-on" aria-hidden="true"></i> Update status</button><a class="btn training-back" href="{{ route('admin.training.details.all-status') }}"><i class="bi bi-arrow-left"></i> Back to List</a></div>
          </header>
          <nav class="training-tabs" aria-label="Training sections" role="tablist">
            <button class="training-tab active" id="overview-tab" type="button" role="tab" aria-selected="true" aria-controls="overview-panel" data-panel="overview-panel"><i class="bi bi-house"></i>Overview</button>
            <button class="training-tab" id="participants-tab" type="button" role="tab" aria-selected="false" aria-controls="participants-panel" data-panel="participants-panel"><i class="bi bi-people"></i>Participants</button>
            <button class="training-tab" id="highlights-tab" type="button" role="tab" aria-selected="false" aria-controls="highlights-panel" data-panel="highlights-panel"><i class="bi bi-lightbulb"></i>Highlights / Ways Forward</button>
            <button class="training-tab" id="attachments-tab" type="button" role="tab" aria-selected="false" aria-controls="attachments-panel" data-panel="attachments-panel"><i class="bi bi-paperclip"></i>Attachments</button>
            <button class="training-tab" id="logs-tab" type="button" role="tab" aria-selected="false" aria-controls="logs-panel" data-panel="logs-panel"><i class="bi bi-clock-history"></i>Logs</button>
          </nav>
          <section id="overview-panel" class="training-panel" role="tabpanel" aria-labelledby="overview-tab">
            <form id="editTrainingForm" class="training-edit-form training-card" autocomplete="on">
              <header class="training-edit-header"><div class="training-edit-header-icon"><i class="bi bi-mortarboard" aria-hidden="true"></i></div><div><div class="training-edit-meta"><span class="training-edit-eyebrow" id="editTrainingId">Training record</span><span class="training-status-pill" id="editTrainingStatusBadge" data-status="neutral" aria-label="Workflow status">Status not recorded</span><span class="training-status-pill" id="editTrainingActiveBadge" data-status="neutral" aria-label="Training active status">Status not recorded</span><span class="training-status-pill" id="editTrainingCustomStatusBadge" data-status="custom" aria-label="Additional status" hidden></span></div><h2 id="editTrainingHeading">Good Agricultural Practices (GAP)</h2><p>Edit the details used when registering this training.</p></div><span id="editTrainingState" class="training-edit-state" role="status" aria-live="polite">Up to date</span></header>
              <div class="training-edit-body">
                <section class="training-edit-section" aria-labelledby="editBasicTitle"><div class="training-edit-section-heading"><span>01</span><div><h3 id="editBasicTitle">Training information</h3><p>Title, office, category, and objectives</p></div></div><div class="training-edit-grid">
                  <label>Training title <input class="form-control" name="training_title" maxlength="150" value="Good Agricultural Practices (GAP)" required></label>
                  <label>Implementing office / division / unit <select class="form-select" name="implementing_office" required disabled aria-describedby="implementingOfficeHelp"><option value="">Loading current office</option><option>DA-SAAD</option><option>DA-AMIA</option><option>DA-Livestock</option><option>DA-HVCDP</option><option value="DA-Rice">DA-Rice Program</option><option value="DA-Corn">DA-Corn Program</option><option>DA-ATI</option><option value="Agricultural Training Division (ATD)" selected>Agricultural Training Division (ATD)</option></select><small class="form-text" id="implementingOfficeHelp">The implementing office is fixed for this training and cannot be changed here.</small></label>
                  <label>Training type <select class="form-select" name="training_type" required><option value="">Choose type</option><option>Crop Production</option><option>Organic Agriculture</option><option>Agribusiness</option><option>Livestock and Poultry</option><option>Fisheries</option><option>Post-harvest and Processing</option><option>Farm Mechanization</option><option selected>In-Plant Training</option></select></label>
                  <label>Additional status <select class="form-select" name="customStatusId"><option value="">No additional status</option></select><small class="form-text">Independent of training workflow and Active / Inactive status.</small></label>
                  <label>Partner organization <input class="form-control" name="partner_organization" maxlength="150" placeholder="Optional partner or program"></label>
                  <label class="training-edit-wide">Brief description / objective <textarea class="form-control" name="training_description" rows="3" required>This training aims to enhance the knowledge and skills of farmers on Good Agricultural Practices (GAP) to promote safe, sustainable, and productive farming.</textarea></label>
                </div></section>
                <section class="training-edit-section" aria-labelledby="editTrainerTitle"><div class="training-edit-section-heading"><span>02</span><div><h3 id="editTrainerTitle">Trainer / facilitator</h3><p>Select a registered resource person; their profile details are displayed below.</p></div></div><div id="editTrainerList" class="training-edit-repeat"></div><button class="btn training-edit-add" type="button" id="editAddTrainer"><i class="bi bi-plus-lg"></i> Add trainer</button></section>
                <section class="training-edit-section" aria-labelledby="editScheduleTitle"><div class="training-edit-section-heading"><span>03</span><div><h3 id="editScheduleTitle">Schedule &amp; venue</h3><p>Dates, address, and delivery format</p></div></div><div class="training-edit-grid">
                  <label>Start date <input class="form-control" type="date" name="start_date" value="2025-05-22" required></label><label>End date <input class="form-control" type="date" name="end_date" value="2025-05-23" required></label>
                  <label class="training-edit-wide">Venue / location <input class="form-control" name="venue_location" value="Brgy. San Antonio, Tanauan City" required></label>
                  <label>Region <select class="form-select" name="region_id" required><option value="">Choose region</option><option value="region_4a" selected>Region IV-A (CALABARZON)</option><option value="region_1">Region I (Ilocos Region)</option></select></label>
                  <label>Province <select class="form-select" name="province_id" required></select></label><label>District <select class="form-select" name="district_id" required></select></label><label>Municipality / City <select class="form-select" name="municipality_id" required></select></label><label>Barangay <select class="form-select" name="barangay_id" required></select></label>
                  <fieldset class="training-edit-wide training-edit-mode"><legend>Delivery mode</legend><label><input type="radio" name="delivery_mode" value="In-person" checked><i class="bi bi-people"></i><span>In-person</span></label><label><input type="radio" name="delivery_mode" value="Online"><i class="bi bi-display"></i><span>Online</span></label><label><input type="radio" name="delivery_mode" value="Blended"><i class="bi bi-person-workspace"></i><span>Blended</span></label></fieldset>
                </div></section>
                <section class="training-edit-section" aria-labelledby="editParticipantsTitle"><div class="training-edit-section-heading"><span>04</span><div><h3 id="editParticipantsTitle">Participants &amp; questionnaires</h3><p>Target attendance and selected assessments</p></div></div><div class="training-edit-grid">
                  <label>Target number of participants <input class="form-control" type="number" name="target_participants" min="1" step="1" value="24" required></label><span></span>
                  <div class="training-edit-wide"><span class="training-edit-label">Pre-test questionnaires</span><div id="editPretestList" class="training-edit-repeat"></div><button class="btn training-edit-add" type="button" data-add-questionnaire="pretest"><i class="bi bi-plus-lg"></i> Add pre-test</button></div>
                  <div class="training-edit-wide"><span class="training-edit-label">Post-test questionnaires</span><div id="editPosttestList" class="training-edit-repeat"></div><button class="btn training-edit-add" type="button" data-add-questionnaire="posttest"><i class="bi bi-plus-lg"></i> Add post-test</button></div>
                </div></section>
              </div><footer class="training-edit-footer"><span>Review the update details before saving.</span><button class="btn training-edit-save" type="submit" disabled><i class="bi bi-check2-circle"></i> Save changes</button></footer>
            </form>
            <div class="modal fade" id="editTrainingConfirmModal" tabindex="-1" aria-labelledby="editTrainingConfirmTitle" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content training-edit-confirm-modal">
                  <div class="modal-header">
                    <div><span class="training-edit-eyebrow">Training information</span><h2 class="modal-title fs-5" id="editTrainingConfirmTitle">Confirm your updates</h2></div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <p class="training-edit-confirm-copy">Check the record details before saving your changes.</p>
                    <dl class="training-edit-confirm-details">
                      <div><dt>Training</dt><dd id="editTrainingConfirmName"></dd></div>
                      <div><dt>Current workflow status</dt><dd id="editTrainingConfirmStatus"></dd></div>
                      <div><dt>Updated fields</dt><dd id="editTrainingConfirmChanges"></dd></div>
                    </dl>
                    <p class="training-edit-confirm-note"><i class="bi bi-info-circle" aria-hidden="true"></i> Saving information does not change the workflow status. Details can only be updated while the training is For Review.</p>
                    <p id="editTrainingConfirmError" class="alert alert-danger py-2 mb-0" role="alert" hidden></p>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn training-edit-confirm-save" id="confirmEditTrainingSave"><i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Save updates</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal fade" id="editTrainingStatusModal" tabindex="-1" aria-labelledby="editTrainingStatusTitle" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered">
                <form class="modal-content training-edit-confirm-modal" id="editTrainingStatusForm">
                  <div class="modal-header">
                    <div><span class="training-edit-eyebrow">Training status</span><h2 class="modal-title fs-5" id="editTrainingStatusTitle">Update training status</h2></div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <p class="training-edit-confirm-copy">Choose whether this training is active. Its workflow status will not change.</p>
                    <dl class="training-edit-confirm-details">
                      <div><dt>Training</dt><dd id="editTrainingStatusName"></dd></div>
                      <div><dt>Current workflow status</dt><dd id="editTrainingWorkflowStatus"></dd></div>
                    </dl>
                    <label class="training-status-field" for="editTrainingActiveStatus">Training status
                      <select class="form-select" id="editTrainingActiveStatus" required>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </label>
                    <div class="training-status-field mt-3" id="editTrainingStatusRemarksField" hidden>
                      <label for="editTrainingStatusRemarks">Remarks <span class="text-required">*</span></label>
                      <textarea class="form-control" id="editTrainingStatusRemarks" rows="3" maxlength="2000" placeholder="Explain why this training is inactive"></textarea>
                    </div>
                    <p id="editTrainingStatusError" class="alert alert-danger py-2 mt-3 mb-0" role="alert" hidden></p>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn training-edit-confirm-save" id="saveEditTrainingStatus"><i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Save status</button>
                  </div>
                </form>
              </div>
            </div>
          </section>
          <section id="participants-panel" class="training-panel" role="tabpanel" aria-labelledby="participants-tab" hidden>
            <div class="edit-participants-shell training-card">
              <header class="edit-participants-header"><div><span class="edit-participants-eyebrow">Training roster</span><h2>Participants</h2><p>Manage the farmers attending this training.</p></div><span id="editParticipantTotal" class="edit-participants-total">24 current participants</span></header>
              <nav class="edit-participants-tabs" aria-label="Participant management" role="tablist"><button id="editCurrentTab" class="is-active" type="button" role="tab" aria-selected="true" aria-controls="editCurrentPanel">Current participants</button><button id="editAddTab" type="button" role="tab" aria-selected="false" aria-controls="editAddPanel">Add participants</button></nav>
              <section id="editCurrentPanel" class="edit-participants-content" role="tabpanel" aria-labelledby="editCurrentTab">
                <div class="edit-participants-toolbar edit-participants-toolbar-current">
                  <label class="edit-participants-search">
                    <i class="bi bi-search" aria-hidden="true"></i>
                    <span class="visually-hidden">Search current participants by ID, name, or barangay</span>
                    <input class="form-control" id="editCurrentSearch" type="search" placeholder="Search ID, name, or barangay">
                  </label>
                  <button class="btn edit-participants-icon" type="button" data-refresh-participants="current" aria-label="Refresh current participants">
                    <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh
                  </button>
                  <button class="btn edit-participants-export" type="button" data-export-participants="current">
                    <i class="bi bi-file-earmark-excel" aria-hidden="true"></i> Export XLSX
                  </button>
                </div>
                <div class="edit-participants-table-wrap">
                  <table class="table edit-participants-table">
                    <caption class="visually-hidden">Current participants for this training</caption>
                    <thead>
                      <tr><th scope="col">Farmer ID</th><th scope="col">Full name</th><th scope="col">Region</th><th scope="col">Province</th><th scope="col">Municipality / City</th><th scope="col">Barangay</th></tr>
                    </thead>
                    <tbody id="editCurrentRows"></tbody>
                  </table>
                </div>
                <p class="edit-participants-empty" id="editCurrentEmpty" hidden>No current participants match your search.</p>
                <div class="edit-participants-table-footer"><span id="editCurrentCount"></span><span id="editParticipantFeedback" role="status" aria-live="polite"></span></div>
              </section>
              <section id="editAddPanel" class="edit-participants-content" role="tabpanel" aria-labelledby="editAddTab" hidden>
                <div class="edit-participants-intro">
                  <div><h3>Find farmers to add</h3><p>Only active farmers matching this training's region, province, and municipality are listed.</p></div>
                  <span id="editAvailableCount"></span>
                </div>
                <div class="edit-participants-toolbar">
                  <label class="edit-participants-search">
                    <i class="bi bi-search" aria-hidden="true"></i>
                    <span class="visually-hidden">Search available farmers by ID, name, or barangay</span>
                    <input class="form-control" id="editAvailableSearch" type="search" placeholder="Search ID, name, or barangay">
                  </label>
                  <button class="btn edit-participants-icon" type="button" data-refresh-participants="available" aria-label="Refresh available farmers">
                    <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh
                  </button>
                </div>
                <div class="edit-participants-table-wrap">
                  <table class="table edit-participants-table">
                    <caption class="visually-hidden">Farmers available to add to this training</caption>
                    <thead>
                      <tr><th scope="col"><input id="editSelectAll" type="checkbox" aria-label="Select all matching eligible farmers across all pages"></th><th scope="col">Farmer ID</th><th scope="col">Full name</th><th scope="col">Region</th><th scope="col">Province</th><th scope="col">Municipality / City</th><th scope="col">Barangay</th></tr>
                    </thead>
                    <tbody id="editAvailableRows"></tbody>
                  </table>
                </div>
                <p class="edit-participants-empty" id="editAvailableEmpty" hidden>No active, eligible farmers match this training's location.</p>
                <div class="edit-participants-selection"><span id="editSelectedCount">0 selected</span><span id="editAvailableFeedback" role="status" aria-live="polite"></span><button class="btn edit-participants-add" id="editAddSelected" type="button" disabled><i class="bi bi-person-plus" aria-hidden="true"></i> Add selected participants</button></div>
              </section>
            </div>
          </section>
          <section id="highlights-panel" class="training-panel" role="tabpanel" aria-labelledby="highlights-tab" hidden></section>
          <section id="attachments-panel" class="training-panel" role="tabpanel" aria-labelledby="attachments-tab" hidden></section>
          <section id="logs-panel" class="training-panel" role="tabpanel" aria-labelledby="logs-tab" hidden></section>
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

    <!-- Farmer profile review modals -->
    <div
      class="modal fade"
      id="aboutReviewWorkflowModal"
      tabindex="-1"
      aria-labelledby="aboutReviewWorkflowModalLabel"
      aria-hidden="true"
    >
      <div
        class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable review-workflow-dialog"
      >
        <div class="modal-content review-modal-content">
          <div class="modal-header review-modal-header">
            <div class="review-modal-heading">
              <div>
                <span class="review-modal-eyebrow"
                  >Farmer profile workflow</span
                >
                <h5 class="modal-title" id="aboutReviewWorkflowModalLabel">
                  About Review Workflow
                </h5>
                <p>Each farmer profile progresses through these three steps.</p>
              </div>
            </div>
            <div class="review-modal-header-actions">
              <span class="review-modal-icon" aria-hidden="true"
                ><i class="bi bi-info-circle-fill"></i
              ></span>
              <button
                type="button"
                class="btn review-modal-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div class="modal-body review-modal-body">
            <div class="workflow-transition">
              <span class="status-badge status-neutral">Encoding</span
              ><i class="bi bi-arrow-right"></i
              ><span class="status-badge status-review">For Review</span
              ><i class="bi bi-arrow-right"></i
              ><span class="status-badge status-approval">For Approval</span
              ><i class="bi bi-arrow-right"></i
              ><span class="status-badge status-acceptance">For Acceptance</span
              ><i class="bi bi-arrow-right"></i
              ><span class="status-badge status-approved">Approved &amp; Accepted</span>
            </div>
            <dl class="review-record-details">
              <dt>Encoding</dt>
              <dd>The training record is prepared and supporting information is added before submission.</dd>
              <dt>For Review</dt>
              <dd>
                The training has been submitted and is awaiting
                verification of encoded information and supporting details.
              </dd>
              <dt>For Approval</dt>
              <dd>
                The profile has passed initial review and is awaiting approval.
              </dd>
              <dt>For Acceptance</dt>
              <dd>The training has passed approval and is awaiting the final acceptance decision.</dd>
              <dt>Approved &amp; Accepted</dt>
              <dd>
                The training has completed review, approval, and acceptance and is finalized in the system.
              </dd>
            </dl>
          </div>
          <div class="modal-footer review-modal-footer">
            <div>
              <button
                type="button"
                class="btn review-modal-dismiss"
                data-bs-dismiss="modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      class="modal fade"
      id="reviewForwardModal"
      tabindex="-1"
      aria-labelledby="reviewForwardModalLabel"
      aria-hidden="true"
    >
      <div
        class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable review-workflow-dialog"
      >
        <div class="modal-content review-modal-content">
          <div class="modal-header review-modal-header">
            <div class="review-modal-heading">
              <span class="review-modal-icon"
                ><i class="bi bi-person-vcard-fill"></i
              ></span>
              <div>
                <span class="review-modal-eyebrow">Farmer profile</span>
                <h5 class="modal-title" id="reviewForwardModalLabel">
                  Farmer Profile Details
                </h5>
                <p>Review the submitted farmer profile information.</p>
              </div>
            </div>
            <button
              type="button"
              class="btn review-modal-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body review-modal-body">
            <dl class="review-record-details" id="reviewForwardDetails"></dl>
          </div>
          <div class="modal-footer review-modal-footer">
            <span
              ><i class="bi bi-shield-check"></i> Status updates after
              confirmation</span
            >
            <div>
              <button
                type="button"
                class="btn review-modal-dismiss"
                data-bs-dismiss="modal"
              >
                Close</button
              ><button
                type="button"
                class="btn forward-confirm-button"
                id="confirmForwardButton"
              >
                <i class="bi bi-send-check-fill me-1"></i>Submit for Approval
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal fade" id="addInterventionModal" tabindex="-1" aria-labelledby="addInterventionModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable intervention-form-dialog">
        <div class="modal-content review-modal-content intervention-modal">
          <form id="addInterventionForm">
            <div class="modal-header review-modal-header">
              <div class="review-modal-heading">
                <span class="review-modal-icon" aria-hidden="true"><i class="bi bi-box-seam"></i></span>
                <div>
                  <span class="review-modal-eyebrow">Farmer support</span>
                  <h5 class="modal-title" id="addInterventionModalLabel">Add intervention</h5>
                  <p>Record an intervention, delivery status, and quantity provided to this farmer.</p>
                </div>
              </div>
              <button type="button" class="btn review-modal-close" data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>
            <div class="modal-body review-modal-body intervention-form-body">
              <div class="row g-3 mt-0">
                <div class="col-12">
                  <label class="form-label" for="interventionTitle">Intervention</label>
                  <input class="form-control" id="interventionTitle" name="title" type="text" maxlength="120" placeholder="e.g. Certified rice seeds distribution" required />
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="interventionOffice">Office</label>
                  <input class="form-control" id="interventionOffice" name="office" type="text" maxlength="120" placeholder="e.g. DA RFO IV-A" required />
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="interventionYear">Year covered</label>
                  <input class="form-control" id="interventionYear" name="yearCovered" type="number" min="1900" max="2100" step="1" value="2026" required />
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="interventionAction">Delivery action</label>
                  <select class="form-select" id="interventionAction" name="action" required>
                    <option value="Delivered">Delivered</option>
                    <option value="Not Delivered">Not Delivered</option>
                  </select>
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="interventionType">Type</label>
                  <input class="form-control" id="interventionType" name="type" type="text" maxlength="80" placeholder="e.g. Seeds, fertilizer, training" required />
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="interventionUnit">Unit</label>
                  <input class="form-control" id="interventionUnit" name="unit" type="text" maxlength="40" placeholder="e.g. kg, bags, units" />
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="interventionQty">Quantity</label>
                  <input class="form-control" id="interventionQty" name="qty" type="number" min="0" step="any" placeholder="Enter quantity" />
                </div>
                <div class="col-12">
                  <label class="form-label" for="interventionRemarks">Remarks <span class="intervention-optional-label">(optional)</span></label>
                  <textarea class="form-control" id="interventionRemarks" name="remarks" rows="3" maxlength="500" placeholder="Add delivery notes or other details"></textarea>
                </div>
              </div>
              <p class="intervention-form-error" id="interventionFormError" role="alert"></p>
            </div>
            <div class="modal-footer review-modal-footer">
              <span><i class="bi bi-shield-check me-1" aria-hidden="true"></i>Details are saved for this browser.</span>
              <div>
                <button type="button" class="btn review-modal-dismiss" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn intervention-save-button"><i class="bi bi-check2 me-1" aria-hidden="true"></i>Save intervention</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    <!-- Modal toast notification -->
    <div class="toast-container position-fixed top-0 end-0 p-3">
      <div
        id="reviewToast"
        class="toast review-toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-bs-delay="6000"
      >
        <div class="toast-header">
          <i id="reviewToastIcon" class="bi bi-check-circle-fill me-2"></i
          ><strong id="reviewToastTitle" class="me-2"
            >Farmer Profile Submitted</strong
          ><small id="reviewToastTime" class="text-body-secondary me-auto"
            >Now</small
          ><button
            type="button"
            class="btn-close"
            data-bs-dismiss="toast"
            aria-label="Close"
          ></button>
        </div>
        <div id="reviewToastMessage" class="toast-body">
          Farmer profile submitted for approval.
        </div>
      </div>
      <div
        id="attachmentToast"
        class="toast attachment-toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-bs-delay="6000"
      >
        <div class="toast-header">
          <i id="attachmentToastIcon" class="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
          <strong id="attachmentToastTitle" class="me-2">Attachments staged</strong>
          <small id="attachmentToastTime" class="text-body-secondary me-auto">Now</small>
          <button type="button" class="btn attachment-toast-close" data-bs-dismiss="toast" aria-label="Close notification">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div id="attachmentToastMessage" class="toast-body"></div>
      </div>
    </div>

    <!-- Add attachment dialog -->
    <div class="modal fade" id="addDocumentModal" tabindex="-1" aria-labelledby="addDocumentModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable attachment-form-dialog">
        <div class="modal-content review-modal-content attachment-modal">
          <form id="addAttachmentForm" class="attachment-form">
            <div class="modal-header review-modal-header">
              <div class="review-modal-heading">
                <span class="review-modal-icon" aria-hidden="true"><i class="bi bi-file-earmark-plus"></i></span>
                <div>
                  <span class="review-modal-eyebrow">Training documents</span>
                  <h5 class="modal-title" id="addDocumentModalLabel">Upload attachments</h5>
                  <p>Choose image or PDF files. Set each file's type and year in the queue before saving.</p>
                </div>
              </div>
              <button type="button" class="btn review-modal-close" data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>
            <div class="modal-body review-modal-body">
              <label class="form-label" for="attachmentFiles">Choose files</label>
              <input class="form-control" id="attachmentFiles" name="attachmentFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf" multiple />
              <div class="form-text">Accepted formats: PDF, JPG, and PNG. Files are staged for review before being added to the library.</div>
              <div class="form-text text-danger" id="uploadAttachmentFeedback" role="alert"></div>
            </div>
            <div class="modal-footer review-modal-footer">
              <span><i class="bi bi-info-circle me-1" aria-hidden="true"></i>Files are staged before they are added.</span>
              <div>
                <button type="button" class="btn review-modal-dismiss" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn attachment-submit-button"><i class="bi bi-list-check me-1" aria-hidden="true"></i>Stage files</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit attachment dialog -->
    <div class="modal fade" id="editAttachmentModal" tabindex="-1" aria-labelledby="editAttachmentModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable attachment-form-dialog">
        <div class="modal-content review-modal-content attachment-modal">
          <form id="editAttachmentForm" class="attachment-form">
            <div class="modal-header review-modal-header">
              <div class="review-modal-heading">
                <span class="review-modal-icon" aria-hidden="true"><i class="bi bi-pencil-square"></i></span>
                <div>
                  <span class="review-modal-eyebrow">Training documents</span>
                  <h5 class="modal-title" id="editAttachmentModalLabel">Edit attachment details</h5>
                  <p>Update the document category and year covered, and adjust the optional remarks.</p>
                </div>
              </div>
              <button type="button" class="btn review-modal-close" data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>
            <div class="modal-body review-modal-body">
              <label class="form-label" for="editAttachmentType">Document type</label>
              <select class="form-select" id="editAttachmentType" required>
                <option value="Training Program">Training Program</option>
                <option value="Attendance Sheet">Attendance Sheet</option>
                <option value="Training Materials">Training Materials</option>
                <option value="Photos">Photos</option>
                <option value="Other Files">Other Files</option>
              </select>
              <label class="form-label mt-3" for="editAttachmentYear">Year covered</label>
              <select class="form-select" id="editAttachmentYear" required></select>
              <label class="form-label mt-3" for="editAttachmentRemarks">Remarks <span class="attachment-optional-label">(optional)</span></label>
              <textarea class="form-control" id="editAttachmentRemarks" rows="4" maxlength="500" placeholder="Add a note about this attachment"></textarea>
            </div>
            <div class="modal-footer review-modal-footer">
              <span id="editAttachmentChangeHint" class="attachment-edit-hint" aria-live="polite"><i class="bi bi-shield-check me-1" aria-hidden="true"></i><span id="editAttachmentChangeText">No changes to save.</span></span>
              <div>
                <button type="button" class="btn review-modal-dismiss" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn attachment-submit-button" id="saveAttachmentChanges" disabled><i class="bi bi-check2 me-1" aria-hidden="true"></i>Save changes</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Attachment viewer -->
    <div class="modal fade attachment-viewer-modal" id="attachmentViewerModal" tabindex="-1" aria-labelledby="attachmentViewerTitle" aria-hidden="true">
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-content">
          <div class="modal-header attachment-viewer-header">
            <div class="attachment-viewer-heading">
              <h5 class="modal-title" id="attachmentViewerTitle">Attachment</h5>
              <span id="attachmentViewerMeta"></span>
            </div>
            <div class="attachment-viewer-actions">
              <button type="button" class="btn btn-light btn-sm" id="viewerDownload" title="Download attachment"><i class="bi bi-download" aria-hidden="true"></i><span class="visually-hidden">Download attachment</span></button>
              <button type="button" class="btn btn-light btn-sm" id="viewerZoomOut" title="Zoom out"><i class="bi bi-zoom-out" aria-hidden="true"></i><span class="visually-hidden">Zoom out</span></button>
              <button type="button" class="btn btn-light btn-sm" id="viewerZoomIn" title="Zoom in"><i class="bi bi-zoom-in" aria-hidden="true"></i><span class="visually-hidden">Zoom in</span></button>
              <button type="button" class="btn btn-light btn-sm" id="viewerReset" title="Reset view"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i><span class="visually-hidden">Reset view</span></button>
              <button type="button" class="btn btn-light btn-sm" id="viewerOpenNewTab" title="Open in new tab"><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i><span class="visually-hidden">Open in new tab</span></button>
              <button type="button" class="btn btn-light btn-sm" id="viewerEdit" title="Edit attachment"><i class="bi bi-pencil" aria-hidden="true"></i><span class="visually-hidden">Edit attachment</span></button>
              <button type="button" class="btn btn-light btn-sm text-danger" id="viewerDelete" title="Delete attachment"><i class="bi bi-trash" aria-hidden="true"></i><span class="visually-hidden">Delete attachment</span></button>
              <button type="button" class="btn-close ms-1" data-bs-dismiss="modal" aria-label="Close attachment viewer"></button>
            </div>
          </div>
          <div class="modal-body attachment-viewer-body">
            <button type="button" class="attachment-viewer-nav attachment-viewer-prev" id="viewerPrevious" aria-label="Previous attachment"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
            <div class="attachment-viewer-stage" id="attachmentViewerStage">
              <img id="attachmentViewerImage" alt="" hidden />
              <iframe id="attachmentViewerPdf" title="PDF attachment preview" hidden></iframe>
            </div>
            <button type="button" class="attachment-viewer-nav attachment-viewer-next" id="viewerNext" aria-label="Next attachment"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
          </div>
        </div>
      </div>
    </div>

    <div class="attachment-delete-notice" id="attachmentDeleteNotice" role="status" aria-live="polite" hidden>
      <div class="attachment-delete-copy">
        <i class="bi bi-trash3" aria-hidden="true"></i>
        <span id="attachmentDeleteMessage">Attachment deletion scheduled.</span>
        <strong id="attachmentDeleteCountdown">10</strong>
      </div>
      <div class="attachment-delete-actions">
        <button type="button" class="btn btn-sm btn-light" id="cancelAttachmentDelete">Undo</button>
        <button type="button" class="btn btn-sm btn-danger" id="confirmAttachmentDelete">Delete now</button>
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
    <script src="{{ asset('src/js/shared/navigation-state.js') }}"></script>
    <script id="trainingQuestionnaireData" type="application/json">
      {"pretest":[{"id":"PRE-GEN-01","name":"General Knowledge Assessment (Pre-test)","itemCount":12,"averageCorrect":8.1},{"id":"PRE-CROP-01","name":"Crop Production Pre-test","itemCount":12,"averageCorrect":8.328}],"posttest":[{"id":"POST-GEN-01","name":"General Knowledge Assessment (Post-test)","itemCount":12,"averageCorrect":10.2},{"id":"POST-CROP-01","name":"Crop Production Post-test","itemCount":12,"averageCorrect":10.5168}]}
    </script>
    <script src="{{ asset('src/js/training/id/view-training-assessments.js') }}"></script>
    <script src="{{ asset('src/js/training/id/edit-training-participants.js?v=training-participant-controls-4') }}"></script>
    <script src="{{ asset('src/js/training/id/view-training-highlights.js') }}"></script>
    <script src="{{ asset('src/js/training/id/edit-training-highlights.js') }}"></script>
    <script src="{{ asset('src/js/training/id/edit-training-attachments-cards.js') }}"></script>
    <script src="{{ asset('src/js/training/id/view-training-logs.js?v=live-logs-20261109-3') }}"></script>
    <script src="{{ asset('src/js/training/id/edit-training.js?v=training-status-badge-1') }}"></script>
@endsection
