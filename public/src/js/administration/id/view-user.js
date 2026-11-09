// Profile data matches the registration payload stored in tmis-users.
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const id = new URLSearchParams(location.search).get('id');
  const profileUrl = $('userProfileContent').dataset.profileUrl;
  const accountUrl = profileUrl.replace(/\/0(?:\?.*)?$/, `/${encodeURIComponent(id || '')}`);
  const modal = bootstrap.Modal.getOrCreateInstance($('accountDeleteModal'));
  const toast = bootstrap.Toast.getOrCreateInstance($('reviewToast'), { delay: 5500 });
  let pending = null, timer = null;
  const fullName = (user) => [user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(' ') || 'Unnamed user';
  const initials = (user) => [user.firstName, user.lastName].map((part) => String(part || '').charAt(0)).join('').toUpperCase() || 'U';
  const status = (user) => {
    const value = String(user.status || '').trim();
    if (/^(pending approval|for[ -]review)$/i.test(value)) return ['For approval', 'pending'];
    if (/^(approved|accepted|approved\s*&\s*accepted)$/i.test(value)) return ['Approved & Accepted', 'approved'];
    if (/^inactive$/i.test(value)) return ['Inactive', 'inactive'];
    if (/^rejected$/i.test(value)) return ['Rejected', 'rejected'];
    return [value || 'Not specified', 'inactive'];
  };
  const formatDate = (value, withTime = true) => {
    if (!value) return 'Not recorded';
    // Keep a date-only birthday independent of time zone conversion.
    const date = new Date(withTime ? value : `${String(value).slice(0, 10)}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) return 'Not recorded';
    return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}), timeZone: 'Asia/Manila' }).format(date);
  };
  let loadedUser = null;
  async function fetchProfile() {
    const response = await fetch(accountUrl, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.user) throw new Error(payload.message || 'The user profile could not be loaded.');
    return payload.user;
  }
  function feedback(message, type = 'success') {
    const [title, icon] = { success: ['Success', 'bi-check-circle-fill'], warning: ['Warning', 'bi-exclamation-triangle-fill'], error: ['Error', 'bi-x-circle-fill'] }[type];
    $('reviewToast').dataset.type = type;
    $('reviewToast').setAttribute('role', type === 'error' ? 'alert' : 'status');
    $('reviewToast').setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    $('reviewToastTitle').textContent = title; $('reviewToastMessage').textContent = message;
    $('reviewToastIcon').className = `bi ${icon}`; toast.show();
  }
  function fields(container, entries) {
    $(container).replaceChildren(...entries.map(([label, value]) => {
      const row = document.createElement('div'), term = document.createElement('dt'), description = document.createElement('dd');
      term.textContent = label; description.textContent = String(value || 'Not provided');
      row.append(term, description); return row;
    }));
  }
  function accessDetails(user) {
    const container = $('profileAccess');
    const permissionLabel = (permission) => permission.split('.').map(part => part.replaceAll('_', ' ')).join(' / ');
    const entries = [
      ['User role', user.role],
      ['Role credential', user.credentialType || user.credential || 'Base role only'],
      ['Region', user.region],
      ['Office / organization', user.office],
      ['Position', user.position],
    ];
    const rows = entries.map(([label, value]) => {
      const row = document.createElement('div'), term = document.createElement('dt'), description = document.createElement('dd');
      term.textContent = label; description.textContent = String(value || 'Not provided');
      row.append(term, description); return row;
    });
    for (const [label, key, style, empty] of [
      ['Additional permissions', 'credentialPermissions', 'is-granted', 'No additional permissions'],
      ['Blocked role permissions', 'deniedCredentialPermissions', 'is-blocked', 'No role permissions are blocked'],
    ]) {
      const row = document.createElement('div'); row.className = `profile-permission-row ${style}`;
      const term = document.createElement('dt'); term.textContent = label;
      const description = document.createElement('dd'), permissions = Array.isArray(user[key]) ? user[key] : [];
      if (permissions.length) {
        const list = document.createElement('ul');
        for (const permission of permissions) {
          const item = document.createElement('li'); item.textContent = permissionLabel(permission); list.append(item);
        }
        description.append(list);
      } else {
        const note = document.createElement('span'); note.className = 'profile-permission-empty'; note.textContent = empty; description.append(note);
      }
      row.append(term, description); rows.push(row);
    }
    container.replaceChildren(...rows);
  }
  function badge(element, user) {
    const [label, style] = user.deletedAt ? ['In trash', 'rejected'] : status(user);
    $(element).textContent = label; $(element).className = `account-status ${style}`;
  }
  function unavailable(title, message) {
    $('userProfileContent').hidden = true; $('profileUnavailable').hidden = false;
    $('profileUnavailableTitle').textContent = title; $('profileUnavailableMessage').textContent = message;
  }
  async function load() {
    if (!id) { unavailable('No user selected', 'Open a user profile from the user account list.'); return; }
    try {
      const user = await fetchProfile();
      loadedUser = user;
      $('profileUnavailable').hidden = true; $('userProfileContent').hidden = false;
      $('profileName').textContent = fullName(user); $('profileAvatar').textContent = initials(user);
      const credentialName = user.credentialType || user.credential || '';
      $('profileEmail').textContent = user.email || 'No email provided'; $('profileRole').textContent = [user.role, credentialName].filter(Boolean).join(' - ') || 'Role not assigned';
      $('profileOffice').textContent = user.office || 'Office not assigned'; badge('profileStatus', user);
      $('profileUserId').textContent = user.id;
      $('profileRegistered').textContent = formatDate(user.createdAt); $('profileUpdated').textContent = formatDate(user.updatedAt);
      $('editUserProfile').href = `edit-user?id=${encodeURIComponent(user.id)}`;
      fields('profilePersonal', [['First name', user.firstName], ['Middle name', user.middleName], ['Last name', user.lastName], ['Extension', user.suffix], ['Date of birth', formatDate(user.dateOfBirth, false)], ['Work email', user.email], ['Mobile number', user.phone]]);
      accessDetails(user);
      $('profileStatusInfo').textContent = {
        pending: 'This account is waiting for an access decision. Review it from the For Approval page.',
        approved: 'This account has completed approval. Its role and organization are shown above.',
        inactive: 'This account is inactive or has no recognized access status. Use Edit profile to review its details.',
        rejected: 'The access request was rejected. The registration is retained for reference.',
      }[status(user)[1]];
      $('deleteUserProfile').disabled = !!pending;
    } catch (error) {
      loadedUser = null;
      const notFound = /not found|no query results/i.test(error.message);
      unavailable(notFound ? 'User unavailable' : 'Unable to load profile', notFound ? 'This account is no longer available.' : error.message || 'Reload the page and try again.');
      if (!notFound) feedback('The user profile could not be loaded.', 'error');
    }
  }
  $('deleteUserProfile').addEventListener('click', () => {
    try {
      const user = loadedUser;
      if (!user) { load(); feedback('This registration is no longer available.', 'warning'); return; }
      $('deleteUserName').textContent = fullName(user); $('deleteUserEmail').textContent = user.email || 'No email provided';
      $('deleteUserInitials').textContent = initials(user); badge('deleteUserStatus', user);
      fields('accountDeleteDetails', [['User ID', user.id], ['User role', user.role], ['Role credential', user.credentialType || user.credential || 'Base role only'], ['Office / organization', user.office], ['Registered date', formatDate(user.createdAt)]]);
      modal.show();
    } catch { feedback('Registration details could not be read. Try again.', 'error'); }
  });
  function clearPending() {
    clearInterval(timer); pending = null; $('approvalUndo').hidden = true; load();
  }
  $('confirmUserDelete').addEventListener('click', async () => {
    if (pending) { feedback('A deletion is already pending. Choose Undo to cancel.', 'warning'); return; }
    try {
      const user = loadedUser;
      if (!user) { modal.hide(); load(); feedback('This registration is no longer available.', 'warning'); return; }
      pending = { name: fullName(user), deadline: Date.now() + 10000 };
      modal.hide(); $('approvalUndo').hidden = false; $('deleteUserProfile').disabled = true;
      feedback('Deletion scheduled. Choose Undo within 10 seconds to keep this account.', 'warning');
      const tick = async () => {
        const seconds = Math.max(0, Math.ceil((pending.deadline - Date.now()) / 1000));
        $('approvalUndoMessage').textContent = `${pending.name} will be deleted in ${seconds} seconds.`;
        if (seconds) return;
        clearInterval(timer);
        try {
          const response = await fetch(accountUrl, {
            method: 'PATCH', credentials: 'same-origin',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '' },
            body: JSON.stringify({ action: 'delete' }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.message || 'Deletion failed. The account was kept.');
          feedback(payload.message || 'Account moved to trash.');
        } catch (error) { feedback(error.message || 'Deletion failed. The account was kept.', 'error'); }
        clearPending();
      };
      await tick(); timer = setInterval(tick, 250);
    } catch { feedback('Deletion could not be scheduled. Please try again.', 'error'); }
  });
  $('undoUserDelete').addEventListener('click', () => { if (!pending) return; clearPending(); feedback('Deletion undone. The user registration has been kept.'); });
  window.addEventListener('pagehide', () => { clearInterval(timer); pending = null; $('approvalUndo').hidden = true; });
  window.addEventListener('pageshow', (event) => { if (event.persisted) load(); });
  const header = document.querySelector('.app-header'), region = document.querySelector('.account-toast-region');
  const positionToast = () => region?.style.setProperty('--account-toast-top', `${Math.max(0, header?.getBoundingClientRect().bottom || 0)}px`);
  positionToast(); window.addEventListener('resize', positionToast); window.addEventListener('scroll', positionToast, { passive: true });
  if (header && globalThis.ResizeObserver) new ResizeObserver(positionToast).observe(header);
  load();
});
