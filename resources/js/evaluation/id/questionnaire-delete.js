document.addEventListener('DOMContentLoaded', () => {
  const type = document.body.dataset.questionnaireType;
  if (!['pre-test', 'post-test', 'training-evaluation', 'rp-evaluation'].includes(type)) return;
  const id = window.TmisStore.selectedId();
  if (!id) return;
  const key = `tmis-${type}-questionnaires`;
  const header = document.querySelector('.content-header');
  if (!header) return;
  let saved;
  try { saved = JSON.parse(window.TmisStore.getItem(key) || '[]'); }
  catch { return; }
  if (!Array.isArray(saved)) return;
  const record = saved.find((item) => item?.id === id);
  if (!record) return;
  const title = record.trainingQuestionnaire || record.questionnaireName || 'Untitled questionnaire';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn questionnaire-delete-trigger';
  button.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i><span>Delete questionnaire</span>';
  header.parentElement.append(button);

  const dialog = document.createElement('div');
  dialog.className = 'modal fade questionnaire-delete-modal';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-hidden', 'true');
  dialog.setAttribute('aria-labelledby', 'questionnaireDeleteTitle');
  dialog.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><span class="questionnaire-delete-icon"><i class="bi bi-trash3" aria-hidden="true"></i></span><div><small>Questionnaire</small><h5 class="modal-title" id="questionnaireDeleteTitle">Delete this questionnaire?</h5></div><button type="button" class="btn-close ms-auto" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"><p>The questionnaire will be removed from the lists. You can undo the deletion for 10 seconds.</p><dl><div><dt>Title</dt><dd data-delete-title></dd></div><div><dt>ID</dt><dd data-delete-id></dd></div><div><dt>Status</dt><dd data-delete-status></dd></div></dl></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger" data-confirm-delete><i class="bi bi-trash3 me-2" aria-hidden="true"></i>Delete questionnaire</button></div></div></div>';
  document.body.append(dialog);
  dialog.querySelector('[data-delete-title]').textContent = title;
  dialog.querySelector('[data-delete-id]').textContent = id;
  dialog.querySelector('[data-delete-status]').textContent = record.status || 'Active';
  const modal = bootstrap.Modal.getOrCreateInstance(dialog);
  button.addEventListener('click', () => modal.show());

  dialog.querySelector('[data-confirm-delete]').addEventListener('click', async () => {
    try {
      const current = JSON.parse(window.TmisStore.getItem(key) || '[]');
      if (!Array.isArray(current)) throw new Error('Invalid questionnaire data');
      const index = current.findIndex((item) => item?.id === id);
      if (index < 0) throw new Error('Questionnaire missing');
      const [original] = current.splice(index, 1);
      await window.TmisStore.setItem(key, JSON.stringify(current));
      modal.hide();
      button.disabled = true;
      const notice = document.createElement('div');
      notice.className = 'questionnaire-delete-undo';
      notice.setAttribute('role', 'status');
      const message = document.createElement('span');
      message.textContent = `${title} deleted.`;
      const undo = document.createElement('button');
      undo.type = 'button';
      notice.append(message, undo);
      document.body.append(notice);
      const deadline = Date.now() + 10000;
      const timer = window.setInterval(() => {
        const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        undo.textContent = `Undo (${seconds}s)`;
        if (!seconds) {
          window.clearInterval(timer);
          notice.replaceChildren();
          const link = document.createElement('a');
          link.href = '../details/list-questionnaire';
          link.textContent = 'Questionnaire deleted. Back to list';
          notice.append(link);
        }
      }, 200);
      undo.textContent = 'Undo (10s)';
      undo.addEventListener('click', async () => {
        if (Date.now() >= deadline) return;
        try {
          const latest = JSON.parse(window.TmisStore.getItem(key) || '[]');
          if (!Array.isArray(latest)) throw new Error('Invalid questionnaire data');
          if (!latest.some((item) => item?.id === id)) {
            latest.splice(Math.min(index, latest.length), 0, original);
            await window.TmisStore.setItem(key, JSON.stringify(latest));
          }
          window.clearInterval(timer);
          notice.remove();
          button.disabled = false;
        } catch { message.textContent = 'Could not restore the questionnaire. Please try again.'; }
      });
    } catch { window.alert('The questionnaire could not be deleted. Please try again.'); }
  });
});
