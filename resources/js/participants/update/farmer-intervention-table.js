document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('interventionTableBody');
  const count = document.getElementById('interventionRecordCount');
  const feedback = document.getElementById('interventionFeedback');
  const refreshButton = document.getElementById('refreshInterventions');
  const exportButton = document.getElementById('exportInterventions');
  const globalSearch = document.getElementById('interventionGlobalSearch');
  const clearButton = document.getElementById('clearInterventionFilters');
  const table = document.getElementById('interventionDataTable');

  if (!body || !count || !feedback || !refreshButton || !exportButton || !globalSearch || !clearButton || !table || !window.TmisStore) return;

  const farmer = () => window.TmisStore.selected('tmis-farmers');
  const canRead = window.TmisStore.can('participants.interventions.read')
    || window.TmisStore.can('participants.interventions.edit')
    || window.TmisStore.can('participants.interventions.delete');
  const canEdit = window.TmisStore.can('participants.interventions.edit');
  const canDelete = window.TmisStore.can('participants.interventions.delete');
  const pageSizes = [20, 50, 100, 500, 1000];
  const state = { search: '', columns: {}, page: 1, pageSize: 20, sort: null };
  const keys = ['title', 'office', 'yearCovered', 'action', 'type', 'unit', 'qty', 'remarks'];
  const clean = value => value === undefined || value === null ? '' : String(value);

  const interventionRecords = () => {
    const profile = farmer();
    const source = profile?.interventions ?? profile?.interventionRecords ?? profile?.intervention;
    return Array.isArray(source) ? source : [];
  };

  function makeCell(value, className = '') {
    const cell = document.createElement('td');
    cell.textContent = clean(value) || '—';
    if (className) cell.className = className;
    return cell;
  }

  function renderActionCell(record) {
    const cell = document.createElement('td');
    cell.className = 'intervention-row-action-cell';
    const actions = [
      ['view', true, 'View intervention details', 'eye-fill', 'viewInterventionId'],
      ['edit', canEdit, 'Edit intervention', 'pencil-square', 'editInterventionId'],
      ['delete', canDelete, 'Permanently delete intervention', 'trash3', 'deleteInterventionId'],
    ];

    actions.forEach(([key, allowed, title, icon, dataset]) => {
      if (!allowed || (key === 'view' && !canRead)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn intervention-row-${key}-button`;
      button.dataset[dataset] = String(record.id || '');
      button.title = title;
      button.setAttribute('aria-label', `${title}: ${clean(record.title)}`);
      button.innerHTML = `<i class="bi bi-${icon}" aria-hidden="true"></i>`;
      cell.append(button);
    });

    return cell;
  }

  function renderRow(record) {
    const row = document.createElement('tr');
    row.append(renderActionCell(record));

    keys.forEach(key => {
      const value = clean(record[key]);
      const cell = document.createElement('td');
      cell.className = `intervention-cell intervention-cell-${key}`;
      if (key === 'title') {
        const title = document.createElement('strong');
        title.className = 'intervention-record-title';
        title.textContent = value || 'Not recorded';
        cell.append(title);
      } else if (key === 'office') {
        const officeParts = value.split(/\s+[—–-]\s+/);
        const name = document.createElement('strong');
        name.className = 'intervention-office-name';
        name.textContent = officeParts.shift() || 'Not recorded';
        cell.append(name);
        if (officeParts.length || record.officeRegion) {
          const region = document.createElement('span');
          region.className = 'intervention-cell-detail';
          region.textContent = officeParts.join(' — ') || clean(record.officeRegion);
          cell.append(region);
        }
      } else if (key === 'yearCovered') {
        const year = document.createElement('span');
        year.className = 'intervention-year-pill';
        year.textContent = value || '—';
        cell.append(year);
      } else if (key === 'action') {
        const status = document.createElement('span');
        status.className = `intervention-status ${value.toLocaleLowerCase() === 'delivered' ? 'intervention-status-delivered' : 'intervention-status-not-delivered'}`;
        status.textContent = value || 'Not recorded';
        cell.append(status);
      } else if (key === 'type') {
        const type = document.createElement('span');
        type.className = 'intervention-type-pill';
        type.textContent = value || 'Not recorded';
        cell.append(type);
      } else if (key === 'qty') {
        const quantity = document.createElement('strong');
        quantity.className = 'intervention-quantity';
        quantity.textContent = value || '—';
        cell.append(quantity);
      } else {
        cell.textContent = value || '—';
      }
      row.append(cell);
    });

    return row;
  }

  function matches(record) {
    const allValues = keys.map(key => clean(record[key]).toLocaleLowerCase());
    return (!state.search || allValues.some(value => value.includes(state.search)))
      && Object.entries(state.columns).every(([key, filter]) => !filter || clean(record[key]).toLocaleLowerCase().includes(filter));
  }

  function renderPager(container, total, page, pageCount) {
    container.replaceChildren();
    const start = total ? ((page - 1) * state.pageSize) + 1 : 0;
    const end = Math.min(page * state.pageSize, total);
    const summary = document.createElement('span');
    summary.textContent = `Showing ${start}–${end} of ${total} records`;
    const controls = document.createElement('div');
    controls.className = 'pagination-controls';
    const pageSize = document.createElement('select');
    pageSize.setAttribute('aria-label', 'Rows per page');
    pageSizes.forEach(size => pageSize.add(new Option(String(size), String(size))));
    pageSize.value = String(state.pageSize);
    pageSize.addEventListener('change', () => {
      state.pageSize = Number(pageSize.value);
      state.page = 1;
      render();
    });
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.dataset.page = 'previous';
    previous.textContent = '‹';
    previous.setAttribute('aria-label', 'Previous page');
    previous.disabled = page <= 1;
    const current = document.createElement('span');
    current.textContent = `Page ${page} of ${pageCount}`;
    const next = document.createElement('button');
    next.type = 'button';
    next.dataset.page = 'next';
    next.textContent = '›';
    next.setAttribute('aria-label', 'Next page');
    next.disabled = page >= pageCount;
    controls.append(pageSize, previous, current, next);
    container.append(summary, controls);
  }

  function render() {
    table.hidden = !canRead;
    [exportButton, refreshButton, globalSearch, clearButton].forEach(control => { control.disabled = !canRead; });
    if (!canRead) {
      feedback.textContent = 'You do not have permission to view intervention records.';
      return;
    }

    const all = interventionRecords();
    const filtered = all.filter(matches);
    if (state.sort) {
      filtered.sort((left, right) => {
        const result = clean(left[state.sort.key]).localeCompare(clean(right[state.sort.key]), undefined, { numeric: true, sensitivity: 'base' });
        return state.sort.direction === 'asc' ? result : -result;
      });
    }

    const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(state.page, pageCount);
    body.replaceChildren();
    filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize).forEach(record => body.append(renderRow(record)));
    if (!filtered.length) {
      const empty = document.createElement('tr');
      const cell = document.createElement('td');
      cell.className = 'intervention-empty-cell';
      cell.colSpan = 9;
      cell.textContent = all.length ? 'No interventions match the current filters.' : 'No intervention records are available.';
      empty.append(cell);
      body.append(empty);
    }

    count.textContent = `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`;
    ['interventionPaginationTop', 'interventionPaginationBottom'].forEach(id => {
      const container = document.getElementById(id);
      if (container) renderPager(container, filtered.length, state.page, pageCount);
    });
    table.querySelectorAll('.intervention-sortable').forEach(header => {
      const active = state.sort?.key === header.dataset.sort;
      header.setAttribute('aria-sort', active ? (state.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
      const icon = header.querySelector('i');
      if (icon) icon.className = active ? `bi ${state.sort.direction === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}` : 'bi bi-arrow-down-up';
    });
  }

  async function refresh() {
    refreshButton.disabled = true;
    feedback.textContent = '';
    try {
      await window.TmisStore.refresh();
      render();
      window.TmisToast?.show('Farmer intervention records refreshed.', 'success');
    } catch (error) {
      feedback.textContent = error.message || 'Intervention records could not be refreshed.';
      window.TmisToast?.show(feedback.textContent, 'error');
    } finally {
      refreshButton.disabled = false;
    }
  }

  function exportAll() {
    if (!window.XLSX) {
      window.TmisToast?.show('Excel export is unavailable. Reload the page and try again.', 'error');
      return;
    }
    const profile = farmer();
    const fallbackRegion = clean(profile?.region || profile?.regionName || profile?.region_name);
    const rows = interventionRecords().map(record => {
      const officeParts = clean(record.office).split(/\s+[—–-]\s+/);
      const office = officeParts.shift() || '';
      const region = clean(record.officeRegion || record.office_region || officeParts.join(' — ') || fallbackRegion).replace(/^Region\s+/i, '').replace(/\s*\([^)]*\)\s*$/, '');
      return [record.title, region, office, record.yearCovered, record.action, record.type, record.unit, record.qty, record.remarks];
    });
    const worksheet = window.XLSX.utils.aoa_to_sheet([['Farmer Intervention'], ['Export'], ['Intervention', 'Region', 'Office', 'Year Covered', 'Actions', 'Type', 'Unit', 'Qty', 'Remarks'], ...rows]);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 15 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 32 }];
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Interventions');
    const profileId = profile?.farmerNumber || profile?.farmer_number || profile?.id || 'profile';
    window.XLSX.writeFile(workbook, `farmer_interventions_${profileId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    window.TmisToast?.show('All farmer intervention records were exported.', 'success');
  }

  globalSearch.addEventListener('input', () => { state.search = globalSearch.value.trim().toLocaleLowerCase(); state.page = 1; render(); });
  table.querySelectorAll('.intervention-column-filter').forEach(input => input.addEventListener('input', () => {
    state.columns[input.dataset.column] = input.value.trim().toLocaleLowerCase();
    state.page = 1;
    render();
  }));
  table.querySelectorAll('.intervention-sortable').forEach(header => {
    const sort = () => {
      const key = header.dataset.sort;
      state.sort = state.sort?.key === key ? { key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' };
      render();
    };
    header.addEventListener('click', sort);
    header.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sort(); } });
  });
  ['interventionPaginationTop', 'interventionPaginationBottom'].forEach(id => document.getElementById(id)?.addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.page += button.dataset.page === 'previous' ? -1 : 1;
    render();
  }));
  clearButton.addEventListener('click', () => {
    state.search = '';
    state.columns = {};
    state.sort = null;
    state.page = 1;
    globalSearch.value = '';
    table.querySelectorAll('.intervention-column-filter').forEach(input => { input.value = ''; });
    feedback.textContent = '';
    render();
  });
  refreshButton.addEventListener('click', refresh);
  exportButton.addEventListener('click', exportAll);
  window.addEventListener('tmis:data-updated', render);
  render();
});
