@extends('layouts.admin')

@section('body-attributes')
class="layout-fixed"
@endsection

@section('head')
<link rel="stylesheet" href="{{ asset('src/css/users/profile-audit.css?v=audit-export-formats-2') }}">
<script src="{{ asset('src/js/users/profile-audit.js?v=audit-approval-1') }}" defer></script>
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
      href="{{ asset('src/css/users/profile.css?v=profile-dropdown-visibility-1') }}"
    />
    <link rel="stylesheet" href="{{ asset('src/css/shared/theme.css') }}" />
    <script src="{{ asset('src/js/shared/theme.js') }}" defer></script>
    <title>DA-TMIS My Profile</title>
    <link rel="stylesheet" href="{{ asset('src/css/shared/table-loading.css') }}" />
    <script src="{{ asset('src/js/shared/table-loading.js') }}" defer></script>
    <!-- Backend integration disabled for now. Uncomment when ready.

-->
      <link rel="stylesheet" href="{{ asset('src/css/users/auth-security.css') }}">
<script type="module" src="{{ asset('src/js/users/profile-security.js') }}"></script>
      <script type="module" src="{{ asset('src/js/users/profile-sessions.js') }}"></script>
      <script type="module" src="{{ asset('src/js/shared/activity-log.js') }}"></script>
      <link rel="stylesheet" href="{{ asset('src/css/notification/notification.css?v=admin-notification-drafts-3') }}">
    <script type="module" src="{{ asset('src/js/notification/notification.js?v=admin-notification-drafts-3') }}"></script>
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
      <main class="app-main"><div class="app-main-body container-fluid px-3 px-md-4 self-profile-page">
<nav aria-label="Breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="{{ route('admin.dashboard.dashboard') }}">Dashboard</a></li><li class="breadcrumb-item">Users</li><li class="breadcrumb-item active" aria-current="page">My profile</li></ol></nav>
<div class="self-page-heading"><div><span class="self-eyebrow">MY ACCOUNT</span><h1>My profile</h1><p>Your personal information, security overview, and account history.</p></div><button id="exportMyAccountProfile" type="button" class="btn self-secondary" hidden><i class="bi bi-download" aria-hidden="true"></i> Transfer profile</button><button id="refreshMyProfile" type="button" class="btn self-secondary"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh profile</button></div>
<section class="self-summary" aria-labelledby="myProfileName"><div class="self-cover"></div><div class="self-summary-body"><span id="myProfileAvatar" class="self-avatar" aria-hidden="true">@if($accountDisplay['photoUrl'])<img src="{{ $accountDisplay['photoUrl'] }}" alt="">@else{{ $accountDisplay['initials'] }}@endif</span><div class="self-identity"><h2 id="myProfileName">{{ $accountDisplay['name'] }}</h2><p id="myProfileEmail">{{ $accountDisplay['email'] }}</p><div class="self-summary-badges"><span id="myProfileRole" class="self-role">{{ $accountDisplay['role'] ?? 'Role not available' }}</span><span id="myProfileStatus" class="self-status">{{ $accountDisplay['status'] ?? 'Not connected' }}</span></div></div><div class="self-summary-office"><span>OFFICE / ORGANIZATION</span><strong id="myProfileOffice">{{ $accountDisplay['office'] ?? 'Not available' }}</strong></div></div></section>
<p id="myProfileNotice" class="self-notice" role="status" aria-live="polite">Your signed-in account is not connected yet. Personal details will appear here when it is available.</p>
<div class="self-tabs" role="tablist" aria-label="Profile sections"><button id="account-tab" role="tab" type="button" aria-controls="account-panel" aria-selected="true" tabindex="0" data-profile-tab="account"><i class="bi bi-person-vcard" aria-hidden="true"></i> Account Profile</button><button id="picture-tab" role="tab" type="button" aria-controls="picture-panel" aria-selected="false" tabindex="-1" data-profile-tab="picture"><i class="bi bi-camera" aria-hidden="true"></i> Profile Picture</button><button id="security-tab" role="tab" type="button" aria-controls="security-panel" aria-selected="false" tabindex="-1" data-profile-tab="security"><i class="bi bi-shield-lock" aria-hidden="true"></i> Security</button><button id="logs-tab" role="tab" type="button" aria-controls="logs-panel" aria-selected="false" tabindex="-1" data-profile-tab="logs"><i class="bi bi-clock-history" aria-hidden="true"></i> Logs</button>@if(($accountDisplay['role'] ?? '') === 'System Administrator')<button id="audit-tab" role="tab" type="button" aria-controls="audit-panel" aria-selected="false" tabindex="-1" data-profile-tab="audit"><i class="bi bi-shield-check" aria-hidden="true"></i> Account &amp; Security Audit</button>@endif
@if(\App\Support\ModuleAccess::isAdministrator(auth()->user()))
<button id="mail-tab" role="tab" type="button" aria-controls="mail-panel" aria-selected="false" tabindex="-1" data-profile-tab="mail"><i class="bi bi-envelope-paper" aria-hidden="true"></i> Mail</button><button id="notification-drafts-tab" role="tab" type="button" aria-controls="notification-drafts-panel" aria-selected="false" tabindex="-1" data-profile-tab="notification-drafts"><i class="bi bi-file-earmark-text" aria-hidden="true"></i> Drafts <span id="notificationDraftCount" class="compose-draft-count">0</span></button>
@endif
</div>

