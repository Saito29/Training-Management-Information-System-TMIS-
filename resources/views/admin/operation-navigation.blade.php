@php
  $navigationUser = auth()->user();
  $navigationPermissions = array_fill_keys(
    \App\Support\ModuleAccess::navigationAccess($navigationUser)['permissions'],
    true,
  );
  $dashboardNavigationGroups = [
    [
      'label' => 'Participants',
      'icon' => 'bi-people-fill',
      'desktopId' => 'participantHeaderCollapse',
      'mobileId' => 'participantMobile',
      'routes' => ['admin.participants.*'],
      'sections' => [
        [
          'label' => 'Individual',
          'groups' => [
            [
              'label' => 'Create',
              'icon' => 'bi-plus-circle',
              'desktopId' => 'createParticipantHeaderCollapse',
              'mobileId' => 'createParticipantMobile',
              'items' => [
                ['module' => 'participants', 'page' => 'create.register', 'route' => 'admin.participants.create.register', 'label' => 'Register', 'icon' => 'bi-person-fill-add'],
              ],
            ],
            [
              'label' => 'Details',
              'icon' => 'bi-file-earmark-text',
              'desktopId' => 'detailsParticipantHeaderCollapse',
              'mobileId' => 'detailsParticipantMobile',
              'items' => [
                ['module' => 'participants', 'page' => 'details.all-with-status', 'route' => 'admin.participants.details.all-with-status', 'label' => 'List of Farmers', 'icon' => 'bi-list-check'],
                ['module' => 'participants', 'page' => 'details.inactive', 'route' => 'admin.participants.details.inactive', 'label' => 'Inactive', 'icon' => 'bi-person-walking'],
                ['module' => 'participants', 'page' => 'details.trash', 'route' => 'admin.participants.details.trash', 'label' => 'Deleted farmers', 'icon' => 'bi-person-x'],
              ],
            ],
          ],
        ],
        [
          'label' => 'Farmer Association',
          'groups' => [
            [
              'label' => 'Create',
              'icon' => 'bi-plus-circle',
              'desktopId' => 'createFarmerAssociationHeaderCollapse',
              'mobileId' => 'createFarmerAssociationMobile',
              'items' => [
                ['module' => 'associations', 'page' => 'create.fa-register', 'route' => 'admin.participants.create.fa-register', 'label' => 'Register', 'icon' => 'bi-building-add'],
              ],
            ],
            [
              'label' => 'Details',
              'icon' => 'bi-file-earmark-text',
              'desktopId' => 'detailsFarmerAssociationHeaderCollapse',
              'mobileId' => 'detailsFarmerAssociationMobile',
              'items' => [
                ['module' => 'associations', 'page' => 'details.fa-all-list', 'route' => 'admin.participants.details.fa-all-list', 'label' => 'List of FA', 'icon' => 'bi-list-ul'],
                ['module' => 'associations', 'page' => 'details.fa-inactive', 'route' => 'admin.participants.details.fa-inactive', 'label' => 'Inactive', 'icon' => 'bi-x-circle-fill'],
              ],
            ],
          ],
        ],
      ],
    ],
    [
      'label' => 'Training',
      'icon' => 'bi-book-fill',
      'desktopId' => 'trainingHeaderCollapse',
      'mobileId' => 'trainingMobile',
      'routes' => ['admin.training.*', 'operations.trainings'],
      'sections' => [
        [
          'label' => 'Training',
          'groups' => [
            [
              'label' => 'Create',
              'icon' => 'bi-plus-circle',
              'desktopId' => 'createTrainingHeaderCollapse',
              'mobileId' => 'createTrainingMobile',
              'items' => [
                ['module' => 'trainings', 'page' => 'create.register', 'route' => 'admin.training.create.register', 'label' => 'Register', 'icon' => 'bi-pencil-square'],
              ],
            ],
            [
              'label' => 'Update',
              'icon' => 'bi-arrow-repeat',
              'desktopId' => 'updateTrainingHeaderCollapse',
              'mobileId' => 'updateTrainingMobile',
              'items' => [
                ['module' => 'trainings', 'page' => 'update.for-review', 'route' => 'admin.training.update.for-review', 'label' => 'For review', 'icon' => 'bi-person-fill-check'],
                ['module' => 'trainings', 'page' => 'update.for-approval', 'route' => 'admin.training.update.for-approval', 'label' => 'For approval', 'icon' => 'bi-person-fill-check'],
                ['module' => 'trainings', 'page' => 'update.for-acceptance', 'route' => 'admin.training.update.for-acceptance', 'label' => 'For acceptance', 'icon' => 'bi-patch-check-fill'],
              ],
            ],
            [
              'label' => 'Details',
              'icon' => 'bi-file-earmark-text',
              'desktopId' => 'detailsTrainingHeaderCollapse',
              'mobileId' => 'detailsTrainingMobile',
              'items' => [
                ['module' => 'trainings', 'page' => 'details.all-status', 'route' => 'admin.training.details.all-status', 'label' => 'All status', 'icon' => 'bi-list-check'],
                ['module' => 'trainings', 'page' => 'details.approved-accepted', 'route' => 'admin.training.details.approved-accepted', 'label' => 'Approved & accepted', 'icon' => 'bi-check-circle-fill'],
                ['module' => 'trainings', 'page' => 'details.incomplete', 'route' => 'admin.training.details.incomplete', 'label' => 'Incomplete', 'icon' => 'bi-exclamation-circle-fill'],
                ['module' => 'trainings', 'page' => 'details.inactive', 'route' => 'admin.training.details.inactive', 'label' => 'Inactive', 'icon' => 'bi-x-circle-fill'],
              ],
            ],
          ],
        ],
        [
          'label' => 'Facilitator / Resource Person',
          'groups' => [
            [
              'label' => 'Create',
              'icon' => 'bi-plus-circle',
              'desktopId' => 'createFacilitatorRpHeaderCollapse',
              'mobileId' => 'createFacilitatorRpMobile',
              'items' => [
                ['module' => 'resource_persons', 'page' => 'create.rp-register', 'route' => 'admin.training.create.rp-register', 'label' => 'Register', 'icon' => 'bi-person-fill-add'],
              ],
            ],
            [
              'label' => 'Details',
              'icon' => 'bi-file-earmark-text',
              'desktopId' => 'detailsFacilitatorRpHeaderCollapse',
              'mobileId' => 'detailsFacilitatorRpMobile',
              'items' => [
                ['module' => 'resource_persons', 'page' => 'details.rp-list', 'route' => 'admin.training.details.rp-list', 'label' => 'List of RP', 'icon' => 'bi-list-ul'],
                ['module' => 'resource_persons', 'page' => 'details.rp-inactive', 'route' => 'admin.training.details.rp-inactive', 'label' => 'Inactive', 'icon' => 'bi-x-circle-fill'],
              ],
            ],
          ],
        ],
      ],
    ],
    [
      'label' => 'Evaluation',
      'icon' => 'bi-file-earmark-check',
      'desktopId' => 'evaluationHeaderCollapse',
      'mobileId' => 'evaluationMobile',
      'routes' => ['admin.evaluation.*', 'operations.evaluations.index'],
      'sections' => [
        [
          'label' => null,
          'groups' => [
            [
              'label' => 'Create',
              'icon' => 'bi-plus-circle',
              'desktopId' => 'createEvaluationHeaderCollapse',
              'mobileId' => 'createEvaluationMobile',
              'items' => [
                ['module' => 'questionnaires', 'page' => 'create.pre-test-register', 'route' => 'admin.evaluation.create.pre-test-register', 'label' => 'Pre-test Questionnaire', 'icon' => 'bi-file-earmark-text'],
                ['module' => 'questionnaires', 'page' => 'create.post-test-register', 'route' => 'admin.evaluation.create.post-test-register', 'label' => 'Post-test Questionnaire', 'icon' => 'bi-file-earmark-text'],
                ['module' => 'questionnaires', 'page' => 'create.training-evaluation-register', 'route' => 'admin.evaluation.create.training-evaluation-register', 'label' => 'Training Evaluation', 'icon' => 'bi-file-earmark-check'],
                ['module' => 'questionnaires', 'page' => 'create.rp-evaluation-register', 'route' => 'admin.evaluation.create.rp-evaluation-register', 'label' => 'Resource Person Evaluation', 'icon' => 'bi-star-fill'],
              ],
            ],
            [
              'label' => 'Encode',
              'icon' => 'bi-pencil-square',
              'desktopId' => 'encodeEvaluationHeaderCollapse',
              'mobileId' => 'encodeEvaluationMobile',
              'items' => [
                ['module' => 'evaluations', 'page' => 'encode.pre-test', 'route' => 'admin.evaluation.encode.pre-test', 'label' => 'Pre-test Evaluation', 'icon' => 'bi-pencil-square'],
                ['module' => 'evaluations', 'page' => 'encode.post-test', 'route' => 'admin.evaluation.encode.post-test', 'label' => 'Post-test Evaluation', 'icon' => 'bi-pencil-square'],
                ['module' => 'evaluations', 'page' => 'encode.training-evaluation', 'route' => 'admin.evaluation.encode.training-evaluation', 'label' => 'Training Evaluation', 'icon' => 'bi-pencil-square'],
                ['module' => 'evaluations', 'page' => 'encode.rp-evaluation', 'route' => 'admin.evaluation.encode.rp-evaluation', 'label' => 'Resource Person Evaluation', 'icon' => 'bi-pencil-square'],
              ],
            ],
            [
              'label' => 'Details',
              'icon' => 'bi-file-earmark-text',
              'desktopId' => 'detailsEvaluationHeaderCollapse',
              'mobileId' => 'detailsEvaluationMobile',
              'items' => [
                ['module' => 'questionnaires', 'page' => 'details.list-questionnaire', 'route' => 'admin.evaluation.details.list-questionnaire', 'label' => 'List Questionnaire', 'icon' => 'bi-list-check'],
                ['module' => 'questionnaires', 'page' => 'details.draft-questionnaire', 'route' => 'admin.evaluation.details.draft-questionnaire', 'label' => 'Draft Questionnaires', 'icon' => 'bi-file-earmark-text'],
                ['module' => 'questionnaires', 'page' => 'details.inactive', 'route' => 'admin.evaluation.details.inactive', 'label' => 'Inactive', 'icon' => 'bi-x-circle-fill'],
              ],
            ],
          ],
        ],
      ],
    ],
    [
      'label' => 'Administration',
      'icon' => 'bi-sliders',
      'desktopId' => 'administrationHeaderCollapse',
      'mobileId' => 'administrationMobile',
      'routes' => ['admin.administration.*'],
      'sections' => [
        [
          'label' => null,
          'groups' => [
            [
              'label' => 'Create',
              'icon' => 'bi-plus-circle',
              'desktopId' => 'createAdministrationHeaderCollapse',
              'mobileId' => 'createAdministrationMobile',
              'items' => [
                ['module' => 'administration', 'page' => 'create.register', 'route' => 'admin.administration.create.register', 'label' => 'Register', 'icon' => 'bi-person-add'],
              ],
            ],
            [
              'label' => 'Update',
              'icon' => 'bi-arrow-repeat',
              'desktopId' => 'updateAdministrationHeaderCollapse',
              'mobileId' => 'updateAdministrationMobile',
              'items' => [
                ['module' => 'administration', 'page' => 'update.for-approval', 'route' => 'admin.administration.update.for-approval', 'label' => 'For approval', 'icon' => 'bi-person-fill-check'],
              ],
            ],
            [
              'label' => 'Details',
              'icon' => 'bi-file-earmark-text',
              'desktopId' => 'detailsAdministrationHeaderCollapse',
              'mobileId' => 'detailsAdministrationMobile',
              'items' => [
                ['module' => 'administration', 'page' => 'details.all-status', 'route' => 'admin.administration.details.all-status', 'label' => 'All status', 'icon' => 'bi-list-check'],
                ['module' => 'administration', 'page' => 'details.approved-accepted', 'route' => 'admin.administration.details.approved-accepted', 'label' => 'Approved & accepted', 'icon' => 'bi-check-circle-fill'],
                ['module' => 'administration', 'page' => 'details.inactive', 'route' => 'admin.administration.details.inactive', 'label' => 'Inactive', 'icon' => 'bi-x-circle-fill'],
                ['module' => 'administration', 'page' => 'details.trash', 'route' => 'admin.administration.details.trash', 'label' => 'Deleted accounts', 'icon' => 'bi-person-x'],
              ],
            ],
          ],
        ],
      ],
    ],
  ];

  $getVisibleNavigationItems = static function (array $items) use ($navigationPermissions): array {
    return array_values(array_filter($items, static function (array $item) use ($navigationPermissions): bool {
      return isset($navigationPermissions[
        \App\Support\ModuleAccess::pagePermission($item['module'], $item['page'])
      ]);
    }));
  };

  $canSeeNavigationSections = static function (array $sections) use ($getVisibleNavigationItems): bool {
    foreach ($sections as $section) {
      foreach ($section['groups'] as $group) {
        if ($getVisibleNavigationItems($group['items']) !== []) {
          return true;
        }
      }
    }

    return false;
  };
