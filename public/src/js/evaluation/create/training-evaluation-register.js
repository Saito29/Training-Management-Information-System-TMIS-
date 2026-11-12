document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('trainingEvaluationForm');
  if (!form) return;

  const byId = (id) => document.getElementById(id);
  const rows = byId('trainingQuestionRows');
  const status = byId('trainingEvaluationStatus');
  const preview = byId('trainingRatingPreview');
  const guide = byId('trainingRatingGuide');
  const previewContext = byId('ratingPreviewContext');
  const storageKey = 'tmis-training-evaluation-questionnaires';
  const createTemporaryId = () => `Q-TEMP-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const ratingScale = [
    { score: 5, label: 'Very Good', description: 'Training quality is excellent and exceeds expectations.', tone: 'very-good' },
    { score: 4, label: 'Good', description: 'Training quality is above average and meets expectations.', tone: 'good' },
    { score: 3, label: 'Neutral', description: 'Training quality is average and meets expectations.', tone: 'neutral' },
    { score: 2, label: 'Not Good', description: 'Training quality is below average and needs improvement.', tone: 'poor' },
    { score: 1, label: 'Very Not Good', description: 'Training quality is poor and requires significant improvement.', tone: 'very-poor' },
  ];
  const questions = [];
  let selectedIndex = -1;
  let recordId = null;

  function message(value, state = 'info') {
    status.textContent = value;
    status.dataset.state = state;
    if (state === 'success' || state === 'error') window.showQuestionnaireToast(value, state);
  }

  function renderRating() {
    const current = questions[selectedIndex];
    previewContext.textContent = current
      ? `Question ${selectedIndex + 1} uses the fixed 1-5 rating scale.`
      : 'This fixed 1-5 scale applies to every question.';
    preview.replaceChildren();
    guide.replaceChildren();
    ratingScale.forEach((item) => {
      const tile = document.createElement('div');
      tile.className = `rp-rating-${item.tone}`;
      tile.dataset.score = String(item.score);
      const score = document.createElement('strong');
      score.textContent = String(item.score);
      const label = document.createElement('input');
      label.type = 'text';
      label.className = 'rp-preview-label';
      label.value = item.label;
      label.maxLength = 40;
      label.dataset.ratingLabel = String(item.score);
      label.setAttribute('aria-label', `Preview label for rating ${item.score}`);
      tile.append(score, label);
      preview.append(tile);

      const guideItem = document.createElement('li');
      const title = document.createElement('label');
      title.className = 'rp-rating-label';
      const scoreLabel = document.createElement('strong');
      scoreLabel.textContent = String(item.score);
      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'form-control';
      labelInput.value = item.label;
      labelInput.maxLength = 40;
      labelInput.dataset.ratingLabel = String(item.score);
      labelInput.setAttribute('aria-label', `Label for rating ${item.score}`);
      title.append(scoreLabel, labelInput);
      const description = document.createElement('textarea');
      description.className = 'form-control rp-rating-description';
      description.rows = 2;
      description.maxLength = 200;
      description.value = item.description;
      description.dataset.ratingDescription = String(item.score);
      description.setAttribute('aria-label', `Description for rating ${item.score}`);
      guideItem.append(title, description);
      guide.append(guideItem);
    });
  }

  function syncRatingLabel(event) {
    const input = event.target.closest('[data-rating-label]');
    if (!input) return;
    const item = ratingScale.find((entry) => entry.score === Number(input.dataset.ratingLabel));
    if (!item) return;
    item.label = input.value;
    [preview, guide].forEach((section) => {
      const other = section.querySelector(`[data-rating-label="${item.score}"]`);
      if (other && other !== input) other.value = input.value;
    });
  }
  preview.addEventListener('input', syncRatingLabel);
  guide.addEventListener('input', syncRatingLabel);
  guide.addEventListener('input', (event) => {
    const input = event.target.closest('[data-rating-description]');
    if (!input) return;
    const item = ratingScale.find((entry) => entry.score === Number(input.dataset.ratingDescription));
    if (item) item.description = input.value;
  });

  function renderQuestions() {
    rows.replaceChildren();
    if (!questions.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.className = 'rp-question-empty';
      cell.textContent = 'No questions yet. Select Add Question to create the first one.';
      row.append(cell);
      rows.append(row);
    }
    questions.forEach((question, index) => {
      const row = document.createElement('tr');
      row.dataset.index = String(index);
      if (index === selectedIndex) row.classList.add('is-selected');
      const number = document.createElement('th');
      number.scope = 'row';
      number.textContent = String(index + 1);
      const content = document.createElement('td');
      const input = document.createElement('textarea');
      input.className = 'form-control rp-question-input';
      input.rows = 2;
      input.maxLength = 300;
      input.value = question.text;
      input.placeholder = 'Enter a question about the training';
      input.setAttribute('aria-label', `Question ${index + 1}`);
      content.append(input);
      const rating = document.createElement('td');
      rating.textContent = '1-5 (fixed)';
      const actions = document.createElement('td');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-sm btn-outline-danger';
      remove.dataset.deleteQuestion = String(index);
      remove.setAttribute('aria-label', `Delete question ${index + 1}`);
      remove.innerHTML = '<i class="bi bi-trash" aria-hidden="true"></i><span>Delete</span>';
      actions.append(remove);
      row.append(number, content, rating, actions);
      rows.append(row);
    });
    renderRating();
  }

  document.querySelectorAll('[data-add-question]').forEach((button) => button.addEventListener('click', () => {
    questions.push({ text: '' });
    selectedIndex = questions.length - 1;
    renderQuestions();
    rows.lastElementChild?.querySelector('textarea')?.focus();
    message('New question added. Enter its text. The rating scale is fixed at 1-5.');
  }));

  rows.addEventListener('focusin', (event) => {
    const row = event.target.closest('tr[data-index]');
    if (!row) return;
    selectedIndex = Number(row.dataset.index);
    rows.querySelectorAll('tr').forEach((item) => item.classList.toggle('is-selected', item === row));
    renderRating();
  });
  rows.addEventListener('input', (event) => {
    const row = event.target.closest('tr[data-index]');
    if (!row || !event.target.matches('.rp-question-input')) return;
    questions[Number(row.dataset.index)].text = event.target.value;
    if (selectedIndex === Number(row.dataset.index)) renderRating();
  });
  rows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-question]');
    if (!button) return;
    const index = Number(button.dataset.deleteQuestion);
    questions.splice(index, 1);
    if (index < selectedIndex) selectedIndex -= 1;
    selectedIndex = Math.min(selectedIndex, questions.length - 1);
    renderQuestions();
    message('Question removed.');
  });

  async function save(state) {
    const questionnaireName = form.elements.questionnaireName.value.trim();
    const office = form.elements.office.value;
    const region = form.elements.region.value;
    const description = form.elements.description.value.trim();
    if (state === 'Draft' && !questionnaireName && !office && !region && !description && !questions.length) {
      message('Add a detail or question before saving a draft.', 'error');
      form.elements.questionnaireName.focus();
      return;
    }
    if (state !== 'Draft') {
      if (!form.reportValidity() || !questionnaireName || !region) {
        message('Enter a questionnaire name, region, and office.', 'error');
        return;
      }
      if (!questions.length) { message('Add at least one question.', 'error'); return; }
      const missingLabel = ratingScale.find((item) => !item.label.trim());
      if (missingLabel) {
        message(`Enter a label for rating ${missingLabel.score}.`, 'error');
        guide.querySelector(`[data-rating-label="${missingLabel.score}"]`)?.focus();
        return;
      }
      const emptyIndex = questions.findIndex((question) => !question.text.trim());
      if (emptyIndex >= 0) {
        message(`Enter text for question ${emptyIndex + 1}.`, 'error');
        rows.children[emptyIndex]?.querySelector('textarea')?.focus();
        return;
      }
    }
    let existingCreatedAt = null;
    try {
      const previous = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      existingCreatedAt = Array.isArray(previous) ? previous.find((item) => item.id === recordId)?.createdAt : null;
    } catch { message('The saved questionnaires could not be read.', 'error'); return; }
    const record = {
      id: recordId || createTemporaryId(),
      type: 'Training Evaluation',
      status: state,
      questionnaireName,
      office,
      region,
      description,
      questions: questions.map((question) => ({ text: question.text.trim(), maxRating: 5 })),
      ratingScale: ratingScale.map((item) => ({ score: item.score, label: item.label.trim(), description: item.description.trim() })),
      createdAt: existingCreatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const saved = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      const records = Array.isArray(saved) ? saved : [];
      const index = records.findIndex((item) => item.id === record.id);
      if (index < 0) records.push(record); else {
        if (document.body.classList.contains('questionnaire-edit-page')) {
          record.status = records[index].status || state;
          record.statusRemarks = records[index].statusRemarks || '';
        }
        records[index] = record;
      }
      const result = await window.TmisStore.setItem(storageKey, JSON.stringify(records));
      recordId = result?.idMappings?.[record.id] || record.id;
      if (document.body.classList.contains('questionnaire-edit-page')) {
        message(`${state === 'Draft' ? 'Draft updated.' : 'Questionnaire updated.'} Questionnaire ID: ${recordId}.`, 'success');
        form.querySelectorAll('button').forEach((button) => { button.disabled = true; });
        window.setTimeout(() => { location.href = '../details/list-questionnaire'; }, 700);
        return;
      }
      if (state !== 'Draft') {
        form.elements.questionnaireName.value = '';
        form.elements.office.value = '';
        form.elements.region.value = '';
        form.elements.description.value = '';
        questions.length = 0;
        selectedIndex = -1;
        recordId = null;
        if (new URLSearchParams(location.search).has('id')) history.replaceState(null, '', location.pathname);
        renderQuestions();
      }
      message(`${state === 'Draft' ? 'Draft saved. Find it under Evaluation > Details > Draft Questionnaires.' : 'Questionnaire saved.'} Questionnaire ID: ${recordId}.`, 'success');
    } catch { message('The questionnaire could not be saved. Please try again.', 'error'); }
  }

  byId('saveTrainingDraft').addEventListener('click', async () => await save('Draft'));
  form.addEventListener('submit', async (event) => { event.preventDefault(); await save('Active'); });
  const draftId = new URLSearchParams(window.location.search).get('id');
  if (draftId) {
    try {
      const saved = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      const draft = Array.isArray(saved) ? saved.find((item) => item?.id === draftId) : null;
      if (draft) {
        recordId = draft.id;
        form.elements.questionnaireName.value = draft.questionnaireName || '';
        window.setQuestionnaireLocation?.(draft.region, draft.office);
        form.elements.description.value = draft.description || '';
        if (Array.isArray(draft.questions)) {
          questions.push(...draft.questions.map((item) => ({ text: typeof item === 'string' ? item : String(item?.text || '') })));
        }
        if (Array.isArray(draft.ratingScale)) {
          ratingScale.forEach((item) => {
            const savedRating = draft.ratingScale.find((entry) => Number(entry?.score) === item.score);
            if (savedRating) {
              item.label = String(savedRating.label ?? item.label);
              item.description = String(savedRating.description ?? item.description);
            }
          });
        }
        selectedIndex = questions.length ? 0 : -1;
        message('Draft loaded. Continue editing or save the completed questionnaire.', 'success');
      } else {
        message('The selected draft was not found in this browser.', 'error');
      }
    } catch {
      message('The selected draft could not be loaded.', 'error');
    }
  }
  renderQuestions();
});
