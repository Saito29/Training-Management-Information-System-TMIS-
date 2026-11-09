document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('attachments-panel');
  if (!panel) return;

  const readOnly = panel.hasAttribute('data-attachments-readonly');
  const base = '../../../../assets/training/sample-attachments/';
  const types = ['Training Program', 'Attendance Sheet', 'Training Materials', 'Photos', 'Other Files'];
  const attachments = [
    {name:'file.pdf', type:'Training Materials', year:'2025', remarks:'Sample training document.', url:base + 'file.pdf', mime:'application/pdf'},
    {name:'training-highlight-1.png', type:'Photos', year:'2025', remarks:'Key highlight from the GAP training recap.', url:base + 'training-highlight-1.png', mime:'image/png'},
    {name:'training-highlight-2.png', type:'Photos', year:'2025', remarks:'Ways forward from the GAP training recap.', url:base + 'training-highlight-2.png', mime:'image/png'},
    {name:'gendrano-jennel.jpg', type:'Photos', year:'2025', remarks:'Sample participant photo.', url:base + 'gendrano-jennel.jpg', mime:'image/jpeg'}
  ];
  let current = 0;
  let editing = -1;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = item => item.mime === 'application/pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image';
  const preview = item => item.mime === 'application/pdf'
    ? `<iframe src="${window.TmisStore.escape(item.url)}#toolbar=0" title="Preview of ${escapeHtml(item.name)}"></iframe>`
    : `<img src="${window.TmisStore.escape(item.url)}" alt="Preview of ${escapeHtml(item.name)}">`;
  const fire = (action, item) => document.dispatchEvent(new CustomEvent('training:attachment', {detail:{action, file:item.name}}));

  panel.innerHTML = `<section class="training-document-card training-card training-attachment-carousel" aria-labelledby="attachmentCarouselTitle">
    <header class="training-document-header"><div class="training-document-heading"><span class="training-document-icon"><i class="bi bi-paperclip"></i></span><div><h2 id="attachmentCarouselTitle">Attachment Documents</h2><p>${readOnly ? 'Sample supporting documents for this training.' : 'View and manage supporting documents for this training.'}</p></div></div>${readOnly ? '' : '<button id="trainingAddAttachment" class="training-add-attachment" type="button"><i class="bi bi-plus-circle"></i> Add Attachments</button><input id="trainingAttachmentFiles" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple hidden>'}</header>
    <div class="training-carousel-body"><div class="training-carousel-stage" id="trainingCarouselStage"></div><div class="training-carousel-details" id="trainingCarouselDetails"></div><div class="training-carousel-controls"><button type="button" id="trainingCarouselPrevious" aria-label="Previous attachment"><i class="bi bi-chevron-left"></i></button><span id="trainingCarouselCount" aria-live="polite"></span><button type="button" id="trainingCarouselNext" aria-label="Next attachment"><i class="bi bi-chevron-right"></i></button></div><div class="training-carousel-thumbnails" id="trainingCarouselThumbnails" aria-label="Choose an attachment"></div></div>
  </section>`;

  const stage = panel.querySelector('#trainingCarouselStage');
  const details = panel.querySelector('#trainingCarouselDetails');
  const thumbnails = panel.querySelector('#trainingCarouselThumbnails');
  const count = panel.querySelector('#trainingCarouselCount');
  const previous = panel.querySelector('#trainingCarouselPrevious');
  const next = panel.querySelector('#trainingCarouselNext');

  const viewerElement = document.createElement('div');
  viewerElement.className = 'modal fade training-attachment-preview-modal';
  viewerElement.tabIndex = -1;
  viewerElement.setAttribute('aria-hidden', 'true');
  viewerElement.innerHTML = '<div class="modal-dialog modal-xl modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h2 class="modal-title fs-5" id="trainingPreviewTitle"></h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close preview"></button></div><div class="modal-body" id="trainingPreviewBody"></div></div></div>';
  document.body.append(viewerElement);
  const viewer = bootstrap.Modal.getOrCreateInstance(viewerElement);

  let editModal;
  let editElement;
  if (!readOnly) {
    editElement = document.createElement('div');
    editElement.className = 'modal fade';
    editElement.tabIndex = -1;
    editElement.setAttribute('aria-hidden', 'true');
    editElement.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form id="trainingAttachmentEditForm"><div class="modal-header"><h2 class="modal-title fs-5">Edit attachment details</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"><label class="form-label" for="trainingAttachmentType">Document type</label><select class="form-select" id="trainingAttachmentType" required>${types.map(type => `<option>${type}</option>`).join('')}</select><label class="form-label mt-3" for="trainingAttachmentYear">Year covered</label><input class="form-control" id="trainingAttachmentYear" type="number" min="1900" max="2100" required><label class="form-label mt-3" for="trainingAttachmentRemarks">Remarks</label><textarea class="form-control" id="trainingAttachmentRemarks" rows="3" maxlength="500"></textarea></div><div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn training-add-attachment">Save changes</button></div></form></div></div>`;
    document.body.append(editElement);
    editModal = bootstrap.Modal.getOrCreateInstance(editElement);
    editElement.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const item = attachments[editing];
      if (!item) return;
      item.type = editElement.querySelector('#trainingAttachmentType').value;
      item.year = editElement.querySelector('#trainingAttachmentYear').value;
      item.remarks = editElement.querySelector('#trainingAttachmentRemarks').value.trim();
      fire('updated', item);
      editModal.hide();
      render();
    });
    panel.querySelector('#trainingAddAttachment').addEventListener('click', () => panel.querySelector('#trainingAttachmentFiles').click());
    panel.querySelector('#trainingAttachmentFiles').addEventListener('change', event => {
      for (const file of event.target.files) {
        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) continue;
        const item = {name:file.name, type:'Other Files', year:String(new Date().getFullYear()), remarks:'', url:URL.createObjectURL(file), mime:file.type, temporary:true};
        attachments.push(item);
        fire('added', item);
      }
      event.target.value = '';
      current = attachments.length - 1;
      render();
    });
  }

  function render() {
    if (!attachments.length) {
      stage.innerHTML = '<div class="training-carousel-empty">No attachments available.</div>';
      details.innerHTML = '';
      thumbnails.innerHTML = '';
      count.textContent = '0 of 0';
      previous.disabled = next.disabled = true;
      return;
    }
    current = Math.max(0, Math.min(current, attachments.length - 1));
    const item = attachments[current];
    stage.innerHTML = preview(item);
    details.innerHTML = `<div class="training-carousel-file"><i class="bi ${icon(item)}" aria-hidden="true"></i><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.type)} · ${escapeHtml(item.year)}</span>${item.remarks ? `<small>${escapeHtml(item.remarks)}</small>` : ''}</div></div><div class="training-file-actions"><button type="button" data-action="view" aria-label="View ${escapeHtml(item.name)}" title="View"><i class="bi bi-eye"></i></button>${readOnly ? `<a href="${window.TmisStore.escape(item.url)}" download="${escapeHtml(item.name)}" aria-label="Download ${escapeHtml(item.name)}" title="Download"><i class="bi bi-download"></i></a>` : `<button type="button" data-action="edit" aria-label="Edit ${escapeHtml(item.name)}" title="Edit"><i class="bi bi-pencil"></i></button><button type="button" data-action="delete" aria-label="Delete ${escapeHtml(item.name)}" title="Delete"><i class="bi bi-trash"></i></button>`}</div>`;
    count.textContent = `${current + 1} of ${attachments.length}`;
    previous.disabled = next.disabled = attachments.length < 2;
    thumbnails.innerHTML = attachments.map((entry, index) => `<button type="button" class="${index === current ? 'is-active' : ''}" data-index="${index}" aria-label="Show ${escapeHtml(entry.name)}" aria-current="${index === current ? 'true' : 'false'}">${entry.mime === 'application/pdf' ? '<i class="bi bi-file-earmark-pdf"></i>' : `<img src="${window.TmisStore.escape(entry.url)}" alt="">`}<span>${escapeHtml(entry.name)}</span></button>`).join('');
  }

  previous.addEventListener('click', () => { current = (current - 1 + attachments.length) % attachments.length; render(); });
  next.addEventListener('click', () => { current = (current + 1) % attachments.length; render(); });
  thumbnails.addEventListener('click', event => { const button = event.target.closest('[data-index]'); if (button) { current = Number(button.dataset.index); render(); } });
  details.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const item = attachments[current];
    if (button.dataset.action === 'view') {
      viewerElement.querySelector('#trainingPreviewTitle').textContent = item.name;
      viewerElement.querySelector('#trainingPreviewBody').innerHTML = preview(item);
      viewer.show();
    } else if (button.dataset.action === 'edit' && !readOnly) {
      editing = current;
      editElement.querySelector('#trainingAttachmentType').value = item.type;
      editElement.querySelector('#trainingAttachmentYear').value = item.year;
      editElement.querySelector('#trainingAttachmentRemarks').value = item.remarks;
      editModal.show();
    } else if (button.dataset.action === 'delete' && !readOnly) {
      attachments.splice(current, 1);
      if (item.temporary) URL.revokeObjectURL(item.url);
      fire('removed', item);
      render();
    }
  });
  render();
});
