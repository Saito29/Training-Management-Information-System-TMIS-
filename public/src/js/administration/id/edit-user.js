// Profile data matches the registration payload stored in tmis-users.
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const key = 'tmis-users';
  const form = $('userUpdateForm');
  const editableFields = ['firstName', 'middleName', 'lastName', 'suffix', 'dateOfBirth', 'email', 'phone', 'role', 'region', 'office', 'position', 'status'];
  const officeTypes = ['DA Regional Field Office', 'DA-SAAD', 'DA-AMIA', 'DA-Livestock', 'DA-HVCDP', 'DA-Rice Program', 'DA-Corn Program', 'DA-ATI'];
  let loadedSnapshot = null;
  form.elements.dateOfBirth.max = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  function syncRemarks() {
    const inactive = form.elements.status.value === 'Inactive';
    $('inactiveRemarksField').hidden = !inactive;
    form.elements.remarks.disabled = !inactive;
  }
  function syncOffices(selected = '') {
    const office = form.elements.office;
    office.replaceChildren(new Option(form.elements.region.value ? 'Select an office or organization' : 'Select a region first', ''));
    office.disabled = !form.elements.region.value;
    if (form.elements.region.value) [...new Set([...officeTypes, selected].filter(Boolean))].forEach((value) => office.add(new Option(value, value)));
    office.value = selected;
  }
  const id = new URLSearchParams(location.search).get('id');
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
      $('editUserProfile').href = `view-user?id=${encodeURIComponent(user.id)}`;
      editableFields.forEach((field) => { if (field !== 'office') form.elements[field].value = user[field] || ''; });
      form.elements.status.value = /^(approved|accepted|approved\s*&\s*accepted)$/i.test(user.status || '') ? 'Approved & Accepted' : /^inactive$/i.test(user.status || '') ? 'Inactive' : '';
      syncOffices(user.office || '');
      form.elements.remarks.value = user.status === 'Inactive' ? String(user.remarks || '') : '';
      syncRemarks();
      loadedSnapshot = JSON.stringify(user);
      $('profileStatusInfo').textContent = {
        pending: 'This account is waiting for an access decision. Review it from the For Approval page.',
        approved: 'This account has completed approval. Its role and organization are shown above.',
        inactive: 'This account is inactive or has no recognized access status. Use Edit profile to review its details.',
        rejected: 'The access request was rejected. The registration is retained for reference.',
      }[status(user)[1]];
      $('deleteUserProfile').disabled = !!pending;
    } catch { unavailable('Unable to load profile', 'Registration data could not be read. Reload the page and try again.'); feedback('The user profile could not be loaded.', 'error'); }
  }
  form.elements.status.addEventListener('change', syncRemarks);
  form.elements.region.addEventListener('change', () => syncOffices());
  $('resetUserUpdate').addEventListener('click', () => { load(); feedback('Changes reset to the saved registration.'); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) { feedback('Undo the pending deletion before updating this account.', 'warning'); return; }
    if (!form.reportValidity()) return;
    try {
      const users = read(), user = users.find((item) => item?.id === id);
      if (!user) { load(); feedback('This registration is no longer available.', 'warning'); return; }
      if (JSON.stringify(user) !== loadedSnapshot) { feedback('This account changed in another tab. Reset changes to load the latest details before saving.', 'warning'); return; }
      const updates = Object.fromEntries(editableFields.map((field) => [field, form.elements[field].value.trim()]));
      updates.email = updates.email.toLowerCase();
      updates.remarks = updates.status === 'Inactive' ? form.elements.remarks.value.trim() : '';
      if (!updates.firstName || !updates.lastName || !updates.dateOfBirth || !updates.email || !updates.region || !updates.office) { feedback('Complete all required registration fields.', 'warning'); return; }
      if (!['System Administrator', 'Data Encoder', 'Program Administrator', 'Program Head'].includes(updates.role)
        || !['Approved & Accepted', 'Inactive'].includes(updates.status)) { feedback('Select a valid role and account status.', 'warning'); return; }
      if (users.some((item) => item?.id !== id && String(item?.email || '').toLowerCase() === updates.email)) { feedback('This work email is already registered to another user.', 'warning'); form.elements.email.focus(); return; }
      const changed = Object.keys(updates).filter(field => String(user[field] || '') !== updates[field]);
      const timestamp = new Date().toISOString();
      const activityLogs = Array.isArray(user.activityLogs) ? [...user.activityLogs] : [];
      let actorId = null;
      try { actorId = window.TMIS_SESSION?.userId || sessionStorage.getItem('tmis-current-user-id'); } catch { /* Actor remains unspecified. */ }
      const actorUser = users.find(item => item?.id === actorId);
      const actor = actorUser ? [actorUser.firstName, actorUser.middleName, actorUser.lastName, actorUser.suffix].filter(Boolean).join(' ') : 'System user';
      const base = { actor, actorId, date: timestamp, reference: user.id };
      const profileChanges = changed.filter(field => field !== 'status' && field !== 'remarks');
      if (profileChanges.length) activityLogs.push({ ...base, category: 'profile', title: 'User profile updated', description: `Updated ${profileChanges.map(field => ({ firstName: 'first name', middleName: 'middle name', lastName: 'last name', dateOfBirth: 'date of birth', suffix: 'extension' }[field] || field)).join(', ')}.`, status: 'Updated' });
      if (changed.includes('status') || changed.includes('remarks')) activityLogs.push({ ...base, category: 'status', title: changed.includes('status') ? 'Account status updated' : 'Inactive remarks updated', description: changed.includes('status') ? `Account status changed from ${user.status || 'Not specified'} to ${updates.status}.` : 'The optional inactive account remarks were updated.', status: updates.status });
      Object.assign(user, updates, { updatedAt: timestamp, activityLogs });
      await window.TmisStore.setItem(key, JSON.stringify(users));
      load(); feedback('User registration updated successfully.');
      $('updateUserHint').textContent = 'Changes saved. The last updated date has been refreshed.';
    } catch { feedback('Changes could not be saved. Please try again.', 'error'); }
  });
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
  window.addEventListener('storage', (event) => { if (!event.key || event.key === key) feedback('User data changed in another tab. Reset changes to load the latest registration.', 'warning'); });
  window.addEventListener('pagehide', () => { clearInterval(timer); pending = null; $('approvalUndo').hidden = true; });
  window.addEventListener('pageshow', (event) => { if (event.persisted) load(); });
  const header = document.querySelector('.app-header'), region = document.querySelector('.account-toast-region');
  const positionToast = () => region?.style.setProperty('--account-toast-top', `${Math.max(0, header?.getBoundingClientRect().bottom || 0)}px`);
  positionToast(); window.addEventListener('resize', positionToast); window.addEventListener('scroll', positionToast, { passive: true });
  if (header && globalThis.ResizeObserver) new ResizeObserver(positionToast).observe(header);
  load();
});
