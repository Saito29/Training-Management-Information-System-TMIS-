document.addEventListener('DOMContentLoaded', () => {
  const tabs = [...document.querySelectorAll('.training-view .training-tab')];
  const panels = [...document.querySelectorAll('.training-view .training-panel')];
  function showPanel(id, focus = false) {
    const selected = tabs.find(tab => tab.dataset.panel === id);
    const panel = panels.find(item => item.id === id);
    if (!selected || !panel) return;
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(item => { item.hidden = item !== panel; });
    document.dispatchEvent(new CustomEvent('training:tabchange', { detail: { panel } }));
    if (focus) selected.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.panel));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : -1;
      if (next < 0) return;
      event.preventDefault();
      showPanel(tabs[next].dataset.panel, true);
    });
  });
  document.querySelectorAll('.training-view [data-go-panel]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      showPanel(link.dataset.goPanel, true);
    });
  });
  showPanel('overview-panel');

  const form = document.getElementById('editTrainingForm');
  if (!form) return;
  const selectedTraining = window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings') : null;

  const trainingTypeSelect = form.elements.namedItem('training_type');
  const trainingTypeOptions = window.TMIS_PAGE?.registration?.options?.training_type;
  if (trainingTypeSelect instanceof HTMLSelectElement && Array.isArray(trainingTypeOptions)) {
    const selectedType = selectedTraining?.training_type || selectedTraining?.type || trainingTypeSelect.value;
    const options = trainingTypeOptions.map(option => new Option(option.label, option.value));
    if (selectedType && !options.some(option => option.value === selectedType)) {
      options.push(new Option(selectedType, selectedType));
    }
    trainingTypeSelect.replaceChildren(new Option('Choose type', ''), ...options);
    trainingTypeSelect.value = selectedType || '';
  }

  const trainingStatusBadge = document.getElementById('editTrainingStatusBadge');
  const trainingActiveBadge = document.getElementById('editTrainingActiveBadge');
  if (selectedTraining && trainingStatusBadge) {
    const trainingStatus = selectedTraining.workflowStatus || selectedTraining.status || 'Status not recorded';
    trainingStatusBadge.textContent = trainingStatus;
    trainingStatusBadge.dataset.status = trainingStatus.toLowerCase().replace(/[^a-z]+/g, '-');
    document.getElementById('editTrainingId').textContent = selectedTraining.id || 'Training record';
    if (trainingActiveBadge) {
      const activeStatus = selectedTraining.is_active === false ? 'Inactive' : 'Active';
      trainingActiveBadge.textContent = activeStatus;
      trainingActiveBadge.dataset.status = activeStatus.toLowerCase();
    }
  }
  const statusButton = document.getElementById('editTrainingStatusButton');
  const statusForm = document.getElementById('editTrainingStatusForm');
  if (statusButton && statusForm) {
    const statusSelect = document.getElementById('editTrainingActiveStatus');
    const remarksField = document.getElementById('editTrainingStatusRemarksField');
    const remarksInput = document.getElementById('editTrainingStatusRemarks');
    const statusError = document.getElementById('editTrainingStatusError');
    const statusSaveButton = document.getElementById('saveEditTrainingStatus');
    const hasEditPermission = window.TMIS_NAV_ACCESS?.administrator
      || window.TMIS_NAV_ACCESS?.permissions?.includes('trainings.edit');
    const databaseId = Number(selectedTraining?._db_id);
    statusButton.hidden = !hasEditPermission || !Number.isSafeInteger(databaseId) || databaseId < 1;

    function syncStatusRemarks() {
      const inactive = statusSelect.value === 'false';
      remarksField.hidden = !inactive;
      remarksInput.required = inactive;
      if (!inactive) remarksInput.value = '';
    }

    statusSelect.addEventListener('change', syncStatusRemarks);
    document.getElementById('editTrainingStatusModal').addEventListener('show.bs.modal', () => {
      document.getElementById('editTrainingStatusName').textContent =
        selectedTraining?.title || selectedTraining?.training_title || selectedTraining?.id || 'Training';
      document.getElementById('editTrainingWorkflowStatus').textContent =
        selectedTraining?.workflowStatus || selectedTraining?.status || 'Not set';
      statusSelect.value = selectedTraining?.is_active === true ? 'true' : 'false';
      remarksInput.value = selectedTraining?.statusRemarks || '';
      statusError.hidden = true;
      statusError.textContent = '';
      syncStatusRemarks();
    });

    statusForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!statusForm.reportValidity() || statusSaveButton.disabled) return;

      const version = Number(selectedTraining?.version);
      if (!Number.isSafeInteger(databaseId) || databaseId < 1
        || !Number.isSafeInteger(version) || version < 1) {
        statusError.textContent = 'The training details are invalid. Refresh the page and try again.';
        statusError.hidden = false;
        return;
      }

      statusSaveButton.disabled = true;
      statusError.hidden = true;
      try {
        const isActive = statusSelect.value === 'true';
        await window.TmisStore.request(`/operations/trainings/${databaseId}/active`, {
          is_active: isActive,
          version,
          remarks: isActive ? undefined : remarksInput.value.trim(),
        }, 'PATCH');
        const pageUrl = new URL(window.location.href);
        pageUrl.searchParams.set('trainingStatusUpdated', isActive ? 'activated' : 'deactivated');
        window.location.assign(pageUrl);
      } catch (requestError) {
        statusError.textContent = requestError instanceof Error
          ? requestError.message
          : 'The training status could not be updated.';
        statusError.hidden = false;
      } finally {
        statusSaveButton.disabled = false;
      }
    });

    const pageUrl = new URL(window.location.href);
    const updateResult = pageUrl.searchParams.get('trainingStatusUpdated');
    const successMessages = {
      activated: 'Training activated.',
      deactivated: 'Training deactivated.',
    };
    if (updateResult && successMessages[updateResult]) {
      pageUrl.searchParams.delete('trainingStatusUpdated');
      window.history.replaceState(null, '', pageUrl);
      window.TmisToast?.show(successMessages[updateResult], 'success');
    }
  }
  const storageKey = `tmis:training:${selectedTraining?.id || 'TRN-000246'}:overview`;
  const field = name => form.elements.namedItem(name);
  const state = document.getElementById('editTrainingState');
  const saveButton = form.querySelector('.training-edit-save');
  const trainerList = document.getElementById('editTrainerList');
  const trainingLocationList = document.getElementById('editTrainingLocationList');
  const addTrainingLocationButton = document.getElementById('editAddTrainingLocation');
  const questionnaireLists = {
    pretest: document.getElementById('editPretestList'),
    posttest: document.getElementById('editPosttestList'),
    trainingEvaluation: document.getElementById('editTrainingEvaluationList'),
    rpEvaluation: document.getElementById('editRpEvaluationList'),
  };
  const associationSelect = form.elements.namedItem('associationIds[]');
  if (associationSelect instanceof HTMLSelectElement) {
    const linkedIds = new Set((selectedTraining?.associationIds || []).map(String));
    const associations = window.TmisStore.records('tmis-farmer-associations')
      .filter(association => association.status !== 'Inactive' || linkedIds.has(String(association.id)));
    associationSelect.replaceChildren(...associations.map(association => {
      const option = new Option(association.association_name || association.name || association.id, association.id);
      option.disabled = association.status === 'Inactive' && !linkedIds.has(String(association.id));
      return option;
    }));
    [...associationSelect.options].forEach(option => { option.selected = linkedIds.has(option.value); });
  }
  const officeSelect = field('implementing_office');
  if (selectedTraining) {
    const officeById = window.TMIS_PAGE?.offices?.find(office =>
      String(office.org_id) === String(selectedTraining.org_id));
    const officeName = String(officeById?.name || selectedTraining.office || selectedTraining.implementing_office || '');
    const matchingOffice = [...officeSelect.options].find(option =>
      option.value === officeName || option.textContent.trim() === officeName);
    if (matchingOffice) {
      officeSelect.value = matchingOffice.value;
    } else if (officeName || selectedTraining.org_id) {
      const officeValue = officeName || String(selectedTraining.org_id);
      officeSelect.add(new Option(officeName || 'Current implementing office', officeValue));
      officeSelect.value = officeValue;
    } else {
      officeSelect.value = '';
    }
    officeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
  officeSelect.disabled = true;
  const trainers = (window.TMIS_PAGE ? window.TmisStore.records('tmis-resource-persons') : [
    { id: 'Maria Teresa Santos', name: 'Maria Teresa Santos', office: 'Department of Agriculture - Quezon Provincial Office' },
    { id: 'Roberto Mendoza', name: 'Roberto Mendoza', office: 'Agricultural Training Institute - RTC IV-A' },
    { id: 'Liza Villanueva', name: 'Liza Villanueva', office: 'Quezon State University' },
    { id: 'Dr. Maria Santos', name: 'Dr. Maria Santos', office: 'Agricultural Training Division (ATD)' },
    { id: 'Engr. Carlo Mendoza', name: 'Engr. Carlo Mendoza', office: 'Agricultural Training Division (ATD)' },
  ]).filter(resource =>
    (!selectedTraining?.region_id || String(resource.region_id) === String(selectedTraining.region_id)) &&
    (!selectedTraining?.org_id || String(resource.org_id) === String(selectedTraining.org_id)) &&
    resource.status !== 'Inactive');
  const addressNames = ['region_id', 'province_id', 'district_id', 'municipality_id', 'barangay_id'];
  const addressKinds = [
    {name: 'province', kind: 'province'},
    {name: 'district', kind: 'district'},
    {name: 'municipality', kind: 'municipality'},
    {name: 'barangay', kind: 'barangay'},
  ];
  const registration = window.TMIS_PAGE?.registration;
  const regions = registration?.regions || window.TMIS_PAGE?.regions || [];
  const locations = registration?.locations || [];
  const normalizeLocation = value => String(value || '')
    .replace(/\s*\([^)]*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLocaleLowerCase();
  const regionSelect = field('region_id');
  if (Array.isArray(regions)) {
    regionSelect.replaceChildren(
      new Option(regions.length ? 'Choose region' : 'No regions available', ''),
      ...regions.map(region => new Option(region.name, String(region.region_id)))
    );
  }

  function locationsFor(kind, parentId, regionId) {
    return locations.filter(location =>
      location.kind === kind
      && String(location.region_id) === String(regionId)
      && (kind === 'province' || String(location.parent_id) === String(parentId))
    );
  }

  function locationMatch(rows, kind, id, name, provinceName = '') {
    const byId = rows.find(location => String(location.id) === String(id));
    if (byId) return byId;
    const aliases = [name, id].filter(Boolean).map(value => String(value));
    if (kind === 'district' && provinceName) {
      aliases.push(...aliases.map(value => value
        .replace(new RegExp(`^${provinceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'), '')
        .replace(/\s+district$/i, '')));
    }
    const normalizedAliases = new Set(aliases.map(normalizeLocation).filter(Boolean));
    return rows.find(location => normalizedAliases.has(normalizeLocation(location.name)));
  }
  const questionnaireDefinitions = {
    pretest: { key:'tmis-pre-test-questionnaires', name:'trainingQuestionnaire', label:'pre-test', samples:[['PRE-GEN-01', 'General Knowledge Assessment (Pre-test)'], ['PRE-CROP-01', 'Crop Production Pre-test'], ['PRE-ORG-01', 'Organic Agriculture Pre-test'], ['PRE-BIZ-01', 'Agribusiness Pre-test']] },
    posttest: { key:'tmis-post-test-questionnaires', name:'trainingQuestionnaire', label:'post-test', samples:[['POST-GEN-01', 'General Knowledge Assessment (Post-test)'], ['POST-CROP-01', 'Crop Production Post-test'], ['POST-ORG-01', 'Organic Agriculture Post-test'], ['POST-BIZ-01', 'Agribusiness Post-test']] },
    trainingEvaluation: { key:'tmis-training-evaluation-questionnaires', name:'questionnaireName', label:'training evaluation', samples:[['TE-0001', 'Training Evaluation Questionnaire']] },
    rpEvaluation: { key:'tmis-rp-evaluation-questionnaires', name:'questionnaireName', label:'resource person evaluation', samples:[['RP-0001', 'Resource Person Evaluation Questionnaire']] },
  };
  const questionnaireOptions = Object.fromEntries(Object.entries(questionnaireDefinitions).map(([type, definition]) => {
    const assignedIds = new Set((selectedTraining?.[type] || []).map(String));
    const records = window.TMIS_PAGE
      ? window.TmisStore.records(definition.key)
      : definition.samples.map(([id, name]) => ({ id, [definition.name]: name, status:'Active' }));
    const options = records.filter(record => {
      const id = String(record.id || '');
      const status = String(record.status || 'Active').toLowerCase();
      const isAssigned = assignedIds.has(id);
      const isAvailable = status === 'active' || status === 'approved & accepted' || isAssigned;
      const regionMatches = !selectedTraining?.region_id || !record.region_id || String(record.region_id) === String(selectedTraining.region_id);
      const officeMatches = !selectedTraining?.org_id || !record.org_id || String(record.org_id) === String(selectedTraining.org_id);
      return id && isAvailable && regionMatches && officeMatches;
    }).map(record => [String(record.id), String(record[definition.name] || record.trainingQuestionnaire || record.id)]);
    if (type === 'pretest' || type === 'posttest') {
      (window.trainingAssessments?.list(type) || []).forEach(item => {
        if (assignedIds.has(String(item.id)) && !options.some(([id]) => id === String(item.id))) options.push([String(item.id), item.name]);
      });
    }
    return [type, options];
  }));
  const questionnaireLabels = Object.fromEntries(Object.entries(questionnaireDefinitions).map(([type, definition]) => [type, definition.label]));

  function addTrainer(data = {}) {
    const row = document.createElement('div');
    row.className = 'training-edit-row training-edit-trainer-row';
    row.innerHTML = '<label>Trainer / facilitator<select class="form-select" data-trainer-name required></select></label><label>Organization / office<input class="form-control" data-trainer-organization disabled></label><label>Qualification<input class="form-control" data-trainer-qualification disabled></label><label>Expertise<input class="form-control" data-trainer-expertise disabled></label><label>Contact number<input class="form-control" data-trainer-contact disabled></label><label>Email address<input class="form-control" data-trainer-email type="email" disabled></label><button class="training-edit-remove" type="button" aria-label="Remove trainer" title="Remove trainer"><i class="bi bi-trash3"></i></button>';
    const select = row.querySelector('[data-trainer-name]');
    select.add(new Option('Select a trainer / facilitator', ''));
    trainers.forEach(resource => {
      const option = new Option(resource.name || resource.id, resource.id);
      select.add(option);
    });
    const match = trainers.find(resource => resource.id === data.id || resource.name === data.name);
    if (!match && (data.id || data.name)) {
      select.add(new Option(`${data.name || data.id} (not in resource directory)`, data.id || data.name));
    }
    select.value = match?.id || data.id || data.name || '';
    fillTrainerDetails(row, data);
    trainerList.append(row);
    updateRemoveButtons();
    return row;
  }

  function fillTrainerDetails(row, fallback = {}) {
    const id = row.querySelector('[data-trainer-name]').value;
    const resource = trainers.find(item => item.id === id);
    row.querySelector('[data-trainer-organization]').value = resource?.organization_name || resource?.office || fallback.organization || '';
    row.querySelector('[data-trainer-qualification]').value = resource?.qualification || fallback.qualification || '';
    row.querySelector('[data-trainer-expertise]').value = resource?.expertise || fallback.expertise || '';
    row.querySelector('[data-trainer-contact]').value = resource?.phone || fallback.contact || '';
    row.querySelector('[data-trainer-email]').value = resource?.email || fallback.email || '';
  }

  function addQuestion(type, value = '') {
    const row = document.createElement('div');
    row.className = 'training-edit-row training-edit-question-row';
    row.innerHTML = '<label class="training-edit-row-wide">Questionnaire<select class="form-select" required></select></label><button class="training-edit-remove" type="button" aria-label="Remove questionnaire" title="Remove questionnaire"><i class="bi bi-trash3"></i></button>';
    const select = row.querySelector('select');
    select.name = `${type}_questionnaire[]`;
    select.add(new Option(`Select ${questionnaireLabels[type]} questionnaire`, ''));
    questionnaireOptions[type].forEach(([id, label]) => select.add(new Option(label, id)));
    if (value && ![...select.options].some(option => option.value === value)) select.add(new Option(value, value));
    select.value = value;
    questionnaireLists[type].append(row);
    updateRemoveButtons();
    return row;
  }

  function addTrainingLocation(location = {}) {
    if (!trainingLocationList) return;
    const row = document.createElement('div');
    row.className = 'training-edit-row training-edit-location-row';
    row.innerHTML = '<label>Venue <input class="form-control" data-location-venue maxlength="255" required placeholder="Training venue"></label><label>Region <select class="form-select" data-location-region required></select></label><label>Province <select class="form-select" data-location-province required disabled></select></label><label>District <select class="form-select" data-location-district required disabled></select></label><label>Municipality / City <select class="form-select" data-location-municipality required disabled></select></label><label>Barangay <select class="form-select" data-location-barangay required disabled></select></label><button class="training-edit-remove" type="button" data-remove-training-location aria-label="Remove training location" title="Remove training location"><i class="bi bi-trash3"></i></button>';
    row.querySelector('[data-location-venue]').value = location.venue || '';
    const rowRegion = row.querySelector('[data-location-region]');
    rowRegion.replaceChildren(new Option(regions.length ? 'Choose region' : 'No regions available', ''), ...regions.map(item => new Option(item.name, String(item.region_id))));
    const rowAddressFields = ['province', 'district', 'municipality', 'barangay'].map(kind => ({
      kind,
      select: row.querySelector(`[data-location-${kind}]`),
    }));
    function populateRowAddress(field, parentId) {
      const options = parentId ? locationsFor(field.kind, parentId, rowRegion.value) : [];
      const label = field.kind === 'municipality' ? 'municipality / city' : field.kind;
      field.select.replaceChildren(new Option(parentId ? `Choose ${label}` : 'Choose the parent location first', ''), ...options.map(item => new Option(item.name, String(item.id))));
      field.select.disabled = !parentId;
      return options;
    }
    rowRegion.addEventListener('change', () => {
      let parentId = rowRegion.value;
      rowAddressFields.forEach(field => { populateRowAddress(field, parentId); parentId = ''; });
    });
    rowAddressFields.forEach((field, index) => field.select.addEventListener('change', () => {
      let parentId = field.select.value;
      rowAddressFields.slice(index + 1).forEach(next => { populateRowAddress(next, parentId); parentId = ''; });
    }));
    if (location.region_id || location.region) {
      const regionMatch = regions.find(item => String(item.region_id) === String(location.region_id)
        || normalizeLocation(item.name) === normalizeLocation(location.region));
      if (regionMatch) {
        rowRegion.value = String(regionMatch.region_id);
        let parentId = rowRegion.value;
        rowAddressFields.forEach(field => {
          const options = populateRowAddress(field, parentId);
          const match = locationMatch(options, field.kind, location[`${field.kind}_id`], location[field.kind], location.province);
          parentId = match ? String(match.id) : '';
          if (match) field.select.value = parentId;
        });
      }
    }
    trainingLocationList.append(row);
    return row;
  }

  function updateRemoveButtons() {
    [trainerList, ...Object.values(questionnaireLists)].forEach(list => {
      list.querySelectorAll('.training-edit-remove').forEach(button => { button.disabled = list.children.length === 1; });
    });
  }

  function populateLocation(kind, parentId, regionId, value = '', label = '', provinceName = '') {
    const select = field(`${kind}_id`);
    const rows = parentId ? locationsFor(kind, parentId, regionId) : [];
    select.replaceChildren(
      new Option(parentId ? `Choose ${kind}` : 'Choose the parent location first', ''),
      ...rows.map(location => new Option(location.name, String(location.id)))
    );
    select.disabled = !parentId;
    const match = locationMatch(rows, kind, value, label, provinceName);
    if (match) {
      select.value = String(match.id);
    } else if (parentId && (value || label)) {
      const legacyValue = String(value || `legacy-${kind}-${normalizeLocation(label).replace(/\s+/g, '-')}`);
      select.add(new Option(label || String(value), legacyValue));
      select.value = legacyValue;
    }
    return select.value;
  }

  function setAddress(record = {}) {
    const regionId = String(record.region_id || record.region || selectedTraining?.region_id || '');
    const regionName = String(record.region || selectedTraining?.region || '');
    const regionMatch = regions.find(region =>
      String(region.region_id) === regionId || normalizeLocation(region.name) === normalizeLocation(regionName || regionId));
    if (!regionMatch && (regionName || regionId)) {
      regionSelect.add(new Option(regionName || regionId, regionId || regionName));
    }
    regionSelect.value = String(regionMatch?.region_id || regionId || regionName);
    let parentId = regionSelect.value;
    let provinceName = '';
    addressKinds.forEach(({name, kind}) => {
      const value = record[`${name}_id`] || '';
      const label = record[name] || '';
      const selectedId = populateLocation(kind, parentId, regionSelect.value, value, label, provinceName);
      if (kind === 'province') {
        provinceName = field('province_id').selectedOptions[0]?.textContent || label;
      }
      parentId = selectedId;
    });
  }

  function collect() {
    const values = {};
    form.querySelectorAll('[name]:not([name$="[]"]):not([type="radio"])').forEach(control => { values[control.name] = control.value; });
    values.delivery_mode = form.querySelector('[name="delivery_mode"]:checked')?.value || '';
    values.trainers = [...trainerList.children].map(row => ({
      id: row.querySelector('[data-trainer-name]').value,
      name: row.querySelector('[data-trainer-name]').selectedOptions[0]?.textContent || '',
      organization: row.querySelector('[data-trainer-organization]').value,
      qualification: row.querySelector('[data-trainer-qualification]').value,
      expertise: row.querySelector('[data-trainer-expertise]').value,
      contact: row.querySelector('[data-trainer-contact]').value,
      email: row.querySelector('[data-trainer-email]').value,
    }));
    values.trainingLocations = [
      {
        venue: field('venue_location').value.trim(),
        region_id: field('region_id').value,
        region: field('region_id').selectedOptions[0]?.textContent || '',
        province_id: field('province_id').value,
        province: field('province_id').selectedOptions[0]?.textContent || '',
        district_id: field('district_id').value,
        district: field('district_id').selectedOptions[0]?.textContent || '',
        municipality_id: field('municipality_id').value,
        municipality: field('municipality_id').selectedOptions[0]?.textContent || '',
        barangay_id: field('barangay_id').value,
        barangay: field('barangay_id').selectedOptions[0]?.textContent || '',
      },
      ...[...(trainingLocationList?.children || [])].map(row => ({
        venue: row.querySelector('[data-location-venue]').value.trim(),
        ...Object.fromEntries(['region', 'province', 'district', 'municipality', 'barangay'].flatMap(kind => {
          const select = row.querySelector(`[data-location-${kind}]`);
          return [[`${kind}_id`, select.value], [kind, select.selectedOptions[0]?.textContent || '']];
        })),
      })),
    ];
    for (const type of Object.keys(questionnaireLists)) values[type] = [...questionnaireLists[type].querySelectorAll('select')].map(select => select.value).filter(Boolean);
    if (associationSelect instanceof HTMLSelectElement) {
      values.associationIds = [...associationSelect.selectedOptions].map(option => option.value);
    }
    if (window.TMIS_PAGE) {
      for (const name of addressNames) {
        const control = field(name);
        if (control?.selectedOptions[0]?.value) {
          values[name.replace('_id', '')] = control.selectedOptions[0].textContent;
        }
      }
    }
    return values;
  }

  const initialValues = selectedTraining ? {
    training_title: selectedTraining.title || selectedTraining.training_title || '',
    implementing_office: officeSelect.value,
    training_type: selectedTraining.training_type || selectedTraining.type || '',
    partner_organization: selectedTraining.partner_organization || '',
    training_budget: String(selectedTraining.budget ?? selectedTraining.training_budget ?? 0),
    training_description: selectedTraining.description || '',
    start_date: selectedTraining.start_date || selectedTraining.startDate || '',
    end_date: selectedTraining.end_date || selectedTraining.endDate || '',
    venue_location: selectedTraining.venue_location || selectedTraining.venue || '',
    region_id: String(selectedTraining.region_id || selectedTraining.region || ''),
    province_id: selectedTraining.province_id || selectedTraining.province || '',
    district_id: selectedTraining.district_id || selectedTraining.district || '',
    municipality_id: selectedTraining.municipality_id || selectedTraining.municipality || '',
    barangay_id: selectedTraining.barangay_id || selectedTraining.barangay || '',
    delivery_mode: selectedTraining.delivery_mode || '',
    target_participants: String(selectedTraining.target_participants ?? ''),
    trainers: selectedTraining.trainers || [],
    pretest: selectedTraining.pretest || [],
    posttest: selectedTraining.posttest || [],
    trainingEvaluation: selectedTraining.trainingEvaluation || [],
    rpEvaluation: selectedTraining.rpEvaluation || [],
    associationIds: selectedTraining.associationIds || [],
    trainingLocations: selectedTraining.trainingLocations || [],
  } : null;
  let saved;
  if (window.TMIS_PAGE) {
    // Database-backed training fields are canonical; stale browser drafts must not override them.
    saved = initialValues;
  } else {
    try {
      const previous = JSON.parse(window.TmisStore.getItem(storageKey) || 'null');
      saved = initialValues ? {...initialValues, ...(previous && typeof previous === 'object' ? previous : {})} : previous;
    } catch { saved = initialValues; }
  }
  if (saved && typeof saved === 'object') {
    Object.entries(saved).forEach(([name, value]) => {
      if (name === 'trainers' || Object.hasOwn(questionnaireLists, name) || name === 'associationIds' || addressNames.includes(name) || name === 'delivery_mode' || name === 'implementing_office') return;
      const control = field(name);
      if (control && typeof value === 'string') control.value = value;
    });
    const mode = [...form.querySelectorAll('[name="delivery_mode"]')].find(input => input.value === saved.delivery_mode);
    if (mode) mode.checked = true;
    if (associationSelect instanceof HTMLSelectElement) {
      const linkedIds = new Set((saved.associationIds || []).map(String));
      [...associationSelect.options].forEach(option => { option.selected = linkedIds.has(option.value); });
    }
  }
  (saved?.trainers?.length ? saved.trainers : [{}]).forEach(addTrainer);
  const extraTrainingLocations = saved?.trainingLocations?.length > 1
    ? saved.trainingLocations.slice(1)
    : [];
  extraTrainingLocations.forEach(addTrainingLocation);
  for (const type of Object.keys(questionnaireLists)) {
    const defaults = type === 'pretest' || type === 'posttest' ? (window.trainingAssessments?.list(type).map(item => item.id) || []) : [];
    const selections = saved?.[type] ?? defaults;
    selections.forEach(value => addQuestion(type, value));
  }

  function syncDate() {
    const start = field('start_date');
    const end = field('end_date');
    end.min = start.value;
    end.setCustomValidity(start.value && end.value && end.value < start.value ? 'End date cannot be earlier than the start date.' : '');
  }
  function syncHeading() { document.getElementById('editTrainingHeading').textContent = field('training_title').value.trim() || 'Untitled training'; }
  let baseline = null;
  const confirmModalElement = document.getElementById('editTrainingConfirmModal');
  const confirmModal = bootstrap.Modal.getOrCreateInstance(confirmModalElement);
  const confirmButton = document.getElementById('confirmEditTrainingSave');
  const confirmError = document.getElementById('editTrainingConfirmError');
  const canEditTraining = !selectedTraining || (selectedTraining.workflowStatus || selectedTraining.status) === 'For Review';
  let pendingValues = null;
  function refresh() {
    syncDate();
    syncHeading();
    const dirty = baseline !== null && JSON.stringify(collect()) !== baseline;
    saveButton.disabled = !dirty || !canEditTraining;
    state.textContent = !canEditTraining ? 'Return to For Review to edit' : dirty ? 'Unsaved changes' : 'Up to date';
    state.classList.toggle('is-dirty', dirty);
  }
  form.addEventListener('change', event => {
    const target = event.target;
    if (addressNames.slice(0, -1).includes(target.name)) {
      const level = addressNames.indexOf(target.name);
      let parentId = target.value;
      addressKinds.slice(level).forEach(({kind}) => {
        parentId = populateLocation(kind, parentId, regionSelect.value);
      });
    }
    if (target.matches('[data-trainer-name]')) fillTrainerDetails(target.closest('.training-edit-row'));
    refresh();
  });
  form.addEventListener('input', event => {
    if (event.target.matches('[data-trainer-contact]')) event.target.value = event.target.value.replace(/\D/g, '').replace(/^(63|0)(?=\d{10,})/, '').slice(0, 10);
    refresh();
  });
  form.addEventListener('click', event => {
    const remove = event.target.closest('.training-edit-remove');
    if (remove && !remove.disabled) { remove.closest('.training-edit-row').remove(); updateRemoveButtons(); refresh(); }
    if (event.target.closest('#editAddTrainer')) { addTrainer(); refresh(); }
    if (event.target.closest('#editAddTrainingLocation')) { addTrainingLocation(); refresh(); }
    if (event.target.closest('[data-remove-training-location]')) { event.target.closest('.training-edit-location-row')?.remove(); refresh(); }
    const add = event.target.closest('[data-add-questionnaire]');
    if (add) { addQuestion(add.dataset.addQuestionnaire); refresh(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    syncDate();
    if (!form.reportValidity()) return;
    if (!canEditTraining) {
      window.TmisToast?.show('Return the training to For Review before editing its information.', 'warning');
      return;
    }
    pendingValues = collect();
    const baselineValues = JSON.parse(baseline);
    const changedFields = Object.keys(pendingValues).filter(name =>
      JSON.stringify(pendingValues[name]) !== JSON.stringify(baselineValues[name]));
    document.getElementById('editTrainingConfirmName').textContent = pendingValues.training_title || 'Untitled training';
    document.getElementById('editTrainingConfirmStatus').textContent = selectedTraining?.workflowStatus || selectedTraining?.status || 'For Review';
    document.getElementById('editTrainingConfirmChanges').textContent = `${changedFields.length} field${changedFields.length === 1 ? '' : 's'}`;
    confirmError.hidden = true;
    confirmError.textContent = '';
    confirmModal.show();
  });
  confirmButton.addEventListener('click', async () => {
    if (!pendingValues || confirmButton.disabled) return;
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Saving…';
    confirmError.hidden = true;
    try {
      await window.TmisStore.setItem(storageKey, JSON.stringify(pendingValues));
      baseline = JSON.stringify(pendingValues);
      refresh();
      state.textContent = 'Saved to the database';
      pendingValues = null;
      confirmModal.hide();
      window.TmisToast?.show('Training information updated successfully.', 'success');
    } catch (error) {
      confirmError.textContent = error.message || 'Unable to save training changes.';
      confirmError.hidden = false;
      window.TmisToast?.show(error.message || 'Unable to save training changes.', 'error');
    } finally {
      confirmButton.disabled = false;
      confirmButton.innerHTML = '<i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Save updates';
    }
  });
  refresh();
  setTimeout(() => {
    setAddress(saved || selectedTraining || {});
    baseline = JSON.stringify(collect());
    refresh();
  }, 0);
});
