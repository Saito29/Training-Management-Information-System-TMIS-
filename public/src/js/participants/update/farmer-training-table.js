document.addEventListener('DOMContentLoaded', () => {
  const databaseRecords = () => {
    const farmer = window.TmisStore.selected('tmis-farmers');
    if (!farmer) return [];

    const associationIds = new Set((farmer.associationMemberships || [])
      .flatMap(membership => [membership.id, membership.databaseId])
      .filter(Boolean)
      .map(String));

    return window.TmisStore.records('tmis-trainings')
      .filter(training =>
        (training.participants || []).includes(farmer.id)
        || (training.associationIds || []).some(id => associationIds.has(String(id)))
      )
      .map(item => ({
        ...item,
        category: item.type,
        year: item.yearCovered || item.year_covered || '',
        date: item.startDate,
        region: item.region || '',
        location: item.venue,
        office: item.office || '',
        organizer: item.office || '',
        preTest: null,
        postTest: null,
        rating: null,
      }));
  };
  let records = (window.TMIS_PAGE ? databaseRecords() : [
    {
      id: 'modern-rice-production',
      title: 'Modern Rice Production',
      category: 'Crop Production',
      date: 'May 22–24, 2025',
      location: 'Los Baños, Laguna',
      organizer: 'DA RFO IV-A',
      preTest: 68,
      postTest: 86,
      rating: 4.5,
    },
    {
      id: 'organic-vegetable-production',
      title: 'Organic Vegetable Production',
      category: 'Organic Agriculture',
      date: 'May 27–29, 2025',
      location: 'Benguet State Univ.',
      organizer: 'DA-BPI',
      preTest: 72,
      postTest: 88,
      rating: 4.2,
    },
    {
      id: 'climate-smart-agriculture',
      title: 'Climate Smart Agriculture',
      category: 'Climate Smart',
      date: 'June 10–12, 2025',
      location: 'Isabela State Univ.',
      organizer: 'DA-AMIA',
      preTest: 70,
      postTest: 85,
      rating: 4.8,
    },
    {
      id: 'farm-business-management',
      title: 'Farm Business Management',
      category: 'Agri-business',
      date: 'June 3–5, 2025',
      location: 'DA RFO VI, Iloilo',
      organizer: 'DA-AMAD',
      preTest: 60,
      postTest: 82,
      rating: 4.0,
    },
    {
      id: 'farm-moe-production',
      title: 'Farm MOE Production',
      category: 'Organic Agriculture',
      date: 'May 22–24, 2025',
      location: 'Los Baños, Laguna',
      organizer: 'DA-AMAD',
      preTest: 60,
      postTest: 85,
      rating: 4.6,
    },
    {
      id: 'farm-business-production',
      title: 'Farm Business Production',
      category: 'Crop Production',
      date: 'June 10–12, 2025',
      location: 'DA RFO VI, Iloilo',
      organizer: 'DA RFO IV-A',
      preTest: 68,
      postTest: 85,
      rating: 4.5,
    },
    {
      id: 'modern-rice-production-climate',
      title: 'Modern Rice Production',
      category: 'Climate Smart',
      date: 'May 9–12, 2025',
      location: 'Isabela State Univ.',
      organizer: 'DA-AMIA',
      preTest: 70,
      postTest: 85,
      rating: 4.8,
    },
    {
      id: 'farm-business-management-advanced',
      title: 'Farm Business Management',
      category: 'Agri-business',
      date: 'June 3–5, 2025',
      location: 'DA RFO VI, Iloilo',
      organizer: 'DA-AMAD',
      preTest: 60,
      postTest: 82,
      rating: 4.0,
    },
    {
      id: 'efficient-water-management',
      title: 'Efficient Water Management',
      category: 'Farm Technology',
      date: 'July 2–4, 2025',
      location: 'Lucban, Quezon',
      organizer: 'DA RFO IV-A',
      preTest: 70,
      postTest: 84,
      rating: 4.3,
    },
    {
      id: 'farmers-market-linkage',
      title: "Farmers' Market Linkage Workshop",
      category: 'Market Development',
      date: 'September 2–4, 2025',
      location: 'Lucena City',
      organizer: 'DA-AMAD',
      preTest: 69,
      postTest: 87,
      rating: 4.4,
    },
  ]);
  records = records.map(record => ({...record, region: record.region || 'Not recorded', office: record.office || record.organizer || 'Not recorded'}));

  const tableBody = document.getElementById('trainings-table-body');
  const table = document.getElementById('trainingDataTable');
  const emptyState = document.getElementById('trainingTableEmpty');
  const globalSearch = document.getElementById('trainingGlobalSearch');
  const clearButton = document.getElementById('clearTrainingFilters');
  const exportButton = document.getElementById('exportTrainingTable');
  const showFiltersButton = document.getElementById('showTrainingFilters');
  const applyFiltersButton = document.getElementById('applyTrainingFilters');
  const filterSearchRow = document.getElementById('trainingFilterSearchRow');
  const paginationIds = ['trainingPaginationTop', 'trainingPaginationBottom'];
  const yearFilter = document.getElementById('trainingFilterYear');
  const categoryFilter = document.getElementById('trainingFilterCategory');
  const dateFilter = document.getElementById('trainingFilterDate');
  const regionFilter = document.getElementById('trainingFilterRegion');
  const officeFilter = document.getElementById('trainingFilterOffice');

  if (
    !tableBody ||
    !table ||
    !emptyState ||
    !globalSearch ||
    !clearButton ||
    !exportButton
  ) {
    return;
  }

  const state = {
    global: '',
    year: '',
    category: '',
    date: '',
    region: '',
    office: '',
    page: 1,
    pageSize: 8,
    sort: null,
  };

  const formatScore = (value) => value===null||value===undefined?'No results':`${Number(value).toFixed(2)}%`;
  const formatRating = (value) => value===null||value===undefined?'No results':`${Number(value).toFixed(2)} / 5`;
  const titleSegment = title => String(title || 'training')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'training';
  const trainingViewUrl = training => (table.dataset.trainingViewRoute || '/app/admin/training/id/view-training/__title__/__id__')
    .replace('__title__', titleSegment(training.title))
    .replace('__id__', encodeURIComponent(training.id));
  const searchableValue = (record, key) => {
    if (key === 'preTest' || key === 'postTest')
      return formatScore(record[key]);
    if (key === 'rating') return formatRating(record[key]);
    return String(record[key]);
  };

  const fillFilter = (select, values, placeholder, selected = select.value) => {
    const options = [...new Set(values.filter(value => value && value !== 'Not recorded').map(String))]
      .sort((left, right) => left.localeCompare(right, undefined, {numeric: true, sensitivity: 'base'}));
    select.replaceChildren(new Option(placeholder, ''), ...options.map(value => new Option(value, value)));
    select.value = options.includes(selected) ? selected : '';
  };
  const refreshOfficeOptions = () => {
    const options = records.filter(record => !state.region || String(record.region) === state.region).map(record => record.office);
    fillFilter(officeFilter, options, 'All offices', state.office);
  };
  fillFilter(yearFilter, records.map(record => record.year), 'All years', state.year);
  fillFilter(categoryFilter, records.map(record => record.category), 'All categories', state.category);
  fillFilter(regionFilter, records.map(record => record.region), 'All regions', state.region);
  refreshOfficeOptions();

  const filteredRecords = () =>
    records.filter((record) => {
      const matchesGlobal =
        !state.global ||
        Object.keys(record)
          .filter((key) => key !== 'id')
          .some((key) =>
            searchableValue(record, key)
              .toLowerCase()
              .includes(state.global)
          );
      const matchesDate = !state.date || String(record.date || '').slice(0, 10) === state.date;
      return matchesGlobal
        && (!state.year || String(record.year) === state.year)
        && (!state.category || String(record.category) === state.category)
        && matchesDate
        && (!state.region || String(record.region) === state.region)
        && (!state.office || String(record.office) === state.office);
    });

  const sortedRecords = () => {
    const result = filteredRecords();
    if (!state.sort) return result;

    const { key, direction } = state.sort;
    return [...result].sort((left, right) => {
      const leftValue = left[key];
      const rightValue = right[key];
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, {
              numeric: true,
              sensitivity: 'base',
            });
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  const createRow = (record) => {
    const row = document.createElement('tr');
    const actionCell = document.createElement('td');
    const actionLink = document.createElement('a');
    actionLink.className = 'training-row-action';
    actionLink.href = trainingViewUrl(record);
    actionLink.target = '_blank';
    actionLink.rel = 'noopener';
    actionLink.setAttribute('aria-label', `Open ${record.title}`);
    actionLink.title = 'Open training';
    actionLink.innerHTML = '<i class="bi bi-eye-fill" aria-hidden="true"></i>';
    actionCell.append(actionLink);
    row.append(actionCell);

    const titleCell = document.createElement('td');
    const titleText = document.createElement('strong');
    titleText.className = 'training-table-title-text';
    titleText.textContent = record.title;
    titleCell.append(titleText);
    row.append(titleCell);

    [
      record.category,
      record.year || '',
      record.date,
      record.region,
      record.location,
      record.office,
      formatScore(record.preTest),
      formatScore(record.postTest),
      formatRating(record.rating),
    ].forEach((value, index) => {
      const cell = document.createElement('td');
      if (index === 1) {
        const year = document.createElement('span');
        year.className = 'training-year-value';
        year.textContent = value || 'Not recorded';
        cell.append(year);
      } else if (index === 5) {
        const office = document.createElement('span');
        office.className = 'training-office-value';
        office.textContent = value || 'Not recorded';
        cell.append(office);
      } else {
        cell.textContent = value ?? '';
      }
      row.append(cell);
    });
    return row;
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

    container.innerHTML = `<span>Showing ${start}–${end} of ${total} trainings</span><div class="pagination-controls"><label class="visually-hidden" for="${id}PageSize">Rows per page</label><select id="${id}PageSize" data-page-size aria-label="Rows per page"><option value="8">8</option><option value="16">16</option><option value="32">32</option><option value="all">All</option></select>${pageButtons}</div>`;
    container.querySelector('[data-page-size]').value = state.pageSize;
  };

  const render = () => {
    const sorted = sortedRecords();
    const pages =
      state.pageSize === 'all'
        ? 1
        : Math.max(1, Math.ceil(sorted.length / state.pageSize));
    if (state.page > pages) state.page = pages;
    const pageRecords =
      state.pageSize === 'all'
        ? sorted
        : sorted.slice(
            (state.page - 1) * state.pageSize,
            state.page * state.pageSize
          );

    tableBody.replaceChildren(...pageRecords.map(createRow));
    emptyState.hidden = sorted.length > 0;
    table.hidden = sorted.length === 0;
    const emptyMessage = emptyState.querySelector('strong');
    if (emptyMessage) {
      emptyMessage.textContent = records.length
        ? 'No training records match the current filters.'
        : 'No training attended found for this farmer/participant.';
    }
    paginationIds.forEach((id) => renderPagination(id, sorted.length, pages));

    table.querySelectorAll('.training-sortable').forEach((header) => {
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

  const refresh = () => {
    state.page = 1;
    render();
  };

  globalSearch.addEventListener('input', () => {
    state.global = globalSearch.value.trim().toLowerCase();
    refresh();
  });

  showFiltersButton?.addEventListener('click', () => {
    if (!filterSearchRow) return;
    const shouldShow = filterSearchRow.hidden;
    filterSearchRow.hidden = !shouldShow;
    showFiltersButton.setAttribute('aria-expanded', String(shouldShow));
    showFiltersButton.innerHTML = `<i class="bi bi-sliders" aria-hidden="true"></i> ${shouldShow ? 'Hide' : 'Show'}`;
  });
  applyFiltersButton?.addEventListener('click', refresh);
  yearFilter.addEventListener('change', () => { state.year = yearFilter.value; refresh(); });
  categoryFilter.addEventListener('change', () => { state.category = categoryFilter.value; refresh(); });
  dateFilter.addEventListener('change', () => { state.date = dateFilter.value; refresh(); });
  regionFilter.addEventListener('change', () => {
    state.region = regionFilter.value;
    state.office = '';
    refreshOfficeOptions();
    refresh();
  });
  officeFilter.addEventListener('change', () => { state.office = officeFilter.value; refresh(); });

  table.querySelectorAll('.training-sortable').forEach((header) => {
    const sortByHeader = () => {
      const key = header.dataset.sort;
      state.sort =
        state.sort?.key === key
          ? { key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' }
          : { key, direction: 'asc' };
      refresh();
    };
    header.addEventListener('click', sortByHeader);
    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        sortByHeader();
      }
    });
  });

  paginationIds.forEach((id) => {
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
      refresh();
    });
  });

  clearButton.addEventListener('click', () => {
    state.global = '';
    state.year = '';
    state.category = '';
    state.date = '';
    state.region = '';
    state.office = '';
    state.sort = null;
    globalSearch.value = '';
    yearFilter.value = '';
    categoryFilter.value = '';
    dateFilter.value = '';
    regionFilter.value = '';
    refreshOfficeOptions();
    refresh();
  });

  exportButton.addEventListener('click', () => {
    if (!window.XLSX) {
      window.alert('The XLSX export library could not be loaded. Please reload the page and try again.');
      return;
    }
    const exportRows = sortedRecords().map((record) => ({
      'Training Name': record.title,
      Category: record.category,
      Year: record.year || '',
      Dates: record.date,
      Region: record.region,
      Location: record.location,
      Office: record.office,
      'Pre-Test': formatScore(record.preTest),
      'Post-Test': formatScore(record.postTest),
      Rating: formatRating(record.rating),
    }));
    const workbook = window.XLSX.utils.book_new();
    const worksheet = window.XLSX.utils.json_to_sheet(exportRows);
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Training Records');
    window.XLSX.writeFile(workbook, 'farmer-training-records.xlsx');
  });

  if (window.TMIS_PAGE) {
    window.addEventListener('tmis:data-updated', () => {
      records = databaseRecords();
      refresh();
    });
  }

  render();
});
