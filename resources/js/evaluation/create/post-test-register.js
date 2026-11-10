document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('postTestRegisterForm');
  const status = document.getElementById('postTestRegisterStatus');
  const draftButton = document.getElementById('savePostTestDraft');
  if (!form || !status) return;
  const storageKey = 'tmis-post-test-questionnaires';
  let editId = new URLSearchParams(location.search).get('id');

  if (editId) {
    try {
      const saved = JSON.parse(window.TmisStore.getItem(storageKey) || '[]');
      const item = Array.isArray(saved) ? saved.find((entry) => entry?.id === editId) : null;
      if (item) {
        form.elements.training_questionnaire.value = item.trainingQuestionnaire || '';
        form.elements.region.value = item.region || '';
        if (item.region) window.syncQuestionnaireOffice?.();
        form.elements.implementing_office.value = item.implementingOffice || '';
        form.elements.total_items.value = item.totalItems ?? '';
        form.elements.description.value = item.description || '';
      }
    } catch { status.textContent = 'The questionnaire could not be loaded.'; status.hidden = false; }
  }

  let invalidNoticePending = false;
  form.addEventListener('invalid', () => {
    if (invalidNoticePending) return;
    invalidNoticePending = true;
    window.showQuestionnaireToast('Complete the required fields before registering the post-test questionnaire.', 'error');
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
      window.showQuestionnaireToast('Complete the required fields before registering the Post-test questionnaire.', 'error');
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
        id: editId || globalThis.crypto?.randomUUID?.() || `post-test-${Date.now()}`,
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
      await window.TmisStore.setItem(storageKey, JSON.stringify(saved));
      status.textContent = mode === 'Draft' ? 'Post-test draft saved.' : 'Post-test questionnaire registered.';
      window.showQuestionnaireToast(status.textContent);
      form.reset();
      if (editId) { editId = null; history.replaceState(null, '', location.pathname); }
    } catch {
      status.textContent = 'The questionnaire could not be saved. Please try again.';
      window.showQuestionnaireToast(status.textContent, 'error');
    }
    status.hidden = false;
  }

  draftButton?.addEventListener('click', async () => await save('Draft'));
  form.addEventListener('submit', async (event) => { event.preventDefault(); await save('Active'); });
});
