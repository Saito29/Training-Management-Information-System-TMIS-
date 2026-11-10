document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const key = 'tmis-users';
  const fields = ['firstName', 'middleName', 'lastName', 'suffix', 'dateOfBirth', 'email', 'phone', 'role', 'region', 'office', 'position', 'createdAt'];
  const labels = ['First name', 'Middle name', 'Last name', 'Suffix', 'Date of birth', 'Work email', 'Mobile number', 'User role', 'Region', 'Office / organization', 'Position', 'Registered date'];
  const reviewModal = bootstrap.Modal.getOrCreateInstance($('accountReviewModal'));
  const deleteModal = bootstrap.Modal.getOrCreateInstance($('accountDeleteModal'));
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
  let records = [], selectedId = null, page = 1, pageSize = '20', pendingDelete = null, timer = null, refreshing = false;
  const name = (user) => [user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(' ') || 'Unnamed user';
  const isPending = (user) => ['Pending approval', 'For Review'].includes(user.status);
  const statusLabel = (user) => user.status;
  const statusClass = (user) => isPending(user) ? 'pending' : 'rejected';
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
  function read() { return records; }
  async function refresh() {
    try {
      const response = await fetch(window.accountApprovalUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok || response.redirected) throw new Error('Only an active System Administrator can review accounts.');
      records = (await response.json()).users; render();
    } catch (error) { feedback(error.message || 'User registrations could not be loaded.', 'error'); }
  }
  function details(container, user, compact = false) {
    const entries = compact ? [['User ID', user.id], ['Requested role', user.role], ['Office / organization', user.office], ['Registered date', date(user.createdAt)]]
      : [['User ID', user.id], ['Status', statusLabel(user)], ...fields.map((field, i) => [labels[i], display(user, field)])];
    const field = ([label, value]) => {
      const row = document.createElement('div'), term = document.createElement('dt'), description = document.createElement('dd');
      term.textContent = label; description.textContent = value || '?'; row.append(term, description); return row;
    };
    if (compact) {
      $('deleteUserName').textContent = name(user);
      $('deleteUserEmail').textContent = user.email || 'No email provided';
      $('deleteUserInitials').textContent = [user.firstName, user.lastName].map((part) => String(part || '').charAt(0)).join('').toUpperCase() || 'U';
      $('deleteUserStatus').textContent = statusLabel(user);
      $('deleteUserStatus').className = `account-status ${statusClass(user)}`;
      $(container).replaceChildren(...entries.map(field)); return;
    }
    $('reviewUserName').textContent = name(user);
    $('reviewUserEmail').textContent = user.email || 'No email provided';
    $('reviewUserInitials').textContent = [user.firstName, user.lastName].map((part) => String(part || '').charAt(0)).join('').toUpperCase() || 'U';
    $('reviewUserStatus').textContent = statusLabel(user);
    $('reviewUserStatus').className = `account-status ${statusClass(user)}`;
    const groups = [
      ['Registration', 'bi-clock-history', entries.slice(0, 2).concat(entries.slice(-1))],
      ['Personal information', 'bi-person-vcard', entries.slice(2, 9)],
      ['Requested access & office', 'bi-shield-lock', entries.slice(9, 13)],
    ];
    $(container).replaceChildren(...groups.map(([title, icon, values]) => {
      const section = document.createElement('section'); section.className = 'account-detail-group';
      const heading = document.createElement('h3'), symbol = document.createElement('i');
      symbol.className = `bi ${icon}`; symbol.setAttribute('aria-hidden', 'true'); heading.append(symbol, document.createTextNode(title));
      const list = document.createElement('dl'); list.className = 'account-details'; list.append(...values.map(field));
      section.append(heading, list); return section;
    }));
  }

  function action(user, type, icon, handler) {
    const button = document.createElement('button');
    if (type === 'Delete') { button.hidden = true; button.disabled = true; }
    button.type = 'button'; button.className = `btn account-action ${type === 'Delete' ? 'btn-outline-danger' : 'btn-outline-success'}`;
    button.title = `${type} user`; button.setAttribute('aria-label', `${type} ${name(user)}`);
    const symbol = document.createElement('i'); symbol.className = `bi ${icon}`; symbol.setAttribute('aria-hidden', 'true'); button.append(symbol);
    button.addEventListener('click', handler); return button;
  }
  function render() {
    if (refreshing) return;
    const query = $('approvalSearch').value.trim().toLowerCase();
    const filters = [...document.querySelectorAll('[data-field]')];
    const visible = records.filter((user) => (isPending(user) || user.status === 'Rejected') && user.id !== pendingDelete?.id)
      .filter((user) => (!$('approvalStatus').value || ($('approvalStatus').value === 'Pending approval' ? isPending(user) : statusLabel(user) === $('approvalStatus').value))
        && (!query || [user.id, statusLabel(user), ...fields.map((field) => display(user, field))].join(' ').toLowerCase().includes(query))
        && filters.every((input) => !input.value.trim() || `${display(user, input.dataset.field)} ${user[input.dataset.field] || ''}`.toLowerCase().includes(input.value.trim().toLowerCase())))
      .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
    const size = pageSize === 'all' ? Math.max(1, visible.length) : Number(pageSize);
    const pages = Math.max(1, Math.ceil(visible.length / size));
    page = Math.min(page, pages);
    $('approvalTableBody').replaceChildren(...visible.slice((page - 1) * size, page * size).map((user) => {
      const row = document.createElement('tr'), actions = document.createElement('div'); actions.className = 'account-actions';
      actions.append(action(user, 'Review', 'bi-eye', () => { selectedId = user.id; details('accountReviewDetails', user); $('approveUser').hidden = $('rejectUser').hidden = !isPending(user); reviewModal.show(); }),
        action(user, 'Delete', 'bi-trash3', () => { selectedId = user.id; details('accountDeleteDetails', user, true); deleteModal.show(); }));
      [actions, statusLabel(user), user.id, ...fields.map((field) => display(user, field))].forEach((value, i) => {
        const cell = document.createElement('td');
        if (value instanceof Node) cell.append(value); else cell.textContent = value || '—';
        if (i === 1) { const badge = document.createElement('span'); badge.className = `account-status ${statusClass(user)}`; badge.textContent = value; cell.replaceChildren(badge); }
        row.append(cell);
      }); return row;
    }));
    $('approvalCount').textContent = `${visible.length} matching registration${visible.length === 1 ? '' : 's'}`;
    $('approvalEmpty').hidden = visible.length > 0;
    for (const suffix of ['', 'Top']) {
      $(`approvalPageSize${suffix}`).value = pageSize;
      $(`approvalPageLabel${suffix}`).textContent = `Page ${page} of ${pages}`;
      $(`approvalPrevious${suffix}`).disabled = page <= 1;
      $(`approvalNext${suffix}`).disabled = page >= pages;
    }
  }
  async function decide(status) {
    $('approveUser').disabled = $('rejectUser').disabled = true;
    try {
      const response = await fetch(`${window.accountApprovalUrl}/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: JSON.stringify({ decision: status }),
      });
      if (response.redirected) throw new Error('Your session expired. Sign in again.');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'The access decision could not be saved.');
      reviewModal.hide(); feedback(data.message); await refresh();
    } catch (error) { feedback(error.message, 'error'); }
    finally { $('approveUser').disabled = $('rejectUser').disabled = false; }
  }
  $('approveUser').addEventListener('click', () => decide('Approved'));
  $('rejectUser').addEventListener('click', () => decide('Rejected'));
  function cancelDeletion() {
    clearInterval(timer); pendingDelete = null; $('approvalUndo').hidden = true; render();
  }
  $('confirmUserDelete').disabled = false;
  $('confirmUserDelete').addEventListener('click',async()=>{
    if(!selectedId)return;
    $('confirmUserDelete').disabled=true;
    try{await window.TmisStore.request('/system/accounts/'+encodeURIComponent(selectedId),{action:'delete'},'PATCH');deleteModal.hide();feedback('Account moved to trash.');await refresh();}
    catch(error){feedback(error.message,'error');}
    finally{$('confirmUserDelete').disabled=false;}
  });
  $('refreshApprovals').addEventListener('click', refresh);
  $('clearApprovalFilters').addEventListener('click', () => { $('approvalSearch').value = $('approvalStatus').value = ''; document.querySelectorAll('[data-field]').forEach((input) => { input.value = ''; }); page = 1; render(); });
  [$('approvalSearch'), ...document.querySelectorAll('[data-field]')].forEach((input) => input.addEventListener('input', () => { page = 1; render(); }));
  $('approvalStatus').addEventListener('change', () => { page = 1; render(); });
  for (const suffix of ['', 'Top']) {
    $(`approvalPageSize${suffix}`).addEventListener('change', (event) => { pageSize = event.target.value; page = 1; render(); });
    $(`approvalPrevious${suffix}`).addEventListener('click', () => { if (page > 1) page--; render(); });
    $(`approvalNext${suffix}`).addEventListener('click', () => { page++; render(); });
  }
  window.addEventListener('storage', (event) => { if (!event.key || event.key === key) refresh(); });
  refresh();
});
