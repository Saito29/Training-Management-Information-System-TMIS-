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
  const createAssociationButton = document.querySelector('#openCreateAssociation');
  const createAssociationForm = document.querySelector('#createFarmerAssociationForm');
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

  const duplicateDialog = document.querySelector('#participantDuplicateDialog');
  const duplicateList = document.querySelector('#participantDuplicateList');
  const duplicateError = document.querySelector('#participantDuplicateError');
  const routeForFarmer = (page, id) => `${page}?id=${encodeURIComponent(id)}`;
  function showPossibleMatches(matches, values) {
    duplicateError.hidden = true;
    duplicateList.replaceChildren();
    for (const match of matches) {
      const card = document.createElement('article');
      card.className = 'participant-duplicate-card';
      const name = document.createElement('h3'); name.textContent = match.name || 'Farmer record'; card.append(name);
      const details = document.createElement('dl');
      for (const [label, value] of [
        ['Farmer ID', match.farmerNumber], ['Date of birth', match.dateOfBirth], ['Sex', match.sex],
        ['Current region and office', [match.region, match.office].filter(Boolean).join(' - ')],
        ['Farmer organization', match.association || 'No organization linked'],
        ['Beneficiary offices', (match.beneficiaryOffices || []).map(item => `${item.office} - ${item.region}`).join('; ') || 'No beneficiary offices linked'],
        ['Status', match.isActive ? 'Active' : 'Inactive'],
      ]) {
        const row = document.createElement('div'), term = document.createElement('dt'), description = document.createElement('dd');
        term.textContent = label; description.textContent = value || 'Not recorded'; row.append(term, description); details.append(row);
      }
      card.append(details);
      const actions = document.createElement('div'); actions.className = 'participant-duplicate-actions';
      if (match.isCurrentBeneficiary) {
        if (match.canView) {
          const view = document.createElement('a'); view.className = 'btn btn-outline-secondary'; view.href = routeForFarmer('../id/view-farmer', match.id); view.target = '_blank'; view.rel = 'noopener'; view.textContent = 'View profile';
          actions.append(view);
        }
        if (match.canEdit) {
          const edit = document.createElement('a'); edit.className = 'btn btn-outline-secondary'; edit.href = routeForFarmer('../id/edit-farmer', match.id); edit.target = '_blank'; edit.rel = 'noopener'; edit.textContent = 'Edit profile';
          actions.append(edit);
        }
        const assigned = document.createElement('span'); assigned.className = 'participant-duplicate-linked'; assigned.textContent = 'Already linked to this office'; actions.append(assigned);
      } else {
        const link = document.createElement('button'); link.type = 'button'; link.className = 'btn btn-success'; link.textContent = 'Link as beneficiary here';
        link.disabled = !match.isActive;
        if (!match.isActive) link.title = 'Inactive profiles cannot be linked as active beneficiaries.';
        link.addEventListener('click', async () => {
          link.disabled = true; link.setAttribute('aria-busy', 'true');
          try {
            const linkUrl = form.dataset.beneficiaryUrlTemplate.replace('__participant__', encodeURIComponent(match.id));
            const result = await window.TmisStore.request(linkUrl, {
              fname: values.fname, lname: values.lname, dob: values.dob, gender: values.gender,
              region_id: values.region_id, org_id: values.org_id,
            });
            if (result.can_view) {
              window.location.assign(routeForFarmer('../id/view-farmer', result.participant_id || match.id));
            } else {
              link.removeAttribute('aria-busy');
              link.textContent = 'Linked to this office';
              const linked = document.createElement('span'); linked.className = 'participant-duplicate-linked'; linked.textContent = 'Saved. Your role does not include viewing participant profiles.'; actions.append(linked);
            }
          } catch (error) {
            duplicateError.textContent = error.message || 'This farmer could not be linked to your office.';
            duplicateError.hidden = false; link.disabled = false; link.removeAttribute('aria-busy');
          }
        });
        actions.append(link);
      }
      card.append(actions); duplicateList.append(card);
    }
    duplicateDialog.showModal();
    document.querySelector('#closeParticipantDuplicate').focus();
  }

  document.querySelector('#closeParticipantDuplicate')?.addEventListener('click', () => duplicateDialog.close());
  document.querySelector('#cancelParticipantDuplicate')?.addEventListener('click', () => duplicateDialog.close());
  duplicateDialog?.addEventListener('click', event => { if (event.target === duplicateDialog) duplicateDialog.close(); });
  document.querySelector('#createSeparateParticipant')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    setSubmitLoading(true);
    try {
      const values = Object.fromEntries(new FormData(form));
      const result = await window.TmisStore.request(form.action, { ...values, confirm_duplicate: true });
      window.TmisStore.publish(result);
      window.location.assign('../id/view-farmer?id=' + encodeURIComponent(result.participant_id));
    } catch (error) {
      duplicateError.textContent = error.message || 'A separate farmer profile could not be created.';
      duplicateError.hidden = false;
    } finally {
      button.disabled = false;
      setSubmitLoading(false);
    }
  });

  // The submit event only fires after built-in required/pattern validation.
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    setSubmitLoading(true);
    try {
      const values = Object.fromEntries(new FormData(form));
      const { matches = [] } = await window.TmisStore.request(form.dataset.matchUrl, values);
      if (matches.length) {
        setSubmitLoading(false);
        showPossibleMatches(matches, values);
        return;
      }
      const result = await window.TmisStore.request(form.action, values);
      window.TmisStore.publish(result);
      const id = result.participant_id;
      window.TmisToast?.show('Record saved successfully.', 'success');
      location.assign('../id/view-farmer?id=' + encodeURIComponent(id));
    } catch (error) {
      if (error.response?.matches?.length) {
        setSubmitLoading(false);
        showPossibleMatches(error.response.matches, Object.fromEntries(new FormData(form)));
        return;
      }
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
  const coveredYear = form.elements.namedItem('yearCovered');
  if (coveredYear) {
    const currentYear = new Date().getFullYear();
    coveredYear.replaceChildren(...Array.from({length: 27}, (_, index) => String(currentYear + 1 - index)).map(year => new Option(year, year, year === String(currentYear), year === String(currentYear))));
  }
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
    if (createAssociationButton) createAssociationButton.disabled = !office.value || !associationStatus.some(radio => radio.checked && radio.value === 'Yes');
  }
  const visible = (selected, value) => selected === null || selected === undefined || selected.some(item => String(item) === String(value));
  region.addEventListener('change', () => {
    const rows = data.offices.filter(row => String(row.region_id) === region.value && visible(data.registration.regionIds, row.region_id) && visible(data.registration.officeIds, row.org_id));
    fill(office, rows.map(row => ({id:row.org_id,name:row.name})), 'Select an office');
    if (rows.length === 1) office.value = String(rows[0].org_id);
    associations();
  });
  office.addEventListener('change', associations);
  const regions = data.regions.filter(row => visible(data.registration.regionIds, row.region_id));
  fill(region, regions.map(row => ({id:row.region_id,name:row.name})), 'Select a region');
  if (regions.length === 1) {region.value=String(regions[0].region_id);region.dispatchEvent(new Event('change',{bubbles:true}));}
  const canCreateAssociation = data.permissions?.includes('associations.create') === true && data.permissions?.includes('associations.read') === true;
  if (createAssociationButton) createAssociationButton.hidden = !canCreateAssociation;
  const associationYear = document.querySelector('#newAssociationYear');
  const associationDate = document.querySelector('#newAssociationDate');
  if (associationDate) associationDate.value = new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Manila'});
  if (associationYear) {
    const currentYear = new Date().getFullYear();
    associationYear.replaceChildren(new Option('Select year', ''), ...Array.from({length: 27}, (_, index) => String(currentYear + 1 - index)).map(year => new Option(year, year, false, year === String(currentYear))));
  }
  const createAssociationModalElement = document.querySelector('#createFarmerAssociationModal');
  associationStatus.forEach(radio => radio.addEventListener('change', () => {
    if (createAssociationButton) createAssociationButton.disabled = !office.value || radio.value !== 'Yes' || !radio.checked;
  }));
  createAssociationButton?.addEventListener('click', () => {
    if (!canCreateAssociation || createAssociationButton.disabled) return;
    bootstrap.Modal.getOrCreateInstance(createAssociationModalElement).show();
  });
  createAssociationForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.querySelector('#createFarmerAssociationError');
    const submit = createAssociationForm.querySelector('[type="submit"]');
    error.hidden = true;
    if (!canCreateAssociation || !region.value || !office.value) return;
    submit.disabled = true;
    try {
      const values = new FormData(createAssociationForm);
      const name = String(values.get('association_name') || '').trim();
      const association = {
        id: `FA-${window.crypto?.randomUUID?.() || Date.now().toString(36)}`,
        association_name: name,
        short_name: String(values.get('short_name') || '').trim(),
        organization_type: String(values.get('organization_type') || ''),
        region_id: Number(region.value),
        org_id: Number(office.value),
        year_covered: String(values.get('year_covered') || ''),
        registration_date: String(values.get('registration_date') || ''),
        status: 'Active',
      };
      await window.TmisStore.saveRecord('tmis-farmer-associations', association);
      associations();
      associationName.value = association.id;
      syncAssociationFields();
      createAssociationForm.reset();
      bootstrap.Modal.getOrCreateInstance(createAssociationModalElement).hide();
    } catch (failure) {
      error.textContent = failure.message || 'The association could not be created.';
      error.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });
  const birthDate = form.elements.namedItem('dob');
  if (birthDate) birthDate.max = data.dashboard.today || new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Manila'});
  updateWizard();
});
