<p>{{ $accountDisplay['navigationName'] ?? 'Account' }}</p><nav class="d-flex flex-wrap align-items-center gap-3 border-bottom pb-3" aria-label="TMIS operations">
<a href="{{ route('admin.dashboard.dashboard') }}">Dashboard</a>
@foreach(\App\Support\ModuleAccess::MODULES as $navigationModule)
@if(\App\Support\ModuleAccess::allows(auth()->user(), $navigationModule.'.read'))<a href="{{ $navigationModule === 'evaluations' ? route('operations.evaluations.index') : route('operations.index', $navigationModule) }}">{{ ucwords(str_replace('_', ' ', $navigationModule)) }}</a>@endif
@endforeach
<a href="{{ route('operations.notifications') }}">Office notifications</a>
<a href="{{ route('admin.users.profile') }}">My profile</a>
<a href="{{ route('admin.users.logs') }}">My activity logs</a>
@if(\App\Support\ModuleAccess::isAdministrator(auth()->user()))<a href="{{ route('system.accounts') }}">User administration</a><a href="{{ route('system.settings') }}">System settings</a>@endif
<button type="submit" form="logout-form" class="btn btn-outline-secondary btn-sm">Sign out</button>
</nav>


