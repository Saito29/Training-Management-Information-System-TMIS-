// Read the same tmis-users records as the administration tables. Prefer the
// connected session ID; for this prototype, resolve the displayed profile-menu
// identity to one unique registration and retain its stable ID in this tab.
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const tabs = [...document.querySelectorAll('[data-profile-tab]')];
  let events = [], activeSource = 'all', displayedUser = null;
  const formatDate = (value, birthday = false) => {
    if (!value) return 'Not available';
    const date = new Date(birthday ? `${String(value).slice(0, 10)}T00:00:00+08:00` : value);
    return Number.isNaN(date.getTime()) ? 'Not available' : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', ...(!birthday ? { timeStyle: 'short' } : {}), timeZone: 'Asia/Manila' }).format(date);
  };
  function showTab(key, focus = false) {
    if (!tabs.some(tab => tab.dataset.profileTab === key)) key = 'account';
    tabs.forEach(tab => {
      const active = tab.dataset.profileTab === key;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      $(`${tab.dataset.profileTab}-panel`).hidden = !active;
      if (active && focus) tab.focus();
    });
    if (key === 'logs') renderLogs();
    document.dispatchEvent(new CustomEvent('profile:tabchange', {detail:{key}}));
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { history.replaceState(null, '', `#${tab.dataset.profileTab}`); showTab(tab.dataset.profileTab); });
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); history.replaceState(null, '', `#${tabs[next].dataset.profileTab}`); showTab(tabs[next].dataset.profileTab, true);
    });
  });
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
  function details(container, entries) {
    $(container).replaceChildren(...entries.map(([label, value]) => {
      const row = document.createElement('div'), term = document.createElement('dt'), text = document.createElement('dd');
      term.textContent = label; text.textContent = value || 'Not provided'; row.append(term, text); return row;
    }));
  }
  function renderLogs() {
    const query = $('myLogSearch').value.trim().toLowerCase();
    const category = $('myLogCategory').value;
    const sources = [...document.querySelectorAll('[data-log-source]')];
    ['all', 'account', 'resource', 'association'].forEach(source => {
      $(`logCount-${source}`).textContent = events.filter(event => source === 'all' || event.source === source).length;
    });
    sources.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.logSource === activeSource)));
    const filtered = events.filter(event => (activeSource === 'all' || event.source === activeSource)
      && (!category || event.category === category)
      && `${event.title} ${event.detail} ${event.actor} ${event.reference} ${event.status} ${formatDate(event.date)}`.toLowerCase().includes(query));
    $('myLogBody').replaceChildren(...filtered.map(event => {
      const article = document.createElement('article'); article.className = 'self-activity-entry';
      const marker = document.createElement('span'); marker.className = `self-activity-marker ${event.category}`;
      const icon = document.createElement('i'); icon.className = `bi ${{ registration: 'bi-person-plus', profile: 'bi-person-vcard', status: 'bi-arrow-left-right', attachment: 'bi-paperclip' }[event.category] || 'bi-clock-history'}`;
      icon.setAttribute('aria-hidden', 'true'); marker.append(icon);
      const content = document.createElement('div'); content.className = 'self-activity-content';
      const top = document.createElement('div'); top.className = 'self-activity-top';
      const title = document.createElement('h3'); title.textContent = event.title;
      const badge = document.createElement('span'); badge.className = 'self-activity-badge'; badge.textContent = event.status || event.category;
      top.append(title, badge);
      const description = document.createElement('p'); description.textContent = event.detail;
      const meta = document.createElement('div'); meta.className = 'self-activity-meta';
      const actor = document.createElement('span'); actor.textContent = `By ${event.actor || 'Not recorded'}`;
      const reference = document.createElement('span'); reference.textContent = event.reference || 'No reference';
      const time = document.createElement('time'); time.dateTime = event.date; time.textContent = formatDate(event.date);
      meta.append(actor, reference, time); content.append(top, description, meta); article.append(marker, content); return article;
    }));
    $('myLogCount').textContent = `${filtered.length} of ${events.length} activities`;
    $('myLogEmpty').hidden = filtered.length > 0;
    $('myLogEmpty').textContent = events.length ? 'No activities match your search or filters.' : 'No server-recorded activity is available for your account yet.';
    $('loadMoreMyLogs').hidden = !window.TMIS_PROFILE_LOG_DATA?.hasMore;
  }
  function profileLogEntries(entries) {
    return entries.map(entry => ({
      title: String(entry.title || entry.event || 'Activity recorded'),
      detail: String(entry.description || ''),
      category: String(entry.category || 'profile'),
      date: entry.date || entry.created_at,
      actor: String(entry.actor || 'Not recorded'),
      reference: String(entry.reference || ''),
      status: String(entry.status || 'Recorded'),
      source: String(entry.source || 'account'),
    })).filter(entry => entry.date && !Number.isNaN(Date.parse(entry.date)));
  }
  function load() {
    let user = null;
    $('myProfileNotice').hidden = false;
    $('myProfileNotice').textContent = 'Your signed-in account is not connected yet. Personal details will appear here when it is available.';
    user = window.TMIS_SESSION?.source === 'database' ? window.TMIS_SESSION.user : null;
    displayedUser = user;
    $('editMyProfile').hidden = !user;
    // Backend profile transfer is retained for future integration.
    // $('exportMyAccountProfile').hidden = !user || !!window.TmisAuth?.getSession()?.authenticated;
    $('exportMyAccountProfile').hidden = true;
    const fullName = user ? [user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(' ') : 'Your account';
    $('myProfileName').textContent = fullName || 'Your account';
    $('myProfileAvatar').textContent = user ? [user.firstName, user.lastName].map(part => String(part || '').charAt(0)).join('').toUpperCase() || 'U' : 'U';
    $('myProfileEmail').textContent = user?.email || 'Account details are not connected yet.';
    $('myProfileRole').textContent = user?.role || 'Role not available';
    $('myProfileOffice').textContent = user?.office || 'Not available';
    const rawStatus = Number(user?.activeStatus) === 1 ? 'active' : 'inactive';
    const state = /^(approved|accepted|approved\s*&\s*accepted|active)$/i.test(rawStatus) ? ['Active', 'active'] : /^inactive$/i.test(rawStatus) ? ['Inactive', 'inactive'] : /^(pending approval|for[ -]review)$/i.test(rawStatus) ? ['For approval', 'pending'] : rawStatus ? [rawStatus, 'inactive'] : ['Not connected', 'inactive'];
    $('myProfileStatus').textContent = state[0]; $('myProfileStatus').className = `self-status ${state[1]}`;
    if (user) $('myProfileNotice').hidden = true;
    details('myPersonalDetails', [['First name', user?.firstName], ['Middle name', user?.middleName], ['Last name', user?.lastName], ['Extension', user?.suffix], ['Date of birth', formatDate(user?.dateOfBirth, true)], ['Work email', user?.email], ['Mobile number', user?.phone]]);
    details('myAccountDetails', [['User ID', user?.id], ['User role', user?.role], ['Region', user?.region], ['Office / organization', user?.office], ['Position', user?.position], ['Approval status', user?.status || 'Not set'], ['Active status', state[0]], ['Registered date', formatDate(user?.createdAt)], ['Last updated', formatDate(user?.updatedAt)]]);
    events = profileLogEntries(window.TMIS_PROFILE_LOG_DATA?.entries || [])
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    renderLogs();
  }
  const editableFields = ['firstName', 'middleName', 'lastName', 'suffix', 'dateOfBirth', 'email', 'phone'];
  const editForm = $('editMyProfileForm');
  let editingUserId = null;
  function closeProfileEditor() {
    editForm.hidden = true;
    $('myPersonalDetails').hidden = false;
    $('editMyProfile').hidden = false;
    editingUserId = null;
  }
  $('editMyProfile').addEventListener('click', () => {
    if (!displayedUser?.id) {
      $('editMyProfileStatus').textContent = 'Connect your account to edit your information.';
      return;
    }
    editingUserId = displayedUser.id;
    editableFields.forEach(field => { $('editProfile-' + field).value = String(displayedUser[field] || ''); });
    $('editMyProfileStatus').textContent = '';
    editForm.hidden = false;
    $('myPersonalDetails').hidden = true;
    $('editMyProfile').hidden = true;
    $('editProfile-firstName').focus();
  });
  $('cancelEditMyProfile').addEventListener('click', () => {
    closeProfileEditor();
    $('editMyProfileStatus').textContent = 'Changes cancelled.';
    $('editMyProfile').focus();
  });
  editForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!editForm.reportValidity() || !displayedUser?.id) return;
    const button = editForm.querySelector('[type="submit"]');
    button.disabled = true;
    $('editMyProfileStatus').textContent = 'Saving?';
    try {
      const changes = Object.fromEntries(editableFields.filter(field => field !== 'email').map(field => [field, $('editProfile-' + field).value.trim()]));
      const response = await fetch(editForm.action, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: JSON.stringify(changes),
      });
      if (response.redirected) throw new Error('Your session expired. Sign in again.');
      const data = await response.json();
      if (!response.ok) throw new Error(Object.values(data.errors || {}).flat().join(' ') || data.message || 'Could not save your information.');
      window.TMIS_SESSION.user = data.user;
      closeProfileEditor();
      location.reload();
    } catch (error) {
      $('editMyProfileStatus').textContent = error.message || 'Could not save your information. Try again.';
    } finally { button.disabled = false; }
  });
  const passwordForm = $('passwordChangeForm');
  const passwordRules = [
    ['length', 'At least 8 characters', value => Array.from(value).length >= 8],
    ['upper', 'One uppercase letter', value => /[A-Z]/.test(value)],
    ['lower', 'One lowercase letter', value => /[a-z]/.test(value)],
    ['special', 'One special character', value => /[^\p{L}\p{N}\s]/u.test(value)],
    ['number', 'One number', value => /[0-9]/.test(value)],
  ];
  function updatePasswordRequirements() {
    const password = $('password-new').value;
    let count = 0;
    passwordRules.forEach(([key, label, check]) => {
      const met = check(password); count += Number(met);
      $(`password-rule-${key}`).dataset.met = String(met);
      $(`password-rule-${key}`).setAttribute('aria-label', `${label}: ${met ? 'met' : 'not met'}`);
    });
    $('passwordRequirementSummary').textContent = `${count} of 5 requirements met.`;
    const confirmation = $('password-confirm').value;
    const matches = !!confirmation && confirmation === password;
    $('passwordMatchStatus').dataset.match = confirmation ? String(matches) : 'empty';
    $('passwordMatchStatus').textContent = !confirmation ? 'Re-enter your new password to confirm it.' : matches ? 'Passwords match.' : 'Passwords do not match.';
  }
  ['new', 'confirm'].forEach(key => {
    $(`password-${key}`).addEventListener('input', updatePasswordRequirements);
    $(`password-${key}`).addEventListener('change', updatePasswordRequirements);
  });
  updatePasswordRequirements();

  function clearPasswords() {
    passwordForm.reset();
    ['new', 'confirm'].forEach(key => {
      $(`password-${key}`).type = 'password';
      const toggle = $(`toggle-password-${key}`);
      toggle.setAttribute('aria-pressed', 'false');
      toggle.setAttribute('aria-label', `Show ${key === 'confirm' ? 'confirm new' : key} password`);
      toggle.firstElementChild.className = 'bi bi-eye';
    });
    $('passwordFormStatus').textContent = '';
    updatePasswordRequirements();
  }
  ['new', 'confirm'].forEach(key => {
    $(`toggle-password-${key}`).addEventListener('click', () => {
      const input = $(`password-${key}`), toggle = $(`toggle-password-${key}`);
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(visible));
      toggle.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${key === 'confirm' ? 'confirm new' : key} password`);
      toggle.firstElementChild.className = visible ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
  });
  passwordForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!window.TmisAuth?.getSession()?.authenticated) $('passwordFormStatus').textContent = 'Password updates are disabled in frontend preview mode.';
  });
  $('cancelPasswordChange').addEventListener('click', () => { clearPasswords(); $('passwordSection').open = false; });
  $('passwordSection').addEventListener('toggle', () => { if (!$('passwordSection').open) clearPasswords(); });
  window.addEventListener('pagehide', clearPasswords);
  $('exportMyAccountProfile').addEventListener('click', () => {
    if (!displayedUser) return;
    const fields = ['id','firstName','middleName','lastName','suffix','dateOfBirth','email','phone','region','office','position','createdAt','updatedAt'];
    const profile = Object.fromEntries(fields.map(field => [field, displayedUser[field] || '']));
    const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'tmis-profile-transfer.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('refreshMyProfile').addEventListener('click', () => location.reload());
  $('myLogSearch').addEventListener('input', renderLogs);
  $('myLogCategory').addEventListener('change', renderLogs);
  document.querySelectorAll('[data-log-source]').forEach(button => button.addEventListener('click', () => { activeSource = button.dataset.logSource; renderLogs(); }));
  $('loadMoreMyLogs').addEventListener('click', async () => {
    const data = window.TMIS_PROFILE_LOG_DATA;
    if (!data?.hasMore || !data.logsUrl) return;
    const button = $('loadMoreMyLogs');
    button.disabled = true;
    button.textContent = 'Loading activity...';
    try {
      const response = await fetch(`${data.logsUrl}?page=${data.page + 1}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'More server activity could not be loaded.');
      data.entries.push(...result.data);
      data.page = result.current_page;
      data.hasMore = Boolean(result.next_page_url);
      events.push(...profileLogEntries(result.data));
      renderLogs();
    } catch (error) {
      $('myLogCount').textContent = error.message || 'More server activity could not be loaded.';
    } finally {
      button.disabled = false;
      button.textContent = 'Load more activity';
    }
  });
  window.addEventListener('storage', event => { if (!event.key || ['tmis-users', 'tmis-resource-persons', 'tmis-farmer-associations'].includes(event.key)) load(); });
  load(); showTab(location.hash.slice(1));
});
