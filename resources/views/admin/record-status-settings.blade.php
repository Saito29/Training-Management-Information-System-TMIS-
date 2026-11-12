<section class="tab-pane fade" id="record-statuses" role="tabpanel" aria-labelledby="record-statuses-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-tags" aria-hidden="true"></i></span>
            <div>
                <h2>Farmer statuses</h2>
                <p>Manage the statuses used for farmer profiles. Built-in statuses are always available.</p>
            </div>
            <button class="btn btn-primary ms-auto" type="button" data-bs-toggle="modal" data-bs-target="#recordStatusCreateModal">
                <i class="bi bi-plus-circle" aria-hidden="true"></i> Add status
            </button>
        </header>
    </article>

    <article class="settings-card mt-3 directory-card">
        <header class="settings-card-header directory-card-header">
            <span class="settings-section-icon"><i class="bi bi-card-list" aria-hidden="true"></i></span>
            <div><h2>Status directory</h2><p>Active, Inactive, Waived, Deceased, and your custom farmer statuses.</p></div>
        </header>
        <div class="settings-card-body">
            <div class="directory-summary-grid" aria-label="Farmer status summary">
                <article><span>Total statuses</span><strong data-record-status-stat-total>{{ $recordStatusOptions->count() }}</strong></article>
                <article><span>Assigned farmers</span><strong data-record-status-stat-used>{{ $recordStatusOptions->sum('usage_count') }}</strong></article>
                <article><span>Available</span><strong data-record-status-stat-active>{{ $recordStatusOptions->where('is_active', true)->count() }}</strong></article>
                <article><span>Unavailable</span><strong data-record-status-stat-inactive>{{ $recordStatusOptions->where('is_active', false)->count() }}</strong></article>
            </div>
            <div class="directory-toolbar directory-toolbar-offices">
                <label class="directory-search" for="recordStatusSearch">
                    <span>Search statuses</span>
                    <span class="directory-input-wrap"><i class="bi bi-search" aria-hidden="true"></i><input id="recordStatusSearch" type="search" class="form-control" placeholder="Name or details" aria-controls="recordStatusesTable"></span>
                </label>
                <label for="recordStatusPageSize"><span>Rows</span><select id="recordStatusPageSize" class="form-select" aria-controls="recordStatusesTable">@foreach([10,25,50,100] as $size)<option value="{{ $size }}" @selected($size === 10)>{{ $size }} per page</option>@endforeach</select></label>
                <button class="btn btn-outline-secondary" type="button" data-record-status-refresh aria-label="Refresh farmer statuses"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh</button>
            </div>
            <div class="directory-table-meta"><span><i class="bi bi-arrow-down-up" aria-hidden="true"></i> Select a column heading to sort</span><span>Built-in statuses cannot be edited or deleted. Assigned custom statuses cannot be deleted.</span></div>
            <div class="table-responsive directory-table-wrap">
                <table id="recordStatusesTable" class="table align-middle directory-table">
                    <thead><tr>
                        <th scope="col" class="directory-action-heading">Action</th>
                        <th scope="col"><button type="button" class="directory-sort" data-record-status-sort="name">Status <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-record-status-sort="usage_count">Assigned farmers <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col">Availability</th>
                    </tr></thead>
                    <tbody data-record-status-rows><tr><td class="directory-empty" colspan="4">Loading farmer statuses…</td></tr></tbody>
                </table>
            </div>
            <div class="directory-table-footer">
                <p class="mb-0" data-record-status-summary role="status" aria-live="polite"></p>
                <nav class="directory-pagination" aria-label="Farmer status directory pagination">
                    <button class="btn btn-sm btn-outline-secondary" type="button" data-record-status-previous><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button>
                    <span data-record-status-page aria-live="polite"></span>
                    <button class="btn btn-sm btn-outline-secondary" type="button" data-record-status-next>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
                </nav>
            </div>
        </div>
    </article>

    <div class="modal fade" id="recordStatusCreateModal" tabindex="-1" aria-labelledby="recordStatusCreateTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <form id="recordStatusRegistration" method="post" action="{{ route('system.record-statuses.store') }}">
                    @csrf
                    <div class="modal-header">
                        <div>
                            <span class="settings-eyebrow">FARMER STATUS</span>
                            <h2 class="modal-title fs-5" id="recordStatusCreateTitle">Add status</h2>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label" for="recordStatusName">Status name</label>
                        <input id="recordStatusName" name="name" class="form-control" maxlength="100" placeholder="e.g. For monitoring" required>
                        <label class="form-label mt-3" for="recordStatusDescription">Details <span class="settings-optional">Optional</span></label>
                        <textarea id="recordStatusDescription" name="description" class="form-control" maxlength="500" rows="3" placeholder="Describe when this status should be used"></textarea>
                        <p class="settings-field-help mt-3 mb-0">Custom statuses are used as the farmer’s main status. Built-in Active, Inactive, Waived, and Deceased statuses are reserved.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-primary" type="submit"><i class="bi bi-plus-circle" aria-hidden="true"></i> Add status</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="recordStatusEditModal" tabindex="-1" aria-labelledby="recordStatusEditTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <form id="recordStatusEditForm" method="post" action="{{ route('system.record-statuses.store') }}">
                    @csrf
                    <div class="modal-header">
                        <div>
                            <span class="settings-eyebrow">CUSTOM FARMER STATUS</span>
                            <h2 class="modal-title fs-5" id="recordStatusEditTitle">Edit status</h2>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label" for="recordStatusEditName">Status name</label>
                        <input id="recordStatusEditName" name="name" class="form-control" maxlength="100" required>
                        <label class="form-label mt-3" for="recordStatusEditDescription">Details</label>
                        <textarea id="recordStatusEditDescription" name="description" class="form-control" maxlength="500" rows="3"></textarea>
                        <div class="form-check form-switch mt-3">
                            <input id="recordStatusEditActive" name="is_active" type="checkbox" value="1" class="form-check-input" role="switch">
                            <label class="form-check-label" for="recordStatusEditActive">Available for assignment</label>
                        </div>
                        <p class="settings-field-help mt-2 mb-0">Farmers already assigned this status keep it if you make it unavailable.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-primary" type="submit"><i class="bi bi-check2" aria-hidden="true"></i> Save changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script type="application/json" id="registeredRecordStatuses">{!! Illuminate\Support\Js::encode($recordStatusOptions) !!}</script>
    <script src="{{ asset('src/js/shared/record-status-settings.js?v=farmer-status-management-2') }}" defer></script>
</section>
