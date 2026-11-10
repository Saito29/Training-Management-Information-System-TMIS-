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

  const syncStatusFields = () => {
    const requiresReason = statusSelect.value !== 'Active';
    reasonFields.hidden = !requiresReason;
    if (!requiresReason) {
      remarksInput.value = '';
      fileInput.value = '';
    }
  };

  statusSelect.addEventListener('change', syncStatusFields);
  modalElement.addEventListener('show.bs.modal', () => {
    const farmer = window.TmisStore.selected('tmis-farmers');
    statusSelect.value = farmer?.status || 'Active';
    remarksInput.value = farmer?.statusRemarks || '';
    fileInput.value = '';
    errorBox.hidden = true;
    syncStatusFields();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const farmer = window.TmisStore.selected('tmis-farmers');
    if (!farmer) {
      errorBox.textContent = 'Open a saved participant before updating its status.';
      errorBox.hidden = false;
      return;
    }

    const file = fileInput.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
        errorBox.textContent = 'Choose a PDF or image file (PNG, JPG, JPEG, WEBP, or GIF).';
        errorBox.hidden = false;
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        errorBox.textContent = 'The supporting file must be 10 MB or smaller.';
        errorBox.hidden = false;
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

      const status = statusSelect.value;
      const updated = {
        ...window.TmisStore.selected('tmis-farmers'),
        status,
        profileStatus: status === 'Active' ? 'Active' : 'Inactive',
        inactiveReason: status === 'Removed' ? 'Removed' : (status === 'Active' ? '' : status),
        statusRemarks: status === 'Active' ? '' : remarksInput.value.trim(),
        remarks: status === 'Active' ? '' : remarksInput.value.trim(),
      };
      const savedFarmer = await window.TmisStore.saveRecord('tmis-farmers', updated);

      const pill = document.querySelector('.farmer-status-pill');
      if (pill) {
        pill.classList.toggle('active-status', status === 'Active');
        pill.innerHTML = `<i class="bi ${status === 'Active' ? 'bi-patch-check-fill' : 'bi-exclamation-circle-fill'}" aria-hidden="true"></i> ${window.TmisStore.escape(status)}`;
      }
      const updatedDate = document.getElementById('displayUpdatedDate');
      if (updatedDate) {
        updatedDate.textContent = savedFarmer?.updatedAt ? window.TmisDate.format(savedFarmer.updatedAt, { dateStyle: 'long' }) : 'No record updated';
      }
      document.querySelectorAll('.overview-status').forEach((element) => { element.textContent = status; });
      bootstrap.Modal.getOrCreateInstance(modalElement).hide();
      window.TmisToast?.show('Participant status updated', 'The status and any supporting document were saved.', 'success');
    } catch (failure) {
      errorBox.textContent = failure.message || 'The status could not be updated.';
      errorBox.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
});
