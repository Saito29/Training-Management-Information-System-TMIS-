document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('attachments-panel');
  if (!panel) return;
  const samplePdf = (title, lines) => {
    const content = [`BT /F1 18 Tf 50 760 Td (${title}) Tj`, ...lines.map((line, index) => `${index ? '0 -22 Td' : '0 -36 Td'} /F1 11 Tf (${line}) Tj`), 'ET'].join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], {type:'application/pdf'});
  };
  const samples = [
    {name:'GAP Training Program.pdf', type:'Training Program', year:'2025', remarks:'Sample agenda for May 22-23, 2025.', title:'GAP Training Program', lines:['May 22-23, 2025 - Tanauan City', 'Day 1: GAP principles and farm safety', 'Day 2: Field demonstration and workshop']},
    {name:'GAP Training Materials.pdf', type:'Training Materials', year:'2025', remarks:'Sample participant handout.', title:'GAP Training Materials', lines:['Good Agricultural Practices', 'Farm hygiene and record keeping', 'Safe handling and sustainable production']}
  ].map(item => { const file = samplePdf(item.title, item.lines); return {...item, file: {name:item.name, type:file.type, size:file.size}, url:URL.createObjectURL(file)}; });
  const fileSize = bytes => bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
  if (panel.hasAttribute('data-attachments-readonly')) {
    panel.innerHTML = '<section class="training-document-card training-card"><header class="training-document-header"><div class="training-document-heading"><span class="training-document-icon"><i class="bi bi-file-earmark-text"></i></span><div><h2>Attachment Documents</h2><p>Supporting documents for this training.</p></div></div></header><div class="training-document-body" id="trainingDocumentList"></div></section>';
    panel.querySelector('#trainingDocumentList').innerHTML = (window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings')?.attachments||[] : samples).map(item => `<article class="training-document-item"><span class="training-file-icon"><i class="bi bi-file-earmark-pdf"></i></span><div class="training-file-info"><strong>${window.TmisStore.escape(item.name)}</strong><span>${window.TmisStore.escape(item.type)} · ${window.TmisStore.escape(item.year)} · ${fileSize(item.file.size)}</span><small>${window.TmisStore.escape(item.remarks)}</small></div><div class="training-file-actions"><a href="${window.TmisStore.escape(item.url)}" target="_blank" rel="noopener" aria-label="View ${window.TmisStore.escape(item.name)}" title="View"><i class="bi bi-eye"></i></a><a href="${window.TmisStore.escape(item.url)}" download="${window.TmisStore.escape(item.name)}" aria-label="Download ${window.TmisStore.escape(item.name)}" title="Download"><i class="bi bi-download"></i></a></div></article>`).join('');
    return;
  }
  const library = window.TMIS_PAGE ? [...(window.TmisStore.selected('tmis-trainings')?.attachments||[])] : [...samples];
  const queue = [];
  const types = ['Training Design', 'Training Program', 'Attendance Sheet', 'Training Materials', 'Photos', 'Other Files'];
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const currentYear = new Date().getFullYear();
  let editingIndex = -1;
  panel.innerHTML = `<section class="training-document-card training-card"><header class="training-document-header"><div class="training-document-heading"><span class="training-document-icon"><i class="bi bi-file-earmark-text"></i></span><div><h2>Attachment Documents</h2><p>Manage and view supporting documents for this training.</p></div></div><button id="trainingAddAttachment" class="training-add-attachment" type="button"><i class="bi bi-plus-circle"></i> Add Attachments</button><input id="trainingAttachmentFiles" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple hidden></header><div class="training-document-body" id="trainingDocumentList" aria-live="polite"></div></section><section class="training-document-card training-card training-upload-queue"><header class="training-document-header"><div><h2>Attachment upload queue</h2><p>Review each file's type and year before adding it to the training library.</p></div></header><div class="training-document-body"><div class="table-responsive"><table class="table training-queue-table align-middle"><thead><tr><th>Preview</th><th>Type</th><th>Year</th><th>Remarks</th><th>Status</th><th>Action</th></tr></thead><tbody id="trainingQueueBody"></tbody></table></div><div class="training-queue-footer"><span id="trainingQueueSummary"></span><span id="trainingQueueFeedback" role="status"></span><button id="trainingSaveAttachments" type="button"><i class="bi bi-cloud-arrow-up"></i> Save attachments</button></div></div></section>`;
  const list = panel.querySelector('#trainingDocumentList');
  const body = panel.querySelector('#trainingQueueBody');
  const save = panel.querySelector('#trainingSaveAttachments');
  const picker = panel.querySelector('#trainingAttachmentFiles');
  const modalElement = document.createElement('div');
  modalElement.className = 'modal fade training-edit-modal';
  modalElement.id = 'trainingEditAttachmentModal';
  modalElement.tabIndex = -1;
  modalElement.setAttribute('aria-labelledby', 'trainingEditAttachmentTitle');
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form id="trainingEditAttachmentForm"><div class="modal-header"><div><small>Training documents</small><h2 class="modal-title fs-5" id="trainingEditAttachmentTitle">Edit attachment details</h2><p>Update the type, year, or remarks for this attachment.</p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"><label class="form-label" for="trainingEditType">Document type</label><select class="form-select" id="trainingEditType" required>${types.map(type => `<option>${type}</option>`).join('')}</select><label class="form-label mt-3" for="trainingEditYear">Year covered</label><select class="form-select" id="trainingEditYear" required>${Array.from({length: 6}, (_, n) => currentYear - n).map(year => `<option>${year}</option>`).join('')}</select><label class="form-label mt-3" for="trainingEditRemarks">Remarks <span class="text-muted">(optional)</span></label><textarea class="form-control" id="trainingEditRemarks" rows="4" maxlength="500" placeholder="Add a note about this attachment"></textarea></div><div class="modal-footer"><span id="trainingEditHint" class="me-auto" role="status">No changes to save.</span><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn training-edit-save" id="trainingEditSave" disabled>Save changes</button></div></form></div></div>`;
  document.body.append(modalElement);
  const editModal = bootstrap.Modal.getOrCreateInstance(modalElement);
  const editForm = modalElement.querySelector('form');
  const editType = modalElement.querySelector('#trainingEditType');
  const editYear = modalElement.querySelector('#trainingEditYear');
  const editRemarks = modalElement.querySelector('#trainingEditRemarks');
  const editSave = modalElement.querySelector('#trainingEditSave');
  const editHint = modalElement.querySelector('#trainingEditHint');
  const editValues = () => ({type: editType.value, year: editYear.value, remarks: editRemarks.value});
  function updateEditState() {
    const item = library[editingIndex];
    const values = editValues();
    const changed = item && Object.keys(values).some(key => values[key] !== item[key]);
    editSave.disabled = !changed;
    editHint.textContent = changed ? 'Changes ready to save.' : 'No changes to save.';
  }
  editForm.addEventListener('input', updateEditState);
  editForm.addEventListener('change', updateEditState);
  editForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (editSave.disabled || !library[editingIndex]) return;
    const item = library[editingIndex];
    if(window.TMIS_PAGE)await window.TmisStore.documentAction('trainings',window.TmisStore.selectedId(),item.id,'PATCH',{kind:editValues().type,year:editValues().year,remarks:editValues().remarks});
    Object.assign(item, editValues());
    document.dispatchEvent(new CustomEvent('training:attachment', {detail: {action:'updated', file:item.file.name}}));
    editModal.hide();
    render();
  });
  function render() {
    list.innerHTML = library.length ? library.map((item, index) => `<article class="training-document-item"><span class="training-file-icon"><i class="bi ${item.file.type === 'application/pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image'}"></i></span><div class="training-file-info"><strong>${escape(item.file.name)}</strong><span>${escape(item.type)} · ${window.TmisStore.escape(item.year)} · ${(item.file.size / 1048576).toFixed(2)} MB</span>${item.remarks ? `<small>${escape(item.remarks)}</small>` : ''}</div><div class="training-file-actions"><button type="button" data-action="view" data-index="${index}" aria-label="View ${escape(item.file.name)}"><i class="bi bi-eye"></i></button><button type="button" data-action="download" data-index="${index}" aria-label="Download ${escape(item.file.name)}"><i class="bi bi-download"></i></button><button type="button" data-action="remove" data-index="${index}" aria-label="Remove ${escape(item.file.name)}"><i class="bi bi-trash"></i></button></div></article>`).join('') : '<div class="training-document-empty"><i class="bi bi-file-earmark-arrow-up"></i><strong>No attachments yet</strong><p>Add images or PDFs to build this training’s document library.</p></div>';
    list.querySelectorAll('.training-file-actions').forEach((actions, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'edit';
      button.dataset.index = String(index);
      button.setAttribute('aria-label', `Edit ${library[index].file.name}`);
      button.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i>';
      actions.insertBefore(button, actions.querySelector('[data-action="remove"]'));
    });
    body.innerHTML = queue.length ? queue.map((item, index) => `<tr><td><span class="training-queue-preview"><i class="bi bi-file-earmark"></i><span title="${escape(item.file.name)}">${escape(item.file.name)}</span></span></td><td><select class="form-select" data-field="type" data-index="${index}" aria-label="Type for ${escape(item.file.name)}"><option value="">Select type</option>${types.map(type => `<option ${item.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></td><td><select class="form-select" data-field="year" data-index="${index}" aria-label="Year for ${escape(item.file.name)}">${Array.from({length: 6}, (_, n) => currentYear - n).map(year => `<option ${item.year === String(year) ? 'selected' : ''}>${year}</option>`).join('')}</select></td><td><input class="form-control" data-field="remarks" data-index="${index}" aria-label="Remarks for ${escape(item.file.name)}" maxlength="500" value="${escape(item.remarks)}" placeholder="Optional remarks"></td><td><span class="training-queue-status ${item.type ? 'ready' : ''}">${item.type ? 'Ready' : 'Incomplete'}</span></td><td><button class="training-queue-remove" type="button" data-cancel="${index}" aria-label="Remove ${escape(item.file.name)} from queue"><i class="bi bi-x-lg"></i></button></td></tr>`).join('') : '<tr class="training-queue-empty"><td colspan="6">No files are waiting to be uploaded.</td></tr>';
    panel.querySelector('#trainingQueueSummary').textContent = `${queue.length} file${queue.length === 1 ? '' : 's'} staged`;
    const readyCount = queue.filter(item => item.type && item.year).length;
    save.disabled = readyCount === 0;
    save.innerHTML = `<i class="bi bi-cloud-arrow-up"></i> Save ${readyCount} ready attachment${readyCount === 1 ? '' : 's'}`;
  }
  panel.querySelector('#trainingAddAttachment').addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => { for (const file of picker.files) queue.push({file, type:'', year:String(currentYear), remarks:''}); picker.value = ''; render(); });
  body.addEventListener('change', event => { const {field, index} = event.target.dataset; if (field && queue[index]) { queue[index][field] = event.target.value; render(); } });
  body.addEventListener('input', event => { const {field, index} = event.target.dataset; if (field === 'remarks' && queue[index]) queue[index].remarks = event.target.value; });
  body.addEventListener('click', event => { const button = event.target.closest('[data-cancel]'); if (button) { queue.splice(Number(button.dataset.cancel), 1); render(); } });
  save.addEventListener('click', async () => {
    const ready = queue.filter(item => item.type && item.year);
    if (!ready.length) return;
    for(const item of ready){const saved=window.TMIS_PAGE?await window.TmisStore.upload('trainings',window.TmisStore.selectedId(),item.file,item.type,item.year,item.remarks):{...item,url:URL.createObjectURL(item.file)};library.push(saved);}
    for (let index = queue.length - 1; index >= 0; index--) if (queue[index].type && queue[index].year) queue.splice(index, 1);
    panel.querySelector('#trainingQueueFeedback').textContent = `${ready.length} attachment${ready.length === 1 ? '' : 's'} added. Incomplete files remain in the queue.`;
    render();
  });
  list.addEventListener('click', async event => { const button = event.target.closest('[data-action]'); if (!button) return; const index = Number(button.dataset.index); const item = library[index]; if (!item) return; if (button.dataset.action === 'edit') { editingIndex = index; editType.value = item.type; editYear.value = item.year; editRemarks.value = item.remarks; updateEditState(); editModal.show(); return; } if (button.dataset.action === 'remove') { if(window.TMIS_PAGE)await window.TmisStore.documentAction('trainings',window.TmisStore.selectedId(),item.id,'DELETE');library.splice(index, 1); URL.revokeObjectURL(item.url); document.dispatchEvent(new CustomEvent('training:attachment', {detail: {action:'removed', file:item.file.name}})); render(); return; } const link = document.createElement('a'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener'; if (button.dataset.action === 'download') link.download = item.file.name; link.click(); });
  render();
});
