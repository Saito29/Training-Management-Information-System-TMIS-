// Original account form uses the authenticated database adapter and server authorization.
document.addEventListener('DOMContentLoaded', () => {
  const storageKey = 'tmis-users';
  const form = document.getElementById('userForm');
  const mode = document.body.dataset.mode;
  const id = new URLSearchParams(location.search).get('id');
  const error = document.getElementById('userError');
  const success = document.getElementById('userSuccess');
  const fields = ['firstName', 'middleName', 'lastName', 'suffix', 'dateOfBirth', 'email', 'phone', 'role', 'region', 'office', 'position', 'status'];
  const officeTypes = ['DA Regional Field Office', 'DA-SAAD', 'DA-AMIA', 'DA-Livestock', 'DA-HVCDP', 'DA-Rice Program', 'DA-Corn Program', 'DA-ATI'];
  const statusLabel = (value) => /^(pending approval|for[ -]review)$/i.test(value) ? 'For Review'
    : /^(approved|accepted|approved\s*&\s*accepted)$/i.test(value) ? 'Approved & Accepted' : value;
  const dateLabel = (value) => {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila',  dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—';
  };
  const readUsers = () => {
    const users = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
    if (!Array.isArray(users)) throw new Error('Invalid registration data');
    return users;
  };
  const syncOffices = (selected = '') => {
    const select = form.elements.office;
    select.replaceChildren(new Option(form.elements.region.value ? 'Select an office or organization' : 'Select a region first', ''));
    if (form.elements.region.value) {
      [...new Set([...officeTypes, selected].filter(Boolean))].forEach((office) => select.add(new Option(office, office)));
    }
    select.value = selected;
    select.disabled = mode === 'view' || !form.elements.region.value;
  };
  const render = (user) => {
    fields.forEach((field) => { form.elements[field].value = user[field] || ''; });
    form.elements.status.value = /^(approved|accepted|approved\s*&\s*accepted)$/i.test(user.status || '')
      ? 'Approved & Accepted' : /^(pending approval|for[ -]review)$/i.test(user.status || '') ? 'Pending approval' : user.status || '';
    syncOffices(user.office || '');
    const name = [user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(' ');
    document.getElementById('userName').textContent = name || 'Unnamed user';
    document.getElementById('userId').textContent = user.id;
    document.getElementById('userAvatar').textContent = `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase();
    const badge = document.getElementById('recordStatus');
    badge.dataset.status = statusLabel(user.status || '');
    badge.textContent = statusLabel(user.status || '');
    document.getElementById('createdAt').value = dateLabel(user.createdAt);
    document.getElementById('updatedAt').value = dateLabel(user.updatedAt);
    document.getElementById('pageIntro').textContent = mode === 'view'
      ? 'View the complete registration record.' : 'Update this user’s registration details.';
    form.hidden = false;
  };
  try {
    if (!id) throw new Error('No user ID was provided. Open a user from the All Status list.');
    const user = readUsers().find((item) => item?.id === id);
    if (!user) throw new Error('This user could not be found in this browser.');
    render(user);
  } catch (cause) {
    error.textContent = cause.message || 'The user record could not be loaded.';
    error.hidden = false;
  }
  if (mode === 'view') {
    form.querySelectorAll('input, select').forEach((control) => { control.disabled = true; });
    document.getElementById('saveUser').hidden = true;
    return;
  }
  form.elements.dateOfBirth.max = new Date().toLocaleDateString('en-CA');
  form.elements.region.addEventListener('change', () => syncOffices());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    success.hidden = true;
    if (!form.reportValidity()) return;
    try {
      const users = readUsers();
      const user = users.find((item) => item?.id === id);
      if (!user) throw new Error('This user is no longer available.');
      const email = form.elements.email.value.trim().toLowerCase();
      if (users.some((item) => item.id !== id && String(item.email || '').toLowerCase() === email)) {
        throw new Error('This email is already registered to another user.');
      }
      fields.forEach((field) => { user[field] = form.elements[field].value.trim(); });
      user.email = email;
      user.updatedAt = new Date().toISOString();
      await window.TmisStore.setItem(storageKey, JSON.stringify(users));
      render(user);
      success.textContent = 'User details saved to the database.';
      success.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (cause) {
      error.textContent = cause.message || 'The user could not be saved.';
      error.hidden = false;
    }
  });
});
