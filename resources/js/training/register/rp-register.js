document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('rpRegisterForm');
  if (!form) return;

  const steps = [...form.querySelectorAll('.rp-wizard-step')];
  const indicators = [...document.querySelectorAll('#wizard-steps [data-step]')];
  const region = document.getElementById('rpRegion');
  const office = document.getElementById('rpOffice');
  const title = document.getElementById('rpTitle');
  const otherTitle = document.getElementById('rpOtherTitle');
  const otherTitleWrap = document.getElementById('rpOtherTitleWrap');
  const phone = document.getElementById('rpPhone');
  const email = document.getElementById('rpEmail');
  const submitButton = form.querySelector('button[type="submit"]');
  const registration = window.TMIS_PAGE?.registration || {};
  const messages = [
    'Enter the resource person’s name.',
    'Choose the resource person’s region and office.',
    'Provide a phone number or email.',
  ];
  let currentStep = 0;
  let submitting = false;
  let pendingChangeNoticeShown = false;

  const notify = (message, type = 'info') => window.TmisToast?.show(message, type);
  if (!window.TMIS_PAGE || !window.TmisStore) {
    form.querySelectorAll('input, select, textarea, button').forEach(control => { control.disabled = true; });
    notify('Resource-person registration is unavailable while the system is offline. No profile data was saved on this device.', 'error');
    return;
  }
  const inScope = (allowed, id) => allowed == null || allowed.some(value => String(value) === String(id));
  const availableRegions = (Array.isArray(registration.regions) ? registration.regions : [])
    .filter(item => inScope(registration.regionIds, item.region_id));

  region.replaceChildren(
    new Option(availableRegions.length ? 'Choose region' : 'No regions available', ''),
    ...availableRegions.map(item => new Option(item.name, String(item.region_id))),
  );

  function updateOffices() {
    const offices = (Array.isArray(registration.offices) ? registration.offices : [])
      .filter(item => String(item.region_id) === region.value);
    office.replaceChildren(
      new Option(region.value ? (offices.length ? 'Choose office' : 'No offices available') : 'Choose region first', ''),
      ...offices.map(item => new Option(item.name, String(item.org_id))),
    );
    office.disabled = !region.value || offices.length === 0;
  }

  function showStep(index) {
    currentStep = index;
    steps.forEach((step, number) => { step.hidden = number !== index; });
    indicators.forEach((item, number) => {
      item.classList.toggle('is-current', number === index);
      item.classList.toggle('is-completed', number < index);
      item.setAttribute('aria-current', number === index ? 'step' : 'false');
    });
    const progress = Math.round((index / steps.length) * 100);
    document.getElementById('step_summary_label').textContent = `Step ${index + 1} of ${steps.length}`;
    document.getElementById('step_summary_percent').textContent = `${progress}%`;
    document.getElementById('step_summary_bar').setAttribute('aria-valuenow', String(progress));
    document.getElementById('step_summary_fill').style.width = `${progress}%`;
    document.getElementById('step_summary_message').textContent = messages[index];
    steps[index].querySelector('.card-header-title')?.focus({ preventScroll: true });
  }

  function validate(index) {
    const controls = steps[index].querySelectorAll('input, select, textarea');
    for (const control of controls) {
      if (control.disabled || (control === otherTitle && otherTitleWrap.hidden)) continue;
      if (control.required && !control.value.trim()) {
        notify(`Complete the required ${control.labels?.[0]?.textContent.replace('*', '').trim() || 'field'} field to continue.`, 'warning');
        control.focus();
        return false;
      }
      if (!control.checkValidity()) {
        notify(control.validationMessage || 'Check the highlighted value and try again.', 'warning');
        control.focus();
        return false;
      }
    }

    if (index === 2) {
      if (phone.value.trim() && !/^[+()\d .-]{7,20}$/.test(phone.value.trim())) {
        notify('Enter a valid phone number using 7 to 20 digits or phone symbols.', 'warning');
        phone.focus();
        return false;
      }
      if (!phone.value.trim() && !email.value.trim()) {
        notify('Provide either a phone number or an email address before registering.', 'warning');
        phone.focus();
        return false;
      }
    }
    return true;
  }

  function syncTitle() {
    const isOther = title.value === 'Other';
    otherTitleWrap.hidden = !isOther;
    otherTitle.required = isOther;
    if (!isOther) otherTitle.value = '';
  }

  function normalizedName(record) {
    const fullName = record.name || [
      record.title,
      record.first_name || record.firstName,
      record.middle_name || record.middleName,
      record.last_name || record.lastName,
      record.suffix,
    ].filter(Boolean).join(' ');
    return String(fullName).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  region.addEventListener('change', updateOffices);
  title.addEventListener('change', syncTitle);
  const handleFormChange = control => {
    control.setCustomValidity('');
    if (!pendingChangeNoticeShown) {
      pendingChangeNoticeShown = true;
      notify('Registration details changed. They will be saved when you submit the form.', 'info');
    }
  };
  form.querySelectorAll('input, select, textarea').forEach(control => {
    control.addEventListener('input', () => handleFormChange(control));
    control.addEventListener('change', () => handleFormChange(control));
  });
  form.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (validate(currentStep)) showStep(currentStep + 1);
  }));
  form.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(currentStep - 1)));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    for (let index = 0; index < steps.length; index++) {
      showStep(index);
      if (!validate(index)) return;
    }

    const entry = Object.fromEntries([...new FormData(form)].map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]));
    if (entry.title === 'Other') entry.title = entry.other_title.trim();
    delete entry.other_title;

    const fullName = [entry.first_name, entry.middle_name, entry.last_name, entry.suffix].filter(Boolean).join(' ');
    const normalizedEntryName = normalizedName({ ...entry, name: fullName });
    const existingRecords = window.TmisStore.records('tmis-resource-persons');
    const duplicateInRegion = existingRecords.find(record =>
      String(record.region_id) === String(entry.region_id)
      && normalizedName(record) === normalizedEntryName
    );
    if (duplicateInRegion) {
      notify('A resource person with this name is already registered in the selected region. No duplicate record was created.', 'warning');
      showStep(1);
      return;
    }
    const sameNameInAnotherRegion = existingRecords.some(record =>
      String(record.region_id) !== String(entry.region_id)
      && normalizedName(record) === normalizedEntryName
    );
    if (sameNameInAnotherRegion) {
      notify('A resource person with the same name exists in another region. Registration can continue for this selected region.', 'info');
    }

    submitting = true;
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    try {
      const temporaryId = `RP-TEMP-${crypto.randomUUID()}`;
      const result = await window.TmisStore.setItem('tmis-resource-persons', JSON.stringify([
        ...existingRecords,
        { ...entry, name: fullName, id: temporaryId, status: entry.status || 'Active', savedAt: new Date().toISOString() },
      ]));
      const id = result?.idMappings?.[temporaryId];
      if (!id) {
        throw new Error('The resource person was not saved. Refresh the page and try again.');
      }

      notify(`Resource person ${id} was registered successfully for ${region.selectedOptions[0]?.textContent} · ${office.selectedOptions[0]?.textContent}.`, 'success');
      form.reset();
      updateOffices();
      syncTitle();
      pendingChangeNoticeShown = false;
      showStep(0);
    } catch (error) {
      const serverUnavailable = error?.status >= 500 || error instanceof TypeError;
      const message = serverUnavailable
        ? 'The system is temporarily unavailable. Your resource person information was not saved. Please try again later.'
        : error instanceof Error ? error.message : 'The resource person could not be registered. Try again.';
      const duplicate = /already registered in this region|same name.*region|duplicate/i.test(message);
      notify(message, duplicate ? 'warning' : 'error');
      if (duplicate) showStep(1);
    } finally {
      submitting = false;
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });

  updateOffices();
  syncTitle();
  showStep(0);
});
