document.addEventListener('DOMContentLoaded', () => {
  const sources = [
    ['tmis-pre-test-questionnaires', 'Pre-test', '../id/edit-pre-test', '../id/view-pre-test'],
    ['tmis-post-test-questionnaires', 'Post-test', '../id/edit-post-test', '../id/view-post-test'],
    ['tmis-rp-evaluation-questionnaires', 'Resource Person', '../id/edit-rp-evaluation', '../id/view-rp-evaluation'],
    ['tmis-training-evaluation-questionnaires', 'Training Evaluation', '../id/edit-training-evaluation', '../id/view-training-evaluation'],
  ];
  const $ = (selector) => document.querySelector(selector);
  const rows = $('#questionnaireRows');
  if (!rows) return;
  const inactiveOnly = document.body.dataset.questionnaireStatus === 'inactive';
  const filters = ['type', 'office', 'region'].map((name) => $(`#${name}Filter`));
  const columns = [...document.querySelectorAll('[data-column-filter]')];
  const pagers = [...document.querySelectorAll('[data-questionnaire-pagination]')];
  const sizes = [...document.querySelectorAll('[data-page-size]')];
  const search = $('#questionnaireSearch');
  const table = $('#questionnaireTable');
  const refresh = $('#refreshQuestionnaires');
  let records = [], page = 1, pageSize = 10, pendingDelete = null;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const date = (value) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString() : '-';
  const can = (permission) => window.TmisStore.can(permission);
  const sample = { id: 'QUE-SAMPLE-001', title: 'Good Agricultural Practices Pre-test', type: 'Pre-test', status: 'Sample', region: 'Region IV-A', office: 'DA Regional Field Office - Region IV-A', count: 20, createdAt: new Date().toISOString(), description: 'Example of a recently submitted questionnaire.', view: '../id/view-pre-test', sample: true };

  function updateOptions(select, values, label) {
    const previous = select.value;
    const choices = [...new Set(values.filter(Boolean))].sort();
    select.innerHTML = `<option value="">${label}</option>` + choices.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
    select.value = choices.includes(previous) ? previous : '';
  }
  function read() {
    records = sources.flatMap(([key, type, edit, view]) => {
      try {
        const saved = JSON.parse(window.TmisStore.getItem(key) || '[]');
        return (Array.isArray(saved) ? saved : []).filter((item) => item && typeof item === 'object').map((item) => ({
          id: String(item.id || ''), title: item.trainingQuestionnaire || item.questionnaireName || 'Untitled questionnaire', type,
          status: item.status || 'Active', region: item.region || '', office: item.implementingOffice || item.office || '',
          count: ['Pre-test', 'Post-test'].includes(type) ? Number(item.totalItems) || 0 : Array.isArray(item.questions) ? item.questions.length : 0,
          createdAt: item.createdAt || item.updatedAt || '', description: item.description || '',
          questions: Array.isArray(item.questions) ? item.questions : [],
          ratingScale: Array.isArray(item.ratingScale) ? item.ratingScale : [], key, edit, view,
        }));
      } catch { return []; }
    }).filter((item) => !inactiveOnly || item.status.toLowerCase() === 'inactive')
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (!window.TMIS_PAGE && !records.length && !inactiveOnly) records = [sample];
    updateOptions(filters[1], records.filter((item) => !filters[2].value || item.region === filters[2].value).map((item) => item.office), 'All offices');
    updateOptions(filters[2], records.map((item) => item.region), 'All regions');
    render();
  }
  async function loadTable(fetchLatest = false) {
    table.setAttribute('aria-busy', 'true');
    refresh.disabled = true;
    rows.innerHTML = `<tr class="questionnaire-loading-row"><td colspan="9"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span role="status">Loading ${inactiveOnly ? 'inactive ' : ''}questionnaires...</span></td></tr>`;
    try {
      if (fetchLatest && window.TMIS_PAGE) await window.TmisStore.refresh();
      read();
    } catch (error) {
      const message = error.message || 'Questionnaires could not be refreshed.';
      if (typeof window.showQuestionnaireToast === 'function') window.showQuestionnaireToast(message, 'error');
      else window.alert(message);
    } finally {
      table.setAttribute('aria-busy', 'false');
      refresh.disabled = false;
    }
  }
  function matching() {
    const needle = search.value.trim().toLowerCase();
    return records.filter((item) => filters.every((select, index) => !select.value || item[['type', 'office', 'region'][index]] === select.value)
      && (!needle || `${item.id} ${item.title}`.toLowerCase().includes(needle))
      && columns.every((input) => !input.value.trim() || String(input.dataset.columnFilter === 'createdAt' ? date(item.createdAt) : item[input.dataset.columnFilter] ?? '').toLowerCase().includes(input.value.trim().toLowerCase())));
  }
  function render() {
    const found = matching(), pages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(found.length / pageSize));
    page = Math.min(Math.max(1, page), pages);
    const start = pageSize === Infinity ? 0 : (page - 1) * pageSize;
    const shown = pageSize === Infinity ? found : found.slice(start, start + pageSize);
    rows.innerHTML = shown.map((item) => {
      const actions = [
        can('questionnaires.read') ? `<a class="btn btn-sm btn-outline-success" href="${window.TmisStore.escape(item.view)}/${encodeURIComponent(item.id)}" target="_blank" rel="noopener noreferrer" aria-label="View ${item.sample ? 'sample' : esc(item.title)} in a new tab" title="View in new tab"><i class="bi bi-eye"></i></a>` : '',
        !item.sample && can('questionnaires.edit') ? `<a class="btn btn-sm btn-outline-primary" href="${window.TmisStore.escape(item.edit)}/${encodeURIComponent(item.id)}" target="_blank" rel="noopener noreferrer" aria-label="Edit ${esc(item.title)} in new tab" title="Edit in new tab"><i class="bi bi-pencil-square"></i></a>` : '',
        !item.sample && can('questionnaires.delete') ? `<button class="btn btn-sm btn-outline-danger" type="button" data-action="delete" data-id="${esc(item.id)}" data-type="${esc(item.type)}" aria-label="Delete ${esc(item.title)}" title="Delete"><i class="bi bi-trash"></i></button>` : '',
      ].join('');
      return `<tr><td><div class="questionnaire-actions">${actions}</div></td>
      <td><span class="badge ${['draft', 'inactive'].includes(item.status.toLowerCase()) ? 'text-bg-secondary' : item.sample ? 'text-bg-info' : 'text-bg-success'}">${esc(item.status)}</span></td>
      <td class="questionnaire-id" title="${esc(item.id)}">${esc(item.id)}</td><td>${esc(item.title)}</td><td>${esc(item.type)}</td><td>${esc(item.region || '-')}</td><td>${esc(item.office || '-')}</td><td>${window.TmisStore.escape(item.count)}</td><td>${date(item.createdAt)}</td></tr>`;
    }).join('') || `<tr><td colspan="9" class="text-center py-4">No ${inactiveOnly ? 'inactive ' : ''}questionnaires found.</td></tr>`;
    pagers.forEach((pager) => { pager.innerHTML = `<span>${found.length ? start + 1 : 0}-${Math.min(start + shown.length, found.length)} of ${found.length}</span><div class="d-flex gap-2 align-items-center"><button class="btn btn-sm btn-outline-secondary" data-page="first" ${page === 1 ? 'disabled' : ''} aria-label="First page">&laquo;</button><button class="btn btn-sm btn-outline-secondary" data-page="previous" ${page === 1 ? 'disabled' : ''}>Previous</button><span>Page ${page} of ${pages}</span><button class="btn btn-sm btn-outline-secondary" data-page="next" ${page === pages ? 'disabled' : ''}>Next</button><button class="btn btn-sm btn-outline-secondary" data-page="last" ${page === pages ? 'disabled' : ''} aria-label="Last page">&raquo;</button></div>`; });
    sizes.forEach((select) => { select.value = pageSize === Infinity ? 'all' : String(pageSize); });
  }
  [...filters, search, ...columns].forEach((input) => input.addEventListener('input', () => { page = 1; render(); }));
  $('#clearQuestionnaireFilters').addEventListener('click', () => {
    [...filters, search, ...columns].forEach((input) => { input.value = ''; });
    updateOptions(filters[1], records.map((item) => item.office), 'All offices');
    page = 1;
    render();
  });
  filters[2].addEventListener('change', () => {
    updateOptions(filters[1], records.filter((item) => !filters[2].value || item.region === filters[2].value).map((item) => item.office), 'All offices');
    page = 1; render();
  });
  sizes.forEach((select) => select.addEventListener('change', () => { pageSize = select.value === 'all' ? Infinity : Number(select.value); page = 1; render(); }));
  pagers.forEach((pager) => pager.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]'); if (!button) return;
    const last = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(matching().length / pageSize));
    page = { first: 1, previous: page - 1, next: page + 1, last }[button.dataset.page]; render();
  }));
  refresh.addEventListener('click', () => loadTable(true));
  $('#exportQuestionnaires').addEventListener('click', () => {
    const data = matching().filter((item) => !item.sample).map((item) => ({ Status: item.status, 'Questionnaire ID': item.id, 'Questionnaire Title': item.title, 'Questionnaire Type': item.type, Region: item.region, 'Implementing Office': item.office, 'Number of Items': item.count, 'Date Created': date(item.createdAt) }));
    if (!data.length) return;
    const book = XLSX.utils.book_new(), sheet = XLSX.utils.json_to_sheet(data);
    sheet['!cols'] = [14, 38, 46, 23, 20, 38, 18, 18].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, sheet, inactiveOnly ? 'Inactive Questionnaires' : 'Questionnaires'); XLSX.writeFile(book, inactiveOnly ? 'inactive-questionnaires.xlsx' : 'questionnaires.xlsx');
  });
  rows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const item = records.find((record) => record.id === button.dataset.id && record.type === button.dataset.type);
    if (!item) return;
    if (button.dataset.action === 'delete') {
      pendingDelete = item; $('[data-delete-title]').textContent = item.title;
      $('[data-delete-details]').innerHTML = `<div><dt>Questionnaire ID</dt><dd>${esc(item.id)}</dd></div><div><dt>Type</dt><dd>${esc(item.type)}</dd></div><div><dt>Region</dt><dd>${esc(item.region || '-')}</dd></div><div><dt>Office</dt><dd>${esc(item.office || '-')}</dd></div><div><dt>Items</dt><dd>${window.TmisStore.escape(item.count)}</dd></div><div><dt>Status</dt><dd>${esc(item.status)}</dd></div>`;
      bootstrap.Modal.getOrCreateInstance($('#deleteQuestionnaireDialog')).show(); return;
    }
  });
  function showUndo(item, original, position) {
    const toast = document.createElement('div');
    toast.className = 'questionnaire-undo-notice';
    toast.innerHTML = `<span><strong>${esc(item.title)}</strong> deleted.</span><button type="button" class="btn btn-sm btn-light">Undo (<span data-seconds>10</span>s)</button>`;
    $('#questionnaireUndoStack').append(toast);
    const deadline = Date.now() + 10000;
    const countdown = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      toast.querySelector('[data-seconds]').textContent = remaining;
      if (!remaining) { window.clearInterval(countdown); toast.remove(); }
    }, 200);
    toast.querySelector('button').addEventListener('click', async () => {
      if (Date.now() >= deadline) return;
      try {
        const saved = JSON.parse(window.TmisStore.getItem(item.key) || '[]');
        if (!Array.isArray(saved)) throw new Error('Invalid questionnaire data');
        if (!saved.some((entry) => entry.id === item.id)) {
          saved.splice(Math.min(position, saved.length), 0, original);
          await window.TmisStore.setItem(item.key, JSON.stringify(saved));
        }
        window.clearInterval(countdown);
        toast.remove();
        read();
      } catch { toast.querySelector('span').textContent = 'Could not restore the questionnaire. Please try again.'; }
    });
  }
  $('#confirmDeleteQuestionnaire').addEventListener('click', async () => {
    if (!pendingDelete) return;
    try {
      const saved = JSON.parse(window.TmisStore.getItem(pendingDelete.key) || '[]');
      if (!Array.isArray(saved)) throw new Error('Invalid questionnaire data');
      const position = saved.findIndex((item) => item.id === pendingDelete.id);
      if (position < 0) throw new Error('Questionnaire missing');
      const original = saved[position];
      await window.TmisStore.setItem(pendingDelete.key, JSON.stringify(saved.filter((item) => item.id !== pendingDelete.id)));
      bootstrap.Modal.getOrCreateInstance($('#deleteQuestionnaireDialog')).hide();
      showUndo(pendingDelete, original, position);
      pendingDelete = null;
      read();
    } catch { alert('The questionnaire could not be deleted. Please try again.'); }
  });
  loadTable();
});