@if(($accountDisplay['role'] ?? '') === 'System Administrator')
<section id="audit-panel" role="tabpanel" aria-labelledby="audit-tab" tabindex="0" hidden data-audit-url="{{ route('audit.index') }}" data-delete-url="{{ route('audit.destroy') }}" data-export-url="{{ route('audit.export') }}" data-super-admin="{{ $isSuperAdministrator ? 'true' : 'false' }}">
  <article class="self-card profile-audit">
    <header><span class="self-card-icon"><i class="bi bi-shield-check" aria-hidden="true"></i></span><div><h2>Account and security audit history</h2><p>Review server-recorded events across the system. Personal changes are redacted except for the account email.</p></div><span class="profile-audit-badge">Administrator only</span><div class="d-flex gap-2"><button id="profileAuditExportOpen" class="btn btn-outline-success" type="button"><i class="bi bi-download" aria-hidden="true"></i> Export logs</button><button id="profileAuditRequestDelete" class="btn btn-outline-danger" type="button"><i class="bi bi-trash3" aria-hidden="true"></i> Request permanent deletion</button></div></header>
    <form id="profileAuditFilters" class="row g-3 mb-4">
      <div class="col-sm-6 col-lg-2"><label class="form-label" for="auditUser">Actor or account</label><input id="auditUser" name="user" type="search" class="form-control" placeholder="Search a name"></div>
      <div class="col-sm-6 col-lg-3"><label class="form-label" for="auditEvent">Event</label><input id="auditEvent" name="event" maxlength="100" class="form-control" placeholder="Exact event name"></div>
      <div class="col-sm-6 col-lg-3"><label class="form-label" for="auditCategory">Category</label><select id="auditCategory" name="category" class="form-select"><option value="">All categories</option>@foreach(['account', 'security', 'import', 'settings', 'trainings', 'participants', 'associations', 'resource_persons', 'questionnaires', 'evaluation', 'notification'] as $category)<option value="{{ $category }}">{{ ucfirst(str_replace('_', ' ', $category)) }}</option>@endforeach</select></div>
      <div class="col-sm-6 col-lg-2"><label class="form-label" for="auditFrom">From</label><input id="auditFrom" name="from" type="date" class="form-control"></div>
      <div class="col-sm-6 col-lg-2"><label class="form-label" for="auditTo">To</label><input id="auditTo" name="to" type="date" class="form-control"></div>
      <div class="col-12 d-flex gap-2"><button class="btn btn-success" type="submit"><i class="bi bi-funnel" aria-hidden="true"></i> Apply filters</button><button class="btn self-secondary" id="profileAuditClear" type="button">Clear</button></div>
    </form>
    <label class="form-check mb-3"><input id="profileAuditDeleteAllFiltered" class="form-check-input" type="checkbox"><span class="form-check-label">Request deletion of all audit entries matching these filters</span></label>
    <div id="profileAuditError" class="alert alert-danger" role="alert" hidden></div>
    <p id="profileAuditStatus" class="text-secondary small" role="status" aria-live="polite">Select this tab to load audit history.</p>
    <div class="table-responsive" id="profileAuditTable" aria-busy="false"><table class="table self-log-table align-middle"><caption class="visually-hidden">System account and security audit events</caption><thead><tr><th scope="col"><input id="profileAuditSelectVisible" class="form-check-input" type="checkbox" aria-label="Select audit entries on this page"></th><th scope="col">Reference</th><th scope="col">Time (Asia/Manila)</th><th scope="col">Actor</th><th scope="col">User</th><th scope="col">Event</th><th scope="col">Result</th><th scope="col">IP address</th><th scope="col">Details</th></tr></thead><tbody id="profileAuditRows"><tr><td colspan="9" class="self-empty">Audit history loads when this tab is opened.</td></tr></tbody></table></div>
    <nav class="d-flex justify-content-between align-items-center gap-3 mt-3" aria-label="Audit history pagination"><button id="profileAuditPrevious" class="btn self-secondary" type="button" disabled><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button><span id="profileAuditPage" class="small text-secondary"></span><button id="profileAuditNext" class="btn self-secondary" type="button" disabled>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button></nav>
    @if($isSuperAdministrator)
      <section id="profileAuditApprovals" class="mt-5" data-pending-url="{{ route('audit.deletions.pending') }}" data-resolve-url="{{ url('/administration/audit-deletion-requests') }}">
        <h3 class="h5">Pending permanent deletion requests</h3>
        <p class="small text-secondary">Review each request before audit records are permanently removed.</p>
        <div id="profileAuditApprovalsStatus" class="small text-secondary" role="status" aria-live="polite">Pending requests load when this tab is opened.</div>
        <div id="profileAuditApprovalsList" class="d-grid gap-2"></div>
      </section>
    @endif
  </article>
  <dialog id="profileAuditDeleteDialog" class="profile-audit-dialog" aria-labelledby="profileAuditDeleteTitle">
    <form method="dialog">
      <h2 id="profileAuditDeleteTitle">Request permanent deletion</h2>
      <p id="profileAuditDeleteDescription">A Super Admin will be notified by email and in the notification center. No logs will be removed unless a Super Admin approves.</p>
      <div class="d-flex justify-content-end gap-2"><button class="btn self-secondary" value="cancel">Cancel</button><button id="profileAuditConfirmDelete" class="btn btn-danger" type="button">Send for approval</button></div>
    </form>
  </dialog>
  <dialog id="profileAuditExportDialog" class="profile-audit-dialog" aria-labelledby="profileAuditExportTitle">
    <form id="profileAuditExportForm" method="get" action="{{ route('audit.export') }}">
      <h2 id="profileAuditExportTitle">Export filtered audit logs</h2>
      <p>Choose the download filename and format. The current filters will be applied.</p>
      <label class="form-label" for="profileAuditFilename">Filename</label>
      <input id="profileAuditFilename" name="filename" class="form-control mb-3" type="text" maxlength="80" pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,79}" value="tmis-account-security-audit" required>
      <fieldset class="profile-audit-format-options">
        <legend class="form-label">Choose file format</legend>
        <label class="profile-audit-format-option"><input type="radio" name="format" value="csv" checked required><span><strong>CSV for Excel</strong><small>Opens in Excel and other spreadsheet apps.</small></span></label>
        <label class="profile-audit-format-option"><input type="radio" name="format" value="txt" required><span><strong>Plain text (.txt)</strong><small>Readable text file with one audit entry per block.</small></span></label>
      </fieldset>
      <div id="profileAuditExportFilters"></div>
      <div class="d-flex justify-content-end gap-2"><button class="btn self-secondary" type="button" id="profileAuditExportCancel">Cancel</button><button class="btn btn-success" type="submit">Download</button></div>
    </form>
  </dialog>
