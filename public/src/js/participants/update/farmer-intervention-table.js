document.addEventListener('DOMContentLoaded', () => {
  const farmerRecord = window.TmisStore.selected('tmis-farmers');
  const farmerId = farmerRecord?.id || window.TmisStore.selectedId() || 'unknown';
  const storageKey = `tmis-farmer-${farmerId}-interventions`;
  const seedRecords = [
    {
      title: 'Certified Rice Seeds Distribution',
      office: 'DA RFO IV-A',
      yearCovered: '2025',
      action: 'Delivered',
      type: 'Certified inbred rice seeds',
      unit: 'kg',
      qty: '20',
      remarks: 'Distributed for wet-season planting.',
    },
    {
      title: 'Organic Fertilizer Assistance',
      office: 'DA RFO IV-A',
      yearCovered: '2025',
      action: 'Delivered',
      type: 'Organic fertilizer',
      unit: 'bags',
      qty: '5',
      remarks: 'Support for the farmer’s 1-hectare rice farm.',
    },
    {
      title: 'Climate-Smart Farming Orientation',
      office: 'DA-AMIA',
      yearCovered: '2025',
      action: 'Not Delivered',
      type: 'Farmer training',
      unit: 'sessions',
      qty: '1',
      remarks: 'Orientation on water management and climate-resilient practices.',
    },
  ];

  const body = document.getElementById('interventionTableBody');
  const count = document.getElementById('interventionRecordCount');
  const feedback = document.getElementById('interventionFeedback');
  const refreshButton = document.getElementById('refreshInterventions');
  const exportButton = document.getElementById('exportInterventions');
  const globalSearch = document.getElementById('interventionGlobalSearch');
  const clearFiltersButton = document.getElementById('clearInterventionFilters');
  const table = document.getElementById('interventionDataTable');
  const form = document.getElementById('addInterventionForm');
  const modalElement = document.getElementById('addInterventionModal');
  const formError = document.getElementById('interventionFormError');
  const modalTitle = document.getElementById('addInterventionModalLabel');
  const submitButton = form?.querySelector('[type="submit"]');

  if (
    !body ||
    !count ||
    !feedback ||
    !refreshButton ||
    !exportButton ||
    !globalSearch ||
    !clearFiltersButton ||
    !table ||
    !form ||
    !modalElement ||
    !formError
  ) {
    return;
  }
  const canEditInterventions = table.classList.contains('intervention-editable-table');
  const canViewInterventions = table.classList.contains('intervention-readable-table');
  const hasInterventionActionColumn = canEditInterventions || canViewInterventions;
  const viewInterventionModal = document.getElementById('viewInterventionModal');
  const viewInterventionDetails = document.getElementById('viewInterventionDetails');

  let records = [];
  let editingIndex = null;
  const state = {
    global: '',
    columns: {},
    page: 1,
    pageSize: 8,
    sort: null,
  };

  const isRecord = (record) => {
    if (
      !record ||
      ![
        'title',
        'office',
        'yearCovered',
        'action',
        'type',
        'unit',
        'qty',
        'remarks',
      ].every(
        (key) => typeof record[key] === 'string'
      ) ||
      !record.title.trim() ||
      !record.office.trim() ||
      !/^\d{4}$/.test(record.yearCovered) ||
      !['Delivered', 'Not Delivered'].includes(record.action) ||
      !record.type.trim() ||
      (record.qty !== '' &&
        (!Number.isFinite(Number(record.qty)) || Number(record.qty) < 0))
    ) {
      return false;
    }

    return true;
  };

  const normalizeRecord = (record) => {
    if (isRecord(record)) return record;
    if (
      !record ||
      typeof record.title !== 'string' ||
      typeof record.date !== 'string' ||
      typeof record.category !== 'string'
    ) {
      return null;
    }

    const yearCovered = record.date.slice(0, 4);
    const action =
      record.status === 'Completed' ? 'Delivered' : 'Not Delivered';
    const normalized = {
      title: record.title,
      office: 'DA RFO IV-A',
      yearCovered,
      action,
      type: record.category,
      unit: '',
      qty: '',
      remarks:
        typeof record.details === 'string' ? record.details : '',
    };
    return isRecord(normalized) ? normalized : null;
  };

  const loadRecords = () => {
    try {
      const saved = window.TmisStore.getItem(storageKey);
      if (saved === null) return seedRecords.map((record) => ({ ...record }));

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        throw new Error('Saved intervention data has an unexpected format.');
      }

      const validRecords = parsed.map(normalizeRecord).filter(Boolean);
      if (validRecords.length !== parsed.length) {
        feedback.textContent =
          'Some saved intervention records were invalid and were not displayed.';
      }
      return validRecords;
    } catch (error) {
      feedback.textContent =
        'Saved intervention records could not be loaded. Showing the example records instead.';
      console.error('Unable to load farmer intervention records.', error);
      return seedRecords.map((record) => ({ ...record }));
    }
  };

  const createCell = (text, className = '') => {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  };

  const searchableValue = (record, key) => {
    return String(record[key]);
  };

  const searchableKeys = [
    'title',
    'office',
    'yearCovered',
    'action',
    'type',
    'unit',
    'qty',
    'remarks',
  ];

  const filteredRecords = () =>
    records.filter((record) => {
      const globalMatch =
        !state.global ||
        searchableKeys.some((key) =>
          searchableValue(record, key).toLowerCase().includes(state.global)
        );
      const columnMatch = Object.entries(state.columns).every(
        ([key, filter]) =>
          !filter ||
          searchableValue(record, key).toLowerCase().includes(filter)
      );
      return globalMatch && columnMatch;
    });

  const sortedRecords = () => {
    const matchingRecords = filteredRecords();
    if (!state.sort) return matchingRecords;

    const { key, direction } = state.sort;
    return [...matchingRecords].sort((left, right) => {
      const leftValue = left[key];
      const rightValue = right[key];
      const comparison = String(leftValue).localeCompare(
        String(rightValue),
        undefined,
        { numeric: true, sensitivity: 'base' }
      );
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  const renderPagination = (id, total, pages) => {
    const container = document.getElementById(id);
    if (!container) return;

    const start = total ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = total ? Math.min(state.page * state.pageSize, total) : 0;
    container.replaceChildren();
    const summary = document.createElement('span');
    summary.textContent = `Showing ${start}–${end} of ${total} records`;
    const controls = document.createElement('div');
    controls.className = 'pagination-controls';
    const sizeLabel = document.createElement('label');
    sizeLabel.className = 'visually-hidden';
    sizeLabel.htmlFor = `${id}PageSize`;
    sizeLabel.textContent = 'Rows per page';
    const size = document.createElement('select');
    size.id = `${id}PageSize`;
    size.setAttribute('aria-label', 'Rows per page');
    [8, 16, 32, 100].forEach((value) => size.add(new Option(String(value), String(value))));
    size.value = String(state.pageSize);
    controls.append(sizeLabel, size);

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.dataset.page = 'prev';
    previous.setAttribute('aria-label', 'Previous page');
    previous.disabled = state.page === 1;
    previous.textContent = '‹';
    const pageLabel = document.createElement('span');
    pageLabel.textContent = `Page ${state.page} of ${pages}`;
    const next = document.createElement('button');
    next.type = 'button';
    next.dataset.page = 'next';
    next.setAttribute('aria-label', 'Next page');
    next.disabled = state.page === pages;
    next.textContent = '›';
    controls.append(previous, pageLabel, next);
    container.append(summary, controls);
  };

  const render = () => {
    const matchingRecords = sortedRecords();
    const pages = Math.max(1, Math.ceil(matchingRecords.length / state.pageSize));
    if (state.page > pages) state.page = pages;
    const pageRecords = matchingRecords.slice(
      (state.page - 1) * state.pageSize,
      state.page * state.pageSize
    );

    body.replaceChildren();
    count.textContent = `${matchingRecords.length} ${matchingRecords.length === 1 ? 'record' : 'records'}`;

    const actionClasses = {
      Delivered: 'intervention-status-delivered',
      'Not Delivered': 'intervention-status-not-delivered',
    };

    pageRecords.forEach((record) => {
      const row = document.createElement('tr');
      if (hasInterventionActionColumn) {
        const recordIndex = records.indexOf(record);
        const manageCell = document.createElement('td');
        manageCell.className = 'intervention-row-action-cell';
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = `btn ${canEditInterventions ? 'intervention-row-edit-button' : 'intervention-row-view-button'}`;
        if (canEditInterventions) {
          editButton.dataset.editIntervention = String(recordIndex);
          editButton.title = 'Edit intervention';
          editButton.setAttribute('aria-label', `Edit ${record.title} intervention`);
          editButton.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
        } else {
          editButton.dataset.viewIntervention = String(recordIndex);
          editButton.title = 'View intervention details';
          editButton.setAttribute('aria-label', `View ${record.title} intervention details`);
          editButton.innerHTML = '<i class="bi bi-eye-fill" aria-hidden="true"></i>';
        }
        manageCell.append(editButton);
        row.append(manageCell);
      }

      const titleCell = document.createElement('td');
      const title = document.createElement('strong');
      title.className = 'intervention-record-title';
      title.textContent = record.title;
      titleCell.append(title);

      const officeCell = document.createElement('td');
      officeCell.className = 'intervention-cell-office';
      const officeParts = String(record.office || '—').split(/\s+[\u2014\u2013]\s+/);
      const storedOfficeName = officeParts[0];
      const beneficiaryOffices = Array.isArray(farmerRecord?.beneficiaryOffices) ? farmerRecord.beneficiaryOffices : [];
      const normalizeOfficeName = (value) => String(value || '').replace(/\s+/g, '').toLocaleLowerCase();
      const matchingBeneficiaryOffice = beneficiaryOffices.find((office) =>
        [office.office, office.name].filter(Boolean).some((name) =>
          normalizeOfficeName(name) === normalizeOfficeName(storedOfficeName)
        )
      );
      const officeRegion = officeParts.slice(1).join(' — ')
        || record.officeRegion
        || matchingBeneficiaryOffice?.region
        || '';
      const officeName = document.createElement('strong');
      officeName.className = 'intervention-office-name';
      officeName.textContent = storedOfficeName;
      officeCell.append(officeName);
      if (officeRegion) {
        const regionDetail = document.createElement('span');
        regionDetail.className = 'intervention-cell-detail';
        regionDetail.textContent = officeRegion;
        officeCell.append(regionDetail);
      }
      if (matchingBeneficiaryOffice) {
        const officeBadge = document.createElement('span');
        officeBadge.className = 'intervention-cell-origin';
        officeBadge.textContent = matchingBeneficiaryOffice.isPrimary ? 'Primary office' : 'Beneficiary office';
        officeCell.append(officeBadge);
      }

      const yearCell = document.createElement('td');
      const yearPill = document.createElement('span');
      yearPill.className = 'intervention-year-pill';
      yearPill.textContent = record.yearCovered;
      yearCell.append(yearPill);

      const actionCell = document.createElement('td');
      const actionBadge = document.createElement('span');
      actionBadge.className = `intervention-status ${actionClasses[record.action] || ''}`;
      actionBadge.textContent = record.action;
      actionCell.append(actionBadge);

      const typeCell = document.createElement('td');
      const typePill = document.createElement('span');
      typePill.className = 'intervention-type-pill';
      typePill.textContent = record.type;
      typeCell.append(typePill);

      const qtyCell = document.createElement('td');
      const quantity = document.createElement('strong');
      quantity.className = 'intervention-quantity';
      quantity.textContent = record.qty === 0 || record.qty === '0' ? '0' : record.qty || '—';
      qtyCell.append(quantity);

      row.append(
        titleCell,
        officeCell,
        yearCell,
        actionCell,
        typeCell,
        createCell(record.unit || '—'),
        qtyCell,
        createCell(record.remarks || '—', 'intervention-record-remarks')
      );
      body.append(row);
    });

    if (matchingRecords.length === 0) {
      const row = document.createElement('tr');
      const cell = createCell(
        records.length
          ? 'No interventions match the current search and filters.'
          : 'No interventions recorded yet. Select “Add Intervention” to get started.',
        'intervention-empty-cell'
      );
      cell.colSpan = 8 + Number(hasInterventionActionColumn);
      row.append(cell);
      body.append(row);
    }

    ['interventionPaginationTop', 'interventionPaginationBottom'].forEach((id) =>
      renderPagination(id, matchingRecords.length, pages)
    );
    table.querySelectorAll('.intervention-sortable').forEach((header) => {
      const active = state.sort?.key === header.dataset.sort;
      const icon = header.querySelector('i');
      header.setAttribute(
        'aria-sort',
        active
          ? state.sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      );
      icon.className = active
        ? `bi ${state.sort.direction === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`
        : 'bi bi-arrow-down-up';
    });
  };

  const refreshView = () => {
    state.page = 1;
    render();
  };

  records = loadRecords();
  render();

  body.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-view-intervention]');
    if (viewButton && canViewInterventions && viewInterventionModal && viewInterventionDetails) {
      const record = records[Number(viewButton.dataset.viewIntervention)];
      if (!record) {
        feedback.textContent = 'This intervention could not be loaded. Refresh the table and try again.';
        return;
      }
      const details = [
        ['Intervention', record.title],
        ['Region', record.officeRegion || farmerRecord?.region || farmerRecord?.regionName || 'Not recorded'],
        ['Office', record.office],
        ['Year covered', record.yearCovered],
        ['Action', record.action],
        ['Type', record.type],
        ['Unit', record.unit || 'Not recorded'],
        ['Quantity', record.qty || 'Not recorded'],
        ['Remarks', record.remarks || 'Not recorded'],
      ];
      viewInterventionDetails.replaceChildren();
      details.forEach(([label, value]) => {
        const item = document.createElement('div');
        item.className = 'intervention-detail-item';
        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = value;
        item.append(term, description);
        viewInterventionDetails.append(item);
      });
      bootstrap.Modal.getOrCreateInstance(viewInterventionModal).show();
      return;
    }
    if (!canEditInterventions) return;
    const editButton = event.target.closest('[data-edit-intervention]');
    if (!editButton) return;
    const index = Number(editButton.dataset.editIntervention);
    const record = records[index];
    if (!record) {
      feedback.textContent = 'This intervention could not be loaded. Refresh the table and try again.';
      return;
    }

    editingIndex = index;
    form.elements.title.value = record.title;
    form.elements.yearCovered.value = record.yearCovered;
    form.elements.action.value = record.action;
    form.elements.type.value = record.type;
    form.elements.unit.value = record.unit;
    form.elements.qty.value = record.qty;
    form.elements.remarks.value = record.remarks;

    const officeField = form.elements.office;
    const storedOffice = String(record.office || '');
    const storedOfficeName = storedOffice.split(/\s+[\u2014\u2013-]\s+/)[0].trim();
    const normalizeOfficeName = (value) => String(value || '').replace(/\s+/g, '').toLocaleLowerCase();
    const officeOption = [...officeField.options].find((option) => {
      const candidates = [option.value, option.textContent, option.dataset.officeName].filter(Boolean);
      return candidates.some((candidate) =>
        normalizeOfficeName(candidate) === normalizeOfficeName(storedOffice)
        || normalizeOfficeName(candidate) === normalizeOfficeName(storedOfficeName)
      );
    });
    officeField.value = officeOption?.value || '';
    [officeField, form.elements.yearCovered, form.elements.action, form.elements.type]
      .forEach((field) => field.dispatchEvent(new Event('change', { bubbles: true })));

    modalTitle.textContent = 'Edit intervention';
    submitButton.innerHTML = '<i class="bi bi-check2 me-1" aria-hidden="true"></i>Save changes';
    formError.textContent = '';
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
  });

  modalElement.addEventListener('hidden.bs.modal', () => {
    editingIndex = null;
    form.reset();
    modalTitle.textContent = 'Add intervention';
    submitButton.innerHTML = '<i class="bi bi-check2 me-1" aria-hidden="true"></i>Save intervention';
    formError.textContent = '';
  });

  globalSearch.addEventListener('input', () => {
    state.global = globalSearch.value.trim().toLowerCase();
    refreshView();
  });

  table.querySelectorAll('.intervention-column-filter').forEach((input) => {
    input.addEventListener('input', () => {
      state.columns[input.dataset.column] = input.value.trim().toLowerCase();
      refreshView();
    });
    input.addEventListener('change', () => {
      state.columns[input.dataset.column] = input.value.trim().toLowerCase();
      refreshView();
    });
  });

  table.querySelectorAll('.intervention-sortable').forEach((header) => {
    const sortByHeader = () => {
      const key = header.dataset.sort;
      state.sort =
        state.sort?.key === key
          ? { key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' }
          : { key, direction: 'asc' };
      refreshView();
    };
    header.addEventListener('click', sortByHeader);
    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        sortByHeader();
      }
    });
  });

  ['interventionPaginationTop', 'interventionPaginationBottom'].forEach((id) => {
    const container = document.getElementById(id);
    container?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      const pages = Math.max(1, Math.ceil(filteredRecords().length / state.pageSize));
      state.page =
        button.dataset.page === 'prev'
          ? Math.max(1, state.page - 1)
          : button.dataset.page === 'next'
            ? Math.min(pages, state.page + 1)
            : Number(button.dataset.page);
      render();
    });
    container?.addEventListener('change', (event) => {
      if (!event.target.matches('[data-page-size]')) return;
      state.pageSize = Number(event.target.value);
      refreshView();
    });
  });

  clearFiltersButton.addEventListener('click', () => {
    state.global = '';
    state.columns = {};
    state.sort = null;
    globalSearch.value = '';
    table.querySelectorAll('.intervention-column-filter').forEach((input) => {
      input.value = '';
    });
    refreshView();
  });

  refreshButton.addEventListener('click', () => {
    feedback.textContent = '';
    records = loadRecords();
    refreshView();
  });

  exportButton.addEventListener('click', () => {
    if (!window.XLSX) {
      feedback.textContent =
        'The Excel export library could not be loaded. Reload the page and try again.';
      return;
    }

    try {
      const beneficiaryOffices = Array.isArray(farmerRecord?.beneficiaryOffices) ? farmerRecord.beneficiaryOffices : [];
      const primaryOffice = beneficiaryOffices.find((office) => office.isPrimary) || beneficiaryOffices[0] || {};
      const fallbackRegion = String(primaryOffice.region || farmerRecord?.region || farmerRecord?.regionName || '');
      const headers = ['Intervention', 'Region', 'Office', 'Year Covered', 'Actions', 'Type', 'Unit', 'Qty', 'Remarks'];
      const exportRows = records.map((record) => {
        let office = String(record.office || '');
        let region = String(record.officeRegion || record.office_region || '');
        const officeParts = office.split(/\s+\u2014\s+/);
        if (officeParts.length > 1) {
          office = officeParts.shift();
          region = officeParts.join(' — ') || region;
        }
        region = (region || fallbackRegion).replace(/^Region\s+/i, '').replace(/\s*\([^)]*\)\s*$/, '');

        return [record.title, region, office, record.yearCovered, record.action, record.type, record.unit, record.qty, record.remarks];
      });
      const workbook = window.XLSX.utils.book_new();
      const worksheet = window.XLSX.utils.aoa_to_sheet([['Farmer Intervention'], ['Export'], headers, ...exportRows]);
      worksheet['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 15 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 32 }];
      window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Interventions');
      const exportDate = new Date().toISOString().slice(0, 10);
      window.XLSX.writeFile(workbook, `farmer_interventions_${farmerId}_${exportDate}.xlsx`);
      feedback.textContent = 'Intervention records exported successfully.';
    } catch (error) {
      feedback.textContent =
        'The Excel file could not be created. Please try again.';
      console.error('Unable to export farmer intervention records.', error);
    }
  });

  modalElement.addEventListener('show.bs.modal', () => {
    formError.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const officeOption = form.elements.office.selectedOptions[0];
    const record = {
      title: String(formData.get('title')).trim(),
      office: officeOption?.dataset.officeName
        ? `${officeOption.dataset.officeName} — ${officeOption.dataset.regionName}`
        : '',
      yearCovered: String(formData.get('yearCovered')).trim(),
      action: String(formData.get('action')),
      type: String(formData.get('type')).trim(),
      unit: String(formData.get('unit')).trim(),
      qty: String(formData.get('qty')).trim(),
      remarks: String(formData.get('remarks')).trim(),
    };
    record.office = officeOption?.dataset.officeName
      ? [officeOption.dataset.officeName, officeOption.dataset.regionName].filter(Boolean).join(' — ')
      : officeOption?.textContent.trim() || officeOption?.value || '';

    if (!isRecord(record)) {
      formError.textContent =
        'Check the intervention details. A valid title, office, year, action, and type are required.';
      return;
    }

    const updatedRecords = editingIndex === null
      ? [record, ...records]
      : records.map((savedRecord, index) => index === editingIndex ? { ...savedRecord, ...record } : savedRecord);
    const wasEditing = editingIndex !== null;
    try {
      await window.TmisStore.setItem(storageKey, JSON.stringify(updatedRecords));
    } catch (error) {
      formError.textContent =
        'This intervention could not be saved to the database. Check browser storage settings and try again.';
      console.error('Unable to save farmer intervention record.', error);
      return;
    }

    records = updatedRecords;
    refreshView();
    feedback.textContent = wasEditing
      ? 'Intervention updated successfully.'
      : 'Intervention added successfully.';
    form.reset();
    bootstrap.Modal.getOrCreateInstance(modalElement).hide();
  });
});
