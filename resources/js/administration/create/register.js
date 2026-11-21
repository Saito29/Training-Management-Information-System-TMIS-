document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('userRegisterForm');
  if (!form) return;
  form.elements.role.querySelector('option[value="System Administrator"]')?.remove();
  // Remove notices created by the previous form version during a live reload.
  document.querySelectorAll('#userFormMessage, .user-form-message, .user-field-error').forEach((notice) => notice.remove());
  const steps = [...form.querySelectorAll('.user-step')];
  const indicators = [...document.querySelectorAll('#userWizardSteps [data-step]')];
  const back = document.getElementById('userBack');
  const next = document.getElementById('userNext');
  const submit = document.getElementById('userSubmit');
  const again = document.getElementById('userAgain');
  const toastElement = document.getElementById('userRegisterToast');
  const toast = toastElement && window.bootstrap?.Toast
    ? window.bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 5500 })
    : null;
  const toastDetails = {
    success: { title: 'Registration saved', icon: 'bi-check-circle-fill' },
    warning: { title: 'Check registration', icon: 'bi-exclamation-triangle-fill' },
    error: { title: 'Registration error', icon: 'bi-x-circle-fill' },
    info: { title: 'Information', icon: 'bi-info-circle-fill' },
  };
  // All status feedback is announced by this toast. Invalid controls keep only
  // a visual outline and focus; no notification text is inserted into the form.
  function showToast(text, type = 'warning') {
    if (!toast) return;
    const detail = toastDetails[type] || toastDetails.warning;
    toastElement.classList.remove('is-success', 'is-warning', 'is-error', 'is-info');
    toastElement.classList.add(`is-${type}`);
    toastElement.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toastElement.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    document.getElementById('userRegisterToastTitle').textContent = detail.title;
    document.getElementById('userRegisterToastIcon').className = `bi ${detail.icon}`;
    document.getElementById('userRegisterToastBody').textContent = text;
    toast.show();
  }
  const regionSelect = form.elements.region;
  const officeSelect = form.elements.office;
  const credentialField = form.querySelector('[data-credential-field]');
  const credentialSelect = form.elements.credentialTypeId;
  const dateInput = form.elements.dateOfBirth;
  const emailInput = form.elements.email;
  // Keep the native date input for keyboard entry and validation; this visible
  // button opens its picker because the browser-supplied icon is theme-dependent.
  document.getElementById('userDatePickerButton')?.addEventListener('click', () => {
    try {
      if (typeof dateInput.showPicker === 'function') dateInput.showPicker();
      else { dateInput.focus(); dateInput.click(); }
    } catch { dateInput.focus(); }
  });
  // Use the user's local calendar day so a date near midnight remains valid.
  const today = new Date();
  dateInput.max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  let step = 0;

  const fields = ['firstName', 'middleName', 'lastName', 'suffix', 'dateOfBirth', 'email', 'phone', 'role', 'credentialTypeId', 'office', 'region', 'position'];
  let allowedRoles = new Set(), offices = [], regions = [], credentialTypes = {};
  function syncCredentialOptions() {
    const role = form.elements.role.value;
    const isSystemAdministrator = role === 'System Administrator';
    const credentials = credentialTypes[role] || [];
    credentialField.hidden = !role || isSystemAdministrator;
    credentialSelect.disabled = !role || isSystemAdministrator;
    credentialSelect.required = Boolean(role && !isSystemAdministrator);
    credentialSelect.replaceChildren(
      new Option(isSystemAdministrator ? 'No credential required' : credentials.length ? 'Select a role credential' : 'No active credentials configured', ''),
      ...credentials.map(credential => new Option(credential.name, String(credential.id))),
    );
    const help = document.getElementById('userCredentialHelp');
    if (help) {
      help.textContent = isSystemAdministrator
        ? 'System Administrator accounts do not require a role credential.'
        : credentials.length
          ? 'An active credential for this role is required before approval and sign-in.'
          : 'No active credentials are configured for this role. Contact a System Administrator.';
    }
  }
  function syncOffices() {
    const region = regionSelect.value;
    officeSelect.replaceChildren(new Option(region ? 'No active offices are registered for this region' : 'Select a region first', ''));
    officeSelect.disabled = !region;
    const selectedRegion = regions.find(item => item.name === region);
    if (!selectedRegion) return;
    const normalizedRegionName = String(selectedRegion.name).trim().toLocaleLowerCase();
    const matchingOffices = offices.filter(office => String(office.region_id) === String(selectedRegion.id)
      && String(office.region_name || '').trim().toLocaleLowerCase() === normalizedRegionName);
    officeSelect.replaceChildren(new Option(
      matchingOffices.length ? 'Select an office or organization' : `No active offices are registered for ${selectedRegion.name}`,
      '',
    ));
    matchingOffices.forEach(office => officeSelect.add(new Option(office.name, office.name)));
  }
  form.addEventListener('change', event => {
    if (event.target instanceof HTMLSelectElement && event.target.name === 'region') syncOffices();
  });
  form.elements.role.addEventListener('change', syncCredentialOptions);
  syncOffices();
  next.disabled = true;
  fetch(form.dataset.optionsUrl, { headers: { Accept: 'application/json' } }).then(async response => {
    if (response.redirected || response.status === 401) {
      const error = new Error('Your session has expired. Sign in again to continue registering an account.');
      error.sessionExpired = true;
      throw error;
    }
    if (response.status === 403) {
      throw new Error('Your account does not have permission to load registration options. Ask an administrator to grant access to user registration.');
    }
    if (!response.ok) {
      throw new Error(response.status >= 500
        ? 'The server could not load registration options. Please try again shortly.'
        : `Registration options could not be loaded (HTTP ${response.status}). Refresh the page or contact an administrator.`);
    }
    const data = await response.json();
    allowedRoles = new Set(data.roles); offices = data.offices; regions = data.regions; credentialTypes = data.credentialTypes || {};
    form.elements.role.replaceChildren(
      new Option('Select a role', ''),
      ...data.roles.map(role => new Option(
        role,
        role,
      )),
    );
    syncCredentialOptions();
    regionSelect.replaceChildren(new Option('Select region', ''), ...regions.map(region => new Option(region.name, region.name)));
    syncOffices(); next.disabled = false;
  }).catch(error => {
    if (error.sessionExpired) {
      window.location.replace(form.dataset.loginUrl);
      return;
    }
    showToast(error instanceof TypeError
      ? 'Could not connect to the server to load registration options. Check your connection and try again.'
      : error.message, 'error');
  });
  const value = (name) => form.elements[name].value.trim();
  const normalizeEmail = () => { emailInput.value = emailInput.value.trim().toLowerCase(); };
  // Keep the invalid field in focus while the toast explains the correction.
  // Apply server validation errors to the matching control when an API is added.
  function clearFieldError(input) {
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
  }
  function showFieldError(input, text) {
    clearFieldError(input);
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    showToast(text, input.validity.typeMismatch ? 'error' : 'warning');
  }
  form.addEventListener('input', (event) => { if (event.target.matches('input, select')) clearFieldError(event.target); });
  form.addEventListener('change', (event) => { if (event.target.matches('input, select')) clearFieldError(event.target); });
  function validateCurrent() {
    if (step === 0) normalizeEmail();
    if (step === 1 && form.elements.role.value !== 'System Administrator'
      && !(credentialTypes[form.elements.role.value] || []).length) {
      showToast('This account cannot continue because no active credential is configured for the selected role.', 'info');
      credentialSelect.focus();
      return false;
    }
    for (const input of steps[step].querySelectorAll('input, select')) {
      if (input.required && !input.value.trim()) {
        showFieldError(input, `Enter or select ${input.labels?.[0]?.textContent.replace('*', '').trim().toLowerCase() || 'this value'}.`);
        return false;
      }
      if (!input.checkValidity()) {
        showFieldError(input, input.validity.typeMismatch ? 'Enter a valid work email address.' : input.validationMessage);
        return false;
      }
    }
    return true;
  }
  emailInput.addEventListener('blur', () => {
    normalizeEmail();
    if (emailInput.value && !emailInput.checkValidity()) {
      showFieldError(emailInput, 'Enter a valid email address, such as name@example.com.');
    }
  });
  function review() {
    const labels = [
      ['Full name', [value('firstName'), value('middleName'), value('lastName'), value('suffix')].filter(Boolean).join(' ')],
      ['Date of birth', value('dateOfBirth') || '—'],
      ['Work email', value('email')], ['Mobile number', value('phone') || '—'],
      ['User role', value('role')],
      ['Role credential', value('role') === 'System Administrator'
        ? 'Not required for System Administrator'
        : (credentialTypes[value('role')] || []).find(credential => String(credential.id) === value('credentialTypeId'))?.name || 'Not assigned'],
      ['Region', value('region')],
      ['Office / organization', value('office')], ['Position', value('position') || '—'],
      ['Registration status', 'Pending approval'],
    ];
    const list = document.getElementById('userReview');
    list.replaceChildren(...labels.map(([label, text]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = text;
      row.append(term, description);
      return row;
    }));
  }
  function render(moveFocus = false) {
    steps.forEach((section, index) => { section.hidden = index !== step; });
    indicators.forEach((item, index) => {
      item.classList.toggle('is-current', index === step);
      item.classList.toggle('is-completed', index < step);
      if (index === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    back.hidden = step === 0;
    next.hidden = step === steps.length - 1;
    submit.hidden = step !== steps.length - 1;
    again.hidden = true;
    if (step === steps.length - 1) review();
    // Put keyboard and screen-reader users at the newly visible step heading.
    const heading = steps[step].querySelector('h5');
    if (moveFocus && heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }
  next.addEventListener('click', () => {
    if (!validateCurrent()) return;
    step++;
    render(true);
  });
  back.addEventListener('click', () => { step--; render(true); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (step !== steps.length - 1) return;
    if (!allowedRoles.has(value('role'))) {
      step = 1;
      render();
      showToast('Select a user role available to your account.', 'warning');
      form.elements.role.focus();
      return;
    }
    if (!regionSelect.value || !officeSelect.value || ![...officeSelect.options].some((option) => option.value === officeSelect.value && option.value)) {
      step = 1;
      render();
      showToast('Select a region and an office or organization from its list.', 'warning');
      officeSelect.focus();
      return;
    }
    try {
      submit.disabled = true;
      const record = Object.fromEntries(fields.map(name => [name, value(name)]));
      const response = await fetch(form.action, { method: 'POST', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: JSON.stringify(record) });
      if (response.redirected) throw new Error('Your session expired. Sign in again.');
      const data = await response.json();
      if (!response.ok) throw new Error(Object.values(data.errors || {}).flat().join(' ') || data.message || 'Registration failed.');
      steps.forEach((section) => { section.hidden = true; });
      indicators.forEach((item) => { item.classList.remove('is-current'); item.classList.add('is-completed'); item.removeAttribute('aria-current'); });
      back.hidden = true;
      next.hidden = true;
      submit.hidden = true;
      again.hidden = false;
      showToast(data.message, data.mailSent ? 'success' : 'warning');
    } catch (error) { showToast(error.message || 'The registration could not be saved. Please try again.', 'error'); }
    finally { submit.disabled = false; }

  });
  again.addEventListener('click', () => { form.reset(); syncOffices(); syncCredentialOptions(); step = 0; render(true); });
  render();
});
