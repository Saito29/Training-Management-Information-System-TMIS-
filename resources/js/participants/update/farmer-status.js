document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('farmerStatusForm');
  if (!form || !window.TmisStore) return;

  const statusSelect = document.getElementById('farmerStatusSelect');
  const reasonFields = document.getElementById('farmerStatusReasonFields');
  const remarksInput = document.getElementById('farmerStatusRemarks');
  const fileInput = document.getElementById('farmerStatusDocument');
  const errorBox = document.getElementById('farmerStatusError');
  const submitButton = document.getElementById('saveFarmerStatus');
  const modalElement = document.getElementById('farmerStatusModal');
  const statuses = Array.isArray(window.TMIS_PAGE?.farmerStatuses) ? window.TMIS_PAGE.farmerStatuses : [];

  const selectedStatus = () => statuses.find(status => String(status.id) === statusSelect.value);
  const syncStatusFields = () => {
    const requiresReason = selectedStatus()?.name !== 'Active';
    reasonFields.hidden = !requiresReason;
    if (!requiresReason) {
      remarksInput.value = '';
      fileInput.value = '';
    }
  };
  const showError = message => {
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  statusSelect.addEventListener('change', syncStatusFields);
  modalElement.addEventListener('show.bs.modal', () => {
    const farmer = window.TmisStore.selected('tmis-farmers');
    const currentStatusId = String(farmer?.farmerStatusId || '');
    const availableStatuses = statuses.filter(status => status.is_active || String(status.id) === currentStatusId);

    statusSelect.replaceChildren(...availableStatuses.map(status => new Option(status.name, String(status.id))));
    statusSelect.value = currentStatusId;
    remarksInput.value = farmer?.statusRemarks || '';
    fileInput.value = '';
    errorBox.hidden = true;

    if (!farmer) {
      showError('Open a saved farmer before updating its status.');
    } else if (!availableStatuses.some(status => String(status.id) === currentStatusId)) {
      showError("The farmer's current status is unavailable. Refresh the page and try again.");
    }

    syncStatusFields();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const farmer = window.TmisStore.selected('tmis-farmers');
    const status = selectedStatus();
    if (!farmer) {
      showError('Open a saved farmer before updating its status.');
      return;
    }
    if (!status) {
      showError('Choose an available farmer status.');
      return;
    }

    const file = fileInput.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
        showError('Choose a PDF or image file (PNG, JPG, JPEG, WEBP, or GIF).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showError('The supporting file must be 10 MB or smaller.');
        return;
      }
    }

    errorBox.hidden = true;
    submitButton.disabled = true;
    const originalLabel = submitButton.textContent;
    submitButton.textContent = 'Saving…';
    try {
      if (file) {
        await window.TmisStore.upload('participants', farmer.id, file, 'Status supporting document', String(new Date().getFullYear()), remarksInput.value.trim());
      }

      const updated = {
        ...window.TmisStore.selected('tmis-farmers'),
        farmerStatusId: String(status.id),
        status: status.name,
        profileStatus: status.name === 'Active' ? 'Active' : 'Inactive',
        inactiveReason: status.name === 'Active' ? '' : status.name,
        statusRemarks: status.name === 'Active' ? '' : remarksInput.value.trim(),
        remarks: status.name === 'Active' ? '' : remarksInput.value.trim(),
      };
      const savedFarmer = await window.TmisStore.saveRecord('tmis-farmers', updated);

      const pill = document.querySelector('.farmer-status-pill');
      if (pill) {
        pill.classList.toggle('active-status', status.name === 'Active');
        pill.replaceChildren();
        const icon = document.createElement('i');
        icon.className = `bi ${status.name === 'Active' ? 'bi-patch-check-fill' : 'bi-exclamation-circle-fill'}`;
        icon.setAttribute('aria-hidden', 'true');
        pill.append(icon, document.createTextNode(` ${status.name}`));
      }
      const updatedDate = document.getElementById('displayUpdatedDate');
      if (updatedDate) {
        updatedDate.textContent = savedFarmer?.updatedAt ? window.TmisDate.format(savedFarmer.updatedAt, { dateStyle: 'long' }) : 'No record updated';
      }
      document.querySelectorAll('.overview-status').forEach(element => { element.textContent = status.name; });
      bootstrap.Modal.getOrCreateInstance(modalElement).hide();
      window.TmisToast?.show('Farmer status updated', 'The status and any supporting document were saved.', 'success');
    } catch (failure) {
      showError(failure.message || 'The status could not be updated.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
});
