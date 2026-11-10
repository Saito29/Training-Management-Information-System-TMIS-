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
  };
  // All status feedback is announced by this toast. Invalid controls keep only
  // a visual outline and focus; no notification text is inserted into the form.
  function showToast(text, type = 'warning') {
    if (!toast) return;
    const detail = toastDetails[type] || toastDetails.warning;
    toastElement.classList.remove('is-success', 'is-warning', 'is-error');
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
  const dateInput = form.elements.dateOfBirth;
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
  const permissionLabel = (permission) => permission.split('.').map(part => part.replaceAll('_', ' ')).join(' / ');
  function updateCredentialSummary() {
    const summary = document.getElementById('userCredentialSummary');
    const selected = (credentialTypes[form.elements.role.value] || []).find(item => String(item.id) === form.elements.credentialTypeId.value);
    if (!selected) {
      summary.hidden = true;
      summary.replaceChildren();
      return;
    }
    summary.hidden = false;
    summary.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = `${selected.name} profile adjustments`;
    summary.append(heading);
    // Keep profile grants and restrictions in separate columns so administrators can review both effects at a glance.
    const splitView = document.createElement('div');
    splitView.className = 'user-credential-split';
    const permissionGroups = [
      { label: 'Granted access', icon: 'bi-check-circle', permissions: selected.permissions || [], className: 'is-granted', empty: 'No additional access granted.' },
      { label: 'Blocked access', icon: 'bi-slash-circle', permissions: selected.deniedPermissions || [], className: 'is-blocked', empty: 'No access blocked.' },
    ];
    for (const group of permissionGroups) {
      const section = document.createElement('section');
      section.className = `user-credential-access ${group.className}`;
      const label = document.createElement('h6');
      const icon = document.createElement('i');
      icon.className = `bi ${group.icon}`;
      icon.setAttribute('aria-hidden', 'true');
      label.append(icon, document.createTextNode(group.label));
      section.append(label);
      if (group.permissions.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'user-credential-empty';
        empty.textContent = group.empty;
        section.append(empty);
      } else {
        const list = document.createElement('ul');
        for (const permission of group.permissions) {
          const item = document.createElement('li');
          item.textContent = permissionLabel(permission);
          list.append(item);
        }
        section.append(list);
      }
      splitView.append(section);
    }
    summary.append(splitView);
  }
  function syncCredentialTypes() {
    const select = form.elements.credentialTypeId;
    const options = credentialTypes[form.elements.role.value] || [];
    const selected = select.value;
    select.replaceChildren(
      new Option(options.length ? 'Select an access profile (optional)' : 'No profile - role permissions only', ''),
      ...options.map(credential => new Option(credential.name, credential.id)),
    );
    const retained = options.find(credential => String(credential.id) === selected);
        select.value = retained?.id || '';
    select.closest('[data-credential-field]').hidden = options.length === 0;
    updateCredentialSummary();
  }
  form.elements.role.addEventListener('change', () => {
    const hadProfile = Boolean(form.elements.credentialTypeId.value);
    syncCredentialTypes();
    const profileWasCleared = hadProfile && !form.elements.credentialTypeId.value;
    document.getElementById('userAccessProfileReset').hidden = !profileWasCleared;
    if (profileWasCleared) form.elements.credentialTypeId.closest('[data-credential-field]').hidden = false;
  });
  form.elements.credentialTypeId.addEventListener('change', () => {
    document.getElementById('userAccessProfileReset').hidden = true;
    updateCredentialSummary();
  });
  function syncOffices() {
    const region = regionSelect.value;
    officeSelect.replaceChildren(new Option(region ? 'Select an office or organization' : 'Select a region first', ''));
    officeSelect.disabled = !region;
    const regionId = regions.find(item => item.name === region)?.id;
    offices.filter(office => String(office.region_id) === String(regionId)).forEach(office => officeSelect.add(new Option(office.name, office.name)));
  }
  regionSelect.addEventListener('change', syncOffices);
  syncOffices();
  next.disabled = true;
  fetch(form.dataset.optionsUrl, { headers: { Accept: 'application/json' } }).then(async response => {
    if (!response.ok || response.redirected) throw new Error('Only an active System Administrator can register accounts.');
    const data = await response.json();
    allowedRoles = new Set(data.roles); offices = data.offices; regions = data.regions;
    credentialTypes = data.credentialTypes || {};
    form.elements.role.replaceChildren(new Option('Select a role', ''), ...data.roles.map(role => new Option(role, role)));
    regionSelect.replaceChildren(new Option('Select region', ''), ...regions.map(region => new Option(region.name, region.name)));
    syncOffices(); syncCredentialTypes(); next.disabled = false;
  }).catch(error => showToast(error.message, 'error'));
  const value = (name) => form.elements[name].value.trim();
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
  function review() {
    const labels = [
      ['Full name', [value('firstName'), value('middleName'), value('lastName'), value('suffix')].filter(Boolean).join(' ')],
      ['Date of birth', value('dateOfBirth') || '—'],
      ['Work email', value('email')], ['Mobile number', value('phone') || '—'],
      ['User role', value('role')],
      ['Optional access profile', form.elements.credentialTypeId.value ? form.elements.credentialTypeId.selectedOptions[0]?.textContent : 'None - role permissions only'],
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
      showToast('Select one of the available user roles.', 'warning');
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
  again.addEventListener('click', () => { form.reset(); syncOffices(); syncCredentialTypes(); step = 0; render(true); });
  render();
});
