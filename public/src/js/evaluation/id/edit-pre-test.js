document.addEventListener('DOMContentLoaded', () => {
  const configs = {
    'pre-test': ['tmis-pre-test-questionnaires', 'preTestRegisterForm'],
    'post-test': ['tmis-post-test-questionnaires', 'postTestRegisterForm'],
    'training-evaluation': ['tmis-training-evaluation-questionnaires', 'trainingEvaluationForm'],
    'rp-evaluation': ['tmis-rp-evaluation-questionnaires', 'rpEvaluationForm'],
  };
  const config = configs[document.body.dataset.questionnaireType];
  if (!config) return;
  const form = document.getElementById(config[1]);
  const id = new URLSearchParams(location.search).get('id');
  if (!form) return;
  let record = null;
  try {
    const saved = JSON.parse(window.TmisStore.getItem(config[0]) || '[]');
    record = id && Array.isArray(saved) ? saved.find((item) => item?.id === id) : null;
  } catch { /* Show the same unavailable state for unreadable saved data. */ }
  if (!record) {
    form.replaceWith(Object.assign(document.createElement('div'), {
      className: 'card edit-questionnaire-unavailable',
      innerHTML: '<i class="bi bi-exclamation-circle" aria-hidden="true"></i><p>This questionnaire could not be found. Select an existing record from the list.</p><a href="../details/list-questionnaire">Back to Questionnaire List</a>',
    }));
    return;
  }
  const description = document.querySelector('.content-info');
  if (description) description.textContent = 'Update this questionnaire and save the changes to the existing record.';
  const statusBadge = document.createElement('span');
  statusBadge.className = 'questionnaire-status-badge';
  statusBadge.setAttribute('aria-label', 'Questionnaire status');
  const updateStatusBadge = () => {
    const state = String(record.status || 'Active');
    statusBadge.textContent = state;
    statusBadge.dataset.status = state.toLowerCase();
  };
  document.querySelector('.content-header')?.insertAdjacentElement('afterend', statusBadge);
  updateStatusBadge();
  document.addEventListener('questionnaire:record-saved', () => {
    try {
      const saved = JSON.parse(window.TmisStore.getItem(config[0]) || '[]');
      record = Array.isArray(saved) ? saved.find((item) => item?.id === id) || record : record;
      updateStatusBadge();
    } catch { /* Keep the last known status if storage cannot be read. */ }
  });
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const title = record.trainingQuestionnaire || record.questionnaireName || 'Untitled questionnaire';
  const submit = form.querySelector('[type="submit"]');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'btn edit-status-trigger';
  trigger.innerHTML = '<i class="bi bi-toggle-on" aria-hidden="true"></i> Update Status';
  submit?.parentElement?.insertBefore(trigger, submit);

  const dialog = document.createElement('div');
  dialog.className = 'modal fade edit-status-modal';
  dialog.id = 'editQuestionnaireStatusModal';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-labelledby', 'editStatusTitle');
  dialog.setAttribute('aria-describedby', 'editStatusDescription');
  dialog.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <div class="modal-header"><div class="edit-status-heading"><span class="edit-status-icon"><i class="bi bi-sliders" aria-hidden="true"></i></span><div><h5 class="modal-title" id="editStatusTitle">Update questionnaire status</h5><p id="editStatusDescription">Choose whether this questionnaire is available for use.</p></div></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
    <div class="modal-body"><dl class="edit-status-details"><div><dt>Questionnaire</dt><dd>${esc(title)}</dd></div><div><dt>ID</dt><dd>${esc(id)}</dd></div><div><dt>Current status</dt><dd id="editCurrentStatus"></dd></div></dl>
    <label class="form-label" for="editStatusSelect">New status</label><select class="form-select" id="editStatusSelect"><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
    <div class="edit-status-remarks" id="editStatusRemarksWrap" hidden><label class="form-label" for="editStatusRemarks">Remarks <span>(optional)</span></label><textarea class="form-control" id="editStatusRemarks" rows="3" maxlength="500" placeholder="Add a reason for marking this questionnaire inactive"></textarea></div>
    <p class="edit-status-error" id="editStatusError" role="alert" hidden></p></div>
    <div class="modal-footer"><button type="button" class="btn edit-status-cancel" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn edit-status-save" id="editStatusSave">Save status</button></div>
  </div></div>`;
  document.body.append(dialog);
  const modal = bootstrap.Modal.getOrCreateInstance(dialog);
  const select = dialog.querySelector('#editStatusSelect');
  const remarks = dialog.querySelector('#editStatusRemarks');
  const remarksWrap = dialog.querySelector('#editStatusRemarksWrap');
  const error = dialog.querySelector('#editStatusError');
  const sync = () => { remarksWrap.hidden = select.value !== 'Inactive'; };
  select.addEventListener('change', sync);
  trigger.addEventListener('click', () => {
    select.value = String(record.status || 'Active').toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
    remarks.value = record.statusRemarks || '';
    dialog.querySelector('#editCurrentStatus').textContent = record.status || 'Active';
    error.hidden = true;
    sync();
    modal.show();
  });
  const saveStatus = dialog.querySelector('#editStatusSave');
  saveStatus.addEventListener('click', async (event) => {
    event.preventDefault();
    if (saveStatus.disabled) return;
    saveStatus.disabled = true;
    error.hidden = true;
    try {
      const saved = JSON.parse(window.TmisStore.getItem(config[0]) || '[]');
      if (!Array.isArray(saved)) throw new Error('Invalid saved data');
      const index = saved.findIndex((item) => item?.id === id);
      if (index < 0) throw new Error('Questionnaire not found');
      saved[index] = { ...saved[index], status: select.value, statusRemarks: select.value === 'Inactive' ? remarks.value.trim() : '', updatedAt: new Date().toISOString() };
      await window.TmisStore.setItem(config[0], JSON.stringify(saved));
      record = saved[index];
      updateStatusBadge();
      modal.hide();
      document.documentElement.dataset.pageLoading = 'true';
      window.setTimeout(() => {
        document.documentElement.dataset.pageLoading = 'exit';
        window.setTimeout(() => { delete document.documentElement.dataset.pageLoading; }, 220);
        window.showQuestionnaireToast?.(`Questionnaire marked ${record.status.toLowerCase()}.`);
      }, 360);
    } catch {
      error.textContent = 'The status could not be saved. Please try again.';
      error.hidden = false;
      window.showQuestionnaireToast?.(error.textContent, 'error');
    } finally {
      saveStatus.disabled = false;
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('preTestRegisterForm');
  const status = document.getElementById('preTestRegisterStatus');
  if (!form || !status) return;
  const storageKey = 'tmis-pre-test-questionnaires';
  let editId = new URLSearchParams(location.search).get('id');
  if (editId) {
    try {
      const saved = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      const item = Array.isArray(saved) ? saved.find((entry) => entry.id === editId) : null;
      if (item) {
        form.elements.training_questionnaire.value = item.trainingQuestionnaire || '';
        form.elements.region.value = item.region || '';
        if (item.region) window.syncQuestionnaireOffice?.();
        form.elements.implementing_office.value = item.implementingOffice || '';
        form.elements.total_items.value = item.totalItems || '';
        form.elements.description.value = item.description || '';
      }
    } catch { status.textContent = 'The questionnaire could not be loaded.'; status.hidden = false; }
  }

  form.addEventListener('invalid', () => {
    window.showQuestionnaireToast('Complete the required fields before saving the pre-test questionnaire.', 'error');
  }, true);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const record = {
      id: editId || crypto.randomUUID(),
      trainingQuestionnaire: form.elements.training_questionnaire.value.trim(),
      implementingOffice: form.elements.implementing_office.value,
      region: form.elements.region.value,
      totalItems: Number(form.elements.total_items.value),
      description: form.elements.description.value.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!record.trainingQuestionnaire || !Number.isSafeInteger(record.totalItems) || record.totalItems < 1) {
      status.textContent = 'Enter a questionnaire name and a positive whole number of items.';
      window.showQuestionnaireToast(status.textContent, 'error');
      status.hidden = false;
      return;
    }

    try {
      const records = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      const index = editId ? records.findIndex((item) => item.id === editId) : -1;
      if (editId && index < 0) throw new Error('Questionnaire missing');
      if (index < 0) records.push(record);
      else { record.createdAt = records[index].createdAt || record.createdAt; record.status = records[index].status === 'Draft' ? 'Active' : records[index].status || 'Active'; record.statusRemarks = records[index].statusRemarks || ''; record.updatedAt = new Date().toISOString(); records[index] = record; }
      await window.TmisStore.setItem(storageKey, JSON.stringify(records));
      document.dispatchEvent(new Event('questionnaire:record-saved'));
      if (document.body.classList.contains('questionnaire-edit-page')) {
        status.textContent = 'Pre-test questionnaire updated.';
        window.showQuestionnaireToast(status.textContent);
        return;
      }
      form.reset();
      if (editId) { editId = null; history.replaceState(null, '', location.pathname); }
      status.textContent = 'Pre-test questionnaire registered.';
      window.showQuestionnaireToast(status.textContent);
    } catch {
      status.textContent = 'The questionnaire could not be saved. Please try again.';
      window.showQuestionnaireToast(status.textContent, 'error');
    }
    status.hidden = false;
  });
});

