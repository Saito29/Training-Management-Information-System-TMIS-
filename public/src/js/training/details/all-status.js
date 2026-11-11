document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);

  const STATUS = ['For Review', 'For Approval', 'For Acceptance', 'Approved & Accepted'];
  const LOCATIONS = [
    { region: 'Region IV-A (CALABARZON)', province: 'Quezon', district: '1st District', municipality: 'Jomalig', barangay: 'Apad' },
    { region: 'Region IV-A (CALABARZON)', province: 'Quezon', district: '2nd District', municipality: 'Alabat', barangay: 'Villa Esperanza' },
    { region: 'Region IV-A (CALABARZON)', province: 'Quezon', district: '2nd District', municipality: 'Perez', barangay: 'Villamanzano Sur' },
    { region: 'Region V (Bicol Region)', province: 'Camarines Norte', district: '1st District', municipality: 'Daet', barangay: 'Lag-on' },
  ];
  const TYPES = ['Farmer Field School', 'Technical Skills Training', 'Livelihood Training', 'Cooperative Management Training', 'Seminar / Workshop'];
  const TITLES = [
    'Rice Farmer Field School', 'Organic Fertilizer Production', 'Coco Sugar Processing',
    'Cooperative Financial Management', 'Climate-Smart Agriculture Orientation',
    'Farm Machinery Operation and Maintenance', 'Post-Harvest Handling and Processing',
    'Agri-Entrepreneurship Workshop', 'Vegetable Production Field School',
  ];
  const OFFICES = ['DA-SAAD Regional Office', 'Provincial Agriculture Office', 'Municipal Agriculture Office'];
  const VENUES = ['Farmers Training Center', 'Municipal Agriculture Office Hall', 'Barangay Hall', 'Covered Court'];
  const pad = (value) => String(value).padStart(2, '0');
  const records = (window.TMIS_PAGE ? window.TmisStore.records('tmis-trainings').filter(item => item.is_active === true && STATUS.includes(item.workflowStatus || item.status)) : Array.from({ length: 45 }, (_, index) => {
    const n = index + 1;
    const year = 2024 + (n % 3);
    const place = LOCATIONS[n % LOCATIONS.length];
    const month = (n % 12) + 1;
    const day = (n % 24) + 1;
    const startDate = `${year}-${pad(month)}-${pad(day)}`;
    const endDate = new Date(`${startDate}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + (n % 3) + 1);
    return {
      id: `TRN-${year}-${String(n).padStart(3, '0')}`,
      status: STATUS[(n - 1) % STATUS.length],
      title: TITLES[n % TITLES.length],
      type: TYPES[n % TYPES.length],
      office: OFFICES[n % OFFICES.length],
      startDate,
      endDate: endDate.toISOString().slice(0, 10),
      venue: VENUES[n % VENUES.length],
      ...place,
      yearCovered: year,
      dateEncoded: `${year}-${pad(month)}-${pad(Math.max(1, day - 4))}`,
    };
  }));

  const COLUMNS = [
    ['status', 'Status'], ['customStatus', 'Additional Status'], ['id', 'Training ID'], ['title', 'Training Title'],
    ['type', 'Training Type'], ['office', 'Implementing Office'],
    ['startDate', 'Start Date'], ['endDate', 'End Date'], ['venue', 'Venue'],
    ['region', 'Region'], ['province', 'Province'], ['district', 'District'],
    ['municipality', 'Municipality'], ['barangay', 'Barangay'],
    ['yearCovered', 'Year Covered'], ['dateEncoded', 'Date Encoded'],
  ];
  const DEFAULT_VISIBLE_COLUMNS = new Set([
    'actions', 'status', 'customStatus', 'id', 'title', 'type', 'office', 'startDate', 'endDate', 'venue',
  ]);
  const body = $('#forReviewTableBody');
  const table = $('#forReviewDataTable');
  const empty = $('#reviewTableState');
  const toastElement = $('#reviewToast');
  const toast = toastElement ? new bootstrap.Toast(toastElement) : null;
  const deleteModalElement = $('#deleteConfirmModal');
  const deleteModal = deleteModalElement ? new bootstrap.Modal(deleteModalElement) : null;
  let selectedDeleteId = null;
  let pendingDelete = null;
  const state = {
    page: 1, perPage: 10, query: '', status: '', type: '', year: '',
    region: '', province: '', district: '', municipality: '', barangay: '',
    columnFilters: {},
    hidden: new Set(COLUMNS.map(([key]) => key).filter((key) => !DEFAULT_VISIBLE_COLUMNS.has(key))),
    sort: null,
  };
  const statusClass = (status) => ({
    'For Review': 'status-review',
    'For Approval': 'status-approval',
    'For Acceptance': 'status-acceptance',
    'Approved & Accepted': 'status-approved',
  })[status] || 'status-neutral';
  const formatDate = (value) => new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila', 
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
  const notify = (title, message, error = false) => {
    if (!toast) return;
    $('#reviewToastTitle').textContent = title;
    $('#reviewToastMessage').textContent = message;
    $('#undoDeleteButton').hidden = true;
    $('#reviewToast .btn-close').hidden = false;
    $('#reviewToastTime').textContent = new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila', 
      hour: 'numeric', minute: '2-digit',
    }).format(new Date());
    $('#reviewToastIcon').className = `bi ${error ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2`;
    toastElement.classList.toggle('review-toast-blocked', error);
    toast.show();
  };

  document.title = 'DA-TMIS - All Training Status';
  $('.content-header').textContent = 'Training status overview';
  $('.content-info').textContent = 'View trainings across the review, approval, acceptance, and final accepted stages.';
  $('#forReviewTableTitle').textContent = 'All Training Status';
  $('.for-review-table-description').textContent = 'Browse and filter training records across the review and approval workflow.';
  const summaryLabels = $$('.review-table-summary span');
  if (summaryLabels[0]) summaryLabels[0].textContent = 'Total Trainings';
  if (summaryLabels[2]) summaryLabels[2].textContent = 'Visible Trainings';
  const about = $('.all-status-about');
  if (about) about.textContent = 'This page brings together every training workflow status from review through final acceptance.';

  const toolbar = $('.review-table-toolbar');
  toolbar.innerHTML = `
    <div class="toolbar-filter"><label for="statusFilter">Status</label><select id="statusFilter" class="form-select"><option value="">All statuses</option>${STATUS.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></div>
    <div class="toolbar-filter"><label for="trainingTypeFilter">Training Type</label><select id="trainingTypeFilter" class="form-select"><option value="">All training types</option></select></div>
    <div class="toolbar-filter"><label for="yearCoveredFilter">Year Covered</label><select id="yearCoveredFilter" class="form-select"><option value="">All years</option></select></div>
    ${['region', 'province', 'district', 'municipality', 'barangay'].map((key) => `<div class="toolbar-filter"><label for="${key}Filter">${key[0].toUpperCase() + key.slice(1)}</label><select id="${key}Filter" class="form-select"></select></div>`).join('')}
    <div class="toolbar-search"><label for="reviewGlobalSearch">Search trainings</label><div class="input-group"><span class="input-group-text"><i class="bi bi-search"></i></span><input id="reviewGlobalSearch" class="form-control" type="search" placeholder="Search training records" /></div></div>
    <button class="btn clear-filter-button" type="button" id="clearReviewFilters"><i class="bi bi-filter-circle me-1"></i>Clear filters</button>`;

  const columnPanel = $('#columnFilterPanel');
  columnPanel.innerHTML = `
    <div class="column-filter-header">
      <div><h6><i class="bi bi-layout-three-columns me-2"></i>Choose columns</h6><p>Show or hide fields in the table.</p></div>
      <button type="button" class="btn-close" id="closeColumnFilter" aria-label="Close column chooser"></button>
    </div>
    <div class="column-filter-tools">
      <label class="visually-hidden" for="columnSearchInput">Find a column</label>
      <div class="input-group input-group-sm"><span class="input-group-text"><i class="bi bi-search"></i></span><input class="form-control" id="columnSearchInput" type="search" placeholder="Find a column"></div>
      <span class="column-selection-count" id="columnSelectionCount" aria-live="polite"></span>
    </div>
    <div class="column-filter-body"><div class="row g-2">${COLUMNS.map(([key, label]) => `<div class="col-md-4 col-sm-6 column-option"><div class="form-check form-switch"><input class="form-check-input column-toggle" type="checkbox" role="switch" id="col-${key}" data-column="${key}" ${DEFAULT_VISIBLE_COLUMNS.has(key) ? 'checked' : ''} ${key === 'actions' ? 'disabled' : ''}><label class="form-check-label" for="col-${key}">${esc(label)}${key === 'actions' ? '<small>Always shown</small>' : ''}</label></div></div>`).join('')}</div></div>
    <div class="column-filter-footer"><button type="button" class="btn btn-sm btn-link" id="showAllColumns">Show all</button><button type="button" class="btn btn-sm btn-outline-secondary" id="resetColumns">Reset to default</button><button type="button" class="btn btn-sm btn-success" id="applyColumnFilter">Done</button></div>`;

  const headRow = $('thead tr', table);
  const footRow = $('tfoot tr', table);
  headRow.innerHTML = `<th data-column="actions">Actions</th>${COLUMNS.map(([key, label]) => `<th class="sortable-column" data-column="${key}" data-sort="${key}">${esc(label)} <i class="bi bi-arrow-down-up"></i></th>`).join('')}`;
  footRow.innerHTML = `<th data-column="actions"></th>${COLUMNS.map(([key, label]) => `<th data-column="${key}"><input class="form-control form-control-sm column-filter" data-column-filter="${key}" type="search" placeholder="Filter ${esc(label)}" aria-label="Filter ${esc(label)}"></th>`).join('')}`;
  $('caption', table).textContent = 'Training records across all review and approval statuses';
  $('#reviewToastTitle').textContent = 'Trainings Refreshed';
  $('#reviewToastMessage').textContent = 'Training status records loaded.';

  const setColumnPanel = (open) => {
    columnPanel.style.display = open ? 'block' : 'none';
    $('#columnFilterToggle').classList.toggle('active', open);
    $('#columnFilterToggle').setAttribute('aria-expanded', String(open));
  };
  const columnToggle = $('#columnFilterToggle');
  columnToggle.setAttribute('aria-expanded', 'false');
  columnToggle.addEventListener('click', () => setColumnPanel(columnPanel.style.display === 'none'));
  columnPanel.addEventListener('change', (event) => {
    if (!event.target.matches('.column-toggle')) return;
    const key = event.target.dataset.column;
    event.target.checked ? state.hidden.delete(key) : state.hidden.add(key);
    applyColumnVisibility();
    updateColumnSelectionCount();
  });
  $('#showAllColumns').addEventListener('click', () => {
    state.hidden.clear();
    $$('.column-toggle', columnPanel).forEach((toggle) => { toggle.checked = true; });
    applyColumnVisibility();
    updateColumnSelectionCount();
  });
  $('#resetColumns').addEventListener('click', () => {
    state.hidden = new Set(COLUMNS.map(([key]) => key).filter((key) => !DEFAULT_VISIBLE_COLUMNS.has(key)));
    $$('.column-toggle', columnPanel).forEach((toggle) => {
      toggle.checked = DEFAULT_VISIBLE_COLUMNS.has(toggle.dataset.column);
    });
    applyColumnVisibility();
    updateColumnSelectionCount();
  });
  $('#applyColumnFilter').addEventListener('click', () => setColumnPanel(false));
  $('#columnSearchInput').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    $$('.column-option', columnPanel).forEach((option) => {
      option.hidden = !option.textContent.toLowerCase().includes(query);
    });
  });
  document.addEventListener('click', (event) => {
    if (columnPanel.style.display !== 'none' && !columnPanel.contains(event.target) && !columnToggle.contains(event.target)) {
      setColumnPanel(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && columnPanel.style.display !== 'none') setColumnPanel(false);
  });

  const applyColumnVisibility = () => {
    $$('[data-column]', table).forEach((cell) => {
      cell.classList.toggle('column-hidden', state.hidden.has(cell.dataset.column));
    });
  };
  const updateColumnSelectionCount = () => {
    const shown = COLUMNS.length - state.hidden.size;
    $('#columnSelectionCount').textContent = `${shown} of ${COLUMNS.length} columns shown`;
  };
  const fillSelect = (id, label, values) => {
    const select = $('#' + id);
    const priorValue = state[id.replace('Filter', '')] || '';
    select.replaceChildren(new Option(label, ''), ...values.map((value) => new Option(value, value)));
    select.value = values.includes(priorValue) ? priorValue : '';
  };
  const syncGeoFilters = () => {
    const levels = ['region', 'province', 'district', 'municipality', 'barangay'];
    levels.forEach((key, index) => {
      const allowed = records.filter((record) => levels.slice(0, index).every((parent) => !state[parent] || state[parent] === record[parent]));
      const values = [...new Set(allowed.map((record) => record[key]))].sort();
      if (state[key] && !values.includes(state[key])) state[key] = '';
      fillSelect(`${key}Filter`, `All ${key === 'municipality' ? 'municipalities' : `${key}s`}`, values);
    });
  };
  fillSelect('trainingTypeFilter', 'All training types', [...new Set(records.map((r) => r.type))].sort());
  fillSelect('yearCoveredFilter', 'All years', [...new Set(records.map((r) => String(r.yearCovered)))].sort());
  syncGeoFilters();

  const filtered = () => records.filter((r) =>
    (!state.status || r.status === state.status) &&
    (!state.type || r.type === state.type) &&
    (!state.year || String(r.yearCovered) === state.year) &&
    ['region', 'province', 'district', 'municipality', 'barangay'].every((key) => !state[key] || r[key] === state[key]) &&
    (!state.query || Object.values(r).join(' ').toLowerCase().includes(state.query)) &&
    Object.entries(state.columnFilters).every(([key, value]) => !value || String(r[key] ?? '').toLowerCase().includes(value))
  );
  const sorted = () => {
    const rows = filtered();
    if (!state.sort) return rows;
    const { key, direction } = state.sort;
    return [...rows].sort((a, b) => {
      const result = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true, sensitivity: 'base' });
      return direction === 'asc' ? result : -result;
    });
  };
  const pagination = (id, total, pages) => {
    const element = $('#' + id);
    const start = total ? (state.perPage === 'all' ? 1 : (state.page - 1) * state.perPage + 1) : 0;
    const end = state.perPage === 'all' ? total : Math.min(state.page * state.perPage, total);
    const buttons = state.perPage === 'all' ? '' : `<button data-page="prev" ${state.page === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button><span>${state.page} / ${pages}</span><button data-page="next" ${state.page === pages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
    element.innerHTML = `<span>Showing ${start}–${end} of ${total} trainings</span><div class="pagination-controls"><label class="visually-hidden" for="${id}Rows">Rows per page</label><select id="${id}Rows" data-page-size><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="all">All</option></select>${buttons}</div>`;
    $('[data-page-size]', element).value = state.perPage;
  };
  const render = () => {
    const all = sorted();
    const pages = state.perPage === 'all' ? 1 : Math.max(1, Math.ceil(all.length / state.perPage));
    if (state.page > pages) state.page = 1;
    const rows = state.perPage === 'all' ? all : all.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    body.innerHTML = rows.map((r) => `<tr data-record-id="${esc(r.id)}"><td data-column="actions"><div class="table-row-actions"><a class="btn table-action-button view-action" href="../id/view-training/${encodeURIComponent(r.id)}" target="_blank" rel="noopener" title="View training" aria-label="View ${esc(r.id)}"><i class="bi bi-eye-fill"></i></a><a class="btn table-action-button edit-action" href="../id/edit-training/${encodeURIComponent(r.id)}" target="_blank" rel="noopener" title="Edit training" aria-label="Edit ${esc(r.id)}"><i class="bi bi-pencil-fill"></i></a>${window.TmisTrainingStatusActions?.render(r) || ''}<button type="button" class="btn table-action-button delete-action" data-delete="${esc(r.id)}" title="Delete training" aria-label="Delete ${esc(r.id)}"><i class="bi bi-trash-fill"></i></button></div></td>${COLUMNS.map(([key]) => `<td data-column="${key}">${key === 'status' ? `<span class="status-badge ${statusClass(r.status)}">${esc(r.status)}</span>` : key === 'customStatus' && r.customStatus ? `<span class="status-badge status-neutral">${esc(r.customStatus)}</span>` : esc(['startDate', 'endDate', 'dateEncoded'].includes(key) ? formatDate(r[key]) : r[key])}</td>`).join('')}</tr>`).join('');
    applyColumnVisibility();
    empty.hidden = rows.length > 0;
    if (!rows.length) empty.innerHTML = '<i class="bi bi-search"></i><strong>No training records match these filters.</strong>';
    $('#summaryTotalReview').textContent = all.length;
    $('#summaryRowsPerPage').textContent = state.perPage === 'all' ? 'All' : state.perPage;
    $('#summaryVisibleRows').textContent = rows.length;
    pagination('reviewPaginationTop', all.length, pages);
    pagination('reviewPaginationBottom', all.length, pages);
    $$('.sortable-column', table).forEach((header) => {
      const active = state.sort?.key === header.dataset.sort;
      $('i', header).className = `bi ${active ? (state.sort.direction === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'}`;
    });
  };
  const refresh = () => { state.page = 1; render(); };

  $('#statusFilter').addEventListener('change', (event) => { state.status = event.target.value; refresh(); });
  $('#trainingTypeFilter').addEventListener('change', (event) => { state.type = event.target.value; refresh(); });
  $('#yearCoveredFilter').addEventListener('change', (event) => { state.year = event.target.value; refresh(); });
  ['region', 'province', 'district', 'municipality', 'barangay'].forEach((key) => {
    $(`#${key}Filter`).addEventListener('change', (event) => { state[key] = event.target.value; syncGeoFilters(); refresh(); });
  });
  $('#reviewGlobalSearch').addEventListener('input', (event) => { state.query = event.target.value.trim().toLowerCase(); refresh(); });
  footRow.addEventListener('input', (event) => {
    const input = event.target.closest('[data-column-filter]');
    if (!input) return;
    state.columnFilters[input.dataset.columnFilter] = input.value.trim().toLowerCase();
    refresh();
  });
  $('#clearReviewFilters').addEventListener('click', () => {
    state.status = state.type = state.year = state.query = '';
    ['region', 'province', 'district', 'municipality', 'barangay'].forEach((key) => { state[key] = ''; });
    state.columnFilters = {};
    $('#statusFilter').value = $('#trainingTypeFilter').value = $('#yearCoveredFilter').value = $('#reviewGlobalSearch').value = '';
    $$('.column-filter', table).forEach((input) => { input.value = ''; });
    syncGeoFilters();
    refresh();
  });
  headRow.addEventListener('click', (event) => {
    const header = event.target.closest('.sortable-column');
    if (!header) return;
    state.sort = state.sort?.key === header.dataset.sort
      ? { key: header.dataset.sort, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' }
      : { key: header.dataset.sort, direction: 'asc' };
    refresh();
  });
  ['reviewPaginationTop', 'reviewPaginationBottom'].forEach((id) => {
    const element = $('#' + id);
    element.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      const pages = state.perPage === 'all' ? 1 : Math.max(1, Math.ceil(sorted().length / state.perPage));
      state.page = button.dataset.page === 'prev' ? Math.max(1, state.page - 1) : Math.min(pages, state.page + 1);
      render();
    });
    element.addEventListener('change', (event) => {
      if (!event.target.matches('[data-page-size]')) return;
      state.perPage = event.target.value === 'all' ? 'all' : Number(event.target.value);
      refresh();
    });
  });
  $('#refreshReviewTable').addEventListener('click', () => {
    state.sort = null;
    state.perPage = 10;
    $('#clearReviewFilters').click();
    notify('Trainings Refreshed', `${records.length} training records loaded.`);
  });
  $('#exportReviewTable').addEventListener('click', () => {
    if (!window.XLSX) return notify('Export Unavailable', 'The Excel library could not be loaded.', true);
    const rows = sorted();
    if (!rows.length) return notify('Nothing to Export', 'No training records match these filters.', true);
    const data = rows.map((r) => Object.fromEntries(COLUMNS.map(([key, label]) => [label, r[key]])));
    const sheet = XLSX.utils.json_to_sheet(data);
    sheet['!cols'] = COLUMNS.map(([, label]) => ({ wch: Math.max(14, label.length + 4) }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'All Training Status');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(book, `all_training_status_${stamp}.xlsx`);
    notify('Export Complete', `${rows.length} training records exported.`);
  });

  body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    if (pendingDelete) {
      notify('Deletion Pending', 'Undo or wait for the current deletion before scheduling another.');
      return;
    }
    const record = records.find((item) => item.id === button.dataset.delete);
    if (!record) return;
    selectedDeleteId = record.id;
    $('#deleteTrainingId').textContent = record.id;
    $('#deleteTrainingTitle').textContent = record.title;
    $('#deleteTrainingType').textContent = record.type;
    const status = $('#deleteTrainingStatus');
    status.textContent = record.status;
    status.className = `status-badge ${statusClass(record.status)}`;
    deleteModal.show();
  });

  $('#confirmDeleteButton').addEventListener('click', () => {
    if (!selectedDeleteId || pendingDelete) return;
    const id = selectedDeleteId;
    selectedDeleteId = null;
    deleteModal.hide();
    const row = $$('tr[data-record-id]', body).find((item) => item.dataset.recordId === id);
    row?.classList.add('pending-delete');

    const undoButton = $('#undoDeleteButton');
    let remaining = 10;
    pendingDelete = {
      id,
      timeout: window.setTimeout(async () => {
        try {
          await window.TmisStore.setItem('tmis-trainings', JSON.stringify(window.TmisStore.records('tmis-trainings').filter(record=>record.id !== id)));
        } catch(error) {
          window.clearInterval(pendingDelete?.interval); pendingDelete = null; render(); notify('Deletion blocked', error.message, true); return;
        }
        const index = records.findIndex((record) => record.id === id);
        if (index !== -1) records.splice(index, 1);
        window.clearInterval(pendingDelete?.interval);
        pendingDelete = null;
        render();
        notify('Training Deleted', `${id} was deleted.`);
      }, 10000),
      interval: null,
    };
    notify('Training Deletion Scheduled', `${id} will be deleted in 10 seconds.`);
    undoButton.hidden = false;
    undoButton.textContent = `Undo (${remaining}s)`;
    $('#reviewToast .btn-close').hidden = true;
    pendingDelete.interval = window.setInterval(() => {
      remaining -= 1;
      if (pendingDelete && pendingDelete.id === id && remaining > 0) {
        undoButton.textContent = `Undo (${remaining}s)`;
      }
    }, 1000);
  });

  $('#undoDeleteButton').addEventListener('click', () => {
    if (!pendingDelete) return;
    window.clearTimeout(pendingDelete.timeout);
    window.clearInterval(pendingDelete.interval);
    const id = pendingDelete.id;
    pendingDelete = null;
    render();
    notify('Deletion Undone', `${id} was kept.`);
  });

  deleteModalElement.addEventListener('hidden.bs.modal', () => {
    selectedDeleteId = null;
  });

  updateColumnSelectionCount();
  render();
});
