@extends('layouts.admin')

@section('head')
    <title>Maintenance settings | {{ $systemBranding['name'] }}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@6.0.0-alpha.1/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <script src="{{ asset('src/js/shared/maintenance-schedule.js?v=auto-expire-1') }}" defer></script>
@endsection

@section('content')
<main class="container py-5">
    <header class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-5">
        <a class="d-flex align-items-center gap-3 text-decoration-none text-body" href="{{ route('maintenance.settings') }}">
            <img src="{{ $systemBranding['logoUrl'] }}" alt="" style="max-width: 180px; max-height: 56px; object-fit: contain;">
            <strong>{{ $systemBranding['name'] }}</strong>
        </a>
        <button class="btn btn-outline-secondary" type="submit" form="logout-form">Sign out</button>
    </header>
    <div class="row justify-content-center">
        <div class="col-xl-8">
            @include('admin.operation-feedback')
            <div class="card shadow-sm">
                <div class="card-body p-4 p-lg-5">
                    <span class="badge text-bg-warning mb-3">Maintenance access</span>
                    <h1 class="h2">System availability</h1>
                    <p class="text-body-secondary mb-4">This account can manage maintenance availability only. It cannot open operational records, account audits, branding, or role settings.</p>
                    <form id="maintenanceAvailabilityForm" method="post" action="{{ route('maintenance.settings.update') }}">
                        @csrf
                        <input type="hidden" name="maintenance_timezone" value="Asia/Manila">
                        <div class="form-check form-switch mb-4">
                            <input type="hidden" name="maintenance_enabled" value="0">
                            <input id="maintenanceEnabled" class="form-check-input" type="checkbox" role="switch" name="maintenance_enabled" value="1" @checked(old('maintenance_enabled', $settings->maintenance_enabled))>
                            <label class="form-check-label fw-semibold" for="maintenanceEnabled">Enable maintenance mode</label>
                        </div>
                        <div class="mb-4">
                            <label class="form-label" for="maintenanceMessage">Message shown to users</label>
                            <textarea id="maintenanceMessage" class="form-control" name="maintenance_message" rows="4" maxlength="500">{{ old('maintenance_message', $settings->maintenance_message) }}</textarea>
                        </div>
                        <div class="mb-4">
                            <label class="form-label" for="maintenanceStartsAt">Maintenance start time <span class="text-body-secondary">(optional, starts now if empty)</span></label>
                            <input id="maintenanceStartsAt" class="form-control" type="datetime-local" name="maintenance_starts_at" value="{{ old('maintenance_starts_at', $settings->maintenance_starts_at ? \Illuminate\Support\Carbon::parse($settings->maintenance_starts_at, 'UTC')->timezone('Asia/Manila')->format('Y-m-d\TH:i') : '') }}">
                            <div class="form-text">Asia/Manila time. The system will enter maintenance at this time.</div>
                        </div>
                        <div class="mb-4">
                            <label class="form-label" for="maintenanceUntil">Expected return time <span class="text-body-secondary">(optional)</span></label>
                            <input id="maintenanceUntil" class="form-control" type="datetime-local" name="maintenance_until" data-maintenance-until-utc="{{ $settings->maintenance_until ? \Illuminate\Support\Carbon::parse($settings->maintenance_until, 'UTC')->toIso8601String() : '' }}" value="{{ old('maintenance_until', $settings->maintenance_until ? \Illuminate\Support\Carbon::parse($settings->maintenance_until, 'UTC')->timezone('Asia/Manila')->format('Y-m-d\TH:i') : '') }}">
                            <div class="form-text">Asia/Manila time. When set, access resumes automatically at this time.</div>
                        </div>
                        <div class="alert alert-info" role="note">Two-step verification remains required whenever it is enabled on the account.</div>
                        <p id="maintenanceScheduleFeedback" class="alert mt-3" role="status" aria-live="polite" hidden></p>
                        <button class="btn btn-success" type="submit">Save availability</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</main>
@endsection
