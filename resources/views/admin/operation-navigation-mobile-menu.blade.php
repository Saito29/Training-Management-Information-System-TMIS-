<li class="mobile-list-navigation">
  <a href="{{ route('admin.dashboard.dashboard') }}" class="nav-link">
    <i class="bi bi-columns-gap" aria-hidden="true"></i>
    <span>Dashboard</span>
  </a>
</li>
@foreach($dashboardNavigationGroups as $navigationGroup)
  @if($canSeeNavigationSections($navigationGroup['sections']))
    <li class="mobile-list-navigation">
      <a
        href="#"
        class="nav-link {{ request()->routeIs(...$navigationGroup['routes']) ? 'active-page' : '' }}"
        data-bs-toggle="collapse"
        data-bs-target="#{{ $navigationGroup['mobileId'] }}"
        aria-controls="{{ $navigationGroup['mobileId'] }}"
        aria-expanded="false"
      >
        <i class="bi {{ $navigationGroup['icon'] }}" aria-hidden="true"></i>
        <span>{{ $navigationGroup['label'] }}</span>
        <i class="bi bi-chevron-down ms-auto" aria-hidden="true"></i>
      </a>
      <ul class="collapse mobile-subnav" id="{{ $navigationGroup['mobileId'] }}">
        @foreach($navigationGroup['sections'] as $navigationSection)
          @php
            $hasVisibleSectionItems = false;
            foreach ($navigationSection['groups'] as $navigationSubgroup) {
              if ($getVisibleNavigationItems($navigationSubgroup['items']) !== []) {
                $hasVisibleSectionItems = true;
                break;
              }
            }
          @endphp
          @if($hasVisibleSectionItems)
            @if($navigationSection['label'])
              <li class="mobile-subnav-section-label">{{ $navigationSection['label'] }}</li>
            @endif
            @foreach($navigationSection['groups'] as $navigationSubgroup)
              @php($visibleNavigationItems = $getVisibleNavigationItems($navigationSubgroup['items']))
              @if($visibleNavigationItems !== [])
                <li class="mobile-list-navigation">
                  <a
                    href="#"
                    class="nav-link"
                    data-bs-toggle="collapse"
                    data-bs-target="#{{ $navigationSubgroup['mobileId'] }}"
                    aria-controls="{{ $navigationSubgroup['mobileId'] }}"
                    aria-expanded="false"
                  >
                    <i class="bi {{ $navigationSubgroup['icon'] }}" aria-hidden="true"></i>
                    <span>{{ $navigationSubgroup['label'] }}</span>
                    <i class="bi bi-chevron-down ms-auto" aria-hidden="true"></i>
                  </a>
                  <ul class="collapse mobile-submenu" id="{{ $navigationSubgroup['mobileId'] }}">
                    @foreach($visibleNavigationItems as $navigationItem)
                      <li class="mobile-subnav-panel-navigation">
                        <a
                          href="{{ route($navigationItem['route']) }}"
                          class="nav-link {{ request()->routeIs($navigationItem['route']) ? 'active-page' : '' }}"
                          @if(request()->routeIs($navigationItem['route'])) aria-current="page" @endif
                        >
                          <i class="bi {{ $navigationItem['icon'] }}" aria-hidden="true"></i>
                          <span>{{ $navigationItem['label'] }}</span>
                        </a>
                      </li>
                    @endforeach
                  </ul>
                </li>
              @endif
            @endforeach
          @endif
        @endforeach
      </ul>
    </li>
  @endif
@endforeach
<li class="mobile-list-navigation">
  <a href="{{ route('operations.notifications') }}" class="nav-link">
    <i class="bi bi-bell-fill" aria-hidden="true"></i><span>Office notifications</span>
  </a>
</li>
<li class="mobile-list-navigation">
  <a href="{{ route('admin.users.profile') }}" class="nav-link">
    <i class="bi bi-person-fill-gear" aria-hidden="true"></i><span>Profile</span>
  </a>
</li>
<li class="mobile-list-navigation">
  <a href="{{ route('admin.users.logs') }}" class="nav-link">
    <i class="bi bi-journal-text" aria-hidden="true"></i><span>Logs</span>
  </a>
</li>
@if(\App\Support\ModuleAccess::isAdministrator(auth()->user()))
  <li class="mobile-list-navigation">
    <a href="{{ route('system.accounts') }}" class="nav-link">
      <i class="bi bi-person-gear" aria-hidden="true"></i><span>User administration</span>
    </a>
  </li>
@endif
<li class="mobile-list-navigation">
  <button type="submit" form="logout-form" class="nav-link sign-out-item">
    <i class="bi bi-box-arrow-right" aria-hidden="true"></i><span>Sign out</span>
  </button>
</li>
