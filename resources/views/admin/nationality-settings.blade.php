<section class="tab-pane fade" id="nationalities" role="tabpanel" aria-labelledby="nationalities-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-flag" aria-hidden="true"></i></span>
            <div><h2>Participant nationalities</h2><p>Manage the nationality choices available during participant registration.</p></div>
        </header>
        <form id="nationalityRegistration" method="post" action="{{ route('system.nationalities.store') }}">
            @csrf
            <div class="settings-card-body">
                <div class="row g-3 align-items-end">
                    <div class="col-md-8"><label class="form-label" for="nationalityName">Nationality name</label><input id="nationalityName" name="name" class="form-control" maxlength="100" placeholder="Enter a nationality" required><p class="settings-field-help mt-2 mb-0">Use the name users should see on participant registration forms.</p></div>
                    <div class="col-md-4"><p class="settings-field-help mb-0">Existing participant records keep their nationality when an option is removed. A nationality currently in use cannot be deleted.</p></div>
                </div>
            </div>
            <footer class="settings-card-footer"><button type="button" class="btn btn-outline-secondary" data-nationality-cancel hidden>Cancel edit</button><button class="btn btn-primary" type="submit"><i class="bi bi-plus-circle" aria-hidden="true"></i> <span data-nationality-submit-label>Add nationality</span></button></footer>
        </form>
    </article>

    <article class="settings-card mt-3 directory-card">
        <header class="settings-card-header directory-card-header"><span class="settings-section-icon"><i class="bi bi-card-list" aria-hidden="true"></i></span><div><h2>Nationality list</h2><p>Review and maintain the choices configured for participant records.</p></div></header>
        <div class="settings-card-body">
            <div class="directory-summary-grid" aria-label="Nationality summary">
                <article><span>Nationality choices</span><strong data-nationality-stat-total>{{ $nationalityOptions->count() }}</strong></article>
                <article><span>Used by participants</span><strong data-nationality-stat-used>{{ $nationalityOptions->sum('participant_count') }}</strong></article>
                <article><span>Available for registration</span><strong data-nationality-stat-active>{{ $nationalityOptions->where('is_active', true)->count() }}</strong></article>
                <article><span>Inactive choices</span><strong data-nationality-stat-inactive>{{ $nationalityOptions->where('is_active', false)->count() }}</strong></article>
            </div>
            <div class="directory-toolbar directory-toolbar-offices">
                <label class="directory-search" for="nationalitySearch"><span>Search nationalities</span><span class="directory-input-wrap"><i class="bi bi-search" aria-hidden="true"></i><input id="nationalitySearch" type="search" class="form-control" placeholder="Nationality name" aria-controls="nationalitiesTable"></span></label>
                <label for="nationalityPageSize"><span>Rows</span><select id="nationalityPageSize" class="form-select" aria-controls="nationalitiesTable">@foreach([10,25,50,100] as $size)<option value="{{ $size }}" @selected($size === 10)>{{ $size }} per page</option>@endforeach</select></label>
            </div>
            <div class="directory-table-meta"><span><i class="bi bi-arrow-down-up" aria-hidden="true"></i> Select a column heading to sort</span><span>Options used by saved participant records are protected from deletion.</span></div>
            <div class="table-responsive directory-table-wrap"><table id="nationalitiesTable" class="table align-middle directory-table">
                <thead><tr><th scope="col" class="directory-action-heading">Action</th><th scope="col"><button type="button" class="directory-sort" data-nationality-sort="label">Nationality <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th><th scope="col"><button type="button" class="directory-sort" data-nationality-sort="participant_count">Participants using it <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th><th scope="col">Status</th></tr></thead>
                <tbody data-nationality-rows></tbody>
            </table></div>
            <div class="directory-table-footer"><p class="mb-0" data-nationality-summary role="status" aria-live="polite"></p><nav class="directory-pagination" aria-label="Nationality list pagination"><button class="btn btn-sm btn-outline-secondary" type="button" data-nationality-previous><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button><span data-nationality-page aria-live="polite"></span><button class="btn btn-sm btn-outline-secondary" type="button" data-nationality-next>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button></nav></div>
        </div>
    </article>
    <script type="application/json" id="registeredNationalities">{!! Illuminate\Support\Js::encode($nationalityOptions) !!}</script>
    <script src="{{ asset('src/js/shared/nationality-settings.js?v=nationality-crud-1') }}" defer></script>
</section>
