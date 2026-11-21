document.addEventListener('DOMContentLoaded', () => {
  const associationId = window.TmisStore.selectedId();
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
  const interventionModalElement = document.getElementById('addInterventionModal');
  const interventionModalTitle = document.getElementById('addInterventionModalLabel');
  const interventionSubmitButton = interventionForm.querySelector('[type="submit"]');
  let editingInterventionIndex = null;
  document.getElementById('interventionYear').value = String(new Date().getFullYear());
  document.getElementById('interventionTableBody').addEventListener('click', event => {
    const button = event.target.closest('[data-edit-intervention]');
    if (!button) return;
    const index = Number(button.dataset.editIntervention);
    const association = read().find(record => record.id === associationId);
    const interventions = association?.interventions ?? association?.interventionRecords ?? association?.intervention;
    const record = Array.isArray(interventions) ? interventions[index] : null;
    if (!record) {
      interventionFeedback.textContent = 'This intervention record could not be loaded. Refresh the table and try again.';
      return;
    }

    editingInterventionIndex = index;
    interventionForm.elements.title.value = record.title ?? record.interventionTitle ?? record.intervention_title ?? record.intervention ?? record.name ?? '';
    interventionForm.elements.yearCovered.value = record.yearCovered ?? record.year_covered ?? record.year ?? '';
    interventionForm.elements.action.value = record.action ?? record.deliveryAction ?? record.delivery_action ?? record.deliveryStatus ?? record.delivery_status ?? '';
    interventionForm.elements.type.value = record.type ?? record.interventionType ?? record.intervention_type ?? record.category ?? '';
    interventionForm.elements.unit.value = record.unit ?? record.unitName ?? record.unit_name ?? record.measurementUnit ?? record.measurement_unit ?? '';
    interventionForm.elements.qty.value = record.qty ?? record.quantity ?? record.quantityProvided ?? record.quantity_provided ?? '';
    interventionForm.elements.remarks.value = record.remarks ?? record.notes ?? record.note ?? record.description ?? '';

    const officeField = interventionForm.elements.office;
    const officeValue = record.office ?? record.officeName ?? record.office_name ?? record.organization ?? record.implementingOffice ?? association.office ?? association.officeName ?? '';
    const officeId = record.org_id ?? record.office_id ?? (typeof officeValue === 'number' || /^\d+$/.test(String(officeValue)) ? officeValue : '');
    officeField.value = officeId ? String(officeId) : '';
    if (!officeField.value && officeValue) {
      const matchingOption = [...officeField.options].find(option =>
        option.value === String(officeValue)
        || option.textContent.trim() === String(officeValue)
        || option.dataset.officeName === officeValue
        || `${option.dataset.officeName} — ${option.dataset.regionName}` === officeValue
      );
      if (matchingOption) officeField.value = matchingOption.value;
    }
    [officeField, interventionForm.elements.yearCovered, interventionForm.elements.action, interventionForm.elements.type]
      .forEach(field => field.dispatchEvent(new Event('change', { bubbles: true })));

    interventionModalTitle.textContent = 'Edit intervention details';
    interventionSubmitButton.innerHTML = '<i class="bi bi-check2 me-1" aria-hidden="true"></i>Save changes';
    interventionError.textContent = '';
    bootstrap.Modal.getOrCreateInstance(interventionModalElement).show();
  });
  interventionModalElement.addEventListener('hidden.bs.modal', () => {
    editingInterventionIndex = null;
    interventionForm.reset();
    document.getElementById('interventionYear').value = String(new Date().getFullYear());
    interventionModalTitle.textContent = 'Add intervention';
    interventionSubmitButton.innerHTML = '<i class="bi bi-check2 me-1" aria-hidden="true"></i>Save intervention';
    interventionError.textContent = '';
  });
  interventionForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!interventionForm.reportValidity()) return;
    const records = read();
    const index = findRecord(records);
    if (index < 0) { interventionError.textContent = 'Association record not found.'; return; }
    const entry = Object.fromEntries(new FormData(interventionForm));
    const officeOption = interventionForm.elements.office.selectedOptions[0];
    const officeName = officeOption?.dataset.officeName || officeOption?.textContent.trim() || officeOption?.value || '';
    const associationRegion = records[index].region || records[index].regionName || '';
    const officeRegion = officeOption?.dataset.regionName || associationRegion;
    entry.office = officeName && officeRegion && !officeName.includes(officeRegion)
      ? `${officeName} — ${officeRegion}`
      : officeName;
    if (/^\d+$/.test(String(officeOption?.value || ''))) entry.office_id = officeOption.value;
    else delete entry.office_id;
    Object.keys(entry).forEach(key => { entry[key] = entry[key].trim(); });
    const savedInterventions = records[index].interventions ?? records[index].interventionRecords ?? records[index].intervention;
    const interventions = Array.isArray(savedInterventions) ? [...savedInterventions] : [];
    if (editingInterventionIndex === null) {
      interventions.push(entry);
    } else if (interventions[editingInterventionIndex]) {
      interventions[editingInterventionIndex] = { ...interventions[editingInterventionIndex], ...entry };
    } else {
      interventionError.textContent = 'This intervention record is no longer available. Refresh the table and try again.';
      return;
    }
    records[index].interventions = interventions;
    try {
      await window.TmisStore.setItem(storageKey, JSON.stringify(records));
      interventionError.textContent = '';
      interventionFeedback.textContent = editingInterventionIndex === null
        ? 'Intervention saved to this association.'
        : 'Intervention details updated for this association.';
      interventionForm.reset();
      document.getElementById('interventionYear').value = String(new Date().getFullYear());
      bootstrap.Modal.getOrCreateInstance(interventionModalElement).hide();
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
  const configuredTypes = window.TMIS_PAGE?.attachmentTypes?.farmer_association;
  const types = Array.isArray(configuredTypes) && configuredTypes.length
    ? configuredTypes
    : ['Association Document', 'Registration Certificate', 'Membership List', 'Other File', 'Other'];
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
      types.forEach(value => type.add(new Option(value, value)));
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
        type: types[0],
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
