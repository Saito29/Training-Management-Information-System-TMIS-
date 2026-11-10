<section class="tab-pane fade" id="training-types" role="tabpanel" aria-labelledby="training-types-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-mortarboard" aria-hidden="true"></i></span>
            <div>
                <h2>Training types</h2>
                <p>Manage the training type choices available when registering trainings.</p>
            </div>
        </header>
        <form id="trainingTypeRegistration" method="post" action="{{ route('system.training-types.store') }}">
            @csrf
            <div class="settings-card-body">
                <div class="row g-3 align-items-end">
                    <div class="col-md-8">
                        <label class="form-label" for="trainingTypeName">Training type name</label>
                        <input id="trainingTypeName" name="name" class="form-control" maxlength="100" placeholder="Enter a training type" required>
                        <p class="settings-field-help mt-2 mb-0">Use a clear name that staff can select during training registration.</p>
                    </div>
                    <div class="col-md-4">
                        <p class="settings-field-help mb-0">Training types used by saved trainings cannot be deleted. Editing a type also updates linked training records.</p>
                    </div>
                </div>
            </div>
            <footer class="settings-card-footer">
                <button class="btn btn-primary" type="submit"><i class="bi bi-plus-circle" aria-hidden="true"></i> Add training type</button>
            </footer>
        </form>
    </article>

    <article class="settings-card mt-3 directory-card">
        <header class="settings-card-header directory-card-header">
            <span class="settings-section-icon"><i class="bi bi-card-list" aria-hidden="true"></i></span>
            <div><h2>Training type directory</h2><p>Review and maintain the choices configured for training records.</p></div>
        </header>
        <div class="settings-card-body">
            <div class="directory-summary-grid" aria-label="Training type summary">
                <article><span>Type choices</span><strong data-training-type-stat-total>{{ $trainingTypeOptions->count() }}</strong></article>
                <article><span>Used by trainings</span><strong data-training-type-stat-used>{{ $trainingTypeOptions->sum('training_count') }}</strong></article>
                <article><span>Available for registration</span><strong data-training-type-stat-active>{{ $trainingTypeOptions->where('is_active', true)->count() }}</strong></article>
                <article><span>Inactive choices</span><strong data-training-type-stat-inactive>{{ $trainingTypeOptions->where('is_active', false)->count() }}</strong></article>
            </div>
            <div class="directory-toolbar directory-toolbar-offices">
                <label class="directory-search" for="trainingTypeSearch">
                    <span>Search training types</span>
                    <span class="directory-input-wrap"><i class="bi bi-search" aria-hidden="true"></i><input id="trainingTypeSearch" type="search" class="form-control" placeholder="Training type name" aria-controls="trainingTypesTable"></span>
                </label>
                <label for="trainingTypePageSize"><span>Rows</span><select id="trainingTypePageSize" class="form-select" aria-controls="trainingTypesTable">@foreach([10,25,50,100] as $size)<option value="{{ $size }}" @selected($size === 10)>{{ $size }} per page</option>@endforeach</select></label>
                <button class="btn btn-outline-secondary" type="button" data-training-type-refresh aria-label="Refresh training types"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh</button>
            </div>
            <div class="directory-table-meta"><span><i class="bi bi-arrow-down-up" aria-hidden="true"></i> Select a column heading to sort</span><span>Types linked to saved trainings are protected from deletion.</span></div>
            <div class="table-responsive directory-table-wrap">
                <table id="trainingTypesTable" class="table align-middle directory-table">
                    <thead><tr>
                        <th scope="col" class="directory-action-heading">Action</th>
                        <th scope="col"><button type="button" class="directory-sort" data-training-type-sort="label">Training type <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-training-type-sort="training_count">Trainings using it <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col">Status</th>
                    </tr></thead>
                    <tbody data-training-type-rows></tbody>
                </table>
            </div>
            <div class="directory-table-footer">
                <p class="mb-0" data-training-type-summary role="status" aria-live="polite"></p>
                <nav class="directory-pagination" aria-label="Training type directory pagination">
                    <button class="btn btn-sm btn-outline-secondary" type="button" data-training-type-previous><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button>
                    <span data-training-type-page aria-live="polite"></span>
                    <button class="btn btn-sm btn-outline-secondary" type="button" data-training-type-next>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
                </nav>
            </div>
        </div>
    </article>

    <div class="modal fade" id="trainingTypeEditModal" tabindex="-1" aria-labelledby="trainingTypeEditTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <form id="trainingTypeEditForm" method="post" action="{{ route('system.training-types.store') }}">
                    @csrf
                    <div class="modal-header">
                        <div>
                            <span class="settings-eyebrow">TRAINING CATALOGUE</span>
                            <h2 class="modal-title fs-5" id="trainingTypeEditTitle">Edit training type</h2>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label" for="trainingTypeEditName">Training type name</label>
                        <input id="trainingTypeEditName" name="name" class="form-control" maxlength="100" required>
                        <p class="settings-field-help mt-2 mb-0">Saved trainings using this type will be updated when you save.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-primary" type="submit"><i class="bi bi-check2" aria-hidden="true"></i> Save changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <script type="application/json" id="registeredTrainingTypes">{!! Illuminate\Support\Js::encode($trainingTypeOptions) !!}</script>
    <script src="{{ asset('src/js/shared/training-type-settings.js?v=training-type-refresh-1') }}" defer></script>
</section>
