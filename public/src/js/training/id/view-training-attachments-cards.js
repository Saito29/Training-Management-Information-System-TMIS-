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
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const visibleCount = () => window.innerWidth < 576 ? 1 : window.innerWidth < 768 ? 2 : window.innerWidth < 992 ? 3 : 4;

  panel.innerHTML = `<section class="training-documents-card training-card"><header class="training-documents-header"><div class="training-documents-heading"><span class="training-documents-icon"><i class="bi bi-file-earmark-text"></i></span><div><h2>Attachment Documents</h2><p>View supporting documents for this training.</p></div></div><button class="training-documents-add" type="button" disabled title="Attachments can be added from Edit Training"><i class="bi bi-plus-circle"></i> Add Attachments</button></header><div class="training-documents-body"><div id="trainingAttachmentCards" class="training-attachment-carousel" aria-live="polite"></div></div></section>`;
  const cards = panel.querySelector('#trainingAttachmentCards');
  const modal = document.createElement('div');
  modal.className = 'modal fade training-document-viewer';
  modal.tabIndex = -1;
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = '<div class="modal-dialog modal-fullscreen"><div class="modal-content"><div class="modal-header"><div><h2 class="modal-title fs-5" id="trainingDocumentViewerTitle"></h2><small id="trainingDocumentViewerMeta"></small></div><div class="training-document-viewer-actions"><button type="button" class="btn btn-light btn-sm" data-viewer="previous" aria-label="Previous attachment"><i class="bi bi-chevron-left"></i></button><button type="button" class="btn btn-light btn-sm" data-viewer="next" aria-label="Next attachment"><i class="bi bi-chevron-right"></i></button><a class="btn btn-light btn-sm" id="trainingDocumentViewerDownload" download><i class="bi bi-download"></i> Download</a><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div></div><div class="modal-body" id="trainingDocumentViewerBody"></div></div></div>';
  document.body.append(modal);
  const viewer = bootstrap.Modal.getOrCreateInstance(modal);

  function showAttachment(index) {
    active = index;
    const item = attachments[active];
    modal.querySelector('#trainingDocumentViewerTitle').textContent = item.name;
    modal.querySelector('#trainingDocumentViewerMeta').textContent = `${item.type} · ${item.year} · ${active + 1} of ${attachments.length}`;
    modal.querySelector('#trainingDocumentViewerBody').innerHTML = item.pdf ? `<iframe src="${window.TmisStore.escape(item.url)}" title="${escapeHtml(item.name)}"></iframe>` : `<img src="${window.TmisStore.escape(item.url)}" alt="${escapeHtml(item.name)}">`;
    const download = modal.querySelector('#trainingDocumentViewerDownload');
    download.href = item.url;
    download.download = item.name;
    viewer.show();
  }

  function render() {
    const visible = visibleCount();
    first = Math.min(first, Math.max(0, attachments.length - visible));
    cards.innerHTML = `<button type="button" class="training-attachment-nav" data-step="-1" aria-label="Previous attachments" ${first === 0 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button><div class="training-attachment-track" style="--visible:${visible}">${attachments.slice(first, first + visible).map((item, offset) => `<article class="training-attachment-card"><button type="button" class="training-attachment-preview" data-view="${first + offset}" aria-label="View ${escapeHtml(item.name)}">${item.pdf ? '<span class="training-attachment-pdf"><i class="bi bi-file-earmark-pdf-fill"></i><strong>PDF</strong></span>' : `<img src="${window.TmisStore.escape(item.url)}" alt="" loading="lazy">`}<span class="training-attachment-kind">${item.pdf ? 'PDF document' : 'Image'}</span><span class="training-attachment-overlay"><i class="bi bi-arrows-angle-expand"></i> Open preview</span></button><div class="training-attachment-info"><span class="training-attachment-category"><i class="bi bi-tag-fill"></i>${escapeHtml(item.type)}</span><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><div class="training-attachment-meta"><span><i class="bi bi-calendar3"></i>${escapeHtml(item.year)}</span><small>Attachment ${first + offset + 1} of ${attachments.length}</small></div><div class="training-attachment-actions"><button type="button" data-view="${first + offset}"><i class="bi bi-eye"></i> View</button><a href="${window.TmisStore.escape(item.url)}" download="${escapeHtml(item.name)}"><i class="bi bi-download"></i> Download</a></div></div></article>`).join('')}</div><button type="button" class="training-attachment-nav" data-step="1" aria-label="Next attachments" ${first >= attachments.length - visible ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
  }
  cards.addEventListener('click', event => {
    const step = event.target.closest('[data-step]');
    if (step) { first = Math.max(0, Math.min(first + Number(step.dataset.step), attachments.length - visibleCount())); render(); return; }
    const view = event.target.closest('[data-view]');
    if (view) showAttachment(Number(view.dataset.view));
  });
  modal.addEventListener('click', event => {
    const button = event.target.closest('[data-viewer]');
    if (button) showAttachment((active + (button.dataset.viewer === 'next' ? 1 : -1) + attachments.length) % attachments.length);
  });
  window.addEventListener('resize', render);
  render();
});
