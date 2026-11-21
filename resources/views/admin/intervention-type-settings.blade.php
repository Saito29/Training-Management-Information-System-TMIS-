<section class="tab-pane fade" id="intervention-types" role="tabpanel" aria-labelledby="intervention-types-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-box-seam" aria-hidden="true"></i></span>
            <div><h2>Farmer intervention types</h2><p>Manage the assistance categories available on farmer profiles.</p></div>
            <button class="btn btn-success ms-auto" id="addInterventionType" type="button"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Add intervention type</button>
        </header>
        <div class="settings-card-body">
            <div class="settings-info mb-3">
                <i class="bi bi-info-circle" aria-hidden="true"></i>
                <p>Use clear categories such as seeds, fertilizer, equipment, or training. All System Administrators can maintain this list. Renaming or removing a choice affects future entries; existing farmer intervention records keep their saved type text.</p>
            </div>
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

    <div class="modal fade" id="interventionTypeModal" tabindex="-1" aria-labelledby="interventionTypeModalTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable intervention-type-dialog">
            <div class="modal-content intervention-type-modal">
                <form id="interventionTypeRegistration" method="post" action="{{ route('system.intervention-types.store') }}">
                    @csrf
                    <input type="hidden" id="interventionTypeId">
                    <div class="modal-header">
                        <div><span class="intervention-type-eyebrow">FARMER PROFILE SETTINGS</span><h2 class="modal-title" id="interventionTypeModalTitle">Add intervention type</h2><p id="interventionTypeModalDescription">Add a reusable category for recording assistance provided to farmers.</p></div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label" for="interventionTypeName">Intervention type name</label>
                        <input id="interventionTypeName" name="name" class="form-control" maxlength="100" placeholder="e.g. Seeds, fertilizer, equipment" required>
                        <small class="form-text">Choose a concise name staff can recognize when recording farmer support.</small>
                        <div class="intervention-type-context"><i class="bi bi-info-circle" aria-hidden="true"></i><p>Renaming a type changes its label for future entries. Existing intervention records retain their saved text.</p></div>
                        <p id="interventionTypeError" class="alert alert-danger mt-3 mb-0" role="alert" hidden></p>
                    </div>
                    <div class="modal-footer"><button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button><button class="btn btn-success" type="submit"><i class="bi bi-check2 me-1" aria-hidden="true"></i><span data-intervention-type-submit-label>Save intervention type</span></button></div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="deleteInterventionTypeModal" tabindex="-1" aria-labelledby="deleteInterventionTypeTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content intervention-type-modal intervention-type-delete-modal">
                <div class="modal-header"><div><span class="intervention-type-eyebrow">REMOVE FARMER SUPPORT CHOICE</span><h2 class="modal-title" id="deleteInterventionTypeTitle">Delete this intervention type?</h2><p id="deleteInterventionTypeSummary"></p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                <div class="modal-body"><div class="intervention-type-context"><i class="bi bi-info-circle" aria-hidden="true"></i><p>Farmers and staff will no longer be able to select this type for new intervention entries. Existing records keep their saved type text.</p></div><p id="deleteInterventionTypeError" class="alert alert-danger mt-3 mb-0" role="alert" hidden></p></div>
                <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger" id="confirmDeleteInterventionType"><i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete intervention type</button></div>
            </div>
        </div>
    </div>

    <script type="application/json" id="registeredInterventionTypes">{!! Illuminate\Support\Js::encode($interventionTypeOptions) !!}</script>
    <script src="{{ asset('src/js/shared/intervention-type-settings.js?v=intervention-types-crud-2') }}" defer></script>
</section>
