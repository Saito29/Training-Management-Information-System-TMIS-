document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('id');
  const content = document.getElementById('rpContent');
  const viewLink = document.getElementById('rpEditLink');
  if (!id || !content || content.hidden) return;

  const read = () => {
    try {
      const saved = JSON.parse(window.TmisStore.getItem('tmis-resource-persons') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  };
  const record = read().find(item => item.id === id);
  if (!record) return;
  viewLink.href = `view-rp?id=${encodeURIComponent(id)}`;

  content.innerHTML = `
    <form id="rpEditForm" class="rp-edit-form">
      <div class="rp-edit-form-header"><div><span class="rp-section-eyebrow">Editable overview</span><h2>Personal Information</h2><p>Update the resource person's profile details below.</p></div><div class="rp-edit-header-meta"><span class="rp-edit-record-id" id="rpEditRecordId"></span><span class="rp-status" id="rpEditStatusBadge" aria-label="Resource person status">Active</span><span class="rp-status" id="rpEditCustomStatusBadge" hidden aria-label="Additional status"></span><span class="rp-edit-update-status" id="rpEditUpdateStatus" data-state="saved" role="status" aria-live="polite">Up to date</span></div></div>
      <section class="rp-edit-section"><h3><i class="bi bi-person-vcard" aria-hidden="true"></i> Personal details</h3><div class="rp-edit-fields">
        <div><label for="rpEditFirst">First name <span aria-hidden="true">*</span></label><input id="rpEditFirst" name="first_name" type="text" maxlength="80" autocomplete="given-name" required /></div>
        <div><label for="rpEditMiddle">Middle name</label><input id="rpEditMiddle" name="middle_name" type="text" maxlength="80" autocomplete="additional-name" /></div>
        <div><label for="rpEditLast">Last name <span aria-hidden="true">*</span></label><input id="rpEditLast" name="last_name" type="text" maxlength="80" autocomplete="family-name" required /></div>
        <div><label for="rpEditSuffix">Suffix</label><input id="rpEditSuffix" name="suffix" type="text" maxlength="20" placeholder="e.g. Jr., III" /></div>
        <div><label for="rpEditTitle">Professional title</label><select id="rpEditTitle" name="title"><option value="">No title</option><option>Dr.</option><option>Prof.</option><option>Assoc. Prof.</option><option>Asst. Prof.</option><option>Engr.</option><option>Atty.</option><option>Arch.</option><option>Ar.</option><option>Geol.</option><option>Dent.</option><option>Vet.</option><option>RAgr</option><option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>Mx.</option><option>Rev.</option><option>Fr.</option><option>Sr.</option></select></div>
        <div><label for="rpEditStatus">Status</label><select id="rpEditStatus" name="status"><option>Active</option><option>Inactive</option></select></div>
        <div><label for="rpEditCustomStatus">Additional status</label><select id="rpEditCustomStatus" name="customStatusId"><option value="">No additional status</option></select></div>
        <div class="rp-edit-field-wide rp-edit-remarks" id="rpEditRemarksWrap" hidden><label for="rpEditRemarks">Inactive remarks <small>(optional)</small></label><textarea id="rpEditRemarks" name="status_remarks" rows="3" maxlength="500" placeholder="Add a reason or note for the inactive status"></textarea></div>
      </div></section>
      <section class="rp-edit-section"><h3><i class="bi bi-building" aria-hidden="true"></i> Affiliation and credentials</h3><div class="rp-edit-fields">
        <div><label for="rpEditOffice">Affiliated office <span aria-hidden="true">*</span></label><input id="rpEditOffice" name="office" type="text" maxlength="150" required /></div>
        <div class="rp-edit-field-wide"><span class="rp-edit-list-label" id="rpQualificationLabel">Qualifications</span><ul class="rp-edit-bullet-list" id="rpQualificationList" aria-labelledby="rpQualificationLabel"></ul><button class="rp-edit-add-item" type="button" data-add-rp-item="qualification"><i class="bi bi-plus-circle" aria-hidden="true"></i> Add qualification</button></div>
        <div class="rp-edit-field-wide"><span class="rp-edit-list-label" id="rpExpertiseLabel">Expertise</span><ul class="rp-edit-bullet-list" id="rpExpertiseList" aria-labelledby="rpExpertiseLabel"></ul><button class="rp-edit-add-item" type="button" data-add-rp-item="expertise"><i class="bi bi-plus-circle" aria-hidden="true"></i> Add expertise</button></div>
      </div></section>
      <section class="rp-edit-section"><h3><i class="bi bi-envelope" aria-hidden="true"></i> Contact information</h3><div class="rp-edit-fields">
        <div><label for="rpEditPhone">Phone number</label><input id="rpEditPhone" name="phone" type="tel" maxlength="20" autocomplete="tel" /></div>
        <div><label for="rpEditEmail">Email address</label><input id="rpEditEmail" name="email" type="email" maxlength="150" autocomplete="email" /></div>
      </div><p class="rp-edit-help">Provide at least one phone number or email address.</p></section>
      <div class="rp-edit-actions"><span id="rpEditSaveStatus" role="status" aria-live="polite"></span><button type="submit"><i class="bi bi-check2" aria-hidden="true"></i> Save changes</button></div>
    </form>`;
  const form = document.getElementById('rpEditForm');
  document.getElementById('rpEditRecordId').textContent = id;
  const customStatusSelect = form.elements.customStatusId;
  const customStatuses = Array.isArray(window.TMIS_PAGE?.recordStatuses) ? window.TMIS_PAGE.recordStatuses : [];
  const customStatusOptions = customStatuses.map(status => new Option(status.name, String(status.id)));
  if (record.customStatusId && !customStatusOptions.some(option => option.value === String(record.customStatusId))) {
    const currentStatus = new Option(record.customStatus || 'Inactive status', String(record.customStatusId));
    currentStatus.disabled = true;
    customStatusOptions.push(currentStatus);
  }
  customStatusSelect.replaceChildren(new Option('No additional status', ''), ...customStatusOptions);
  for (const key of ['first_name', 'middle_name', 'last_name', 'suffix', 'title', 'status', 'customStatusId', 'office', 'phone', 'email']) {
    form.elements[key].value = record[key] || (key === 'status' ? 'Active' : '');
  }
  const customStatusBadge = document.getElementById('rpEditCustomStatusBadge');
  customStatusBadge.textContent = record.customStatus || '';
  customStatusBadge.hidden = !record.customStatus;
  const statusBadge = document.getElementById('rpEditStatusBadge');
  const remarksWrap = document.getElementById('rpEditRemarksWrap');
  form.elements.status_remarks.value = record.status_remarks || '';
  const syncStatusBadge = () => {
    const status = form.elements.status.value;
    statusBadge.textContent = status;
    statusBadge.classList.toggle('is-inactive', status === 'Inactive');
    remarksWrap.hidden = status !== 'Inactive';
  };
  syncStatusBadge();
  form.elements.status.addEventListener('change', syncStatusBadge);
  const lists = { qualification: document.getElementById('rpQualificationList'), expertise: document.getElementById('rpExpertiseList') };
  const parts = text => String(text || '').split(/[\n;,]+/).map(item => item.trim()).filter(Boolean);
  const updateStatus = document.getElementById('rpEditUpdateStatus');
  const saveMessage = document.getElementById('rpEditSaveStatus');
  const setStatus = (state, message) => { updateStatus.dataset.state = state; updateStatus.textContent = message; };
  let syncStatus = () => {};
  const addBullet = (key, value = '') => {
    const item = document.createElement('li');
    const input = document.createElement('input'); input.type = 'text'; input.maxLength = 200;
    input.value = value; input.placeholder = key === 'qualification' ? 'Enter a qualification' : 'Enter an area of expertise';
    input.setAttribute('aria-label', key === 'qualification' ? 'Qualification item' : 'Expertise item');
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'rp-edit-remove-item';
    remove.setAttribute('aria-label', `Remove ${key} item`);
    remove.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i>';
    remove.addEventListener('click', () => { item.remove(); if (!lists[key].children.length) addBullet(key); syncStatus(); });
    item.append(input, remove); lists[key].append(item);
    return input;
  };
  for (const key of Object.keys(lists)) {
    const values = parts(record[key]);
    (values.length ? values : ['']).forEach(value => addBullet(key, value));
  }
  form.querySelectorAll('[data-add-rp-item]').forEach(button => button.addEventListener('click', () => {
    addBullet(button.dataset.addRpItem).focus(); syncStatus();
  }));
  if (record.title && !form.elements.title.value) {
    const option = document.createElement('option'); option.value = record.title; option.textContent = record.title;
    form.elements.title.append(option); form.elements.title.value = record.title;
  }
  const collect = () => {
    const data = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, String(value).trim()]));
    if (data.status !== 'Inactive') data.status_remarks = '';
    for (const key of Object.keys(lists)) data[key] = [...lists[key].querySelectorAll('input')].map(input => input.value.trim()).filter(Boolean).join('\n');
    return data;
  };
  let savedValues = { ...collect() };
  syncStatus = () => {
    const current = collect();
    const dirty = Object.keys(current).some(key => current[key] !== savedValues[key]);
    setStatus(dirty ? 'unsaved' : 'saved', dirty ? 'Unsaved changes' : 'Up to date');
    if (dirty) saveMessage.textContent = '';
  };
  form.addEventListener('input', syncStatus);
  form.addEventListener('change', syncStatus);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const phone = form.elements.phone;
    phone.setCustomValidity(phone.value.trim() || form.elements.email.value.trim() ? '' : 'Enter a phone number or email address.');
    if (!form.reportValidity()) return;
    const records = read();
    const index = records.findIndex(item => item.id === id);
    if (index < 0) { setStatus('error', 'Save failed'); saveMessage.textContent = 'This resource person was removed in another tab.'; return; }
    const previous = records[index];
    const update = collect();
    const changed = Object.keys(update).filter(key => update[key] !== (key in lists ? parts(previous[key]).join('\n') : String(previous[key] || (key === 'status' ? 'Active' : ''))));
    if (!changed.length) { savedValues = { ...update }; setStatus('saved', 'Up to date'); saveMessage.textContent = 'No changes to save.'; return; }
    setStatus('saving', 'Saving…');
    const fieldLabels = { first_name: 'first name', middle_name: 'middle name', last_name: 'last name', suffix: 'suffix', title: 'professional title', office: 'office', qualification: 'qualification', expertise: 'expertise', phone: 'phone number', email: 'email address' };
    const logs = Array.isArray(previous.activityLogs) ? [...previous.activityLogs] : [];
    const date = new Date().toISOString();
    let activityActorId = null;
    try { activityActorId = window.TMIS_SESSION?.userId || sessionStorage.getItem('tmis-current-user-id'); } catch { /* No connected actor. */ }
    const profileFields = changed.filter(key => key !== 'status' && key !== 'status_remarks');
    if (profileFields.length) logs.push({ category: 'profile', title: 'Profile information updated', description: `Updated ${profileFields.map(key => fieldLabels[key] || key).join(', ')}.`, actor: 'System user', actorId: activityActorId, date, status: 'Updated', reference: id, icon: 'bi-person-vcard' });
    if (changed.includes('status') || changed.includes('status_remarks')) {
      const statusChanged = changed.includes('status');
      const description = statusChanged ? `Status changed from ${previous.status || 'Active'} to ${update.status}.` : 'Inactive status remarks updated.';
      logs.push({ category: 'status', title: statusChanged ? 'Resource person status changed' : 'Inactive remarks updated', description: update.status === 'Inactive' && update.status_remarks ? `${description} Remarks: ${update.status_remarks}` : description, actor: 'System user', actorId: activityActorId, date, status: update.status, reference: id, icon: 'bi-arrow-left-right' });
    }
    records[index] = { ...previous, ...update, activityLogs: logs };
    try { await window.TmisStore.setItem('tmis-resource-persons', JSON.stringify(records)); savedValues = { ...update }; setStatus('saved', 'Up to date'); saveMessage.textContent = 'Changes saved. Activity Logs will update when this page is reloaded.'; }
    catch { setStatus('error', 'Save failed'); saveMessage.textContent = 'Could not save changes. Please try again.'; }
  });
  for (const key of ['phone', 'email']) form.elements[key].addEventListener('input', () => form.elements.phone.setCustomValidity(''));
});
