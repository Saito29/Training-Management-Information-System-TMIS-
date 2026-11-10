document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('attachments-panel');
  if (!panel) return;
  const base = '../../../../assets/training/sample-attachments/';
  const attachments = (window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings')?.attachments || [] : [
    {name:'file.pdf', type:'Training Materials', year:'2025', url:base + 'file.pdf', pdf:true},
    {name:'training-highlight-1.png', type:'Photos', year:'2025', url:base + 'training-highlight-1.png'},
    {name:'training-highlight-2.png', type:'Photos', year:'2025', url:base + 'training-highlight-2.png'},
    {name:'gendrano-jennel.jpg', type:'Photos', year:'2025', url:base + 'gendrano-jennel.jpg'}
  ]);
  let first = 0;
  let active = 0;
  let editing = -1;
  const pendingDeletes = [];
  let deleteTimer = null;
  let deleteDeadline = 0;
  const queue = [];
  const types = ['Training Design', 'Training Program', 'Attendance Sheet', 'Training Materials', 'Photos', 'Other Files'];
  const fire = (action, item) => document.dispatchEvent(new CustomEvent('training:attachment', {detail:{action, file:item.name}}));
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fileType = item => item.pdf ? 'PDF' : /\.png$/i.test(item.name) ? 'PNG' : 'JPG';
  const visibleCount = () => window.innerWidth < 576 ? 1 : window.innerWidth < 768 ? 2 : window.innerWidth < 992 ? 3 : 4;

  panel.innerHTML = `<section class="training-documents-card training-card"><header class="training-documents-header"><div class="training-documents-heading"><span class="training-documents-icon"><i class="bi bi-file-earmark-text"></i></span><div><h2>Attachment Documents</h2><p>View and manage supporting documents for this training.</p></div></div><button class="training-documents-add" type="button" id="trainingAddAttachment"><i class="bi bi-plus-circle"></i> Add Attachments</button></header><div class="training-documents-body"><div id="trainingAttachmentCards" class="training-attachment-carousel" aria-live="polite"></div></div></section><section class="training-attachment-queue training-card"><header><h2>Attachment upload queue</h2><p>Choose a document type and year for each file before saving it.</p></header><div class="training-attachment-queue-body"><div class="table-responsive"><table class="table training-queue-table align-middle"><thead><tr><th scope="col">Preview</th><th scope="col">File type</th><th scope="col">Document type</th><th scope="col">Year</th><th scope="col">Remarks</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody id="trainingQueueBody"></tbody></table></div><div class="training-queue-footer"><span id="trainingQueueSummary"></span><span id="trainingQueueFeedback" role="status" aria-live="polite"></span><button id="trainingSaveAttachments" type="button" disabled><i class="bi bi-cloud-arrow-up"></i> Save attachments</button></div></div></section>`;
  const cards = panel.querySelector('#trainingAttachmentCards');
  const queueBody = panel.querySelector('#trainingQueueBody');
  const queueSave = panel.querySelector('#trainingSaveAttachments');
  const uploadElement = document.getElementById('addDocumentModal');
  const uploadModal = bootstrap.Modal.getOrCreateInstance(uploadElement);
  const uploadForm = uploadElement.querySelector('#addAttachmentForm');
  const uploadFiles = uploadElement.querySelector('#attachmentFiles');
  const uploadFeedback = uploadElement.querySelector('#uploadAttachmentFeedback');
  const deleteNotice = document.getElementById('attachmentDeleteNotice');
  const deleteMessage = document.getElementById('attachmentDeleteMessage');
  const deleteCountdown = document.getElementById('attachmentDeleteCountdown');
  const undoDelete = document.getElementById('cancelAttachmentDelete');
  const confirmDelete = document.getElementById('confirmAttachmentDelete');
  async function finishDeletes() {
    clearInterval(deleteTimer);
    deleteTimer = null;
    deleteNotice.hidden = true;
    const pending=pendingDeletes.splice(0);
    for (const {item,index} of pending) {
      try {await window.TmisStore.documentAction('trainings',window.TmisStore.selectedId(),item.id,'DELETE');}
      catch(error){attachments.splice(index,0,item);panel.querySelector('#trainingQueueFeedback').textContent=error.message;render();continue;}

      if (item.temporary) URL.revokeObjectURL(item.url);
      fire('removed', item);
    }
  }
  function updateDeleteCountdown() {
    const seconds = Math.max(0, Math.ceil((deleteDeadline - Date.now()) / 1000));
    deleteCountdown.textContent = String(seconds);
    if (seconds === 0) finishDeletes();
  }
  function scheduleDelete(item, index) {
    pendingDeletes.push({item, index});
    deleteMessage.textContent = pendingDeletes.length === 1
      ? `${item.name} will be deleted in`
      : `${pendingDeletes.length} attachments will be deleted in`;
    deleteDeadline = Date.now() + 10000;
    deleteNotice.hidden = false;
    updateDeleteCountdown();
    clearInterval(deleteTimer);
    deleteTimer = setInterval(updateDeleteCountdown, 250);
  }
  undoDelete.addEventListener('click', () => {
    clearInterval(deleteTimer);
    deleteTimer = null;
    pendingDeletes.splice(0).reverse().forEach(({item, index}) => attachments.splice(index, 0, item));
    deleteNotice.hidden = true;
    render();
  });
  confirmDelete.addEventListener('click', finishDeletes);
  const modal = document.createElement('div');
  modal.className = 'modal fade training-document-viewer';
  modal.tabIndex = -1;
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = '<div class="modal-dialog modal-fullscreen"><div class="modal-content"><div class="modal-header"><div><h2 class="modal-title fs-5" id="trainingDocumentViewerTitle"></h2><small id="trainingDocumentViewerMeta"></small></div><div class="training-document-viewer-actions"><button type="button" class="btn btn-light btn-sm" data-viewer="previous" aria-label="Previous attachment"><i class="bi bi-chevron-left"></i></button><button type="button" class="btn btn-light btn-sm" data-viewer="next" aria-label="Next attachment"><i class="bi bi-chevron-right"></i></button><a class="btn btn-light btn-sm" id="trainingDocumentViewerDownload" download><i class="bi bi-download"></i> Download</a><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div></div><div class="modal-body" id="trainingDocumentViewerBody"></div></div></div>';
  document.body.append(modal);
  const viewer = bootstrap.Modal.getOrCreateInstance(modal);
  const editElement = document.getElementById('editAttachmentModal');
  const editModal = bootstrap.Modal.getOrCreateInstance(editElement);
  const editForm = editElement.querySelector('#editAttachmentForm');
  const editType = editElement.querySelector('#editAttachmentType');
  const editYear = editElement.querySelector('#editAttachmentYear');
  const editRemarks = editElement.querySelector('#editAttachmentRemarks');
  const editSave = editElement.querySelector('#saveAttachmentChanges');
  const editHint = editElement.querySelector('#editAttachmentChangeHint');
  const editHintText = editElement.querySelector('#editAttachmentChangeText');
  const years = Array.from({length:8}, (_, index) => String(new Date().getFullYear() + 1 - index));
  editYear.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
  function updateEditState() {
    const item = attachments[editing];
    const dirty = item && (editType.value !== item.type || editYear.value !== item.year || editRemarks.value.trim() !== (item.remarks || ''));
    editSave.disabled = !dirty;
    editHint.classList.toggle('is-dirty', Boolean(dirty));
    editHintText.textContent = dirty ? 'Changes ready to save.' : 'No changes to save.';
  }
  editForm.addEventListener('input', updateEditState);
  editForm.addEventListener('change', updateEditState);
  editForm.addEventListener('submit', async event => {
    event.preventDefault();
    const item = attachments[editing];
    if (!item || editSave.disabled) return;
    try {await window.TmisStore.documentAction('trainings',window.TmisStore.selectedId(),item.id,'PATCH',{kind:editType.value,year:editYear.value,remarks:editRemarks.value.trim()});}
    catch(error){editHintText.textContent=error.message;return;}
    item.type = editType.value;
    item.year = editYear.value;
    item.remarks = editRemarks.value.trim();
    fire('updated', item);
    editModal.hide();
    render();
  });
  panel.querySelector('#trainingAddAttachment').addEventListener('click', () => { uploadFeedback.textContent = ''; uploadModal.show(); });
  uploadForm.addEventListener('submit', event => {
    event.preventDefault();
    const files = [...uploadFiles.files];
    if (!files.length) { uploadFeedback.textContent = 'Choose at least one file.'; return; }
    const allowed = files.filter(file => ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type));
    if (allowed.length !== files.length) { uploadFeedback.textContent = 'Only PDF, JPG, and PNG files are supported.'; return; }
    allowed.forEach(file => queue.push({file, type:'', year:String(new Date().getFullYear()), remarks:''}));
    uploadFiles.value = '';
    uploadFeedback.textContent = '';
    uploadModal.hide();
    renderQueue();
  });

  function renderQueue() {
    queueBody.innerHTML = queue.length ? queue.map((item, index) => `<tr><td><span class="training-queue-preview"><i class="bi ${item.file.type === 'application/pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image'}"></i><span title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span></span></td><td>${item.file.type === 'application/pdf' ? 'PDF' : item.file.type === 'image/png' ? 'PNG' : 'JPG'}</td><td><select class="form-select" data-field="type" data-index="${index}" aria-label="Document type for ${escapeHtml(item.file.name)}"><option value="">Select type</option>${types.map(type => `<option value="${type}" ${item.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></td><td><select class="form-select" data-field="year" data-index="${index}" aria-label="Year for ${escapeHtml(item.file.name)}">${years.map(year => `<option value="${year}" ${item.year === year ? 'selected' : ''}>${year}</option>`).join('')}</select></td><td><input class="form-control" data-field="remarks" data-index="${index}" maxlength="500" value="${escapeHtml(item.remarks)}" aria-label="Remarks for ${escapeHtml(item.file.name)}" placeholder="Optional remarks"></td><td><span class="training-queue-status ${item.type ? 'ready' : ''}">${item.type ? 'Ready' : 'Select type'}</span></td><td><button class="training-queue-remove" type="button" data-remove="${index}" aria-label="Remove ${escapeHtml(item.file.name)} from queue"><i class="bi bi-x-lg"></i></button></td></tr>`).join('') : '<tr class="training-queue-empty"><td colspan="7">No files are waiting to be uploaded.</td></tr>';
    const ready = queue.filter(item => item.type && item.year).length;
    panel.querySelector('#trainingQueueSummary').textContent = `${queue.length} file${queue.length === 1 ? '' : 's'} staged · ${ready} ready to save`;
    queueSave.disabled = ready === 0;
    queueSave.innerHTML = `<i class="bi bi-cloud-arrow-up"></i> Save ${ready} attachment${ready === 1 ? '' : 's'}`;
  }
  queueBody.addEventListener('change', event => {
    const {field, index} = event.target.dataset;
    if (queue[index] && (field === 'type' || field === 'year')) { queue[index][field] = event.target.value; renderQueue(); }
  });
  queueBody.addEventListener('input', event => {
    const {field, index} = event.target.dataset;
    if (field === 'remarks' && queue[index]) queue[index].remarks = event.target.value;
  });
  queueBody.addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (button) { queue.splice(Number(button.dataset.remove), 1); renderQueue(); }
  });
  queueSave.addEventListener('click', async () => {
    const ready = queue.filter(item => item.type && item.year);
    try {
      const training=window.TmisStore.selected('tmis-trainings');
      if(!training) throw new Error('Open a saved training first.');
      for(const item of ready) {
        const attachment=await window.TmisStore.upload('trainings',training.id,item.file,item.type,item.year,item.remarks);
        attachments.push(attachment); fire('added',attachment);
      }
    } catch(error) {panel.querySelector('#trainingQueueFeedback').textContent=error.message;return;}
    for (let index = queue.length - 1; index >= 0; index--) if (queue[index].type && queue[index].year) queue.splice(index, 1);
    panel.querySelector('#trainingQueueFeedback').textContent = `${ready.length} attachment${ready.length === 1 ? '' : 's'} added.`;
    first = Math.max(0, attachments.length - visibleCount());
    renderQueue();
    render();
  });

  function showAttachment(index) {
    active = index;
    const item = attachments[active];
    modal.querySelector('#trainingDocumentViewerTitle').textContent = item.name;
    modal.querySelector('#trainingDocumentViewerMeta').textContent = `${fileType(item)} · ${item.type} · ${item.year} · ${active + 1} of ${attachments.length}`;
    modal.querySelector('#trainingDocumentViewerBody').innerHTML = item.pdf ? `<iframe src="${window.TmisStore.escape(item.url)}" title="${escapeHtml(item.name)}"></iframe>` : `<img src="${window.TmisStore.escape(item.url)}" alt="${escapeHtml(item.name)}">`;
    const download = modal.querySelector('#trainingDocumentViewerDownload');
    download.href = item.url;
    download.download = item.name;
    viewer.show();
  }

  function render() {
    const visible = visibleCount();
    first = Math.min(first, Math.max(0, attachments.length - visible));
    if (!attachments.length) {
      cards.innerHTML = '<p class="training-attachment-empty">No attachments yet. Add images or PDFs to this training.</p>';
      return;
    }
    cards.innerHTML = `<button type="button" class="training-attachment-nav" data-step="-1" aria-label="Previous attachments" ${first === 0 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button><div class="training-attachment-track" style="--visible:${visible}">${attachments.slice(first, first + visible).map((item, offset) => `<article class="training-attachment-card"><button type="button" class="training-attachment-preview" data-view="${first + offset}" aria-label="View ${escapeHtml(item.name)}">${item.pdf ? '<span class="training-attachment-pdf"><i class="bi bi-file-earmark-pdf-fill"></i><strong>PDF</strong></span>' : `<img src="${window.TmisStore.escape(item.url)}" alt="" loading="lazy">`}<span class="training-attachment-kind">${item.pdf ? 'PDF document' : 'Image'}</span><span class="training-attachment-overlay"><i class="bi bi-arrows-angle-expand"></i> Open preview</span></button><div class="training-attachment-info"><span class="training-attachment-category"><i class="bi bi-tag-fill"></i>${escapeHtml(item.type)}</span><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><div class="training-attachment-meta"><span><i class="bi bi-calendar3"></i>${escapeHtml(item.year)}</span><small>Attachment ${first + offset + 1} of ${attachments.length}</small></div><div class="training-attachment-actions"><button type="button" data-view="${first + offset}"><i class="bi bi-eye"></i> View</button><button type="button" data-edit="${first + offset}"><i class="bi bi-pencil"></i> Edit</button><button type="button" data-delete="${first + offset}"><i class="bi bi-trash3"></i> Delete</button></div></div></article>`).join('')}</div><button type="button" class="training-attachment-nav" data-step="1" aria-label="Next attachments" ${first >= attachments.length - visible ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
  }
  cards.addEventListener('click', event => {
    const step = event.target.closest('[data-step]');
    if (step) { first = Math.max(0, Math.min(first + Number(step.dataset.step), attachments.length - visibleCount())); render(); return; }
    const view = event.target.closest('[data-view]');
    if (view) showAttachment(Number(view.dataset.view));
    const edit = event.target.closest('[data-edit]');
    if (edit) {
      editing = Number(edit.dataset.edit);
      const item = attachments[editing];
      if (!years.includes(item.year)) editYear.add(new Option(item.year, item.year));
      editType.value = item.type;
      editYear.value = item.year;
      editRemarks.value = item.remarks || '';
      updateEditState();
      editModal.show();
      return;
    }
    const remove = event.target.closest('[data-delete]');
    if (remove) {
      const index = Number(remove.dataset.delete);
      const [item] = attachments.splice(index, 1);
      scheduleDelete(item, index);
      render();
    }
  });
  modal.addEventListener('click', event => {
    const button = event.target.closest('[data-viewer]');
    if (button) showAttachment((active + (button.dataset.viewer === 'next' ? 1 : -1) + attachments.length) % attachments.length);
  });
  window.addEventListener('resize', render);
  renderQueue();
  render();
});
