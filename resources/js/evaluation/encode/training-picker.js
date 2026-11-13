document.addEventListener('DOMContentLoaded', () => {
  const byId = id => document.getElementById(id);
  const body = byId('trainingPickerBody');
  const form = document.querySelector('#preTestEncodeForm, #postTestEncodeForm, #trainingEvaluationEncodeForm, #rpEvaluationEncodeForm');
  if (!body || !form) return;

  const filters = {
    region: byId('trainingFilterRegion'), province: byId('trainingFilterProvince'),
    district: byId('trainingFilterDistrict'), municipality: byId('trainingFilterMunicipality'),
    barangay: byId('trainingFilterBarangay'), office: byId('trainingFilterOffice'),
  };
  const values = (record, ...keys) => keys.map(key => record?.[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') || '';
  const trainingLocation = record => values(record, 'location') || [values(record, 'barangay'), values(record, 'municipality'), values(record, 'province')].filter(Boolean).join(', ');
  const dateLabel = value => {
    if (!value) return '—';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(date);
  };
  let trainings = [];
  let selectedId = '';
  let page = 1;

  const approvedTrainings = records => records
    .filter(record => record.is_active !== false && String(record.status || record.workflowStatus || '').trim().toLowerCase() === 'approved & accepted')
    .map(record => ({
      ...record,
      id: String(record.id || ''),
      title: String(values(record, 'title', 'training_title', 'name') || 'Untitled training'),
      office: String(values(record, 'office', 'implementingOffice', 'implementing_office') || ''),
      region: String(values(record, 'region') || ''), province: String(values(record, 'province') || ''),
      district: String(values(record, 'district') || ''), municipality: String(values(record, 'municipality') || ''),
      barangay: String(values(record, 'barangay') || ''), venue: String(values(record, 'venue', 'venue_location') || ''),
      startDate: String(values(record, 'startDate', 'start_date') || ''), endDate: String(values(record, 'endDate', 'end_date') || ''),
      location: String(trainingLocation(record)),
    })).filter(record => record.id);

  const fillOptions = (select, label, options) => {
    const selected = select.value;
    select.replaceChildren(new Option(`All ${label}`, ''), ...[...new Set(options.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(value => new Option(value, value)));
    select.value = [...select.options].some(option => option.value === selected) ? selected : '';
  };
  const hydrateFilters = () => {
    fillOptions(filters.region, 'regions', trainings.map(record => record.region));
    fillOptions(filters.province, 'provinces', trainings.map(record => record.province));
    fillOptions(filters.district, 'districts', trainings.map(record => record.district));
    fillOptions(filters.municipality, 'municipalities', trainings.map(record => record.municipality));
    fillOptions(filters.barangay, 'barangays', trainings.map(record => record.barangay));
    fillOptions(filters.office, 'organizations', trainings.map(record => record.office));
  };
  const selectedTraining = () => trainings.find(record => record.id === selectedId) || null;
  const populateForm = (record, { useDate = true } = {}) => {
    byId('trainingId').value = record?.id || '';
    byId('trainingTitleValue').value = record?.title || '';
    byId('trainingLocationValue').value = record?.location || '';
    byId('trainingVenueValue').value = record?.venue || '';
    byId('trainingOrganizationValue').value = record?.office || '';
    byId('trainingStartDateValue').value = record ? dateLabel(record.startDate) : '';
    byId('trainingEndDateValue').value = record ? dateLabel(record.endDate) : '';
    byId('selectedTrainingLabel').textContent = record ? `${record.id} · ${record.title}` : 'No training selected';
    byId('selectedTrainingLabel').classList.toggle('training-picker-selected', Boolean(record));
    if (record && useDate && byId('testDate')) byId('testDate').value = record.startDate;
  };
  const matches = () => {
    const query = byId('trainingPickerSearch').value.trim().toLocaleLowerCase();
    return trainings.filter(record => Object.entries(filters).every(([key, input]) => !input.value || record[key] === input.value)
      && (!query || `${record.id} ${record.title} ${record.office} ${record.region} ${record.province} ${record.district} ${record.municipality} ${record.barangay} ${record.location} ${record.venue}`.toLocaleLowerCase().includes(query)));
  };
  const render = () => {
    const rows = matches();
    const pageSize = byId('trainingPickerPageSize').value === 'all' ? Math.max(rows.length, 1) : Number(byId('trainingPickerPageSize').value);
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, pageCount);
    const offset = (page - 1) * pageSize;
    const visible = rows.slice(offset, offset + pageSize);
    body.replaceChildren();
    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7; cell.className = 'training-picker-empty';
      cell.textContent = trainings.length ? 'No approved trainings match these filters.' : 'No active approved and accepted trainings are available to link.';
      row.append(cell); body.append(row);
    }
    visible.forEach(record => {
      const row = document.createElement('tr');
      const selected = record.id === selectedId;
      if (selected) row.classList.add('is-selected');
      const radioCell = document.createElement('td');
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'trainingPickerSelection'; radio.value = record.id; radio.checked = selected;
      radio.setAttribute('aria-label', `Select training ${record.id}`);
      radio.addEventListener('change', () => select(record.id));
      radioCell.append(radio); row.append(radioCell);
      [record.id, record.title, record.office || '—', record.location || '—', record.venue || '—', `${dateLabel(record.startDate)}${record.endDate && record.endDate !== record.startDate ? ` – ${dateLabel(record.endDate)}` : ''}`].forEach((value, index) => {
        const cell = document.createElement('td');
        if (index === 1) { cell.className = 'training-picker-training'; const title = document.createElement('strong'); title.textContent = value; const details = document.createElement('small'); details.textContent = `${record.region || 'Region not set'}${record.district ? ` · ${record.district}` : ''}`; cell.append(title, details); }
        else cell.textContent = value;
        row.append(cell);
      });
      row.addEventListener('click', event => { if (event.target !== radio) select(record.id); });
      body.append(row);
    });
    byId('trainingPickerRange').textContent = rows.length ? `Showing ${offset + 1}–${offset + visible.length} of ${rows.length} trainings` : 'Showing 0 of 0 trainings';
    const nav = byId('trainingPickerPagination'); nav.replaceChildren();
    const button = (label, nextPage, disabled, current = false) => { const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.disabled = disabled; element.setAttribute('aria-label', label === '‹' || label === '›' ? (label === '‹' ? 'Previous page' : 'Next page') : `Page ${label}`); if (current) element.setAttribute('aria-current', 'page'); element.addEventListener('click', () => { page = nextPage; render(); }); nav.append(element); };
    button('‹', page - 1, page === 1);
    for (let number = 1; number <= pageCount; number += 1) if (pageCount <= 5 || number === 1 || number === pageCount || Math.abs(number - page) <= 1) button(String(number), number, false, number === page);
    button('›', page + 1, page === pageCount);
  };
  const select = id => {
    selectedId = id;
    const record = selectedTraining();
    populateForm(record);
    render();
    window.dispatchEvent(new CustomEvent('tmis:training-selected', { detail: record }));
  };
  const refresh = () => {
    trainings = approvedTrainings(window.TmisStore.records('tmis-trainings'));
    hydrateFilters();
    const record = selectedTraining();
    if (selectedId && !record) {
      selectedId = '';
      populateForm(null);
    } else if (record) {
      populateForm(record, { useDate: false });
    }
    render();
    window.dispatchEvent(new CustomEvent('tmis:training-selected', { detail: selectedTraining() }));
  };

  form.insertAdjacentHTML('afterbegin', '<input type="hidden" id="trainingId" name="trainingId">');
  Object.values(filters).forEach(select => select.addEventListener('change', () => { page = 1; render(); }));
  byId('trainingPickerSearch').addEventListener('input', () => { page = 1; render(); });
  byId('trainingPickerPageSize').addEventListener('change', () => { page = 1; render(); });
  byId('refreshTrainingPicker').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      if (window.TMIS_PAGE) await window.TmisStore.refresh();
      refresh();
    } catch (error) {
      byId('trainingPickerRange').textContent = error.message || 'Trainings could not be refreshed.';
    } finally {
      button.disabled = false;
    }
  });
  window.addEventListener('tmis:data-updated', refresh);
  trainings = approvedTrainings(window.TmisStore.records('tmis-trainings'));
  hydrateFilters();
  const params = new URLSearchParams(location.search);
  const resultKey = location.pathname.includes('/pre-test') ? 'tmis-pre-test-encoded'
    : location.pathname.includes('/post-test') ? 'tmis-post-test-encoded'
      : location.pathname.includes('/training-evaluation') ? 'tmis-training-evaluation-encoded'
        : location.pathname.includes('/rp-evaluation') ? 'tmis-rp-evaluation-encoded'
          : '';
  const saved = window.TMIS_ENCODED_RECORD || (resultKey
    ? window.TmisStore.records(resultKey).find(record => record.id === (params.get('record') || params.get('draft')))
    : null);
  const savedTraining = saved?.trainingId
    ? trainings.find(record => record.id === String(saved.trainingId))
    : trainings.find(record => String(record._db_id || '') === String(saved?.trainingDatabaseId || ''));
  const existingTrainingId = String(savedTraining?.id || params.get('trainingId') || '');
  if (existingTrainingId && trainings.some(record => record.id === existingTrainingId)) { selectedId = existingTrainingId; populateForm(selectedTraining(), { useDate: !saved?.date }); }
  else if (saved?.trainingTitle) {
    populateForm({ id: String(saved.trainingId || ''), title: saved.trainingTitle, office: saved.trainingOrganization || '', location: saved.trainingLocation || '', venue: saved.trainingVenue || '', startDate: saved.trainingStartDate || '', endDate: saved.trainingEndDate || '' }, { useDate: !saved?.date });
  }
  render();
  window.dispatchEvent(new CustomEvent('tmis:training-selected', { detail: selectedTraining() }));
  window.TMIS_TRAINING_PICKER = { select, refresh, selectedTraining };
});
