@extends('layouts.admin')

@section('body-attributes')

class="layout-fixed"

@endsection

@section('head')
<link rel="stylesheet" href="{{ asset('src/css/shared/system-settings.css?v=settings-active-tab-theme-1') }}">
<script src="{{ asset('src/js/shared/system-settings.js?v=visibility-scope-select-all-refresh-1') }}" defer></script>
<script src="{{ asset('src/js/shared/maintenance-schedule.js?v=auto-expire-1') }}" defer></script>
{{-- Load the toast API before the settings feedback script that displays flashed messages. --}}
<script src="{{ asset('src/js/shared/toast.js?v=settings-feedback-toast-1') }}" defer></script>
<script src="{{ asset('src/js/shared/operations.js?v=settings-feedback-toast-1') }}" defer></script>

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

    <link rel="stylesheet" href="{{ asset('src/css/shared/theme.css') }}" />

    <script src="{{ asset('src/js/shared/theme.js') }}" defer></script>

    <title>TMIS - System settings</title>

    <link rel="stylesheet" href="{{ asset('src/css/shared/table-loading.css') }}" />

    <script src="{{ asset('src/js/shared/table-loading.js') }}" defer></script>

    <!-- Backend integration disabled for now. Uncomment when ready.

-->

      <script type="module" src="{{ asset('src/js/shared/activity-log.js') }}"></script>

  <link rel="stylesheet" href="{{ asset('src/css/shared/toast.css?v=settings-feedback-toast-1') }}">

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

      <main class="app-main"><div class="container-fluid settings-page">
@php
    $selectedRegions = array_map('strval', json_decode($scope->region_ids ?? '[]', true) ?? []);
    $selectedOffices = array_map('strval', json_decode($scope->office_ids ?? '[]', true) ?? []);
    $maintenanceStartsAt = $settings->maintenance_starts_at ? \Illuminate\Support\Carbon::parse($settings->maintenance_starts_at, 'UTC') : null;
    $underMaintenance = $settings->maintenance_enabled
        && (! $maintenanceStartsAt || $maintenanceStartsAt->isPast())
        && (! $settings->maintenance_until || \Illuminate\Support\Carbon::parse($settings->maintenance_until, 'UTC')->isFuture());
@endphp
<header class="settings-page-header"><div><nav aria-label="breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="{{ route('admin.dashboard.dashboard') }}">Home</a></li><li class="breadcrumb-item active" aria-current="page">System settings</li></ol></nav><span class="settings-eyebrow">ADMINISTRATION</span><h1>System settings</h1><p>Manage availability, data visibility, and the access your team needs.</p></div><span class="settings-live-badge {{ $underMaintenance ? 'is-maintenance' : '' }}"><span aria-hidden="true"></span>{{ $underMaintenance ? 'Under maintenance' : 'System is live' }}</span></header>
{{-- Show settings feedback in the shared toast region without leaving duplicate inline alerts in the page. --}}
@if($errors->any())<div hidden data-operation-errors>@foreach($errors->all() as $message)<span>{{ $message }}</span>@endforeach</div>@endif
@if(session('operation_message'))<span hidden data-operation-message="{{ session('operation_message') }}" data-operation-type="{{ session('operation_type', 'success') }}"></span>@endif
<div class="settings-layout">
<aside class="settings-sidebar"><nav class="nav nav-pills flex-column settings-nav" id="settingsTabs" role="tablist" aria-label="Settings sections" aria-orientation="vertical">
@if($isSuperAdministrator)<button class="nav-link active" id="availability-tab" data-bs-toggle="pill" data-bs-target="#availability" type="button" role="tab" aria-controls="availability" aria-selected="true"><i class="bi bi-toggles" aria-hidden="true"></i><span>Availability<small>Maintenance & return time</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>@endif
<button class="nav-link {{ $isSuperAdministrator ? '' : 'active' }}" id="branding-tab" data-bs-toggle="pill" data-bs-target="#branding" type="button" role="tab" aria-controls="branding" aria-selected="{{ $isSuperAdministrator ? 'false' : 'true' }}"><i class="bi bi-brush" aria-hidden="true"></i><span>Branding<small>Name, logo & favicon</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
<button class="nav-link" id="visibility-tab" data-bs-toggle="pill" data-bs-target="#visibility" type="button" role="tab" aria-controls="visibility" aria-selected="false"><i class="bi bi-globe2" aria-hidden="true"></i><span>Data visibility<small>Regions & offices</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
@if($isSuperAdministrator)<button class="nav-link" id="roles-tab" data-bs-toggle="pill" data-bs-target="#roles" type="button" role="tab" aria-controls="roles" aria-selected="false"><i class="bi bi-person-lock" aria-hidden="true"></i><span>Roles & access<small>{{ $roles->count() }} roles configured</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
<button class="nav-link" id="credentials-tab" data-bs-toggle="pill" data-bs-target="#credentials" type="button" role="tab" aria-controls="credentials" aria-selected="false"><i class="bi bi-person-vcard" aria-hidden="true"></i><span>Access profiles<small>{{ $credentialTypes->count() }} role-specific profiles</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
<button class="nav-link" id="super-admins-tab" data-bs-toggle="pill" data-bs-target="#super-admins" type="button" role="tab" aria-controls="super-admins" aria-selected="false"><i class="bi bi-shield-lock" aria-hidden="true"></i><span>Super Admins<small>Elevated administrator access</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>@endif
@if($isSuperAdministrator)<button class="nav-link" id="database-tab" data-bs-toggle="pill" data-bs-target="#database" type="button" role="tab" aria-controls="database" aria-selected="false"><i class="bi bi-database-gear" aria-hidden="true"></i><span>Database<small>Backup &amp; legacy import</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>@endif
<button class="nav-link" id="locations-tab" data-bs-toggle="pill" data-bs-target="#locations" type="button" role="tab" aria-controls="locations" aria-selected="false"><i class="bi bi-geo-alt" aria-hidden="true"></i><span>Locations<small>Register geographic records</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
<button class="nav-link" id="nationalities-tab" data-bs-toggle="pill" data-bs-target="#nationalities" type="button" role="tab" aria-controls="nationalities" aria-selected="false"><i class="bi bi-flag" aria-hidden="true"></i><span>Nationalities<small>Participant registration choices</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
<button class="nav-link" id="offices-tab" data-bs-toggle="pill" data-bs-target="#offices" type="button" role="tab" aria-controls="offices" aria-selected="false"><i class="bi bi-buildings" aria-hidden="true"></i><span>Offices<small>Register offices per region</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
</nav><div class="settings-admin-note"><i class="bi bi-shield-check" aria-hidden="true"></i>@if($isSuperAdministrator)<strong>Super Admin workspace</strong><p>Your System Administrator account also has Super Admin authorization for maintenance, role access, Super Admin assignments, and database backup tools.</p>@else<strong>System Administrator workspace</strong><p>Your role includes account, branding, visibility, location, and office settings. Super Admin access is separately required for maintenance, role access, Super Admin assignments, and database backup tools.</p>@endif</div></aside>
<div class="tab-content settings-content">
@include('admin.location-settings')
@include('admin.office-settings')
@include('admin.nationality-settings')
<div class="modal fade" id="settingsDeleteModal" tabindex="-1" aria-labelledby="settingsDeleteTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content settings-delete-modal">
            <div class="modal-header"><span class="settings-delete-icon"><i class="bi bi-trash3" aria-hidden="true"></i></span><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
            <div class="modal-body"><h2 id="settingsDeleteTitle">Delete this record?</h2><p class="settings-delete-record" data-settings-delete-record></p><p class="settings-delete-note" data-settings-delete-note>This action cannot be undone. Records linked to this item may prevent deletion.</p></div>
            <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger" data-settings-delete-confirm><i class="bi bi-trash3" aria-hidden="true"></i> Delete</button></div>
        </div>
    </div>
