document.addEventListener('DOMContentLoaded', () => {
  const associationId = window.TmisStore.selectedId() || 'FA-2025-001';
  const readAssociation = () => {
    try {
      const records = JSON.parse(window.TmisStore.getItem('tmis-farmer-associations') || '[]');
      return Array.isArray(records) ? records.find(record => record.id === associationId) : null;
    } catch { return null; }
  };
  const configuredAttachmentTypes = window.TMIS_PAGE?.attachmentTypes?.farmer_association;
  const attachmentTypes = Array.isArray(configuredAttachmentTypes) && configuredAttachmentTypes.length
    ? configuredAttachmentTypes
    : ['Association Document', 'Registration Certificate', 'Membership List', 'Other File', 'Other'];
  const editAttachmentType = document.getElementById('editAttachmentType');
  if (editAttachmentType) {
    const selectedType = editAttachmentType.value;
    editAttachmentType.replaceChildren(
      new Option('Select a type', ''),
      ...attachmentTypes.map(type => new Option(type, type)),
    );
    if (selectedType && attachmentTypes.includes(selectedType)) editAttachmentType.value = selectedType;
  }
  const clean = value => value === undefined || value === null ? '' : String(value);
  const officeRegionNames = new Map((window.TMIS_PAGE?.regions || []).map(region => [String(region.region_id), region.name]));
  const normalizeOfficeKey = value => String(value ?? '').trim().toLocaleLowerCase();
  const interventionOfficeNames = new Map();
  [...(window.TMIS_PAGE?.offices || []), ...(window.TMIS_PAGE?.registration?.offices || [])].forEach(office => {
    const regionName = office.region_name || officeRegionNames.get(String(office.region_id)) || '';
    const officeName = [office.name || office.office_name, regionName].filter(Boolean).join(' — ');
    [office.org_id, office.office_id, office.id, office.name, office.office_name].filter(Boolean).forEach(key => {
      interventionOfficeNames.set(normalizeOfficeKey(key), officeName || String(key));
    });
  });
  document.querySelectorAll('#interventionOffice option').forEach(option => {
    if (option.value) interventionOfficeNames.set(normalizeOfficeKey(option.value), option.textContent.trim() || option.value);
  });
  const canEditInterventions = Boolean(document.querySelector('#fa-intervention .intervention-add-button:not(:disabled)'));
  const firstInterventionValue = (record, keys) => {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  };
  const normalizeIntervention = record => {
    const officeValue = firstInterventionValue(record, ['office', 'officeName', 'office_name', 'organization', 'implementingOffice', 'org_id', 'office_id']);
    const officeObject = officeValue && typeof officeValue === 'object' ? officeValue : null;
    const officeId = record.org_id ?? record.office_id ?? (typeof officeValue === 'number' || /^\d+$/.test(String(officeValue)) ? officeValue : null);
    const officeName = officeObject?.name || officeObject?.officeName
      || interventionOfficeNames.get(normalizeOfficeKey(officeId))
      || interventionOfficeNames.get(normalizeOfficeKey(officeValue))
      || officeValue;
    const officeRegion = officeObject?.region_name || record.officeRegion || record.office_region || '';
    const formattedOffice = officeName && officeRegion && !String(officeName).includes(String(officeRegion))
      ? `${officeName} — ${officeRegion}`
      : officeName;

    return {
      ...record,
      title: firstInterventionValue(record, ['title', 'interventionTitle', 'intervention_title', 'intervention', 'name']),
      office: formattedOffice,
      yearCovered: firstInterventionValue(record, ['yearCovered', 'year_covered', 'year']),
      action: firstInterventionValue(record, ['action', 'deliveryAction', 'delivery_action', 'deliveryStatus', 'delivery_status', 'status']),
      type: firstInterventionValue(record, ['type', 'interventionType', 'intervention_type', 'category']),
      unit: firstInterventionValue(record, ['unit', 'unitName', 'unit_name', 'measurementUnit', 'measurement_unit']),
      qty: firstInterventionValue(record, ['qty', 'quantity', 'quantityProvided', 'quantity_provided']),
      remarks: firstInterventionValue(record, ['remarks', 'notes', 'note', 'description']),
    };
  };
  const renderInterventionRow = record => {
    const row = make('tr');
    if (canEditInterventions) {
      const actionCell = make('td', 'intervention-row-action-cell');
      const editButton = make('button', 'btn intervention-row-edit-button');
      editButton.type = 'button';
      editButton.dataset.editIntervention = String(record._sourceIndex);
      editButton.setAttribute('aria-label', `Edit ${clean(record.title) || 'intervention'} details`);
      editButton.title = 'Edit intervention';
      editButton.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
      actionCell.append(editButton);
      row.append(actionCell);
    }
    ['title', 'office', 'yearCovered', 'action', 'type', 'unit', 'qty', 'remarks'].forEach(key => {
      const value = record[key];
      const displayValue = value === undefined || value === null || String(value).trim() === '' ? '—' : value;
      const cell = make('td', `intervention-cell intervention-cell-${key}`);
      if (key === 'title') {
        cell.append(make('strong', 'intervention-record-title', displayValue));
      } else if (key === 'office') {
        const [officeName, ...regionParts] = clean(displayValue).split(' — ');
        cell.append(make('strong', 'intervention-office-name', officeName));
        if (regionParts.length) cell.append(make('span', 'intervention-cell-detail', regionParts.join(' — ')));
        if (record.officeFromAssociation) {
          cell.append(make('span', 'intervention-cell-origin', 'Association office'));
          cell.title = 'Using the association’s registered office because this intervention has no office recorded.';
        }
      } else if (key === 'yearCovered') {
        cell.append(make('span', 'intervention-year-pill', displayValue));
      } else if (key === 'action') {
        const statusClass = clean(displayValue).toLocaleLowerCase() === 'delivered'
          ? 'intervention-status-delivered'
          : 'intervention-status-not-delivered';
        cell.append(make('span', `intervention-status ${statusClass}`, displayValue));
      } else if (key === 'type') {
        cell.append(make('span', 'intervention-type-pill', displayValue));
      } else if (key === 'qty') {
        cell.append(make('strong', 'intervention-quantity', displayValue));
      } else if (key === 'remarks') {
        cell.append(make('span', 'intervention-record-remarks', displayValue));
      } else {
        cell.textContent = clean(displayValue);
      }
      row.append(cell);
    });
    return row;
  };
  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = clean(value);
    return element;
  };
  const exportRows = (records, keys, labels, filename) => {
    if (!window.XLSX) { alert('Excel export is unavailable. Check your connection and try again.'); return; }
    let sheet;
    if (filename === 'association_interventions') {
      const association = readAssociation();
      const fallbackRegion = clean(association?.region || association?.regionName || association?.region_name);
      const headers = ['Intervention', 'Region', 'Office', 'Year Covered', 'Actions', 'Type', 'Unit', 'Qty', 'Remarks'];
      const dataRows = records.map(record => {
        let office = clean(record.office);
        let region = clean(record.officeRegion || record.office_region);
        const officeParts = office.split(/\s+\u2014\s+/);
        if (officeParts.length > 1) {
          office = officeParts.shift();
          region = officeParts.join(' — ') || region;
        }
        region = (region || fallbackRegion).replace(/^Region\s+/i, '').replace(/\s*\([^)]*\)\s*$/, '');

        return [clean(record.title), region, office, clean(record.yearCovered), clean(record.action), clean(record.type), clean(record.unit), clean(record.qty), clean(record.remarks)];
      });
      sheet = window.XLSX.utils.aoa_to_sheet([['Farmer Association Intervention'], ['Export'], headers, ...dataRows]);
      sheet['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 15 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 32 }];
    } else {
      const rows = records.map(record => Object.fromEntries(keys.map((key, index) => [labels[index], clean(record[key])])));
      sheet = window.XLSX.utils.json_to_sheet(rows, { header: labels });
    }
    const book = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(book, sheet, labels[0] === 'Training Name' ? 'Trainings' : 'Interventions');
    window.XLSX.writeFile(book, `${filename}_${associationId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const normalizeLocationValue = value => String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const associationMetricsCache = new Map();
  const farmerMatchesTrainingLocation = (farmer, training) => {
    const offices = Array.isArray(farmer.beneficiaryOffices) ? farmer.beneficiaryOffices : [];
    const primaryOffice = offices.find(office => office.isPrimary) || offices[0] || {};
    const farmerRegion = farmer.region || primaryOffice.region || '';
    const farmerRegionId = farmer.region_id || primaryOffice.region_id || '';
    const locations = Array.isArray(training.trainingLocations) && training.trainingLocations.length
      ? training.trainingLocations
      : [training];

    return locations.some(location => {
      const trainingRegion = location.region || training.region || '';
      const trainingRegionId = location.region_id || training.region_id || '';
      const sameRegion = farmerRegionId && trainingRegionId
        ? String(farmerRegionId) === String(trainingRegionId)
        : normalizeLocationValue(farmerRegion) !== '' && normalizeLocationValue(farmerRegion) === normalizeLocationValue(trainingRegion);
      const sameProvince = normalizeLocationValue(farmer.province) !== ''
        && normalizeLocationValue(farmer.province) === normalizeLocationValue(location.province || training.province);
      const sameMunicipality = normalizeLocationValue(farmer.municipality) !== ''
        && normalizeLocationValue(farmer.municipality) === normalizeLocationValue(location.municipality || training.municipality);
      const sameBarangay = normalizeLocationValue(farmer.barangay) !== ''
        && normalizeLocationValue(farmer.barangay) === normalizeLocationValue(location.barangay || training.barangay);

      return sameRegion && sameProvince && sameMunicipality && sameBarangay;
    });
  };
  const associationTrainingResults = (training, association) => {
    const cacheKey = `${associationId}:${training._db_id || training.id}`;
    if (associationMetricsCache.has(cacheKey)) return associationMetricsCache.get(cacheKey);

    const associationIds = new Set([associationId, association?._db_id].filter(Boolean).map(String));
    const farmers = window.TmisStore.records('tmis-farmers');
    const eligibleFarmerIds = new Set();

    farmers.forEach(farmer => {
      const membershipIds = [
        farmer.association_id,
        farmer.association_db_id,
        ...(farmer.associationMemberships || []).flatMap(membership => [membership.id, membership.databaseId]),
      ].filter(value => value !== undefined && value !== null).map(String);
      const isMember = membershipIds.some(id => associationIds.has(id));

      if (isMember || farmerMatchesTrainingLocation(farmer, training)) {
        [farmer.id, farmer._db_id].filter(value => value !== undefined && value !== null).forEach(id => eligibleFarmerIds.add(String(id)));
      }
    });

    const belongsToTraining = result => {
      const resultDatabaseId = String(result.trainingDatabaseId || '');
      const trainingDatabaseId = String(training._db_id || '');
      if (resultDatabaseId && trainingDatabaseId) return resultDatabaseId === trainingDatabaseId;

      return [training.id, trainingDatabaseId].filter(Boolean).some(id => String(result.trainingId || '') === String(id));
    };
    const resultsFor = kind => window.TmisStore.records(`tmis-${kind}-encoded`).filter(result =>
      result.status === 'complete'
      && eligibleFarmerIds.has(String(result.farmerId || ''))
      && belongsToTraining(result)
    );
    const summarizeTests = kind => {
      const results = resultsFor(kind);
      if (!results.length) return 'No results';

      const questionnaires = window.TmisStore.records(`tmis-${kind}-questionnaires`);
      let earnedPoints = 0;
      let possiblePoints = 0;
      for (const result of results) {
        const questionnaire = questionnaires.find(item => String(item.id) === String(result.questionnaireId));
        const possible = Number(result.totalItems || result.total_items || result.totalQuestions || questionnaire?.totalItems || questionnaire?.questions?.length);
        const earned = Number(result.score);
        if (result.score === null || result.score === undefined || result.score === '' || !Number.isFinite(earned) || !Number.isFinite(possible) || possible <= 0) {
          return 'No results';
        }
        earnedPoints += earned;
        possiblePoints += possible;
      }

      return possiblePoints ? `${earnedPoints} / ${possiblePoints} · ${(earnedPoints / possiblePoints * 100).toFixed(2)}%` : 'No results';
    };
    const ratingValues = resultsFor('training-evaluation')
      .flatMap(result => Array.isArray(result.ratings) ? result.ratings : [])
      .map(item => item?.rating)
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(Number)
      .filter(Number.isFinite);

    const summary = {
      preTest: summarizeTests('pre-test'),
      postTest: summarizeTests('post-test'),
      rating: ratingValues.length ? `${(ratingValues.reduce((total, value) => total + value, 0) / ratingValues.length).toFixed(2)} / 5` : 'No results',
    };
    associationMetricsCache.set(cacheKey, summary);

    return summary;
  };

  function setupTable(config) {
    const table = document.getElementById(config.table);
    const body = document.getElementById(config.body);
    const search = document.getElementById(config.search);
    const clear = document.getElementById(config.clear);
    const empty = config.empty ? document.getElementById(config.empty) : null;
    const filters = [...table.querySelectorAll(config.filterSelector)];
    const headers = [...table.querySelectorAll(config.sortSelector)];
    const pagers = config.pagers.map(id => document.getElementById(id));
    const state = { page: 1, size: 8, sort: null, direction: 1 };
    const data = () => {
      const association = readAssociation();
      const records = association?.[config.source] ?? (config.source === 'interventions' ? association?.interventionRecords ?? association?.intervention : undefined);
      if (config.source !== 'trainings') {
        if (!Array.isArray(records)) return [];
        return config.source === 'interventions' ? records.map((record, index) => {
          const normalized = normalizeIntervention(record);
          const associationOffice = firstInterventionValue(association, ['office', 'officeName', 'office_name', 'organization']);
          const associationRegion = firstInterventionValue(association, ['region', 'regionName', 'region_name']);
          const fallbackOffice = [associationOffice, associationRegion].filter(Boolean).join(' — ');

          return {
            ...normalized,
            office: normalized.office || fallbackOffice,
            officeFromAssociation: !normalized.office && Boolean(fallbackOffice),
            _sourceIndex: index,
          };
        }) : records;
      }

      const linkedRecords = Array.isArray(records) ? records : [];
      const associationKeys = new Set([associationId, association?._db_id].filter(Boolean).map(String));
      const databaseTrainings = window.TmisStore.records('tmis-trainings');
      const associationTrainings = databaseTrainings.filter(training =>
        (training.associationIds || []).some(id => associationKeys.has(String(id)))
      );
      const byTrainingId = new Map(associationTrainings.map(training => [String(training.id), training]));
      const merged = linkedRecords.map(linked => ({ ...(byTrainingId.get(String(linked.id)) || {}), ...linked }));
      const presentIds = new Set(merged.map(training => String(training.id)));

      associationTrainings.forEach(training => {
        if (!presentIds.has(String(training.id))) merged.push(training);
      });

      return merged.map(training => {
        const date = training.date || [training.startDate || training.start_date, training.endDate || training.end_date].filter(Boolean).join(' – ');
        const assessmentSummary = associationTrainingResults(training, association);
        return {
          ...training,
          id: String(training.id || ''),
          title: training.title || training.name || 'Untitled training',
          category: training.category || training.type || training.training_type || 'Training',
          year: training.year || training.yearCovered || training.year_covered || String(training.startDate || training.start_date || '').slice(0, 4),
          date: date || 'Not recorded',
          region: training.region || 'Not recorded',
          location: training.location || training.venue || training.venue_location || 'Not recorded',
          organizer: training.organizer || training.office || 'Not recorded',
          preTest: assessmentSummary.preTest,
          postTest: assessmentSummary.postTest,
          rating: assessmentSummary.rating,
        };
      });
    };
    const filtered = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const rows = data().filter(record =>
        (!query || config.keys.some(key => clean(record[key]).toLocaleLowerCase().includes(query))) &&
        filters.every(filter => !filter.value.trim() || clean(record[filter.dataset.column]).toLocaleLowerCase().includes(filter.value.trim().toLocaleLowerCase()))
      );
      if (state.sort) rows.sort((a, b) => clean(a[state.sort]).localeCompare(clean(b[state.sort]), undefined, { numeric: true }) * state.direction);
      return rows;
    };
    function render() {
      const rows = filtered();
      const pages = Math.max(1, Math.ceil(rows.length / state.size));
      state.page = Math.min(state.page, pages);
      const start = (state.page - 1) * state.size;
      const visible = rows.slice(start, start + state.size);
      body.replaceChildren();
      visible.forEach(record => {
        if (config.renderRow) {
          body.append(config.renderRow(record));
          return;
        }
        const row = make('tr');
        config.keys.forEach(key => {
          const value = record[key];
          row.append(make('td', '', value === undefined || value === null || String(value).trim() === '' ? '—' : value));
        });
        body.append(row);
      });
      if (!visible.length && !empty) {
        const row = make('tr');
        const cell = make('td', 'intervention-empty-cell', 'No association intervention records available.');
        cell.colSpan = config.source === 'interventions' ? config.keys.length + Number(canEditInterventions) : config.keys.length;
        row.append(cell);
        body.append(row);
      }
      if (empty) empty.hidden = rows.length > 0;
      if (empty) empty.querySelector('strong').textContent = data().length ? 'No training records match the current filters.' : 'No association training records available.';
      table.hidden = Boolean(empty) && rows.length === 0;
      pagers.forEach(pager => {
        pager.replaceChildren();
        pager.append(make('span', '', `Showing ${rows.length ? start + 1 : 0}–${rows.length ? start + visible.length : 0} of ${rows.length} records`));
        const controls = make('div', 'pagination-controls');
        const size = make('select');
        size.setAttribute('aria-label', 'Rows per page');
        [8, 16, 32, 100].forEach(value => size.add(new Option(String(value), String(value))));
        size.value = String(state.size);
        size.addEventListener('change', () => { state.size = Number(size.value); state.page = 1; render(); });
        controls.append(size);
        const previous = make('button', '', '‹');
        previous.type = 'button';
        previous.setAttribute('aria-label', 'Previous page');
        previous.disabled = state.page === 1;
        previous.addEventListener('click', () => { state.page--; render(); });
        controls.append(previous, make('span', '', `Page ${state.page} of ${pages}`));
        const next = make('button', '', '›');
        next.type = 'button';
        next.setAttribute('aria-label', 'Next page');
        next.disabled = state.page === pages;
        next.addEventListener('click', () => { state.page++; render(); });
        controls.append(next);
        pager.append(controls);
      });
      if (config.count) document.getElementById(config.count).textContent = `${data().length} records`;
    }
    search.addEventListener('input', () => { state.page = 1; render(); });
    filters.forEach(filter => filter.addEventListener('input', () => { state.page = 1; render(); }));
    clear.addEventListener('click', () => { search.value = ''; filters.forEach(filter => { filter.value = ''; }); state.page = 1; render(); });
    headers.forEach(header => {
      const sort = () => { state.direction = state.sort === header.dataset.sort ? -state.direction : 1; state.sort = header.dataset.sort; render(); };
      header.addEventListener('click', sort);
      header.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sort(); } });
    });
    document.getElementById(config.export).addEventListener('click', () => {
      const rows = config.source === 'interventions' ? data() : filtered();
      exportRows(rows, config.keys, config.labels, config.filename);
    });
    if (config.refresh) document.getElementById(config.refresh).addEventListener('click', render);
    window.addEventListener('storage', event => { if (event.key === 'tmis-farmer-associations') render(); });
    window.addEventListener('tmis:data-updated', () => { associationMetricsCache.clear(); render(); });
    render();
  }

  const trainingTitleSegment = title => String(title || 'training').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'training';
  const trainingViewUrl = training => (document.getElementById('trainingDataTable').dataset.trainingViewRoute || '/app/admin/training/id/view-training/__title__/__id__')
    .replace('__title__', trainingTitleSegment(training.title))
    .replace('__id__', encodeURIComponent(training.id));
  const renderAssociationTraining = training => {
    const row = make('tr');
    const action = make('td', 'training-action-cell');
    const link = make('a', 'training-row-action');
    link.href = trainingViewUrl(training);
    link.target = '_blank';
    link.rel = 'noopener';
    link.title = 'View training information';
    link.setAttribute('aria-label', `View ${training.title}`);
    link.append(make('i', 'bi bi-eye-fill'));
    action.append(link);
    row.append(action);

    [
      training.title,
      training.category,
      training.year,
      training.date,
      training.region,
      training.location,
      training.organizer,
      training.preTest,
      training.postTest,
      training.rating,
    ].forEach((value, index) => {
      const cell = make('td');
      if (index === 0) {
        cell.append(make('strong', 'training-table-title-text', value));
      } else if (index === 2) {
        cell.append(make('span', 'training-year-value', value));
      } else if (index === 6) {
        cell.append(make('span', 'training-office-value', value));
      } else {
        cell.textContent = clean(value) || 'Not recorded';
      }
      row.append(cell);
    });

    return row;
  };

  setupTable({ source: 'trainings', table: 'trainingDataTable', body: 'trainings-table-body', search: 'trainingGlobalSearch', clear: 'clearTrainingFilters', export: 'exportTrainingTable', empty: 'trainingTableEmpty', filterSelector: '.training-column-filter', sortSelector: '.training-sortable', pagers: ['trainingPaginationTop', 'trainingPaginationBottom'], keys: ['title', 'category', 'year', 'date', 'region', 'location', 'organizer', 'preTest', 'postTest', 'rating'], labels: ['Training Name', 'Category', 'Year', 'Dates', 'Region', 'Location', 'Office', 'Pre-Test', 'Post-Test', 'Rating'], filename: 'association_trainings', renderRow: renderAssociationTraining });
  setupTable({ source: 'interventions', table: 'interventionDataTable', body: 'interventionTableBody', search: 'interventionGlobalSearch', clear: 'clearInterventionFilters', export: 'exportInterventions', refresh: 'refreshInterventions', count: 'interventionRecordCount', filterSelector: '.intervention-column-filter', sortSelector: '.intervention-sortable', pagers: ['interventionPaginationTop', 'interventionPaginationBottom'], keys: ['title', 'office', 'yearCovered', 'action', 'type', 'unit', 'qty', 'remarks'], labels: ['Intervention', 'Office', 'Year Covered', 'Actions', 'Type', 'Unit', 'Qty', 'Remarks'], filename: 'association_interventions', renderRow: renderInterventionRow });

  const documentList = document.getElementById('attachmentList');
  let documentPage = 0;
  const documentPageSize = () => window.innerWidth < 576 ? 1 : window.innerWidth < 768 ? 2 : window.innerWidth < 992 ? 3 : window.innerWidth < 1200 ? 4 : 5;
  const safeDocumentUrl = item => /^data:(application\/pdf|image\/(jpeg|png));base64,/i.test(item.dataUrl || '') ? item.dataUrl : '';
  const documentItems = () => Array.isArray(readAssociation()?.documents) ? readAssociation().documents : [];
  const saveDocuments = async items => {
    try {
      const records = JSON.parse(window.TmisStore.getItem('tmis-farmer-associations') || '[]');
      const index = records.findIndex(record => record.id === associationId);
      if (index < 0) return false;
      records[index].documents = items;
      await window.TmisStore.setItem('tmis-farmer-associations', JSON.stringify(records));
      window.dispatchEvent(new StorageEvent('storage', { key: 'tmis-farmer-associations' }));
      return true;
    } catch { return false; }
  };
  const viewerModal = document.getElementById('attachmentViewerModal');
  const editModal = document.getElementById('editAttachmentModal');
  const canManageDocuments = Boolean(editModal && !document.querySelector('#fa-document .attachment-add-button')?.disabled);
  let activeDocument = 0;
  function showDocument(index) {
    const items = documentItems();
    if (!viewerModal || !items.length || !safeDocumentUrl(items[index])) return;
    activeDocument = Math.max(0, Math.min(index, items.length - 1));
    const item = items[activeDocument], url = safeDocumentUrl(item), pdf = url.startsWith('data:application/pdf');
    document.getElementById('attachmentViewerTitle').textContent = item.name || 'Document';
    document.getElementById('attachmentViewerMeta').textContent = `${item.type || 'Association document'} · ${item.year || ''}`;
    const image = document.getElementById('attachmentViewerImage'), frame = document.getElementById('attachmentViewerPdf');
    image.hidden = pdf; frame.hidden = !pdf;
    image.src = pdf ? '' : url; frame.src = pdf ? url : '';
    document.getElementById('viewerPrevious').disabled = activeDocument === 0;
    document.getElementById('viewerNext').disabled = activeDocument === items.length - 1;
    bootstrap.Modal.getOrCreateInstance(viewerModal).show();
  }
  function renderDocuments() {
    const items = documentItems();
    documentList.replaceChildren();
    if (!items.length) {
      const empty = make('div', 'attachment-empty-state');
      empty.append(make('i', 'bi bi-file-earmark-arrow-up'), make('p', '', 'No documents recorded for this association.'));
      documentList.append(empty);
      return;
    }
    const count = documentPageSize();
    documentPage = Math.min(documentPage, Math.max(0, items.length - count));
    const carousel = make('div', 'attachment-carousel');
    const navigation = (step, label) => {
      const button = make('button', 'attachment-carousel-nav');
      button.type = 'button'; button.dataset.documentStep = String(step); button.setAttribute('aria-label', label);
      button.disabled = step < 0 ? documentPage === 0 : documentPage + count >= items.length;
      button.append(make('i', `bi bi-chevron-${step < 0 ? 'left' : 'right'}`));
      return button;
    };
    carousel.append(navigation(-1, 'Previous documents'));
    const track = make('div', 'attachment-carousel-track');
    track.style.gridTemplateColumns = `repeat(${Math.min(count, items.length)}, minmax(0, 1fr))`;
    items.slice(documentPage, documentPage + count).forEach((item, offset) => {
      const index = documentPage + offset, url = safeDocumentUrl(item), isImage = url.startsWith('data:image/');
      const card = make('article', 'attachment-card');
      const preview = make('button', 'attachment-card-preview');
      preview.type = 'button'; preview.dataset.documentOpen = String(index); preview.disabled = !url;
      preview.setAttribute('aria-label', `Preview ${item.name || 'document'}`);
      if (isImage) { const image = make('img', 'attachment-card-image'); image.src = url; image.alt = ''; preview.append(image); }
      else { const pdf = make('span', 'attachment-card-pdf'); pdf.append(make('i', 'bi bi-file-earmark-pdf-fill'), make('strong', '', 'PDF')); preview.append(pdf); }
      preview.append(make('span', 'attachment-card-preview-type', isImage ? 'Image' : 'PDF document'));
      if (url) { const overlay = make('span', 'attachment-card-preview-overlay', 'Open preview'); preview.append(overlay); }
      const info = make('div', 'attachment-card-info');
      const category = make('span', 'attachment-category', item.type || 'Association document');
      const filename = make('strong', 'attachment-card-filename', item.name || 'Document'); filename.title = item.name || 'Document';
      const meta = make('div', 'attachment-card-meta');
      meta.append(make('span', 'attachment-year', item.year || 'Year unavailable'), make('span', 'attachment-card-count', `Attachment ${index + 1} of ${items.length}`));
      info.append(category, filename, meta);
      if (item.remarks) info.append(make('p', 'fa-document-remarks', item.remarks));
      const actions = make('div', 'attachment-card-actions');
      if (url) { const download = make('a', 'btn attachment-card-edit', 'Download'); download.href = url; download.download = item.name || 'association-document'; actions.append(download); }
      if (canManageDocuments) {
        const edit = make('button', 'btn attachment-card-edit', 'Edit'); edit.type = 'button'; edit.dataset.documentEdit = String(index);
        const remove = make('button', 'btn attachment-card-delete', 'Delete'); remove.type = 'button'; remove.dataset.documentDelete = String(index);
        actions.append(edit, remove);
      }
      info.append(actions); card.append(preview, info); track.append(card);
    });
    carousel.append(track, navigation(1, 'Next documents'));
    documentList.append(carousel);
  }
  documentList.addEventListener('click', async event => {
    const step = event.target.closest('[data-document-step]');
    if (step) { documentPage += Number(step.dataset.documentStep); renderDocuments(); return; }
    const open = event.target.closest('[data-document-open]');
    if (open) { showDocument(Number(open.dataset.documentOpen)); return; }
    const edit = event.target.closest('[data-document-edit]');
    if (edit && canManageDocuments) {
      activeDocument = Number(edit.dataset.documentEdit);
      const item = documentItems()[activeDocument];
      const type = document.getElementById('editAttachmentType');
      if (![...type.options].some(option => option.value === item.type)) type.add(new Option(item.type || 'Association Document', item.type || 'Association Document'));
      type.value = item.type || 'Association Document';
      const year = document.getElementById('editAttachmentYear'); year.replaceChildren();
      for (let value = new Date().getFullYear() + 1; value >= 2000; value--) year.add(new Option(String(value), String(value)));
      if (item.year && ![...year.options].some(option => option.value === item.year)) year.add(new Option(item.year, item.year));
      year.value = item.year || String(new Date().getFullYear());
      document.getElementById('editAttachmentRemarks').value = item.remarks || '';
      document.getElementById('saveAttachmentChanges').disabled = false;
      bootstrap.Modal.getOrCreateInstance(editModal).show();
      return;
    }
    const remove = event.target.closest('[data-document-delete]');
    if (remove && canManageDocuments && window.confirm('Delete this association document?')) {
      const items = documentItems(); items.splice(Number(remove.dataset.documentDelete), 1);
      if (!await saveDocuments(items)) alert('Could not delete this document.');
    }
  });
  if (canManageDocuments) document.getElementById('editAttachmentForm').addEventListener('submit', async event => {
    event.preventDefault();
    const items = documentItems();
    if (!items[activeDocument]) return;
    items[activeDocument] = { ...items[activeDocument], type: document.getElementById('editAttachmentType').value, year: document.getElementById('editAttachmentYear').value, remarks: document.getElementById('editAttachmentRemarks').value.trim() };
    if (await saveDocuments(items)) bootstrap.Modal.getOrCreateInstance(editModal).hide();
    else alert('Could not save the document changes.');
  });
  if (viewerModal) {
    document.getElementById('viewerEdit').hidden = !canManageDocuments;
    document.getElementById('viewerDelete').hidden = !canManageDocuments;
    document.getElementById('viewerPrevious').addEventListener('click', () => showDocument(activeDocument - 1));
    document.getElementById('viewerNext').addEventListener('click', () => showDocument(activeDocument + 1));
    document.getElementById('viewerDownload').addEventListener('click', () => {
      const item = documentItems()[activeDocument], link = document.createElement('a');
      if (!item || !safeDocumentUrl(item)) return;
      link.href = item.dataUrl; link.download = item.name || 'association-document'; link.click();
    });
    document.getElementById('viewerEdit').addEventListener('click', () => {
      const target = activeDocument;
      viewerModal.addEventListener('hidden.bs.modal', () => {
        documentPage = target; renderDocuments();
        documentList.querySelector(`[data-document-edit="${target}"]`)?.click();
      }, { once: true });
      bootstrap.Modal.getOrCreateInstance(viewerModal).hide();
    });
    document.getElementById('viewerDelete').addEventListener('click', () => {
      const target = activeDocument;
      viewerModal.addEventListener('hidden.bs.modal', () => {
        documentPage = target; renderDocuments();
        documentList.querySelector(`[data-document-delete="${target}"]`)?.click();
      }, { once: true });
      bootstrap.Modal.getOrCreateInstance(viewerModal).hide();
    });
    let zoom = 1;
    const stage = document.getElementById('attachmentViewerImage');
    const setZoom = value => { zoom = Math.max(0.5, Math.min(3, value)); stage.style.transform = `scale(${zoom})`; };
    document.getElementById('viewerZoomIn').addEventListener('click', () => setZoom(zoom + 0.25));
    document.getElementById('viewerZoomOut').addEventListener('click', () => setZoom(zoom - 0.25));
    document.getElementById('viewerReset').addEventListener('click', () => setZoom(1));
    document.getElementById('viewerOpenNewTab').addEventListener('click', () => {
      const item = documentItems()[activeDocument];
      if (!item || !safeDocumentUrl(item)) return;
      const parts = item.dataUrl.split(',');
      const mime = parts[0].slice(5).split(';')[0];
      const bytes = Uint8Array.from(atob(parts[1]), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    viewerModal.addEventListener('hidden.bs.modal', () => setZoom(1));
  }
  window.addEventListener('resize', renderDocuments);

  const logList = document.getElementById('activityLogList');
  const logSearch = document.getElementById('activityLogSearch');
  const logFilters = [...document.querySelectorAll('[data-activity-filter]')];
  let activeCategory = 'all';
  function renderLogs() {
    const saved = readAssociation()?.activity_logs;
    const association = readAssociation();
    const logs = Array.isArray(saved) ? saved : association?.registration_date ? [{
      category: 'profile',
      title: 'Farmer association registered',
      description: `${association.association_name || 'This association'} was registered in TMIS.`,
      actor: 'TMIS',
      status: 'Registered',
      reference: association.id,
      date: association.registration_date,
    }] : [];
    logFilters.forEach(button => {
      const category = button.dataset.activityFilter;
      button.querySelector('[data-activity-count]').textContent = String(category === 'all' ? logs.length : logs.filter(log => log.category === category).length);
      button.classList.toggle('is-active', category === activeCategory);
      button.setAttribute('aria-pressed', String(category === activeCategory));
    });
    const query = logSearch.value.trim().toLocaleLowerCase();
    const visible = logs.filter(log => (activeCategory === 'all' || log.category === activeCategory) && (!query || Object.values(log).some(value => clean(value).toLocaleLowerCase().includes(query))));
    logList.replaceChildren();
    visible.forEach(log => {
      const card = make('article', 'activity-log-entry');
      const marker = make('span', 'activity-log-entry-icon');
      marker.append(make('i', 'bi bi-activity'));
      const content = make('div', 'activity-log-entry-content');
      const top = make('div', 'activity-log-entry-top');
      const heading = make('div', 'activity-log-entry-title-group');
      heading.append(make('h3', 'activity-log-entry-title', log.title || 'Association update'), make('span', `activity-log-category activity-log-category-${log.category || 'profile'}`, log.category || 'profile'));
      top.append(heading, make('span', 'activity-log-status', log.status || 'Updated'));
      content.append(top, make('p', 'activity-log-entry-description', log.description || ''));
      const meta = make('div', 'activity-log-entry-meta');
      const parsedDate = log.date ? window.TmisDate?.parse(log.date) : null;
      const timestamp = make('time', 'activity-log-timestamp', log.date ? window.TmisDate?.format(log.date) || log.date : 'Date not recorded');
      if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) timestamp.dateTime = parsedDate.toISOString();
      meta.append(make('span', 'activity-log-actor', log.actor || 'TMIS'), make('span', 'activity-log-reference', log.reference || associationId), timestamp);
      content.append(meta);
      card.append(marker, content);
      logList.append(card);
    });
    document.getElementById('activityLogEmpty').hidden = visible.length > 0;
    document.getElementById('activityLogResultCount').textContent = `Showing ${visible.length} of ${logs.length} activities`;
  }
  logFilters.forEach(button => button.addEventListener('click', () => { activeCategory = button.dataset.activityFilter; renderLogs(); }));
  logSearch.addEventListener('input', renderLogs);
  window.addEventListener('storage', event => { if (event.key === 'tmis-farmer-associations') { renderDocuments(); renderLogs(); } });
  renderDocuments();
  renderLogs();
});