</section>
@endif
<section id="picture-panel" role="tabpanel" aria-labelledby="picture-tab" tabindex="0" hidden>
  <section class="self-card">
    <header><span class="self-card-icon"><i class="bi bi-camera" aria-hidden="true"></i></span><div><h2>Change profile picture</h2><p>Choose a picture to personalize your profile.</p></div></header>
    <div class="self-picture-editor">
          <div id="profilePicturePreview" class="self-picture-preview" aria-label="Profile picture preview">@if($accountDisplay['photoUrl'])<img src="{{ $accountDisplay['photoUrl'] }}" alt="">@else<i class="bi bi-person" aria-hidden="true"></i>@endif</div>
      <div><label for="profilePictureFile" class="form-label">Choose a picture</label><input id="profilePictureFile" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="profilePictureHelp"><p id="profilePictureHelp" class="self-log-disclaimer">JPG, PNG, or WebP, up to 10 MB. Your photo is saved securely to your account.</p><div class="self-picture-actions"><button id="saveProfilePicture" type="button" class="btn btn-success" disabled>Save picture</button><button id="cancelProfilePicture" type="button" class="self-secondary" disabled>Cancel</button><button id="removeProfilePicture" type="button" class="self-secondary" disabled>Remove picture</button></div><p id="profilePictureStatus" role="status" aria-live="polite" class="self-log-disclaimer"></p></div>
    </div>
  </section>
</section>
<section id="account-panel" role="tabpanel" aria-labelledby="account-tab" tabindex="0">
  <div class="self-panel-grid">
    <section class="self-card">
      <header><span class="self-card-icon"><i class="bi bi-person-vcard" aria-hidden="true"></i></span><div><h2>Personal information</h2><p>Your registered identity and contact details.</p></div></header>
      <div class="self-profile-edit-toolbar"><button id="editMyProfile" class="self-secondary" type="button"><i class="bi bi-pencil" aria-hidden="true"></i> Edit information</button></div>
      <dl id="myPersonalDetails" class="self-details"></dl>
      <form id="editMyProfileForm" action="{{ route('profile.update') }}" hidden>
        <div class="self-edit-fields">
          <div><label class="form-label" for="editProfile-firstName">First name</label><input class="form-control" id="editProfile-firstName" name="firstName" type="text" required maxlength="150"></div>
          <div><label class="form-label" for="editProfile-middleName">Middle name</label><input class="form-control" id="editProfile-middleName" name="middleName" type="text" maxlength="150"></div>
          <div><label class="form-label" for="editProfile-lastName">Last name</label><input class="form-control" id="editProfile-lastName" name="lastName" type="text" required maxlength="150"></div>
          <div><label class="form-label" for="editProfile-suffix">Extension</label><input class="form-control" id="editProfile-suffix" name="suffix" type="text" maxlength="20"></div>
          <div><label class="form-label" for="editProfile-dateOfBirth">Date of birth</label><input class="form-control" id="editProfile-dateOfBirth" name="dateOfBirth" type="date"></div>
          <div><label class="form-label" for="editProfile-email">Work email</label><input class="form-control" id="editProfile-email" name="email" type="email" readonly maxlength="150"></div>
          <div><label class="form-label" for="editProfile-phone">Mobile number</label><input class="form-control" id="editProfile-phone" name="phone" type="tel" maxlength="13"></div>
        </div>
        <p class="self-log-disclaimer">Changes are saved to your account. Your sign-in email is managed separately.</p>
        <div class="self-picture-actions"><button class="btn btn-success" type="submit">Save changes</button><button id="cancelEditMyProfile" class="self-secondary" type="button">Cancel</button></div>
      </form>
      <p id="editMyProfileStatus" class="self-log-disclaimer" role="status" aria-live="polite"></p>
    </section>
    <section class="self-card">
      <header><span class="self-card-icon"><i class="bi bi-building" aria-hidden="true"></i></span><div><h2>Account &amp; organization</h2><p>Your role, assignment, and registration dates.</p></div></header>
      <dl id="myAccountDetails" class="self-details"></dl>
      <div class="self-access-breakdown">
        <h3>Your assigned access</h3>
        <p class="self-access-intro">Your effective access combines your role permissions with credential-specific grants and blocks.</p>
        @if($isAdministrator)
          <p class="self-access-full"><i class="bi bi-shield-lock" aria-hidden="true"></i> System Administrator accounts have full system access.</p>
        @else
          <div class="self-access-source">
            <strong>Base role permissions</strong>
            @if(count($permissionBreakdown['role']))
              <ul>@foreach($permissionBreakdown['role'] as $permission)<li>{{ ucwords(str_replace(['.', '_'], [' / ', ' '], $permission)) }}</li>@endforeach</ul>
            @else
              <p>No additional permissions are assigned to your base role.</p>
            @endif
          </div>
          <div class="self-access-source">
            <strong>{{ $accountDisplay['credential'] ? 'Credential add-on: '.$accountDisplay['credential'] : 'Credential permissions' }}</strong>
            @if(count($permissionBreakdown['credential']))
              <ul>@foreach($permissionBreakdown['credential'] as $permission)<li>{{ ucwords(str_replace(['.', '_'], [' / ', ' '], $permission)) }}</li>@endforeach</ul>
            @else
              <p>{{ $accountDisplay['credential'] ? 'No additional permissions are assigned to this credential.' : 'No credential is assigned to your account.' }}</p>
            @endif
          </div>
          @if(count($permissionBreakdown['denied']))
            <div class="self-access-source">
              <strong>Blocked by your credential</strong>
              <ul>@foreach($permissionBreakdown['denied'] as $permission)<li>{{ ucwords(str_replace(['.', '_'], [' / ', ' '], $permission)) }}</li>@endforeach</ul>
            </div>
          @endif
        @endif
      </div>
      <p class="self-help"><i class="bi bi-info-circle" aria-hidden="true"></i> Contact your system administrator to correct your account details or assigned role.</p>
    </section>
  </div>
