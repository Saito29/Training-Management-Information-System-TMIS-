<section class="tab-pane fade" id="offices" role="tabpanel" aria-labelledby="offices-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-buildings" aria-hidden="true"></i></span>
            <div><h2>Offices by region</h2><p>Register offices under an active region for account access and regional data management.</p></div>
        </header>
        <form id="officeRegistration" method="post" action="{{ route('system.offices.store') }}">
            @csrf
            <div class="settings-card-body">
                <div class="row g-3">
                    <div class="col-md-6"><label class="form-label" for="officeRegion">Region</label><select id="officeRegion" name="region_id" class="form-select" required><option value="">Select a region</option>@foreach($regions as $region)<option value="{{ $region->region_id }}">{{ $region->name }}</option>@endforeach</select></div>
                    <div class="col-md-6"><label class="form-label" for="officeName">Office name</label><input id="officeName" name="name" class="form-control" maxlength="300" placeholder="Enter the official office name" required></div>
                    <div class="col-12"><label class="form-label" for="officeDetails">Office details <span class="settings-optional">Optional</span></label><textarea id="officeDetails" name="details" class="form-control" maxlength="300" rows="2" placeholder="Add a short description or service area"></textarea></div>
                </div>
            </div>
            <footer class="settings-card-footer"><button class="btn btn-outline-secondary" type="button" data-office-cancel hidden>Cancel edit</button><button class="btn btn-primary" type="submit"><i class="bi bi-plus-circle" aria-hidden="true"></i> <span data-office-save-label>Create office</span></button></footer>
        </form>
    </article>

    <article class="settings-card mt-3 directory-card">
        <header class="settings-card-header directory-card-header"><span class="settings-section-icon"><i class="bi bi-building-gear" aria-hidden="true"></i></span><div><h2>Office directory</h2><p>Review office coverage, assigned accounts, and linked training records.</p></div></header>
        <div class="settings-card-body">
            <div class="directory-summary-grid" aria-label="Office summary">
                <article><span>Registered offices</span><strong data-office-stat-total>{{ $registeredOffices->count() }}</strong></article>
                <article><span>Regions covered</span><strong data-office-stat-regions>{{ $registeredOffices->pluck('region_id')->unique()->count() }}</strong></article>
                <article><span>Accounts assigned</span><strong data-office-stat-accounts>0</strong></article>
                <article><span>Training records</span><strong data-office-stat-trainings>0</strong></article>
            </div>
            <div class="directory-toolbar directory-toolbar-offices">
                <label class="directory-search" for="registeredOfficeSearch"><span>Search offices</span><span class="directory-input-wrap"><i class="bi bi-search" aria-hidden="true"></i><input type="search" id="registeredOfficeSearch" class="form-control" placeholder="Office, region, or details" aria-controls="registeredOfficesTable"></span></label>
                <label for="officeFilterRegion"><span>Region</span><select id="officeFilterRegion" class="form-select" aria-controls="registeredOfficesTable"><option value="">All regions</option>@foreach($regions as $region)<option value="{{ $region->region_id }}">{{ $region->name }}</option>@endforeach</select></label>
                <label for="officePageSize"><span>Rows</span><select id="officePageSize" class="form-select" aria-controls="registeredOfficesTable">@foreach([10,25,50,100] as $size)<option value="{{ $size }}" @selected($size === 10)>{{ $size }} per page</option>@endforeach</select></label>
            </div>
            <div class="directory-table-meta"><span><i class="bi bi-arrow-down-up" aria-hidden="true"></i> Select a column heading to sort</span><span>Showing all registered offices</span></div>
            <div class="table-responsive directory-table-wrap">
                <table id="registeredOfficesTable" class="table align-middle directory-table">
                    <thead><tr>
                        <th scope="col" class="directory-action-heading">Action</th>
                        <th scope="col"><button type="button" class="directory-sort" data-office-sort="org_id">ID <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-office-sort="name">Office <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-office-sort="region">Region <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-office-sort="account_count">Accounts <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-office-sort="training_count">Trainings <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col">Details</th>
                        <th scope="col"><button type="button" class="directory-sort" data-office-sort="updated_at">Last updated <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col">Status</th>
                    </tr></thead>
                    <tbody data-office-rows></tbody>
                </table>
            </div>
            <div class="directory-table-footer"><p class="mb-0" data-office-summary role="status" aria-live="polite"></p><nav class="directory-pagination" aria-label="Office directory pagination"><button class="btn btn-sm btn-outline-secondary" type="button" data-office-previous><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button><span data-office-page aria-live="polite"></span><button class="btn btn-sm btn-outline-secondary" type="button" data-office-next>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button></nav></div>
        </div>
    </article>
    <script type="application/json" id="registeredOfficesData">{!! Illuminate\Support\Js::encode($registeredOffices) !!}</script>
    <script src="{{ asset('src/js/shared/office-settings.js?v=delete-confirm-modal-1') }}" defer></script>
</section>
