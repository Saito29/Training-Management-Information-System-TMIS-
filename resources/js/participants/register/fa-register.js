document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.card-form form');
  if (!form) return;
  const steps = [...form.querySelectorAll('.fa-wizard-step')];
  const indicators = [...document.querySelectorAll('#wizard-steps [data-step]')];
  const fields = ['faProvince', 'faDistrict', 'faMunicipality', 'faBarangay'].map(id => document.getElementById(id));
  const [province, district, municipality, barangay] = fields;
  const regionSelect = document.getElementById('faRegion');
  const officeSelect = document.getElementById('faOffice');
  const submitButton = form.querySelector('button[type="submit"]');
  const pageData = window.TMIS_PAGE;
  const registration = pageData?.registration || {};
  const locations = Array.isArray(registration.locations) ? registration.locations : [];
  let submitting = false;

  function fill(select, values, prompt, enabled = values.length > 0) {
    select.replaceChildren(new Option(prompt, ''), ...values.map(location => new Option(location.name, String(location.id))));
    select.disabled = !enabled;
  }
  function locationsFor(kind, parentId = null) {
    return locations.filter(location =>
      location.kind === kind
      && String(location.region_id) === regionSelect.value
      && (parentId === null ? location.parent_id === null : String(location.parent_id) === String(parentId))
    );
  }
  function resetLocationFields() {
    fill(district, [], 'Choose province first', false);
    fill(municipality, [], 'Choose district first', false);
    fill(barangay, [], 'Choose municipality first', false);
  }
  function updateProvinces() {
    const provinces = locationsFor('province');
    fill(province, provinces, provinces.length ? 'Choose province' : 'No provinces available', Boolean(regionSelect.value));
    resetLocationFields();
  }
  function showStep(index) {
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
    indicators.forEach((indicator, stepIndex) => {
      indicator.classList.toggle('is-current', stepIndex === index);
      indicator.classList.toggle('is-completed', stepIndex < index);
      indicator.setAttribute('aria-current', stepIndex === index ? 'step' : 'false');
    });
    steps[index].querySelector('h6')?.focus({ preventScroll: true });
  }
  function resetForm() {
    form.reset();
    regionSelect.value = '';
    regionSelect.dispatchEvent(new Event('change', { bubbles: true }));
    form.querySelectorAll('[aria-invalid="true"]').forEach(control => control.removeAttribute('aria-invalid'));
    showStep(0);
  }
  function validateStep(index) {
    const invalid = [...steps[index].querySelectorAll('[required]')].find(control => !control.checkValidity());
    if (invalid) { invalid.reportValidity(); invalid.focus(); return false; }
    return true;
  }

  const isInScope = (selectedIds, id) => selectedIds == null || selectedIds.some(value => String(value) === String(id));
  const availableRegions = (registration.regions || []).filter(region => isInScope(registration.regionIds, region.region_id));
  regionSelect.replaceChildren(new Option(availableRegions.length ? 'Choose region' : 'No regions available', ''), ...availableRegions.map(region => new Option(region.name, String(region.region_id))));
  const updateOffices = () => {
    const offices = (registration.offices || []).filter(office => String(office.region_id) === regionSelect.value && isInScope(registration.officeIds, office.org_id));
    officeSelect.replaceChildren(new Option(offices.length ? 'Choose office' : 'No offices available', ''), ...offices.map(office => new Option(office.name, String(office.org_id))));
    officeSelect.disabled = offices.length === 0;
    if (offices.length === 1) {
      officeSelect.value = String(offices[0].org_id);
      officeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
  regionSelect.addEventListener('change', () => {
    updateOffices();
    updateProvinces();
  });
  if (availableRegions.length === 1) {
    regionSelect.value = String(availableRegions[0].region_id);
    regionSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  province.addEventListener('change', () => {
    const districts = locationsFor('district', province.value);
    fill(district, districts, districts.length ? 'Choose district' : 'No districts available', Boolean(province.value));
    fill(municipality, [], 'Choose district first', false);
    fill(barangay, [], 'Choose municipality first', false);
  });
  district.addEventListener('change', () => {
    const municipalities = locationsFor('municipality', district.value);
    fill(municipality, municipalities, municipalities.length ? 'Choose municipality' : 'No municipalities available', Boolean(district.value));
    fill(barangay, [], 'Choose municipality first', false);
  });
  municipality.addEventListener('change', () => {
    const barangays = locationsFor('barangay', municipality.value);
    fill(barangay, barangays, barangays.length ? 'Choose barangay' : 'No barangays available', Boolean(municipality.value));
  });
  document.getElementById('faNextStep').addEventListener('click', () => {
    if (validateStep(0)) showStep(1);
  });
  document.getElementById('faPreviousStep').addEventListener('click', () => showStep(0));
  const today = new Date();
  document.getElementById('faRegistrationDate').max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yearCovered = document.getElementById('faYearCovered');
  for (let year = today.getFullYear() + 1; year >= 2000; year--) yearCovered.add(new Option(String(year), String(year)));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    if (!validateStep(0)) {
      showStep(0);
      window.TmisToast?.show('Complete the required association and location fields before continuing.', 'error');
      return;
    }
    if (!validateStep(1)) {
      window.TmisToast?.show('Complete the required registration details before submitting.', 'error');
      return;
    }
    if (!regionSelect.value || !officeSelect.value) {
      const message = 'Choose the association region and office before registering.';
      document.getElementById('faFormStatus').textContent = message;
      window.TmisToast?.show(message, 'error');
      (regionSelect.value ? officeSelect : regionSelect).focus();
      return;
    }
    submitting = true;
    submitButton.disabled = true;
    const entry = Object.fromEntries(new FormData(form));
    for (const [key, select] of [['province', province], ['district', district], ['municipality', municipality], ['barangay', barangay]]) {
      entry[`${key}_id`] = select.value;
      entry[key] = select.selectedOptions[0].textContent.trim();
    }
    try {
      const temporaryId = `FA-TEMP-${crypto.randomUUID()}`;
      const records = window.TmisStore.records('tmis-farmer-associations');
      const result = await window.TmisStore.setItem('tmis-farmer-associations', JSON.stringify([
        ...records,
        { ...entry, id: temporaryId, status: 'Active', savedAt: new Date().toISOString() },
      ]));
      if (!result?.idMappings?.[temporaryId]) {
        throw new Error('The association was saved, but its reference ID could not be resolved. Refresh the association list to continue.');
      }
      const status = document.getElementById('faFormStatus');
      status.textContent = '';
      window.TmisToast?.show('Farmer association registered successfully.', 'success');
      resetForm();
    } catch (error) {
      const duplicate = error?.status === 404 || error?.status === 409 || /duplicate|already exists/i.test(error?.message || '');
      const message = duplicate
        ? 'This association reference may already be in use. Refresh the form and try again.'
        : error instanceof Error
          ? error.message
          : 'Could not save the association. Please refresh and try again.';
      document.getElementById('faFormStatus').textContent = message;
      window.TmisToast?.show(message, duplicate ? 'warning' : 'error');
    } finally {
      submitting = false;
      submitButton.disabled = false;
    }
  });
  showStep(0);
});
