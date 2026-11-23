document.addEventListener('DOMContentLoaded', () => {
  const types = {
    'pre-test': { key: 'tmis-pre-test-encoded', label: 'Pre-test' },
    'post-test': { key: 'tmis-post-test-encoded', label: 'Post-test' },
    'training-evaluation': { key: 'tmis-training-evaluation-encoded', label: 'Training Evaluation' },
    'rp-evaluation': { key: 'tmis-rp-evaluation-encoded', label: 'Resource Person Evaluation' },
  };
  const type = types[document.body.dataset.encodedType];
  const $ = (id) => document.getElementById(id);
  if (!type || !$('encodedTable')) return;
  const table = $('encodedTable');
  const rows = $('encodedRows');
  const columnFields = [
    ['farmerName', 'Farmer'], ['questionnaireName', 'Questionnaire'],
    ['resourcePersonName', 'Resource person'], ['implementingOffice', 'Implementing office'],
    ['date', 'Date conducted'], ['result', 'Result'], ['savedAt', 'Submitted'],
  ];
  const filterRow = document.createElement('tr');
  filterRow.className = 'encoded-column-filters';
  filterRow.innerHTML = '<th></th>' + columnFields.map(([key, label]) => `<th><label class="visually-hidden" for="encodedColumn${key}">Search ${label}</label><input id="encodedColumn${key}" class="form-control form-control-sm" type="search" data-encoded-column="${key}" placeholder="Search" aria-label="Search ${label}"></th>`).join('');
  table.tHead.append(filterRow);
  const columnFilters = [...filterRow.querySelectorAll('[data-encoded-column]')];
  const search = $('encodedSearch');
  const organization = $('encodedOrganization');
  const office = $('encodedOffice');
  const resourcePerson = $('encodedResourcePerson');
  const refresh = $('refreshEncoded');
  const exportButton = $('exportEncoded');
  const sizes = [...document.querySelectorAll('[data-encoded-size]')];
  const pagers = [...document.querySelectorAll('[data-encoded-pagination]')];
  const dialog = bootstrap.Modal.getOrCreateInstance($('encodedAnswerModal'));
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const date = (value) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString() : '-';
  const submitted = (value) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString() : '-';
  let records = [];
  let page = 1;
  let pageSize = 10;
  let readError = false;
  let loadTimer = null;
  let firstLoad = true;
  const loadingStatus = document.createElement('span');
  loadingStatus.className = 'visually-hidden';
  loadingStatus.setAttribute('role', 'status');
  loadingStatus.setAttribute('aria-live', 'polite');
  table.after(loadingStatus);

  function result(record) {
    if (['pre-test', 'post-test'].includes(document.body.dataset.encodedType)) {
      return record.score == null ? '-' : `${record.score}${record.totalItems ? ` / ${record.totalItems}` : ''}`;
    }
    const ratings = Array.isArray(record.ratings) ? record.ratings : [];
    return `${ratings.filter((item) => item?.rating != null).length} / ${ratings.length} rated`;
  }
  function matching() {
    const needle = search.value.trim().toLowerCase();
    return records.filter((record) =>
      (!organization.value || record.farmerAssociation === organization.value)
      && (!office.value || record.implementingOffice === office.value)
      && (!resourcePerson?.value || record.resourcePersonName === resourcePerson.value)
      && (!needle || [record.farmerName, record.questionnaireName, record.implementingOffice, record.resourcePersonName, record.farmerAssociation, record.id].join(' ').toLowerCase().includes(needle))
      && columnFilters.every((input) => {
        const query = input.value.trim().toLowerCase();
        if (!query) return true;
        const key = input.dataset.encodedColumn;
        const value = key === 'result' ? result(record) : key === 'date' ? date(record.date) : key === 'savedAt' ? submitted(record.savedAt) : record[key];
        return String(value ?? '').toLowerCase().includes(query);
      }));
  }
  function updateOptions(select, values, label) {
    const previous = select.value;
    select.replaceChildren(new Option(label, ''));
    [...new Map(values.filter((item) => item.value).map((item) => [item.value, item])).values()].sort((a, b) => a.label.localeCompare(b.label)).forEach(({ label: text, value }) => select.add(new Option(text, value)));
    select.value = [...select.options].some((option) => option.value === previous) ? previous : '';
  }
  function refreshOptions() {
    updateOptions(organization, records.map((record) => ({ label: record.farmerAssociation || '', value: record.farmerAssociation || '' })), 'All organizations');
    updateOptions(office, records.map((record) => ({ label: record.implementingOffice || '', value: record.implementingOffice || '' })), 'All offices');
    if (resourcePerson) updateOptions(resourcePerson, records.map((record) => ({ label: record.resourcePersonName || '', value: record.resourcePersonName || '' })), 'All resource persons');
  }
  function render() {
    const found = matching();
    const pages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(found.length / pageSize));
    page = Math.min(Math.max(page, 1), pages);
    const start = pageSize === Infinity ? 0 : (page - 1) * pageSize;
    const shown = pageSize === Infinity ? found : found.slice(start, start + pageSize);
    rows.innerHTML = shown.map((record) => {
      const path = `../encode/${document.body.dataset.encodedType}`;
      const id = encodeURIComponent(record.id);
      return `<tr><td class="encoded-actions"><a class="btn encoded-view" href="${path}?mode=view&record=${id}" target="_blank" rel="noopener noreferrer" aria-label="View ${escape(record.farmerName || 'evaluation')} result in a new tab"><i class="bi bi-eye" aria-hidden="true"></i> View</a><a class="btn encoded-view" href="${path}?mode=edit&record=${id}" target="_blank" rel="noopener noreferrer" aria-label="Edit ${escape(record.farmerName || 'evaluation')} result in a new tab"><i class="bi bi-pencil-square" aria-hidden="true"></i> Edit</a></td><td>${escape(record.farmerName || '-')}</td><td>${escape(record.questionnaireName || '-')}</td><td>${escape(record.resourcePersonName || '-')}</td><td>${escape(record.implementingOffice || '-')}</td><td>${date(record.date)}</td><td>${escape(result(record))}</td><td>${submitted(record.savedAt)}</td></tr>`;
    }).join('') || `<tr><td colspan="8" class="encoded-empty">${readError ? 'Saved results could not be read.' : 'No submitted results found.'}</td></tr>`;
    pagers.forEach((pager) => { pager.innerHTML = `<span>${found.length ? start + 1 : 0}-${Math.min(start + shown.length, found.length)} of ${found.length}</span><div class="d-flex gap-2 align-items-center"><button class="btn btn-sm btn-outline-secondary" data-page="previous" ${page === 1 ? 'disabled' : ''}>Previous</button><span>Page ${page} of ${pages}</span><button class="btn btn-sm btn-outline-secondary" data-page="next" ${page === pages ? 'disabled' : ''}>Next</button></div>`; });
    sizes.forEach((size) => { size.value = pageSize === Infinity ? 'all' : String(pageSize); });
    exportButton.disabled = found.length === 0;
  }
  async function load(fetchLatest = false) {
    if (loadTimer) window.clearTimeout(loadTimer);
    refresh.disabled = true;
    refresh.classList.add('is-loading');
    refresh.setAttribute('aria-label', 'Refreshing encoded results');
    exportButton.disabled = true;
    table.setAttribute('aria-busy', 'true');
    table.classList.add('is-loading');
    loadingStatus.textContent = 'Loading encoded results';
    rows.innerHTML = '<tr class="encoded-loading-label"><td colspan="8"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading encoded results...</td></tr>'
      + Array.from({ length: 4 }, () => '<tr class="encoded-loading-row" aria-hidden="true">' + Array.from({ length: 8 }, () => '<td><span class="encoded-loading-bar"></span></td>').join('') + '</tr>').join('');
    const delay = firstLoad ? 850 : 300;
    firstLoad = false;
    loadTimer = window.setTimeout(async () => {
      loadTimer = null;
      readError = false;
      try {
        if (fetchLatest && window.TMIS_PAGE) await window.TmisStore.refresh();
        const saved = JSON.parse(window.TmisStore.getItem(type.key) || '[]');
        if (!Array.isArray(saved)) throw new Error('Invalid saved results');
        records = saved.filter((record) => record?.id && record.status === 'complete').sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
      } catch (error) {
        readError = true;
        loadingStatus.textContent = error.message || 'Encoded results could not be refreshed.';
        if (typeof window.showQuestionnaireToast === 'function') window.showQuestionnaireToast(loadingStatus.textContent, 'error');
        else window.alert(loadingStatus.textContent);
      }
      refreshOptions();
      render();
      table.setAttribute('aria-busy', 'false');
      table.classList.remove('is-loading');
      refresh.disabled = false;
      refresh.classList.remove('is-loading');
      refresh.setAttribute('aria-label', 'Refresh encoded results');
      loadingStatus.textContent = readError ? 'Encoded results could not be loaded' : 'Encoded results loaded';
    }, delay);
  }
  function metadata(record) {
    const fields = [
      ['Farmer', record.farmerName],
      ['Farmer association', record.farmerAssociation],
      ['Questionnaire', record.questionnaireName],
      ['Implementing office', record.implementingOffice],
      ['Date conducted', date(record.date)],
    ];
    if (document.body.dataset.encodedType === 'rp-evaluation') {
      fields.splice(3, 0, ['Resource person', record.resourcePersonName], ['Resource person office', record.resourcePersonOffice]);
    }
    return `<dl class="encoded-answer-meta">${fields.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value || '-')}</dd></div>`).join('')}</dl>`;
  }
  function showAnswers(record) {
    $('encodedAnswerTitle').textContent = `${type.label} answers`;
    let answers;
    if (['pre-test', 'post-test'].includes(document.body.dataset.encodedType)) {
      answers = `<div class="encoded-score"><span>Farmer score</span><strong>${escape(result(record))}</strong></div>${record.commodity ? `<p class="encoded-note"><strong>Commodity:</strong> ${escape(record.commodity)}</p>` : ''}`;
    } else {
      const ratings = Array.isArray(record.ratings) ? record.ratings : [];
      answers = ratings.length ? `<div class="encoded-answer-scroll"><table class="table encoded-answer-table"><thead><tr><th>#</th><th>Question</th><th>Rating</th></tr></thead><tbody>${ratings.map((item, index) => `<tr><td>${index + 1}</td><td>${escape(item?.question || '-')}</td><td>${item?.rating == null ? '-' : escape(item.rating)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="encoded-note">No question ratings were saved.</p>';
      if (record.comments) answers += `<div class="encoded-comments"><strong>Comments / feedback / suggestions</strong><p>${escape(record.comments)}</p></div>`;
    }
    $('encodedAnswerBody').innerHTML = metadata(record) + answers;
    dialog.show();
  }

  search.addEventListener('input', () => { page = 1; render(); });
  columnFilters.forEach((input) => input.addEventListener('input', () => { page = 1; render(); }));
  [organization, office, resourcePerson].filter(Boolean).forEach((select) => select.addEventListener('change', () => { page = 1; render(); }));
  $('clearEncodedFilters').addEventListener('click', () => { organization.value = ''; office.value = ''; if (resourcePerson) resourcePerson.value = ''; search.value = ''; columnFilters.forEach((input) => { input.value = ''; }); page = 1; render(); });
  refresh.addEventListener('click', () => load(true));
  exportButton.addEventListener('click', () => {
    const found = matching();
    if (!found.length) return;
    if (typeof XLSX === 'undefined') { window.alert('Excel export is unavailable. Reload the page and try again.'); return; }
    const isTest = ['pre-test', 'post-test'].includes(document.body.dataset.encodedType);
    const book = XLSX.utils.book_new();
    const summary = found.map((record) => ({
      'Record ID': record.id || '',
      'Farmer': record.farmerName || '',
      'Farmer Association / Organization': record.farmerAssociation || '',
      'Questionnaire ID': record.questionnaireId || '',
      'Questionnaire': record.questionnaireName || '',
      'Resource Person': record.resourcePersonName || '',
      'Resource Person Office': record.resourcePersonOffice || '',
      'Implementing Office': record.implementingOffice || '',
      'Date Conducted': record.date || '',
      'Result': result(record),
      'Score': isTest ? record.score ?? '' : '',
      'Total Items': isTest ? record.totalItems ?? '' : '',
      'Commodity': isTest ? record.commodity || '' : '',
      'Comments': record.comments || '',
      'Submitted': submitted(record.savedAt),
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    summarySheet['!cols'] = [36, 28, 34, 36, 36, 28, 28, 30, 17, 18, 12, 12, 22, 36, 23].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, summarySheet, 'Results');
    if (!isTest) {
      const answers = found.flatMap((record) => (Array.isArray(record.ratings) ? record.ratings : []).map((item, index) => ({
        'Record ID': record.id || '',
        'Farmer': record.farmerName || '',
        'Questionnaire': record.questionnaireName || '',
        'Question Number': index + 1,
        'Question': item?.question || '',
        'Rating': item?.rating ?? '',
      })));
      const answerSheet = XLSX.utils.json_to_sheet(answers.length ? answers : [{ 'Record ID': '', 'Farmer': '', 'Questionnaire': '', 'Question Number': '', 'Question': '', 'Rating': '' }]);
      answerSheet['!cols'] = [36, 28, 36, 18, 70, 12].map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(book, answerSheet, 'Answers');
    }
    XLSX.writeFile(book, `encoded-${document.body.dataset.encodedType}-results.xlsx`);
  });
  sizes.forEach((size) => size.addEventListener('change', () => { pageSize = size.value === 'all' ? Infinity : Number(size.value); page = 1; render(); }));
  pagers.forEach((pager) => pager.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    page += button.dataset.page === 'next' ? 1 : -1;
    render();
  }));
  rows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    const record = records.find((item) => item.id === button.dataset.view);
    if (record) showAnswers(record);
  });
  load();
  window.addEventListener('pageshow', (event) => { if (event.persisted) load(); });
});
