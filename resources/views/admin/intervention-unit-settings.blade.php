<section class="tab-pane fade" id="intervention-units" role="tabpanel" aria-labelledby="intervention-units-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-rulers" aria-hidden="true"></i></span>
            <div><h2>Intervention unit types</h2><p>Manage the selectable units used when recording farmer and association interventions.</p></div>
            <button class="btn btn-success ms-auto" id="addInterventionUnit" type="button"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Add unit type</button>
        </header>
        <div class="settings-card-body">
            <div class="settings-info mb-3">
                <i class="bi bi-info-circle" aria-hidden="true"></i>
                <p>Choose consistent labels such as kilograms, bags, or sessions. Removing a unit only affects future entries; existing intervention records keep their saved unit.</p>
            </div>
        </div>
    </article>

    <article class="settings-card mt-3 directory-card">
        <header class="settings-card-header directory-card-header">
            <span class="settings-section-icon"><i class="bi bi-card-list" aria-hidden="true"></i></span>
            <div><h2>Unit type directory</h2><p>Review and maintain the unit choices available to staff.</p></div>
        </header>
        <div class="settings-card-body">
            <div class="directory-summary-grid" aria-label="Intervention unit summary">
                <article><span>Total unit types</span><strong data-intervention-unit-total>{{ $interventionUnitOptions->count() }}</strong></article>
                <article><span>Available choices</span><strong data-intervention-unit-active>{{ $interventionUnitOptions->where('is_active', true)->count() }}</strong></article>
            </div>
            <div class="directory-toolbar directory-toolbar-offices">
                <label class="directory-search" for="interventionUnitSearch"><span>Search unit types</span><span class="directory-input-wrap"><i class="bi bi-search" aria-hidden="true"></i><input id="interventionUnitSearch" type="search" class="form-control" placeholder="Unit label" aria-controls="interventionUnitsTable"></span></label>
                <label for="interventionUnitPageSize"><span>Rows</span><select id="interventionUnitPageSize" class="form-select" aria-controls="interventionUnitsTable">@foreach([10,25,50,100] as $size)<option value="{{ $size }}" @selected($size === 10)>{{ $size }} per page</option>@endforeach</select></label>
            </div>
            <div class="directory-table-meta"><span><i class="bi bi-arrow-down-up" aria-hidden="true"></i> Select a column heading to sort</span><span>Existing records keep their saved unit label.</span></div>
            <div class="table-responsive directory-table-wrap">
                <table id="interventionUnitsTable" class="table align-middle directory-table">
                    <thead><tr><th scope="col" class="directory-action-heading">Action</th><th scope="col"><button type="button" class="directory-sort" data-intervention-unit-sort>Unit type <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th><th scope="col">Status</th></tr></thead>
                    <tbody data-intervention-unit-rows></tbody>
                </table>
            </div>
            <div class="directory-table-footer"><p class="mb-0" data-intervention-unit-summary role="status" aria-live="polite"></p><nav class="directory-pagination" aria-label="Intervention unit list pagination"><button class="btn btn-sm btn-outline-secondary" type="button" data-intervention-unit-previous><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button><span data-intervention-unit-page aria-live="polite"></span><button class="btn btn-sm btn-outline-secondary" type="button" data-intervention-unit-next>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button></nav></div>
        </div>
    </article>

    <div class="modal fade" id="interventionUnitModal" tabindex="-1" aria-labelledby="interventionUnitModalTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable intervention-type-dialog">
            <div class="modal-content intervention-type-modal unit-settings-modal">
                <form id="interventionUnitForm" method="post" action="{{ route('system.intervention-units.store') }}">
                    @csrf
                    <div class="modal-header unit-settings-modal-header">
                        <span class="unit-settings-modal-icon" aria-hidden="true"><i class="bi bi-rulers"></i></span>
                        <div class="unit-settings-modal-heading"><span class="unit-settings-eyebrow">INTERVENTION UNIT</span><h2 class="modal-title" id="interventionUnitModalTitle">Add unit type</h2><p id="interventionUnitModalDescription">Add a reusable unit label for farmer assistance records.</p></div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body unit-settings-modal-body">
                        <div class="unit-settings-field-card">
                            <label class="form-label" for="interventionUnitName">Unit label <span aria-hidden="true">*</span></label>
                            <div class="input-group unit-settings-input-group"><span class="input-group-text" aria-hidden="true"><i class="bi bi-rulers"></i></span><input id="interventionUnitName" name="name" class="form-control" maxlength="100" placeholder="e.g. kilograms, bags, sessions" required></div>
                            <small class="unit-settings-field-help">Use the name staff should see when recording an intervention quantity.</small>
                        </div>
                        <div class="unit-settings-guidance"><span aria-hidden="true"><i class="bi bi-info-circle-fill"></i></span><div><strong>Used in both intervention forms</strong><p>Farmer and farmer-association profiles share the same unit list. Changes to this label do not rewrite values already saved on existing records.</p></div></div>
                        <p id="interventionUnitError" class="unit-settings-error" role="alert" hidden></p>
                    </div>
                    <div class="modal-footer unit-settings-modal-footer"><span class="unit-settings-footer-note"><i class="bi bi-shield-check" aria-hidden="true"></i> Changes apply to future entries</span><div><button class="btn unit-settings-secondary-action" type="button" data-bs-dismiss="modal">Cancel</button><button class="btn unit-settings-primary-action" type="submit"><i class="bi bi-check2" aria-hidden="true"></i><span data-intervention-unit-submit-label>Save unit type</span></button></div></div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="deleteInterventionUnitModal" tabindex="-1" aria-labelledby="deleteInterventionUnitTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable unit-settings-delete-dialog">
            <div class="modal-content intervention-type-modal unit-settings-modal unit-settings-delete-modal">
                <div class="modal-header unit-settings-modal-header">
                    <span class="unit-settings-modal-icon is-danger" aria-hidden="true"><i class="bi bi-trash3"></i></span>
                    <div class="unit-settings-modal-heading"><span class="unit-settings-eyebrow is-danger">REMOVE UNIT CHOICE</span><h2 class="modal-title" id="deleteInterventionUnitTitle">Delete this unit type?</h2><p>Review the selected unit before removing it from future intervention forms.</p></div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body unit-settings-modal-body">
                    <div class="unit-settings-delete-record"><span class="unit-settings-delete-record-icon" aria-hidden="true"><i class="bi bi-rulers"></i></span><div><span>UNIT TYPE</span><strong id="deleteInterventionUnitName"></strong><small id="deleteInterventionUnitState"></small></div><span id="deleteInterventionUnitStatus" class="directory-status"></span></div>
                    <div class="unit-settings-warning"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i><div><strong>This affects new intervention entries</strong><p>Staff will no longer be able to select this unit. Existing intervention records keep the saved unit label.</p></div></div>
                    <p id="deleteInterventionUnitError" class="unit-settings-error" role="alert" hidden></p>
                </div>
                <div class="modal-footer unit-settings-modal-footer"><span class="unit-settings-footer-note is-warning"><i class="bi bi-info-circle" aria-hidden="true"></i> This action cannot be undone</span><div><button type="button" class="btn unit-settings-secondary-action" data-bs-dismiss="modal">Keep unit</button><button type="button" class="btn unit-settings-danger-action" id="confirmDeleteInterventionUnit"><i class="bi bi-trash3" aria-hidden="true"></i>Delete unit type</button></div></div>
            </div>
        </div>
    </div>

    <script type="application/json" id="registeredInterventionUnits">{!! Illuminate\Support\Js::encode($interventionUnitOptions) !!}</script>
    <script src="{{ asset('src/js/shared/intervention-unit-settings.js?v=intervention-unit-crud-2') }}" defer></script>
</section>
