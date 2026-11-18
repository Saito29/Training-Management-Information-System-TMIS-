(() => {
  const store = window.TmisStore;
  if (!store) return;

  const normalized = value => String(value ?? '').trim().toLocaleLowerCase();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
  const identifiers = record => [record?.id, record?._db_id].filter(value => value !== undefined && value !== null).map(String);
  const active = record => {
    if (!record) return false;
    if (record.is_active === false || record.is_active === 0 || record.is_active === '0') return false;

    return record.is_active === true || record.is_active === 1 || record.is_active === '1'
      || normalized(record.status || record.profileStatus) === 'active';
  };
  const trainingMatchesResult = (training, result) => {
    const trainingDatabaseId = String(training?._db_id || '');
    const resultDatabaseId = String(result?.trainingDatabaseId || '');
    if (trainingDatabaseId && resultDatabaseId) return trainingDatabaseId === resultDatabaseId;

    return identifiers(training).includes(String(result?.trainingId || ''));
  };
  const completeForTraining = (training, kind) => store.records(`tmis-${kind}-encoded`).filter(result =>
    normalized(result.status) === 'complete' && trainingMatchesResult(training, result)
  );

  function approvalRequirements(training) {
    const requirements = [];
    const requiredAttachments = [...new Map([
      ...(window.TMIS_PAGE?.requiredAttachments?.training || []),
      'Training design',
    ].map(type => [normalized(type), type])).values()];
    const attachments = Array.isArray(training.attachments) ? training.attachments : [];
    const hasAttachment = type => normalized(training.designFile) && normalized(type) === 'training design'
      ? true
      : attachments.some(attachment => normalized(attachment.type || attachment.kind || attachment.originalKind) === normalized(type));

    requiredAttachments.forEach(type => {
      const isAttached = hasAttachment(type);
      requirements.push({
        label: type,
        detail: isAttached ? 'A saved attachment is on file.' : 'Upload this required training attachment before submitting.',
        passed: isAttached,
      });
    });

    const farmers = store.records('tmis-farmers');
    const farmersById = new Map();
    farmers.forEach(farmer => identifiers(farmer).forEach(id => farmersById.set(id, farmer)));
    const activeParticipants = [...new Set((training.participants || []).map(String))]
      .map(id => farmersById.get(id))
      .filter(active);
    const participantIds = new Set(activeParticipants.flatMap(identifiers));
    requirements.push({
      label: 'Active training participants',
      detail: `${activeParticipants.length} active participant(s) registered. At least one is required.`,
      passed: activeParticipants.length > 0,
    });

    const resourcePeople = store.records('tmis-resource-persons');
    const resourcePeopleById = new Map();
    resourcePeople.forEach(person => identifiers(person).forEach(id => resourcePeopleById.set(id, person)));
    const assignedResourcePeople = [...new Map((training.trainers || []).map(person => {
      const id = String(person.id || '');
      const record = resourcePeopleById.get(id) || person;
      return [id, record];
    }).filter(([id]) => id)).values()].filter(person => {
      const record = resourcePeopleById.get(String(person.id || '')) || person;
      return active(record) || (!record.status && record.is_active === undefined);
    });
    const resourcePersonIds = new Set(assignedResourcePeople.flatMap(identifiers));
    requirements.push({
      label: 'Active resource persons',
      detail: `${assignedResourcePeople.length} active resource person(s) assigned. At least one is required.`,
      passed: assignedResourcePeople.length > 0,
    });

    const questionnaireGroups = [
      { label: 'Pre-test', trainingKey: 'pretest', resultKind: 'pre-test' },
      { label: 'Post-test', trainingKey: 'posttest', resultKind: 'post-test' },
      { label: 'Training evaluation', trainingKey: 'trainingEvaluation', resultKind: 'training-evaluation' },
      { label: 'Resource-person evaluation', trainingKey: 'rpEvaluation', resultKind: 'rp-evaluation' },
    ];

    questionnaireGroups.forEach(group => {
      const questionnaireIds = [...new Set((training[group.trainingKey] || []).map(String))];
      const questionnaireRecords = store.records(`tmis-${group.resultKind}-questionnaires`);
      const assignedNames = questionnaireIds.map(id => {
        const questionnaire = questionnaireRecords.find(item => String(item.id) === id);
        return questionnaire?.trainingQuestionnaire || questionnaire?.questionnaireName || id;
      });
      const assignedSummary = assignedNames.length > 3
        ? `${assignedNames.slice(0, 3).join(', ')} and ${assignedNames.length - 3} more`
        : assignedNames.join(', ');
      const results = completeForTraining(training, group.resultKind).filter(result => questionnaireIds.includes(String(result.questionnaireId || '')));
      if (group.resultKind === 'rp-evaluation') {
        const completedPairs = new Set(results
          .filter(result => participantIds.has(String(result.farmerId || '')) && resourcePersonIds.has(String(result.resourcePersonId || '')))
          .map(result => `${result.questionnaireId}:${result.resourcePersonId}`));
        const expectedResponses = questionnaireIds.length * assignedResourcePeople.length;
        const completeCount = completedPairs.size;
        const passed = questionnaireIds.length > 0 && assignedResourcePeople.length > 0 && completeCount >= expectedResponses;
        requirements.push({
          label: `${group.label} questionnaires and responses`,
          detail: `${questionnaireIds.length} assigned${assignedSummary ? ` (${assignedSummary})` : ''} · ${completeCount}/${expectedResponses} resource-person responses complete.`,
          passed,
        });

        return;
      }

      const completedPairs = new Set(results
        .filter(result => participantIds.has(String(result.farmerId || '')))
        .map(result => `${result.questionnaireId}:${result.farmerId}`));
      const expectedResponses = questionnaireIds.length * activeParticipants.length;
      const completeCount = completedPairs.size;
      const passed = questionnaireIds.length > 0 && activeParticipants.length > 0 && completeCount >= expectedResponses;
      requirements.push({
        label: `${group.label} questionnaires and responses`,
        detail: `${questionnaireIds.length} assigned${assignedSummary ? ` (${assignedSummary})` : ''} · ${completeCount}/${expectedResponses} participant responses complete.`,
        passed,
      });
    });

    return requirements;
  }

  function acceptanceRequirements(training) {
    const highlights = Object.values(training.highlights || {});
    const hasSavedSlide = highlights.some(highlight => ['heading', 'description', 'quote', 'image'].some(field => Boolean(String(highlight?.[field] || '').trim())));
    const flatten = value => {
      if (Array.isArray(value)) return value.flatMap(flatten);
      if (value && typeof value === 'object') return Object.values(value).flatMap(flatten);
      return [value];
    };
    const hasWaysForward = flatten(training.bullets || {}).some(value => Boolean(String(value ?? '').trim()));
    const passed = hasSavedSlide || hasWaysForward;

    return [{
      label: 'Highlight or ways-forward entry',
      detail: passed ? 'Saved highlight or ways-forward content is on file.' : 'No saved highlight or ways-forward content was found.',
      passed,
    }];
  }

  function acceptanceContent(training) {
    const slideEntries = Object.entries(training.highlights || {}).flatMap(([slideIndex, highlight], index) => {
      if (!highlight || typeof highlight !== 'object') return [];
      const fields = [
        ['Heading', highlight.heading],
        ['Description', highlight.description],
        ['Key point', highlight.quote],
      ].filter(([, value]) => String(value ?? '').trim());
      const image = String(highlight.image || '').trim();
      if (!fields.length && !image) return [];

      return [{ index: Number(slideIndex), title: highlight.heading || `Entry ${index + 1}`, fields, image }];
    });

    const collectTextEntries = (value, path = [], entries = []) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => collectTextEntries(item, [...path, `Item ${index + 1}`], entries));
        return entries;
      }
      if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => collectTextEntries(item, [...path, key], entries));
        return entries;
      }
      const text = String(value ?? '').trim();
      if (text) entries.push({ title: path.join(' · ') || 'Entry', text });
      return entries;
    };
    const bulletGroups = Array.isArray(training.bullets) ? training.bullets : [];
    const highlights = [
      ...slideEntries.filter(entry => entry.index === 0).map(({ title, fields, image }) => ({ title, fields, image })),
      ...collectTextEntries(bulletGroups[0], [], []).map(entry => ({ title: entry.title === 'Entry' ? 'Key highlight' : entry.title, fields: [['Details', entry.text]], image: '' })),
    ];
    const waysForward = [
      ...slideEntries.filter(entry => entry.index === 1).map(({ title, fields, image }) => ({ title, fields, image })),
      ...collectTextEntries(bulletGroups[1], [], []).map(entry => ({ title: entry.title === 'Entry' ? 'Way forward' : entry.title, text: entry.text })),
    ];

    return { highlights, waysForward };
  }

  function renderRequirements(container, requirements) {
    const list = document.createElement('ul');
    list.className = 'workflow-requirements-list';
    requirements.forEach(requirement => {
      const row = document.createElement('li');
      row.className = requirement.passed ? 'is-ready' : 'is-missing';
      const icon = document.createElement('i');
      icon.className = `bi ${requirement.passed ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`;
      icon.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('div');
      copy.className = 'workflow-requirement-copy';
      const label = document.createElement('strong');
      label.textContent = requirement.label;
      const detail = document.createElement('small');
      detail.textContent = requirement.detail;
      copy.append(label, detail);
      const status = document.createElement('span');
      status.textContent = requirement.passed ? 'Ready' : 'Incomplete';
      row.append(icon, copy, status);
      list.append(row);
    });
    container.replaceChildren(list);
  }

  function trainingDetails(training) {
    const locations = Array.isArray(training.trainingLocations) ? training.trainingLocations : [];
    const locationSummary = locations.map(location => [
      location.venue,
      [location.barangay, location.municipality, location.province, location.region].filter(Boolean).join(', '),
    ].filter(Boolean).join(' — ')).filter(Boolean);
    const primaryLocation = [training.venue, training.location].filter(Boolean).join(' — ');
    const dates = [training.startDate || training.start_date, training.endDate || training.end_date].filter(Boolean).join(' – ');
    const budget = Number(training.budget ?? training.training_budget);
    const budgetLabel = Number.isFinite(budget) && budget > 0
      ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(budget)
      : 'Not recorded';

    return [
      ['Training ID', training.id || 'Not recorded'],
      ['Training title', training.title || training.name || 'Not recorded'],
      ['Training type', training.type || training.training_type || 'Not recorded'],
      ['Implementing office', training.office || 'Not recorded'],
      ['Current status', training.status || training.workflowStatus || 'Not recorded'],
      ['Year covered', training.yearCovered || training.year_covered || 'Not recorded'],
      ['Training dates', dates || 'Not recorded'],
      ['Location and venue', [...new Set(locationSummary)].join(' · ') || primaryLocation || 'Not recorded'],
      ['Target participants', training.targetParticipants || training.target_participants || 'Not recorded'],
      ['Training budget / procurement', budgetLabel],
      ['Participants', String((training.participants || []).length)],
      ['Resource persons', (training.trainers || []).map(person => person.name).filter(Boolean).join(', ') || 'None recorded'],
    ];
  }

  function selectedTrainingList(items) {
    return `<ul class="workflow-selected-trainings">${items.map(training => `<li><strong>${escapeHtml(training.title || training.name || 'Untitled training')}</strong><span>${escapeHtml(training.id)} · ${escapeHtml(training.office || 'Office not recorded')}</span></li>`).join('')}</ul>`;
  }

  function transitionDetails(items, fromStatus, nextStatus) {
    if (items.length === 1) {
      return [
        ...trainingDetails(items[0]),
        ['Transition', `${fromStatus} → ${nextStatus}`],
      ];
    }

    return [
      ['Selected trainings', String(items.length)],
      ['From status', fromStatus],
      ['Next status', nextStatus],
      ['Training records', selectedTrainingList(items)],
    ];
  }

  window.TmisWorkflowReadiness = {
    approvalRequirements,
    acceptanceRequirements,
    acceptanceContent,
    renderRequirements,
    trainingDetails,
    selectedTrainingList,
    transitionDetails,
  };
})();
