document.addEventListener('DOMContentLoaded', async () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const storageKey = 'tmis-farmer-associations';
  const listStatus = document.body.dataset.faListStatus === 'Inactive' ? 'Inactive' : 'Active';
  const statusLabel = listStatus.toLowerCase();
  const columns = ['actions', 'status', 'customStatus', 'id', 'region', 'province', 'district', 'municipality', 'barangay', 'association_name', 'short_name', 'registration_date', 'year_covered', 'organization_type', 'office'];
  const defaults = columns.slice(0, 12);
  const labels = { id: 'Farmer Association ID', association_name: 'Name', short_name: 'Shortened Name', organization_type: 'Organization Type', office: 'Office', region: 'Region', province: 'Province', district: 'District', municipality: 'Municipality', barangay: 'Barangay', registration_date: 'Registration Date', year_covered: 'Year Covered', status: 'Active status', customStatus: 'Additional status' };
  const geo = ['region', 'province', 'district', 'municipality', 'barangay'];
  const seeds = [
    { id: 'FA-2025-001', association_name: 'Jomalig Farmers Association', short_name: 'JFA', organization_type: 'Association', office: 'Municipal Agriculture Office', province: 'Quezon', district: '1st District', municipality: 'Jomalig', barangay: 'Apad', registration_date: '2025-03-14', year_covered: '2025', status: 'Active' },
    { id: 'FA-2025-002', association_name: 'Tanauan Growers Cooperative', short_name: 'TGC', organization_type: 'Cooperative', office: 'Provincial Agriculture Office', province: 'Batangas', district: '3rd District', municipality: 'Tanauan City', barangay: 'Darasa', registration_date: '2025-06-21', year_covered: '2025', status: 'Active' },
    { id: 'FA-2025-003', association_name: 'Pakil Vegetable Growers Association', short_name: 'PVGA', organization_type: 'Association', office: 'Municipal Agriculture Office', province: 'Laguna', district: '1st District', municipality: 'Pakil', barangay: 'Banilan', registration_date: '2025-09-08', year_covered: '2025', status: 'Active' },
  ];
  const inactiveSeed = { id: 'FA-2024-004', association_name: 'Alabat Agricultural Cooperative', short_name: 'AAC', organization_type: 'Cooperative', office: 'Municipal Agriculture Office', province: 'Quezon', district: '2nd District', municipality: 'Alabat', barangay: 'Villa Esperanza', registration_date: '2024-07-12', year_covered: '2024', status: 'Inactive' };
  const body = $('#forReviewTableBody');
  if (!body) return;
  const state = { page: 1, size: 10, search: '', year: '', region: '', province: '', district: '', municipality: '', barangay: '', filters: {}, sort: null };
  const table = $('#forReviewDataTable');
  const visible = new Set(defaults);
  const deleteModal = new bootstrap.Modal($('#faDeleteModal'));
  let selectedId = '';
  let undoRecord = null;
  let undoTimer = null;
  let undoSeconds = 0;
  const read = () => { try { const data = JSON.parse(window.TmisStore.getItem(storageKey) || '[]'); return Array.isArray(data) ? data.map(record => ({ ...record, year_covered: String(record.year_covered || String(record.registration_date || '').slice(0, 4)) })) : []; } catch { return []; } };
  const save = async (data) => { try { await window.TmisStore.setItem(storageKey, JSON.stringify(data)); return true; } catch { return false; } };
  let records = read();
  let recordsSnapshot = JSON.stringify(records);
  try {
    if (!window.TmisStore.getItem('tmis-fa-samples-added')) {
      const ids = new Set(records.map(record => record.id));
      records = [...seeds.filter(record => !ids.has(record.id)), ...records];
      if (await save(records)) await window.TmisStore.setItem('tmis-fa-samples-added', '1');
    }
  } catch { records = [...seeds, ...records]; }
  try {
    if (!window.TmisStore.getItem('tmis-fa-inactive-sample-added')) {
      if (!records.some(record => record.id === inactiveSeed.id)) {
        const withSample = [...records, inactiveSeed];
        if (await save(withSample)) records = withSample;
      }
      await window.TmisStore.setItem('tmis-fa-inactive-sample-added', '1');
    }
  } catch { if (!records.some(record => record.id === inactiveSeed.id)) records.push(inactiveSeed); }
  recordsSnapshot = JSON.stringify(records);
  const associationStatus = record => record.status === 'Active' ? 'Active' : 'Inactive';
  const statusRows = () => records.filter(record => associationStatus(record) === listStatus);
  const optionList = (select, values, placeholder, value) => {
    select.replaceChildren(new Option(placeholder, ''), ...values.map(item => new Option(item, item)));
    select.value = values.includes(value) ? value : '';
    return select.value;
  };
  function syncFilters() {
    const rows = statusRows();
    const years = [...new Set(rows.map(record => String(record.year_covered || '')).filter(Boolean))].sort().reverse();
    state.year = optionList($('#yearCoveredFilter'), years, 'All years', state.year);
    geo.forEach((field, index) => {
      const parentsChosen = index === 0 || geo.slice(0, index).every(parent => Boolean(state[parent]));
      const values = parentsChosen ? [...new Set(rows.filter(record => (!state.year || String(record.year_covered) === state.year) && geo.slice(0, index).every(parent => record[parent] === state[parent])).map(record => record[field]).filter(Boolean))].sort() : [];
      const plural = field === 'municipality' ? 'municipalities' : field === 'barangay' ? 'barangays' : field + 's';
      const select = $('#' + field + 'Filter');
      state[field] = optionList(select, values, parentsChosen ? 'All ' + plural : 'Choose ' + geo[index - 1] + ' first', state[field]);
      select.disabled = !parentsChosen || values.length === 0;
    });
  }
  function filtered() {
    const query = state.search.toLocaleLowerCase();
    const rows = statusRows().filter(record =>
      (!state.year || String(record.year_covered || '') === state.year) &&
      geo.every(field => !state[field] || record[field] === state[field]) &&
      (!query || columns.slice(1).some(field => String(record[field] || '').toLocaleLowerCase().includes(query))) &&
      Object.entries(state.filters).every(([field, value]) => !value || String(record[field] || '').toLocaleLowerCase().includes(value.toLocaleLowerCase()))
    );
    if (state.sort) rows.sort((a, b) => String(a[state.sort.field] || '').localeCompare(String(b[state.sort.field] || ''), undefined, { numeric: true }) * state.sort.direction);
    return rows;
  }
  function applyColumns() {
    columns.forEach(field => $$(`[data-column="${field}"]`, $('#forReviewDataTable')).forEach(element => { element.hidden = !visible.has(field); element.style.display = visible.has(field) ? '' : 'none'; }));
    $$('.column-toggle').forEach(input => { input.checked = visible.has(input.dataset.column); });
  }
  function addCell(row, field, record) {
    const td = document.createElement('td'); td.dataset.column = field;
    if (field === 'actions') {
      [['view', 'eye', 'View'], ['edit', 'pencil-square', 'Edit'], ['delete', 'trash', 'Delete']].forEach(([action, icon, label]) => {
        const control = action === 'delete' ? document.createElement('button') : document.createElement('a');
        if (action === 'delete') control.type = 'button';
        else { control.href = `../id/${action}-fa/${encodeURIComponent(record.id)}`; control.target = '_blank'; control.rel = 'noopener noreferrer'; }
        control.className = 'btn btn-sm fa-row-action'; control.dataset.action = action; control.dataset.id = record.id;
        control.title = action === 'delete' ? label : `${label} in a new tab`; control.setAttribute('aria-label', `${label} ${record.association_name}${action === 'delete' ? '' : ' in a new tab'}`);
        const image = document.createElement('i'); image.className = `bi bi-${icon}`; image.setAttribute('aria-hidden', 'true'); control.append(image); td.append(control);
      });
    } else if (field === 'status') {
      const status = associationStatus(record);
      const badge = document.createElement('span'); badge.className = `status-badge ${status === 'Active' ? 'status-active' : 'status-inactive'}`; badge.textContent = status; td.append(badge);
    } else if (field === 'customStatus') {
      const badge = document.createElement('span'); badge.className = 'status-badge status-neutral'; badge.textContent = record.customStatus || '—'; td.append(badge);
    } else td.textContent = record[field] || '—';
    row.append(td);
  }
  function pagination(container, total, pages, from, to) {
    const summary = document.createElement('span'); summary.textContent = `Showing ${from}–${to} of ${total} associations`;
    const controls = document.createElement('div'); controls.className = 'pagination-controls';
    const sizeLabel = document.createElement('label'); sizeLabel.className = 'pagination-page-size';
    const label = document.createElement('span'); label.textContent = 'Rows per page';
    const size = document.createElement('select'); size.className = 'form-select'; size.dataset.pageSize = ''; size.setAttribute('aria-label', 'Rows per page');
    [10, 20, 50, 100, 'all'].forEach(value => size.add(new Option(value === 'all' ? 'All' : value, value)));
    size.value = String(state.size); sizeLabel.append(label, size); controls.append(sizeLabel);
    const button = (label, page, disabled) => { const node = document.createElement('button'); node.type = 'button'; node.dataset.page = page; node.textContent = label; node.disabled = disabled; if (Number(page) === state.page) { node.classList.add('active'); node.setAttribute('aria-current', 'page'); } controls.append(node); };
    button('‹', 'prev', state.page === 1);
    for (let page = 1; page <= pages; page++) if (pages <= 7 || page === 1 || page === pages || Math.abs(page - state.page) <= 1) button(String(page), String(page), false);
    button('›', 'next', state.page === pages);
    container.replaceChildren(summary, controls);
  }
  function render() {
    const rows = filtered();
    const pages = state.size === 'all' ? 1 : Math.max(1, Math.ceil(rows.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = state.size === 'all' ? 0 : (state.page - 1) * state.size;
    const shown = state.size === 'all' ? rows : rows.slice(start, start + state.size);
    body.replaceChildren();
    shown.forEach(record => { const row = document.createElement('tr'); columns.forEach(field => addCell(row, field, record)); body.append(row); });
    $('#summaryTotalReview').textContent = statusRows().length;
    $('#summaryRowsPerPage').textContent = state.size === 'all' ? 'All' : state.size;
    $('#summaryVisibleRows').textContent = rows.length;
    $('#reviewTableState').hidden = rows.length > 0;
    $('#reviewTableState').textContent = rows.length ? '' : `No ${statusLabel} associations match the selected filters.`;
    $$('#reviewPaginationTop,#reviewPaginationBottom').forEach(container => pagination(container, rows.length, pages, rows.length ? start + 1 : 0, rows.length ? start + shown.length : 0));
    $('#clearReviewSearch').disabled = !state.search;
    $('#clearReviewFilters').disabled = !(state.search || state.year || geo.some(field => state[field]) || Object.values(state.filters).some(Boolean));
    applyColumns();
  }
  const refresh = () => { state.page = 1; syncFilters(); render(); };
  const reloadRecords = (showPlaceholder = false) => {
    records = read();
    const snapshot = JSON.stringify(records);
    if (snapshot === recordsSnapshot) return false;
    recordsSnapshot = snapshot;
    if (showPlaceholder) window.TmisTableLoading?.start(table);
    refresh();
    return true;
  };
  const panel = open => { $('#columnFilterPanel').hidden = !open; $('#columnFilterToggle').setAttribute('aria-expanded', String(open)); };
  $('#columnFilterToggle').addEventListener('click', () => panel($('#columnFilterPanel').hidden));
  $('#closeColumnFilter').addEventListener('click', () => panel(false));
  $('#applyColumnFilter').addEventListener('click', () => panel(false));
  $('#showAllColumns').addEventListener('click', () => { columns.forEach(field => visible.add(field)); applyColumns(); });
  $('#resetColumns').addEventListener('click', () => { visible.clear(); defaults.forEach(field => visible.add(field)); applyColumns(); });
  $$('.column-toggle').forEach(input => input.addEventListener('change', () => { if (input.checked) visible.add(input.dataset.column); else visible.delete(input.dataset.column); applyColumns(); }));
  $('#reviewGlobalSearch').addEventListener('input', event => { state.search = event.target.value.trim(); refresh(); });
  $('#yearCoveredFilter').addEventListener('change', event => { state.year = event.target.value; geo.forEach(field => { state[field] = ''; }); refresh(); });
  geo.forEach((field, index) => $('#' + field + 'Filter').addEventListener('change', event => { state[field] = event.target.value; geo.slice(index + 1).forEach(child => { state[child] = ''; }); refresh(); }));
  $$('.column-filter').forEach(input => input.addEventListener('input', () => { state.filters[input.dataset.column] = input.value; refresh(); }));
  $('#clearReviewFilters').addEventListener('click', () => { state.search = ''; state.year = ''; state.filters = {}; geo.forEach(field => { state[field] = ''; }); $('#reviewGlobalSearch').value = ''; $$('.column-filter').forEach(input => { input.value = ''; }); refresh(); });
  $('#clearReviewSearch').addEventListener('click', () => { state.search = ''; $('#reviewGlobalSearch').value = ''; refresh(); $('#reviewGlobalSearch').focus(); });
  $$('.sortable-column').forEach(header => header.addEventListener('click', () => { const field = header.dataset.sort; state.sort = { field, direction: state.sort?.field === field && state.sort.direction === 1 ? -1 : 1 }; render(); }));
  $$('#reviewPaginationTop,#reviewPaginationBottom').forEach(container => {
    container.addEventListener('click', event => { const button = event.target.closest('[data-page]'); if (!button || button.disabled) return; const pages = state.size === 'all' ? 1 : Math.max(1, Math.ceil(filtered().length / state.size)); state.page = button.dataset.page === 'prev' ? Math.max(1, state.page - 1) : button.dataset.page === 'next' ? Math.min(pages, state.page + 1) : Number(button.dataset.page); render(); });
    container.addEventListener('change', event => { if (event.target.matches('[data-page-size]')) { state.size = event.target.value === 'all' ? 'all' : Number(event.target.value); refresh(); } });
  });
  $('#refreshReviewTable').addEventListener('click', async () => {
    try {
      if (window.TMIS_PAGE) await window.TmisStore.refresh();
      records = read();
      recordsSnapshot = JSON.stringify(records);
      refresh();
    } catch (error) {
      window.alert(`The farmer association list could not be refreshed: ${error.message}`);
    }
  });
  $('#exportReviewTable').addEventListener('click', () => { if (!window.XLSX) { alert('Excel export is unavailable. Check your connection and try again.'); return; } const rows = filtered().map(record => Object.fromEntries(columns.slice(1).map(field => [labels[field], record[field] || '']))); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Farmer Associations'); XLSX.writeFile(book, `farmer_associations_${new Date().toISOString().slice(0, 10)}.xlsx`); });
  body.addEventListener('click', event => {
    const button = event.target.closest('button[data-action="delete"]');
    if (!button) return;
    const record = records.find(item => item.id === button.dataset.id);
    if (!record) return;
    selectedId = record.id;
    $('#faDeleteName').textContent = `${record.association_name} (${record.id})`;
    $('#faDeleteError').hidden = true;
    deleteModal.show();
  });
  function endUndo() { if (undoTimer) clearInterval(undoTimer); undoTimer = null; undoRecord = null; $('#faUndoNotice').hidden = true; }
  $('#faConfirmDelete').addEventListener('click', async () => {
    if (!selectedId) return;
    const index = records.findIndex(record => record.id === selectedId);
    if (index < 0) return;
    const removed = records[index];
    const next = records.filter(record => record.id !== selectedId);
    if (!await save(next)) { $('#faDeleteError').hidden = false; $('#faDeleteError').textContent = 'Could not delete this association. Please refresh and try again.'; return; }
    endUndo();
    records = next; undoRecord = { record: removed, index }; undoSeconds = 10;
    $('#faUndoMessage').textContent = `${removed.association_name} deleted.`;
    $('#faUndoButton').textContent = `Undo (${undoSeconds}s)`;
    $('#faUndoNotice').hidden = false;
    undoTimer = setInterval(() => { undoSeconds -= 1; if (undoSeconds <= 0) endUndo(); else $('#faUndoButton').textContent = `Undo (${undoSeconds}s)`; }, 1000);
    deleteModal.hide(); selectedId = ''; refresh();
  });
  $('#faUndoButton').addEventListener('click', async () => {
    if (!undoRecord) return;
    const latest = read();
    if (!latest.some(record => record.id === undoRecord.record.id)) {
      latest.splice(Math.min(undoRecord.index, latest.length), 0, undoRecord.record);
      if (!await save(latest)) return;
    }
    records = latest; endUndo(); refresh();
  });
  window.addEventListener('tmis:data-updated', () => reloadRecords(true));
  window.addEventListener('storage', event => {
    if (event.key === storageKey) reloadRecords(true);
  });
  syncFilters(); render();
});
