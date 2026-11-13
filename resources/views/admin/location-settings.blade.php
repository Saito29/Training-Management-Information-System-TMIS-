<section class="tab-pane fade" id="locations" role="tabpanel" aria-labelledby="locations-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-geo-alt" aria-hidden="true"></i></span>
            <div>
                <h2>Geographic locations</h2>
                <p>Create a location in the order Region, Province, District, Municipality / City, then Barangay.</p>
            </div>
            <button type="button" class="btn btn-outline-success ms-auto" data-bs-toggle="modal" data-bs-target="#locationImportModal">
                <i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i> Import Excel
            </button>
        </header>
        <form method="post" action="{{ route('system.locations.store') }}" data-settings-form id="locationRegistration">
            @csrf
            <div class="settings-card-body">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label" for="locationKind">Location type</label>
                        <select class="form-select" name="kind" id="locationKind" required>
                            <option value="region">Region</option>
                            <option value="province">Province</option>
                            <option value="district">District</option>
                            <option value="municipality">Municipality / City</option>
                            <option value="barangay">Barangay</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="locationName">Official location name</label>
                        <input class="form-control" id="locationName" name="name" maxlength="150" placeholder="Enter the official location name" required>
                    </div>
                    <div class="col-md-6" data-location-region>
                        <label class="form-label" for="locationRegion">Region</label>
                        <select class="form-select" name="region_id" id="locationRegion">
                            <option value="">Select a region</option>
                            @foreach($regions as $region)
                                <option value="{{ $region->region_id }}" data-updated-at="{{ $region->updated_at }}">{{ $region->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="col-md-6" data-location-parent>
                        <label class="form-label" for="locationParent">Parent location</label>
                        <select class="form-select" name="parent_id" id="locationParent">
                            <option value="">Select a region first</option>
                        </select>
                    </div>
                </div>
                <p class="settings-field-help mt-3 mb-0">Locations become available during participant registration. A location with child locations or saved records cannot be removed.</p>
            </div>
            <footer class="settings-card-footer">
                <button type="button" class="btn btn-outline-secondary" data-location-cancel hidden>Cancel edit</button>
                <button class="btn btn-primary" type="submit"><i class="bi bi-plus-circle" aria-hidden="true"></i> <span data-location-submit-label>Create location</span></button>
            </footer>
        </form>
    </article>

    <div class="modal fade" id="locationImportModal" tabindex="-1" aria-labelledby="locationImportTitle" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <div>
                        <h2 class="modal-title fs-5" id="locationImportTitle">Import locations from Excel</h2>
                        <p class="text-body-secondary mb-0">Use the XLSX template to add locations to the directory.</p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info" role="note">
                        <h3 class="h6">How to prepare the workbook</h3>
                        <ol class="mb-2">
                            <li>Download the template and keep its five column headings: Region, Province, District, Municipality / City, Barangay.</li>
                            <li>Use one location path per row. Repeat parent names on each row; include each level from Region through the deepest location you are adding.</li>
                            <li>Region and Province are required. Do not skip a hierarchy level; a Barangay row needs its District and Municipality / City.</li>
                            <li>Existing names under the same parent are left unchanged. The import only adds missing paths; it does not rename or delete locations.</li>
                        </ol>
                        <p class="mb-0">Blank descendant cells are allowed when a row ends at Province, District, or Municipality / City. Upload an <code>.xlsx</code> workbook with up to 20 MB.</p>
                    </div>
                    <a class="btn btn-outline-success mb-3" href="{{ route('system.locations.template') }}">
                        <i class="bi bi-download" aria-hidden="true"></i> Download XLSX template
                    </a>
                    <form id="locationImportForm" action="{{ route('system.locations.import') }}" method="post" enctype="multipart/form-data" data-location-import-form>
                        @csrf
                        <label class="form-label" for="locationImportFile">Excel workbook (.xlsx)</label>
                        <input class="form-control" id="locationImportFile" name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required>
                        <p class="form-text mb-0">Only the first worksheet is imported. Formulas are not accepted; enter plain location names.</p>
                    </form>
                    <p class="alert mt-3 mb-0" id="locationImportFeedback" role="status" aria-live="polite" hidden></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-location-import-close>Cancel</button>
                    <button type="submit" class="btn btn-success" form="locationImportForm" data-location-import-submit>
                        <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i> Upload and import
                    </button>
                </div>
            </div>
        </div>
    </div>

    <article class="settings-card mt-3 directory-card">
        <header class="settings-card-header directory-card-header">
            <span class="settings-section-icon"><i class="bi bi-map" aria-hidden="true"></i></span>
            <div><h2>Location directory</h2><p>Search and review the complete geographic hierarchy.</p></div>
        </header>
        <div class="settings-card-body">
            <div class="directory-summary-grid" aria-label="Location summary">
                <article><span>All locations</span><strong data-location-stat-total>0</strong></article>
                <article><span>Active locations</span><strong data-location-stat-active>0</strong></article>
                <article><span>Regions</span><strong data-location-stat-regions>{{ $directoryRegions->count() }}</strong></article>
                <article><span>Subregions</span><strong data-location-stat-subregions>{{ $locations->count() }}</strong></article>
            </div>
            <div class="directory-toolbar">
                <label class="directory-search" for="registeredLocationSearch">
                    <span>Search locations</span>
                    <span class="directory-input-wrap"><i class="bi bi-search" aria-hidden="true"></i><input id="registeredLocationSearch" type="search" class="form-control" placeholder="Name, ID, type, parent, or region" aria-controls="registeredLocationsTable"></span>
                </label>
                <label for="registeredLocationRegion"><span>Region</span><select id="registeredLocationRegion" class="form-select" aria-controls="registeredLocationsTable"><option value="">All regions</option>@foreach($directoryRegions as $region)<option value="{{ $region->region_id }}">{{ $region->name }}{{ $region->is_active ? "" : " (Inactive)" }}</option>@endforeach</select></label>
                <label for="registeredLocationDistrict"><span>District</span><select id="registeredLocationDistrict" class="form-select" aria-controls="registeredLocationsTable"><option value="">All districts</option></select></label>
                <label for="registeredLocationMunicipality"><span>Municipality / City</span><select id="registeredLocationMunicipality" class="form-select" aria-controls="registeredLocationsTable"><option value="">All municipalities / cities</option></select></label>
                <label for="registeredLocationPageSize"><span>Rows</span><select id="registeredLocationPageSize" class="form-select" aria-controls="registeredLocationsTable">@foreach([10,25,50,100] as $size)<option value="{{ $size }}" @selected($size === 10)>{{ $size }} per page</option>@endforeach</select></label>
            </div>
            <div class="directory-table-meta"><span><i class="bi bi-arrow-down-up" aria-hidden="true"></i> Select a column heading to sort</span><span data-location-count>{{ $directoryRegions->count() }} regions and {{ $locations->count() }} subregion records</span></div>
            <div class="table-responsive directory-table-wrap">
                <table id="registeredLocationsTable" class="table align-middle directory-table">
                    <thead><tr>
                        <th scope="col" class="directory-action-heading">Action</th>
                        <th scope="col"><button type="button" class="directory-sort" data-location-sort="id">ID <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-location-sort="kind">Type <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-location-sort="name">Location <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col">Hierarchy</th>
                        <th scope="col"><button type="button" class="directory-sort" data-location-sort="region">Region <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-location-sort="is_active">Status <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                        <th scope="col"><button type="button" class="directory-sort" data-location-sort="updated_at">Last updated <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                    </tr></thead>
                    <tbody data-location-rows></tbody>
                </table>
            </div>
            <div class="directory-table-footer"><p class="mb-0" data-location-summary role="status" aria-live="polite"></p><nav class="directory-pagination" aria-label="Location directory pagination"><button class="btn btn-sm btn-outline-secondary" type="button" data-location-previous><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button><span data-location-page aria-live="polite"></span><button class="btn btn-sm btn-outline-secondary" type="button" data-location-next>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button></nav></div>
        </div>
    </article>
    <script type="application/json" id="registeredRegions">{!! Illuminate\Support\Js::encode($directoryRegions) !!}</script>
    <script type="application/json" id="registeredLocations">{!! Illuminate\Support\Js::encode($locations) !!}</script>
    <script src="{{ asset('src/js/shared/location-settings.js?v=location-xlsx-import-1') }}" defer></script>
</section>
