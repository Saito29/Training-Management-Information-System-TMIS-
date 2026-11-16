(() => {
  const filtersForm = document.getElementById('deletedFarmersFilters');
  const refreshButton = document.getElementById('refreshDeletedFarmers');
  const exportButton = document.getElementById('exportDeletedFarmers');
  const pageSize = document.getElementById('deletedFarmerPageSize');

  refreshButton?.addEventListener('click', () => window.location.reload());
  pageSize?.addEventListener('change', () => filtersForm?.requestSubmit());
  exportButton?.addEventListener('click', async () => {
    if (!window.XLSX || !filtersForm) {
      window.alert('Excel export is unavailable. Check your connection and try again.');
      return;
    }

    exportButton.disabled = true;
    try {
      const parameters = new URLSearchParams(new FormData(filtersForm));
      parameters.delete('per_page');
      const response = await fetch(`${exportButton.dataset.exportUrl}?${parameters.toString()}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const rows = await response.json();
      if (!response.ok) throw new Error(rows.message || 'Deleted farmer records could not be exported.');
      if (!Array.isArray(rows) || rows.length === 0) {
        window.alert('There are no deleted farmer records matching these filters.');
        return;
      }

      const headers = Object.keys(rows[0]);
      const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      sheet['!cols'] = headers.map(header => ({ wch: Math.max(14, header.length + 4) }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Deleted Farmers');
      XLSX.writeFile(book, `deleted_farmers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Deleted farmer records could not be exported.');
    } finally {
      exportButton.disabled = false;
    }
  });

  const restoreDialog = document.getElementById('restoreDeletedFarmerDialog');
  if (restoreDialog) {
    const form = document.getElementById('restoreDeletedFarmerForm');
    const fields = {
      number: document.getElementById('restoreFarmerNumber'),
      name: document.getElementById('restoreFarmerName'),
      status: document.getElementById('restoreFarmerStatus'),
      sex: document.getElementById('restoreFarmerSex'),
      office: document.getElementById('restoreFarmerOffice'),
      location: document.getElementById('restoreFarmerLocation'),
      deletedAt: document.getElementById('restoreFarmerDeletedAt'),
      deletionDeadline: document.getElementById('restoreFarmerDeletionDeadline'),
    };

    document.querySelectorAll('[data-restore-farmer]').forEach((button) => {
      button.addEventListener('click', () => {
        form.action = button.dataset.restoreUrl;
        fields.number.textContent = button.dataset.farmerNumber || 'Not recorded';
        fields.name.textContent = button.dataset.farmerName || 'Not recorded';
        fields.status.textContent = button.dataset.farmerStatus || 'Not recorded';
        fields.sex.textContent = button.dataset.farmerSex || 'Not recorded';
        fields.office.textContent = button.dataset.farmerOffice || 'Not recorded';
        fields.location.textContent = button.dataset.farmerLocation || 'Not recorded';
        fields.deletedAt.textContent = button.dataset.deletedAt || 'Not recorded';
        fields.deletionDeadline.textContent = button.dataset.deletionDeadline || 'Not scheduled';
        restoreDialog.showModal();
      });
    });

    restoreDialog.querySelectorAll('[data-close-restore-dialog]').forEach((button) => {
      button.addEventListener('click', () => restoreDialog.close());
    });
  }

  const purgeDialog = document.getElementById('permanentlyDeleteFarmerDialog');
  if (!purgeDialog) return;

  document.querySelectorAll('[data-open-purge-dialog]').forEach((button) => {
    button.addEventListener('click', () => purgeDialog.showModal());
  });
  purgeDialog.querySelectorAll('[data-close-purge-dialog]').forEach((button) => {
    button.addEventListener('click', () => purgeDialog.close());
  });
})();
