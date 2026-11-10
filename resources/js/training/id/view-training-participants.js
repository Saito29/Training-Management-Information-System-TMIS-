document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('participants-panel');
  if (!panel) return;

  // Sample training roster; replace this array when participant records come from the backend.
  const names = [
    ['Dela Cruz', 'Juan', 'Santos', 'Male'], ['Reyes', 'Pedro', 'Garcia', 'Male'],
    ['Mendoza', 'Carlo', 'Ramos', 'Male'], ['Santos', 'Maria', 'Reyes', 'Female'],
    ['Bautista', 'Rogelio', 'Cruz', 'Male'], ['Ramos', 'Antonio', 'Lopez', 'Male'],
    ['Garcia', 'Jose', 'Aquino', 'Male'], ['Flores', 'Roberto', 'Diaz', 'Male'],
    ['Villanueva', 'Ana', 'Cruz', 'Female'], ['Navarro', 'Mark', 'Santos', 'Male'],
    ['Castillo', 'Noel', 'Mercado', 'Male'], ['Aquino', 'Daniel', 'Reyes', 'Male'],
    ['Mercado', 'Paolo', 'Cruz', 'Male'], ['Torres', 'Francisco', 'Garcia', 'Male'],
    ['Perez', 'Emmanuel', 'Ramos', 'Male'], ['Lopez', 'Elena', 'Santos', 'Female'],
    ['Domingo', 'Rico', 'Bautista', 'Male'], ['Cruz', 'Eduardo', 'Diaz', 'Male'],
    ['Rivera', 'Rommel', 'Aquino', 'Male'], ['Fernandez', 'Nestor', 'Reyes', 'Male'],
    ['Gonzales', 'Grace', 'Mercado', 'Female'], ['Salazar', 'Joel', 'Cruz', 'Male'],
    ['Pascual', 'Albert', 'Flores', 'Male'], ['Valdez', 'Michael', 'Ramos', 'Male'],
  ];
  const barangays = ['San Antonio', 'Darasa', 'Balele', 'Trapiche', 'Mabini', 'Poblacion'];
  const associations = ['Tanauan Farmers Association', 'San Antonio Farmers Cooperative', 'Batangas Growers Association'];
  const records = (window.TMIS_PAGE ? window.TmisStore.records('tmis-farmers').filter(item=>(window.TmisStore.selected('tmis-trainings')?.participants||[]).includes(item.id)).map(item=>({...item,farmerId:item.id,mobile:item.phone,association:item.organization})) : names.map(([lastName, firstName, middleName, sex], index) => ({
    farmerId: `FMR-2025-${String(index + 1).padStart(3, '0')}`,
    lastName, firstName, middleName, sex,
    birthDate: `19${70 + index % 25}-${String(index % 12 + 1).padStart(2, '0')}-${String(index % 27 + 1).padStart(2, '0')}`,
    mobile: `09${String(100000000 + index * 7411).padStart(9, '0')}`,
    association: associations[index % associations.length],
    role: index % 7 === 0 ? 'Officer' : 'Member',
    province: 'Batangas', municipality: 'Tanauan City', barangay: barangays[index % barangays.length],
  })));
  const columns = [
    ['actions', 'Actions'], ['farmerId', 'Farmer ID'], ['lastName', 'Last Name'],
    ['firstName', 'First Name'], ['middleName', 'Middle Name'], ['sex', 'Sex'],
    ['birthDate', 'Date of Birth'], ['mobile', 'Mobile Number'],
    ['association', 'Farmer Association'], ['role', 'Role'], ['province', 'Province'],
    ['municipality', 'Municipality'], ['barangay', 'Barangay'],
  ];
  const hiddenByDefault = ['birthDate', 'mobile', 'role', 'province'];
  const state = { search: '', sex: '', filters: {}, sort: null, page: 1, perPage: 10,
    visible: new Set(columns.map(([key]) => key).filter(key => !hiddenByDefault.includes(key))) };
  const $ = selector => panel.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const display = (record, key) => record[key];
  const feedback = message => { $('#participantFeedback').textContent = message; };

  $('#participantTableHead').innerHTML = `<tr>${columns.map(([key, label]) =>
    `<th scope="col" data-col="${key}">${key === 'actions' ? label : `<button class="participant-sort" type="button" data-sort="${key}" aria-label="Sort by ${label}">${label} <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button>`}</th>`).join('')}</tr>
    <tr class="participant-filter-row">${columns.map(([key, label]) =>
      `<th data-col="${key}">${key === 'actions' ? '' : `<label class="visually-hidden" for="participant-filter-${key}">Filter ${label}</label><input class="form-control form-control-sm" id="participant-filter-${key}" data-filter="${key}" type="search" placeholder="Filter" autocomplete="off" />`}</th>`).join('')}</tr>`;
  $('#participantColumnOptions').innerHTML = columns.map(([key, label]) =>
    `<label class="form-check form-switch"><input class="form-check-input" type="checkbox" data-column-toggle="${key}" ${state.visible.has(key) ? 'checked' : ''} ${key === 'actions' ? 'disabled' : ''}><span class="form-check-label">${label}</span></label>`).join('');

  function filteredRecords() {
    const search = state.search.toLowerCase();
    const rows = records.filter(record =>
      (!state.sex || record.sex === state.sex) &&
      (!search || columns.some(([key]) => key !== 'actions' &&
        String(display(record, key)).toLowerCase().includes(search))) &&
      Object.entries(state.filters).every(([key, value]) => !value ||
        String(display(record, key)).toLowerCase().includes(value.toLowerCase())));
    if (state.sort) {
      const { key, direction } = state.sort;
      rows.sort((a, b) => {
        const result = typeof a[key] === 'number' ? a[key] - b[key]
          : String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true, sensitivity: 'base' });
        return direction === 'asc' ? result : -result;
      });
    }
    return rows;
  }

  function pagination(target, total, pageCount) {
    const first = total ? (state.page - 1) * state.perPage + 1 : 0;
    const last = Math.min(state.page * state.perPage, total);
    target.innerHTML = `<span>Showing ${first}–${last} of ${total} participants</span><div class="participant-page-controls">
      <label>Rows per page <select class="form-select form-select-sm" data-page-size><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
      <button type="button" data-page="prev" aria-label="Previous page" ${state.page === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>
      <span>Page ${state.page} of ${pageCount}</span>
      <button type="button" data-page="next" aria-label="Next page" ${state.page === pageCount ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button></div>`;
    target.querySelector('[data-page-size]').value = String(state.perPage);
  }

  function render() {
    const rows = filteredRecords();
    const pageCount = Math.max(1, Math.ceil(rows.length / state.perPage));
    state.page = Math.min(state.page, pageCount);
    const pageRows = rows.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    $('#participantTableBody').innerHTML = pageRows.map(record =>
      `<tr>${columns.map(([key]) => `<td data-col="${key}">${key === 'actions'
        ? `<button class="participant-view-link" type="button" data-view-farmer="${escapeHtml(record.farmerId)}" title="View ${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}" aria-label="View ${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}"><i class="bi bi-eye" aria-hidden="true"></i></button>`
        : escapeHtml(display(record, key))}</td>`).join('')}</tr>`).join('');
    $('#participantEmpty').hidden = rows.length > 0;
    $('#participantCount').textContent = `${rows.length} of ${records.length} participants`;
    pagination($('#participantPaginationTop'), rows.length, pageCount);
    pagination($('#participantPaginationBottom'), rows.length, pageCount);
    panel.querySelectorAll('[data-col]').forEach(cell => { cell.hidden = !state.visible.has(cell.dataset.col); });
    panel.querySelectorAll('[data-sort]').forEach(button => {
      const active = state.sort?.key === button.dataset.sort;
      button.querySelector('i').className = `bi ${active ? state.sort.direction === 'asc' ? 'bi-sort-up' : 'bi-sort-down' : 'bi-arrow-down-up'}`;
      button.closest('th').setAttribute('aria-sort', active ? state.sort.direction === 'asc' ? 'ascending' : 'descending' : 'none');
    });
  }

  $('#participantSearch').addEventListener('input', event => { state.search = event.target.value.trim(); state.page = 1; render(); });
  $('#participantSexFilter').addEventListener('change', event => { state.sex = event.target.value; state.page = 1; render(); });
  $('#participantTableHead').addEventListener('input', event => {
    if (!event.target.matches('[data-filter]')) return;
    state.filters[event.target.dataset.filter] = event.target.value.trim();
    state.page = 1;
    render();
  });
  $('#participantTableHead').addEventListener('click', event => {
    const button = event.target.closest('[data-sort]');
    if (!button) return;
    state.sort = { key: button.dataset.sort,
      direction: state.sort?.key === button.dataset.sort && state.sort.direction === 'asc' ? 'desc' : 'asc' };
    state.page = 1;
    render();
  });
  $('#participantColumnOptions').addEventListener('change', event => {
    const toggle = event.target.closest('[data-column-toggle]');
    if (!toggle) return;
    if (toggle.checked) state.visible.add(toggle.dataset.columnToggle);
    else state.visible.delete(toggle.dataset.columnToggle);
    render();
  });
  $('#participantTableBody').addEventListener('click', event => {
    const button = event.target.closest('[data-view-farmer]');
    if (!button) return;
    const record = records.find(item => item.farmerId === button.dataset.viewFarmer);
    if (!record) return;
    const modal = document.getElementById('participantDetailModal');
    if (!modal || typeof bootstrap === 'undefined') return;
    document.getElementById('participantDetailTitle').textContent = `${record.firstName} ${record.middleName} ${record.lastName}`;
    document.getElementById('participantDetailId').textContent = record.farmerId;
    document.getElementById('participantDetailInitials').textContent = `${record.firstName[0]}${record.lastName[0]}`;
    document.getElementById('participantDetailAssociation').textContent = record.association;
    document.getElementById('participantDetailList').innerHTML = columns.filter(([key]) => !['actions', 'firstName', 'middleName', 'lastName', 'farmerId', 'association'].includes(key)).map(([key, label]) =>
      `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(display(record, key))}</dd></div>`).join('');
    bootstrap.Modal.getOrCreateInstance(modal).show();
  });
  function setColumnPanel(open) {
    $('#participantColumnsPanel').hidden = !open;
    $('#participantColumnsToggle').setAttribute('aria-expanded', String(open));
  }
  $('#participantColumnsToggle').addEventListener('click', () => setColumnPanel($('#participantColumnsPanel').hidden));
  $('#participantColumnsClose').addEventListener('click', () => setColumnPanel(false));
  panel.querySelectorAll('.participant-pagination').forEach(container => {
    container.addEventListener('click', event => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      state.page += button.dataset.page === 'next' ? 1 : -1;
      render();
    });
    container.addEventListener('change', event => {
      if (!event.target.matches('[data-page-size]')) return;
      state.perPage = Number(event.target.value);
      state.page = 1;
      render();
    });
  });
  function resetTable() {
    state.search = ''; state.sex = ''; state.filters = {}; state.sort = null;
    state.page = 1; state.perPage = 10;
    state.visible = new Set(columns.map(([key]) => key).filter(key => !hiddenByDefault.includes(key)));
    $('#participantSearch').value = '';
    $('#participantSexFilter').value = '';
    panel.querySelectorAll('[data-filter]').forEach(input => { input.value = ''; });
    panel.querySelectorAll('[data-column-toggle]').forEach(input => { input.checked = state.visible.has(input.dataset.columnToggle); });
    setColumnPanel(false);
    render();
  }
  $('#participantClear').addEventListener('click', () => {
    state.search = ''; state.sex = ''; state.filters = {}; state.page = 1;
    $('#participantSearch').value = ''; $('#participantSexFilter').value = '';
    panel.querySelectorAll('[data-filter]').forEach(input => { input.value = ''; });
    render();
    feedback('Filters cleared.');
  });
  $('#participantRefresh').addEventListener('click', () => { resetTable(); feedback('Participant table refreshed.'); });
  $('#participantExport').addEventListener('click', () => {
    if (!window.XLSX) { feedback('Excel export is unavailable. Check your connection and try again.'); return; }
    const exportColumns = columns.filter(([key]) => key !== 'actions');
    const rows = filteredRecords().map(record => Object.fromEntries(exportColumns.map(([key, label]) => [label, display(record, key)])));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: exportColumns.map(([, label]) => label) });
    sheet['!cols'] = exportColumns.map(([, label]) => ({ wch: Math.max(16, label.length + 4) }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Training Participants');
    XLSX.writeFile(book, 'training_TRN-000246_participants.xlsx');
    feedback(`${rows.length} participant records exported to Excel.`);
  });
  render();
});