</div>
@include('admin.settings-branding')
@if($isSuperAdministrator)
<section class="tab-pane fade show active" id="availability" role="tabpanel" aria-labelledby="availability-tab" tabindex="0">
<article class="settings-card"><header class="settings-card-header"><span class="settings-section-icon"><i class="bi bi-wrench-adjustable" aria-hidden="true"></i></span><div><h2>System availability</h2><p>Keep your users informed when TMIS needs a little downtime.</p></div></header>
<form method="post" action="{{ route('system.settings.update') }}" data-settings-form>@csrf<input type="hidden" name="maintenance_timezone" value="Asia/Manila">
<div class="settings-card-body"><div class="settings-status-control"><div><label class="form-label mb-1" for="maintenanceEnabled">Maintenance mode</label><p class="settings-field-help mb-0">Temporarily pause access for other users.</p></div><div class="form-check form-switch m-0"><input type="hidden" name="maintenance_enabled" value="0"><input id="maintenanceEnabled" type="checkbox" role="switch" name="maintenance_enabled" value="1" class="form-check-input" @checked(old('maintenance_enabled', $settings->maintenance_enabled))></div></div>
<div class="row g-4 mt-1"><div class="col-12"><label class="form-label" for="maintenanceMessage">Message for your users</label><textarea id="maintenanceMessage" class="form-control" name="maintenance_message" rows="3" maxlength="500" placeholder="We are improving TMIS. Please check back shortly.">{{ old('maintenance_message', $settings->maintenance_message) }}</textarea><p class="settings-field-help mt-2">This message appears on the maintenance page.</p></div><div class="col-md-7"><label class="form-label" for="maintenanceStartsAt">Maintenance start time <span class="settings-optional">Optional, starts now if empty</span></label><input id="maintenanceStartsAt" name="maintenance_starts_at" type="datetime-local" class="form-control" value="{{ old('maintenance_starts_at', $settings->maintenance_starts_at ? \Illuminate\Support\Carbon::parse($settings->maintenance_starts_at, 'UTC')->timezone('Asia/Manila')->format('Y-m-d\TH:i') : '') }}"><p class="settings-field-help mt-2">Asia/Manila time. Access will pause automatically at the scheduled time.</p></div><div class="col-md-7"><label class="form-label" for="maintenanceUntil">Expected return time <span class="settings-optional">Optional</span></label><input id="maintenanceUntil" name="maintenance_until" type="datetime-local" class="form-control" data-maintenance-until-utc="{{ $settings->maintenance_until ? \Illuminate\Support\Carbon::parse($settings->maintenance_until, 'UTC')->toIso8601String() : '' }}" value="{{ old('maintenance_until', $settings->maintenance_until ? \Illuminate\Support\Carbon::parse($settings->maintenance_until, 'UTC')->timezone('Asia/Manila')->format('Y-m-d\TH:i') : '') }}"><p class="settings-field-help mt-2">Asia/Manila time. When set, access resumes automatically at this time.</p></div></div>
<p id="maintenanceScheduleFeedback" class="alert mt-3" role="status" aria-live="polite" hidden></p>
<div class="settings-info"><i class="bi bi-info-circle" aria-hidden="true"></i><p>System Administrators and Super Administrators retain authenticated access to continue patching and verifying the server. Other users keep their sessions while access is paused; normal session security limits still apply. If you set a return time, standard access resumes automatically then.</p></div></div>
<footer class="settings-card-footer"><span><i class="bi bi-shield-lock" aria-hidden="true"></i> Changes apply system-wide</span><button class="btn btn-success" type="submit"><i class="bi bi-check2" aria-hidden="true"></i> Save availability</button></footer></form></article>
</section>
@endif
@if($isSuperAdministrator)
<section class="tab-pane fade" id="database" role="tabpanel" aria-labelledby="database-tab" tabindex="0">
<header class="database-page-intro"><div><span class="database-eyebrow"><i class="bi bi-shield-lock" aria-hidden="true"></i> SUPER ADMIN WORKSPACE</span><h2>Database operations</h2><p>Protect a point-in-time copy, restore a verified backup, or bring in legacy account records.</p></div><span class="database-secure-badge"><i class="bi bi-lock-fill" aria-hidden="true"></i> Restricted access</span></header>
<div class="database-safety-note" role="note"><i class="bi bi-info-circle-fill" aria-hidden="true"></i><p><strong>Before you begin</strong><span>Database files contain sensitive account and operational data. Keep downloads in approved secure storage. Restore is available only during maintenance and leaves maintenance enabled for verification.</span></p></div>
<div class="database-action-grid">
<article class="database-action-card database-backup-card">
<header class="database-action-heading"><span class="database-action-icon"><i class="bi bi-cloud-arrow-down-fill" aria-hidden="true"></i></span><span class="database-action-step">01 / BACKUP</span></header>
<h3>Download a full backup</h3><p class="database-action-copy">Create a complete PostgreSQL SQL snapshot. TMIS signs each export so restore can reject files that were altered.</p>
<ul class="database-feature-list"><li><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Signed for integrity verification</li><li><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Private, no-cache download</li><li><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Ready for compatible TMIS restore</li></ul>
<a class="btn database-primary-action" href="{{ route('system.database.export') }}" title="Download a signed full database backup" aria-label="Download a signed full database SQL backup"><i class="bi bi-cloud-arrow-down-fill" aria-hidden="true"></i><span>Download full SQL backup</span><i class="bi bi-arrow-up-right ms-auto" aria-hidden="true"></i></a>
<p class="database-action-footnote"><i class="bi bi-clock-history" aria-hidden="true"></i> Export duration depends on database size.</p>
</article>
<article class="database-action-card database-restore-card">
<header class="database-action-heading"><span class="database-action-icon"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></span><span class="database-action-step">02 / RESTORE</span></header>
<h3>Restore a full backup</h3><p class="database-action-copy">Replace the current database with an intact backup exported by this TMIS system.</p>
<div class="database-danger-callout"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i><span>Current database contents will be replaced. Restore only from a backup compatible with this app version.</span></div>
<form id="databaseRestoreForm" method="post" action="{{ route('system.database.restore') }}" enctype="multipart/form-data" data-database-restore>
@csrf
<label class="form-label database-file-label" for="backupSql">Signed TMIS SQL backup <span>100 MB max</span></label>
<label class="database-file-drop" for="backupSql"><i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i><span><strong>Choose a backup file</strong><small>.sql files exported by this TMIS system</small></span><i class="bi bi-folder2-open ms-auto" aria-hidden="true"></i><input id="backupSql" name="backup_sql" type="file" accept=".sql" required></label>
<p class="database-selected-file" data-backup-selected-file aria-live="polite">No backup selected</p>
<button class="btn database-danger-action" type="submit" title="Review the selected backup before replacing database contents" aria-label="Review full database restore"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i><span>Review restore</span></button>
</form>
<p class="database-action-footnote"><i class="bi bi-shield-check" aria-hidden="true"></i> Runs as one transaction. Maintenance stays on after restore.</p>
</article>
<article class="database-action-card database-import-card">
<header class="database-action-heading"><span class="database-action-icon"><i class="bi bi-database-add" aria-hidden="true"></i></span><span class="database-action-step">03 / LEGACY IMPORT</span></header>
<h3>Import legacy account data</h3><p class="database-action-copy">Bring supported MariaDB reference and account rows into TMIS. Existing accounts with matching emails stay unchanged.</p>
<div class="database-import-details"><span><i class="bi bi-filetype-sql" aria-hidden="true"></i> Supported legacy TMIS export</span><span><i class="bi bi-file-earmark-lock2" aria-hidden="true"></i> 50 MB max</span><span><i class="bi bi-tools" aria-hidden="true"></i> Maintenance mode required</span></div>
<p class="database-inline-note">SQL is parsed as data and never executed. This imports records; it does not deploy application code updates.</p>
<form method="post" action="{{ route('system.database.import') }}" enctype="multipart/form-data" data-database-import>
@csrf
<label class="form-label database-file-label" for="legacySql">Legacy TMIS SQL export</label>
<label class="database-file-drop" for="legacySql"><i class="bi bi-filetype-sql" aria-hidden="true"></i><span><strong>Choose an export file</strong><small>Supported legacy .sql file</small></span><i class="bi bi-folder2-open ms-auto" aria-hidden="true"></i><input id="legacySql" name="legacy_sql" type="file" accept=".sql" required></label>
<p class="database-selected-file" data-legacy-selected-file aria-live="polite">No export selected</p>
<label class="database-confirm-row"><input name="confirm_import" type="checkbox" value="1" title="Confirm that you understand the legacy import behavior" required><span>I understand this adds legacy account and reference data.</span></label>
<button class="btn database-secondary-action" type="submit" title="Import validated legacy TMIS account and reference data" aria-label="Import legacy TMIS data"><i class="bi bi-database-up" aria-hidden="true"></i><span>Import legacy data</span><i class="bi bi-arrow-right ms-auto" aria-hidden="true"></i></button>
</form>
</article>
</div>
<div class="modal fade database-restore-modal" id="databaseRestoreConfirm" tabindex="-1" aria-labelledby="databaseRestoreConfirmTitle" aria-describedby="databaseRestoreConfirmDescription" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><span class="database-modal-icon"><i class="bi bi-database-down" aria-hidden="true"></i></span><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel restore"></button></div><div class="modal-body"><span class="database-modal-eyebrow">IRREVERSIBLE DATABASE ACTION</span><h2 id="databaseRestoreConfirmTitle">Replace the current database?</h2><p id="databaseRestoreConfirmDescription">TMIS will replace current data with the selected signed backup. The database transaction will roll back if the restore fails. After a successful restore, maintenance remains on until you verify the system.</p><label class="database-confirm-row database-restore-acknowledgement"><input id="confirmRestore" name="confirm_restore" type="checkbox" value="1" form="databaseRestoreForm"><span>I understand the current database contents will be replaced.</span></label></div><div class="modal-footer"><button type="button" class="btn database-modal-cancel" data-bs-dismiss="modal">Keep current database</button><button type="button" class="btn database-modal-confirm" data-confirm-database-restore disabled><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Restore database</button></div></div></div>
</div>
</section>
@endif
<section class="tab-pane fade" id="visibility" role="tabpanel" aria-labelledby="visibility-tab" tabindex="0">
<article class="settings-card visibility-card"><header class="settings-card-header"><span class="settings-section-icon"><i class="bi bi-globe2" aria-hidden="true"></i></span><div><h2>My data visibility</h2><p>Choose which regions and offices appear in your operational records.</p></div></header>
<form method="post" action="{{ route('system.scope') }}" data-settings-form>@csrf<div class="settings-card-body"><div class="visibility-intro"><span class="visibility-intro-icon"><i class="bi bi-person-check" aria-hidden="true"></i></span><div><strong>Your workspace, your scope</strong><p>Until you save preferences, your assigned region and office set your default. Leave a list unselected to include all available records.</p></div><span class="visibility-account-badge"><i class="bi bi-person" aria-hidden="true"></i> Personal settings</span></div>
<div class="row g-4 visibility-selection-grid"><fieldset class="col-lg-6"><div class="visibility-list-card"><div class="settings-selection-heading"><div><legend><i class="bi bi-map" aria-hidden="true"></i> Regions <span data-region-count></span></legend><small>Limit records to selected regions</small></div><div class="visibility-list-actions"><button class="btn btn-sm settings-text-button" type="button" data-select-all-regions>Select all</button><button class="btn btn-sm settings-text-button" type="button" data-clear-regions>Clear</button></div></div><label class="visually-hidden" for="regionSearch">Search regions</label><div class="settings-search"><i class="bi bi-search" aria-hidden="true"></i><input id="regionSearch" class="form-control" type="search" placeholder="Search regions" data-region-search></div><div class="settings-check-list" data-region-list>@foreach($regions as $region)<label class="settings-check-option"><input class="form-check-input" type="checkbox" name="region_ids[]" value="{{ $region->region_id }}" @checked(in_array((string) $region->region_id, $selectedRegions, true))><span>{{ $region->name }}</span><i class="bi bi-check-circle-fill visibility-option-check" aria-hidden="true"></i></label>@endforeach<p class="settings-empty" data-region-empty hidden>No matching regions.</p></div></div></fieldset>
<fieldset class="col-lg-6"><div class="visibility-list-card"><div class="settings-selection-heading"><div><legend><i class="bi bi-building" aria-hidden="true"></i> Offices <span data-office-count></span></legend><small data-office-scope-label>Select regions to narrow this list</small></div><div class="visibility-list-actions"><button class="btn btn-sm settings-text-button" type="button" data-select-all-offices>Select all</button><button class="btn btn-sm settings-text-button" type="button" data-refresh-office-scope title="Refresh offices for the selected regions"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh</button><button class="btn btn-sm settings-text-button" type="button" data-clear-offices>Clear</button></div></div><label class="visually-hidden" for="officeSearch">Search offices</label><div class="settings-search"><i class="bi bi-search" aria-hidden="true"></i><input id="officeSearch" class="form-control" type="search" placeholder="Search offices" data-office-search></div><div class="settings-check-list" data-office-list>@foreach($offices as $office)<label class="settings-check-option" data-office-region="{{ $office->region_id }}"><input class="form-check-input" type="checkbox" name="office_ids[]" value="{{ $office->org_id }}" @checked(in_array((string) $office->org_id, $selectedOffices, true))><span>{{ $office->name }}<small>{{ $regions->firstWhere('region_id', $office->region_id)?->name }}</small></span><i class="bi bi-check-circle-fill visibility-option-check" aria-hidden="true"></i></label>@endforeach<p class="settings-empty" data-office-empty hidden>No matching offices.</p></div></div></fieldset></div></div>
<footer class="settings-card-footer"><span><i class="bi bi-person" aria-hidden="true"></i> Applies to your account only</span><button type="submit" class="btn database-primary-action visibility-save-action"><i class="bi bi-check2" aria-hidden="true"></i><span>Save visibility</span><i class="bi bi-arrow-right ms-auto" aria-hidden="true"></i></button></footer></form></article>
</section>
@if($isSuperAdministrator)<section class="tab-pane fade" id="roles" role="tabpanel" aria-labelledby="roles-tab" tabindex="0">
<div class="settings-section-heading"><div><h2>Roles & access</h2><p>Roles define baseline permissions for a user's responsibilities.</p></div><span class="settings-count-badge">{{ $roles->count() }} roles</span></div>
<div class="settings-info mt-0 mb-4"><i class="bi bi-shield-lock" aria-hidden="true"></i><p>Use page-specific View switches to limit which pages a role can open, and deletion switches to control which records it can delete. Optional access profiles can fine-tune one role with extra grants or blocks. System settings remain exclusive to System Administrators.</p></div>
<div class="settings-card mb-4"><header class="settings-card-header"><span class="settings-section-icon"><i class="bi bi-person-plus" aria-hidden="true"></i></span><div><h3>Create a role</h3><p>Set a name, then choose the permissions to grant.</p></div></header><form method="post" action="{{ route('system.roles.store') }}" data-settings-form>@csrf<div class="settings-card-body"><div class="row g-3 mb-4"><div class="col-md-5"><label class="form-label" for="newRoleName">Role name</label><input id="newRoleName" name="name" required maxlength="255" class="form-control" placeholder="e.g. Training Reviewer"></div><div class="col-md-7"><label class="form-label" for="newRoleDescription">Description <span class="settings-optional">Optional</span></label><input id="newRoleDescription" name="details" maxlength="300" class="form-control" placeholder="Describe what this role is responsible for"></div></div><fieldset><legend class="settings-permission-legend">Access permissions</legend>@include('admin.settings-permissions', ['prefix' => 'new-role', 'selectedPermissions' => []])</fieldset></div><footer class="settings-card-footer"><span>Only selected permissions are granted.</span><button type="submit" class="btn btn-success"><i class="bi bi-plus-lg" aria-hidden="true"></i> Create role</button></footer></form></div>
<h3 class="settings-existing-title">Existing roles</h3><div class="accordion settings-role-accordion" id="rolesAccordion">@foreach($roles as $role)<article class="accordion-item"><h4 class="accordion-header" id="role-heading-{{ $role->role_id }}"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#role-body-{{ $role->role_id }}" aria-expanded="false" aria-controls="role-body-{{ $role->role_id }}"><span class="settings-role-icon"><i class="bi {{ $role->name === 'System Administrator' ? 'bi-shield-lock' : 'bi-person-badge' }}" aria-hidden="true"></i></span><span class="settings-role-name">{{ $role->name }}<small>{{ $role->name === 'System Administrator' ? 'Full system access' : (($grants[$role->role_id] ?? collect())->count().' permissions') }}</small></span>@if($role->name === 'System Administrator')<span class="settings-protected">Protected</span>@endif</button></h4><div id="role-body-{{ $role->role_id }}" class="accordion-collapse collapse" aria-labelledby="role-heading-{{ $role->role_id }}" data-bs-parent="#rolesAccordion">@if($role->name === 'System Administrator')<div class="settings-card-body"><p class="mb-0">This role has full access. Its permissions cannot be reduced or renamed.</p></div>@else<form method="post" action="{{ route('system.roles.update', $role->role_id) }}" data-settings-form>@csrf @method('PATCH')<div class="settings-card-body"><div class="row g-3 mb-4"><div class="col-md-5"><label class="form-label" for="role-name-{{ $role->role_id }}">Role name</label><input id="role-name-{{ $role->role_id }}" name="name" class="form-control" required maxlength="255" value="{{ $role->name }}"></div><div class="col-md-7"><label class="form-label" for="role-description-{{ $role->role_id }}">Description</label><input id="role-description-{{ $role->role_id }}" name="details" class="form-control" maxlength="300" value="{{ $role->details }}" placeholder="Describe this role"></div></div><fieldset><legend class="settings-permission-legend">Access permissions</legend>@include('admin.settings-permissions', ['prefix' => 'role-'.$role->role_id, 'selectedPermissions' => ($grants[$role->role_id] ?? collect())->pluck('permission')->all()])</fieldset></div><footer class="settings-card-footer"><span>Review permissions before saving.</span><button type="submit" class="btn btn-success"><i class="bi bi-check2" aria-hidden="true"></i> Save role</button></footer></form>@endif</div></article>@endforeach</div>
</section>
@if($isSuperAdministrator)
<section class="tab-pane fade" id="credentials" role="tabpanel" aria-labelledby="credentials-tab" tabindex="0">
<div class="settings-section-heading"><div><h2>Role access profiles</h2><p>Profiles are optional and belong to one role. A profile fine-tunes that role's baseline access.</p></div><span class="settings-count-badge">{{ $credentialTypes->total() }} role-specific profiles</span></div>
<div class="settings-info mt-0 mb-4"><i class="bi bi-shield-lock" aria-hidden="true"></i><p><strong>Effective access combines role permissions and profile grants, then applies profile blocks.</strong> A profile only adjusts its linked role; it does not replace the role. System Administrator accounts have full access and cannot use profiles.</p></div>
<article class="settings-card mb-4"><header class="settings-card-header"><span class="settings-section-icon"><i class="bi bi-person-plus" aria-hidden="true"></i></span><div><h3>Create an access profile</h3><p>Name the profile for its purpose, such as "Can approve" or "Read only", then choose the permissions it should add or block.</p></div></header>
<form method="post" action="{{ route('system.role-credentials.store') }}">@csrf<div class="settings-card-body">
<div class="row g-3 mb-4"><div class="col-md-5"><label class="form-label" for="newCredentialRole">Role this profile belongs to</label><select class="form-select" id="newCredentialRole" name="role_id" required><option value="">Select a role</option>@foreach($roles->where('is_active', 1)->where('name', '!=', 'System Administrator') as $role)<option value="{{ $role->role_id }}">{{ $role->name }}</option>@endforeach</select></div><div class="col-md-7"><label class="form-label" for="newCredentialName">Access profile name</label><input class="form-control" id="newCredentialName" name="name" maxlength="120" required placeholder="e.g. Can approve"></div></div>
<fieldset class="mb-4"><legend class="settings-permission-legend">Permissions this profile adds</legend><p class="settings-field-help">These are added to the selected role's permissions.</p>@include('admin.settings-permissions', ['prefix' => 'new-credential-allow', 'selectedPermissions' => []])</fieldset>
<fieldset><legend class="settings-permission-legend">Permissions this profile blocks</legend><p class="settings-field-help">These are denied even if the role grants them now or later. A block wins if the same permission is also granted by the role.</p>@include('admin.settings-permissions', ['prefix' => 'new-credential-deny', 'selectedPermissions' => [], 'permissionInputName' => 'denied_permissions[]', 'deniedPermissionEditor' => true])</fieldset>
</div><footer class="settings-card-footer"><span>Profiles only fine-tune their linked role.</span><button type="submit" class="btn btn-success"><i class="bi bi-plus-lg" aria-hidden="true"></i> Create access profile</button></footer></form></article>
<article class="settings-card mb-3"><form method="get" action="{{ route('system.settings') }}#credentials" class="settings-card-body"><div class="row g-3 align-items-end"><div class="col-12 col-md-5"><label class="form-label" for="credentialSearch">Search access profiles</label><input class="form-control" type="search" id="credentialSearch" name="credential_search" value="{{ $credentialFilters['credential_search'] ?? '' }}" placeholder="Profile or role name"></div><div class="col-12 col-md-3"><label class="form-label" for="credentialRoleFilter">Filter by role</label><select class="form-select" id="credentialRoleFilter" name="credential_role_id"><option value="">All roles</option>@foreach($roles->where('is_active', 1)->where('name', '!=', 'System Administrator') as $role)<option value="{{ $role->role_id }}" @selected((string) ($credentialFilters['credential_role_id'] ?? '') === (string) $role->role_id)>{{ $role->name }}</option>@endforeach</select></div><div class="col-12 col-md-2"><label class="form-label" for="credentialPerPage">Rows per page</label><select class="form-select" id="credentialPerPage" name="credential_per_page">@foreach([10, 25, 50, 100] as $pageSize)<option value="{{ $pageSize }}" @selected((int) ($credentialFilters['credential_per_page'] ?? 10) === $pageSize)>{{ $pageSize }}</option>@endforeach</select></div><div class="col-12 col-md-2"><button class="btn btn-success w-100" type="submit"><i class="bi bi-search" aria-hidden="true"></i> Apply</button></div></div></form></article>
<div class="table-responsive settings-card credential-table-card"><table class="table align-middle mb-0 credential-table"><caption class="visually-hidden">Role-specific access profiles, permission changes, assignments, and actions</caption><thead><tr><th scope="col">Access profile</th><th scope="col">Role</th><th scope="col">Permission changes</th><th scope="col">Accounts assigned</th><th scope="col">Last changed</th><th scope="col" class="text-end">Actions</th></tr></thead><tbody>
@forelse($credentialTypes as $credentialType)
@php
    $credentialPermissions = $credentialGrants[$credentialType->role_credential_id] ?? collect();
    $credentialDeniedPermissions = $credentialDenials[$credentialType->role_credential_id] ?? collect();
    $lastChangedAt = \Illuminate\Support\Carbon::parse($credentialType->updated_at ?: $credentialType->created_at, 'UTC')->timezone('Asia/Manila');
