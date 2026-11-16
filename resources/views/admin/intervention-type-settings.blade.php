<section class="tab-pane fade" id="intervention-types" role="tabpanel" aria-labelledby="intervention-types-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-box-seam" aria-hidden="true"></i></span>
            <div>
                <h2>Farmer intervention types</h2>
                <p>Manage the choices used to classify support and services recorded on a farmer profile.</p>
            </div>
        </header>
        <div class="settings-card-body">
            <div class="settings-info mb-3">
                <i class="bi bi-info-circle" aria-hidden="true"></i>
                <p>Examples include seeds, fertilizer, equipment, training, and other assistance. These options appear in the farmer intervention form. Renaming an option updates the available label; saved intervention records keep the type text they already contain.</p>
            </div>
            <form id="interventionTypeRegistration" method="post" action="{{ route('system.intervention-types.store') }}">
                @csrf
                <div class="row g-3 align-items-end">
                    <div class="col-md-8">
                        <label class="form-label" for="interventionTypeName">Intervention type name</label>
                        <input id="interventionTypeName" name="name" class="form-control" maxlength="100" placeholder="e.g. Seeds, fertilizer, equipment" required>
                        <p class="settings-field-help mt-2 mb-0">Choose a concise category staff can select when recording farmer assistance.</p>
                    </div>
                    <div class="col-md-4">
                        <p class="settings-field-help mb-0">Types must have unique names. Removing a type only removes it from future selections.</p>
                    </div>
                </div>
                <footer class="settings-card-footer px-0 pb-0">
                    <button type="button" class="btn btn-outline-secondary" data-intervention-type-cancel hidden>Cancel edit</button>
                    <button class="btn btn-primary" type="submit"><i class="bi bi-plus-circle" aria-hidden="true"></i> <span data-intervention-type-submit-label>Add intervention type</span></button>
                </footer>
            </form>
        </div>
    </article>

    <article class="settings-card mt-3 directory-card">
        <header class="settings-card-header directory-card-header">
            <span class="settings-section-icon"><i class="bi bi-card-list" aria-hidden="true"></i></span>
            <div><h2>Intervention type directory</h2><p>Review and maintain the categories available on farmer profiles.</p></div>
        </header>
        <div class="settings-card-body">
            <div class="directory-summary-grid" aria-label="Intervention type summary">
                <article><span>Total types</span><strong data-intervention-type-total>{{ $interventionTypeOptions->count() }}</strong></article>
                <article><span>Available choices</span><strong data-intervention-type-active>{{ $interventionTypeOptions->where('is_active', true)->count() }}</strong></article>
            </div>
            <div class="directory-toolbar directory-toolbar-offices">
                <label class="directory-search" for="interventionTypeSearch"><span>Search intervention types</span><span class="directory-input-wrap"><i class="bi bi-search" aria-hidden="true"></i><input id="interventionTypeSearch" type="search" class="form-control" placeholder="Type name" aria-controls="interventionTypesTable"></span></label>
                <label for="interventionTypePageSize"><span>Rows</span><select id="interventionTypePageSize" class="form-select" aria-controls="interventionTypesTable">@foreach([10,25,50,100] as $size)<option value="{{ $size }}" @selected($size === 10)>{{ $size }} per page</option>@endforeach</select></label>
            </div>
            <div class="directory-table-meta"><span><i class="bi bi-arrow-down-up" aria-hidden="true"></i> Select a column heading to sort</span><span>Changes apply to future intervention entries.</span></div>
            <div class="table-responsive directory-table-wrap">
                <table id="interventionTypesTable" class="table align-middle directory-table">
                    <thead><tr><th scope="col" class="directory-action-heading">Action</th><th scope="col"><button type="button" class="directory-sort" data-intervention-type-sort="label">Intervention type <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th><th scope="col">Status</th></tr></thead>
                    <tbody data-intervention-type-rows></tbody>
                </table>
            </div>
            <div class="directory-table-footer"><p class="mb-0" data-intervention-type-summary role="status" aria-live="polite"></p><nav class="directory-pagination" aria-label="Intervention type list pagination"><button class="btn btn-sm btn-outline-secondary" type="button" data-intervention-type-previous><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button><span data-intervention-type-page aria-live="polite"></span><button class="btn btn-sm btn-outline-secondary" type="button" data-intervention-type-next>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button></nav></div>
        </div>
    </article>
    <script type="application/json" id="registeredInterventionTypes">{!! Illuminate\Support\Js::encode($interventionTypeOptions) !!}</script>
    <script src="{{ asset('src/js/shared/intervention-type-settings.js?v=intervention-types-crud-1') }}" defer></script>
</section>
