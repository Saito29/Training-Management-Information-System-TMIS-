document.addEventListener('DOMContentLoaded', () => {
  const type = location.pathname.split('/').pop()?.replace('.html', '');
  if (!['pre-test', 'post-test', 'training-evaluation', 'rp-evaluation'].includes(type)) return;
  const params = new URLSearchParams(location.search);
  if (!['view', 'edit'].includes(params.get('mode'))) return;
  const id = params.get('record');
  if (!id) return;
  const key = `tmis-${type}-encoded`;
  let records;
  try { records = JSON.parse(window.TmisStore.getItem(key) || '[]'); }
  catch { return; }
  if (!Array.isArray(records)) return;
  const record = records.find((item) => item?.id === id && item.status === 'complete');
  if (!record) return;
  const heading = document.querySelector('.encode-heading');
  if (!heading) return;
  const actions = document.createElement('div');
  actions.className = 'encoded-record-actions';
  const originalBadge = heading.querySelector('.encode-badge');
  if (originalBadge) actions.append(originalBadge);
  const badge = document.createElement('span');
  badge.className = 'encoded-active-badge';
  badge.innerHTML = '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Active';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'encoded-delete-button';
  button.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i> Delete encoded answer';
  actions.append(badge, button);
  heading.append(actions);

  const dialog = document.createElement('div');
  dialog.className = 'modal fade encoded-delete-modal';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-hidden', 'true');
  dialog.setAttribute('aria-labelledby', 'encodedDeleteTitle');
  dialog.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><span class="encoded-delete-icon"><i class="bi bi-trash3" aria-hidden="true"></i></span><h5 class="modal-title" id="encodedDeleteTitle">Delete encoded answer?</h5><button type="button" class="btn-close ms-auto" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"><p>This submitted answer will be removed from Encoded Results. You can undo the deletion for 10 seconds.</p><dl><div><dt>Farmer</dt><dd data-farmer></dd></div><div><dt>Questionnaire</dt><dd data-questionnaire></dd></div><div><dt>Submitted</dt><dd data-submitted></dd></div></dl></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger" data-confirm-delete>Delete answer</button></div></div></div>';
  document.body.append(dialog);
  dialog.querySelector('[data-farmer]').textContent = record.farmerName || '—';
  dialog.querySelector('[data-questionnaire]').textContent = record.questionnaireName || '—';
  dialog.querySelector('[data-submitted]').textContent = record.savedAt && !Number.isNaN(Date.parse(record.savedAt)) ? new Date(record.savedAt).toLocaleString() : '—';
  const modal = bootstrap.Modal.getOrCreateInstance(dialog);
  button.addEventListener('click', () => modal.show());
  dialog.querySelector('[data-confirm-delete]').addEventListener('click', async () => {
    try {
      const current = JSON.parse(window.TmisStore.getItem(key) || '[]');
      if (!Array.isArray(current)) throw new Error('Invalid encoded results');
      const index = current.findIndex((item) => item?.id === id && item.status === 'complete');
      if (index < 0) throw new Error('Encoded result missing');
      const [original] = current.splice(index, 1);
      await window.TmisStore.setItem(key, JSON.stringify(current));
      modal.hide();
      button.disabled = true;
      const saveButton = document.querySelector('.encode-page form [type="submit"]');
      const saveWasDisabled = saveButton?.disabled;
      if (saveButton) saveButton.disabled = true;
      const notice = document.createElement('div');
      notice.className = 'encoded-delete-undo';
      notice.setAttribute('role', 'status');
      const message = document.createElement('span');
      message.textContent = 'Encoded answer deleted.';
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
          link.href = `../details/encoded-${type}`;
          link.textContent = 'Answer deleted. Back to results';
          notice.append(link);
        }
      }, 200);
      undo.textContent = 'Undo (10s)';
      undo.addEventListener('click', async () => {
        if (Date.now() >= deadline) return;
        try {
          const latest = JSON.parse(window.TmisStore.getItem(key) || '[]');
          if (!Array.isArray(latest)) throw new Error('Invalid encoded results');
          if (!latest.some((item) => item?.id === id)) {
            latest.splice(Math.min(index, latest.length), 0, original);
            await window.TmisStore.setItem(key, JSON.stringify(latest));
          }
          window.clearInterval(timer);
          notice.remove();
          button.disabled = false;
          if (saveButton) saveButton.disabled = saveWasDisabled;
        } catch { message.textContent = 'Could not restore the answer. Please try again.'; }
      });
    } catch { window.alert('The encoded answer could not be deleted. Please try again.'); }
  });
});
