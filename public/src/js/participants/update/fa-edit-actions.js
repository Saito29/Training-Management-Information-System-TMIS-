document.addEventListener('DOMContentLoaded', () => {
  const associationId = new URLSearchParams(location.search).get('faId');
  const storageKey = 'tmis-farmer-associations';
  const read = () => {
    try { const records = JSON.parse(window.TmisStore.getItem(storageKey) || '[]'); return Array.isArray(records) ? records : []; }
    catch { return []; }
  };
  const notify = () => window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
  const findRecord = records => records.findIndex(record => record.id === associationId);

  const interventionForm = document.getElementById('addInterventionForm');
  const interventionError = document.getElementById('interventionFormError');
  const interventionFeedback = document.getElementById('interventionFeedback');
  document.getElementById('interventionYear').value = String(new Date().getFullYear());
  interventionForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!interventionForm.reportValidity()) return;
    const records = read();
    const index = findRecord(records);
    if (index < 0) { interventionError.textContent = 'Association record not found.'; return; }
    const entry = Object.fromEntries(new FormData(interventionForm));
    Object.keys(entry).forEach(key => { entry[key] = entry[key].trim(); });
    records[index].interventions = [...(Array.isArray(records[index].interventions) ? records[index].interventions : []), entry];
    try {
      await window.TmisStore.setItem(storageKey, JSON.stringify(records));
      interventionError.textContent = '';
      interventionFeedback.textContent = 'Intervention saved to this association.';
      interventionForm.reset();
      document.getElementById('interventionYear').value = String(new Date().getFullYear());
      bootstrap.Modal.getOrCreateInstance(document.getElementById('addInterventionModal')).hide();
      notify();
    } catch { interventionError.textContent = 'Could not save the intervention in this browser.'; }
  });

  const uploadForm = document.getElementById('addAttachmentForm');
  const fileInput = document.getElementById('attachmentFiles');
  const uploadError = document.getElementById('uploadAttachmentFeedback');
  const queueBody = document.getElementById('attachmentQueueBody');
  const queueSummary = document.getElementById('attachmentQueueSummary');
  const queueFeedback = document.getElementById('attachmentFeedback');
  const saveButton = document.getElementById('saveStagedAttachments');
  const staged = [];
  const acceptedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  const readFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
  function renderQueue() {
    queueBody.replaceChildren();
    if (!staged.length) {
      const row = document.createElement('tr');
      row.className = 'attachment-queue-empty';
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = 'No files are waiting to be uploaded.';
      row.append(cell);
      queueBody.append(row);
    }
    staged.forEach((item, index) => {
      const row = document.createElement('tr');
      const preview = document.createElement('td');
      preview.textContent = item.name;
      const typeCell = document.createElement('td');
      const type = document.createElement('select');
      type.className = 'form-select form-select-sm';
      ['Association Document', 'Registration Certificate', 'Membership List', 'Other File'].forEach(value => type.add(new Option(value, value)));
      type.value = item.type;
      type.addEventListener('change', () => { item.type = type.value; });
      typeCell.append(type);
      const yearCell = document.createElement('td');
      const year = document.createElement('select');
      year.className = 'form-select form-select-sm';
      for (let value = new Date().getFullYear() + 1; value >= 2000; value--) year.add(new Option(String(value), String(value)));
      year.value = item.year;
      year.addEventListener('change', () => { item.year = year.value; });
      yearCell.append(year);
      const remarksCell = document.createElement('td');
      const remarks = document.createElement('input');
      remarks.className = 'form-control form-control-sm';
      remarks.type = 'text';
      remarks.maxLength = 200;
      remarks.placeholder = 'Optional remarks';
      remarks.value = item.remarks;
      remarks.addEventListener('input', () => { item.remarks = remarks.value; });
      remarksCell.append(remarks);
      const statusCell = document.createElement('td');
      statusCell.textContent = 'Ready';
      const actionCell = document.createElement('td');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-sm btn-outline-danger';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => { staged.splice(index, 1); renderQueue(); });
      actionCell.append(remove);
      row.append(preview, typeCell, yearCell, remarksCell, statusCell, actionCell);
      queueBody.append(row);
    });
    queueSummary.textContent = `${staged.length} file${staged.length === 1 ? '' : 's'} staged`;
    saveButton.disabled = staged.length === 0;
  }
  uploadForm.addEventListener('submit', async event => {
    event.preventDefault();
    const files = [...fileInput.files];
    if (!files.length) { uploadError.textContent = 'Choose at least one file.'; return; }
    const invalid = files.find(file => !acceptedTypes.has(file.type) || file.size > 1024 * 1024);
    if (invalid) { uploadError.textContent = 'Choose PDF, JPG, or PNG files up to 1 MB each.'; return; }
    try {
      const items = await Promise.all(files.map(async file => ({
        name: file.name,
        file,
        type: 'Association Document',
        year: String(new Date().getFullYear()),
        remarks: '',
        dataUrl: await readFile(file),
      })));
      staged.push(...items);
      renderQueue();
      uploadError.textContent = '';
      queueFeedback.textContent = `${items.length} file${items.length === 1 ? '' : 's'} staged. Review the queue before saving.`;
      uploadForm.reset();
      bootstrap.Modal.getOrCreateInstance(document.getElementById('addDocumentModal')).hide();
    } catch (error) { uploadError.textContent = error.message || 'Could not read the selected files.'; }
  });
  saveButton.addEventListener('click', async () => {
    if (!staged.length) return;
    const records = read();
    const index = findRecord(records);
    if (index < 0) { queueFeedback.textContent = 'Association record not found.'; return; }
    const existing = Array.isArray(records[index].documents) ? records[index].documents : [];
    records[index].documents = [...existing, ...staged.map(item => ({ ...item, addedAt: new Date().toISOString() }))];
    try {
      for(const item of staged) await window.TmisStore.upload('associations',associationId,item.file,item.type,item.year,item.remarks);
      const count = staged.length;
      staged.length = 0;
      renderQueue();
      queueFeedback.textContent = `${count} document${count === 1 ? '' : 's'} saved to this association.`;
      notify();
    } catch { queueFeedback.textContent = 'Could not save documents. Browser storage may be full; try fewer or smaller files.'; }
  });
  renderQueue();
});
