document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addInterventionForm');
  const table = document.getElementById('interventionDataTable');
  if (!form || !table || !window.TmisStore) return;

  const isAssociation = location.pathname.includes('/view-fa/') || location.pathname.includes('/edit-fa/');
  const module = isAssociation ? 'associations' : 'participants';
  const ownerKey = isAssociation ? 'tmis-farmer-associations' : 'tmis-farmers';
  const permissions = {
    read: window.TmisStore.can(`${module}.interventions.read`),
    create: window.TmisStore.can(`${module}.interventions.create`),
    edit: window.TmisStore.can(`${module}.interventions.edit`),
    delete: window.TmisStore.can(`${module}.interventions.delete`),
  };
  const canRead = permissions.read || permissions.edit || permissions.delete;
  const addButton = document.querySelector('.intervention-add-button');
  const exportButton = document.getElementById('exportInterventions');
  const refreshButton = document.getElementById('refreshInterventions');
  const search = document.getElementById('interventionGlobalSearch');
  const clearFilters = document.getElementById('clearInterventionFilters');
  const feedback = document.getElementById('interventionFeedback');
  const formError = document.getElementById('interventionFormError');
  const formModal = document.getElementById('addInterventionModal');
  const formTitle = document.getElementById('addInterventionModalLabel');
  const submitButton = form.querySelector('[type="submit"]');
  const viewModal = document.getElementById('viewInterventionModal');
  const viewDetails = document.getElementById('viewInterventionDetails');
  const deleteModalElement = document.getElementById('deleteInterventionModal');
  const deleteDetails = document.getElementById('deleteInterventionDetails');
  const deleteError = document.getElementById('deleteInterventionError');
  const deleteButton = document.getElementById('confirmDeleteIntervention');
  const officeField = form.elements.office;
  const unitField = form.elements.unit;
  const availableUnits = Array.isArray(window.TMIS_PAGE?.interventionUnits)
    ? window.TMIS_PAGE.interventionUnits
    : [];
  const modal = bootstrap.Modal.getOrCreateInstance(formModal);
  const deleteModal = deleteModalElement ? bootstrap.Modal.getOrCreateInstance(deleteModalElement) : null;
  let editingId = null;
  let pendingDelete = null;
  let pendingEditorRecord = null;
  let saving = false;

  const owner = () => window.TmisStore.selected(ownerKey);
  const clean = value => value === undefined || value === null ? '' : String(value);
  const notify = (message, type = 'success') => {
    feedback.textContent = message;
    window.TmisToast?.show(message, type);
  };
  const failureType = error => {
    const status = Number(error?.status || 0);
    if ([403, 404, 419].includes(status)) return 'info';
    if ([400, 409, 422].includes(status)) return 'warning';
    return 'error';
  };
  const showOperationError = (target, error, fallback) => {
    const message = error?.message || fallback;
    target.textContent = message;
    if (target === deleteError) target.hidden = false;
    notify(message, failureType(error));
  };

  function setOfficeOptions() {
    if (officeField.options.length > 1) return;
    const configuredOffices = window.TMIS_PAGE?.registration?.offices;
    const offices = Array.isArray(configuredOffices) && configuredOffices.length
      ? configuredOffices
      : Array.isArray(window.TMIS_PAGE?.offices) ? window.TMIS_PAGE.offices : [];
    const regionNames = new Map((window.TMIS_PAGE?.regions || []).map(region => [String(region.region_id), region.name]));
    officeField.replaceChildren(new Option('Select an office', ''));
    offices.forEach(office => {
      const id = office.org_id ?? office.office_id ?? office.id;
      const name = office.name ?? office.office_name ?? '';
      if (!id || !name) return;
      const region = office.region_name ?? regionNames.get(String(office.region_id)) ?? '';
      const option = new Option([name, region].filter(Boolean).join(' — '), String(id));
      option.dataset.officeName = String(name);
      option.dataset.regionName = String(region);
      officeField.add(option);
    });
  }

  function setUnitOptions(savedUnit = '') {
    const options = [new Option('Select a unit', '')];
    availableUnits.forEach(option => options.push(new Option(option.label || option.value, option.label || option.value)));
    if (savedUnit && !availableUnits.some(option => String(option.label || option.value) === String(savedUnit) || String(option.value) === String(savedUnit))) {
      options.push(new Option(`${savedUnit} (saved value)`, savedUnit));
    }
    unitField.replaceChildren(...options);
    unitField.value = savedUnit;
  }

  function updateControls() {
    if (addButton) {
      addButton.hidden = !permissions.create;
      addButton.disabled = !permissions.create || saving;
      addButton.title = permissions.create ? 'Add intervention' : 'You do not have permission to add interventions';
    }
    [exportButton, refreshButton, search, clearFilters].forEach(control => {
      if (control) control.disabled = !canRead || saving;
    });
    table.hidden = !canRead;
    if (!canRead) {
      feedback.textContent = 'You do not have permission to view intervention records.';
    }
  }

  function setDetails(target, entries) {
    target.replaceChildren(...entries.map(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = clean(value) || 'Not recorded';
      row.append(term, description);
      return row;
    }));
  }

  function populateForm(record = null) {
    form.reset();
    editingId = record?.id || null;
    setUnitOptions(record?.unit || '');
    form.elements.title.value = record?.title || '';
    form.elements.yearCovered.value = record?.yearCovered || String(new Date().getFullYear());
    form.elements.action.value = record?.action || 'Delivered';
    form.elements.type.value = record?.type || '';
    form.elements.qty.value = record?.qty ?? '';
    form.elements.remarks.value = record?.remarks || '';
    const officeId = record?.office_id ?? record?.org_id ?? '';
    form.elements.office.value = officeId ? String(officeId) : '';
    formTitle.textContent = record ? 'Edit intervention details' : 'Add intervention';
    submitButton.innerHTML = record
      ? '<i class="bi bi-check2 me-1" aria-hidden="true"></i>Save changes'
      : '<i class="bi bi-check2 me-1" aria-hidden="true"></i>Save intervention';
    formError.textContent = '';
  }

  function openDelete(record) {
    pendingDelete = record;
    const profile = owner();
    const profileName = isAssociation
      ? profile?.association_name || profile?.name || profile?.short_name
      : profile?.farmerNumber || profile?.farmer_number || profile?.id;
    setDetails(deleteDetails, [
      [isAssociation ? 'Association' : 'Farmer ID', profileName],
      ['Intervention', record.title],
      ['Office', record.office],
      ['Year covered', record.yearCovered],
      ['Action', record.action],
      ['Type', record.type],
      ['Unit', record.unit],
      ['Quantity', record.qty],
      ['Remarks', record.remarks],
    ]);
    deleteError.hidden = true;
    deleteError.textContent = '';
    notify('Review the intervention details. It will be permanently deleted only after you confirm.', 'info');
    deleteModal.show();
  }

  let validationToastQueued = false;
  form.addEventListener('invalid', () => {
    if (validationToastQueued) return;
    validationToastQueued = true;
    notify('Check the highlighted fields and correct any missing or invalid intervention details.', 'warning');
    setTimeout(() => { validationToastQueued = false; }, 0);
  }, true);

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    if (!form.reportValidity()) {
      notify('Complete the required intervention fields before saving.', 'warning');
      return;
    }
    const operation = editingId ? 'update' : 'create';
    if ((operation === 'update' && !permissions.edit) || (operation === 'create' && !permissions.create)) {
      notify('Your account does not have permission to make this intervention change.', 'info');
      return;
    }
    const currentOwner = owner();
    if (!currentOwner) {
      notify('The selected profile could not be loaded. Refresh the page before saving the intervention.', 'info');
      formError.textContent = 'The selected profile could not be loaded. Refresh the page and try again.';
      return;
    }
    const officeId = form.elements.office.value;
    const selectedOffice = form.elements.office.selectedOptions[0];
    if (!officeId || !selectedOffice) {
      formError.textContent = 'Select an office from the registered office list.';
      notify('Select an office from the registered office list before saving.', 'warning');
      return;
    }

    const data = {
      title: form.elements.title.value.trim(),
      office_id: Number(officeId),
      yearCovered: Number(form.elements.yearCovered.value),
      action: form.elements.action.value,
      type: form.elements.type.value.trim(),
      unit: form.elements.unit.value,
      qty: form.elements.qty.value,
      remarks: form.elements.remarks.value.trim(),
    };
    saving = true;
    submitButton.disabled = true;
    updateControls();
    try {
      const result = await window.TmisStore.interventionAction(module, currentOwner.id, operation, editingId, data);
      const message = result.message || (operation === 'create' ? 'Intervention added.' : 'Intervention updated.');
      feedback.textContent = message;
      window.TmisToast?.show(message, 'success');
      modal.hide();
    } catch (error) {
      showOperationError(formError, error, 'The intervention could not be saved.');
    } finally {
      saving = false;
      submitButton.disabled = false;
      updateControls();
    }
  }

  form.addEventListener('submit', save);
  formModal.addEventListener('show.bs.modal', event => {
    const recordId = event.relatedTarget?.dataset?.editInterventionId;
    const record = pendingEditorRecord
      || (recordId ? owner()?.interventions?.find(item => String(item.id) === recordId) : null);
    pendingEditorRecord = null;
    populateForm(record || null);
    notify(
      record
        ? 'Review the intervention details. Your update is saved when you select Save changes.'
        : 'Enter the intervention details and save to add it to this profile.',
      'info',
    );
  });
  formModal.addEventListener('hidden.bs.modal', () => populateForm());
  table.querySelector('tbody')?.addEventListener('click', event => {
    const control = event.target.closest('[data-edit-intervention-id],[data-delete-intervention-id],[data-view-intervention-id]');
    if (!control) return;
    const recordId = control.dataset.editInterventionId || control.dataset.deleteInterventionId || control.dataset.viewInterventionId;
    const record = owner()?.interventions?.find(item => String(item.id) === String(recordId));
    if (!record) {
      notify('This intervention is no longer available. Refresh the table to load the latest records.', 'info');
      return;
    }
    if (control.dataset.editInterventionId && permissions.edit) {
      pendingEditorRecord = record;
      modal.show();
    } else if (control.dataset.deleteInterventionId && permissions.delete) {
      openDelete(record);
    } else if (control.dataset.viewInterventionId && canRead && viewModal && viewDetails) {
      const profile = owner();
      setDetails(viewDetails, [
        ['Intervention', record.title],
        ['Region', record.officeRegion || profile?.region || profile?.regionName],
        ['Office', record.office],
        ['Year covered', record.yearCovered],
        ['Action', record.action],
        ['Type', record.type],
        ['Unit', record.unit],
        ['Quantity', record.qty],
        ['Remarks', record.remarks],
      ]);
      bootstrap.Modal.getOrCreateInstance(viewModal).show();
    } else {
      notify('Your account does not have permission to perform this intervention action.', 'info');
    }
  });
  deleteButton?.addEventListener('click', async () => {
    if (saving) return;
    if (!pendingDelete || !permissions.delete) {
      notify('Your account cannot delete this intervention. Refresh the page to check your current access.', 'info');
      return;
    }
    const currentOwner = owner();
    if (!currentOwner) {
      notify('The selected profile could not be loaded. Refresh the page before deleting the intervention.', 'info');
      return;
    }
    saving = true;
    deleteButton.disabled = true;
    updateControls();
    try {
      const result = await window.TmisStore.interventionAction(module, currentOwner.id, 'delete', pendingDelete.id);
      const message = result.message || 'Intervention permanently deleted.';
      deleteModal.hide();
      notify(message, 'success');
    } catch (error) {
      showOperationError(deleteError, error, 'The intervention could not be deleted.');
    } finally {
      saving = false;
      deleteButton.disabled = false;
      updateControls();
    }
  });
  deleteModalElement?.addEventListener('hidden.bs.modal', () => {
    pendingDelete = null;
    deleteError.hidden = true;
    deleteError.textContent = '';
  });
  document.querySelector('.intervention-add-button')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!permissions.create) {
      notify('Your account does not have permission to add interventions to this profile.', 'info');
      return;
    }
    pendingEditorRecord = null;
    populateForm();
    modal.show();
  }, true);

  updateControls();
  setOfficeOptions();
  setUnitOptions();
});
