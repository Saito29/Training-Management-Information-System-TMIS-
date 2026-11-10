document.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // Data
  // ============================================================
  const REGION = 'Region IV-A (CALABARZON)';
  const PROVINCE = 'Quezon';

  const seed = [
    ['FMR-2026-001', 'Villa Esperanza FA', 'Member', 'Dela Cruz', 'Juan', 'Santos', 'Male', 'Alabat', 'Villa Esperanza', 'For Review', 2026],
    ['FMR-2026-002', 'Perez Farmers Association', 'Member', 'Santos', 'Maria', 'Reyes', 'Female', 'Perez', 'Villamanzano Sur', 'For Approval', 2026],
    ['FMR-2025-003', 'Jomalig Farmers Association', 'Officer', 'Reyes', 'Pedro', 'Garcia', 'Male', 'Jomalig', 'Apad', 'Approved & Accepted', 2025],
    ['FMR-2026-004', 'Alabat Farmers Association', 'Member', 'Mendoza', 'Ana', 'Cruz', 'Female', 'Alabat', 'Villa Norte', 'For Review', 2026],
    ['FMR-2024-005', 'Perez Farmers Association', 'Member', 'Ramos', 'Roberto', 'Diaz', 'Male', 'Perez', 'Villamanzano Sur', 'Approved & Accepted', 2024],
    ['FMR-2026-006', 'Patnanungan Agricultural Cooperative', 'Secretary', 'Villanueva', 'Liza', 'Aquino', 'Female', 'Patnanungan', 'Amaga', 'For Review', 2026],
    ['FMR-2025-007', 'Alabat Farmers Association', 'Member', 'Garcia', 'Elena', 'Torres', 'Female', 'Alabat', 'Caglate', 'For Review', 2025],
    ['FMR-2024-008', 'Jomalig Farmers Association', 'Member', 'Navarro', 'Rico', 'Flores', 'Male', 'Jomalig', 'Bukal', 'For Review', 2024],
  ];
  const organizations = [
    'Villa Esperanza FA',
    'Perez Farmers Association',
    'Jomalig Farmers Association',
    'Alabat Farmers Association',
    'Patnanungan Agricultural Cooperative',
  ];
  const municipalities = [
    ['Alabat', 'Villa Esperanza'],
    ['Perez', 'Villamanzano Sur'],
    ['Jomalig', 'Apad'],
    ['Alabat', 'Villa Norte'],
    ['Patnanungan', 'Amaga'],
  ];
    for (let n = 9; n <= 48; n++) {
    const y = 2024 + (n % 3);
    const loc = municipalities[n % municipalities.length];
    seed.push([
      `FMR-${y}-${String(n).padStart(3, '0')}`,
      organizations[n % organizations.length],
      n % 6 === 0 ? 'Officer' : 'Member',
      ['Cruz', 'Bautista', 'Mercado', 'Aquino', 'Castillo'][n % 5],
      ['Carlo', 'Grace', 'Noel', 'Irene', 'Paolo'][n % 5],
      'Santos',
      n % 2 ? 'Male' : 'Female',
      loc[0],
      loc[1],
      'Approved & Accepted',
      y,
    ]);
  }

  const islandTowns = ['Jomalig', 'Patnanungan'];
  const hasDatabaseRecords = Boolean(window.TMIS_PAGE && window.TmisStore);
  let allRecords = (window.TMIS_PAGE ? window.TmisStore.records('tmis-farmers') : seed.map(
    ([id, organization, role, lastName, firstName, middleName, sex, municipality, barangay, status, yearCovered], i) => ({
      id,
      organization,
      role,
      lastName,
      firstName,
      middleName,
      suffix: '',
      birthDate: `198${i % 9}-0${(i % 8) + 1}-1${i % 9}`,
      sex,
      civilStatus: i % 2 ? 'Married' : 'Single',
      nationality: 'Filipino',
      placeOfBirth: `${municipality}, Quezon`,
      region: REGION,
      province: PROVINCE,
      district: islandTowns.includes(municipality) ? '1st District' : '2nd District',
      municipality,
      barangay,
      sitio: `Purok ${(i % 5) + 1}`,
      fourPs: i % 3 ? 'No' : 'Yes',
      pwd: i % 7 ? 'No' : 'Yes',
      indigenousGroup: islandTowns.includes(municipality) ? 'Yes' : 'No',
      tribeName: islandTowns.includes(municipality) ? 'Agta' : '—',
      dietaryRestriction: 'None',
      seniorCitizen: i % 8 ? 'No' : 'Yes',
      yearCovered,
      profileStatus: i % 11 ? 'Active' : 'Inactive',
      registered: `${yearCovered}-09-${String((i % 20) + 1).padStart(2, '0')}`,
    })
  ));

  // Why a farmer is inactive. Only farmers with one of these reasons are
  // listed on this page.
  const inactiveReasons = ['Deceased', 'Inactive', 'Waived from Farmer Association'];
  let records = [];
  const rebuildInactiveRecords = () => {
    if (hasDatabaseRecords) {
      allRecords.forEach((record) => {
        const status = record.status || (record.profileStatus === 'Inactive' ? 'Inactive' : 'Active');
        record.profileStatus = status === 'Active' ? 'Active' : 'Inactive';
        record.inactiveReason = status === 'Removed'
          ? inactiveReasons[2]
          : status === 'Deceased'
            ? inactiveReasons[0]
            : status === 'Inactive'
              ? record.inactiveReason || inactiveReasons[1]
              : '';
      });
    } else {
      allRecords.forEach((record, index) => {
        const reason = { 1: inactiveReasons[0], 3: inactiveReasons[1], 5: inactiveReasons[2] }[index % 6] || '';
        record.inactiveReason = reason;
        record.profileStatus = reason ? 'Inactive' : 'Active';
        record.inactiveDate = reason ? `${record.yearCovered}-10-${String((index % 9) + 1).padStart(2, '0')}` : '';
      });
    }

    records = allRecords.filter((record) => record.profileStatus === 'Inactive');
  };
  rebuildInactiveRecords();

  // ============================================================
  // Helpers and state
  // ============================================================
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (v) =>
    String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const body = $('#forReviewTableBody');
  const empty = $('#reviewTableState');
  const toast = new bootstrap.Toast($('#reviewToast'));
  const deleteModal = new bootstrap.Modal($('#deleteConfirmModal'));

  const geoLevels = ['region', 'province', 'district', 'municipality', 'barangay'];
  const geoSelectIds = {
    region: 'regionFilter',
    province: 'provinceFilter',
    district: 'districtFilter',
    municipality: 'municipalityFilter',
    barangay: 'barangayFilter',
  };
  const geoAllLabels = {
    region: 'All regions',
    province: 'All provinces',
    district: 'All districts',
    municipality: 'All municipalities',
    barangay: 'All barangays',
  };

  const state = {
    page: 1,
    perPage: 10,
    global: '',
    status: '',
    yearCovered: '',
    organization: '',
    region: '',
    province: '',
    district: '',
    municipality: '',
    barangay: '',
    columns: {},
    sort: null,
  };

  const reasonClass = (reason) =>
    ({
      Deceased: 'reason-deceased',
      Inactive: 'reason-inactive',
      'Waived from Farmer Association': 'reason-waived',
    })[reason] || 'reason-inactive';

  const reasonBadge = (r) => `<span class="reason-badge ${reasonClass(r.inactiveReason)}">${esc(r.inactiveReason)}</span>`;

  const date = (value) => {
    if (!value) return '—';
    const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
  };

  const notify = (title, message, blocked = false) => {
    $('#reviewToastTitle').textContent = title;
    $('#reviewToastMessage').textContent = message;
    $('#reviewToastTime').textContent = new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila', 
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
    $('#reviewToastIcon').className = `bi ${blocked ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2`;
    $('#reviewToast').classList.toggle('review-toast-blocked', blocked);
    toast.show();
  };

  // ============================================================
  // Cascading Region > Province > District > Municipality > Barangay filters
  // ============================================================
  const syncGeoFilters = () => {
    geoLevels.forEach((key, i) => {
      const parents = geoLevels.slice(0, i);
      const scope = records.filter((r) => parents.every((p) => !state[p] || r[p] === state[p]));
      const options = [...new Set(scope.map((r) => r[key]))].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      );
      if (state[key] && !options.includes(state[key])) state[key] = '';
      const select = $('#' + geoSelectIds[key]);
      select.replaceChildren(new Option(geoAllLabels[key], ''), ...options.map((o) => new Option(o, o)));
      select.value = state[key];
    });
  };

  // Year Covered and Farmer Association (FA) filters
  const fillSimpleFilters = () => {
    const fill = (id, key, allLabel, stateKey) => {
      const options = [...new Set(records.map((r) => String(r[key])))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      if (state[stateKey] && !options.includes(state[stateKey])) state[stateKey] = '';
      const select = $('#' + id);
      select.replaceChildren(new Option(allLabel, ''), ...options.map((o) => new Option(o, o)));
      select.value = state[stateKey];
    };
    fill('statusFilter', 'inactiveReason', 'All statuses', 'status');
    fill('yearCoveredFilter', 'yearCovered', 'All years', 'yearCovered');
    fill('organizationFilter', 'organization', 'All associations', 'organization');
  };

  // ============================================================
  // Filtering, sorting, pagination
  // ============================================================
  const filtered = () =>
    records.filter(
      (r) =>
        (!state.status || r.inactiveReason === state.status) &&
        (!state.yearCovered || String(r.yearCovered) === state.yearCovered) &&
        (!state.organization || r.organization === state.organization) &&
        geoLevels.every((k) => !state[k] || r[k] === state[k]) &&
        (!state.global || Object.values(r).join(' ').toLowerCase().includes(state.global)) &&
        Object.entries(state.columns).every(
          ([k, v]) => !v || String(r[k]).toLowerCase().includes(v.toLowerCase())
        )
    );

  const sorted = () => {
    const rows = filtered();
    if (!state.sort) return rows;
    const { key, dir } = state.sort;
    return [...rows].sort((a, b) => {
      const n = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true, sensitivity: 'base' });
      return dir === 'asc' ? n : -n;
    });
  };

  const pagination = (id, total, pages) => {
    const el = $('#' + id);
    const all = state.perPage === 'all';
    const start = total ? (all ? 1 : (state.page - 1) * state.perPage + 1) : 0;
    const end = all ? total : Math.min(state.page * state.perPage, total);
    const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
      (n) => pages <= 7 || n === 1 || n === pages || Math.abs(n - state.page) <= 1
    );
    const controls = all
      ? ''
      : `<button data-page="prev" ${state.page === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>${nums
          .map(
            (n, i) =>
              `${i && n - nums[i - 1] > 1 ? '<span>…</span>' : ''}<button data-page="${n}" class="${n === state.page ? 'active' : ''}">${n}</button>`
          )
          .join('')}<button data-page="next" ${state.page === pages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
    el.innerHTML = `<span>Showing ${start}–${end} of ${total} farmers</span><div class="pagination-controls"><label class="pagination-page-size" for="${id}Rows"><span>Rows per page</span><select class="form-select" id="${id}Rows" data-page-size><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="500">500</option><option value="1000">1000</option><option value="all">All</option></select></label>${controls}</div>`;
    $('[data-page-size]', el).value = state.perPage;
  };

  // ============================================================
  // Table rendering
  // ============================================================
  const rowHtml = (r) => {
    const farmerNumber = encodeURIComponent(r.farmerNumber || r.id);
    return `<tr>
      <td data-column="actions"><div class="table-row-actions">
