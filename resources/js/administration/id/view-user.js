// Profile data matches the registration payload stored in tmis-users.
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const key = 'tmis-users';
  const id = location.pathname.match(/\/id\/view\/([A-Za-z0-9:_-]+)\/?$/)?.[1]
    || new URLSearchParams(location.search).get('id');
  const modal = bootstrap.Modal.getOrCreateInstance($('accountDeleteModal'));
  const toast = bootstrap.Toast.getOrCreateInstance($('reviewToast'), { delay: 5500 });
  const canEditProfile = window.TmisStore.can('administration.edit')
    && (!window.TmisStore.can('administration.page_access') || window.TmisStore.can('administration.view.id.edit-user'));
  $('editUserProfile').hidden = !canEditProfile;
  $('deleteUserProfile').hidden = !window.TmisStore.can('administration.delete');
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
  function read() {
    const users = JSON.parse(window.TmisStore.getItem(key) || '[]');
    if (!Array.isArray(users)) throw new Error('Invalid registration data');
    return users;
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
  function badge(element, user) {
    const [label, style] = status(user); $(element).textContent = label; $(element).className = `account-status ${style}`;
  }
  function unavailable(title, message) {
    $('userProfileContent').hidden = true; $('profileUnavailable').hidden = false;
    $('profileUnavailableTitle').textContent = title; $('profileUnavailableMessage').textContent = message;
  }
  function load() {
    if (!id) { unavailable('No user selected', 'Open a user profile from the user account list.'); return; }
    try {
      const user = read().find((item) => item?.id === id);
      if (!user) { unavailable('User unavailable', 'This registration was removed or is not available in this browser.'); return; }
      $('profileUnavailable').hidden = true; $('userProfileContent').hidden = false;
      $('profileName').textContent = fullName(user); $('profileAvatar').textContent = initials(user);
      $('profileEmail').textContent = user.email || 'No email provided'; $('profileRole').textContent = user.role || 'Role not assigned';
      $('profileOffice').textContent = user.office || 'Office not assigned'; badge('profileStatus', user);
      $('profileUserId').textContent = user.id;
      $('profileRegistered').textContent = formatDate(user.createdAt); $('profileUpdated').textContent = formatDate(user.updatedAt);
      $('editUserProfile').href = `/app/admin/administration/id/edit/${encodeURIComponent(user.id)}`;
      fields('profilePersonal', [['First name', user.firstName], ['Middle name', user.middleName], ['Last name', user.lastName], ['Extension', user.suffix], ['Date of birth', formatDate(user.dateOfBirth, false)], ['Work email', user.email], ['Mobile number', user.phone]]);
      fields('profileAccess', [['User role', user.role], ['Region', user.region], ['Office / organization', user.office], ['Position', user.position]]);
      $('profileStatusInfo').textContent = {
        pending: 'This account is waiting for an access decision. Review it from the For Approval page.',
        approved: 'This account has completed approval. Its role and organization are shown above.',
        inactive: 'This account is inactive or has no recognized access status. Use Edit profile to review its details.',
        rejected: 'The access request was rejected. The registration is retained for reference.',
      }[status(user)[1]];
      $('deleteUserProfile').disabled = !!pending;
    } catch { unavailable('Unable to load profile', 'Registration data could not be read. Reload the page and try again.'); feedback('The user profile could not be loaded.', 'error'); }
  }
  $('deleteUserProfile').addEventListener('click', () => {
    try {
      const user = read().find((item) => item?.id === id);
      if (!user) { load(); feedback('This registration is no longer available.', 'warning'); return; }
      $('deleteUserName').textContent = fullName(user); $('deleteUserEmail').textContent = user.email || 'No email provided';
      $('deleteUserInitials').textContent = initials(user); badge('deleteUserStatus', user);
      fields('accountDeleteDetails', [['User ID', user.id], ['User role', user.role], ['Office / organization', user.office], ['Registered date', formatDate(user.createdAt)]]);
      modal.show();
    } catch { feedback('Registration details could not be read. Try again.', 'error'); }
  });
  function clearPending() {
    clearInterval(timer); pending = null; $('approvalUndo').hidden = true; load();
  }
  $('confirmUserDelete').addEventListener('click', async () => {
    if (pending) { feedback('A deletion is already pending. Choose Undo to cancel.', 'warning'); return; }
    try {
      const user = read().find((item) => item?.id === id);
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
          const users = read(), found = users.some((item) => item?.id === id);
          if (found) await window.TmisStore.setItem(key, JSON.stringify(users.filter((item) => item?.id !== id)));
          feedback(found ? 'User registration deleted.' : 'This registration was already removed.', found ? 'success' : 'warning');
        } catch { feedback('Deletion failed. The registration has been kept.', 'error'); }
        clearPending();
      };
      await tick(); timer = setInterval(tick, 250);
    } catch { feedback('Deletion could not be scheduled. Please try again.', 'error'); }
  });
  $('undoUserDelete').addEventListener('click', () => { if (!pending) return; clearPending(); feedback('Deletion undone. The user registration has been kept.'); });
  window.addEventListener('storage', (event) => { if (!event.key || event.key === key) load(); });
  window.addEventListener('pagehide', () => { clearInterval(timer); pending = null; $('approvalUndo').hidden = true; });
  window.addEventListener('pageshow', (event) => { if (event.persisted) load(); });
  const header = document.querySelector('.app-header'), region = document.querySelector('.account-toast-region');
  const positionToast = () => region?.style.setProperty('--account-toast-top', `${Math.max(0, header?.getBoundingClientRect().bottom || 0)}px`);
  positionToast(); window.addEventListener('resize', positionToast); window.addEventListener('scroll', positionToast, { passive: true });
  if (header && globalThis.ResizeObserver) new ResizeObserver(positionToast).observe(header);
  load();
});