</section>
<section id="security-panel" role="tabpanel" aria-labelledby="security-tab" tabindex="0" hidden><section class="self-card"><header><span class="self-card-icon"><i class="bi bi-shield-check" aria-hidden="true"></i></span><div><h2>Account security</h2><p>Review the availability of sign-in and protection settings.</p></div></header><details id="passwordSection" class="self-password-section"><summary><span class="self-password-key"><i class="bi bi-key" aria-hidden="true"></i></span><span class="self-password-heading"><strong>Password</strong><span>Expand to view the change-password form.</span></span><span class="self-password-expand">Change password <i class="bi bi-chevron-down" aria-hidden="true"></i></span></summary><form id="passwordChangeForm" class="self-password-form" aria-describedby="passwordFormHelp"><p id="passwordFormHelp" class="self-password-notice"><i class="bi bi-info-circle" aria-hidden="true"></i> Password updates are not connected yet. This form cannot save changes.</p><div class="self-password-field"><label for="password-current">Current password</label><div class="self-password-input"><input id="password-current" type="password" class="form-control" autocomplete="current-password" required maxlength="1024"><button id="toggle-password-current" class="self-password-toggle" type="button" aria-label="Show current password" aria-controls="password-current" aria-pressed="false"><i class="bi bi-eye" aria-hidden="true"></i></button></div></div><div class="self-password-field"><label for="password-new">New password</label><div class="self-password-input"><input id="password-new" type="password" minlength="8" class="form-control" autocomplete="new-password" aria-describedby="passwordFormHelp passwordRequirements passwordRequirementSummary"><button id="toggle-password-new" class="self-password-toggle" type="button" aria-label="Show new password" aria-controls="password-new" aria-pressed="false"><i class="bi bi-eye" aria-hidden="true"></i></button></div></div><div class="self-password-requirements"><h3>Password requirements</h3><ul id="passwordRequirements"><li id="password-rule-length" data-met="false">At least 8 characters</li><li id="password-rule-upper" data-met="false">One uppercase letter (A-Z)</li><li id="password-rule-lower" data-met="false">One lowercase letter (a-z)</li><li id="password-rule-special" data-met="false">One special character</li><li id="password-rule-number" data-met="false">One number (0-9)</li></ul><p id="passwordRequirementSummary" role="status" aria-live="polite">0 of 5 requirements met.</p></div><div class="self-password-field"><label for="password-confirm">Confirm new password</label><div class="self-password-input"><input id="password-confirm" type="password" minlength="8" class="form-control" autocomplete="new-password" aria-describedby="passwordMatchStatus"><button id="toggle-password-confirm" class="self-password-toggle" type="button" aria-label="Show confirm new password" aria-controls="password-confirm" aria-pressed="false"><i class="bi bi-eye" aria-hidden="true"></i></button></div></div><p id="passwordMatchStatus" class="self-password-match" role="status" aria-live="polite">Re-enter your new password to confirm it.</p><div id="passwordVerificationField" class="self-password-field" hidden><label for="passwordVerificationCode">Authenticator or recovery code</label><input id="passwordVerificationCode" class="form-control" autocomplete="one-time-code" maxlength="40"></div><p class="self-password-guidance">Use a unique password that you do not use for other accounts.</p><p id="passwordFormStatus" class="self-password-feedback" role="status" aria-live="polite"></p><div class="self-password-actions"><button id="cancelPasswordChange" class="btn self-secondary" type="button">Cancel</button><button id="saveAccountPassword" class="btn btn-success" type="submit" disabled title="Password updates require a connected account service">Update password</button></div></form></details><details class="self-password-section" id="mfaSection"><summary><span class="self-password-key"><i class="bi bi-phone" aria-hidden="true"></i></span><span class="self-password-heading"><strong>Two-step verification</strong><span id="mfaSummary">Loading authenticator settings.</span></span><span id="mfaBadge" class="self-availability">Loading</span><i class="bi bi-chevron-down" aria-hidden="true"></i></summary><div class="self-mfa-content"><p id="mfaFeedback" class="self-password-notice" role="status" aria-live="polite">Loading account security settings...</p><div id="mfaSignedOut"><!-- Backend-only sign-in control retained for later: <a class="btn self-secondary" href="{{ route('login') }}">Sign in to configure</a> --><button class="btn self-secondary" type="button" disabled title="Backend integration is currently disabled">Set up authenticator</button></div><form id="mfaSetupForm" class="auth-service-form" hidden><p>Use an authenticator app to generate a new code every 30 seconds. Confirm your password to start setup.</p><label for="mfaSetupPassword">Sign-in password</label><div class="self-password-input"><input id="mfaSetupPassword" type="password" class="form-control" autocomplete="current-password" required maxlength="128"><button id="toggle-mfaSetupPassword" class="self-password-toggle" type="button" aria-label="Show sign-in password" aria-controls="mfaSetupPassword" aria-pressed="false"><i class="bi bi-eye" aria-hidden="true"></i></button></div><button type="submit" class="btn btn-success">Set up authenticator</button></form><form id="mfaVerifyForm" class="auth-service-form" hidden><h3>Set up your authenticator</h3><p>In your authenticator app, add a time-based account using the manual key below. The setup expires in 10 minutes.</p><img id="mfaQr" class="self-mfa-qr" alt="Scan this QR code with your authenticator app"><label for="mfaManualKey">Manual setup key</label><input id="mfaManualKey" class="form-control self-mfa-key" readonly autocomplete="off"><label for="mfaVerifyCode">Six-digit authenticator code</label><input id="mfaVerifyCode" type="text" class="form-control" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required><div class="self-password-actions"><button type="button" class="btn self-secondary" id="mfaCancelSetup">Cancel setup</button><button type="submit" class="btn btn-success">Verify and enable</button></div></form><section id="mfaRecoveryPanel" hidden><h3>Save your recovery codes</h3><p>Each code works once if you lose access to your authenticator. These codes are shown only now. Keep them somewhere safe.</p><ul id="mfaRecoveryCodes" class="self-recovery-codes"></ul><div class="self-password-actions"><button type="button" class="btn self-secondary" id="mfaDownloadCodes">Download codes</button><button type="button" class="btn btn-success" id="mfaAcknowledgeCodes">I saved my codes</button></div></section><form id="mfaManageForm" class="auth-service-form" hidden><p id="mfaRecoveryRemaining"></p><label for="mfaManagePassword">Confirm your sign-in password</label><div class="self-password-input"><input id="mfaManagePassword" type="password" class="form-control" autocomplete="current-password" required maxlength="128"><button id="toggle-mfaManagePassword" class="self-password-toggle" type="button" aria-label="Show sign-in password" aria-controls="mfaManagePassword" aria-pressed="false"><i class="bi bi-eye" aria-hidden="true"></i></button></div><label for="mfaManageCode">Authenticator or unused recovery code</label><input id="mfaManageCode" type="text" class="form-control" autocomplete="one-time-code" required maxlength="40"><div class="self-password-actions"><button type="submit" name="operation" value="recovery" class="btn self-secondary">Replace recovery codes</button><button type="submit" name="operation" value="disable" class="btn btn-outline-danger">Disable verification</button></div></form></div></details><details id="deviceSessionsSection" class="self-password-section self-device-section"><summary><span class="self-password-key"><i class="bi bi-laptop" aria-hidden="true"></i></span><span class="self-password-heading"><strong>Devices &amp; sessions</strong><span id="accountSessionSummary">Review devices and manage account sessions.</span></span><span id="accountSessionBadge" class="self-availability">Loading</span><i class="bi bi-chevron-down" aria-hidden="true"></i></summary><div class="self-devices-content"><p id="devicePreviewNotice" class="self-password-notice"><i class="bi bi-info-circle" aria-hidden="true"></i> Loading your account sessions.</p><div class="self-devices-toolbar"><div><h3>Your devices</h3><p id="deviceSessionCount" role="status" aria-live="polite">Loading sessions...</p></div><div class="self-device-toolbar-actions"><button id="resetDevicePreview" class="btn self-secondary" type="button" hidden>Reset preview</button><button id="refreshDeviceSessions" class="btn self-secondary" type="button"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh sessions</button></div></div><p id="deviceSessionFeedback" class="self-device-feedback" role="status" aria-live="polite" hidden></p><div id="deviceSessionList" class="self-device-list" aria-busy="false"></div><div id="deviceSessionsEmpty" class="self-empty" hidden><i class="bi bi-laptop" aria-hidden="true"></i><h3>No sessions to display</h3><p>Refresh to check for available account sessions.</p></div><div class="self-device-footer"><p><i class="bi bi-shield-check" aria-hidden="true"></i> Signing out other devices keeps your current session open.</p><button id="revokeOtherDeviceSessions" class="btn self-device-danger" type="button" disabled><i class="bi bi-box-arrow-right" aria-hidden="true"></i> Sign out all other sessions</button></div></div></details><dialog id="deviceSessionDialog" class="self-session-dialog" aria-labelledby="deviceSessionDialogTitle" aria-describedby="deviceSessionDialogDescription"><form method="dialog"><header><span class="self-session-dialog-icon"><i class="bi bi-box-arrow-right" aria-hidden="true"></i></span><div><span class="self-eyebrow">SESSION MANAGEMENT</span><h2 id="deviceSessionDialogTitle">Sign out this device?</h2></div><button class="self-session-close" type="submit" value="cancel" aria-label="Close confirmation"><i class="bi bi-x-lg" aria-hidden="true"></i></button></header><div class="self-session-dialog-body"><p id="deviceSessionDialogDescription"></p><p id="deviceSessionDialogPreview" class="self-password-notice">Preview only. No real account sessions will be ended.</p></div><footer><button class="btn self-secondary" type="submit" value="cancel">Cancel</button><button id="confirmDeviceSessionRevoke" class="btn self-device-danger" type="button">Sign out session</button></footer></form></dialog><aside class="self-help"><i class="bi bi-info-circle" aria-hidden="true"></i> Contact your administrator if you suspect someone else has access to your account.</aside></section></section>
<section id="logs-panel" role="tabpanel" aria-labelledby="logs-tab" tabindex="0" hidden><section class="self-card"><header><span class="self-card-icon"><i class="bi bi-activity" aria-hidden="true"></i></span><div><h2>Activity logs</h2><p>Changes you made to records and your account, including attachments.</p></div><a class="btn self-secondary self-log-history-link" href="{{ route('admin.users.logs') }}" title="View my record-change history" aria-label="View my record-change history"><i class="bi bi-clock-history" aria-hidden="true"></i></a></header><div class="self-log-tools"><label for="myLogSearch">Search activity<input id="myLogSearch" type="search" class="form-control" placeholder="Search activity, actor, or reference"></label><label for="myLogCategory">Activity type<select id="myLogCategory" class="form-select"><option value="">All activity types</option><option value="registration">Registration</option><option value="profile">Profile updates</option><option value="status">Status changes</option><option value="attachment">Attachments</option></select></label><span id="myLogCount" role="status" aria-live="polite"></span></div><div class="self-log-filters" role="group" aria-label="Filter activity by system area"><button type="button" data-log-source="all" aria-pressed="true">All activity <span id="logCount-all">0</span></button><button type="button" data-log-source="account" aria-pressed="false">Account <span id="logCount-account">0</span></button><button type="button" data-log-source="resource" aria-pressed="false">Resource persons <span id="logCount-resource">0</span></button><button type="button" data-log-source="association" aria-pressed="false">Associations <span id="logCount-association">0</span></button></div><div id="myLogBody" class="self-activity-list"></div><p id="myLogEmpty" class="self-empty">No activity logs are available yet.</p><button id="loadMoreMyLogs" class="btn self-secondary mt-3" type="button" hidden>Load more activity</button></section></section>
@if(\App\Support\ModuleAccess::isAdministrator(auth()->user()))
<section id="mail-panel" role="tabpanel" aria-labelledby="mail-tab" tabindex="0" hidden><div class="compose-page profile-mail-compose"><div class="compose-heading"><div><span class="compose-eyebrow">NOTIFICATION CENTER</span><h2>Create notification</h2><p>Write an update, choose recipients, and review how it will appear.</p></div><a href="{{ route('admin.notification.details.all-notification') }}" class="btn compose-secondary"><i class="bi bi-arrow-left" aria-hidden="true"></i> Open notification inbox</a></div><p class="compose-mode-note"><i class="bi bi-info-circle" aria-hidden="true"></i> Notifications and drafts are saved in TMIS. Notifications appear in recipient inboxes; no email or push is sent.</p><p id="composeFeedback" class="compose-feedback" role="status" aria-live="polite" hidden></p><div class="compose-layout"><form id="notificationComposeForm"><section class="compose-card"><header><span class="compose-section-icon"><i class="bi bi-pencil-square" aria-hidden="true"></i></span><div><span class="compose-step">STEP 01</span><h2>Notification details</h2><p>Give your update a clear title and enough context.</p></div></header><div class="compose-card-body"><div class="compose-fields"><div><label for="notificationType">Type <span>*</span></label><select id="notificationType" class="form-select" required><option value="system">System announcement</option><option value="account">Account</option><option value="training">Training</option><option value="participants">Participants</option><option value="evaluation">Evaluation</option></select></div><div><label for="notificationPriority">Priority</label><select id="notificationPriority" class="form-select"><option value="normal">Normal</option><option value="high">Important</option></select></div><div class="compose-full"><label for="notificationTitle">Title <span>*</span></label><input id="notificationTitle" class="form-control" required maxlength="100" placeholder="e.g. Updated training schedule" aria-describedby="notificationTitleCount"><span id="notificationTitleCount" class="compose-count">0 / 100</span></div><div class="compose-full compose-message-section compose-summary-section"><div class="compose-message-heading"><span class="compose-message-number" aria-hidden="true">1</span><div><label for="notificationSummary">Notification preview</label><p>The short message people see first.</p></div><span class="compose-field-badge">Small modal</span></div><textarea id="notificationSummary" class="form-control" rows="2" maxlength="240" placeholder="Brief details for the small notification preview" aria-describedby="notificationSummaryHint"></textarea><p id="notificationSummaryHint" class="compose-field-help">Optional ? Up to 240 characters. If empty, we?ll use the start of your full message.</p></div><div class="compose-full compose-message-section"><div class="compose-message-heading"><span class="compose-message-number" aria-hidden="true">2</span><div><label for="notificationMessage">Full message <span>*</span></label><p>Add the context, instructions, and details your recipients need.</p></div><span class="compose-field-badge">Full view</span></div><div class="compose-editor-toolbar" role="group" aria-label="Message formatting"><button type="button" data-message-format="bold" aria-label="Bold" title="Bold"><b>B</b></button><button type="button" data-message-format="italic" aria-label="Italic" title="Italic"><i>I</i></button><button type="button" data-message-format="bullet" aria-label="Bullet list" title="Bullet list">&#8226; List</button><button type="button" data-message-format="number" aria-label="Numbered list" title="Numbered list">1. List</button><button type="button" data-message-format="undo" aria-label="Undo" title="Undo">&#8630;</button><button type="button" data-message-format="redo" aria-label="Redo" title="Redo">&#8631;</button></div><textarea id="notificationMessage" class="form-control" rows="6" required maxlength="10000" placeholder="Explain what changed and what the recipient should do next." aria-describedby="notificationMessageHelp notificationMessageCount"></textarea><p id="notificationMessageHelp" class="compose-field-help">Select text to format it. Use **bold**, *italic*, or lists; formatting appears in the preview.</p><span id="notificationMessageCount" class="compose-count">0 / 10,000</span></div><div><label for="notificationRelatedPage">Related page <small>(optional)</small></label><select id="notificationRelatedPage" class="form-select"><option value="">No related page</option><option value="profile">My profile</option><option value="approvals">User approval queue</option><option value="users">User account list</option><option value="training">Training list</option><option value="participants">Participant list</option><option value="questionnaires">Questionnaires</option></select><p class="compose-field-help">Adds a link to an existing page.</p></div><div><label for="notificationReference">Reference ID <small>(optional)</small></label><input id="notificationReference" class="form-control" maxlength="80" placeholder="e.g. TRN-001"></div></div></div></section><section class="compose-card"><header><span class="compose-section-icon"><i class="bi bi-people" aria-hidden="true"></i></span><div><span class="compose-step">STEP 02</span><h2>Choose recipients</h2><p>All registered accounts are listed. Only active, approved accounts can be selected as notification recipients.</p></div></header><div class="compose-card-body"><fieldset class="compose-audience"><legend class="visually-hidden">Notification recipients</legend><label><input name="notificationAudience" type="radio" value="users" checked><span><strong>Specific users</strong><small>Select individual accounts</small></span></label><label><input name="notificationAudience" type="radio" value="role"><span><strong>By role</strong><small>Choose an account role</small></span></label><label><input name="notificationAudience" type="radio" value="all"><span><strong>All active users</strong><small>Everyone in the active list</small></span></label></fieldset><div id="notificationRoleField" hidden><label for="notificationRole">Recipient role</label><select id="notificationRole" class="form-select" disabled><option value="">Select a role</option><option>System Administrator</option><option>Data Encoder</option><option>Program Administrator</option><option>Program Head</option></select></div><div id="notificationUserPicker"><div class="compose-filter-heading"><div><h3>Find recipients</h3><p>Filter the list, then choose who receives your notification.</p></div><div class="compose-recipient-table-actions"><button id="refreshRecipientTable" type="button" class="btn compose-secondary"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh users</button><button id="resetRecipientFilters" type="button" class="btn compose-secondary">Reset filters</button></div></div><div class="compose-recipient-filters"><div><label for="notificationRecipientSearch">Find a user</label><input id="notificationRecipientSearch" class="form-control" type="search" placeholder="Search users..."></div><div><label for="notificationRecipientRoleFilter">Role</label><select id="notificationRecipientRoleFilter" class="form-select"><option value="">All roles</option></select></div><div><label for="notificationRegionFilter">Region</label><select id="notificationRegionFilter" class="form-select"><option value="">All regions</option></select></div><div><label for="notificationOfficeFilter">Office</label><select id="notificationOfficeFilter" class="form-select"><option value="">All offices</option></select></div></div><div class="compose-selection-toolbar"><span id="recipientSelectedCount" role="status">0 selected</span><button id="clearRecipientSelection" type="button" class="btn compose-secondary" disabled>Clear selection</button></div><p id="recipientSelectionHelp" class="compose-field-help">The header checkbox selects all eligible active users across pages. Inactive and pending accounts remain visible but cannot receive notifications.</p><div class="compose-recipient-table-wrap" role="region" aria-label="Recipient users" tabindex="0"><table class="compose-recipient-table"><caption class="visually-hidden">Registered accounts and notification eligibility</caption><thead><tr><th scope="col"><label class="compose-select-column"><input id="selectAllRecipientRows" type="checkbox" aria-label="Select all filtered users">Action</label></th><th scope="col">Attachments</th><th scope="col">ID</th><th scope="col">Year</th><th scope="col">Member</th><th scope="col">Location</th><th scope="col">Office</th></tr></thead><tbody id="notificationRecipientList"></tbody></table></div><p id="notificationRecipientsEmpty" class="compose-field-help" hidden>No matching users. Try another search or reset your filters.</p><div class="compose-recipient-pagination"><label for="recipientRowsPerPage">Rows per page <select id="recipientRowsPerPage" class="form-select"><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="200">200</option><option value="500">500</option><option value="1000">1000</option><option value="all">All</option></select></label><span id="recipientResultRange" role="status" aria-live="polite"></span><nav aria-label="Recipient pagination"><button id="recipientPrevious" class="btn compose-secondary" type="button">Previous</button><span id="recipientPageNumber"></span><button id="recipientNext" class="btn compose-secondary" type="button">Next</button></nav></div></div><p id="notificationAudienceSummary" class="compose-audience-summary" role="status" aria-live="polite">No recipients selected.</p></div></section><div class="compose-form-footer"><span id="notificationDraftStatus" role="status">No draft saved</span><button id="resetNotificationForm" class="btn compose-secondary" type="button">Reset</button><button id="saveNotificationDraft" class="btn compose-secondary" type="button"><i class="bi bi-file-earmark" aria-hidden="true"></i> Save draft</button><button id="createNotification" class="btn compose-primary" type="submit"><i class="bi bi-bell" aria-hidden="true"></i> Create notification</button></div></form><aside class="compose-preview"><div class="compose-preview-heading"><span class="compose-eyebrow">RECIPIENT PREVIEW</span><span class="compose-field-badge">Draft</span></div><article class="compose-preview-card"><span class="compose-preview-icon"><i id="notificationPreviewIcon" class="bi bi-bell" aria-hidden="true"></i></span><div><div class="compose-preview-meta"><span id="notificationPreviewType">System</span><span id="notificationPreviewPriority" hidden>Important</span></div><h3 id="notificationPreviewTitle">Your notification title</h3><p id="notificationPreviewMessage">Your message will appear here as you type.</p><div class="compose-preview-time"><span>Just now</span><span>TMIS</span></div><span id="notificationPreviewReference" class="compose-preview-reference" hidden></span><span id="notificationPreviewAction" class="compose-preview-link" hidden></span></div></article><button type="button" id="previewNotificationModal" class="btn compose-primary compose-preview-open"><i class="bi bi-eye" aria-hidden="true"></i> Preview notification</button><p class="compose-preview-explainer">Opens the small preview. Select <strong>View full details</strong> to read your complete message.</p><dl class="compose-preview-summary"><div><dt>Recipients</dt><dd id="notificationPreviewRecipients">0 users</dd></div><div><dt>Delivery</dt><dd>Local browser inbox</dd></div></dl><div class="compose-preview-tip"><i class="bi bi-lightbulb" aria-hidden="true"></i><div><strong>Keep it actionable</strong><p>Use a short title, explain the update, and choose a related page when a recipient needs to take action.</p></div></div></aside></div><dialog id="confirmNotificationDialog" class="compose-dialog" aria-labelledby="confirmNotificationTitle" aria-describedby="confirmNotificationDescription"><form method="dialog"><header><span class="compose-section-icon"><i class="bi bi-bell" aria-hidden="true"></i></span><div><span class="compose-eyebrow">REVIEW NOTIFICATION</span><h2 id="confirmNotificationTitle">Create this notification?</h2></div><button type="submit" class="compose-close" aria-label="Close confirmation"><i class="bi bi-x-lg" aria-hidden="true"></i></button></header><div class="compose-dialog-body"><p id="confirmNotificationDescription"></p><dl id="confirmNotificationDetails"></dl><p class="compose-field-help">This creates local inbox items only. No external delivery will be sent.</p></div><footer><button type="submit" class="btn compose-secondary">Keep editing</button><button id="confirmNotificationCreate" type="button" class="btn compose-primary">Create locally</button></footer></form></dialog></div></section>
{{-- Keep saved notification drafts available only inside the administrator mail workspace. --}}<section id="notification-drafts-panel" role="tabpanel" aria-labelledby="notification-drafts-tab" tabindex="0" hidden>
  <section class="compose-card notification-drafts-card">
    <header><span class="compose-section-icon"><i class="bi bi-file-earmark-text" aria-hidden="true"></i></span><div><span class="compose-step">NOTIFICATION CENTER</span><h2>Saved notification drafts</h2><p>Reopen a draft to finish editing it, then publish it to the selected users.</p></div><button id="refreshNotificationDrafts" class="btn compose-secondary" type="button"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh drafts</button></header>
    <div class="compose-card-body"><p id="notificationDraftsFeedback" class="compose-feedback" role="status" aria-live="polite" hidden></p><div id="notificationDraftList" class="notification-draft-list" aria-live="polite"></div><div id="notificationDraftsEmpty" class="notification-drafts-empty" hidden><span><i class="bi bi-file-earmark-x" aria-hidden="true"></i></span><h3>No saved drafts</h3><p>Save a message from Mail and it will appear here for editing.</p></div></div>
  </section>
  {{-- Review draft metadata before confirming its permanent removal. --}}
  <dialog id="deleteNotificationDraftDialog" class="compose-dialog notification-draft-delete-dialog" aria-labelledby="deleteNotificationDraftHeading" aria-describedby="deleteNotificationDraftDescription">
    <header><span class="compose-section-icon notification-draft-delete-icon"><i class="bi bi-trash3" aria-hidden="true"></i></span><div><span class="compose-eyebrow">DELETE DRAFT</span><h2 id="deleteNotificationDraftHeading">Delete this draft?</h2></div><button type="button" class="compose-close" data-close-draft-delete aria-label="Close dialog"><i class="bi bi-x-lg" aria-hidden="true"></i></button></header>
    <div class="compose-dialog-body"><p id="deleteNotificationDraftDescription">This permanently removes the saved draft from your drafts. This action cannot be undone.</p><dl><div><dt>Draft title</dt><dd id="deleteNotificationDraftTitle"></dd></div><div><dt>Type</dt><dd id="deleteNotificationDraftType"></dd></div><div><dt>Last saved</dt><dd id="deleteNotificationDraftSavedAt"></dd></div><div><dt>Eligible recipients</dt><dd id="deleteNotificationDraftRecipients"></dd></div></dl><div class="notification-draft-delete-preview"><span>Message preview</span><p id="deleteNotificationDraftSummary"></p></div><p id="deleteNotificationDraftError" class="compose-feedback" role="alert" hidden></p></div>
    <footer><button type="button" class="btn compose-secondary" data-close-draft-delete>Keep draft</button><button id="confirmDeleteNotificationDraft" type="button" class="btn notification-draft-delete-confirm"><i class="bi bi-trash3" aria-hidden="true"></i> Permanently delete draft</button></footer>
  </dialog>
</section>@endif
</div></main>
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
    <script src="{{ asset('src/js/shared/navigation-state.js') }}"></script>
    <script src="{{ asset('src/js/users/profile.js?v=profile-dropdown-visibility-1') }}"></script>
    <script src="{{ asset('src/js/users/profile-picture.js') }}"></script>
@endsection

