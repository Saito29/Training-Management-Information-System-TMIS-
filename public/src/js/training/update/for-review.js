document.addEventListener('DOMContentLoaded', () => {
  const $ = (s, c = document) => c.querySelector(s),
    $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]
    );
  const trainingTitleSegment = title => String(title || 'training')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'training';

  /* ------------------------------------------------------------------
     Reference data (mock). Province → Municipality → Barangay hierarchy
     drives the synced location filters.
  ------------------------------------------------------------------ */
  const SAMPLE_LOCATIONS = [
    {
      region: 'Region IV-A (CALABARZON)',
      province: 'Quezon',
      municipalities: [
        {
          name: 'Alabat',
          district: '2nd District',
          barangays: ['Villa Esperanza', 'Villa Norte', 'Caglate'],
        },
        {
          name: 'Perez',
          district: '2nd District',
          barangays: ['Villamanzano Sur', 'Villamanzano Norte'],
        },
        {
          name: 'Jomalig',
          district: '1st District',
          barangays: ['Apad', 'Bukal'],
        },
        {
          name: 'Patnanungan',
          district: '1st District',
          barangays: ['Amaga', 'Busdak'],
        },
      ],
    },
    {
      region: 'Region V (Bicol Region)',
      province: 'Camarines Norte',
      municipalities: [
        {
          name: 'Daet',
          district: '1st District',
          barangays: ['Lag-on', 'Mancruz'],
        },
        {
          name: 'Labo',
          district: '2nd District',
          barangays: ['Anahaw', 'Dumagmang'],
        },
      ],
    },
    {
      region: 'Region VIII (Eastern Visayas)',
      province: 'Eastern Samar',
      municipalities: [
        {
          name: 'Borongan City',
          district: 'Lone District',
          barangays: ['Songco', 'Maypangdan'],
        },
        {
          name: 'Guiuan',
          district: 'Lone District',
          barangays: ['Sulangan', 'Bungtod'],
        },
      ],
    },
  ];
  const registrationData = window.TMIS_PAGE?.registration;
  const databaseLocations = Array.isArray(registrationData?.locations) ? registrationData.locations : [];
  const databaseRegions = Array.isArray(window.TMIS_PAGE?.regions) ? window.TMIS_PAGE.regions : (registrationData?.regions || []);
  const regionNames = new Map(databaseRegions.map(region => [String(region.region_id ?? region.id), region.name]));
  const locationById = new Map(databaseLocations.map(location => [String(location.id), location]));
  const ancestorName = (location, kind) => {
    let parent = locationById.get(String(location.parent_id ?? ''));
    while (parent) {
      if (String(parent.kind).toLowerCase() === kind) return parent.name;
      parent = locationById.get(String(parent.parent_id ?? ''));
    }
    return '';
  };
  const databasePlaces = databaseLocations.filter(location => String(location.kind).toLowerCase() === 'barangay').map(location => ({
    region: regionNames.get(String(location.region_id)) || '',
    regionId: String(location.region_id ?? ''),
    province: ancestorName(location, 'province'),
    district: ancestorName(location, 'district'),
    municipality: ancestorName(location, 'municipality'),
    barangay: location.name,
  })).filter(location => location.province && location.municipality && location.barangay);
  const places = window.TMIS_PAGE
    ? databasePlaces
    : SAMPLE_LOCATIONS.flatMap(region => region.municipalities.flatMap(municipality => municipality.barangays.map(barangay => ({
      region: region.region,
      regionId: '',
      province: region.province,
      district: municipality.district,
      municipality: municipality.name,
      barangay,
    }))));
  const TYPES = {
    'Farmer Field School': [
      'Rice Farmer Field School',
      'Coconut Farmer Field School',
      'Vegetable Production Field School',
    ],
    'Technical Skills Training': [
      'Organic Fertilizer Production',
      'Post-Harvest Handling and Processing',
      'Farm Machinery Operation and Maintenance',
    ],
    'Livelihood Training': [
      'Coco Sugar Processing',
      'Backyard Poultry Raising',
      'Value-Adding for Fishery Products',
    ],
    'Cooperative Management Training': [
      'Cooperative Financial Management',
      'Association Leadership and Governance',
    ],
    'Seminar / Workshop': [
      'Climate-Smart Agriculture Orientation',
      'Agri-Entrepreneurship Workshop',
    ],
  };
  const databaseTrainingTypes = Array.isArray(registrationData?.options?.training_type)
    ? registrationData.options.training_type.map(option => String(option.value || '')).filter(Boolean)
    : [];
  const typeNames = window.TMIS_PAGE ? [...new Set(databaseTrainingTypes)] : Object.keys(TYPES);
  // This page only lists trainings still in review or sent back (rejected).
  const REVIEW_STATUSES = ['For Review', 'Rejected'];
  const OFFICES = [
    'DA-SAAD Regional Office',
    'Provincial Agriculture Office',
    'Municipal Agriculture Office',
    'DA Regional Field Office',
  ];
  const MODES = ['In-person', 'Online', 'Blended'];
  const TARGETS = [
    'Farmers',
    'Farmer Organization Officers',
    'Women Farmers',
    'Youth Farmers',
    'Agricultural Extension Workers',
  ];
  const VENUES = [
    'Barangay Hall',
    'Multi-Purpose Hall',
    'Farmers Training Center',
    'Municipal Agriculture Office Hall',
    'Covered Court',
  ];
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const addDays = (iso, days) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  let records = (window.TMIS_PAGE ? window.TmisStore.records('tmis-trainings').filter(item => REVIEW_STATUSES.includes(item.status)) : []);
  for (let n = 1; !window.TMIS_PAGE && n <= 48; n++) {
    const year = 2024 + (n % 3),
      id = `TRN-${year}-${pad(n, 3)}`,
      place = places[n % places.length],
      type = typeNames[n % typeNames.length],
      titles = TYPES[type],
      mode = MODES[n % MODES.length],
      start = `${year}-${pad((n % 12) + 1)}-${pad((n % 24) + 1)}`,
      venue = VENUES[n % VENUES.length];
    records.push({
      status:
        n % 9 === 0
          ? 'Rejected'
          : n % 4 === 0
            ? 'For Approval'
            : n % 7 === 0
              ? 'Approved'
              : 'For Review',
      id,
      title: titles[n % titles.length],
      office: OFFICES[n % OFFICES.length],
      type,
      startDate: start,
      endDate: addDays(start, (n % 3) + 1),
      venue,
      location: `${place.barangay}, ${place.municipality}, ${place.province}`,
      region: place.region,
      district: place.district,
      province: place.province,
      municipality: place.municipality,
      barangay: place.barangay,
      deliveryMode: mode,
      targetParticipants: `${TARGETS[n % TARGETS.length]} (${20 + (n % 5) * 10})`,
      encoded: addDays(start, -(10 + (n % 9))),
      yearCovered: year,
      // Mock: every 5th training has no training design on file yet.
      designFile:
        n % 5 === 0 ? '' : `${id}_training-design.${n % 2 ? 'pdf' : 'docx'}`,
      remarks: n % 9 === 0 ? 'Training design needs revision.' : '',
    });
  }

  /* ------------------------------------------------------------------
     Table columns (Actions is fixed and always first)
  ------------------------------------------------------------------ */
  const COLUMNS = [
    { key: 'status', label: 'Status', badge: true },
    { key: 'id', label: 'Training ID' },
    { key: 'title', label: 'Training Title' },
    { key: 'office', label: 'Implementing Office' },
    { key: 'type', label: 'Training Type' },
    { key: 'startDate', label: 'Start Date', date: true },
    { key: 'endDate', label: 'End Date', date: true },
    { key: 'venue', label: 'Venue' },
    { key: 'location', label: 'Location' },
    { key: 'region', label: 'Region' },
    { key: 'district', label: 'District' },
    { key: 'province', label: 'Province' },
    { key: 'municipality', label: 'Municipality' },
    { key: 'barangay', label: 'Barangay' },
    { key: 'deliveryMode', label: 'Delivery Mode' },
    { key: 'targetParticipants', label: 'Target Participants' },
    { key: 'encoded', label: 'Date Encoded', date: true },
  ];

  // Everything about a training goes to Excel, regardless of hidden columns.
  const EXPORT_COLUMNS = [
    ['id', 'Training ID'],
    ['title', 'Training Title'],
    ['office', 'Implementing Office'],
    ['type', 'Training Type'],
    ['status', 'Status'],
    ['startDate', 'Start Date'],
    ['endDate', 'End Date'],
    ['venue', 'Venue'],
    ['location', 'Location'],
    ['region', 'Region'],
    ['district', 'District'],
    ['province', 'Province'],
    ['municipality', 'Municipality'],
    ['barangay', 'Barangay'],
    ['deliveryMode', 'Delivery Mode'],
    ['targetParticipants', 'Target Participants'],
    ['encoded', 'Date Encoded'],
    ['yearCovered', 'Year Covered'],
    ['designFile', 'Training Design File'],
    ['remarks', 'Rejection Remarks'],
  ];

  const body = $('#forReviewTableBody'),
    empty = $('#reviewTableState'),
    table = $('#forReviewDataTable'),
    toast = new bootstrap.Toast($('#reviewToast')),
    approveModal = new bootstrap.Modal($('#reviewForwardModal')),
    rejectModal = new bootstrap.Modal($('#rejectTrainingModal')),
    permanentlyDeleteModal = new bootstrap.Modal($('#permanentlyDeleteTrainingModal'));
  const state = {
    page: 1,
    perPage: 10,
    global: '',
    status: 'For Review',
    type: '',
    region: '',
    province: '',
    municipality: '',
    barangay: '',
    year: '',
    columns: {},
    hidden: new Set(),
    sort: null,
    selected: null,
  };

  const statusBadgeClass = (status) =>
    ({
      'For Review': 'status-review',
      'For Approval': 'status-approval',
      Approved: 'status-approved',
      Rejected: 'status-inactive',
    })[status] || 'status-neutral';
  const fmtDate = (v) => {
    const d = new Date(`${v}T00:00:00`);
    return isNaN(d)
      ? v
      : new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila', 
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(d);
  };
  const notify = (title, message, type = 'success') => {
    const toastType = typeof type === 'boolean' ? (type ? 'warning' : 'success') : type;
    $('#reviewToastTitle').textContent = title;
    $('#reviewToastMessage').textContent = message;
    $('#reviewToastTime').textContent = new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    }).format(new Date());
    $('#reviewToast').dataset.type = toastType;
    $('#reviewToastIcon').className = `bi me-2 ${({ success: 'bi-check-circle-fill', warning: 'bi-exclamation-triangle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' })[toastType] || 'bi-check-circle-fill'}`;
    $('#reviewToast').classList.toggle('review-toast-blocked', toastType === 'warning' || toastType === 'error');
    toast.show();
  };
  const statusToastStorageKey = 'tmis-training-status-transition-toast';
  const showStoredStatusToast = () => {
    try {
      const saved = sessionStorage.getItem(statusToastStorageKey);
      if (!saved) return;
      sessionStorage.removeItem(statusToastStorageKey);
      const notice = JSON.parse(saved);
      notify(notice.title, notice.message, notice.type || 'success');
    } catch (_) { /* Storage may be disabled by the browser. */ }
  };
  const reloadWithStatusToast = (title, message, type = 'success') => {
    try { sessionStorage.setItem(statusToastStorageKey, JSON.stringify({ title, message, type })); }
    catch (_) {
      notify(title, message, type);
      window.setTimeout(() => location.reload(), 3200);
      return;
    }
    location.reload();
  };
  showStoredStatusToast();

  /* ------------------------------------------------------------------
     Header / footer / column toggle (built once; columns hide via class)
  ------------------------------------------------------------------ */
  $('#reviewHeadRow').innerHTML =
    '<th>Actions</th>' +
    COLUMNS.map(
      (c) =>
        `<th class="sortable-column" data-col="${c.key}" data-sort="${c.key}">${esc(c.label)} <i class="bi bi-arrow-down-up"></i></th>`
    ).join('');
  $('#reviewFootRow').innerHTML =
    '<th></th>' +
    COLUMNS.map(
      (c) =>
        `<th data-col="${c.key}"><input class="form-control form-control-sm column-filter" data-column="${c.key}" type="${c.date ? 'date' : 'search'}" ${c.date ? '' : 'placeholder="Search"'} aria-label="Filter ${esc(c.label)}" /></th>`
    ).join('');

  const toggleMenu = $('#columnToggleMenu');
  toggleMenu.innerHTML = `<div class="column-toggle-head"><strong>Show / hide columns</strong><button type="button" data-col-action="all">Show all</button></div><div class="column-toggle-list">${COLUMNS.map(
    (c) =>
      `<label class="column-toggle-item"><input class="form-check-input" type="checkbox" data-col-toggle="${c.key}" checked /><span>${esc(c.label)}</span></label>`
  ).join('')}</div>`;
  const applyColumns = () =>
    $$('[data-col]', table).forEach((el) =>
      el.classList.toggle('col-hidden', state.hidden.has(el.dataset.col))
    );
  toggleMenu.addEventListener('change', (e) => {
    const k = e.target.dataset.colToggle;
    if (!k) return;
    e.target.checked ? state.hidden.delete(k) : state.hidden.add(k);
    applyColumns();
  });
  toggleMenu.addEventListener('click', (e) => {
    if (e.target.closest('[data-col-action="all"]')) {
      state.hidden.clear();
      $$('[data-col-toggle]', toggleMenu).forEach((i) => (i.checked = true));
      applyColumns();
    }
  });

  /* ------------------------------------------------------------------
     Filters (Province → Municipality → Barangay stay in sync)
  ------------------------------------------------------------------ */
  const uniq = (arr) =>
    [...new Set(arr)].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );
  const setOptions = (sel, placeholder, items, value) => {
    const el = $(sel);
    el.replaceChildren(
      new Option(placeholder, ''),
      ...items.map((i) => new Option(i, i))
    );
    el.value = items.includes(value) ? value : '';
  };
  const syncLocationFilters = () => {
    const inRegion = places.filter(
      (place) => !state.region || place.region === state.region
    );
    const inProvince = inRegion.filter(
      (p) => !state.province || p.province === state.province
    );
    const inMunicipality = inProvince.filter(
      (p) => !state.municipality || p.municipality === state.municipality
    );
    setOptions(
      '#provinceFilter',
      'All provinces',
      uniq(inRegion.map((p) => p.province)),
      state.province
    );
    setOptions(
      '#municipalityFilter',
      'All municipalities',
      uniq(inProvince.map((p) => p.municipality)),
      state.municipality
    );
    setOptions(
      '#barangayFilter',
      'All barangays',
      uniq(inMunicipality.map((p) => p.barangay)),
      state.barangay
    );
  };
  setOptions(
    '#statusFilter',
    'All statuses',
    REVIEW_STATUSES,
    state.status
  );
  setOptions('#trainingTypeFilter', 'All training types', typeNames, '');
  const canFilterByRegion = window.TMIS_PAGE?.administrator === true;
  $('#regionFilterGroup').hidden = !canFilterByRegion;
  setOptions('#regionFilter', 'All regions', uniq(databaseRegions.map(region => region.name).filter(Boolean)), state.region);
  setOptions(
    '#yearCoveredFilter',
    'All years',
    uniq(records.map((r) => String(r.yearCovered))),
    ''
  );
  syncLocationFilters();

  const matchesLocationFilters = (record) => {
    const selected = state.region || state.province || state.municipality || state.barangay;
    if (!selected) return true;
    const locationRecords = [
      { region: record.region, province: record.province, municipality: record.municipality, barangay: record.barangay },
      ...(Array.isArray(record.trainingLocations) ? record.trainingLocations : []),
    ];

    return locationRecords.some(location =>
      (!state.region || location.region === state.region)
      && (!state.province || location.province === state.province)
      && (!state.municipality || location.municipality === state.municipality)
      && (!state.barangay || location.barangay === state.barangay)
    );
  };
  const filtered = () =>
    records.filter(
      (r) =>
        REVIEW_STATUSES.includes(r.status) &&
        (!state.status || r.status === state.status) &&
        (!state.global ||
          Object.values(r).join(' ').toLowerCase().includes(state.global)) &&
        (!state.type || r.type === state.type) &&
        matchesLocationFilters(r) &&
        (!state.year || String(r.yearCovered) === state.year) &&
        Object.entries(state.columns).every(
          ([k, v]) => !v || String(r[k]).toLowerCase().includes(v.toLowerCase())
        )
    );
  const sorted = () => {
    const rows = filtered();
    if (!state.sort) return rows;
    const { key, dir } = state.sort;
    return [...rows].sort((a, b) => {
      const n = String(a[key]).localeCompare(String(b[key]), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return dir === 'asc' ? n : -n;
    });
  };

  /* ------------------------------------------------------------------
     Rendering
  ------------------------------------------------------------------ */
  const pagination = (id, total, pages) => {
    const el = $('#' + id),
      all = state.perPage === 'all',
      start = total ? (all ? 1 : (state.page - 1) * state.perPage + 1) : 0,
      end = all ? total : Math.min(state.page * state.perPage, total);
    const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
      (n) =>
        pages <= 7 || n === 1 || n === pages || Math.abs(n - state.page) <= 1
    );
    const controls = all
      ? ''
      : `<button data-page="prev" ${state.page === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>${nums.map((n, i) => `${i && n - nums[i - 1] > 1 ? '<span>…</span>' : ''}<button data-page="${n}" class="${n === state.page ? 'active' : ''}">${n}</button>`).join('')}<button data-page="next" ${state.page === pages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
    el.innerHTML = `<span>Showing ${start}–${end} of ${total} trainings</span><div class="pagination-controls"><label class="visually-hidden" for="${id}Rows">Rows per page</label><select id="${id}Rows" data-page-size><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="500">500</option><option value="1000">1000</option><option value="all">All</option></select>${controls}</div>`;
    $('[data-page-size]', el).value = state.perPage;
  };
  const cell = (c, r) => {
    const v = r[c.key];
    const html = c.badge
      ? `<span class="status-badge ${statusBadgeClass(v)}">${esc(v)}</span>`
      : esc(c.date ? fmtDate(v) : v);
    return `<td data-col="${c.key}">${html}</td>`;
  };
  const actions = (r) => {
    const id = esc(r.id),
      q = encodeURIComponent(r.id);
    const inReview = r.status === 'For Review';
    const isRejected = r.status === 'Rejected';
    const canRestore = !window.TMIS_PAGE || window.TmisStore.can('trainings.submit');
    const canDeletePermanently = !window.TMIS_PAGE || window.TMIS_PAGE.administrator === true;
    return `<td><div class="table-row-actions">${inReview ? `<button type="button" class="btn table-action-button forward-action" data-approve="${id}" title="Review and submit for approval" aria-label="Submit ${id} for approval"><i class="bi bi-send-fill"></i></button>` : ''}<a class="btn table-action-button view-action" href="../id/view-training/${trainingTitleSegment(r.title || r.training_title)}/${q}" target="_blank" rel="noopener" title="View training (opens in a new tab)" aria-label="View ${id}"><i class="bi bi-eye-fill"></i></a>${inReview ? `<a class="btn table-action-button edit-action" href="../id/edit-training/${q}" target="_blank" rel="noopener" title="Edit training (opens in a new tab)" aria-label="Edit ${id}"><i class="bi bi-pencil-fill"></i></a><button type="button" class="btn table-action-button reject-action" data-reject="${id}" title="Reject training" aria-label="Reject ${id}"><i class="bi bi-x-circle-fill"></i></button>` : ''}${isRejected && canRestore ? `<button type="button" class="btn table-action-button restore-action" data-restore-rejected="${id}" title="Restore to For Review" aria-label="Restore ${id} to For Review"><i class="bi bi-arrow-counterclockwise"></i></button>` : ''}${isRejected && canDeletePermanently ? `<button type="button" class="btn table-action-button delete-action" data-permanently-delete="${id}" title="Delete training permanently" aria-label="Delete ${id} permanently"><i class="bi bi-trash3-fill"></i></button>` : ''}</div></td>`;
  };
  const render = () => {
    const all = sorted(),
      pages =
        state.perPage === 'all'
          ? 1
          : Math.max(1, Math.ceil(all.length / state.perPage));
    if (state.page > pages) state.page = 1;
    const rows =
      state.perPage === 'all'
        ? all
        : all.slice(
            (state.page - 1) * state.perPage,
            state.page * state.perPage
          );
    body.innerHTML = rows
      .map((r) => `<tr>${actions(r)}${COLUMNS.map((c) => cell(c, r)).join('')}</tr>`)
      .join('');
    applyColumns();
    empty.hidden = Boolean(rows.length);
    if (!rows.length)
      empty.innerHTML =
        '<i class="bi bi-search"></i><strong>No trainings match the current filters.</strong>';
    $('#summaryTotalReview').textContent = all.length;
    $('#summaryRowsPerPage').textContent = state.perPage;
    $('#summaryVisibleRows').textContent = rows.length;
    pagination('reviewPaginationTop', all.length, pages);
    pagination('reviewPaginationBottom', all.length, pages);
    $$('.sortable-column').forEach((h) => {
      const active = state.sort?.key === h.dataset.sort;
      h.classList.toggle('is-sorted', active);
      h.querySelector('i').className =
        `bi ${active ? (state.sort.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'}`;
    });
  };
  const refresh = () => {
    state.page = 1;
    render();
  };

  /* ------------------------------------------------------------------
     Filter / sort / pagination events
  ------------------------------------------------------------------ */
  $('#reviewGlobalSearch').addEventListener('input', (e) => {
    state.global = e.target.value.toLowerCase();
    refresh();
  });
  $('#statusFilter').addEventListener('change', (e) => {
    state.status = e.target.value;
    refresh();
  });
  $('#trainingTypeFilter').addEventListener('change', (e) => {
    state.type = e.target.value;
    refresh();
  });
  $('#regionFilter').addEventListener('change', (e) => {
    state.region = e.target.value;
    state.province = state.municipality = state.barangay = '';
    syncLocationFilters();
    refresh();
  });
  $('#yearCoveredFilter').addEventListener('change', (e) => {
    state.year = e.target.value;
    refresh();
  });
  $('#provinceFilter').addEventListener('change', (e) => {
    state.province = e.target.value;
    state.municipality = state.barangay = '';
    syncLocationFilters();
    refresh();
  });
  $('#municipalityFilter').addEventListener('change', (e) => {
    state.municipality = e.target.value;
    state.barangay = '';
    if (state.municipality && !state.province) {
      const match = places.find(
        (p) => p.municipality === state.municipality
      );
      if (match) {
        state.province = match.province;
        if (canFilterByRegion) state.region = match.region;
      }
    }
    syncLocationFilters();
    refresh();
  });
  $('#barangayFilter').addEventListener('change', (e) => {
    state.barangay = e.target.value;
    if (state.barangay) {
      const match = places.find(
        (p) =>
          p.barangay === state.barangay &&
          (!state.municipality || p.municipality === state.municipality) &&
          (!state.province || p.province === state.province) &&
          (!state.region || p.region === state.region)
      );
      if (match) {
        state.municipality = match.municipality;
        state.province = match.province;
        if (canFilterByRegion) state.region = match.region;
      }
    }
    syncLocationFilters();
    refresh();
  });
  $('#reviewFootRow').addEventListener('input', (e) => {
    const col = e.target.dataset.column;
    if (!col) return;
    state.columns[col] = e.target.value;
    refresh();
  });
  $('#clearReviewFilters').addEventListener('click', () => {
    state.global = state.type = state.region = state.province = state.municipality = '';
    $('#regionFilter').value = '';
    state.status = 'For Review';
    $('#statusFilter').value = 'For Review';
    state.barangay = state.year = '';
    state.columns = {};
    $('#reviewGlobalSearch').value = '';
    $('#trainingTypeFilter').value = '';
    $('#yearCoveredFilter').value = '';
    $$('.column-filter').forEach((e) => (e.value = ''));
    syncLocationFilters();
    refresh();
  });
  $('#reviewHeadRow').addEventListener('click', (e) => {
    const h = e.target.closest('.sortable-column');
    if (!h) return;
    state.sort =
      state.sort?.key === h.dataset.sort
        ? { key: h.dataset.sort, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key: h.dataset.sort, dir: 'asc' };
    refresh();
  });
  $$('#reviewPaginationTop,#reviewPaginationBottom').forEach((el) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      const pages =
        state.perPage === 'all'
          ? 1
          : Math.max(1, Math.ceil(sorted().length / state.perPage));
      state.page =
        b.dataset.page === 'prev'
          ? state.page - 1
          : b.dataset.page === 'next'
            ? Math.min(pages, state.page + 1)
            : Number(b.dataset.page);
      render();
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-page-size]')) {
        state.perPage =
          e.target.value === 'all' ? 'all' : Number(e.target.value);
        refresh();
      }
    });
  });

  /* ------------------------------------------------------------------
     Submit for approval (blocked unless a training design is on file)
  ------------------------------------------------------------------ */
  const confirmApprove = $('#confirmForwardButton');
  const renderApprovalRequirements = (items) => {
    const checks = items.flatMap(training => window.TmisWorkflowReadiness.approvalRequirements(training).map(check => ({
      ...check,
      label: items.length > 1 ? `${training.id} · ${check.label}` : check.label,
    })));
    window.TmisWorkflowReadiness.renderRequirements($('#designRequirement'), checks);
    const isReady = checks.length > 0 && checks.every(check => check.passed);
    confirmApprove.disabled = !isReady;

    return isReady;
  };

  const detailRows = (pairs) =>
    pairs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('');
  const findRecord = (id) => records.find((r) => r.id === id);
  const trainingSummary = (record) => {
    const location = [record.office || record.implementingOffice, record.region].filter(Boolean).join(' · ');
    return `${record.id} · ${record.title || record.training_title || 'Untitled training'}${location ? ` · ${location}` : ''}`;
  };
  let pendingPermanentDelete = null;

  body.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-approve]'),
      rj = e.target.closest('[data-reject]'),
      restore = e.target.closest('[data-restore-rejected]'),
      permanentlyDelete = e.target.closest('[data-permanently-delete]');
    if (restore) {
      const record = findRecord(restore.dataset.restoreRejected);
      if (!record) {
        notify('Training unavailable', 'Refresh the list and select a rejected training to restore.', 'warning');
        return;
      }
      restore.disabled = true;
      notify('Restoring training', `${trainingSummary(record)}. Requested status change: Rejected → For Review.`, 'info');
      try {
        if (window.TMIS_PAGE) {
          await window.TmisStore.request(`/operations/trainings/${Number(record._db_id)}/restore-rejected`, { version: Number(record.version) });
          reloadWithStatusToast('Training restored', `${trainingSummary(record)}. Status changed: Rejected → For Review.`);
          return;
        }
        const latest = window.TmisStore.records('tmis-trainings');
        await window.TmisStore.setItem('tmis-trainings', JSON.stringify(latest.map(item => item.id === record.id ? { ...item, status: 'For Review', statusRemarks: '' } : item)));
        record.status = 'For Review';
        refresh();
        notify('Training restored', `${trainingSummary(record)}. Status changed: Rejected → For Review.`, 'success');
      } catch (error) {
        notify('Restore failed', `${trainingSummary(record)}. No status change was saved. ${error.message || 'The rejected training could not be restored.'}`, 'error');
      } finally { restore.disabled = false; }
      return;
    }
    if (permanentlyDelete) {
      pendingPermanentDelete = findRecord(permanentlyDelete.dataset.permanentlyDelete);
      if (!pendingPermanentDelete) return;
      $('#permanentlyDeleteTrainingDetails').innerHTML = detailRows([
        ['Training ID', esc(pendingPermanentDelete.id)],
        ['Training Title', esc(pendingPermanentDelete.title || pendingPermanentDelete.training_title)],
        ['Status', '<span class="status-badge status-inactive">Rejected</span>'],
      ]);
      permanentlyDeleteModal.show();
      return;
    }
    if (a) {
      const r = (state.selected = findRecord(a.dataset.approve));
      $('#reviewForwardDetails').innerHTML = detailRows(window.TmisWorkflowReadiness.trainingDetails(r)
        .map(([label, value]) => [label, esc(value)]));
      $('#editTrainingLink').href =
        `../id/edit-training/${encodeURIComponent(r.id)}`;
      renderApprovalRequirements([r]);
      approveModal.show();
    } else if (rj) {
      const r = (state.selected = findRecord(rj.dataset.reject));
      $('#rejectDetails').innerHTML = detailRows([
        ['Training ID', esc(r.id)],
        ['Training Title', esc(r.title)],
        ['Training Type', esc(r.type)],
        ['Implementing Office', esc(r.office)],
      ]);
      $('#rejectRemarks').value = '';
      $('#confirmRejectButton').disabled = true;
      rejectModal.show();
    }
  });

  $('#rejectRemarks').addEventListener('input', () => {
    $('#confirmRejectButton').disabled = !$('#rejectRemarks').value.trim();
  });

  confirmApprove.addEventListener('click', async () => {
    const r = state.selected;
    if (!r) {
      notify('No training selected', 'Select a training before submitting it for approval.', 'warning');
      return;
    }
    if (!renderApprovalRequirements([r])) {
      const missing = window.TmisWorkflowReadiness.approvalRequirements(r)
        .filter(requirement => !requirement.passed)
        .map(requirement => `${requirement.label}: ${requirement.detail}`);
      notify('Submission blocked', `${trainingSummary(r)}. Missing requirements: ${missing.join(' ')}`, 'warning');
      return;
    }
    notify('Submitting for approval', `${trainingSummary(r)}. Status change requested: For Review → For Approval.`, 'info');
    try {
      if (window.TMIS_PAGE) {
        await window.TmisStore.request(`/operations/trainings/${Number(r._db_id)}/status`, {
          status: 'For approval',
          version: Number(r.version),
        });
        reloadWithStatusToast('Training submitted', `${trainingSummary(r)}. Status changed: For Review → For Approval.`);
        return;
      }
      const latest = window.TmisStore.records('tmis-trainings');
      await window.TmisStore.setItem('tmis-trainings', JSON.stringify(latest.map(item=>item.id===r.id?{...item,status:'For Approval'}:item)));
    } catch(error) { notify('Submission failed', `${trainingSummary(r)}. No status change was saved. ${error.message || 'The training could not be submitted.'}`, 'error'); return; }
    r.status = 'For Approval';
    approveModal.hide();
    refresh();
    notify('Training submitted', `${trainingSummary(r)}. Status changed: For Review → For Approval.`, 'success');
  });

  $('#confirmRejectButton').addEventListener('click', async () => {
    const r = state.selected;
    if (!r) {
      notify('No training selected', 'Select a training before rejecting it.', 'warning');
      return;
    }
    const reason = $('#rejectRemarks').value.trim();
    if (!reason) {
      notify('Remarks required', 'Add a reason before rejecting this training.', 'warning');
      return;
    }
    notify('Rejecting training', `${trainingSummary(r)}. Status change requested: For Review → Rejected. Reason: ${reason.slice(0, 180)}${reason.length > 180 ? '…' : ''}`, 'info');
    try {
      if (window.TMIS_PAGE) {
        await window.TmisStore.request(`/operations/trainings/${Number(r._db_id)}/status`, {
          status: 'Rejected',
          version: Number(r.version),
          reason,
        });
      }
      else {
        const latest = window.TmisStore.records('tmis-trainings');
        await window.TmisStore.setItem('tmis-trainings', JSON.stringify(latest.map(item=>item.id===r.id?{...item,status:'Rejected',remarks:reason}:item)));
      }
    } catch(error) { notify('Rejection failed', `${trainingSummary(r)}. Status remains For Review. ${error.message || 'The training could not be rejected.'}`, 'error'); return; }
    r.status = 'Rejected';
    r.remarks = reason;
    if (window.TMIS_PAGE) r.version = Number(r.version) + 1;
    state.status = 'Rejected';
    $('#statusFilter').value = 'Rejected';
    rejectModal.hide();
    refresh();
    notify('Training rejected', `${trainingSummary(r)}. Status changed: For Review → Rejected. Reason: ${reason.slice(0, 180)}${reason.length > 180 ? '…' : ''}`, 'success');
  });

  $('#confirmPermanentlyDeleteTrainingButton').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const record = pendingPermanentDelete;
    if (!record || record.status !== 'Rejected') return;
    button.disabled = true;
    try {
      if (window.TMIS_PAGE) {
        const result = await window.TmisStore.request(`/operations/trainings/${Number(record._db_id)}/permanently-delete`, {
          version: Number(record.version),
        }, 'DELETE');
        await window.TmisStore.refresh();
        records = window.TmisStore.records('tmis-trainings').filter(item => REVIEW_STATUSES.includes(item.status));
        pendingPermanentDelete = null;
        permanentlyDeleteModal.hide();
        refresh();
        notify('Training permanently deleted', result.message || 'The rejected training and its linked records were removed.', 'success');
        return;
      }
      const latest = window.TmisStore.records('tmis-trainings');
      await window.TmisStore.setItem('tmis-trainings', JSON.stringify(latest.filter(item => item.id !== record.id)));
      records = records.filter(item => item.id !== record.id);
      pendingPermanentDelete = null;
      permanentlyDeleteModal.hide();
      refresh();
      notify('Training permanently deleted', 'The rejected training was removed from the records.', 'success');
    } catch (error) {
      notify('Deletion failed', error.message || 'The rejected training could not be permanently deleted.', 'error');
    } finally { button.disabled = false; }
  });

  /* ------------------------------------------------------------------
     Refresh / export
  ------------------------------------------------------------------ */
  $('#refreshReviewTable').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      if (window.TMIS_PAGE) {
        await window.TmisStore.refresh();
        records = window.TmisStore.records('tmis-trainings').filter(item => REVIEW_STATUSES.includes(item.status));
        setOptions(
          '#yearCoveredFilter',
          'All years',
          uniq(records.map(record => String(record.yearCovered))),
          state.year
        );
      }
      refresh();
      notify('Trainings Refreshed', 'Trainings refreshed successfully.');
    } catch (error) {
      notify('Refresh Failed', error.message || 'Training records could not be refreshed.', true);
    } finally {
      button.disabled = false;
    }
  });
  $('#exportReviewTable').addEventListener('click', () => {
    if (!window.XLSX) {
      notify('Export Unavailable', 'The Excel library failed to load.', true);
      return;
    }
    const rows = sorted();
    if (!rows.length) {
      notify('Nothing to Export', 'No trainings match the current filters.', true);
      return;
    }
    const data = rows.map((r) =>
      Object.fromEntries(EXPORT_COLUMNS.map(([k, label]) => [label, r[k] ?? '']))
    );
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Trainings for Review'],
      [`Exported ${new Date().toLocaleString('en-PH', {timeZone:'Asia/Manila'})} · ${rows.length} training(s)`],
      [],
    ]);
    XLSX.utils.sheet_add_json(sheet, data, {
      origin: 'A4',
      header: EXPORT_COLUMNS.map(([, label]) => label),
    });
    sheet['!cols'] = EXPORT_COLUMNS.map(([k, label]) => ({
      wch: Math.min(
        60,
        Math.max(label.length, ...rows.map((r) => String(r[k] ?? '').length)) + 2
      ),
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'training_for_review');
    XLSX.writeFile(book, 'training_for_review.xlsx');
    notify('Export Complete', `${rows.length} training(s) exported to Excel.`);
  });

  render();
});
