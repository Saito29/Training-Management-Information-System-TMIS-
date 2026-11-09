document.addEventListener('DOMContentLoaded', () => {
  const storageKey = 'tmis-farmer-271901-interventions';
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

  let records = [];
  const state = {
    global: '',
    columns: {},
    page: 1,
    pageSize: 10,
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

    const allRows = state.pageSize === 'all';
    const start = total ? (allRows ? 1 : (state.page - 1) * state.pageSize + 1) : 0;
    const end = allRows ? total : Math.min(state.page * state.pageSize, total);
    const pageNumbers = Array.from({ length: pages }, (_, index) => index + 1).filter(
      (page) =>
        pages <= 7 || page === 1 || page === pages || Math.abs(page - state.page) <= 1
    );
    const pageButtons = allRows
      ? ''
      : `<button type="button" data-page="prev" aria-label="Previous page" ${state.page === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left" aria-hidden="true"></i></button>${pageNumbers
          .map(
            (page, index) =>
              `${index && page - pageNumbers[index - 1] > 1 ? '<span aria-hidden="true">…</span>' : ''}<button type="button" data-page="${page}" class="${page === state.page ? 'active' : ''}" aria-label="Page ${page}" ${page === state.page ? 'aria-current="page"' : ''}>${page}</button>`
          )
          .join('')}<button type="button" data-page="next" aria-label="Next page" ${state.page === pages ? 'disabled' : ''}><i class="bi bi-chevron-right" aria-hidden="true"></i></button>`;

    container.innerHTML = `<span>Showing ${start}–${end} of ${total} interventions</span><div class="pagination-controls"><label class="visually-hidden" for="${id}PageSize">Rows per page</label><select id="${id}PageSize" data-page-size aria-label="Rows per page"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="500">500</option><option value="1000">1000</option><option value="all">All</option></select>${pageButtons}</div>`;
    container.querySelector('[data-page-size]').value = state.pageSize;
  };

  const render = () => {
    const matchingRecords = sortedRecords();
    const pages =
      state.pageSize === 'all'
        ? 1
        : Math.max(1, Math.ceil(matchingRecords.length / state.pageSize));
    if (state.page > pages) state.page = pages;
    const pageRecords =
      state.pageSize === 'all'
        ? matchingRecords
        : matchingRecords.slice(
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
      const titleCell = document.createElement('td');
      const title = document.createElement('strong');
      title.className = 'intervention-record-title';
      title.textContent = record.title;
      titleCell.append(title);
      const actionCell = document.createElement('td');
      const actionBadge = document.createElement('span');
      actionBadge.className = `intervention-status ${actionClasses[record.action] || ''}`;
      actionBadge.textContent = record.action;
      actionCell.append(actionBadge);
      row.append(
        titleCell,
        createCell(record.office),
        createCell(record.yearCovered),
        actionCell,
        createCell(record.type),
        createCell(record.unit || '—'),
        createCell(record.qty || '—'),
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
      cell.colSpan = 8;
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
      const pages =
        state.pageSize === 'all'
          ? 1
          : Math.max(1, Math.ceil(filteredRecords().length / state.pageSize));
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
      state.pageSize =
        event.target.value === 'all' ? 'all' : Number(event.target.value);
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
      const exportRows = sortedRecords().map((record) => ({
        Intervention: record.title,
        Office: record.office,
        'Year Covered': record.yearCovered,
        Actions: record.action,
        Type: record.type,
        Unit: record.unit,
        Qty: record.qty,
        Remarks: record.remarks,
      }));
      const workbook = window.XLSX.utils.book_new();
      const worksheet = window.XLSX.utils.json_to_sheet(exportRows);
      window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Interventions');
      window.XLSX.writeFile(workbook, 'farmer-interventions.xlsx');
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
    const record = {
      title: String(formData.get('title')).trim(),
      office: String(formData.get('office')).trim(),
      yearCovered: String(formData.get('yearCovered')).trim(),
      action: String(formData.get('action')),
      type: String(formData.get('type')).trim(),
      unit: String(formData.get('unit')).trim(),
      qty: String(formData.get('qty')).trim(),
      remarks: String(formData.get('remarks')).trim(),
    };

    if (!isRecord(record)) {
      formError.textContent =
        'Check the intervention details. A valid title, office, year, action, and type are required.';
      return;
    }

    const updatedRecords = [record, ...records];
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
    feedback.textContent = 'Intervention added successfully.';
    form.reset();
    bootstrap.Modal.getOrCreateInstance(modalElement).hide();
  });
});
