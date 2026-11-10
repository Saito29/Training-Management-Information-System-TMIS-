document.addEventListener('DOMContentLoaded', () => {
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const date = (value) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString() : '—';
  const questionnaireSources = [
    { key: 'tmis-pre-test-questionnaires', type: 'Pre-test', path: '../id/edit-pre-test' },
    { key: 'tmis-post-test-questionnaires', type: 'Post-test', path: '../id/edit-post-test' },
    { key: 'tmis-rp-evaluation-questionnaires', type: 'Resource Person Evaluation', path: '../id/edit-rp-evaluation' },
    { key: 'tmis-training-evaluation-questionnaires', type: 'Training Evaluation', path: '../id/edit-training-evaluation' },
  ];
  const encodingSources = [
    { key: 'tmis-pre-test-encoded', type: 'Pre-test', path: '../encode/pre-test' },
    { key: 'tmis-post-test-encoded', type: 'Post-test', path: '../encode/post-test' },
    { key: 'tmis-training-evaluation-encoded', type: 'Training Evaluation', path: '../encode/training-evaluation' },
    { key: 'tmis-rp-evaluation-encoded', type: 'Resource Person Evaluation', path: '../encode/rp-evaluation' },
  ];

  function setup(kind, sources, normalize, columns) {
    const prefix = kind === 'questionnaire' ? 'draftQuestionnaire' : 'draftEncoding';
    const table = document.getElementById(`${prefix}Table`);
    const rows = document.getElementById(`${prefix}Rows`);
    const type = document.getElementById(`${prefix}Type`);
    const association = kind === 'encoding' ? document.getElementById('draftEncodingAssociation') : null;
    const search = document.getElementById(`${prefix}Search`);
    const refresh = document.getElementById(`${prefix}Refresh`);
    const exportButton = document.getElementById(`${prefix}Export`);
    const sizes = [...document.querySelectorAll(`[data-draft-size="${kind}"]`)];
    const pagers = [...document.querySelectorAll(`[data-draft-pagination="${kind}"]`)];
    if (!table || !rows) return;
    let records = [], page = 1, pageSize = 10, readError = false;

    function matching() {
      const needle = search.value.trim().toLowerCase();
      return records.filter((record) => (!type.value || record.type === type.value)
        && (!association?.value || record.association === association.value)
        && (!needle || record.search.toLowerCase().includes(needle)));
    }
    function render() {
      const filtered = matching();
      const pages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
      page = Math.min(Math.max(page, 1), pages);
      const start = pageSize === Infinity ? 0 : (page - 1) * pageSize;
      const shown = pageSize === Infinity ? filtered : filtered.slice(start, start + pageSize);
      rows.innerHTML = shown.map((record) => `<tr><td><div class="d-flex gap-2"><a class="btn btn-sm btn-outline-primary draft-continue" href="${window.TmisStore.escape(record.href)}" target="_blank" rel="noopener noreferrer" aria-label="Continue ${escape(record.title)} in a new tab" title="Continue in new tab"><i class="bi bi-pencil-square" aria-hidden="true"></i><span>Continue</span></a><button class="btn btn-sm btn-outline-danger" type="button" data-delete-draft="${escape(record.id)}" data-draft-key="${escape(record.key)}" aria-label="Delete ${escape(record.title)} draft" title="Delete draft"><i class="bi bi-trash" aria-hidden="true"></i></button></div></td>${record.cells.map((cell, index) => `<td${index === 1 && kind === 'questionnaire' ? ' class="draft-id"' : ''}>${escape(cell)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${columns.length}" class="draft-empty">${readError ? 'Some saved drafts could not be read.' : 'No matching drafts found.'}</td></tr>`;
      pagers.forEach((pager) => { pager.innerHTML = `<span>${filtered.length ? start + 1 : 0}-${Math.min(start + shown.length, filtered.length)} of ${filtered.length}</span><div class="d-flex gap-2 align-items-center"><button class="btn btn-sm btn-outline-secondary" data-page="first" ${page === 1 ? 'disabled' : ''} aria-label="First page">&laquo;</button><button class="btn btn-sm btn-outline-secondary" data-page="previous" ${page === 1 ? 'disabled' : ''}>Previous</button><span>Page ${page} of ${pages}</span><button class="btn btn-sm btn-outline-secondary" data-page="next" ${page === pages ? 'disabled' : ''}>Next</button><button class="btn btn-sm btn-outline-secondary" data-page="last" ${page === pages ? 'disabled' : ''} aria-label="Last page">&raquo;</button></div>`; });
      sizes.forEach((select) => { select.value = pageSize === Infinity ? 'all' : String(pageSize); });
      exportButton.disabled = filtered.length === 0;
    }
    function read() {
      readError = false;
      records = sources.flatMap((source) => {
        try {
          const saved = JSON.parse(window.TmisStore.getItem(source.key) || '[]');
          return (Array.isArray(saved) ? saved : []).filter((record) => record?.id && record.status === (kind === 'questionnaire' ? 'Draft' : 'draft')).map((record) => normalize(record, source));
        } catch { readError = true; return []; }
      }).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
      if (association) {
        const selected = association.value;
        const names = [...new Set(records.map((record) => record.association).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        association.replaceChildren(new Option('All associations', ''), ...names.map((name) => new Option(name, name)));
        association.value = names.includes(selected) ? selected : '';
      }
      render();
    }
    function load() {
      table.setAttribute('aria-busy', 'true');
      refresh.disabled = true;
      rows.innerHTML = `<tr class="draft-loading-row"><td colspan="${columns.length}"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading drafts...</td></tr>`;
      window.setTimeout(() => {
        try { read(); }
        finally { table.setAttribute('aria-busy', 'false'); refresh.disabled = false; }
      }, 180);
    }
    [type, search, association].filter(Boolean).forEach((input) => input.addEventListener('input', () => { page = 1; render(); }));
    document.getElementById(`${prefix}Clear`).addEventListener('click', () => { type.value = ''; search.value = ''; if (association) association.value = ''; page = 1; render(); });
    sizes.forEach((select) => select.addEventListener('change', () => { pageSize = select.value === 'all' ? Infinity : Number(select.value); page = 1; render(); }));
    pagers.forEach((pager) => pager.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page]'); if (!button) return;
      const last = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(matching().length / pageSize));
      page = { first: 1, previous: page - 1, next: page + 1, last }[button.dataset.page]; render();
    }));
    refresh.addEventListener('click', load);
    {
      const suffix = kind === 'questionnaire' ? 'Questionnaire' : 'Encoding';
      const detail = (name, value) => { document.getElementById(`deleteDraft${suffix}${name}`).textContent = value || '—'; };
      const modalElement = document.getElementById(`deleteDraft${suffix}Modal`);
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      const notices = document.getElementById('draftQuestionnaireUndoNotices');
      let pending = null;
      rows.addEventListener('click', (event) => {
        const button = event.target.closest('[data-delete-draft]');
        if (!button) return;
        pending = records.find((record) => record.id === button.dataset.deleteDraft && record.key === button.dataset.draftKey) || null;
        if (!pending) return;
        detail('Title', pending.title);
        detail('Type', pending.type);
        detail('Saved', date(pending.savedAt));
        if (kind === 'questionnaire') {
          detail('Id', pending.id);
          detail('Region', pending.region);
          detail('Office', pending.office);
          detail('Items', String(pending.count));
        } else {
          detail('Farmer', pending.farmer);
          detail('Association', pending.association);
          detail('Progress', pending.progress);
        }
        modal.show();
      });
      modalElement.addEventListener('hidden.bs.modal', () => { pending = null; });
      document.getElementById(`confirmDeleteDraft${suffix}`).addEventListener('click', async () => {
        if (!pending) return;
        try {
          const saved = JSON.parse(window.TmisStore.getItem(pending.key) || '[]');
          if (!Array.isArray(saved)) throw new Error('Invalid draft data');
          const index = saved.findIndex((item) => item?.id === pending.id && item.status === (kind === 'questionnaire' ? 'Draft' : 'draft'));
          if (index < 0) throw new Error('Draft not found');
          const [original] = saved.splice(index, 1);
          await window.TmisStore.setItem(pending.key, JSON.stringify(saved));
          const deleted = pending;
          pending = null;
          modal.hide();
          read();
          const notice = document.createElement('div');
          notice.className = 'draft-undo-notice';
          notice.setAttribute('role', 'status');
          const icon = document.createElement('span');
          icon.className = 'draft-undo-icon';
          icon.innerHTML = '<i class="bi bi-check-lg" aria-hidden="true"></i>';
          const message = document.createElement('span');
          message.className = 'draft-undo-message';
          message.textContent = `${deleted.title} deleted.`;
          const undo = document.createElement('button');
          undo.type = 'button';
          undo.className = 'draft-undo-button';
          notice.append(icon, message, undo);
          notices.append(notice);
          const deadline = Date.now() + 10000;
          const timer = window.setInterval(() => {
            const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            undo.textContent = `Undo (${seconds}s)`;
            if (!seconds) { window.clearInterval(timer); notice.remove(); }
          }, 200);
          undo.textContent = 'Undo (10s)';
          undo.addEventListener('click', async () => {
            if (Date.now() >= deadline) return;
            try {
              const current = JSON.parse(window.TmisStore.getItem(deleted.key) || '[]');
              if (!Array.isArray(current)) throw new Error('Invalid questionnaire data');
              if (!current.some((item) => item?.id === original.id)) {
                current.splice(Math.min(index, current.length), 0, original);
                await window.TmisStore.setItem(deleted.key, JSON.stringify(current));
              }
              window.clearInterval(timer);
              notice.remove();
              read();
            } catch { message.textContent = 'Could not restore the draft. Please try again.'; }
          });
        } catch { window.alert('The draft could not be deleted. Please try again.'); }
      });
    }
    exportButton.addEventListener('click', () => {
      if (typeof XLSX === 'undefined') return;
      const data = matching().map((record) => Object.fromEntries(columns.slice(1).map((header, index) => [header, record.cells[index]])));
      if (!data.length) return;
      const book = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(data);
      sheet['!cols'] = columns.slice(1).map((header) => ({ wch: Math.min(45, Math.max(16, header.length + 8)) }));
      XLSX.utils.book_append_sheet(book, sheet, kind === 'questionnaire' ? 'Questionnaire Drafts' : 'Encoding Drafts');
      XLSX.writeFile(book, kind === 'questionnaire' ? 'draft-questionnaires.xlsx' : 'draft-encoding.xlsx');
    });
    load();
  }

  setup('questionnaire', questionnaireSources, (record, source) => {
    const title = record.trainingQuestionnaire || record.questionnaireName || 'Untitled questionnaire';
    const count = Array.isArray(record.questions) ? record.questions.length : Number(record.totalItems) || 0;
    const office = record.implementingOffice || record.office || '';
    return { id: record.id, key: source.key, type: source.type, title, region: record.region || '', office, count, savedAt: record.updatedAt || record.createdAt || '', href: `${source.path}?id=${encodeURIComponent(record.id)}`,
      search: `${title} ${record.id} ${source.type} ${record.region || ''} ${office}`,
      cells: ['Draft', record.id, title, source.type, record.region || '—', office || '—', count, date(record.updatedAt || record.createdAt)] };
  }, ['Action', 'Status', 'Questionnaire ID', 'Questionnaire Title', 'Type', 'Region', 'Office', 'Items', 'Last Saved']);

  setup('encoding', encodingSources, (record, source) => {
    const farmer = record.farmerName || 'Farmer not selected';
    const title = record.questionnaireName || 'Questionnaire not selected';
    const progress = Array.isArray(record.ratings) ? `${record.ratings.filter((item) => item.rating != null).length} / ${record.ratings.length} rated` : record.score == null ? 'Not entered' : `${record.score}${record.totalItems ? ` / ${record.totalItems}` : ''}`;
    return { id: record.id, key: source.key, type: source.type, title, farmer, association: record.farmerAssociation || '', progress, savedAt: record.savedAt || '', href: `${source.path}?draft=${encodeURIComponent(record.id)}`,
      search: `${farmer} ${title} ${source.type} ${record.farmerAssociation || ''}`,
      cells: [farmer, source.type, title, record.farmerAssociation || '—', progress, date(record.savedAt)] };
  }, ['Action', 'Farmer', 'Evaluation', 'Questionnaire', 'Association', 'Score / Ratings', 'Last Saved']);
});
