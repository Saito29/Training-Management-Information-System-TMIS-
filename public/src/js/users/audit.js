document.addEventListener('DOMContentLoaded', () => {
  const master = document.getElementById('selectVisibleAuditRows');
  const entries = [...document.querySelectorAll('.audit-entry-choice')];
  const deleteAll = document.getElementById('deleteAllFiltered');
  const form = document.getElementById('auditDeleteForm');

  master?.addEventListener('change', () => {
    entries.forEach(entry => {
      entry.checked = master.checked;
    });
    if (master.checked) {
      deleteAll.checked = false;
    }
  });

  entries.forEach(entry => entry.addEventListener('change', () => {
    if (!entry.checked) {
      master.checked = false;
    } else {
      master.checked = entries.every(item => item.checked);
      deleteAll.checked = false;
    }
  }));

  deleteAll?.addEventListener('change', () => {
    if (deleteAll.checked) {
      entries.forEach(entry => {
        entry.checked = false;
      });
      master.checked = false;
    }
  });

  form?.addEventListener('submit', event => {
    const allMatching = deleteAll.checked;
    const hasSelection = entries.some(entry => entry.checked);
    if (!allMatching && !hasSelection) {
      event.preventDefault();
      window.alert('Select audit entries or choose all entries matching the filters.');
      return;
    }
    const prompt = allMatching
      ? 'Permanently delete every audit entry matching these filters, across all pages? This cannot be undone.'
      : 'Permanently delete the selected audit entries? This cannot be undone.';
    if (!window.confirm(prompt)) {
      event.preventDefault();
    }
  });
});
