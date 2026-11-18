document.addEventListener('DOMContentLoaded', () => {
  const byId = id => document.getElementById(id);
  const body = byId('trainingPickerBody');
  const form = document.querySelector('#preTestEncodeForm, #postTestEncodeForm, #trainingEvaluationEncodeForm, #rpEvaluationEncodeForm');
  if (!body || !form) return;
  const allowsNonInactiveTrainings = ['preTestEncodeForm', 'postTestEncodeForm', 'trainingEvaluationEncodeForm', 'rpEvaluationEncodeForm'].includes(form.id);

  const filters = {
    year: byId('trainingFilterYear'), region: byId('trainingFilterRegion'), province: byId('trainingFilterProvince'),
    district: byId('trainingFilterDistrict'), municipality: byId('trainingFilterMunicipality'),
    barangay: byId('trainingFilterBarangay'), office: byId('trainingFilterOffice'),
  };
  const values = (record, ...keys) => keys.map(key => record?.[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') || '';
  const trainingLocations = record => {
    const storedLocations = Array.isArray(record?.trainingLocations) ? record.trainingLocations.filter(location => location && typeof location === 'object') : [];
    const locations = storedLocations.length ? storedLocations : [record || {}];
    const seen = new Set();

    return locations.map((location, index) => {
      const venue = String(values(location, 'venue') || (index === 0 ? values(record, 'venue', 'venue_location') : '')).trim();
      const barangay = String(values(location, 'barangay') || (index === 0 ? values(record, 'barangay') : '')).trim();
      const municipality = String(values(location, 'municipality') || (index === 0 ? values(record, 'municipality') : '')).trim();
      const province = String(values(location, 'province') || (index === 0 ? values(record, 'province') : '')).trim();
      const region = String(values(location, 'region') || (index === 0 ? values(record, 'region') : '')).trim();
      const address = [barangay ? `Brgy. ${barangay}` : '', municipality, province].filter(Boolean).join(', ');
      const identity = `${venue}|${address}|${region}`.toLocaleLowerCase();

      if (seen.has(identity) || (!venue && !address && !region)) return null;
      seen.add(identity);

      return { venue, address: address || venue || 'Location not set', region };
    }).filter(Boolean);
  };
  const trainingLocation = record => trainingLocations(record).map(location => [location.address, location.region].filter(Boolean).join(' · ')).join(' | ');
  const dateLabel = value => {
    if (!value) return '—';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(date);
  };
  let trainings = [];
  let selectedId = '';
  let page = 1;
  let sort = {key: 'year', direction: 'desc'};
  const registrationScope = window.TMIS_PAGE?.registration || {};
  const isVisible = (ids, id) => !Array.isArray(ids) || ids.some(value => String(value) === String(id));
  const isTrainingActive = record => record.is_active === true || record.is_active === 1 || record.is_active === '1';

  const availableTrainings = records => records
    .filter(record => isVisible(registrationScope.regionIds, record.region_id) && isVisible(registrationScope.officeIds, record.org_id))
    .filter(record => {
      const status = String(record.status || record.workflowStatus || '').trim().toLowerCase();
      if (allowsNonInactiveTrainings) return status !== 'inactive' && isTrainingActive(record);
      return status === 'approved & accepted';
    })
    .map(record => ({
      ...record,
      id: String(record.id || ''),
      title: String(values(record, 'title', 'training_title', 'name') || 'Untitled training'),
      year: String(values(record, 'yearCovered', 'year_covered') || String(values(record, 'startDate', 'start_date')).slice(0, 4) || ''),
      type: String(values(record, 'training_type', 'type') || 'Training'),
      office: String(values(record, 'office', 'implementingOffice', 'implementing_office') || ''),
      region: String(values(record, 'region') || ''), province: String(values(record, 'province') || ''),
      district: String(values(record, 'district') || ''), municipality: String(values(record, 'municipality') || ''),
      barangay: String(values(record, 'barangay') || ''), venue: String(values(record, 'venue', 'venue_location') || ''),
      startDate: String(values(record, 'startDate', 'start_date') || ''), endDate: String(values(record, 'endDate', 'end_date') || ''),
      trainingLocations: trainingLocations(record),
      location: String(trainingLocation(record)),
    })).filter(record => record.id);

  const fillOptions = (select, label, options) => {
    const selected = select.value;
    select.replaceChildren(new Option(`All ${label}`, ''), ...[...new Set(options.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(value => new Option(value, value)));
    select.value = [...select.options].some(option => option.value === selected) ? selected : '';
  };
  const hydrateFilters = () => {
    fillOptions(filters.year, 'years', trainings.map(record => record.year));
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
    if (!record && byId('testDate')) byId('testDate').value = '';
    byId('selectedTrainingLabel').textContent = record ? `${record.id} · ${record.title}` : 'No training selected';
    byId('selectedTrainingLabel').classList.toggle('training-picker-selected', Boolean(record));
    if (record && useDate && byId('testDate')) byId('testDate').value = record.startDate;
  };
  const matches = () => {
    const query = byId('trainingPickerSearch').value.trim().toLocaleLowerCase();
    return trainings.filter(record => Object.entries(filters).every(([key, input]) => !input.value || record[key] === input.value)
      && (!query || `${record.id} ${record.title} ${record.office} ${record.region} ${record.province} ${record.district} ${record.municipality} ${record.barangay} ${record.location} ${record.venue}`.toLocaleLowerCase().includes(query)));
  };
  const sortedRows = rows => [...rows].sort((left, right) => {
    const comparison = String(left[sort.key] ?? '').localeCompare(String(right[sort.key] ?? ''), undefined, {numeric:true, sensitivity:'base'});
    return sort.direction === 'asc' ? comparison : -comparison;
  });
  const render = () => {
    const rows = sortedRows(matches());
    const pageSize = byId('trainingPickerPageSize').value === 'all' ? Math.max(rows.length, 1) : Number(byId('trainingPickerPageSize').value);
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, pageCount);
    const offset = (page - 1) * pageSize;
    const visible = rows.slice(offset, offset + pageSize);
    body.replaceChildren();
    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 8; cell.className = 'training-picker-empty';
      cell.textContent = trainings.length ? 'No non-inactive trainings match these filters.' : 'No non-inactive trainings are available in your region and office visibility.';
      row.append(cell); body.append(row);
    }
    visible.forEach(record => {
      const row = document.createElement('tr');
      const selected = record.id === selectedId;
      const trainingStatus = String(record.status || record.workflowStatus || '').trim();
      const canEncode = allowsNonInactiveTrainings
        ? trainingStatus.toLowerCase() !== 'inactive' && isTrainingActive(record)
        : trainingStatus.toLowerCase() === 'approved & accepted' && isTrainingActive(record);
      if (selected) row.classList.add('is-selected');
      const actionCell = document.createElement('td');
      actionCell.className = 'training-picker-action-cell';
      const radio = document.createElement('input');
      radio.type = 'checkbox';
      radio.name = 'trainingPickerSelection';
      radio.value = record.id;
      radio.checked = selected;
      radio.className = 'training-picker-select';
      radio.disabled = !canEncode;
      radio.setAttribute('aria-label', `Select training ${record.id}`);
      if (!canEncode) radio.title = 'Only active trainings can be used for encoding.';
      radio.addEventListener('change', () => select(radio.checked ? record.id : ''));
      actionCell.append(radio);
      row.append(actionCell);
      const cells = [
        {value:record.id},
        {value:record.year || '—', kind:'year'},
        {value:record.title, kind:'training'},
        {value:record.office || '—', kind:'office'},
        {value:record.location || '—', kind:'location'},
        {value:record.venue || '—'},
        {value:`${dateLabel(record.startDate)}${record.endDate && record.endDate !== record.startDate ? ` – ${dateLabel(record.endDate)}` : ''}`},
      ];
      cells.forEach((item, index) => {
        const cell = document.createElement('td');
        if (item.kind === 'year') {
          const badge = document.createElement('span');
          badge.className = 'training-picker-year';
          badge.textContent = item.value;
          cell.append(badge);
        } else if (item.kind === 'training') {
          cell.className = 'training-picker-training';
          const title = document.createElement('strong');
          title.textContent = item.value;
          const details = document.createElement('small');
          details.textContent = `${record.type} · ${trainingStatus || 'Status unavailable'}${!canEncode ? ' · Not available for encoding' : ''}`;
          cell.append(title, details);
        } else if (item.kind === 'office') {
          const office = document.createElement('span');
          office.className = 'training-picker-office';
          office.textContent = item.value;
          cell.append(office);
        } else if (item.kind === 'location') {
          cell.className = 'training-picker-location';
          const location = document.createElement('strong');
          const locationList = record.trainingLocations;
          location.textContent = locationList[0]?.address || item.value;
          const details = document.createElement('small');
          details.textContent = locationList[0]?.region || record.region || 'Region not set';
          cell.append(location, details);
          locationList.slice(1).forEach((secondaryLocation, index) => {
            const secondary = document.createElement('small');
            secondary.className = 'training-picker-secondary-location';
            secondary.textContent = `Additional location ${index + 1}: ${secondaryLocation.address}${secondaryLocation.region ? ` · ${secondaryLocation.region}` : ''}${secondaryLocation.venue && secondaryLocation.venue !== record.venue ? ` · ${secondaryLocation.venue}` : ''}`;
            cell.append(secondary);
          });
        } else {
          cell.textContent = item.value;
        }
        row.append(cell);
      });
      row.addEventListener('click', event => { if (canEncode && !event.target.closest('input,button,a,label,select,textarea')) select(record.id); });
      body.append(row);
    });
    byId('trainingPickerRange').textContent = rows.length ? `Showing ${offset + 1}–${offset + visible.length} of ${rows.length} trainings` : 'Showing 0 of 0 trainings';
    const nav = byId('trainingPickerPagination'); nav.replaceChildren();
    const button = (label, nextPage, disabled, current = false) => { const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.disabled = disabled; element.setAttribute('aria-label', label === '‹' || label === '›' ? (label === '‹' ? 'Previous page' : 'Next page') : `Page ${label}`); if (current) element.setAttribute('aria-current', 'page'); element.addEventListener('click', () => { page = nextPage; render(); }); nav.append(element); };
    button('‹', page - 1, page === 1);
    for (let number = 1; number <= pageCount; number += 1) if (pageCount <= 5 || number === 1 || number === pageCount || Math.abs(number - page) <= 1) button(String(number), number, false, number === page);
    button('›', page + 1, page === pageCount);
    body.closest('table').querySelectorAll('[data-sort]').forEach(header => {
      const active = sort.key === header.dataset.sort;
      header.setAttribute('aria-sort', active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
      const icon = header.querySelector('i');
      if (icon) icon.className = active ? `bi ${sort.direction === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}` : 'bi bi-arrow-down-up';
    });
  };
  const select = id => {
    selectedId = id && selectedId === id ? '' : id;
    const record = selectedTraining();
    populateForm(record);
    render();
    window.dispatchEvent(new CustomEvent('tmis:training-selected', { detail: record }));
  };
  const refresh = () => {
    trainings = availableTrainings(window.TmisStore.records('tmis-trainings'));
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
  body.closest('table').querySelectorAll('[data-sort]').forEach(header => {
    const sortByHeader = () => {
      sort = sort.key === header.dataset.sort ? {key: sort.key, direction: sort.direction === 'asc' ? 'desc' : 'asc'} : {key: header.dataset.sort, direction: 'asc'};
      page = 1;
      render();
    };
    header.addEventListener('click', sortByHeader);
    header.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sortByHeader(); } });
  });
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
  trainings = availableTrainings(window.TmisStore.records('tmis-trainings'));
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
  window.TMIS_TRAINING_PICKER = { select, refresh, selectedTraining };
  window.dispatchEvent(new CustomEvent('tmis:training-selected', { detail: selectedTraining() }));
});