<<<<<<< HEAD
        <a class="btn table-action-button view-action" href="../id/view-farmer/${farmerNumber}" target="_blank" rel="noopener" title="View farmer profile" aria-label="View farmer profile"><i class="bi bi-eye-fill"></i></a>
        <a class="btn table-action-button edit-action" href="../id/edit-farmer/${farmerNumber}" target="_blank" rel="noopener" title="Edit farmer profile" aria-label="Edit farmer profile"><i class="bi bi-pencil-fill"></i></a>
=======
        <a class="btn table-action-button view-action" href="../id/view-farmer/${id}" target="_blank" rel="noopener" title="View farmer profile" aria-label="View farmer profile"><i class="bi bi-eye-fill"></i></a>
        <a class="btn table-action-button edit-action" href="../id/edit-farmer/${id}" target="_blank" rel="noopener" title="Edit farmer profile" aria-label="Edit farmer profile"><i class="bi bi-pencil-fill"></i></a>
>>>>>>> 332963f28688daffde7d152b170d14b6d358c39e
        <button type="button" class="btn table-action-button delete-action" data-delete="${esc(r.id)}" title="Delete farmer profile" aria-label="Delete farmer profile"><i class="bi bi-trash-fill"></i></button>
      </div></td>
      <td data-column="inactiveReason">${reasonBadge(r)}</td>
      <td data-column="id">${esc(r.farmerNumber || r.id)}</td>
      <td data-column="region">${esc(r.region)}</td>
      <td data-column="province">${esc(r.province)}</td>
      <td data-column="district">${esc(r.district)}</td>
      <td data-column="municipality">${esc(r.municipality)}</td>
      <td data-column="barangay">${esc(r.barangay)}</td>
      <td data-column="lastName">${esc(r.lastName)}</td>
      <td data-column="firstName">${esc(r.firstName)}</td>
      <td data-column="middleName">${esc(r.middleName)}</td>
      <td data-column="suffix">${esc(r.suffix || '—')}</td>
      <td data-column="birthDate">${date(r.birthDate)}</td>
      <td data-column="sex">${esc(r.sex)}</td>
      <td data-column="organization">${esc(r.organization)}</td>
      <td data-column="role">${esc(r.role)}</td>
      <td data-column="civilStatus">${esc(r.civilStatus)}</td>
      <td data-column="nationality">${esc(r.nationality)}</td>
      <td data-column="placeOfBirth">${esc(r.placeOfBirth)}</td>
      <td data-column="sitio">${esc(r.sitio)}</td>
      <td data-column="fourPs">${esc(r.fourPs)}</td>
      <td data-column="pwd">${esc(r.pwd)}</td>
      <td data-column="indigenousGroup">${esc(r.indigenousGroup)}</td>
      <td data-column="tribeName">${esc(r.tribeName)}</td>
      <td data-column="dietaryRestriction">${esc(r.dietaryRestriction)}</td>
      <td data-column="seniorCitizen">${esc(r.seniorCitizen)}</td>
      <td data-column="yearCovered">${esc(r.yearCovered)}</td>
      <td data-column="registered">${date(r.registrationDate || r.registered || r.createdAt)}</td>
      <td data-column="inactiveDate">${date(r.inactiveDate)}</td>
    </tr>`;
  };

  const render = () => {
    const all = sorted();
    const pages = state.perPage === 'all' ? 1 : Math.max(1, Math.ceil(all.length / state.perPage));
    if (state.page > pages) state.page = 1;
    const rows =
      state.perPage === 'all'
        ? all
        : all.slice((state.page - 1) * state.perPage, state.page * state.perPage);

    body.innerHTML = rows.map(rowHtml).join('');
    empty.hidden = Boolean(rows.length);
    if (!rows.length)
      empty.innerHTML =
        '<i class="bi bi-search"></i><strong>No farmer profiles match the current filters.</strong>';

    $('#summaryTotalReview').textContent = all.length;
    $('#summaryRowsPerPage').textContent = state.perPage === 'all' ? 'All' : state.perPage;
    $('#summaryVisibleRows').textContent = rows.length;

    pagination('reviewPaginationTop', all.length, pages);
    pagination('reviewPaginationBottom', all.length, pages);

    $$('.sortable-column').forEach((h) => {
      const active = state.sort?.key === h.dataset.sort;
      h.querySelector('i').className = `bi ${
        active ? (state.sort.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'
      }`;
    });
  };

  const refresh = () => {
    state.page = 1;
    render();
  };

  // ============================================================
  // Filter events
  // ============================================================
  $('#reviewGlobalSearch').addEventListener('input', (e) => {
    state.global = e.target.value.trim().toLowerCase();
    refresh();
  });
  $('#statusFilter').addEventListener('change', (e) => {
    state.status = e.target.value;
    refresh();
  });
  $('#yearCoveredFilter').addEventListener('change', (e) => {
    state.yearCovered = e.target.value;
    refresh();
  });
  $('#organizationFilter').addEventListener('change', (e) => {
    state.organization = e.target.value;
    refresh();
  });
  geoLevels.forEach((key) =>
    $('#' + geoSelectIds[key]).addEventListener('change', (e) => {
      state[key] = e.target.value;
      syncGeoFilters();
      refresh();
    })
  );
  $$('.column-filter').forEach((el) =>
    el.addEventListener('input', (e) => {
      state.columns[e.target.dataset.column] = e.target.value;
      refresh();
    })
  );

  const resetFilters = () => {
    state.global = '';
    state.status = '';
    state.yearCovered = '';
    state.organization = '';
    geoLevels.forEach((k) => (state[k] = ''));
    state.columns = {};
    $('#reviewGlobalSearch').value = '';
    $$('.column-filter').forEach((e) => (e.value = ''));
    fillSimpleFilters();
    syncGeoFilters();
  };

  $('#clearReviewFilters').addEventListener('click', () => {
    resetFilters();
    refresh();
  });

  $$('.sortable-column').forEach((h) =>
    h.addEventListener('click', () => {
      state.sort =
        state.sort?.key === h.dataset.sort
          ? { key: h.dataset.sort, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
          : { key: h.dataset.sort, dir: 'asc' };
      refresh();
    })
  );

  $$('#reviewPaginationTop,#reviewPaginationBottom').forEach((el) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      const pages = state.perPage === 'all' ? 1 : Math.max(1, Math.ceil(sorted().length / state.perPage));
      state.page =
        b.dataset.page === 'prev'
          ? Math.max(1, state.page - 1)
          : b.dataset.page === 'next'
            ? Math.min(pages, state.page + 1)
            : Number(b.dataset.page);
      render();
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-page-size]')) {
        state.perPage = e.target.value === 'all' ? 'all' : Number(e.target.value);
        refresh();
      }
    });
  });

  // ============================================================
  // Refresh: reset filters, sorting and paging, then redraw the table
  // ============================================================
  $('#refreshReviewTable').addEventListener('click', async () => {
    const icon = $('#refreshReviewTable i');
    icon.classList.add('spin');
    setTimeout(() => icon.classList.remove('spin'), 700);
    try {
      if (hasDatabaseRecords) {
        await window.TmisStore.refresh();
        allRecords = window.TmisStore.records('tmis-farmers');
        rebuildInactiveRecords();
      }
      resetFilters();
      state.sort = null;
      state.perPage = 10;
      refresh();
      notify('Farmer Profiles Refreshed', `Table reloaded with ${records.length} farmer profiles.`);
    } catch (error) {
      notify('Refresh Failed', error.message || 'The farmer list could not be refreshed.', true);
    }
  });

  // ============================================================
  // Export: every field of every farmer, regardless of filters or hidden columns
  // ============================================================
  $('#exportReviewTable').addEventListener('click', () => {
    if (!window.XLSX) {
      notify('Export Unavailable', 'The Excel library could not be loaded. Check your connection and try again.', true);
      return;
    }
    const exportColumns = [
      ['Farmer ID', 'id'],
      ['Inactive Reason', 'inactiveReason'],
      ['Date Inactive', 'inactiveDate'],
      ['Region', 'region'],
      ['Province', 'province'],
      ['District', 'district'],
      ['Municipality', 'municipality'],
      ['Barangay', 'barangay'],
      ['Sitio / Purok', 'sitio'],
      ['Last Name', 'lastName'],
      ['First Name', 'firstName'],
      ['Middle Name', 'middleName'],
      ['Extension', 'suffix'],
      ['Date of Birth', 'birthDate'],
      ['Place of Birth', 'placeOfBirth'],
      ['Sex', 'sex'],
      ['Civil Status', 'civilStatus'],
      ['Nationality', 'nationality'],
      ['Farmer Organization', 'organization'],
      ['Farmer Role', 'role'],
      ['4Ps', 'fourPs'],
      ['PWD', 'pwd'],
      ['Senior Citizen', 'seniorCitizen'],
      ['Indigenous Group', 'indigenousGroup'],
      ['Tribe Name', 'tribeName'],
      ['Dietary Restriction', 'dietaryRestriction'],
      ['Year Covered', 'yearCovered'],
      ['Registration Date', 'registered'],
    ];
    const rows = records.map((r) => Object.fromEntries(exportColumns.map(([label, key]) => [label, r[key]])));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: exportColumns.map(([label]) => label) });
    sheet['!cols'] = exportColumns.map(([label]) => ({ wch: Math.max(14, label.length + 4) }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Inactive');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(book, `inactive_farmers_${stamp}.xlsx`);
    notify('Export Complete', `${rows.length} farmer profiles exported to Excel.`);
  });

  // ============================================================
  // Show / hide columns (switches apply immediately)
  // ============================================================
  const columnFilterToggle = $('#columnFilterToggle');
  const columnFilterPanel = $('#columnFilterPanel');
  const columnToggles = $$('.column-toggle');
  const columnKeys = columnToggles.map((t) => t.dataset.column);

  const defaultColumns = [
    'actions', 'inactiveReason', 'id', 'region', 'province', 'district', 'municipality',
    'barangay', 'lastName', 'firstName', 'middleName', 'suffix', 'birthDate', 'sex',
  ];
  const visibleColumns = new Set(defaultColumns);

  // One stylesheet hides columns, so they stay hidden after every re-render.
  const columnStyle = document.createElement('style');
  document.head.appendChild(columnStyle);

  const applyColumnVisibility = () => {
    columnStyle.textContent = columnKeys
      .filter((key) => !visibleColumns.has(key))
      .map((key) => `#forReviewDataTable [data-column="${key}"] { display: none !important; }`)
      .join('\n');
    columnToggles.forEach((t) => (t.checked = visibleColumns.has(t.dataset.column)));
  };

  const setPanel = (open) => {
    columnFilterPanel.style.display = open ? 'block' : 'none';
    columnFilterToggle.classList.toggle('active', open);
    columnFilterToggle.setAttribute('aria-expanded', String(open));
  };

  columnFilterToggle.addEventListener('click', () => setPanel(columnFilterPanel.style.display === 'none'));
  $('#closeColumnFilter').addEventListener('click', () => setPanel(false));
  $('#applyColumnFilter').addEventListener('click', () => setPanel(false));

  columnToggles.forEach((toggle) =>
    toggle.addEventListener('change', () => {
      const key = toggle.dataset.column;
      if (toggle.checked) visibleColumns.add(key);
      else {
        visibleColumns.delete(key);
        const input = $(`.column-filter[data-column="${key}"]`);
        if (input && input.value) {
          input.value = '';
          delete state.columns[key];
          refresh();
        }
      }
      applyColumnVisibility();
    })
  );

  $('#showAllColumns').addEventListener('click', () => {
    columnKeys.forEach((k) => visibleColumns.add(k));
    applyColumnVisibility();
  });
  $('#resetColumns').addEventListener('click', () => {
    visibleColumns.clear();
    defaultColumns.forEach((k) => visibleColumns.add(k));
    applyColumnVisibility();
  });

  // ============================================================
  // Delete (confirmation modal with the farmer's basic information)
  // ============================================================
  let pendingDeleteId = null;

  body.addEventListener('click', (e) => {
    const button = e.target.closest('.delete-action');
    if (!button) return;
    const farmer = records.find((r) => r.id === button.dataset.delete);
    if (!farmer) return;
    pendingDeleteId = farmer.id;
    $('#deleteFarmerId').textContent = farmer.id;
    $('#deleteFarmerName').textContent = [`${farmer.lastName},`, farmer.firstName, farmer.middleName, farmer.suffix]
      .filter(Boolean)
      .join(' ');
    $('#deleteFarmerReason').textContent = farmer.inactiveReason;
    $('#deleteFarmerProvince').textContent = farmer.province;
    $('#deleteFarmerMunicipality').textContent = farmer.municipality;
    $('#deleteFarmerBarangay').textContent = farmer.barangay;
    deleteModal.show();
  });

  $('#confirmDeleteButton').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    const index = records.findIndex((r) => r.id === pendingDeleteId);
    if (index > -1) {
      try{window.TmisStore.publish(await window.TmisStore.request('/ui/sync',{key:'tmis-farmers',upserts:[],deletes:[pendingDeleteId]}));}
      catch(error){notify('Deletion blocked',error.message);return;}
      records.splice(index, 1);
      fillSimpleFilters();
      syncGeoFilters();
      render();
      notify('Farmer Profile Deleted', 'The farmer profile has been deleted successfully.');
    }
    pendingDeleteId = null;
    deleteModal.hide();
  });

  $('#deleteConfirmModal').addEventListener('hidden.bs.modal', () => {
    pendingDeleteId = null;
  });

  // ============================================================
  // Init
  // ============================================================
  applyColumnVisibility();
  fillSimpleFilters();
  syncGeoFilters();
  render();
});
