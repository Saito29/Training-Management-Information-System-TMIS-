document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('preTestRegisterForm');
  const status = document.getElementById('preTestRegisterStatus');
  const draftButton = document.getElementById('savePreTestDraft');
  if (!form || !status) return;
  const storageKey = 'tmis-pre-test-questionnaires';
  let editId = new URLSearchParams(location.search).get('id');
  const isEditPage = Boolean(editId);
  const createTemporaryId = () => `Q-TEMP-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

  if (editId) {
    try {
      const saved = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      const item = Array.isArray(saved) ? saved.find((entry) => entry?.id === editId) : null;
      if (item) {
        form.elements.training_questionnaire.value = item.trainingQuestionnaire || '';
        window.setQuestionnaireLocation?.(item.region, item.implementingOffice);
        form.elements.total_items.value = item.totalItems ?? '';
        form.elements.description.value = item.description || '';
      }
    } catch { status.textContent = 'The questionnaire could not be loaded.'; status.hidden = false; }
  }

  let invalidNoticePending = false;
  form.addEventListener('invalid', () => {
    if (invalidNoticePending) return;
    invalidNoticePending = true;
    window.showQuestionnaireToast('Complete the required fields before registering the pre-test questionnaire.', 'error');
    window.setTimeout(() => { invalidNoticePending = false; }, 100);
  }, true);

  async function save(mode) {
    const name = form.elements.training_questionnaire.value.trim();
    const region = form.elements.region.value;
    const office = form.elements.implementing_office.value;
    const itemsInput = form.elements.total_items.value.trim();
    const description = form.elements.description.value.trim();
    const items = itemsInput ? Number(itemsInput) : null;
    if (mode === 'Draft' && !name && !region && !office && !itemsInput && !description) {
      window.showQuestionnaireToast('Add at least one detail before saving a draft.', 'error');
      return;
    }
    if (mode === 'Active' && !form.reportValidity()) {
      window.showQuestionnaireToast('Complete the required fields before registering the Pre-test questionnaire.', 'error');
      return;
    }
    if (itemsInput && (!Number.isSafeInteger(items) || items < 1)) {
      window.showQuestionnaireToast('Enter a positive whole number of items.', 'error');
      return;
    }
    const now = new Date().toISOString();
    try {
      const saved = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) throw new Error('Invalid questionnaire data');
      const index = editId ? saved.findIndex((item) => item?.id === editId) : -1;
      if (editId && index < 0) throw new Error('Questionnaire missing');
      const previous = index >= 0 ? saved[index] : null;
      const record = {
        ...previous,
        id: editId || createTemporaryId(),
        trainingQuestionnaire: name,
        implementingOffice: office,
        region,
        totalItems: items,
        description,
        status: mode,
        createdAt: previous?.createdAt || now,
        updatedAt: now,
      };
      if (index < 0) saved.push(record); else saved[index] = record;
      const result = await window.TmisStore.setItem(storageKey, JSON.stringify(saved));
      editId = result?.idMappings?.[record.id] || editId;
      const questionnaireId = editId || record.id;
      status.textContent = `${mode === 'Draft' ? 'Pre-test draft saved.' : 'Pre-test questionnaire registered.'} Questionnaire ID: ${questionnaireId}.`;
      window.showQuestionnaireToast(status.textContent);
      form.reset();
      if (isEditPage || mode === 'Active') {
        editId = null;
        if (isEditPage) history.replaceState(null, '', location.pathname);
      }
    } catch {
      status.textContent = 'The questionnaire could not be saved. Please try again.';
      window.showQuestionnaireToast(status.textContent, 'error');
    }
    status.hidden = false;
  }

  draftButton?.addEventListener('click', async () => await save('Draft'));
  form.addEventListener('submit', async (event) => { event.preventDefault(); await save('Active'); });
});
