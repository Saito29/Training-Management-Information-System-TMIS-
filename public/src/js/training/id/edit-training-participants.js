document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('participants-panel');
  if (!panel) return;
  const selectedTraining = () => window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings') : null;
  let training = selectedTraining();
  const storageKey = `tmis:training:${training?.id || 'TRN-000246'}:participants`;
  const beneficiaryOfficesFor = record => record.beneficiaryOffices?.length
    ? record.beneficiaryOffices
    : [{region_id: record.region_id, org_id: record.org_id, region: record.region, office: record.office, isPrimary: true}];
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
  const buildDirectory = () => (window.TMIS_PAGE ? window.TmisStore.records('tmis-farmers') : names.map(([last, first, middle], index) => {
    const location = index < 24 ? ['Batangas', 'Batangas 3rd District', 'Tanauan City', barangays[index % barangays.length]]
      : index < 30 ? ['Batangas', 'Batangas 4th District', 'Lipa City', ['Balintawak', 'Sabang', 'Tambo'][index % 3]]
        : ['Laguna', 'Laguna 2nd District', 'Calamba City', ['Canlubang', 'Poblacion', 'Parian'][index % 3]];
    return {
      id: `FMR-2025-${String(index + 1).padStart(3, '0')}`,
      name: `${first} ${middle} ${last}`,
      province: location[0], district: location[1], municipality: location[2], barangay: location[3], region: 'Region IV-A',
    };
  })).map(record => {
    const beneficiaries = beneficiaryOfficesFor(record);
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
  let directory = buildDirectory();
  const knownIds = new Set(directory.map(record => record.id));
  const initialIds = directory.slice(0, 24).map(record => record.id);
  const $ = selector => panel.querySelector(selector);
  const normalized = value => String(value || '').trim().toLocaleLowerCase();
  const trainingLocationMatches = record => {
    const beneficiaries = beneficiaryOfficesFor(record);
    const regionMatches = training?.region_id
      ? beneficiaries.some(beneficiary => String(beneficiary.region_id) === String(training.region_id))
      : !training?.region || beneficiaries.some(beneficiary =>
        normalized(beneficiary.region || record.region) === normalized(training.region));
    const matchesLocation = key => {
      const expectedId = training?.[`${key}_id`];
      const actualId = record[`${key}_id`];
      if (expectedId && actualId && String(actualId) === String(expectedId)) return true;
      const expected = training?.[key];
      const actual = record[key];
      if (expected && actual) return normalized(actual) === normalized(expected);
      return !expected && !expectedId;
    };
    return regionMatches && ['province', 'municipality'].every(matchesLocation);
  };
  const eligibleForTraining = record => {
    if (!window.TMIS_PAGE) return true;
    if (record.status !== 'Active') return false;
    return beneficiaryOfficesFor(record).some(beneficiary =>
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
  const tableState = {
    current: { page: 1, pageSize: 20 },
    available: { page: 1, pageSize: 20 },
  };

  function installTableControls(type) {
    const content = $(`#edit${type === 'current' ? 'Current' : 'Add'}Panel`);
    const head = content.querySelector('thead');
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
    return !term || [record.id, record.name, record.barangay]
      .some(value => normalized(value).includes(term));
  }
  function currentFiltered() {
    return directory.filter(record => currentIds.has(record.id) &&
      match(record, $('#editCurrentSearch').value));
  }
  function availableFiltered() {
    return directory.filter(record => !currentIds.has(record.id) &&
      eligibleForTraining(record) &&
      trainingLocationMatches(record) &&
      match(record, $('#editAvailableSearch').value));
  }
  function rowCells(record) {
    return `<td>${escapeHtml(record.id)}</td><td><strong>${escapeHtml(record.name)}</strong></td><td>${escapeHtml(record.region || '—')}</td><td>${escapeHtml(record.province || '—')}</td><td>${escapeHtml(record.municipality || '—')}</td><td>${escapeHtml(record.barangay || '—')}</td>`;
  }
  function render() {
    const current = currentFiltered();
    const available = availableFiltered();
    [...selectedIds].forEach(id => { if (currentIds.has(id)) selectedIds.delete(id); });
    $('#editCurrentRows').innerHTML = pageRows(current, 'current').map(record => `<tr>${rowCells(record)}<td><button class="edit-participants-remove" type="button" data-remove-participant="${escapeHtml(record.id)}" aria-label="Remove ${escapeHtml(record.name)} from this training"><i class="bi bi-person-dash" aria-hidden="true"></i> Remove</button></td></tr>`).join('');
    $('#editAvailableRows').innerHTML = pageRows(available, 'available').map(record =>
      `<tr data-selectable-participant="${escapeHtml(record.id)}"><td><input type="checkbox" data-participant-id="${escapeHtml(record.id)}" aria-label="Select ${escapeHtml(record.name)}" ${selectedIds.has(record.id) ? 'checked' : ''}></td>${rowCells(record)}</tr>`).join('');
    $('#editCurrentEmpty').hidden = current.length > 0;
    $('#editAvailableEmpty').hidden = available.length > 0;
    $('#editCurrentCount').textContent = `${current.length} matching of ${currentIds.size} current participants`;
    $('#editAvailableCount').textContent = `${available.length} matching available`;
    $('#editParticipantTotal').textContent = `${currentIds.size} current participants`;
    $('#editSelectedCount').textContent = `${selectedIds.size} selected`;
    $('#editAddSelected').disabled = selectedIds.size === 0;
    $('#editParticipantFeedback').textContent = feedback;
    $('#editAvailableFeedback').textContent = feedback;
    const all = $('#editSelectAll');
    all.checked = available.length > 0 && available.every(record => selectedIds.has(record.id));
    all.indeterminate = !all.checked && available.some(record => selectedIds.has(record.id));
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
  $('#editAvailableRows').addEventListener('change', event => {
    const checkbox = event.target.closest('[data-participant-id]');
    if (!checkbox) return;
    if (checkbox.checked) selectedIds.add(checkbox.dataset.participantId);
    else selectedIds.delete(checkbox.dataset.participantId);
    render();
  });
  $('#editAvailableRows').addEventListener('click', event => {
    if (event.target.closest('input, button, a, select, textarea, label')) return;
    const row = event.target.closest('[data-selectable-participant]');
    if (!row) return;
    const checkbox = row.querySelector('[data-participant-id]');
    if (!checkbox) return;
    checkbox.checked = !checkbox.checked;
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
  panel.querySelectorAll('[data-refresh-participants]').forEach(button => button.addEventListener('click', async () => {
    const activeTab = button.dataset.refreshParticipants;
    button.disabled = true;
    try {
      if (window.TMIS_PAGE) await window.TmisStore.refresh();
      training = selectedTraining();
      directory = buildDirectory();
      knownIds.clear();
      directory.forEach(record => knownIds.add(record.id));
      currentIds = loadRoster();
      selectedIds.clear();
      tableState.current.page = 1;
      tableState.available.page = 1;
      feedback = `${activeTab === 'current' ? 'Current participants' : 'Available farmers'} refreshed.`;
      render();
    } catch (error) {
      feedback = error.message || 'Unable to refresh participant data.';
      render();
    } finally {
      button.disabled = false;
    }
  }));
  panel.querySelector('[data-export-participants="current"]')?.addEventListener('click', () => {
    const records = currentFiltered();
    if (!window.XLSX?.utils) {
      const message = 'Excel export is unavailable. Check your connection and try again.';
      if (window.TmisToast) window.TmisToast.show(message, 'error');
      else window.alert(message);
      return;
    }

    try {
      const headers = ['Farmer ID', 'Full Name', 'Region', 'Province', 'Municipality / City', 'Barangay'];
      const rows = records.map(record => [
        record.id,
        record.name,
        record.region || '',
        record.province || '',
        record.municipality || '',
        record.barangay || '',
      ]);
      const sheet = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
      sheet['!cols'] = [16, 28, 20, 20, 24, 22].map(wch => ({ wch }));
      const workbook = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(workbook, sheet, 'Current Participants');
      const trainingId = String(training?.id || 'sample').replace(/[^a-zA-Z0-9_-]/g, '-');
      window.XLSX.writeFile(workbook, `training-current-${trainingId}.xlsx`);
      feedback = `Exported ${records.length} current participants.`;
      render();
    } catch (error) {
      const message = error.message || 'Unable to export the current participant list.';
      if (window.TmisToast) window.TmisToast.show(message, 'error');
      else window.alert(message);
    }
  });
  const actionHeading = document.createElement('th');
  actionHeading.scope = 'col';
  actionHeading.textContent = 'Action';
  $('#editCurrentPanel thead tr').append(actionHeading);
  installTableControls('current');
  installTableControls('available');
  $('#editSelectAll').setAttribute('aria-label', 'Select all eligible farmers matching the search across all pages');
  $('#editAddPanel .edit-participants-intro p').textContent = 'Only active farmers matching this training\'s region, province, and municipality are listed. Search by farmer ID, name, or barangay.';
  showTab('current');
  render();
  document.addEventListener('training:tabchange', event => {
    if (event.detail.panel.id === 'participants-panel') {
      requestAnimationFrame(render);
    }
  });
});
