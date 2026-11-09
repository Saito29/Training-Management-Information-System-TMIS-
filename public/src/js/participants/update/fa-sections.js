document.addEventListener('DOMContentLoaded', () => {
  const associationId = new URLSearchParams(location.search).get('faId') || 'FA-2025-001';
  const readAssociation = () => {
    try {
      const records = JSON.parse(window.TmisStore.getItem('tmis-farmer-associations') || '[]');
      return Array.isArray(records) ? records.find(record => record.id === associationId) : null;
    } catch { return null; }
  };
  const clean = value => value === undefined || value === null ? '' : String(value);
  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = clean(value);
    return element;
  };
  const exportRows = (records, keys, labels, filename) => {
    if (!window.XLSX) { alert('Excel export is unavailable. Check your connection and try again.'); return; }
    const rows = records.map(record => Object.fromEntries(keys.map((key, index) => [labels[index], clean(record[key])])));
    const sheet = window.XLSX.utils.json_to_sheet(rows, { header: labels });
    const book = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(book, sheet, labels[0] === 'Training Name' ? 'Trainings' : 'Interventions');
    window.XLSX.writeFile(book, `${filename}_${associationId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  function setupTable(config) {
    const table = document.getElementById(config.table);
    const body = document.getElementById(config.body);
    const search = document.getElementById(config.search);
    const clear = document.getElementById(config.clear);
    const empty = config.empty ? document.getElementById(config.empty) : null;
    const filters = [...table.querySelectorAll(config.filterSelector)];
    const headers = [...table.querySelectorAll(config.sortSelector)];
    const pagers = config.pagers.map(id => document.getElementById(id));
    const state = { page: 1, size: 8, sort: null, direction: 1 };
    const data = () => {
      const records = readAssociation()?.[config.source];
      return Array.isArray(records) ? records : [];
    };
    const filtered = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const rows = data().filter(record =>
        (!query || config.keys.some(key => clean(record[key]).toLocaleLowerCase().includes(query))) &&
        filters.every(filter => !filter.value.trim() || clean(record[filter.dataset.column]).toLocaleLowerCase().includes(filter.value.trim().toLocaleLowerCase()))
      );
      if (state.sort) rows.sort((a, b) => clean(a[state.sort]).localeCompare(clean(b[state.sort]), undefined, { numeric: true }) * state.direction);
      return rows;
    };
    function render() {
      const rows = filtered();
      const pages = Math.max(1, Math.ceil(rows.length / state.size));
      state.page = Math.min(state.page, pages);
      const start = (state.page - 1) * state.size;
      const visible = rows.slice(start, start + state.size);
      body.replaceChildren();
      visible.forEach(record => {
        const row = make('tr');
        config.keys.forEach(key => row.append(make('td', '', record[key] || '—')));
        body.append(row);
      });
      if (!visible.length && !empty) {
        const row = make('tr');
        const cell = make('td', 'intervention-empty-cell', 'No association intervention records available.');
        cell.colSpan = config.keys.length;
        row.append(cell);
        body.append(row);
      }
      if (empty) empty.hidden = rows.length > 0;
      if (empty) empty.querySelector('strong').textContent = data().length ? 'No training records match the current filters.' : 'No association training records available.';
      table.hidden = Boolean(empty) && rows.length === 0;
      pagers.forEach(pager => {
        pager.replaceChildren();
        pager.append(make('span', '', `Showing ${rows.length ? start + 1 : 0}–${rows.length ? start + visible.length : 0} of ${rows.length} records`));
        const controls = make('div', 'pagination-controls');
        const size = make('select');
        size.setAttribute('aria-label', 'Rows per page');
        [8, 16, 32, 100].forEach(value => size.add(new Option(String(value), String(value))));
        size.value = String(state.size);
        size.addEventListener('change', () => { state.size = Number(size.value); state.page = 1; render(); });
        controls.append(size);
        const previous = make('button', '', '‹');
        previous.type = 'button';
        previous.setAttribute('aria-label', 'Previous page');
        previous.disabled = state.page === 1;
        previous.addEventListener('click', () => { state.page--; render(); });
        controls.append(previous, make('span', '', `Page ${state.page} of ${pages}`));
        const next = make('button', '', '›');
        next.type = 'button';
        next.setAttribute('aria-label', 'Next page');
        next.disabled = state.page === pages;
        next.addEventListener('click', () => { state.page++; render(); });
        controls.append(next);
        pager.append(controls);
      });
      if (config.count) document.getElementById(config.count).textContent = `${data().length} records`;
    }
    search.addEventListener('input', () => { state.page = 1; render(); });
    filters.forEach(filter => filter.addEventListener('input', () => { state.page = 1; render(); }));
    clear.addEventListener('click', () => { search.value = ''; filters.forEach(filter => { filter.value = ''; }); state.page = 1; render(); });
    headers.forEach(header => {
      const sort = () => { state.direction = state.sort === header.dataset.sort ? -state.direction : 1; state.sort = header.dataset.sort; render(); };
      header.addEventListener('click', sort);
      header.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sort(); } });
    });
    document.getElementById(config.export).addEventListener('click', () => exportRows(filtered(), config.keys, config.labels, config.filename));
    if (config.refresh) document.getElementById(config.refresh).addEventListener('click', render);
    window.addEventListener('storage', event => { if (event.key === 'tmis-farmer-associations') render(); });
    render();
  }

  setupTable({ source: 'trainings', table: 'trainingDataTable', body: 'trainings-table-body', search: 'trainingGlobalSearch', clear: 'clearTrainingFilters', export: 'exportTrainingTable', empty: 'trainingTableEmpty', filterSelector: '.training-column-filter', sortSelector: '.training-sortable', pagers: ['trainingPaginationTop', 'trainingPaginationBottom'], keys: ['title', 'category', 'date', 'location', 'organizer'], labels: ['Training Name', 'Category', 'Dates', 'Location', 'Organizer'], filename: 'association_trainings' });
  setupTable({ source: 'interventions', table: 'interventionDataTable', body: 'interventionTableBody', search: 'interventionGlobalSearch', clear: 'clearInterventionFilters', export: 'exportInterventions', refresh: 'refreshInterventions', count: 'interventionRecordCount', filterSelector: '.intervention-column-filter', sortSelector: '.intervention-sortable', pagers: ['interventionPaginationTop', 'interventionPaginationBottom'], keys: ['title', 'office', 'yearCovered', 'action', 'type', 'unit', 'qty', 'remarks'], labels: ['Intervention', 'Office', 'Year Covered', 'Actions', 'Type', 'Unit', 'Qty', 'Remarks'], filename: 'association_interventions' });

  const documentList = document.getElementById('attachmentList');
  let documentPage = 0;
  const documentPageSize = () => window.innerWidth < 576 ? 1 : window.innerWidth < 768 ? 2 : window.innerWidth < 992 ? 3 : window.innerWidth < 1200 ? 4 : 5;
  const safeDocumentUrl = item => /^data:(application\/pdf|image\/(jpeg|png));base64,/i.test(item.dataUrl || '') ? item.dataUrl : '';
  const documentItems = () => Array.isArray(readAssociation()?.documents) ? readAssociation().documents : [];
  const saveDocuments = async items => {
    try {
      const records = JSON.parse(window.TmisStore.getItem('tmis-farmer-associations') || '[]');
      const index = records.findIndex(record => record.id === associationId);
      if (index < 0) return false;
      records[index].documents = items;
      await window.TmisStore.setItem('tmis-farmer-associations', JSON.stringify(records));
      window.dispatchEvent(new StorageEvent('storage', { key: 'tmis-farmer-associations' }));
      return true;
    } catch { return false; }
  };
  const viewerModal = document.getElementById('attachmentViewerModal');
  const editModal = document.getElementById('editAttachmentModal');
  const canManageDocuments = Boolean(editModal && !document.querySelector('#fa-document .attachment-add-button')?.disabled);
  let activeDocument = 0;
  function showDocument(index) {
    const items = documentItems();
    if (!viewerModal || !items.length || !safeDocumentUrl(items[index])) return;
    activeDocument = Math.max(0, Math.min(index, items.length - 1));
    const item = items[activeDocument], url = safeDocumentUrl(item), pdf = url.startsWith('data:application/pdf');
    document.getElementById('attachmentViewerTitle').textContent = item.name || 'Document';
    document.getElementById('attachmentViewerMeta').textContent = `${item.type || 'Association document'} · ${item.year || ''}`;
    const image = document.getElementById('attachmentViewerImage'), frame = document.getElementById('attachmentViewerPdf');
    image.hidden = pdf; frame.hidden = !pdf;
    image.src = pdf ? '' : url; frame.src = pdf ? url : '';
    document.getElementById('viewerPrevious').disabled = activeDocument === 0;
    document.getElementById('viewerNext').disabled = activeDocument === items.length - 1;
    bootstrap.Modal.getOrCreateInstance(viewerModal).show();
  }
  function renderDocuments() {
    const items = documentItems();
    documentList.replaceChildren();
    if (!items.length) {
      const empty = make('div', 'attachment-empty-state');
      empty.append(make('i', 'bi bi-file-earmark-arrow-up'), make('p', '', 'No documents recorded for this association.'));
      documentList.append(empty);
      return;
    }
    const count = documentPageSize();
    documentPage = Math.min(documentPage, Math.max(0, items.length - count));
    const carousel = make('div', 'attachment-carousel');
    const navigation = (step, label) => {
      const button = make('button', 'attachment-carousel-nav');
      button.type = 'button'; button.dataset.documentStep = String(step); button.setAttribute('aria-label', label);
      button.disabled = step < 0 ? documentPage === 0 : documentPage + count >= items.length;
      button.append(make('i', `bi bi-chevron-${step < 0 ? 'left' : 'right'}`));
      return button;
    };
    carousel.append(navigation(-1, 'Previous documents'));
    const track = make('div', 'attachment-carousel-track');
    track.style.gridTemplateColumns = `repeat(${Math.min(count, items.length)}, minmax(0, 1fr))`;
    items.slice(documentPage, documentPage + count).forEach((item, offset) => {
      const index = documentPage + offset, url = safeDocumentUrl(item), isImage = url.startsWith('data:image/');
      const card = make('article', 'attachment-card');
      const preview = make('button', 'attachment-card-preview');
      preview.type = 'button'; preview.dataset.documentOpen = String(index); preview.disabled = !url;
      preview.setAttribute('aria-label', `Preview ${item.name || 'document'}`);
      if (isImage) { const image = make('img', 'attachment-card-image'); image.src = url; image.alt = ''; preview.append(image); }
      else { const pdf = make('span', 'attachment-card-pdf'); pdf.append(make('i', 'bi bi-file-earmark-pdf-fill'), make('strong', '', 'PDF')); preview.append(pdf); }
      preview.append(make('span', 'attachment-card-preview-type', isImage ? 'Image' : 'PDF document'));
      if (url) { const overlay = make('span', 'attachment-card-preview-overlay', 'Open preview'); preview.append(overlay); }
      const info = make('div', 'attachment-card-info');
      const category = make('span', 'attachment-category', item.type || 'Association document');
      const filename = make('strong', 'attachment-card-filename', item.name || 'Document'); filename.title = item.name || 'Document';
      const meta = make('div', 'attachment-card-meta');
      meta.append(make('span', 'attachment-year', item.year || 'Year unavailable'), make('span', 'attachment-card-count', `Attachment ${index + 1} of ${items.length}`));
      info.append(category, filename, meta);
      if (item.remarks) info.append(make('p', 'fa-document-remarks', item.remarks));
      const actions = make('div', 'attachment-card-actions');
      if (url) { const download = make('a', 'btn attachment-card-edit', 'Download'); download.href = url; download.download = item.name || 'association-document'; actions.append(download); }
      if (canManageDocuments) {
        const edit = make('button', 'btn attachment-card-edit', 'Edit'); edit.type = 'button'; edit.dataset.documentEdit = String(index);
        const remove = make('button', 'btn attachment-card-delete', 'Delete'); remove.type = 'button'; remove.dataset.documentDelete = String(index);
        actions.append(edit, remove);
      }
      info.append(actions); card.append(preview, info); track.append(card);
    });
    carousel.append(track, navigation(1, 'Next documents'));
    documentList.append(carousel);
  }
  documentList.addEventListener('click', async event => {
    const step = event.target.closest('[data-document-step]');
    if (step) { documentPage += Number(step.dataset.documentStep); renderDocuments(); return; }
    const open = event.target.closest('[data-document-open]');
    if (open) { showDocument(Number(open.dataset.documentOpen)); return; }
    const edit = event.target.closest('[data-document-edit]');
    if (edit && canManageDocuments) {
      activeDocument = Number(edit.dataset.documentEdit);
      const item = documentItems()[activeDocument];
      const type = document.getElementById('editAttachmentType');
      if (![...type.options].some(option => option.value === item.type)) type.add(new Option(item.type || 'Association Document', item.type || 'Association Document'));
      type.value = item.type || 'Association Document';
      const year = document.getElementById('editAttachmentYear'); year.replaceChildren();
      for (let value = new Date().getFullYear() + 1; value >= 2000; value--) year.add(new Option(String(value), String(value)));
      if (item.year && ![...year.options].some(option => option.value === item.year)) year.add(new Option(item.year, item.year));
      year.value = item.year || String(new Date().getFullYear());
      document.getElementById('editAttachmentRemarks').value = item.remarks || '';
      document.getElementById('saveAttachmentChanges').disabled = false;
      bootstrap.Modal.getOrCreateInstance(editModal).show();
      return;
    }
    const remove = event.target.closest('[data-document-delete]');
    if (remove && canManageDocuments && window.confirm('Delete this association document?')) {
      const items = documentItems(); items.splice(Number(remove.dataset.documentDelete), 1);
      if (!await saveDocuments(items)) alert('Could not delete this document.');
    }
  });
  if (canManageDocuments) document.getElementById('editAttachmentForm').addEventListener('submit', async event => {
    event.preventDefault();
    const items = documentItems();
    if (!items[activeDocument]) return;
    items[activeDocument] = { ...items[activeDocument], type: document.getElementById('editAttachmentType').value, year: document.getElementById('editAttachmentYear').value, remarks: document.getElementById('editAttachmentRemarks').value.trim() };
    if (await saveDocuments(items)) bootstrap.Modal.getOrCreateInstance(editModal).hide();
    else alert('Could not save the document changes.');
  });
  if (viewerModal) {
    document.getElementById('viewerEdit').hidden = !canManageDocuments;
    document.getElementById('viewerDelete').hidden = !canManageDocuments;
    document.getElementById('viewerPrevious').addEventListener('click', () => showDocument(activeDocument - 1));
    document.getElementById('viewerNext').addEventListener('click', () => showDocument(activeDocument + 1));
    document.getElementById('viewerDownload').addEventListener('click', () => {
      const item = documentItems()[activeDocument], link = document.createElement('a');
      if (!item || !safeDocumentUrl(item)) return;
      link.href = item.dataUrl; link.download = item.name || 'association-document'; link.click();
    });
    document.getElementById('viewerEdit').addEventListener('click', () => {
      const target = activeDocument;
      viewerModal.addEventListener('hidden.bs.modal', () => {
        documentPage = target; renderDocuments();
        documentList.querySelector(`[data-document-edit="${target}"]`)?.click();
      }, { once: true });
      bootstrap.Modal.getOrCreateInstance(viewerModal).hide();
    });
    document.getElementById('viewerDelete').addEventListener('click', () => {
      const target = activeDocument;
      viewerModal.addEventListener('hidden.bs.modal', () => {
        documentPage = target; renderDocuments();
        documentList.querySelector(`[data-document-delete="${target}"]`)?.click();
      }, { once: true });
      bootstrap.Modal.getOrCreateInstance(viewerModal).hide();
    });
    let zoom = 1;
    const stage = document.getElementById('attachmentViewerImage');
    const setZoom = value => { zoom = Math.max(0.5, Math.min(3, value)); stage.style.transform = `scale(${zoom})`; };
    document.getElementById('viewerZoomIn').addEventListener('click', () => setZoom(zoom + 0.25));
    document.getElementById('viewerZoomOut').addEventListener('click', () => setZoom(zoom - 0.25));
    document.getElementById('viewerReset').addEventListener('click', () => setZoom(1));
    document.getElementById('viewerOpenNewTab').addEventListener('click', () => {
      const item = documentItems()[activeDocument];
      if (!item || !safeDocumentUrl(item)) return;
      const parts = item.dataUrl.split(',');
      const mime = parts[0].slice(5).split(';')[0];
      const bytes = Uint8Array.from(atob(parts[1]), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    viewerModal.addEventListener('hidden.bs.modal', () => setZoom(1));
  }
  window.addEventListener('resize', renderDocuments);

  const logList = document.getElementById('activityLogList');
  const logSearch = document.getElementById('activityLogSearch');
  const logFilters = [...document.querySelectorAll('[data-activity-filter]')];
  let activeCategory = 'all';
  function renderLogs() {
    const saved = readAssociation()?.activity_logs;
    const association = readAssociation();
    const logs = Array.isArray(saved) ? saved : association?.registration_date ? [{
      category: 'profile',
      title: 'Farmer association registered',
      description: `${association.association_name || 'This association'} was registered in TMIS.`,
      actor: 'TMIS',
      status: 'Registered',
      reference: association.id,
      date: association.registration_date,
    }] : [];
    logFilters.forEach(button => {
      const category = button.dataset.activityFilter;
      button.querySelector('[data-activity-count]').textContent = String(category === 'all' ? logs.length : logs.filter(log => log.category === category).length);
      button.classList.toggle('is-active', category === activeCategory);
      button.setAttribute('aria-pressed', String(category === activeCategory));
    });
    const query = logSearch.value.trim().toLocaleLowerCase();
    const visible = logs.filter(log => (activeCategory === 'all' || log.category === activeCategory) && (!query || Object.values(log).some(value => clean(value).toLocaleLowerCase().includes(query))));
    logList.replaceChildren();
    visible.forEach(log => {
      const card = make('article', 'activity-log-entry');
      const marker = make('span', 'activity-log-entry-icon');
      marker.append(make('i', 'bi bi-activity'));
      const content = make('div', 'activity-log-entry-content');
      const top = make('div', 'activity-log-entry-top');
      const heading = make('div', 'activity-log-entry-title-group');
      heading.append(make('h3', 'activity-log-entry-title', log.title || 'Association update'), make('span', `activity-log-category activity-log-category-${log.category || 'profile'}`, log.category || 'profile'));
      top.append(heading, make('span', 'activity-log-status', log.status || 'Updated'));
      content.append(top, make('p', 'activity-log-entry-description', log.description || ''));
      const meta = make('div', 'activity-log-entry-meta');
      meta.append(make('span', 'activity-log-actor', log.actor || 'TMIS'), make('span', 'activity-log-reference', log.reference || associationId), make('time', 'activity-log-timestamp', log.date || ''));
      content.append(meta);
      card.append(marker, content);
      logList.append(card);
    });
    document.getElementById('activityLogEmpty').hidden = visible.length > 0;
    document.getElementById('activityLogResultCount').textContent = `Showing ${visible.length} of ${logs.length} activities`;
  }
  logFilters.forEach(button => button.addEventListener('click', () => { activeCategory = button.dataset.activityFilter; renderLogs(); }));
  logSearch.addEventListener('input', renderLogs);
  window.addEventListener('storage', event => { if (event.key === 'tmis-farmer-associations') { renderDocuments(); renderLogs(); } });
  renderDocuments();
  renderLogs();
});
