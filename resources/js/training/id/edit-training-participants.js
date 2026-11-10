document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('participants-panel');
  if (!panel) return;
  const training = window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings') : null;
  const storageKey = `tmis:training:${training?.id || 'TRN-000246'}:participants`;
  const names = [
    ['Dela Cruz', 'Juan', 'Santos'], ['Reyes', 'Pedro', 'Garcia'], ['Mendoza', 'Carlo', 'Ramos'],
    ['Santos', 'Maria', 'Reyes'], ['Bautista', 'Rogelio', 'Cruz'], ['Ramos', 'Antonio', 'Lopez'],
    ['Garcia', 'Jose', 'Aquino'], ['Flores', 'Roberto', 'Diaz'], ['Villanueva', 'Ana', 'Cruz'],
    ['Navarro', 'Mark', 'Santos'], ['Castillo', 'Noel', 'Mercado'], ['Aquino', 'Daniel', 'Reyes'],
    ['Mercado', 'Paolo', 'Cruz'], ['Torres', 'Francisco', 'Garcia'], ['Perez', 'Emmanuel', 'Ramos'],
    ['Lopez', 'Elena', 'Santos'], ['Domingo', 'Rico', 'Bautista'], ['Cruz', 'Eduardo', 'Diaz'],
    ['Rivera', 'Rommel', 'Aquino'], ['Fernandez', 'Nestor', 'Reyes'], ['Gonzales', 'Grace', 'Mercado'],
    ['Salazar', 'Joel', 'Cruz'], ['Pascual', 'Albert', 'Flores'], ['Valdez', 'Michael', 'Ramos'],
    ['Soriano', 'Leah', 'Cruz'], ['Alvarez', 'Ramon', 'Diaz'], ['Manalo', 'Teresa', 'Reyes'],
    ['Robles', 'Rafael', 'Lopez'], ['Ocampo', 'Nina', 'Santos'], ['De Guzman', 'Mario', 'Ramos'],
    ['Lim', 'Carmen', 'Flores'], ['Padilla', 'Ernesto', 'Cruz'], ['Magsino', 'Rosa', 'Garcia'],
    ['Aguilar', 'Dennis', 'Reyes'], ['Francisco', 'Lourdes', 'Aquino'], ['Tadeo', 'Victor', 'Santos'],
  ];
  const barangays = ['San Antonio', 'Darasa', 'Balele', 'Trapiche', 'Mabini', 'Poblacion'];
  const directory = (window.TMIS_PAGE ? window.TmisStore.records('tmis-farmers') : names.map(([last, first, middle], index) => {
    const location = index < 24 ? ['Batangas', 'Batangas 3rd District', 'Tanauan City', barangays[index % barangays.length]]
      : index < 30 ? ['Batangas', 'Batangas 4th District', 'Lipa City', ['Balintawak', 'Sabang', 'Tambo'][index % 3]]
        : ['Laguna', 'Laguna 2nd District', 'Calamba City', ['Canlubang', 'Poblacion', 'Parian'][index % 3]];
    return {
      id: `FMR-2025-${String(index + 1).padStart(3, '0')}`,
      name: `${first} ${middle} ${last}`,
      province: location[0], district: location[1], municipality: location[2], barangay: location[3], region: 'Region IV-A',
    };
  })).map(record => {
    const beneficiaries = record.beneficiaryOffices || [];
    const trainingBeneficiary = beneficiaries.find(beneficiary =>
      (!training?.region_id || String(beneficiary.region_id) === String(training.region_id)) &&
      (!training?.org_id || String(beneficiary.org_id) === String(training.org_id)));
    const primaryBeneficiary = beneficiaries.find(beneficiary => beneficiary.isPrimary);
    return {
      ...record,
      region: trainingBeneficiary?.region || primaryBeneficiary?.region || record.region || '',
      name: record.name || [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' '),
    };
  });
  const knownIds = new Set(directory.map(record => record.id));
  const initialIds = directory.slice(0, 24).map(record => record.id);
  const $ = selector => panel.querySelector(selector);
  const locationKeys = ['region', 'province', 'municipality'];
  const normalized = value => String(value || '').trim().toLocaleLowerCase();
  const trainingLocationMatches = record => ['province', 'municipality'].every(key =>
    !training?.[key] || normalized(record[key]) === normalized(training[key]));
  const eligibleForTraining = record => {
    if (!window.TMIS_PAGE) return true;
    if (record.status !== 'Active') return false;
    return (record.beneficiaryOffices || []).some(beneficiary =>
      String(beneficiary.region_id) === String(training?.region_id) &&
      String(beneficiary.org_id) === String(training?.org_id));
  };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function loadRoster() {
    const roster = window.TMIS_PAGE
      ? window.TmisStore.selected('tmis-trainings')?.participants
      : null;
    if (Array.isArray(roster)) return new Set(roster.filter(id => knownIds.has(id)));
    return new Set(window.TMIS_PAGE ? [] : initialIds);
  }
  let currentIds = loadRoster();
  const selectedIds = new Set();
  let activeTab = 'current';
  let feedback = '';
  const columns = [
    ['id', 'Farmer ID'], ['name', 'Full name'], ['region', 'Region'],
    ['province', 'Province'], ['municipality', 'Municipality / City'], ['barangay', 'Barangay'],
  ];
  const tableState = {
    current: { page: 1, pageSize: 20, columns: {} },
    available: { page: 1, pageSize: 20, columns: {} },
  };

  function installTableControls(type) {
    const content = $(`#edit${type === 'current' ? 'Current' : 'Add'}Panel`);
    const head = content.querySelector('thead');
    const row = document.createElement('tr');
    row.className = 'edit-participants-column-filters';
    if (type === 'available') row.append(document.createElement('th'));
    columns.forEach(([key, label]) => {
      const cell = document.createElement('th');
      const input = document.createElement('input');
      input.className = 'form-control form-control-sm';
      input.type = 'search';
      input.dataset.columnFilter = key;
      input.setAttribute('aria-label', `Filter ${type === 'current' ? 'current' : 'available'} participants by ${label}`);
      input.placeholder = `Filter ${label.toLowerCase()}`;
      cell.append(input);
      row.append(cell);
    });
    if (type === 'current') row.append(document.createElement('th'));
    head.append(row);
    row.addEventListener('input', event => {
      const input = event.target.closest('[data-column-filter]');
      if (!input) return;
      tableState[type].columns[input.dataset.columnFilter] = input.value.trim().toLocaleLowerCase();
      tableState[type].page = 1;
      render();
    });
    const pagination = document.createElement('div');
    pagination.className = 'edit-participants-pagination';
    pagination.setAttribute('aria-label', `${type === 'current' ? 'Current' : 'Available'} participant pages`);
    content.querySelector('.edit-participants-table-wrap').after(pagination);
    pagination.addEventListener('click', event => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      tableState[type].page += button.dataset.page === 'next' ? 1 : -1;
      render();
    });
    pagination.addEventListener('change', event => {
      if (!event.target.matches('[data-page-size]')) return;
      tableState[type].pageSize = event.target.value === 'all' ? 'all' : Number(event.target.value);
      tableState[type].page = 1;
      render();
    });
    tableState[type].pagination = pagination;
  }

  function matchesColumns(record, type) {
    return Object.entries(tableState[type].columns).every(([key, term]) =>
      !term || String(record[key]).toLocaleLowerCase().includes(term));
  }

  function pageRows(rows, type) {
    const state = tableState[type];
    const size = state.pageSize === 'all' ? Math.max(1, rows.length) : state.pageSize;
    const pages = Math.max(1, Math.ceil(rows.length / size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * size;
    state.pagination.innerHTML = `<span>Showing ${rows.length ? start + 1 : 0}–${Math.min(start + size, rows.length)} of ${rows.length}</span><div class="edit-participants-page-actions"><label>Rows per page <select class="form-select form-select-sm" data-page-size><option value="all">All</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="500">500</option><option value="1000">1,000</option></select></label><button type="button" data-page="previous" aria-label="Previous page" ${state.page === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button><span>Page ${state.page} of ${pages}</span><button type="button" data-page="next" aria-label="Next page" ${state.page === pages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button></div>`;
    state.pagination.querySelector('[data-page-size]').value = String(state.pageSize);
    return rows.slice(start, start + size);
  }

  function match(record, search) {
    const term = normalized(search);
    return !term || [record.id, record.name, record.region, record.barangay, record.municipality, record.province]
      .some(value => normalized(value).includes(term));
  }
  function currentFiltered() {
    return directory.filter(record => currentIds.has(record.id) &&
      match(record, $('#editCurrentSearch').value) &&
      matchesLocation(record, 'Current') &&
      matchesColumns(record, 'current'));
  }
  function availableFiltered() {
    return directory.filter(record => !currentIds.has(record.id) &&
      eligibleForTraining(record) &&
      trainingLocationMatches(record) &&
      match(record, $('#editAvailableSearch').value) &&
      matchesLocation(record, 'Available') &&
      matchesColumns(record, 'available'));
  }
  function rowCells(record) {
    return `<td>${escapeHtml(record.id)}</td><td><strong>${escapeHtml(record.name)}</strong></td><td>${escapeHtml(record.region || '—')}</td><td>${escapeHtml(record.province || '—')}</td><td>${escapeHtml(record.municipality || '—')}</td><td>${escapeHtml(record.barangay || '—')}</td>`;
  }
  let filtersInitialized = false;
  function populateSelect(select, values, label) {
    const chosen = select.value;
    const preferred = !filtersInitialized ? training?.[select.dataset.locationFilter] : '';
    select.replaceChildren(new Option(label, ''));
    [...new Set(values)].sort().forEach(value => select.add(new Option(value, value)));
    const desired = chosen || preferred;
    select.value = [...select.options].some(option => normalized(option.value) === normalized(desired)) ? desired : '';
  }
  function matchesLocation(record, type) {
    return locationKeys.every(key => {
      const selected = $(`#edit${type}${key[0].toUpperCase()}${key.slice(1)}`).value;
      return !selected || normalized(record[key]) === normalized(selected);
    });
  }
  function populateLocationFilters(type, records) {
    let scoped = records;
    locationKeys.forEach(key => {
      const select = $(`#edit${type}${key[0].toUpperCase()}${key.slice(1)}`);
      populateSelect(select, scoped.map(record => record[key]).filter(Boolean), `All ${key === 'municipality' ? 'municipalities' : `${key}s`}`);
      if (select.value) scoped = scoped.filter(record => normalized(record[key]) === normalized(select.value));
    });
  }
  function updateFilters() {
    populateLocationFilters('Current', directory.filter(record => currentIds.has(record.id)));
    populateLocationFilters('Available', directory.filter(record => !currentIds.has(record.id) && eligibleForTraining(record) && trainingLocationMatches(record)));
    filtersInitialized = true;
  }
  function render() {
    updateFilters();
    const current = currentFiltered();
    const available = availableFiltered();
    const visibleIds = new Set(available.map(record => record.id));
    [...selectedIds].forEach(id => { if (currentIds.has(id)) selectedIds.delete(id); });
    $('#editCurrentRows').innerHTML = pageRows(current, 'current').map(record => `<tr>${rowCells(record)}<td><button class="edit-participants-remove" type="button" data-remove-participant="${escapeHtml(record.id)}" aria-label="Remove ${escapeHtml(record.name)} from this training"><i class="bi bi-person-dash" aria-hidden="true"></i> Remove</button></td></tr>`).join('');
    $('#editAvailableRows').innerHTML = pageRows(available, 'available').map(record =>
      `<tr><td><input type="checkbox" data-participant-id="${escapeHtml(record.id)}" aria-label="Select ${escapeHtml(record.name)}" ${selectedIds.has(record.id) ? 'checked' : ''}></td>${rowCells(record)}</tr>`).join('');
    $('#editCurrentEmpty').hidden = current.length > 0;
    $('#editAvailableEmpty').hidden = available.length > 0;
    $('#editCurrentCount').textContent = `${current.length} matching of ${currentIds.size} current participants`;
    $('#editAvailableCount').textContent = `${available.length} matching available`;
    $('#editParticipantTotal').textContent = `${currentIds.size} current participants`;
    $('#editSelectedCount').textContent = `${selectedIds.size} selected`;
    $('#editAddSelected').disabled = selectedIds.size === 0;
    $('#editParticipantFeedback').textContent = feedback;
    const all = $('#editSelectAll');
    all.checked = available.length > 0 && available.every(record => selectedIds.has(record.id));
    all.indeterminate = !all.checked && [...visibleIds].some(id => selectedIds.has(id));
    all.disabled = available.length === 0;
  }
  function showTab(tab) {
    activeTab = tab;
    for (const key of ['current', 'add']) {
      const active = key === tab;
      const button = $(`#edit${key === 'current' ? 'Current' : 'Add'}Tab`);
      const content = $(`#edit${key === 'current' ? 'Current' : 'Add'}Panel`);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      content.hidden = !active;
    }
  }
  $('#editCurrentTab').addEventListener('click', () => showTab('current'));
  $('#editAddTab').addEventListener('click', () => showTab('add'));
  [$('#editCurrentTab'), $('#editAddTab')].forEach(button => button.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showTab(activeTab === 'current' ? 'add' : 'current');
    $(`#edit${activeTab === 'current' ? 'Current' : 'Add'}Tab`).focus();
  }));
  ['#editCurrentSearch', '#editAvailableSearch'].forEach((selector, index) => $(selector).addEventListener('input', () => {
    tableState[index === 0 ? 'current' : 'available'].page = 1;
    render();
  }));
  panel.addEventListener('change', event => {
    const select = event.target.closest('[data-location-filter]');
    if (!select) return;
    const type = select.closest('#editCurrentPanel') ? 'Current' : 'Available';
    const level = locationKeys.indexOf(select.dataset.locationFilter);
    locationKeys.slice(level + 1).forEach(key => { $(`#edit${type}${key[0].toUpperCase()}${key.slice(1)}`).value = ''; });
    tableState[type.toLowerCase()].page = 1;
    render();
  });
  $('#editAvailableClear').addEventListener('click', () => {
    $('#editAvailableSearch').value = '';
    locationKeys.forEach(key => { $(`#editAvailable${key[0].toUpperCase()}${key.slice(1)}`).value = ''; });
    tableState.available.columns = {};
    $('#editAddPanel').querySelectorAll('[data-column-filter]').forEach(input => { input.value = ''; });
    tableState.available.page = 1;
    render();
  });
  $('#editAvailableRows').addEventListener('change', event => {
    const checkbox = event.target.closest('[data-participant-id]');
    if (!checkbox) return;
    if (checkbox.checked) selectedIds.add(checkbox.dataset.participantId);
    else selectedIds.delete(checkbox.dataset.participantId);
    render();
  });
  $('#editSelectAll').addEventListener('change', event => {
    availableFiltered().forEach(record => {
      if (event.target.checked) selectedIds.add(record.id);
      else selectedIds.delete(record.id);
    });
    render();
  });
  $('#editCurrentRows').addEventListener('click', async event => {
    const button = event.target.closest('[data-remove-participant]');
    if (!button) return;
    const record = directory.find(item => item.id === button.dataset.removeParticipant);
    if (!record || !currentIds.has(record.id)) return;
    if (!window.confirm(`Remove ${record.name} (${record.id}) from this training?`)) return;
    currentIds.delete(record.id);
    try {
      await window.TmisStore.setItem(storageKey, JSON.stringify([...currentIds]));
    } catch (error) {
      currentIds.add(record.id);
      feedback = error.message || 'Unable to save the training roster.';
      render();
      return;
    }
    feedback = `${record.name} removed from this training.`;
    render();
  });
  $('#editAddSelected').addEventListener('click', async () => {
    const count = selectedIds.size;
    selectedIds.forEach(id => currentIds.add(id));
    try {
      await window.TmisStore.setItem(storageKey, JSON.stringify([...currentIds]));
    } catch (error) {
      selectedIds.forEach(id => currentIds.delete(id));
      feedback = error.message || 'Unable to save the training roster.';
      showTab('current');
      render();
      return;
    }
    selectedIds.clear();
    feedback = `${count} participant${count === 1 ? '' : 's'} added to this training.`;
    $('#editCurrentSearch').value = '';
    locationKeys.forEach(key => { $(`#editCurrent${key[0].toUpperCase()}${key.slice(1)}`).value = ''; });
    showTab('current');
    render();
  });
  $('#editParticipantRefresh').addEventListener('click', async () => {
    try {
      if (window.TMIS_PAGE) await window.TmisStore.refresh();
      currentIds = loadRoster();
      selectedIds.clear();
      feedback = 'Roster refreshed.';
      render();
    } catch (error) {
      feedback = error.message || 'Unable to refresh the training roster.';
      render();
    }
  });
  $('#editParticipantExport').addEventListener('click', () => {
    const heading = ['Farmer ID', 'Full Name', 'Region', 'Province', 'Municipality / City', 'Barangay'];
    const quote = value => `"${String(value).replace(/"/g, '""')}"`;
    const rows = directory.filter(record => currentIds.has(record.id)).map(record =>
      [record.id, record.name, record.region, record.province, record.municipality, record.barangay].map(quote).join(','));
    const blob = new Blob([`\uFEFF${[heading.map(quote).join(','), ...rows].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `training-participants-${training?.id || 'sample'}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    feedback = `Exported ${rows.length} current participants.`;
    render();
  });
  const actionHeading = document.createElement('th');
  actionHeading.scope = 'col';
  actionHeading.textContent = 'Action';
  $('#editCurrentPanel thead tr').append(actionHeading);
  installTableControls('current');
  installTableControls('available');
  $('#editSelectAll').setAttribute('aria-label', 'Select all participants matching the current filters across all pages');
  $('#editAddPanel .edit-participants-intro p').textContent = 'Select farmers individually or select all filtered results across pages, then add them to this training.';
  showTab('current');
  render();
  document.addEventListener('training:tabchange', event => {
    if (event.detail.panel.id === 'participants-panel') {
      requestAnimationFrame(render);
    }
  });
});