@endphp
<nav class="app-header navbar navbar-expand shared-operations-navigation" aria-label="TMIS operations">
  <div class="app-header-main d-flex justify-content-between align-items-center">
    <div class="app-header-left d-flex align-items-center justify-content-start">
      <button
        class="btn app-mobile-toggle d-lg-none"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#mobileNavMenu"
        aria-controls="mobileNavMenu"
        aria-label="Open navigation"
      >
        <i class="bi bi-list" aria-hidden="true"></i>
      </button>
      <div class="app-logo d-none d-sm-flex align-items-center justify-content-start">
        <a href="{{ route('admin.dashboard.dashboard') }}" class="text-decoration-none">
          <img
            src="{{ $systemBranding['logoUrl'] ?? asset('assets/logo/DA Logo/DA logo_120519.png') }}"
            alt="TMIS"
            class="image-logo"
          />
        </a>
        <div class="app-logo-text d-flex align-items-center justify-content-start">
          <h3 class="app-name d-none d-sm-block">TMIS</h3>
        </div>
      </div>
    </div>

    <div class="app-navigation-bar d-none d-lg-flex justify-content-center">
      <ul class="navbar-nav">
        @include('admin.operation-navigation-desktop-menu')
      </ul>
    </div>

    <div class="app-noti-profile d-flex align-items-center">
      <div class="app-notification">
        <a
          class="notification-btn"
          href="{{ route('operations.notifications') }}"
          aria-label="Office notifications"
          title="Office notifications"
        >
          <i class="bi bi-bell-fill" aria-hidden="true"></i>
        </a>
      </div>
      <div class="app-profile dropdown-center">
        <a
          href="#"
          class="nav-link dropdown-toggle profile-button"
          role="button"
          data-bs-auto-close="outside"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <span class="user-avatar-wrap">
            @include('layouts.account-avatar')
            <span class="user-status-dot"></span>
          </span>
          <span class="profile-meta">
            <span class="profile-name">{{ $accountDisplay['navigationName'] }}</span>
            <small class="profile-role">{{ $accountDisplay['role'] ?? 'Role not assigned' }}</small>
          </span>
        </a>
        <ul class="dropdown-menu dropdown-menu-end user-menu">
          <li><h6 class="dropdown-header user-menu-header">{{ $accountDisplay['navigationName'] }}</h6></li>
          <li><span class="dropdown-item-text">{{ $accountDisplay['role'] ?? 'Role not assigned' }}</span></li>
          <li><hr class="dropdown-divider" /></li>
          <li>
            <a href="{{ route('admin.users.profile') }}" class="dropdown-item">
              <i class="bi bi-person-fill-gear" aria-hidden="true"></i>
              <span>Profile</span>
            </a>
          </li>
          <li>
            <a href="{{ route('admin.users.logs') }}" class="dropdown-item">
              <i class="bi bi-substack" aria-hidden="true"></i>
              <span>Logs</span>
            </a>
          </li>
          @if(\App\Support\ModuleAccess::isAdministrator(auth()->user()))
            <li><hr class="dropdown-divider" /></li>
            <li>
              <a href="{{ route('system.accounts') }}" class="dropdown-item">
                <i class="bi bi-person-gear" aria-hidden="true"></i>
                <span>User administration</span>
              </a>
            </li>
          @endif
          <li><hr class="dropdown-divider" /></li>
          <li>
            <button type="submit" form="logout-form" class="dropdown-item sign-out-item">
              <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
              <span>Sign out</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</nav>

<div
  class="offcanvas offcanvas-start app-mobile-menu"
  tabindex="-1"
  id="mobileNavMenu"
  aria-labelledby="mobileNavMenuLabel"
>
  <div class="offcanvas-header">
    <div class="offcanvas-brand">
      <img
        src="{{ $systemBranding['logoUrl'] ?? asset('assets/logo/DA SAAD LOGO FULL - GREEN TEXT.png') }}"
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
      aria-label="Close navigation"
    >
      <i class="bi bi-x-octagon-fill" aria-hidden="true"></i>
      <span class="close-btn">Close</span>
    </button>
  </div>
  <div class="offcanvas-body">
    <div class="mobile-user-panel">
      @include('layouts.account-avatar')
      <div class="mobile-user-name-role">
        <strong class="user-name">{{ $accountDisplay['navigationName'] }}</strong>
        <small class="user-role">{{ $accountDisplay['role'] ?? 'Role not assigned' }}</small>
      </div>
    </div>
    <ul class="mobile-nav">
      @include('admin.operation-navigation-mobile-menu')
    </ul>
  </div>
</div>
