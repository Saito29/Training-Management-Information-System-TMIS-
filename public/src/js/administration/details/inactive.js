document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const key = 'tmis-users';
  const can = (permission) => window.TmisStore.can(`administration.${permission}`);
  const canPage = (page) => !can('page_access') || can(`view.${page}`);
  const deleteModal = bootstrap.Modal.getOrCreateInstance($('accountDeleteModal'));
  const fields = ['lastName', 'firstName', 'middleName', 'suffix', 'dateOfBirth', 'email', 'phone', 'role', 'region', 'office', 'position', 'createdAt'];
  const toast = bootstrap.Toast.getOrCreateInstance($('reviewToast'), { delay: 5500 });
  // Keep notifications below the responsive header rather than covering navigation.
  const toastRegion = document.querySelector('.account-toast-region');
  const header = document.querySelector('.app-header');
  const positionToast = () => {
    const bottom = Math.max(0, header?.getBoundingClientRect().bottom || 0);
    toastRegion?.style.setProperty('--account-toast-top', `${bottom}px`);
  };
  positionToast();
  window.addEventListener('resize', positionToast);
  window.addEventListener('scroll', positionToast, { passive: true });
  if (header && globalThis.ResizeObserver) new ResizeObserver(positionToast).observe(header);
  let filteredRecords = [];
  const hiddenColumns = new Set(['id', 'dateOfBirth', 'email', 'phone', 'region', 'createdAt']);
  const columns = [
    ['actions', 'Actions'],
    ['status', 'Status'],
    ['id', 'User ID'],
    ['lastName', 'Last name'],
    ['firstName', 'First name'],
    ['middleName', 'Middle name'],
    ['suffix', 'Extension'],
    ['dateOfBirth', 'Date of birth'],
    ['email', 'Work email'],
    ['phone', 'Mobile number'],
    ['role', 'User role'],
    ['region', 'Region'],
    ['office', 'Office / organization'],
    ['position', 'Position'],
    ['createdAt', 'Registered date'],
  ];
  let records = [], page = 1, pageSize = '20', refreshing = false, selectedId = null, pendingDelete = null, timer = null;
  const name = (user) => [user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(' ') || 'Unnamed user';
  const isSystemAdministrator = (user) => user.role === 'System Administrator';
  const isAdministrator = Boolean(window.TMIS_PAGE?.administrator);
  const isInactive = (user) => /^inactive$/i.test(String(user.status || '').trim());
  const statusLabel = () => 'Inactive';
  const statusClass = () => 'inactive';
  const date = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila',  year: 'numeric', month: 'short', day: 'numeric' }).format(parsed);
  };
  const display = (user, field) => field === 'status' ? statusLabel(user) : ['createdAt', 'dateOfBirth'].includes(field) ? date(user[field]) : String(user[field] || '—');
  function feedback(message, type = 'success') {
    const settings = { success: ['Success', 'bi-check-circle-fill'], error: ['Error', 'bi-x-circle-fill'], warning: ['Warning', 'bi-exclamation-triangle-fill'] }[type];
    $('reviewToast').dataset.type = type;
    $('reviewToast').setAttribute('role', type === 'error' ? 'alert' : 'status');
    $('reviewToast').setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    $('reviewToastTitle').textContent = settings[0];
    $('reviewToastIcon').className = `bi ${settings[1]}`;
    $('reviewToastMessage').textContent = message;
    toast.show();
  }
  function read() {
    const data = JSON.parse(window.TmisStore.getItem(key) || '[]');
    if (!Array.isArray(data) || data.some((user) => !user || typeof user !== 'object' || !user.id)) throw new Error('Invalid registration data');
    return data;
  }
  function refresh() {
    try { records = read(); render(); }
    catch { feedback('User registrations could not be loaded. Try refreshing.', 'error'); }
  }
  function actionLink(user, type, icon, file) {
    const link = document.createElement('a');
    link.className = 'btn account-action btn-outline-success';
    const action = { 'edit-user': 'edit', 'view-user': 'view' }[file];
    link.href = action
      ? `../id/${action}/${encodeURIComponent(user.id)}`
      : `../id/${file}?id=${encodeURIComponent(user.id)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `${type} user (opens in a new tab)`;
    link.setAttribute('aria-label', `${type} ${name(user)} (opens in a new tab)`);
    const symbol = document.createElement('i');
    symbol.className = `bi ${icon}`;
    symbol.setAttribute('aria-hidden', 'true');
    link.append(symbol);
    return link;
  }
  function deleteAction(user) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn account-action btn-outline-danger';
    button.title = 'Delete user';
    button.setAttribute('aria-label', `Delete ${name(user)}`);
    const icon = document.createElement('i'); icon.className = 'bi bi-trash3'; icon.setAttribute('aria-hidden', 'true'); button.append(icon);
    button.addEventListener('click', () => {
      selectedId = user.id;
      $('deleteUserName').textContent = name(user);
      $('deleteUserEmail').textContent = user.email || 'No email provided';
      $('deleteUserInitials').textContent = [user.firstName, user.lastName].map((part) => String(part || '').charAt(0)).join('').toUpperCase() || 'U';
      $('deleteUserStatus').textContent = statusLabel(user);
      $('deleteUserStatus').className = `account-status ${statusClass(user)}`;
      const entries = [['User ID', user.id], ['Requested role', user.role], ['Office / organization', user.office], ['Registered date', date(user.createdAt)]];
      $('accountDeleteDetails').replaceChildren(...entries.map(([label, value]) => {
        const row = document.createElement('div'), term = document.createElement('dt'), description = document.createElement('dd');
        term.textContent = label; description.textContent = value || '?'; row.append(term, description); return row;
      }));
      deleteModal.show();
    });
    return button;
  }
  function applyColumnVisibility() {
    document.querySelectorAll('.account-table tr').forEach((row) => {
      [...row.children].forEach((cell, index) => { cell.hidden = hiddenColumns.has(columns[index]?.[0]); });
    });
    const width = columns.reduce((sum, [key]) => sum + (hiddenColumns.has(key) ? 0 : 160), 0);
    document.querySelector('.account-table').style.minWidth = `${Math.max(600, width)}px`;
  }
  columns.forEach(([key, label]) => {
    const wrapper = document.createElement('label'), checkbox = document.createElement('input');
    wrapper.className = 'account-column-option'; checkbox.type = 'checkbox'; checkbox.checked = !hiddenColumns.has(key);
    checkbox.addEventListener('change', () => {
      if (!checkbox.checked && hiddenColumns.size === columns.length - 1) {
        checkbox.checked = true; feedback('Keep at least one column visible.', 'warning'); return;
      }
      checkbox.checked ? hiddenColumns.delete(key) : hiddenColumns.add(key);
      applyColumnVisibility();
    });
    wrapper.append(checkbox, document.createTextNode(label)); $('userColumnOptions').append(wrapper);
  });
  $('showAllUserColumns').addEventListener('click', () => {
    hiddenColumns.clear();
    document.querySelectorAll('#userColumnOptions input').forEach((input) => { input.checked = true; });
    applyColumnVisibility();
  });
  $('exportUsers').addEventListener('click', () => {
    try {
      if (refreshing) { feedback('Wait for the refresh to finish before exporting.', 'warning'); return; }
      if (!globalThis.XLSX) throw new Error('Excel library unavailable');
      records = read(); render();
      if (!filteredRecords.length) { feedback('No users match the current filters to export.', 'warning'); return; }
      // Export every data field regardless of table column visibility.
      const exportedColumns = columns.filter(([key]) => key !== 'actions');
      const data = [exportedColumns.map(([, label]) => label), ...filteredRecords.map((user) => exportedColumns.map(([key]) => display(user, key)))];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      sheet['!cols'] = exportedColumns.map(([key]) => ({ wch: key === 'id' || key === 'email' ? 36 : key === 'office' ? 28 : 22 }));
      const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Inactive Users');
      XLSX.writeFile(book, 'inactive-users.xlsx');
      feedback(`Exported ${filteredRecords.length} user accounts to Excel.`);
    } catch { feedback('Excel export failed. Refresh the page and try again.', 'error'); }
  });
  function render() {
    if (refreshing) return;
    const regionFilter = $('userRegionFilter');
    const selectedRegion = regionFilter.value;
    const regions = [...new Set(records.filter((user) => isInactive(user))
      .map((user) => String(user.region || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const allRegions = document.createElement('option');
    allRegions.value = ''; allRegions.textContent = 'All regions';
    regionFilter.replaceChildren(allRegions, ...regions.map((region) => {
      const option = document.createElement('option'); option.value = region; option.textContent = region; return option;
    }));
    regionFilter.value = regions.includes(selectedRegion) ? selectedRegion : '';
    const officeFilter = $('userOfficeFilter');
    const selectedOffice = officeFilter.value;
    const offices = regionFilter.value ? [...new Set(records.filter((user) => (isInactive(user))
      && String(user.region || '').trim() === regionFilter.value)
      .map((user) => String(user.office || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)) : [];
    const allOffices = document.createElement('option');
    allOffices.value = ''; allOffices.textContent = regionFilter.value ? 'All offices / organizations' : 'Select a region first';
    officeFilter.disabled = !regionFilter.value;
    officeFilter.replaceChildren(allOffices, ...offices.map((office) => {
      const option = document.createElement('option'); option.value = office; option.textContent = office; return option;
    }));
    officeFilter.value = offices.includes(selectedOffice) ? selectedOffice : '';
    const query = $('approvalSearch').value.trim().toLowerCase();
    const filters = [...document.querySelectorAll('[data-field]')];
    const visible = records.filter((user) => (isInactive(user)) && user.id !== pendingDelete?.id)
      .filter((user) => (!regionFilter.value || String(user.region || '').trim() === regionFilter.value)
        && (!officeFilter.value || String(user.office || '').trim() === officeFilter.value)
        && (!query || [user.id, statusLabel(user), ...fields.map((field) => display(user, field))].join(' ').toLowerCase().includes(query))
        && filters.every((input) => !input.value.trim() || `${display(user, input.dataset.field)} ${user[input.dataset.field] || ''}`.toLowerCase().includes(input.value.trim().toLowerCase())))
      .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
    filteredRecords = visible;
    const size = pageSize === 'all' ? Math.max(1, visible.length) : Number(pageSize);
    const pages = Math.max(1, Math.ceil(visible.length / size));
    page = Math.min(page, pages);
    $('approvalTableBody').replaceChildren(...visible.slice((page - 1) * size, page * size).map((user) => {
      const row = document.createElement('tr'), actions = document.createElement('div'); actions.className = 'account-actions';
      const availableActions = [];
      if (can('read') && canPage('id.view-user') && (!isSystemAdministrator(user) || isAdministrator)) availableActions.push(actionLink(user, 'View', 'bi-eye', 'view-user'));
      if (can('edit') && canPage('id.edit-user') && !isSystemAdministrator(user)) availableActions.push(actionLink(user, 'Edit', 'bi-pencil-square', 'edit-user'));
      if (can('delete') && !isSystemAdministrator(user)) availableActions.push(deleteAction(user));
      actions.append(...availableActions);
      [actions, statusLabel(user), user.id, ...fields.map((field) => display(user, field))].forEach((value, i) => {
        const cell = document.createElement('td');
        if (value instanceof Node) cell.append(value); else cell.textContent = value || '—';
        if (i === 1) { const badge = document.createElement('span'); badge.className = `account-status ${statusClass(user)}`; badge.textContent = value; cell.replaceChildren(badge); }
        row.append(cell);
      }); return row;
    }));
    applyColumnVisibility();
    $('approvalCount').textContent = `${visible.length} matching registration${visible.length === 1 ? '' : 's'}`;
    $('approvalEmpty').hidden = visible.length > 0;
    for (const suffix of ['', 'Top']) {
      $(`approvalPageSize${suffix}`).value = pageSize;
      $(`approvalPageLabel${suffix}`).textContent = `Page ${page} of ${pages}`;
      $(`approvalPrevious${suffix}`).disabled = page <= 1;
      $(`approvalNext${suffix}`).disabled = page >= pages;
    }
  }
  function cancelDeletion() {
    clearInterval(timer); pendingDelete = null; $('approvalUndo').hidden = true; render();
  }
  $('confirmUserDelete').addEventListener('click', async () => {
    if (pendingDelete) { feedback('Undo the current deletion or wait for its countdown before deleting another user.', 'warning'); return; }
    try {
      const user = read().find((item) => item.id === selectedId);
      if (!user) { feedback('This registration no longer exists.', 'warning'); deleteModal.hide(); refresh(); return; }
      pendingDelete = { id: user.id, name: name(user), deadline: Date.now() + 10000 };
      deleteModal.hide(); $('approvalUndo').hidden = false;
      feedback('Deletion scheduled. Use Undo within 10 seconds to keep this user.', 'warning');
      const tick = async () => {
        const remaining = Math.max(0, Math.ceil((pendingDelete.deadline - Date.now()) / 1000));
        $('approvalUndoMessage').textContent = `${pendingDelete.name} will be deleted in ${remaining} seconds.`;
        if (remaining > 0) return;
        clearInterval(timer);
        try {
          const latest = read(), user = latest.find((item) => item.id === pendingDelete.id);
          if (user) await window.TmisStore.setItem(key, JSON.stringify(latest.filter((item) => item.id !== pendingDelete.id)));
          feedback(user ? `${pendingDelete.name} was deleted.` : 'The registration was already removed.', user ? 'success' : 'warning');
        } catch { feedback('Deletion failed. The registration has been kept.', 'error'); }
        pendingDelete = null; $('approvalUndo').hidden = true; refresh();
      };
      await tick(); timer = setInterval(tick, 250); refresh();
    } catch { feedback('The registration could not be read. Deletion was not scheduled.', 'error'); }
  });
  $('undoUserDelete').addEventListener('click', () => { if (!pendingDelete) return; cancelDeletion(); feedback('Deletion undone. The registration has been kept.'); });
  $('refreshApprovals').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (refreshing) return;
    refreshing = true;
    button.disabled = true;
    try {
      if (window.TMIS_PAGE) await window.TmisStore.refresh();
      records = read();
      render();
      feedback('User registrations refreshed.');
    } catch {
      feedback('User registrations could not be refreshed. Showing the previous results.', 'error');
    } finally {
      refreshing = false;
      button.disabled = false;
      render();
    }
  });
  $('clearApprovalFilters').addEventListener('click', () => { $('approvalSearch').value = $('userOfficeFilter').value = $('userRegionFilter').value = ''; document.querySelectorAll('[data-field]').forEach((input) => { input.value = ''; }); page = 1; render(); });
  [$('approvalSearch'), ...document.querySelectorAll('[data-field]')].forEach((input) => input.addEventListener('input', () => { page = 1; render(); }));
  $('userRegionFilter').addEventListener('change', () => { $('userOfficeFilter').value = ''; page = 1; render(); });
  [$('userOfficeFilter')].forEach((control) => control.addEventListener('change', () => { page = 1; render(); }));
  for (const suffix of ['', 'Top']) {
    $(`approvalPageSize${suffix}`).addEventListener('change', (event) => { pageSize = event.target.value; page = 1; render(); });
    $(`approvalPrevious${suffix}`).addEventListener('click', () => { if (page > 1) page--; render(); });
    $(`approvalNext${suffix}`).addEventListener('click', () => { page++; render(); });
  }
  window.addEventListener('storage', (event) => { if (!event.key || event.key === key) refresh(); });
  window.addEventListener('tmis:data-updated', refresh);
  refresh();
});
