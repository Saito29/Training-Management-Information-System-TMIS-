document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('id');
  const mode = document.body.dataset.mode;
  const byId = (value) => document.getElementById(value);
  const read = () => {
    try { const value = JSON.parse(window.TmisStore.getItem('tmis-resource-persons') || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const records = read();
  const record = records.find((item) => item.id === id);
  if (!record) { byId('recordMissing').hidden = false; if (mode === 'view') byId('editLink').hidden = true; else byId('viewLink').hidden = true; return; }
  const displayName = [
    ...(record.title === 'RAgr' ? [] : [record.title]),
    record.first_name, record.middle_name, record.last_name, record.suffix,
    ...(record.title === 'RAgr' ? ['RAgr'] : []),
  ].filter(Boolean).join(' ');
  byId('recordId').textContent = record.id;
  if (mode === 'view') {
    byId('recordName').textContent = displayName;
    byId('editLink').href = `edit-rp?id=${encodeURIComponent(id)}`;
    const sections = [
      ['Personal information', [['Professional title', record.title], ['First name', record.first_name], ['Middle name', record.middle_name], ['Last name', record.last_name], ['Suffix', record.suffix]]],
      ['Affiliation', [['Office / Designation', record.office], ['Qualification', record.qualification], ['Expertise', record.expertise]]],
      ['Contact information', [['Phone number', record.phone], ['Email address', record.email], ['Status', record.status || 'Active']]],
    ];
    sections.forEach(([heading, fields]) => {
      const section = document.createElement('section'); section.className = 'col-12';
      const title = document.createElement('h3'); title.className = 'h5 section-heading'; title.textContent = heading;
      const grid = document.createElement('div'); grid.className = 'row g-3';
      fields.forEach(([label, value]) => {
        const item = document.createElement('div'); item.className = 'col-sm-6';
        const labelNode = document.createElement('p'); labelNode.className = 'detail-label'; labelNode.textContent = label;
        const valueNode = document.createElement('p'); valueNode.className = 'detail-value'; valueNode.textContent = value || '—';
        item.append(labelNode, valueNode); grid.append(item);
      });
      section.append(title, grid); byId('recordDetails').append(section);
    });
    byId('recordContent').hidden = false;
    return;
  }
  byId('viewLink').href = `view-rp?id=${encodeURIComponent(id)}`;
  const form = byId('recordForm');
  ['title', 'first_name', 'middle_name', 'last_name', 'suffix', 'office', 'qualification', 'expertise', 'phone', 'email'].forEach((key) => { form.elements[key].value = record[key] || ''; });
  form.elements.status.value = record.status || 'Active';
  form.hidden = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const phone = form.elements.phone.value.trim(); const email = form.elements.email.value.trim();
    if (!phone && !email) { form.elements.phone.setCustomValidity('Enter a phone number or email address.'); form.elements.phone.reportValidity(); return; }
    form.elements.phone.setCustomValidity('');
    if (!form.reportValidity()) return;
    const latest = read(); const index = latest.findIndex((item) => item.id === id);
    if (index < 0) { byId('saveStatus').textContent = 'This record was deleted in another tab.'; return; }
    const update = Object.fromEntries(Object.entries(Object.fromEntries(new FormData(form))).map(([key, value]) => [key, value.trim()]));
    const previous = latest[index];
    const changed = Object.keys(update).filter(key => update[key] !== String(previous[key] || ''));
    let activityActorId = null;
    try { activityActorId = window.TMIS_SESSION?.userId || sessionStorage.getItem('tmis-current-user-id'); } catch { /* No connected actor. */ }
    const profileFields = changed.filter(key => key !== 'status');
    const fieldLabels = { title: 'professional title', first_name: 'first name', middle_name: 'middle name', last_name: 'last name', suffix: 'suffix', office: 'office', qualification: 'qualification', expertise: 'expertise', phone: 'phone number', email: 'email address' };
    const activityLogs = Array.isArray(previous.activityLogs) ? [...previous.activityLogs] : [];
    const timestamp = new Date().toISOString();
    if (profileFields.length) activityLogs.push({ category: 'profile', title: 'Profile information updated', description: `Updated ${profileFields.map(key => fieldLabels[key] || key).join(', ')}.`, actor: 'System user', actorId: activityActorId, date: timestamp, status: 'Updated', reference: previous.id, icon: 'bi-person-vcard' });
    if (changed.includes('status')) activityLogs.push({ category: 'status', title: 'Resource person status changed', description: `Status changed from ${previous.status || 'Active'} to ${update.status}.`, actor: 'System user', actorId: activityActorId, date: timestamp, status: update.status, reference: previous.id, icon: 'bi-arrow-left-right' });
    latest[index] = { ...previous, ...update, activityLogs };
    try { await window.TmisStore.setItem('tmis-resource-persons', JSON.stringify(latest)); byId('saveStatus').textContent = 'Changes saved.'; }
    catch { byId('saveStatus').textContent = 'Could not save changes. Please try again.'; }
  });
  form.elements.phone.addEventListener('input', () => form.elements.phone.setCustomValidity(''));
  form.elements.email.addEventListener('input', () => form.elements.phone.setCustomValidity(''));
});
