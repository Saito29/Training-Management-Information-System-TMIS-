document.addEventListener('DOMContentLoaded', () => {
  const records = (window.TMIS_PAGE ? window.TmisStore.records('tmis-trainings').filter(item=>(item.participants||[]).includes(window.TmisStore.selectedId())).map(item=>({...item,category:item.type,date:item.startDate,location:item.venue,organizer:item.office,preTest:null,postTest:null,rating:null})) : [
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

  const tableBody = document.getElementById('trainings-table-body');
  const table = document.getElementById('trainingDataTable');
  const emptyState = document.getElementById('trainingTableEmpty');
  const globalSearch = document.getElementById('trainingGlobalSearch');
  const clearButton = document.getElementById('clearTrainingFilters');
  const exportButton = document.getElementById('exportTrainingTable');
  const paginationIds = ['trainingPaginationTop', 'trainingPaginationBottom'];

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
    columns: {},
    page: 1,
    pageSize: 8,
    sort: null,
  };

  const formatScore = (value) => value===null||value===undefined?'No results':`${Number(value).toFixed(2)}%`;
  const formatRating = (value) => value===null||value===undefined?'No results':`${Number(value).toFixed(2)} / 5`;
  const searchableValue = (record, key) => {
    if (key === 'preTest' || key === 'postTest')
      return formatScore(record[key]);
    if (key === 'rating') return formatRating(record[key]);
    return String(record[key]);
  };

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
      const matchesColumns = Object.entries(state.columns).every(
        ([key, filter]) =>
          !filter ||
          searchableValue(record, key).toLowerCase().includes(filter)
      );
      return matchesGlobal && matchesColumns;
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
    const titleCell = document.createElement('td');
    const titleLink = document.createElement('a');
    titleLink.className = 'training-table-title-link';
    titleLink.href = `../../training/id/view-training?id=${encodeURIComponent(record.id)}`;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener';
    titleLink.textContent = record.title;
    titleCell.append(titleLink);
    row.append(titleCell);

    [
      record.category,
      record.date,
      record.location,
      record.organizer,
      formatScore(record.preTest),
      formatScore(record.postTest),
      formatRating(record.rating),
    ].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
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

  table.querySelectorAll('.training-column-filter').forEach((input) => {
    input.addEventListener('input', () => {
      state.columns[input.dataset.column] = input.value.trim().toLowerCase();
      refresh();
    });
  });

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
    state.columns = {};
    state.sort = null;
    globalSearch.value = '';
    table.querySelectorAll('.training-column-filter').forEach((input) => {
      input.value = '';
    });
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
      Dates: record.date,
      Location: record.location,
      Organizer: record.organizer,
      'Pre-Test': formatScore(record.preTest),
      'Post-Test': formatScore(record.postTest),
      Rating: formatRating(record.rating),
    }));
    const workbook = window.XLSX.utils.book_new();
    const worksheet = window.XLSX.utils.json_to_sheet(exportRows);
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Training Records');
    window.XLSX.writeFile(workbook, 'farmer-training-records.xlsx');
  });

  render();
});
