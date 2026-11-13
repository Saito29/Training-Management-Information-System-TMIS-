document.addEventListener('DOMContentLoaded', () => {
  const columns = [
    ['actions', 'Actions'], ['status', 'Status'], ['id', 'Resource Person ID'],
    ['first_name', 'First Name'], ['middle_name', 'Middle Name'],
    ['last_name', 'Last Name'], ['suffix', 'Suffix'],
    ['office', 'Office / Designation'], ['title', 'Title'],
    ['qualification', 'Qualification'], ['expertise', 'Expertise'],
    ['phone', 'Phone'], ['email', 'Email'], ['savedAt', 'Registration Date'],
  ];
  const defaults = new Set(['actions', 'status', 'id', 'first_name', 'middle_name', 'last_name', 'suffix', 'office']);
  const visible = new Set(defaults);
  const byId = (id) => document.getElementById(id);
  let records = [];
  let page = 1;
  let deleteTarget = null;
  let undoTimer = null;
  let pendingUndo = null;
  let pageSize = 20;
  let sortKey = 'last_name';
  let sortDirection = 1;
  const inactiveOnly = document.body.dataset.rpScope === 'inactive';
  const columnSearch = new Map();
  let filterColumns = '';
  const storageKey = 'tmis-resource-persons';
  const undoKey = 'tmis-rp-pending-delete';
  const nameOf = (record) => [
    ...(record.title === 'RAgr' ? [] : [record.title]),
    record.first_name, record.middle_name, record.last_name, record.suffix,
    ...(record.title === 'RAgr' ? ['RAgr'] : []),
  ].filter(Boolean).join(' ');
  const valueOf = (record, key) => {
    if (key === 'status') return record.status || 'Active';
    if (key === 'savedAt') return record.savedAt ? new Date(record.savedAt).toLocaleDateString() : '';
    return String(record[key] || '');
  };
  const choices = byId('rpColumnChoices');
  columns.forEach(([key, label]) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'col-md-4 col-sm-6';
    const control = document.createElement('label');
    control.className = 'form-check form-switch';
    const input = document.createElement('input');
    input.className = 'form-check-input'; input.type = 'checkbox'; input.checked = visible.has(key);
    input.disabled = key === 'actions'; input.dataset.column = key;
    input.addEventListener('change', () => { input.checked ? visible.add(key) : visible.delete(key); render(); });
    control.append(input, document.createTextNode(` ${label}`)); wrapper.append(control); choices.append(wrapper);
  });
  const load = () => {
    try {
      const saved = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      records = Array.isArray(saved) ? saved.filter((record) => !inactiveOnly || record.status === 'Inactive') : [];
    } catch { records = []; }
    const office = byId('rpOfficeFilter');
    const selected = office.value;
    office.replaceChildren(new Option('All offices', ''));
    [...new Set(records.map((record) => record.office).filter(Boolean))].sort().forEach((item) => office.add(new Option(item, item)));
    office.value = selected;
    render();
  };
  const pagination = (id, pages, total) => {
    const target = byId(id);
    target.replaceChildren();
    const count = document.createElement('span');
    const first = total ? (pageSize === 'all' ? 1 : (page - 1) * pageSize + 1) : 0;
    const last = pageSize === 'all' ? total : Math.min(page * pageSize, total);
    count.textContent = `Showing ${first}–${last} of ${total}`;
    target.append(count);
    if (pages < 2) return;
    const controls = document.createElement('div'); controls.className = 'pagination-controls';
    const button = (label, destination, disabled, current = false) => {
      const item = document.createElement('button');
      item.type = 'button'; item.className = current ? 'active' : '';
      item.textContent = label; item.disabled = disabled;
      if (current) item.setAttribute('aria-current', 'page');
      item.addEventListener('click', () => { page = destination; render(); });
      controls.append(item);
    };
    button('Previous', page - 1, page === 1);
    const pageNumbers = new Set([1, pages]);
    for (let number = Math.max(1, page - 2); number <= Math.min(pages, page + 2); number++) pageNumbers.add(number);
    let previous = 0;
    [...pageNumbers].sort((a, b) => a - b).forEach((number) => {
      if (number > previous + 1) { const ellipsis = document.createElement('span'); ellipsis.textContent = '…'; controls.append(ellipsis); }
      button(String(number), number, false, number === page); previous = number;
    });
    button('Next', page + 1, page === pages);
    target.append(controls);
  };
  const filtered = () => {
    const term = byId('rpSearch').value.trim().toLowerCase();
    return records.filter((record) => {
      if (byId('rpStatusFilter').value && valueOf(record, 'status') !== byId('rpStatusFilter').value) return false;
      if (byId('rpOfficeFilter').value && record.office !== byId('rpOfficeFilter').value) return false;
      for (const [key, query] of columnSearch) {
        if (visible.has(key) && query && !valueOf(record, key).toLowerCase().includes(query)) return false;
      }
      return !term || columns.filter(([key]) => key !== 'actions').some(([key]) => valueOf(record, key).toLowerCase().includes(term));
    });
  };
  function render() {
    const head = byId('rpHead'); const body = byId('rpTableBody');
    head.replaceChildren(); body.replaceChildren();
    const shown = columns.filter(([key]) => visible.has(key));
    shown.forEach(([key, label]) => {
      const th = document.createElement('th'); th.textContent = label;
      th.dataset.column = key;
      if (key !== 'actions') {
        th.className = 'sortable-column'; th.tabIndex = 0; th.setAttribute('role', 'button');
        th.setAttribute('aria-label', `Sort by ${label}`);
        const icon = document.createElement('i'); icon.className = 'bi bi-arrow-down-up'; icon.setAttribute('aria-hidden', 'true'); th.append(icon);
        const sort = () => { sortDirection = sortKey === key ? -sortDirection : 1; sortKey = key; page = 1; render(); };
        th.addEventListener('click', sort);
        th.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sort(); } });
      }
      head.append(th);
    });
    const signature = shown.map(([key]) => key).join('|');
    if (signature !== filterColumns) {
      filterColumns = signature;
      const filters = byId('rpColumnFilters'); filters.replaceChildren();
      shown.forEach(([key, label]) => {
        const cell = document.createElement('th');
        if (key !== 'actions') {
          const input = document.createElement('input');
          input.type = 'search'; input.className = 'form-control form-control-sm';
          input.placeholder = 'Search'; input.setAttribute('aria-label', `Search ${label}`);
          input.value = columnSearch.get(key) || '';
          input.addEventListener('input', () => { columnSearch.set(key, input.value.trim().toLowerCase()); page = 1; render(); });
          cell.append(input);
        }
        filters.append(cell);
      });
    }
    const matches = filtered().sort((a, b) => valueOf(a, sortKey).localeCompare(valueOf(b, sortKey), undefined, { numeric: true, sensitivity: 'base' }) * sortDirection);
    const pages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(matches.length / pageSize));
    page = Math.min(page, pages);
    (pageSize === 'all' ? matches : matches.slice((page - 1) * pageSize, page * pageSize)).forEach((record) => {
      const row = document.createElement('tr');
      shown.forEach(([key]) => {
        const cell = document.createElement('td');
        if (key === 'actions') {
          cell.className = 'rp-row-actions';
          const view = document.createElement('a');
          view.className = 'btn btn-sm btn-outline-success'; view.innerHTML = '<i class="bi bi-eye" aria-hidden="true"></i>';
          view.setAttribute('aria-label', `View ${nameOf(record)}`); view.title = 'View';
          view.href = `../id/view-rp?id=${encodeURIComponent(record.id)}`;
          view.target = '_blank'; view.rel = 'noopener noreferrer';
          const edit = document.createElement('a');
          edit.className = 'btn btn-sm btn-outline-primary'; edit.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
          edit.setAttribute('aria-label', `Edit ${nameOf(record)}`); edit.title = 'Edit';
          edit.href = `../id/edit-rp?id=${encodeURIComponent(record.id)}`;
          edit.target = '_blank'; edit.rel = 'noopener noreferrer';
          const remove = document.createElement('button');
          remove.type = 'button'; remove.className = 'btn btn-sm btn-outline-danger'; remove.innerHTML = '<i class="bi bi-trash" aria-hidden="true"></i>';
          remove.setAttribute('aria-label', `Delete ${nameOf(record)}`); remove.title = 'Delete';
          remove.disabled = Boolean(pendingUndo);
          remove.addEventListener('click', () => {
            deleteTarget = record.id;
            byId('rpDeleteName').textContent = nameOf(record);
            byId('rpDeleteId').textContent = record.id;
            bootstrap.Modal.getOrCreateInstance(byId('rpDeleteModal')).show();
          });
          cell.append(view, edit, remove);
        } else if (key === 'status') {
          const badge = document.createElement('span'); badge.className = `status-badge ${record.status === 'Inactive' ? 'status-neutral' : 'status-approved'}`;
          badge.textContent = valueOf(record, key); cell.append(badge);
        } else cell.textContent = valueOf(record, key) || '—';
        row.append(cell);
      });
      body.append(row);
    });
    byId('rpTotal').textContent = String(records.length);
    byId('rpMatching').textContent = String(matches.length);
    byId('rpPageSize').textContent = pageSize === 'all' ? 'All' : pageSize.toLocaleString();
    byId('rpEmpty').hidden = matches.length !== 0;
    pagination('rpPaginationTop', pages, matches.length); pagination('rpPaginationBottom', pages, matches.length);
  }
  byId('rpColumnsButton').addEventListener('click', () => {
    byId('rpColumns').hidden = !byId('rpColumns').hidden;
    byId('rpColumnsButton').setAttribute('aria-expanded', String(!byId('rpColumns').hidden));
  });
  byId('rpResetColumns').addEventListener('click', () => {
    visible.clear(); defaults.forEach((key) => visible.add(key));
    choices.querySelectorAll('input').forEach((input) => { input.checked = visible.has(input.dataset.column); });
    render();
  });
  ['rpStatusFilter', 'rpOfficeFilter', 'rpSearch'].forEach((id) => byId(id).addEventListener(id === 'rpSearch' ? 'input' : 'change', () => { page = 1; render(); }));
  byId('rpPageLength').addEventListener('change', () => { pageSize = byId('rpPageLength').value === 'all' ? 'all' : Number(byId('rpPageLength').value); page = 1; render(); });
  byId('rpClear').addEventListener('click', () => {
    byId('rpStatusFilter').value = inactiveOnly ? 'Inactive' : ''; byId('rpOfficeFilter').value = ''; byId('rpSearch').value = '';
    columnSearch.clear(); byId('rpColumnFilters').querySelectorAll('input').forEach((input) => { input.value = ''; });
    page = 1; render();
  });
  byId('rpRefresh').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      if (window.TMIS_PAGE) await window.TmisStore.refresh();
      load();
    } catch (error) {
      window.alert(error.message || 'Resource-person records could not be refreshed.');
    } finally {
      button.disabled = false;
    }
  });
  const clearUndo = () => {
    clearInterval(undoTimer); undoTimer = null; pendingUndo = null;
    sessionStorage.removeItem(undoKey);
    byId('rpUndoButton').hidden = true;
    bootstrap.Toast.getOrCreateInstance(byId('rpUndoToast')).hide();
    render();
  };
  const showUndo = () => {
    if (!pendingUndo) return;
    const remaining = Math.ceil((pendingUndo.expires - Date.now()) / 1000);
    if (remaining <= 0) { clearUndo(); return; }
    byId('rpUndoSeconds').textContent = String(remaining);
    byId('rpUndoButton').hidden = false;
    byId('rpUndoMessage').textContent = `${nameOf(pendingUndo.record)} deleted.`;
    bootstrap.Toast.getOrCreateInstance(byId('rpUndoToast'), { autohide: false }).show();
    clearInterval(undoTimer); undoTimer = setInterval(() => {
      const seconds = Math.ceil((pendingUndo.expires - Date.now()) / 1000);
      if (seconds <= 0) clearUndo();
      else byId('rpUndoSeconds').textContent = String(seconds);
    }, 250);
    render();
  };
  byId('rpConfirmDelete').addEventListener('click', async () => {
    if (!deleteTarget || pendingUndo) return;
    const latest = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
    const index = latest.findIndex((item) => item.id === deleteTarget);
    bootstrap.Modal.getOrCreateInstance(byId('rpDeleteModal')).hide();
    if (index < 0) { load(); return; }
    pendingUndo = { record: latest[index], index, expires: Date.now() + 10000 };
    try { await window.TmisStore.setItem(storageKey, JSON.stringify(latest.filter((item) => item.id !== deleteTarget))); }
    catch { pendingUndo = null; window.alert('Could not delete this record. Please try again.'); return; }
    try { sessionStorage.setItem(undoKey, JSON.stringify(pendingUndo)); } catch { /* Undo remains available in this tab. */ }
    deleteTarget = null; load(); showUndo();
  });
  byId('rpUndoButton').addEventListener('click', async () => {
    if (!pendingUndo || Date.now() >= pendingUndo.expires) { clearUndo(); return; }
    const latest = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
    if (!latest.some((item) => item.id === pendingUndo.record.id)) {
      latest.splice(Math.min(pendingUndo.index, latest.length), 0, pendingUndo.record);
      try { await window.TmisStore.setItem(storageKey, JSON.stringify(latest)); }
      catch { window.alert('Could not restore this record. Please try again before the undo timer ends.'); return; }
    }
    clearUndo(); load();
  });
  byId('rpExport').addEventListener('click', () => {
    const fields = columns.filter(([key]) => key !== 'actions');
    const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [fields.map(([, label]) => quote(label)).join(','), ...filtered().map((record) => fields.map(([key]) => quote(valueOf(record, key))).join(','))];
    const url = URL.createObjectURL(new Blob(['\uFEFF', rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'resource-persons.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.addEventListener('storage', (event) => { if (event.key === storageKey) load(); });
  window.addEventListener('tmis:data-updated', load);
  load();
  try {
    const savedUndo = JSON.parse(sessionStorage.getItem(undoKey) || 'null');
    if (savedUndo?.expires > Date.now() && savedUndo.record?.id) { pendingUndo = savedUndo; showUndo(); }
    else sessionStorage.removeItem(undoKey);
  } catch { sessionStorage.removeItem(undoKey); }
});
