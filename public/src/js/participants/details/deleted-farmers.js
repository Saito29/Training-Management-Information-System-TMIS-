(() => {
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
