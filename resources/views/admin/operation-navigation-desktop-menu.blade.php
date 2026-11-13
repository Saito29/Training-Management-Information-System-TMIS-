<li class="nav-item">
  <a
    href="{{ route('admin.dashboard.dashboard') }}"
    class="nav-link {{ request()->routeIs('admin.dashboard.dashboard') ? 'active-page' : '' }}"
    @if(request()->routeIs('admin.dashboard.dashboard')) aria-current="page" @endif
  >
    <i class="bi bi-columns-gap" aria-hidden="true"></i>
    <span class="text-icon-active">Dashboard</span>
  </a>
</li>
@foreach($dashboardNavigationGroups as $navigationGroup)
  @if($canSeeNavigationSections($navigationGroup['sections']))
    <li class="nav-item">
      <a
        href="#"
        class="nav-link {{ request()->routeIs(...$navigationGroup['routes']) ? 'active-page' : '' }}"
        role="button"
        data-bs-toggle="collapse"
        data-bs-target="#{{ $navigationGroup['desktopId'] }}"
        aria-expanded="false"
        aria-controls="{{ $navigationGroup['desktopId'] }}"
      >
        <i class="bi {{ $navigationGroup['icon'] }}" aria-hidden="true"></i>
        <span class="text-icon">{{ $navigationGroup['label'] }}</span>
        <i class="bi bi-chevron-down ms-2" aria-hidden="true"></i>
      </a>
      <div class="collapse header-collapse" id="{{ $navigationGroup['desktopId'] }}">
        <div class="header-collapse-menu">
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
                <div class="participant-nav-section-label">{{ $navigationSection['label'] }}</div>
              @endif
              @foreach($navigationSection['groups'] as $navigationSubgroup)
                @php($visibleNavigationItems = $getVisibleNavigationItems($navigationSubgroup['items']))
                @if($visibleNavigationItems !== [])
                  <a
                    href="#"
                    class="header-collapse-item"
                    role="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#{{ $navigationSubgroup['desktopId'] }}"
                    aria-expanded="false"
                    aria-controls="{{ $navigationSubgroup['desktopId'] }}"
                  >
                    <i class="bi {{ $navigationSubgroup['icon'] }}" aria-hidden="true"></i>
                    <span>{{ $navigationSubgroup['label'] }}</span>
                    <i class="bi bi-chevron-down ms-auto" aria-hidden="true"></i>
                  </a>
                  <div class="collapse" id="{{ $navigationSubgroup['desktopId'] }}">
                    <div class="header-sub-collapse-menu">
                      @foreach($visibleNavigationItems as $navigationItem)
                        <a
                          href="{{ route($navigationItem['route']) }}"
                          class="header-sub-collapse-item {{ request()->routeIs($navigationItem['route']) ? 'active-page' : '' }}"
                          @if(request()->routeIs($navigationItem['route'])) aria-current="page" @endif
                        >
                          <i class="bi {{ $navigationItem['icon'] }}" aria-hidden="true"></i>
                          <span>{{ $navigationItem['label'] }}</span>
                        </a>
                      @endforeach
                    </div>
                  </div>
                @endif
              @endforeach
            @endif
          @endforeach
        </div>
      </div>
    </li>
  @endif
@endforeach