@endphp
<tr>
<td><div class="credential-identity"><span class="credential-identity-icon"><i class="bi bi-person-vcard" aria-hidden="true"></i></span><div><strong>{{ $credentialType->name }}</strong><small>Access profile #{{ $credentialType->role_credential_id }}</small></div></div></td>
<td><span class="credential-role-badge"><i class="bi bi-person-badge" aria-hidden="true"></i>{{ $credentialType->role_name }}</span></td>
<td>
@if($credentialPermissions->isEmpty())
<span class="credential-no-permissions">No permissions added</span>
@else
<div class="credential-permission-list">
@foreach($credentialPermissions->take(3) as $permission)
<span class="credential-permission-chip" title="{{ $permission->permission }}">{{ ucwords(str_replace(['.', '_'], [' / ', ' '], $permission->permission)) }}</span>
@endforeach
@if($credentialPermissions->count() > 3)
<details class="credential-permission-more"><summary>+{{ $credentialPermissions->count() - 3 }} more</summary><div class="credential-permission-expanded">@foreach($credentialPermissions->skip(3) as $permission)<span class="credential-permission-chip" title="{{ $permission->permission }}">{{ ucwords(str_replace(['.', '_'], [' / ', ' '], $permission->permission)) }}</span>@endforeach</div></details>
@endif
</div>
@endif
@if($credentialDeniedPermissions->isNotEmpty())
<div class="credential-permission-list mt-2">
<strong class="d-block small text-danger">Blocked from role</strong>
@foreach($credentialDeniedPermissions->take(3) as $permission)
<span class="credential-permission-chip text-danger" title="{{ $permission->permission }}">{{ ucwords(str_replace(['.', '_'], [' / ', ' '], $permission->permission)) }}</span>
@endforeach
@if($credentialDeniedPermissions->count() > 3)
<details class="credential-permission-more"><summary>+{{ $credentialDeniedPermissions->count() - 3 }} more blocked</summary><div class="credential-permission-expanded">
@foreach($credentialDeniedPermissions->skip(3) as $permission)
<span class="credential-permission-chip text-danger" title="{{ $permission->permission }}">{{ ucwords(str_replace(['.', '_'], [' / ', ' '], $permission->permission)) }}</span>
@endforeach
</div></details>
@endif
</div>
@endif
</td>
<td><span class="credential-assignment-count">{{ $credentialType->assigned_accounts_count }}</span><small class="credential-assignment-label">{{ (int) $credentialType->assigned_accounts_count === 1 ? 'account' : 'accounts' }}</small><a class="credential-manage-link" href="{{ route('system.accounts', ['role_id' => $credentialType->role_id, 'role_credential_id' => $credentialType->role_credential_id]) }}"><i class="bi bi-people" aria-hidden="true"></i> Manage assigned users</a></td>
<td><time class="credential-last-changed" datetime="{{ $lastChangedAt->toIso8601String() }}">{{ $lastChangedAt->format('M j, Y') }}</time><small class="credential-last-changed-time">{{ $lastChangedAt->format('g:i A') }} | {{ $credentialType->updated_at ? 'Updated' : 'Created' }}</small></td>
<td><div class="credential-row-actions">
<button type="button" class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editCredentialModal-{{ $credentialType->role_credential_id }}" aria-label="Edit {{ $credentialType->name }}"><i class="bi bi-pencil-square" aria-hidden="true"></i><span>Edit</span></button>
<button type="button" class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#deleteCredentialModal-{{ $credentialType->role_credential_id }}" aria-label="Delete {{ $credentialType->name }}"><i class="bi bi-trash" aria-hidden="true"></i><span>Delete</span></button>
</div></td>
</tr>
@empty
<tr><td colspan="6" class="credential-table-empty"><i class="bi bi-search" aria-hidden="true"></i><strong>No access profiles found</strong><span>Try changing the search text or role filter.</span></td></tr>
@endforelse
</tbody></table></div>
@foreach($credentialTypes as $credentialType)
@php($credentialPermissions = $credentialGrants[$credentialType->role_credential_id] ?? collect())
@php($credentialDeniedPermissions = $credentialDenials[$credentialType->role_credential_id] ?? collect())
<div class="modal fade credential-modal" id="editCredentialModal-{{ $credentialType->role_credential_id }}" tabindex="-1" aria-labelledby="editCredentialTitle-{{ $credentialType->role_credential_id }}" aria-hidden="true">
<div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable credential-editor-dialog">
<div class="modal-content">
<form id="updateCredentialForm-{{ $credentialType->role_credential_id }}" method="post" action="{{ route('system.role-credentials.update', $credentialType->role_credential_id) }}">@csrf @method('PATCH')
<input type="hidden" name="role_id" value="{{ $credentialType->role_id }}">
<div class="modal-header"><div><span class="credential-modal-eyebrow">ROLE ACCESS PROFILE</span><h2 class="modal-title fs-5" id="editCredentialTitle-{{ $credentialType->role_credential_id }}">Edit {{ $credentialType->name }}</h2><p class="credential-modal-subtitle mb-0">Change the profile name and its permission adjustments.</p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
<div class="modal-body">
<div class="credential-modal-context"><span class="credential-role-badge"><i class="bi bi-person-badge" aria-hidden="true"></i>Linked role: {{ $credentialType->role_name }}</span><span class="credential-role-badge"><i class="bi bi-people" aria-hidden="true"></i>{{ $credentialType->assigned_accounts_count }} assigned {{ (int) $credentialType->assigned_accounts_count === 1 ? 'account' : 'accounts' }}</span></div>
<div class="settings-info mt-3 mb-4"><i class="bi bi-info-circle" aria-hidden="true"></i><p>This profile applies only to accounts with the <strong>{{ $credentialType->role_name }}</strong> role. Effective access is role permissions plus profile grants minus profile blocks. Changes apply to every account assigned this profile.</p></div>
<div class="mb-4"><label class="form-label" for="credential-name-{{ $credentialType->role_credential_id }}">Access profile name</label><input class="form-control" id="credential-name-{{ $credentialType->role_credential_id }}" name="name" value="{{ $credentialType->name }}" maxlength="120" required></div>
<fieldset class="credential-permission-section credential-permission-section--grant mb-4"><legend class="settings-permission-legend">Permissions this profile adds</legend><div class="credential-permission-help"><i class="bi bi-plus-circle" aria-hidden="true"></i><p><strong>Grant extra access</strong><span>Selected permissions are added to the linked role. This is useful when only some accounts in the role need extra capabilities.</span></p></div>@include('admin.settings-permissions', ['prefix' => 'credential-'.$credentialType->role_credential_id.'-allow', 'selectedPermissions' => $credentialPermissions->pluck('permission')->all()])</fieldset>
<fieldset class="credential-permission-section credential-permission-section--block"><legend class="settings-permission-legend">Permissions this profile blocks</legend><div class="credential-permission-help"><i class="bi bi-shield-slash" aria-hidden="true"></i><p><strong>Restrict access for this profile</strong><span>Selected permissions stay denied even if the linked role grants them now or later. A block takes precedence over a role grant.</span></p></div>@include('admin.settings-permissions', ['prefix' => 'credential-'.$credentialType->role_credential_id.'-deny', 'selectedPermissions' => $credentialDeniedPermissions->pluck('permission')->all(), 'permissionInputName' => 'denied_permissions[]', 'deniedPermissionEditor' => true])</fieldset>
</div>
<div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-success" data-credential-submit><i class="bi bi-check2" aria-hidden="true"></i> Save changes</button></div>
</form>
</div></div></div>
<div class="modal fade credential-modal" id="deleteCredentialModal-{{ $credentialType->role_credential_id }}" tabindex="-1" aria-labelledby="deleteCredentialTitle-{{ $credentialType->role_credential_id }}" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
<div class="modal-content">
<form method="post" action="{{ route('system.role-credentials.destroy', $credentialType->role_credential_id) }}" data-credential-delete>@csrf @method('DELETE')
<div class="modal-header"><div><span class="credential-modal-eyebrow">PERMANENTLY REMOVE ACCESS PROFILE</span><h2 class="modal-title fs-5" id="deleteCredentialTitle-{{ $credentialType->role_credential_id }}">Delete access profile permanently?</h2></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
<div class="modal-body"><p class="mb-2">You are deleting <strong>{{ $credentialType->role_name }} - {{ $credentialType->name }}</strong>.</p><div class="credential-delete-summary"><i class="bi bi-people" aria-hidden="true"></i><span><strong>{{ $credentialType->assigned_accounts_count }}</strong> assigned {{ (int) $credentialType->assigned_accounts_count === 1 ? 'account' : 'accounts' }}</span></div><p class="credential-delete-note mb-0">The profile and its granted or blocked permissions will be permanently deleted. Assigned accounts will return to their role permissions. Their accounts and records will not be deleted.</p></div>
<div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-danger"><i class="bi bi-trash" aria-hidden="true"></i> Permanently delete profile</button></div>
</form>
</div></div></div>
@endforeach
<nav class="d-flex justify-content-between align-items-center gap-3 mt-3" aria-label="Access profile pagination"><span class="settings-field-help mb-0">Showing {{ $credentialTypes->firstItem() ?? 0 }}-{{ $credentialTypes->lastItem() ?? 0 }} of {{ $credentialTypes->total() }} profiles | Page {{ $credentialTypes->currentPage() }} of {{ $credentialTypes->lastPage() }}</span><div class="d-flex gap-2">@if($credentialTypes->previousPageUrl())<a class="btn btn-sm btn-outline-secondary" href="{{ $credentialTypes->previousPageUrl() }}#credentials" rel="prev">Previous</a>@endif @if($credentialTypes->nextPageUrl())<a class="btn btn-sm btn-outline-secondary" href="{{ $credentialTypes->nextPageUrl() }}#credentials" rel="next">Next</a>@endif</div></nav>
</section>
@endif
<section class="tab-pane fade" id="super-admins" role="tabpanel" aria-labelledby="super-admins-tab" tabindex="0">
<div class="settings-section-heading"><div><h2>Super Admin access</h2><p>Assign elevated settings access to active, approved System Administrators only.</p></div><span class="settings-count-badge">{{ $superAdministrators->total() }} eligible administrators</span></div>
<div class="settings-info mt-0 mb-4"><i class="bi bi-shield-lock" aria-hidden="true"></i><p>Super Admin access is an additional authorization, not a separate password. It grants access to maintenance availability, role permissions, and this table. Removing access does not delete the user's account.</p></div>
<article class="settings-card super-admin-card">
<form method="get" action="{{ route('system.settings') }}#super-admins" class="super-admin-filters">
<div><label class="form-label" for="superAdminSearch">Search accounts</label><input id="superAdminSearch" class="form-control" type="search" name="super_admin_search" value="{{ $superAdminFilters['super_admin_search'] ?? '' }}" placeholder="Name, email, region, or office"></div>
<div><label class="form-label" for="superAdminRegion">Region</label><select id="superAdminRegion" class="form-select" name="super_admin_region"><option value="">All regions</option>@foreach($regions as $region)<option value="{{ $region->region_id }}" @selected((string) ($superAdminFilters['super_admin_region'] ?? '') === (string) $region->region_id)>{{ $region->name }}</option>@endforeach</select></div>
<div><label class="form-label" for="superAdminOffice">Office</label><select id="superAdminOffice" class="form-select" name="super_admin_office"><option value="">All offices</option>@foreach($offices as $office)<option value="{{ $office->org_id }}" @selected((string) ($superAdminFilters['super_admin_office'] ?? '') === (string) $office->org_id)>{{ $regions->firstWhere('region_id', $office->region_id)?->name }} &mdash; {{ $office->name }}</option>@endforeach</select></div>
<div><label class="form-label" for="superAdminPerPage">Rows per page</label><select id="superAdminPerPage" class="form-select" name="super_admin_per_page">@foreach([10, 25, 50, 100] as $pageSize)<option value="{{ $pageSize }}" @selected((int) ($superAdminFilters['super_admin_per_page'] ?? 10) === $pageSize)>{{ $pageSize }}</option>@endforeach</select></div>
<div class="super-admin-filter-actions"><button type="submit" class="btn btn-success"><i class="bi bi-search" aria-hidden="true"></i> Apply filters</button><a class="btn btn-outline-secondary" href="{{ route('system.settings') }}#super-admins">Clear</a></div>
</form>
<div class="super-admin-bulk-bar">
<label class="form-check-label"><input class="form-check-input me-2" type="checkbox" data-super-admin-select-all> Select all on this page</label>
<form id="super-admin-bulk-form" method="post" action="{{ route('system.super-admins.update') }}">@csrf @method('PATCH')
<button type="submit" name="action" value="grant" class="btn btn-sm btn-success"><i class="bi bi-shield-plus" aria-hidden="true"></i> Grant selected</button>
<button type="submit" name="action" value="revoke" class="btn btn-sm btn-outline-danger" data-super-admin-revoke><i class="bi bi-shield-minus" aria-hidden="true"></i> Remove selected</button>
</form>
</div>
<div class="table-responsive">
<table class="table align-middle super-admin-table">
<thead><tr><th scope="col" aria-label="Select"></th><th scope="col">Administrator</th><th scope="col">Region & office</th><th scope="col">Super Admin access</th><th scope="col">Assignment details</th><th scope="col">Changes</th></tr></thead>
<tbody>
@forelse($superAdministrators as $superAdministrator)
<tr>
<td><input class="form-check-input" type="checkbox" name="user_ids[]" value="{{ $superAdministrator->user_id }}" form="super-admin-bulk-form" data-super-admin-row aria-label="Select {{ $superAdministrator->first_name }} {{ $superAdministrator->last_name }}"></td>
<td><strong>{{ $superAdministrator->first_name }} {{ $superAdministrator->middle_name ? mb_substr($superAdministrator->middle_name, 0, 1).'. ' : '' }}{{ $superAdministrator->last_name }}</strong><small>{{ $superAdministrator->email }}</small></td>
<td>{{ $superAdministrator->region_name }}<small>{{ $superAdministrator->office_name }}</small></td>
<td>@if($superAdministrator->super_admin_user_id)<span class="super-admin-status is-enabled"><i class="bi bi-shield-fill-check" aria-hidden="true"></i> Super Admin</span>@else<span class="super-admin-status"><i class="bi bi-person-lock" aria-hidden="true"></i> System Administrator</span>@endif</td>
<td>@if($superAdministrator->granted_at)<span>Granted {{ \Illuminate\Support\Carbon::parse($superAdministrator->granted_at)->timezone('Asia/Manila')->format('M j, Y g:i A') }}</span><small>By {{ trim(($superAdministrator->grantor_first_name ?? '').' '.($superAdministrator->grantor_last_name ?? '')) ?: 'Initial migration' }}</small>@else<span>No elevated access</span>@endif</td>
<td><form method="post" action="{{ route('system.super-admins.update') }}" class="super-admin-row-action">@csrf @method('PATCH')<input type="hidden" name="user_ids[]" value="{{ $superAdministrator->user_id }}"><button type="submit" name="action" value="{{ $superAdministrator->super_admin_user_id ? 'revoke' : 'grant' }}" class="btn btn-sm {{ $superAdministrator->super_admin_user_id ? 'btn-outline-danger' : 'btn-outline-primary' }}" @if($superAdministrator->super_admin_user_id) data-super-admin-revoke @endif>{{ $superAdministrator->super_admin_user_id ? 'Remove access' : 'Grant access' }}</button></form></td>
</tr>
@empty
<tr><td colspan="6" class="super-admin-empty">No active System Administrator accounts match these filters.</td></tr>
@endforelse
</tbody></table>
</div>
<footer class="super-admin-table-footer"><span>Showing {{ $superAdministrators->firstItem() ?? 0 }}-{{ $superAdministrators->lastItem() ?? 0 }} of {{ $superAdministrators->total() }} accounts</span>{{ $superAdministrators->onEachSide(1)->links('pagination::bootstrap-5') }}</footer>
</article>
</section>
@endif
</div></div></div></main>

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

@endsection


