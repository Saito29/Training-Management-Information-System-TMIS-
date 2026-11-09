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
      href="{{ asset('src/css/training/details/all-status.css') }}"
    />
    <link rel="stylesheet" href="{{ asset('src/css/shared/theme.css') }}" />
    <script src="{{ asset('src/js/shared/theme.js') }}" defer></script>
    <title>Evaluation Drafts | TMIS</title>
    <link rel="stylesheet" href="{{ asset('src/css/evaluation/details/list-questionnaire.css') }}" />
  <link rel="stylesheet" href="{{ asset('src/css/evaluation/details/draft-questionnaire.css') }}" />
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
      <main class="app-main">
  <div class="app-main-body container-fluid px-3 px-md-4">
    <div class="row first-row"><div class="col-12 app-content-header m-0 p-0"><div class="container-fluid p-0"><div class="row g-3 align-items-stretch">
      <div class="col-12 col-xl-8"><nav aria-label="breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item">Evaluation</li><li class="breadcrumb-item">Details</li><li class="breadcrumb-item active" aria-current="page">Drafts</li></ol></nav><h4 class="content-header">Evaluation Drafts</h4><span class="content-info">Continue saved questionnaire registrations and evaluation encodings.</span></div>
      <div class="col-12 col-xl-4"><div class="card h-100"><div class="card-header"><h6 class="card-title mb-0">About this page</h6></div><div class="card-body"><div class="status-info-list"><div class="status-info-item"><div class="status-info-badge info-scope"><i class="bi bi-file-earmark-text"></i></div><div class="status-info-content"><h6>Saved drafts</h6><p>Questionnaires and evaluation results that are still in progress.</p></div></div><div class="status-info-item"><div class="status-info-badge info-filter"><i class="bi bi-arrow-clockwise"></i></div><div class="status-info-content"><h6>Pick up where you left off</h6><p>Use Continue to reopen a draft. Refresh and export each table independently.</p></div></div></div></div></div></div>
    </div></div></div></div>
    <div class="row second-row"><div class="col-12 mb-3"><section class="card for-review-table-card draft-table-card" aria-labelledby="draftQuestionnaireTitle">
      <header class="card-header for-review-table-header"><div><h5 class="for-review-table-title" id="draftQuestionnaireTitle">Draft Questionnaires</h5><p class="for-review-table-description">Saved questionnaire drafts across all four evaluation types.</p></div><div class="table-header-actions"><button class="btn table-icon-button" type="button" id="draftQuestionnaireRefresh" aria-label="Refresh draft questionnaires" title="Refresh"><i class="bi bi-arrow-clockwise"></i></button><button class="btn table-icon-button table-export-button" type="button" id="draftQuestionnaireExport" aria-label="Export draft questionnaires to Excel" title="Export Excel"><i class="bi bi-file-earmark-excel-fill"></i></button></div></header>
      <div class="card-body for-review-table-body"><div class="draft-filter-bar"><div class="draft-filter"><label for="draftQuestionnaireType">Questionnaire Type</label><select id="draftQuestionnaireType" class="form-select"><option value="">All types</option><option>Pre-test</option><option>Post-test</option><option>Resource Person Evaluation</option><option>Training Evaluation</option></select></div><div class="draft-filter"><label for="draftQuestionnaireSearch">Search</label><input id="draftQuestionnaireSearch" class="form-control" type="search" placeholder="Title, ID, or office"></div><button class="btn draft-clear-filter" type="button" id="draftQuestionnaireClear"><i class="bi bi-x-circle" aria-hidden="true"></i> Clear filters</button></div>
      <div class="questionnaire-page-bar"><div class="questionnaire-table-controls"><label for="draftQuestionnaireSizeTop">Rows per page</label><select id="draftQuestionnaireSizeTop" class="form-select form-select-sm" data-draft-size="questionnaire"><option>10</option><option>20</option><option>50</option><option>100</option><option>200</option><option>500</option><option>1000</option><option value="all">All</option></select></div><div class="review-pagination" data-draft-pagination="questionnaire"></div></div>
      <div class="table-responsive questionnaire-table-scroll"><table class="table table-hover draft-table" id="draftQuestionnaireTable" aria-busy="true"><thead><tr><th>Action</th><th>Status</th><th>Questionnaire ID</th><th>Questionnaire Title</th><th>Type</th><th>Region</th><th>Office</th><th>Items</th><th>Last Saved</th></tr></thead><tbody id="draftQuestionnaireRows"><tr class="draft-loading-row"><td colspan="9"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading drafts...</td></tr></tbody></table></div>
      <div class="questionnaire-page-bar"><div class="questionnaire-table-controls"><label for="draftQuestionnaireSizeBottom">Rows per page</label><select id="draftQuestionnaireSizeBottom" class="form-select form-select-sm" data-draft-size="questionnaire"><option>10</option><option>20</option><option>50</option><option>100</option><option>200</option><option>500</option><option>1000</option><option value="all">All</option></select></div><div class="review-pagination" data-draft-pagination="questionnaire"></div></div>
      </div></section></div>
      <div class="col-12 mb-2"><section class="card for-review-table-card draft-table-card" aria-labelledby="draftEncodingTitle">
      <header class="card-header for-review-table-header"><div><h5 class="for-review-table-title" id="draftEncodingTitle">Draft Encoding</h5><p class="for-review-table-description">Pre-test, post-test, training, and resource person evaluations saved before submission.</p></div><div class="table-header-actions"><button class="btn table-icon-button" type="button" id="draftEncodingRefresh" aria-label="Refresh encoding drafts" title="Refresh"><i class="bi bi-arrow-clockwise"></i></button><button class="btn table-icon-button table-export-button" type="button" id="draftEncodingExport" aria-label="Export encoding drafts to Excel" title="Export Excel"><i class="bi bi-file-earmark-excel-fill"></i></button></div></header>
      <div class="card-body for-review-table-body"><div class="draft-filter-bar draft-encoding-filter-bar"><div class="draft-filter"><label for="draftEncodingType">Evaluation Type</label><select id="draftEncodingType" class="form-select"><option value="">All types</option><option>Pre-test</option><option>Post-test</option><option>Training Evaluation</option><option>Resource Person Evaluation</option></select></div><div class="draft-filter"><label for="draftEncodingAssociation">Association</label><select id="draftEncodingAssociation" class="form-select"><option value="">All associations</option></select></div><div class="draft-filter"><label for="draftEncodingSearch">Search</label><input id="draftEncodingSearch" class="form-control" type="search" placeholder="Farmer or questionnaire"></div><button class="btn draft-clear-filter" type="button" id="draftEncodingClear"><i class="bi bi-x-circle" aria-hidden="true"></i> Clear filters</button></div>
      <div class="questionnaire-page-bar"><div class="questionnaire-table-controls"><label for="draftEncodingSizeTop">Rows per page</label><select id="draftEncodingSizeTop" class="form-select form-select-sm" data-draft-size="encoding"><option>10</option><option>20</option><option>50</option><option>100</option><option>200</option><option>500</option><option>1000</option><option value="all">All</option></select></div><div class="review-pagination" data-draft-pagination="encoding"></div></div>
      <div class="table-responsive questionnaire-table-scroll"><table class="table table-hover draft-table" id="draftEncodingTable" aria-busy="true"><thead><tr><th>Action</th><th>Farmer</th><th>Evaluation</th><th>Questionnaire</th><th>Association</th><th>Score / Ratings</th><th>Last Saved</th></tr></thead><tbody id="draftEncodingRows"><tr class="draft-loading-row"><td colspan="7"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading drafts...</td></tr></tbody></table></div>
      <div class="questionnaire-page-bar"><div class="questionnaire-table-controls"><label for="draftEncodingSizeBottom">Rows per page</label><select id="draftEncodingSizeBottom" class="form-select form-select-sm" data-draft-size="encoding"><option>10</option><option>20</option><option>50</option><option>100</option><option>200</option><option>500</option><option>1000</option><option value="all">All</option></select></div><div class="review-pagination" data-draft-pagination="encoding"></div></div>
      </div></section></div></div>
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

    <!-- Modal toast notification -->
    <div class="toast-container position-fixed top-0 end-0 p-3">
      <div
        id="reviewToast"
        class="toast review-toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-bs-delay="11000"
      >
        <div class="toast-header">
          <i id="reviewToastIcon" class="bi bi-check-circle-fill me-2"></i
          ><strong id="reviewToastTitle" class="me-2"
            >Trainings Refreshed</strong
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
          Training status records loaded.
        </div>
        <div class="toast-body pt-0">
          <button type="button" class="btn btn-sm btn-outline-primary" id="undoDeleteButton" hidden>
            Undo (10s)
          </button>
        </div>
      </div>
    </div>

    <!-- Delete training confirmation -->
    <div
      class="modal fade"
      id="deleteConfirmModal"
      tabindex="-1"
      aria-labelledby="deleteConfirmModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteConfirmModalLabel">
              <i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>Delete Training
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>The training will be deleted after a 10-second undo period.</p>
            <dl class="delete-training-details">
              <dt>Training ID</dt><dd id="deleteTrainingId"></dd>
              <dt>Training Title</dt><dd id="deleteTrainingTitle"></dd>
              <dt>Training Type</dt><dd id="deleteTrainingType"></dd>
              <dt>Status</dt><dd><span id="deleteTrainingStatus" class="status-badge"></span></dd>
            </dl>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="confirmDeleteButton">
              <i class="bi bi-trash-fill me-1"></i>Delete Training
            </button>
          </div>
        </div>
      </div>
    </div>

    <div id="draftQuestionnaireUndoNotices" class="draft-undo-stack" aria-live="polite"></div>

    <div class="modal fade" id="deleteDraftQuestionnaireModal" tabindex="-1" aria-labelledby="deleteDraftQuestionnaireModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered draft-delete-dialog">
        <div class="modal-content draft-delete-modal">
          <div class="modal-header draft-delete-header">
            <span class="draft-delete-icon"><i class="bi bi-trash3" aria-hidden="true"></i></span>
            <div>
              <span class="draft-delete-eyebrow">Draft questionnaire</span>
              <h5 class="modal-title" id="deleteDraftQuestionnaireModalLabel">Delete this draft?</h5>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="draft-delete-intro">The draft will be removed from your list. You can restore it within 10 seconds after deleting.</p>
            <dl class="draft-delete-details">
              <div class="draft-delete-name"><dt>Questionnaire</dt><dd id="deleteDraftQuestionnaireTitle"></dd></div>
              <div><dt>ID</dt><dd id="deleteDraftQuestionnaireId"></dd></div>
              <div><dt>Type</dt><dd id="deleteDraftQuestionnaireType"></dd></div>
              <div><dt>Region</dt><dd id="deleteDraftQuestionnaireRegion"></dd></div>
              <div><dt>Office</dt><dd id="deleteDraftQuestionnaireOffice"></dd></div>
              <div><dt>Items</dt><dd id="deleteDraftQuestionnaireItems"></dd></div>
              <div><dt>Last saved</dt><dd id="deleteDraftQuestionnaireSaved"></dd></div>
            </dl>
          </div>
          <div class="modal-footer draft-delete-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Keep draft</button>
            <button type="button" class="btn btn-danger" id="confirmDeleteDraftQuestionnaire"><i class="bi bi-trash3 me-2" aria-hidden="true"></i>Delete draft</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="deleteDraftEncodingModal" tabindex="-1" aria-labelledby="deleteDraftEncodingModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered draft-delete-dialog">
        <div class="modal-content draft-delete-modal">
          <div class="modal-header draft-delete-header">
            <span class="draft-delete-icon"><i class="bi bi-trash3" aria-hidden="true"></i></span>
            <div>
              <span class="draft-delete-eyebrow">Draft encoding</span>
              <h5 class="modal-title" id="deleteDraftEncodingModalLabel">Delete this encoding?</h5>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="draft-delete-intro">The saved answers will be removed from your draft list. You can restore them within 10 seconds after deleting.</p>
            <dl class="draft-delete-details">
              <div class="draft-delete-name"><dt>Questionnaire</dt><dd id="deleteDraftEncodingTitle"></dd></div>
              <div><dt>Evaluation type</dt><dd id="deleteDraftEncodingType"></dd></div>
              <div><dt>Farmer</dt><dd id="deleteDraftEncodingFarmer"></dd></div>
              <div><dt>Association</dt><dd id="deleteDraftEncodingAssociation"></dd></div>
              <div><dt>Progress</dt><dd id="deleteDraftEncodingProgress"></dd></div>
              <div><dt>Last saved</dt><dd id="deleteDraftEncodingSaved"></dd></div>
            </dl>
          </div>
          <div class="modal-footer draft-delete-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Keep draft</button>
            <button type="button" class="btn btn-danger" id="confirmDeleteDraftEncoding"><i class="bi bi-trash3 me-2" aria-hidden="true"></i>Delete encoding</button>
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
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

    <!-- nav -->
    <script src="{{ asset('src/js/shared/nav.js?v=admin-account-visibility-inline-1') }}"></script>
    <script src="{{ asset('src/js/shared/navigation-state.js') }}"></script>
    <script src="{{ asset('src/js/evaluation/details/sample-data.js') }}"></script>
    <script src="{{ asset('src/js/evaluation/details/draft-questionnaire.js') }}"></script>
@endsection
