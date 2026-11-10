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

  /* ------------------------------------------------------------------
     Reference data (mock). Province → Municipality → Barangay hierarchy
     drives the synced location filters.
  ------------------------------------------------------------------ */
  const LOCATIONS = [
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
  const places = LOCATIONS.flatMap((p) =>
    p.municipalities.flatMap((m) =>
      m.barangays.map((b) => ({
        region: p.region,
        province: p.province,
        district: m.district,
        municipality: m.name,
        barangay: b,
      }))
    )
  );
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
  const typeNames = Object.keys(TYPES);
  // This queue only contains trainings that passed review and await a decision.
  const ACCEPTANCE_STATUSES = ['For Acceptance'];
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

  const records = (window.TMIS_PAGE ? window.TmisStore.records('tmis-trainings').filter(item => item.status === 'For Acceptance') : []);
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
            ? 'For Acceptance'
            : n % 7 === 0
              ? 'Approved & Accepted'
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
      ...(n === 4
        ? {
            designFile: 'training-design-sample.pdf',
            designFileUrl: '../../../../assets/samples/training-design-sample.pdf',
          }
        : {}),
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
    { key: 'remarks', label: 'Remarks' },
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
    ['remarks', 'Remarks'],
  ];

  const body = $('#forReviewTableBody'),
    empty = $('#reviewTableState'),
    table = $('#forReviewDataTable'),
    toast = new bootstrap.Toast($('#reviewToast')),
    acceptModal = new bootstrap.Modal($('#reviewForwardModal')),
    rejectModal = new bootstrap.Modal($('#rejectTrainingModal'));
  const state = {
    page: 1,
    perPage: 10,
    global: '',
    status: 'For Acceptance',
    type: '',
    province: '',
    municipality: '',
    barangay: '',
    year: '',
    columns: {},
    hidden: new Set(),
    sort: null,
    selected: null,
    selectedIds: new Set(),
  };

  const statusBadgeClass = (status) =>
    ({
      'For Review': 'status-review',
      'For Acceptance': 'status-acceptance',
      'Approved & Accepted': 'status-approved',
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
  const notify = (title, message, warn = false) => {
    $('#reviewToastTitle').textContent = title;
    $('#reviewToastMessage').textContent = message;
    $('#reviewToastTime').textContent = new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila', 
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
    $('#reviewToastIcon').className =
      `bi me-2 ${warn ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`;
    $('#reviewToast').classList.toggle('review-toast-blocked', warn);
    toast.show();
  };

  /* ------------------------------------------------------------------
     Header / footer / column toggle (built once; columns hide via class)
  ------------------------------------------------------------------ */
  $('#reviewHeadRow').innerHTML =
    '<th class="selection-column"><input id="selectAllTrainings" class="form-check-input" type="checkbox" aria-label="Select all filtered trainings" /></th><th>Actions</th>' +
    COLUMNS.map(
      (c) =>
        `<th class="sortable-column" data-col="${c.key}" data-sort="${c.key}">${esc(c.label)} <i class="bi bi-arrow-down-up"></i></th>`
    ).join('');
  $('#reviewFootRow').innerHTML =
    '<th></th><th></th>' +
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
    const inProvince = places.filter(
      (p) => !state.province || p.province === state.province
    );
    const inMunicipality = inProvince.filter(
      (p) => !state.municipality || p.municipality === state.municipality
    );
    setOptions(
      '#provinceFilter',
      'All provinces',
      uniq(places.map((p) => p.province)),
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
    ACCEPTANCE_STATUSES,
    state.status
  );
  setOptions('#trainingTypeFilter', 'All training types', typeNames, '');
  setOptions(
    '#yearCoveredFilter',
    'All years',
    uniq(records.map((r) => String(r.yearCovered))),
    ''
  );
  syncLocationFilters();

  const filtered = () =>
    records.filter(
      (r) =>
        ACCEPTANCE_STATUSES.includes(r.status) &&
        (!state.status || r.status === state.status) &&
        (!state.global ||
          Object.values(r).join(' ').toLowerCase().includes(state.global)) &&
        (!state.type || r.type === state.type) &&
        (!state.province || r.province === state.province) &&
        (!state.municipality || r.municipality === state.municipality) &&
        (!state.barangay || r.barangay === state.barangay) &&
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
  const updateSelectionUI = (rows = sorted()) => {
    const selectAll = $('#selectAllTrainings');
    const selectedCount = $('#selectedTrainingCount');
    const selectedVisible = rows.filter((record) => state.selectedIds.has(record.id)).length;
    if (selectAll) {
      selectAll.checked = rows.length > 0 && selectedVisible === rows.length;
      selectAll.indeterminate = selectedVisible > 0 && selectedVisible < rows.length;
      selectAll.disabled = rows.length === 0;
    }
    if (selectedCount) {
      selectedCount.textContent = `${state.selectedIds.size} selected`;
    }
    const mayAccept = Boolean(window.TMIS_PAGE?.administrator);
    const mayRevert = mayAccept || window.TMIS_PAGE?.permissions?.includes('trainings.accept');
    if ($('#bulkForwardButton')) $('#bulkForwardButton').hidden = !state.selectedIds.size || !mayAccept;
    if ($('#bulkRevertButton')) $('#bulkRevertButton').hidden = !state.selectedIds.size || !mayRevert;
  };
  const selectionCell = (record) => `<td class="row-select-cell"><input class="form-check-input row-select-training" type="checkbox" data-select-training="${esc(record.id)}" aria-label="Select training ${esc(record.id)}" ${state.selectedIds.has(record.id) ? 'checked' : ''} /></td>`;
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
    const pendingAcceptance = r.status === 'For Acceptance';
    const mayAccept = Boolean(window.TMIS_PAGE?.administrator);
    const mayRevert = mayAccept || window.TMIS_PAGE?.permissions?.includes('trainings.accept');
    return `<td><div class="table-row-actions">${pendingAcceptance && mayAccept ? `<button type="button" class="btn table-action-button forward-action" data-accept="${id}" title="Approve next status: Approved & Accepted" aria-label="Approve ${id} and move to Approved & Accepted"><i class="bi bi-patch-check-fill"></i></button>` : ''}<a class="btn table-action-button view-action" href="../id/view-training/${q}" target="_blank" rel="noopener" title="View training (opens in a new tab)" aria-label="View ${id}"><i class="bi bi-eye-fill"></i></a><a class="btn table-action-button edit-action" href="../id/edit-training/${q}" target="_blank" rel="noopener" title="Edit training (opens in a new tab)" aria-label="Edit ${id}"><i class="bi bi-pencil-fill"></i></a>${pendingAcceptance && mayRevert ? `<button type="button" class="btn table-action-button remarks-action" data-reject="${id}" title="Revert status to an earlier stage" aria-label="Revert ${id} to an earlier stage"><i class="bi bi-arrow-counterclockwise"></i></button>` : ''}</div></td>`;
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
      .map((r) => `<tr>${selectionCell(r)}${actions(r)}${COLUMNS.map((c) => cell(c, r)).join('')}</tr>`)
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
    updateSelectionUI(all);
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
    if (state.municipality && !state.province)
      state.province = places.find(
        (p) => p.municipality === state.municipality
      ).province;
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
          (!state.province || p.province === state.province)
      );
      if (match) {
        state.municipality = match.municipality;
        state.province = match.province;
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
  $('#reviewHeadRow').addEventListener('change', (e) => {
    if (e.target.id !== 'selectAllTrainings') return;
    sorted().forEach((record) => {
      if (e.target.checked) state.selectedIds.add(record.id);
      else state.selectedIds.delete(record.id);
    });
    render();
  });
  body.addEventListener('change', (e) => {
    const id = e.target.dataset.selectTraining;
    if (!id) return;
    if (e.target.checked) state.selectedIds.add(id);
    else state.selectedIds.delete(id);
    updateSelectionUI();
  });
  $('#clearReviewFilters').addEventListener('click', () => {
    state.global = state.type = state.province = state.municipality = '';
    state.status = 'For Acceptance';
    $('#statusFilter').value = 'For Acceptance';
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
     Accept a training that has passed review
  ------------------------------------------------------------------ */
  const confirmAccept = $('#confirmForwardButton');
  const confirmRemarks = $('#confirmRejectButton');
  const renderAttachmentPreview = (r) => {
    const name = $('#approvalAttachmentName');
    const viewer = $('#approvalAttachmentViewer');
    const open = $('#approvalAttachmentOpen');
    const file = r.designFile;
    const rawName = typeof file === 'object' && file ? file.name : file;
    const fileName = String(rawName || '').split(/[\\/]/).pop();
    const rawUrl = r.designFileUrl || (typeof file === 'object' && file ? file.url : '') ||
      (/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(String(file || '')) ? file : '');
    let url = '';

    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl, document.baseURI);
        if (['http:', 'https:', 'blob:'].includes(parsed.protocol)) url = parsed.href;
      } catch {
        url = '';
      }
    }

    name.textContent = fileName || 'No training design attachment on file';
    open.hidden = !url;
    if (url) open.href = url;
    else open.removeAttribute('href');
    viewer.replaceChildren();

    if (url && fileName.toLowerCase().endsWith('.pdf')) {
      const frame = document.createElement('iframe');
      frame.title = `Preview of ${fileName}`;
      frame.src = url;
      viewer.append(frame);
      return;
    }

    if (url && /\.(png|jpe?g|gif|webp|bmp)$/i.test(fileName)) {
      const image = document.createElement('img');
      image.className = 'approval-attachment-image';
      image.src = url;
      image.alt = `Preview of ${fileName}`;
      viewer.append(image);
      return;
    }

    const message = document.createElement('p');
    message.className = 'approval-attachment-empty';
    message.textContent = !fileName
      ? 'No training design attachment is available for this record.'
      : url
        ? 'This file type cannot be previewed in the browser. Use Open file to view it.'
        : 'The attachment name is on file, but no accessible file URL is available for preview.';
    viewer.append(message);
  };

  const detailRows = (pairs) =>
    pairs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('');
  const findRecord = (id) => records.find((r) => r.id === id);
  const selectedRecords = () => records.filter((record) => state.selectedIds.has(record.id));
  const showReturnModal = (items) => {
    state.selected = items[0] || null;
    $('#rejectDetails').innerHTML = `<dt>Selected trainings</dt><dd>${items.length}</dd><dt>Current queue</dt><dd>For Acceptance</dd>`;
    $('#returnStatus').value = 'For Approval';
    $('#rejectRemarks').value = '';
    confirmRemarks.disabled = true;
    rejectModal.show();
  };
  const submitTransition = async (status, reason = '') => {
    const items = selectedRecords();
    if (!items.length) return;
    try {
      if (window.TMIS_PAGE) {
        const apiStatus = { 'Approved & Accepted': 'Approved & Accepted', 'For Approval': 'For approval', 'For Review': 'For review' }[status];
        await window.TmisStore.request('/operations/trainings/bulk-status', {
          status: apiStatus,
          reason,
          trainings: items.map((record) => ({ id: Number(record._db_id), version: Number(record.version) })),
        });
        location.reload();
        return;
      }
      const latest = window.TmisStore.records('tmis-trainings');
      await window.TmisStore.setItem('tmis-trainings', JSON.stringify(latest.map((item) => state.selectedIds.has(item.id) ? { ...item, status, remarks: reason } : item)));
    } catch (error) { notify('Status update blocked', error.message, true); throw error; }
    items.forEach((item) => { item.status = status; item.remarks = reason; });
    state.selectedIds.clear();
    refresh();
    notify('Training statuses updated', `${items.length} training(s) moved to ${status}.`);
  };

  body.addEventListener('click', (e) => {
    const a = e.target.closest('[data-accept]'),
      rj = e.target.closest('[data-reject]');
    if (a) {
      const r = findRecord(a.dataset.accept);
      state.selectedIds = new Set([r.id]);
      updateSelectionUI();
      $('#reviewForwardDetails').innerHTML = detailRows([
        ['Training ID', esc(r.id)],
        ['Training Title', esc(r.title)],
        ['Training Type', esc(r.type)],
        [
          'Training Status',
          `<span class="status-badge ${statusBadgeClass(r.status)}">${esc(r.status)}</span>`,
        ],
        ['Location and Venue', esc(`${r.venue}, ${r.location}`)],
      ]);
      $('#editTrainingLink').href =
        `../id/edit-training/${encodeURIComponent(r.id)}`;
      $('#editTrainingLink').hidden = false;
      $('#confirmForwardButton').innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Accept Training';
      renderAttachmentPreview(r);
      acceptModal.show();
    } else if (rj) {
      state.selectedIds = new Set([rj.dataset.reject]);
      updateSelectionUI();
      showReturnModal(selectedRecords());
    }
  });

  $('#bulkForwardButton').addEventListener('click', () => {
    const items = selectedRecords();
    if (!items.length || !window.TMIS_PAGE?.administrator) return;
    state.selected = items[0];
    $('#reviewForwardDetails').innerHTML = detailRows([['Selected trainings', String(items.length)], ['From status', 'For Acceptance'], ['Final status', 'Approved & Accepted']]);
    $('#editTrainingLink').hidden = true;
    $('#confirmForwardButton').innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>Approve selected';
    approveModal.show();
  });
  $('#bulkRevertButton').addEventListener('click', () => showReturnModal(selectedRecords()));

  confirmAccept.addEventListener('click', async () => {
    await submitTransition('Approved & Accepted');
    acceptModal.hide();
  });

  $('#rejectRemarks').addEventListener('input', (e) => {
    confirmRemarks.disabled = !e.target.value.trim();
  });

  confirmRemarks.addEventListener('click', async () => {
    const remarks = $('#rejectRemarks').value.trim();
    if (!remarks) return;
    await submitTransition($('#returnStatus').value, remarks);
    rejectModal.hide();
  });

  /* ------------------------------------------------------------------
     Refresh / export
  ------------------------------------------------------------------ */
  $('#refreshReviewTable').addEventListener('click', () => {
    refresh();
    notify('Trainings Refreshed', 'Trainings refreshed successfully.');
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
      ['Trainings for Acceptance'],
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
    XLSX.utils.book_append_sheet(book, sheet, 'training_for_acceptance');
    XLSX.writeFile(book, 'training_for_acceptance.xlsx');
    notify('Export Complete', `${rows.length} training(s) exported to Excel.`);
  });

  render();
});
