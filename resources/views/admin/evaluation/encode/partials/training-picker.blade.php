<section class="encode-card training-picker-card" aria-labelledby="trainingPickerTitle">
  <div class="table-card-heading">
    <div>
      <span class="section-kicker">TRAINING DIRECTORY</span>
      <h2 id="trainingPickerTitle">Select one training for encoding</h2>
      <p>Choose an active training available to your region and office. Inactive trainings are excluded.</p>
    </div>
    <div class="training-picker-search">
      <label for="trainingPickerSearch">Search trainings</label>
      <input id="trainingPickerSearch" type="search" class="form-control" placeholder="Search ID, title, office, or location">
    </div>
  </div>
  <div class="training-picker-filters" aria-label="Filter trainings">
    <div><label for="trainingFilterYear">Year covered</label><select id="trainingFilterYear" class="form-select"><option value="">All years</option></select></div>
    <div><label for="trainingFilterRegion">Region</label><select id="trainingFilterRegion" class="form-select"><option value="">All regions</option></select></div>
    <div><label for="trainingFilterProvince">Province</label><select id="trainingFilterProvince" class="form-select"><option value="">All provinces</option></select></div>
    <div><label for="trainingFilterDistrict">District</label><select id="trainingFilterDistrict" class="form-select"><option value="">All districts</option></select></div>
    <div><label for="trainingFilterMunicipality">Municipality</label><select id="trainingFilterMunicipality" class="form-select"><option value="">All municipalities</option></select></div>
    <div><label for="trainingFilterBarangay">Barangay</label><select id="trainingFilterBarangay" class="form-select"><option value="">All barangays</option></select></div>
    <div><label for="trainingFilterOffice">Organization / office</label><select id="trainingFilterOffice" class="form-select"><option value="">All organizations</option></select></div>
  </div>
  <div class="training-picker-toolbar">
    <p id="trainingPickerRange" role="status" aria-live="polite">Showing 0 trainings</p>
    <div><button type="button" id="refreshTrainingPicker" class="training-picker-refresh"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh</button><label for="trainingPickerPageSize">Rows per page</label><select id="trainingPickerPageSize" class="form-select"><option>10</option><option>20</option><option>50</option><option>100</option><option value="all">All</option></select></div>
  </div>
  <div class="training-picker-table-scroll">
    <table class="training-picker-table">
      <thead><tr><th scope="col">Action</th><th scope="col" class="training-picker-sortable" data-sort="id" tabindex="0">Training ID <i class="bi bi-arrow-down-up" aria-hidden="true"></i></th><th scope="col" class="training-picker-sortable" data-sort="year" tabindex="0">Year covered <i class="bi bi-arrow-down-up" aria-hidden="true"></i></th><th scope="col" class="training-picker-sortable" data-sort="title" tabindex="0">Training <i class="bi bi-arrow-down-up" aria-hidden="true"></i></th><th scope="col" class="training-picker-sortable" data-sort="office" tabindex="0">Office <i class="bi bi-arrow-down-up" aria-hidden="true"></i></th><th scope="col" class="training-picker-sortable" data-sort="location" tabindex="0">Location <i class="bi bi-arrow-down-up" aria-hidden="true"></i></th><th scope="col" class="training-picker-sortable" data-sort="venue" tabindex="0">Venue <i class="bi bi-arrow-down-up" aria-hidden="true"></i></th><th scope="col" class="training-picker-sortable" data-sort="startDate" tabindex="0">Dates <i class="bi bi-arrow-down-up" aria-hidden="true"></i></th></tr></thead>
      <tbody id="trainingPickerBody"><tr><td colspan="8" class="training-picker-empty">Loading approved trainings…</td></tr></tbody>
    </table>
  </div>
  <div class="training-picker-footer"><span id="selectedTrainingLabel">No training selected</span><nav id="trainingPickerPagination" class="training-picker-pagination" aria-label="Training pages"></nav></div>
</section>
