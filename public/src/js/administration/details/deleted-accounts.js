document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('restoreAccountModal');
  const form = document.getElementById('restoreAccountForm');
  const details = document.getElementById('restoreAccountDetails');
  if (!modal || !form || !details) return;

  modal.addEventListener('show.bs.modal', (event) => {
    const trigger = event.relatedTarget;
    if (!(trigger instanceof HTMLElement)) return;

    const fields = [
      ['User ID', trigger.dataset.userId],
      ['Name', trigger.dataset.name],
      ['Email', trigger.dataset.email],
      ['Role', trigger.dataset.role],
      ['Access profile', trigger.dataset.credential],
      ['Region', trigger.dataset.region],
      ['Office', trigger.dataset.office],
      ['Status before deletion', trigger.dataset.status],
      ['Deleted on', trigger.dataset.deletedAt],
      ['Registered on', trigger.dataset.registeredAt],
    ];

    details.replaceChildren(...fields.map(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value || 'Not recorded';
      row.append(term, description);
      return row;
    }));
    form.action = trigger.dataset.restoreUrl;
  });
});
