<!doctype html>
<html lang="en">
<head>
    <link id="tmis-favicon" rel="icon" type="image/png" href="{{ $systemBranding['faviconUrl'] ?? asset('assets/logo/DA Logo/DA logo_120519.png') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script>window.TMIS_BRANDING = {{ Illuminate\Support\Js::from($systemBranding ?? ['name' => 'TMIS', 'logoUrl' => asset('assets/logo/DA Logo/DA logo_120519.png'), 'faviconUrl' => asset('assets/logo/DA Logo/DA logo_120519.png')]) }};</script>
    <script>window.TMIS_ACCOUNT_NAV = {{ Illuminate\Support\Js::from(['profile' => route('admin.users.profile'), 'logs' => route('admin.users.logs'), 'visibility' => (bool) ($navigationAccess['administrator'] ?? false)]) }};</script>
    @if(request()->routeIs('admin.users.profile'))
        <script>window.TMIS_SESSION = {{ Illuminate\Support\Js::from(['source' => 'database', 'userId' => $accountDisplay['id'], 'user' => $accountDisplay]) }};</script>
    @endif
    @if(request()->routeIs('admin.users.logs') && isset($entries))
        <script>window.TMIS_LOG_DATA = {{ Illuminate\Support\Js::from(['entries' => $entries->items(), 'next' => $entries->nextPageUrl(), 'actor' => $accountDisplay]) }};</script>
    @endif
    @if(request()->routeIs('admin.users.profile') && isset($profileEntries))
        <script>window.TMIS_PROFILE_LOG_DATA = {{ Illuminate\Support\Js::from(['entries' => $profileEntries->items(), 'logsUrl' => route('admin.users.logs'), 'page' => $profileEntries->currentPage(), 'hasMore' => $profileEntries->hasMorePages()]) }};</script>
    @endif
    @if(isset($originalInterfaceData))
        <script>window.TMIS_PAGE = {{ Illuminate\Support\Js::from($originalInterfaceData) }};</script>
        <script src="{{ asset('src/js/shared/date-time.js') }}"></script>
        <script src="{{ asset('src/js/shared/original-interface.js?v=association-location-scope-1') }}"></script>
    @endif
    @yield('head')
    <link rel="stylesheet" href="{{ asset('src/css/shared/account-avatar.css') }}">
    <script>window.TMIS_NAV_ACCESS = {{ Illuminate\Support\Js::from($navigationAccess) }};</script>
    <script src="{{ asset('src/js/shared/navigation-access.js?v=permission-action-split-1') }}" defer></script>
    @if($navigationAccess['administrator'] ?? false)
        <link rel="stylesheet" href="{{ asset('src/css/shared/profile-visibility.css?v=refresh-placeholder-1') }}">
        <script src="{{ asset('src/js/shared/profile-visibility.js?v=dropdown-entry-1') }}" defer></script>
    @endif
    <script src="{{ asset('src/js/shared/account-avatar.js') }}" defer></script>
    <script src="{{ asset('src/js/shared/system-branding.js') }}" defer></script>
    <link rel="stylesheet" href="{{ asset('src/css/shared/searchable-combobox.css') }}">
    <script src="{{ asset('src/js/shared/searchable-combobox.js') }}" defer></script>
</head>
<body @yield('body-attributes')>
    <form id="logout-form" method="POST" action="{{ route('logout') }}" hidden>
        @csrf
    </form>
    @yield('content')
    @if($navigationAccess['administrator'] ?? false)
        @include('layouts.profile-visibility')
    @endif
</body>
</html>
