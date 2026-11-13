/* Connect form activity to the training registration wizard's active/completed states. */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.card-form form');
  const steps = [...document.querySelectorAll('#wizard-steps [data-step]')];
  const fieldsets = [...document.querySelectorAll('.card-form .wizard-step')];
  const startDate = document.querySelector('#start_date');
  const endDate = document.querySelector('#end_date');
  const region = document.querySelector('#region_id');
  const district = document.querySelector('#district_number');
  const province = document.querySelector('#province_id');
  const municipality = document.querySelector('#municipality_id');
  const barangay = document.querySelector('#barangay_id');
  const trainerList = document.querySelector('#trainer_list');
  const addTrainerButton = document.querySelector('#add_trainer');
  const associationSelect = form?.elements.namedItem('associationIds[]');
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form || !steps.length || !fieldsets.length) return;

  const trainingTypeSelect = form.elements.namedItem('training_type');
  const trainingTypeOptions = window.TMIS_PAGE?.registration?.options?.training_type;
  if (trainingTypeSelect instanceof HTMLSelectElement && Array.isArray(trainingTypeOptions)) {
    trainingTypeSelect.replaceChildren(
      new Option('Choose..', ''),
      ...trainingTypeOptions.map(option => new Option(option.label, option.value))
    );
  }
  const yearCoveredSelect = form.elements.namedItem('year_covered');
  if (yearCoveredSelect instanceof HTMLSelectElement) {
    const currentYear = new Date().getFullYear();
    yearCoveredSelect.replaceChildren(
      new Option('Choose year', ''),
      ...Array.from({ length: currentYear + 2 - 2000 }, (_, index) => {
        const year = String(currentYear + 1 - index);
        return new Option(year, year);
      })
    );
  }

  const registration = window.TMIS_PAGE?.registration;
  const titleSegment = title => String(title || 'training')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'training';
  const trainingViewUrl = (title, id) => (form.dataset.trainingViewRoute || '../id/view-training/__title__/__id__')
    .replace('__title__', titleSegment(title))
    .replace('__id__', encodeURIComponent(id));
  const locations = registration?.locations;
  if (Array.isArray(locations) && Array.isArray(registration.regions)) {
    const regionRows = registration.regions;
    const locationFields = [
      {select: province, kind: 'province', parent: () => region.value},
      {select: district, kind: 'district', parent: () => province.value},
      {select: municipality, kind: 'municipality', parent: () => district.value},
      {select: barangay, kind: 'barangay', parent: () => municipality.value},
    ];
    region.replaceChildren(
      new Option(regionRows.length ? 'Choose a region' : 'No regions available', ''),
      ...regionRows.map(row => new Option(row.name, String(row.region_id)))
    );

    function populateLocation(field) {
      const parentId = field.parent();
      const options = parentId
        ? locations.filter(location =>
          location.kind === field.kind
          && String(location.region_id) === region.value
          && (field.kind === 'province' || String(location.parent_id) === parentId))
        : [];
      const label = field.kind === 'municipality' ? 'municipality / city' : field.kind;
      field.select.replaceChildren(
        new Option(parentId ? `Choose a ${label}` : `Choose ${field.kind === 'province' ? 'a region' : 'the parent location'} first`, ''),
        ...options.map(location => new Option(location.name, String(location.id)))
      );
      field.select.disabled = !parentId;
    }

    region.addEventListener('change', () => locationFields.forEach(populateLocation));
    locationFields.slice(0, -1).forEach((field, index) => {
      field.select.addEventListener('change', () => {
        locationFields.slice(index + 1).forEach(populateLocation);
      });
    });
    locationFields.forEach(populateLocation);
  }

  function refreshAssociationOptions() {
    if (!(associationSelect instanceof HTMLSelectElement)) return;

    const selectedIds = new Set([...associationSelect.selectedOptions].map(option => option.value));
    const associations = window.TmisStore.records('tmis-farmer-associations')
      .filter(record => record.status === 'Active' && record.is_active !== false)
      .sort((left, right) => String(left.association_name || left.name || '').localeCompare(String(right.association_name || right.name || ''), 'en-PH'));

    associationSelect.replaceChildren(...associations.map(record => {
      const option = new Option(
        [record.association_name || record.name || record.id, record.municipality, record.province].filter(Boolean).join(' — '),
        String(record.id),
      );
      option.selected = selectedIds.has(option.value);
      return option;
    }));
    associationSelect.disabled = associations.length === 0;
  }

  if (associationSelect instanceof HTMLSelectElement) {
    refreshAssociationOptions();
    window.addEventListener('tmis:data-updated', refreshAssociationOptions);
  }

  const trainerSelect = trainerList?.querySelector('select[name="trainer_name[]"]');
  const staticTrainers = [...(trainerSelect?.options || [])].filter((option) => option.value).map((option) => ({
    name: option.value,
    organization: option.dataset.organization || '',
  }));
  const registeredRps = new Map();
  const rpName = (record) => [
    ...(record.title === 'RAgr' ? [] : [record.title]),
    record.first_name, record.middle_name, record.last_name, record.suffix,
    ...(record.title === 'RAgr' ? ['RAgr'] : []),
  ].map((part) => String(part || '').trim()).filter(Boolean).join(' ');
  const syncTrainerContact = (row) => {
    const phone = row?.querySelector('input[name="trainer_contact[]"]');
    const email = row?.querySelector('input[name="trainer_email[]"]');
    if (!phone || !email) return;
    phone.required = !email.value.trim();
    email.required = !phone.value.trim() && Boolean(email.value.trim());
  };
  const fillTrainerRow = (row) => {
    const selected = row?.querySelector('select[name="trainer_name[]"]')?.selectedOptions[0];
    const rp = registeredRps.get(selected?.dataset.rpId);
    const rpId = row?.querySelector('input[name="trainer_rp_id[]"]');
    if (rpId) rpId.value = rp?.id || '';
    const values = {
      'trainer_organization[]': rp?.office || selected?.dataset.organization || '',
      'trainer_qualification[]': rp?.qualification || '',
      'trainer_expertise[]': rp?.expertise || '',
      'trainer_contact[]': rp?.phone || '',
      'trainer_email[]': rp?.email || '',
    };
    Object.entries(values).forEach(([name, value]) => {
      const input = row?.querySelector(`input[name="${name}"]`);
      if (input) input.value = value;
    });
    syncTrainerContact(row);
  };
  const refreshRegisteredRps = () => {
    const saved = window.TMIS_PAGE ? window.TmisStore.records('tmis-resource-persons') : [];
    registeredRps.clear();
    saved.filter((record) => record?.id && record.status !== 'Inactive').forEach((record) => registeredRps.set(record.id, record));
    trainerList?.querySelectorAll('select[name="trainer_name[]"]').forEach((select) => {
      const selectedId = select.selectedOptions[0]?.dataset.rpId;
      const selectedName = select.value;
      const placeholder = new Option('Select a trainer/facilitator', '');
      placeholder.disabled = true;
      const samples = document.createElement('optgroup'); samples.label = 'Sample trainers';
      (window.TMIS_PAGE ? [] : staticTrainers).forEach(({ name, organization }) => { const option = new Option(name, name); option.dataset.organization = organization; samples.append(option); });
      const registered = document.createElement('optgroup'); registered.label = 'Registered resource persons';
      registeredRps.forEach((record, id) => { const name = rpName(record); if (!name) return; const option = new Option(name, name); option.dataset.rpId = id; registered.append(option); });
      select.replaceChildren(placeholder, samples, registered);
      const match = selectedId ? [...select.options].find((option) => option.dataset.rpId === selectedId) : [...select.options].find((option) => !option.dataset.rpId && option.value === selectedName);
      if (match) match.selected = true;
      else select.selectedIndex = 0;
      if (selectedId && !match) fillTrainerRow(select.closest('[data-repeat-row]'));
    });
    updateWizard();
  };

  let currentStep = Number(
    document.querySelector('#wizard-steps .is-current, #wizard-steps .active')?.dataset.step ?? 0
  );

  /* ------------------------------------------------------------------
     Wizard progress
  ------------------------------------------------------------------ */
  const isRequiredControlValid = (control) => {
    if (control.disabled) return true;

    if (control.matches('input[type="checkbox"]')) {
      return control.checked && control.validity.valid;
    }

    if (control.matches('input[type="radio"]')) {
      const group = [...form.querySelectorAll('input[type="radio"]')].filter(
        (radio) => radio.name === control.name
      );
      return group.some((radio) => radio.checked) && control.validity.valid;
    }

    return control.value.trim().length > 0 && control.validity.valid;
  };

  const isStepComplete = (fieldset) =>
    [...fieldset.querySelectorAll('input[required], select[required], textarea[required]')]
      .every(isRequiredControlValid);

  const getFirstIncompleteStep = () => {
    const finalStep = Number(fieldsets.at(-1).dataset.step);

    for (const fieldset of fieldsets) {
      if (!isStepComplete(fieldset)) {
        return Number(fieldset.dataset.step);
      }
    }

    return finalStep + 1;
  };

  const summaryLabel = document.querySelector('#step_summary_label');
  const summaryPercent = document.querySelector('#step_summary_percent');
  const summaryBar = document.querySelector('#step_summary_bar');
  const summaryFill = document.querySelector('#step_summary_fill');
  const summaryMessage = document.querySelector('#step_summary_message');
  const summaryMessages = [
    "Let's get started! Fill in the training details.",
    'Add the trainer/ facilitator information.',
    "You're doing great! Continue filling out the details.",
    'Define who the training is for.',
    "You're almost done! Review and submit.",
  ];

  const updateSummary = (progressStep) => {
    if (!summaryFill) return;

    const total = steps.length;
    const done = Math.min(progressStep, total);
    const percent = Math.round((done / total) * 100);
    const shown = Math.min(Math.max(currentStep, 0), total - 1) + 1;

    if (summaryLabel) summaryLabel.textContent = `Step ${shown} of ${total}`;
    if (summaryPercent) summaryPercent.textContent = `${percent}%`;
    summaryFill.style.width = `${percent}%`;
    summaryBar?.setAttribute('aria-valuenow', String(percent));
    if (summaryMessage) summaryMessage.textContent = summaryMessages[shown - 1] ?? summaryMessages[0];
  };

  const updateWizard = () => {
    const firstIncompleteStep = getFirstIncompleteStep();
    const progressStep = Math.min(currentStep, firstIncompleteStep);

    steps.forEach((step) => {
      const stepNumber = Number(step.dataset.step);
      // A green check is only shown for steps that are both valid and behind
      // the capped progress position. The progress marker identifies the gap.
      const isCompleted = stepNumber < progressStep;
      const isProgressStep = stepNumber === progressStep;
      const isCurrent = stepNumber === currentStep;

      step.classList.toggle('is-completed', isCompleted);
      step.classList.toggle('is-progress', isProgressStep);
      step.classList.toggle('is-current', isCurrent);
      step.classList.remove('active');
      step.setAttribute('aria-current', isCurrent ? 'step' : 'false');
    });

    updateSummary(progressStep);
  };

  const syncCurrentStep = (event) => {
    const fieldset = event.target.closest('.wizard-step');
    if (!fieldset || !form.contains(fieldset)) return;

    currentStep = Number(fieldset.dataset.step);
  };

  const recalculateWizardProgress = (event) => {
    if (event) syncCurrentStep(event);
    updateWizard();
  };

  form.addEventListener('input', recalculateWizardProgress);
  form.addEventListener('change', recalculateWizardProgress);
  form.addEventListener('blur', recalculateWizardProgress, true);
  form.addEventListener('focusin', recalculateWizardProgress);
  form.addEventListener('click', recalculateWizardProgress);
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      // Browser autocomplete can apply a value as focus moves without firing
      // input/change, so validate after the Tab navigation has completed.
      setTimeout(recalculateWizardProgress);
    }
  });

  // Programmatic assignments (for example, control.value = '...') do not
  // emit input/change events. Observe them so the wizard never goes stale.
  let progressRecalculationQueued = false;
  const scheduleProgressRecalculation = () => {
    if (progressRecalculationQueued) return;

    progressRecalculationQueued = true;
    queueMicrotask(() => {
      progressRecalculationQueued = false;
      updateWizard();
    });
  };

  const observeProgrammaticValueChanges = (control) => {
    const prototype = control instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const properties = control instanceof HTMLSelectElement
      ? ['value', 'selectedIndex']
      : control instanceof HTMLInputElement
        ? ['value', 'checked']
        : ['value'];

    properties.forEach((property) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
      if (!descriptor?.get || !descriptor.set) return;

      Object.defineProperty(control, property, {
        configurable: true,
        get: () => descriptor.get.call(control),
        set: (value) => {
          descriptor.set.call(control, value);
          scheduleProgressRecalculation();
        },
      });
    });
  };

  const observeControls = (root) =>
    root.querySelectorAll('input, select, textarea').forEach(observeProgrammaticValueChanges);

  observeControls(form);
  new MutationObserver(scheduleProgressRecalculation).observe(form, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['checked', 'disabled', 'required', 'selected', 'value'],
  });
  form.addEventListener('reset', () => setTimeout(scheduleProgressRecalculation));
  window.addEventListener('pageshow', scheduleProgressRecalculation);

  const setSubmitLoading = (isLoading) => {
    if (!submitButton) return;

    submitButton.disabled = isLoading;
    submitButton.classList.toggle('is-loading', isLoading);
    submitButton.setAttribute('aria-busy', String(isLoading));
  };

  // The submit event only fires after built-in required/pattern validation.
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    setSubmitLoading(true);
    try {
      const formData = new FormData(form);
      const values = Object.fromEntries(formData);
      const temporaryId = 'TRN-TEMP-' + crypto.randomUUID();
      for (const name of ['region_id','district_id','province_id','municipality_id','barangay_id']) {
        const control = form.elements.namedItem(name);
        if (control?.selectedOptions[0]?.value) values[name.replace('_id','')] = control.selectedOptions[0].textContent;
      }
      const record = {
        ...values,
        id: temporaryId,
        trainers: formData.getAll('trainer_rp_id[]').filter(Boolean).map(id => ({id})),
        associationIds: formData.getAll('associationIds[]').filter(Boolean),
      };
      const records = window.TmisStore.records('tmis-trainings');
      const result = await window.TmisStore.setItem('tmis-trainings', JSON.stringify([...records,record]));
      const id = result?.idMappings?.[temporaryId];
      if (!id) throw new Error('The training was saved, but its reference ID could not be resolved. Refresh the training list to continue.');
      window.TmisToast?.show('Record saved successfully.', 'success');
      location.assign(trainingViewUrl(record.title || record.training_title, id));
    } catch (error) {
      window.TmisToast?.show(error.message || 'The record could not be saved.', 'error');
    } finally { setSubmitLoading(false); }
  });
  window.addEventListener('pageshow', () => setSubmitLoading(false));

  // Retain compatibility with existing navigation that marks an indicator as
  // active instead of dispatching an input event.
  new MutationObserver((mutations) => {
    const navigationStep = mutations
      .map((mutation) => mutation.target)
      .find((step) => step.classList.contains('active') || step.classList.contains('is-current'));
    if (!navigationStep) return;

    const nextCurrentStep = Number(navigationStep.dataset.step);
    if (nextCurrentStep === currentStep) return;

    currentStep = nextCurrentStep;
    updateWizard();
  }).observe(document.querySelector('#wizard-steps'), {
    attributes: true,
    attributeFilter: ['class'],
    childList: false,
    subtree: true,
  });

  // Clicking a stepper item jumps to its section.
  steps.forEach((step) => {
    step.addEventListener('click', () => {
      const target = fieldsets.find((f) => f.dataset.step === step.dataset.step);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.querySelector('input, select, textarea')?.focus({ preventScroll: true });
    });
  });

  /* ------------------------------------------------------------------
     Repeatable trainer rows
  ------------------------------------------------------------------ */
  let rowCounter = 100;

  const refreshRepeatList = (list) => {
    const rows = [...list.querySelectorAll(':scope > [data-repeat-row]')];

    rows.forEach((row, index) => {
      const title = row.querySelector('.row-title');
      if (title) title.textContent = `Trainer/ Facilitator ${index + 1}`;

      const removeButton = row.querySelector('[data-remove-row]');
      if (removeButton) {
        removeButton.classList.toggle('d-none', rows.length === 1);
        removeButton.setAttribute('aria-label', `Remove trainer/facilitator ${index + 1}`);
      }
    });
    const status = document.querySelector('#trainerListStatus');
    if (status) status.textContent = `${rows.length} trainer${rows.length === 1 ? '' : 's'} / facilitator${rows.length === 1 ? '' : 's'} added.`;
  };

  const addRow = (list) => {
    const template = list.querySelector(':scope > [data-repeat-row]');
    if (!template) return;

    const row = template.cloneNode(true);
    rowCounter += 1;

    row.querySelectorAll('.tmis-combobox').forEach((wrapper) => {
      const select = wrapper.querySelector('select');
      if (!select) return;
      select.classList.remove('tmis-combobox-source');
      select.removeAttribute('aria-hidden');
      select.removeAttribute('tabindex');
      wrapper.replaceWith(select);
    });

    // Clear values and give each field/label pair a unique id.
    row.querySelectorAll('input, select, textarea').forEach((control) => {
      const oldId = control.id;
      if (oldId) {
        const newId = `${oldId.replace(/_\d+$/, '')}_${rowCounter}`;
        const label = row.querySelector(`label[for="${oldId}"]`);
        control.id = newId;
        if (label) label.htmlFor = newId;
      }

      if (control instanceof HTMLSelectElement) {
        control.selectedIndex = 0;
      } else {
        control.value = '';
      }
    });

    list.append(row);
    if (list === trainerList) {
      syncTrainerContact(row);
    }
    observeControls(row);
    refreshRepeatList(list);
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', `Trainer / facilitator ${list.querySelectorAll(':scope > [data-repeat-row]').length}`);
  };

  addTrainerButton?.addEventListener('click', () => {
    if (trainerList) addRow(trainerList);
  });

  // Remove a trainer row while keeping at least one row.
  form.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-row]');
    if (!removeButton) return;

    const row = removeButton.closest('[data-repeat-row]');
    const list = row?.parentElement;
    if (!row || !list || list.querySelectorAll(':scope > [data-repeat-row]').length <= 1) return;

    row.remove();
    refreshRepeatList(list);
    updateWizard();
  });

  form.querySelectorAll('.repeat-list').forEach(refreshRepeatList);
  refreshRegisteredRps();
  trainerList?.querySelectorAll('[data-repeat-row]').forEach(syncTrainerContact);
  window.addEventListener('tmis:data-updated', refreshRegisteredRps);

  trainerList?.addEventListener('input', (event) => {
    if (event.target.matches('input[name="trainer_contact[]"], input[name="trainer_email[]"]')) {
      syncTrainerContact(event.target.closest('[data-repeat-row]'));
      updateWizard();
    }
  });

  // Selecting a resource person fills every detail available in the RP record.
  form.addEventListener('change', (event) => {
    const nameSelect = event.target.closest('select[name="trainer_name[]"]');
    if (!nameSelect) return;
    fillTrainerRow(nameSelect.closest('[data-repeat-row]'));
    updateWizard();
  });

  form.addEventListener('input', (event) => {
    if (event.target.matches('input[name="trainer_contact[]"], input[name="trainer_email[]"]'))
      syncTrainerContact(event.target.closest('[data-repeat-row]'));
  });

  /* ------------------------------------------------------------------
     Schedule: end date cannot be before start date
  ------------------------------------------------------------------ */
  const syncDateRange = () => {
    if (!startDate || !endDate) return;

    endDate.min = startDate.value || '';

    if (startDate.value && endDate.value && endDate.value < startDate.value) {
      endDate.setCustomValidity('End date cannot be earlier than the start date.');
    } else {
      endDate.setCustomValidity('');
    }
  };

  startDate?.addEventListener('change', syncDateRange);
  endDate?.addEventListener('change', syncDateRange);
  syncDateRange();

  updateWizard();
});
