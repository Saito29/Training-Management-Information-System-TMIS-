/* Connect form activity to the registration wizard's active/completed states. */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.card-form form');
  const steps = [...document.querySelectorAll('#wizard-steps [data-step]')];
  const fieldsets = [...document.querySelectorAll('.card-form .wizard-step')];
  const indigenousGroup = document.querySelector('#indegenous_group');
  const tribeName = document.querySelector('#tribe_name');
  const dietaryRestriction = document.querySelector('#dietary_restriction');
  const allergiesOn = document.querySelector('#allergies_on');
  const region = document.querySelector('#region_id');
  const district = document.querySelector('#district_number');
  const province = document.querySelector('#province_id');
  const municipality = document.querySelector('#municipality_id');
  const barangay = document.querySelector('#barangay_id');
  const associationStatus = [...document.querySelectorAll('input[name="association_status"]')];
  const associationName = document.querySelector('#associate_name');
  const associationRole = document.querySelector('#associate_role');
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form || !steps.length || !fieldsets.length) return;

  let currentStep = Number(
    document.querySelector('#wizard-steps .is-current, #wizard-steps .active')?.dataset.step ?? 0
  );

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

  form.querySelectorAll('input, select, textarea').forEach(observeProgrammaticValueChanges);
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
      const values = Object.fromEntries(new FormData(form));
      const result = await window.TmisStore.request(form.action, values);
      window.TmisStore.publish(result);
      const id = result.participant_id;
      window.TmisToast?.show('Record saved successfully.', 'success');
      location.assign('../id/view-farmer?id=' + encodeURIComponent(id));
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

  const syncTribeName = () => {
    if (!tribeName) return;

    const canEnterTribeName = indigenousGroup?.value === 'Yes';

    tribeName.disabled = !canEnterTribeName;

    if (!canEnterTribeName) {
      tribeName.value = '';
    }
  };

  indigenousGroup?.addEventListener('change', syncTribeName);
  syncTribeName();

  const syncAllergies = () => {
    if (!allergiesOn) return;

    const canEnterAllergies = dietaryRestriction?.value === 'Allergies';

    allergiesOn.disabled = !canEnterAllergies;

    if (!canEnterAllergies) {
      allergiesOn.value = '';
    }
  };

  dietaryRestriction?.addEventListener('change', syncAllergies);
  syncAllergies();

  const syncAssociationFields = () => {
    const belongsToAssociation = associationStatus.some(
      (radio) => radio.checked && radio.value === 'Yes'
    );

    [associationName, associationRole].forEach((field) => {
      if (!field) return;

      field.disabled = !belongsToAssociation;
      field.required = belongsToAssociation;

      if (!belongsToAssociation) {
        field.value = '';
      }
    });
  };

  associationStatus.forEach((radio) => {
    radio.addEventListener('change', syncAssociationFields);
  });
  syncAssociationFields();

  // Each child list is resolved from its stored parent ID; no demo locations are injected.
  const data = window.TMIS_PAGE;
  const locations = data.registration.locations;
  const office = form.elements.namedItem('org_id');
  function fill(select, rows, placeholder, preserve = false) {
    if (!select) return;
    const previous = preserve ? select.value : '';
    select.replaceChildren(new Option(rows.length ? placeholder : 'No records available', ''), ...rows.map(row => new Option(row.label || row.name, String(row.value ?? row.id ?? row.region_id ?? row.org_id))));
    // Keep empty lists required: an incomplete hierarchy must never silently bypass registration.
    select.disabled = false;
    if (previous && [...select.options].some(option => option.value === previous)) select.value = previous;
    select.dispatchEvent(new Event('change', {bubbles:true}));
  }
  for (const [name, rows] of Object.entries(data.registration.options)) fill(form.elements.namedItem(name), rows, 'Select an option');
  fill(form.elements.namedItem('pob'), locations.filter(row => row.kind === 'municipality'), 'Select a municipality / city');
  const chain = [region, province, district, municipality, barangay];
  const kinds = ['region', 'province', 'district', 'municipality', 'barangay'];
  function children(index) {
    if (index >= chain.length) return;
    const parent = chain[index - 1].value;
    fill(chain[index], parent ? locations.filter(row => row.kind === kinds[index] && String(row.region_id) === region.value && (index === 1 || String(row.parent_id) === parent)) : [], 'Select a '+kinds[index]);
  }
  for (let index = 0; index < chain.length - 1; index++) chain[index].addEventListener('change', () => children(index + 1));
  function associations() {
    fill(associationName, window.TmisStore.records('tmis-farmer-associations').filter(row => row.status !== 'Inactive' && String(row.region_id) === region.value && String(row.org_id) === office.value).map(row => ({id:row.id,name:row.association_name})), 'Select an association', true);
    syncAssociationFields();
  }
  region.addEventListener('change', () => {
    const rows = data.offices.filter(row => String(row.region_id) === region.value && (data.administrator || String(row.org_id) === String(data.registration.officeId)));
    fill(office, rows.map(row => ({id:row.org_id,name:row.name})), 'Select an office');
    if (rows.length === 1) office.value = String(rows[0].org_id);
    associations();
  });
  office.addEventListener('change', associations);
  const regions = data.administrator ? data.regions : data.regions.filter(row => String(row.region_id) === String(data.registration.regionId));
  fill(region, regions.map(row => ({id:row.region_id,name:row.name})), 'Select a region');
  if (regions.length === 1) {region.value=String(regions[0].region_id);region.dispatchEvent(new Event('change',{bubbles:true}));}
  const birthDate = form.elements.namedItem('dob');
  if (birthDate) birthDate.max = data.dashboard.today || new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Manila'});
  updateWizard();
});
