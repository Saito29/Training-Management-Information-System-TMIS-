document.addEventListener('DOMContentLoaded', () => {
  const configs = {
    'pre-test': { key: 'tmis-pre-test-questionnaires', label: 'Pre-test', test: true, form: 'preTestRegisterForm' },
    'post-test': { key: 'tmis-post-test-questionnaires', label: 'Post-test', test: true, form: 'postTestRegisterForm' },
    'training-evaluation': { key: 'tmis-training-evaluation-questionnaires', label: 'Training Evaluation', rows: 'trainingQuestionRows', preview: 'trainingRatingPreview', guide: 'trainingRatingGuide', form: 'trainingEvaluationForm' },
    'rp-evaluation': { key: 'tmis-rp-evaluation-questionnaires', label: 'Resource Person Evaluation', rows: 'rpQuestionRows', preview: 'rpRatingPreview', guide: 'rpRatingGuide', form: 'rpEvaluationForm' },
  };
  const config = configs[document.body.dataset.questionnaireType];
  const id = window.TmisStore.selectedId();
  const form = document.getElementById(config?.form);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  if (!form) return;
  form.addEventListener('submit', (event) => event.preventDefault());
  const showError = (message) => {
    form.innerHTML = `<div class="card view-record-message"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><p>${esc(message)}</p><a href="../details/list-questionnaire">Back to Questionnaire List</a></div>`;
  };
  if (!id) { showError('No questionnaire ID was provided. Select a record from the questionnaire list.'); return; }

  let record;
  try {
    const saved = JSON.parse(window.TmisStore.getItem(config.key) || '[]');
    record = Array.isArray(saved) ? saved.find((item) => item?.id === id) : null;
  } catch { showError('The saved questionnaires could not be read.'); return; }
  const sample = id === 'QUE-SAMPLE-001' && config.test && config.label === 'Pre-test';
  if (!record && sample) record = { id, trainingQuestionnaire: 'Good Agricultural Practices Pre-test', region: 'Region IV-A', implementingOffice: 'DA Regional Field Office - Region IV-A', totalItems: 20, description: 'Example of a recently submitted questionnaire.', status: 'Sample' };
  if (!record) { showError('This questionnaire was not found. It may have been deleted.'); return; }
  const statusBadge = document.createElement('span');
  const recordStatus = String(record.status || 'Active');
  statusBadge.className = 'questionnaire-status-badge';
  statusBadge.dataset.status = recordStatus.toLowerCase();
  statusBadge.setAttribute('aria-label', 'Questionnaire status');
  statusBadge.textContent = recordStatus;
  document.querySelector('.content-header')?.insertAdjacentElement('afterend', statusBadge);

  function setSelect(name, value) {
    const select = form.elements[name];
    if (!select) return;
    if (value && ![...select.options].some((option) => option.value === value)) select.add(new Option(value, value));
    select.value = value || '';
  }
  function setValue(name, value) {
    if (form.elements[name]) form.elements[name].value = value ?? '';
  }
  const title = record.trainingQuestionnaire || record.questionnaireName || '';
  const office = record.implementingOffice || record.office || '';
  const questions = Array.isArray(record.questions) ? record.questions : [];
  const ratings = Array.isArray(record.ratingScale) ? record.ratingScale : [];
  const date = record.createdAt || record.updatedAt;
  document.title = `View ${title || config.label} | TMIS`;
  document.querySelector('.content-info').textContent = 'Read-only view of the saved questionnaire registration.';

  if (config.test) {
    setValue('training_questionnaire', title);
    setSelect('region', record.region);
    setSelect('implementing_office', office);
    setValue('total_items', record.totalItems);
    setValue('description', record.description);
    form.querySelector('[type="submit"]')?.closest('.col-12')?.remove();
    const tips = document.querySelector('.card-tips');
    if (tips) tips.innerHTML = `<div class="card-body"><h5 class="card-tips-title">Record Overview</h5><dl class="view-meta-list"><div><dt>Questionnaire ID</dt><dd>${esc(id)}</dd></div><div><dt>Status</dt><dd>${esc(record.status || 'Active')}</dd></div><div><dt>Date Created</dt><dd>${date ? esc(new Date(date).toLocaleString()) : '—'}</dd></div></dl></div>`;
  } else {
    setValue('questionnaireName', title);
    setSelect('region', record.region);
    setSelect('office', office);
    setValue('description', record.description);
    const rows = document.getElementById(config.rows);
    rows.innerHTML = questions.length ? questions.map((question, index) => `<tr><th scope="row">${index + 1}</th><td><textarea class="form-control rp-question-input" rows="2" readonly aria-label="Question ${index + 1}">${esc(typeof question === 'string' ? question : question?.text || '')}</textarea></td><td>1–5 (fixed)</td><td></td></tr>`).join('') : '<tr><td class="rp-question-empty" colspan="4">No questions were saved.</td></tr>';
    const preview = document.getElementById(config.preview);
    preview.innerHTML = ratings.map((rating) => `<div class="view-rating-preview"><strong>${esc(rating?.score ?? '')}</strong><input class="rp-preview-label" type="text" value="${esc(rating?.label || '')}" readonly aria-label="Rating ${esc(rating?.score ?? '')} label"></div>`).join('');
    const guide = document.getElementById(config.guide);
    guide.innerHTML = ratings.map((rating) => `<li><label class="rp-rating-label"><strong>${esc(rating?.score ?? '')}</strong><input class="form-control" type="text" value="${esc(rating?.label || '')}" readonly aria-label="Rating ${esc(rating?.score ?? '')} label"></label><textarea class="form-control rp-rating-description" rows="2" readonly aria-label="Rating ${esc(rating?.score ?? '')} description">${esc(rating?.description || '')}</textarea></li>`).join('') || '<li>No rating scale was saved.</li>';
    document.querySelectorAll('[data-add-question], .rp-form-actions').forEach((element) => element.remove());
    const tips = document.querySelector('.rp-tips');
    if (tips) tips.innerHTML = `<h2><i class="bi bi-info-circle" aria-hidden="true"></i> Record Overview</h2><dl class="view-meta-list"><div><dt>Questionnaire ID</dt><dd>${esc(id)}</dd></div><div><dt>Status</dt><dd>${esc(record.status || 'Active')}</dd></div><div><dt>Date Created</dt><dd>${date ? esc(new Date(date).toLocaleString()) : '—'}</dd></div></dl>`;
  }

  form.querySelectorAll('input:not([type="hidden"]), textarea').forEach((control) => {
    control.readOnly = true;
    control.setAttribute('aria-readonly', 'true');
  });
  form.querySelectorAll('select').forEach((control) => { control.disabled = true; });
  form.querySelectorAll('button').forEach((button) => button.remove());
  form.querySelectorAll('textarea').forEach((control) => { control.style.height = `${control.scrollHeight + 2}px`; });
});
