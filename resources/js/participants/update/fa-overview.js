document.addEventListener('DOMContentLoaded', () => {
  const tabs = [...document.querySelectorAll('.profile-tabs [role="tab"]')];
  function activateTab(selected, focus = false) {
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.classList.toggle('active', active);
      tab.closest('.profile-tab').classList.toggle('is-current', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel.hidden = !active;
      panel.classList.toggle('d-none', !active);
    });
    if (focus) selected.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activateTab(tabs[next], true);
    });
  });
  if (tabs.length) activateTab(tabs[0]);

  const requestedId = window.TmisStore.selectedId();
  const demoAssociation = { id: 'FA-2025-001', association_name: 'Jomalig Farmers Association', short_name: 'JFA', organization_type: 'Association', office: 'Municipal Agriculture Office', province: 'Quezon', district: '1st District', municipality: 'Jomalig', barangay: 'Apad', registration_date: '2025-03-14', year_covered: '2025', status: 'Active' };
  const sampleMembers = [
    { status: 'Active', farmer_id: 'F-2025-001', lname: 'Reyes', fname: 'Maria', mname: 'Santos', sfname: '', dob: '1985-04-18', gender: 'Female', associate_role: 'President', date_registered: '2025-03-14', province: 'Quezon', district: '1st District', municipality: 'Jomalig', barangay: 'Apad', sitio: 'Purok 1' },
    { status: 'Active', farmer_id: 'F-2025-002', lname: 'Dela Cruz', fname: 'Jose', mname: 'Ramos', sfname: 'Jr.', dob: '1979-09-02', gender: 'Male', associate_role: 'Vice President', date_registered: '2025-03-14', province: 'Quezon', district: '1st District', municipality: 'Jomalig', barangay: 'Apad', sitio: 'Purok 2' },
    { status: 'Active', farmer_id: 'F-2025-003', lname: 'Mendoza', fname: 'Ana', mname: 'Garcia', sfname: '', dob: '1992-01-27', gender: 'Female', associate_role: 'Secretary', date_registered: '2025-03-16', province: 'Quezon', district: '1st District', municipality: 'Jomalig', barangay: 'Apad', sitio: 'Purok 3' },
    { status: 'Active', farmer_id: 'F-2025-004', lname: 'Villanueva', fname: 'Pedro', mname: 'Lopez', sfname: '', dob: '1988-11-05', gender: 'Male', associate_role: 'Treasurer', date_registered: '2025-03-18', province: 'Quezon', district: '1st District', municipality: 'Jomalig', barangay: 'Apad', sitio: 'Purok 1' },
    { status: 'Inactive', farmer_id: 'F-2025-005', lname: 'Bautista', fname: 'Elena', mname: 'Cruz', sfname: '', dob: '1968-07-12', gender: 'Female', associate_role: 'Member', date_registered: '2025-03-20', province: 'Quezon', district: '1st District', municipality: 'Jomalig', barangay: 'Apad', sitio: 'Purok 2' },
  ];
  const id = requestedId || demoAssociation.id;
  const fields = document.querySelectorAll('[data-fa-field]');
  const title = document.getElementById('faOverviewTitle');
  const status = document.getElementById('faOverviewStatus');
  const membersBody = document.getElementById('faMembersBody');
  const memberCount = document.getElementById('faMemberCount');
  const sampleNotice = document.getElementById('faSampleNotice');

  let associations = [];
  try {
    const stored = JSON.parse(window.TmisStore.getItem('tmis-farmer-associations') || '[]');
    if (Array.isArray(stored)) associations = stored;
  } catch { /* Show the missing record state. */ }
  const association = associations.find(record => record.id === id) || (!window.TMIS_PAGE && (!requestedId || id === demoAssociation.id) ? demoAssociation : null);
  if (!association) {
    title.textContent = 'Association not found';
    status.hidden = true;
    fields.forEach(field => { field.textContent = '—'; });
  } else {
    title.textContent = association.association_name || 'Farmer Association';
    status.textContent = association.status || 'Active';
    status.classList.toggle('is-inactive', association.status === 'Inactive');
    fields.forEach(field => {
      const key = field.dataset.faField;
      field.textContent = association[key] || '—';
    });
    const date = document.querySelector('[data-fa-date]');
    if (date && association.registration_date) {
      const parsed = new Date(`${association.registration_date}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) date.textContent = parsed.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  const search = document.getElementById('faMemberSearch');
  const resultCount = document.getElementById('faMemberResultCount');
  const tableHead = document.getElementById('faMemberTableHead');
  const columnMenu = document.getElementById('faColumnMenu');
  const pageSize = document.getElementById('faMemberPageSize');
  const previousPage = document.getElementById('faMemberPrevious');
  const nextPage = document.getElementById('faMemberNext');
  const pageStatus = document.getElementById('faMemberPageStatus');
  const columns = ['Status', 'Farmer ID', 'Last Name', 'First Name', 'Middle Name', 'Extension', 'Date of Birth', 'Gender', 'Age', 'Farmer Role', 'Date Registered', 'Province', 'District', 'Municipality', 'Barangay', 'Sitio/Purok'];
  const visibleColumns = new Set(columns.map((_, index) => index).filter(index => index < 11));
  const labelRow = document.createElement('tr');
  const filterRow = document.createElement('tr');
  filterRow.className = 'fa-member-filters';
  const columnFilters = [];
  columns.forEach((name, index) => {
    const heading = document.createElement('th');
    heading.scope = 'col';
    heading.textContent = name;
    heading.dataset.memberColumn = String(index);
    labelRow.append(heading);
    const filterCell = document.createElement('th');
    filterCell.dataset.memberColumn = String(index);
    const filter = document.createElement('input');
    filter.type = 'search';
    filter.className = 'form-control form-control-sm';
    filter.placeholder = 'Filter';
    filter.setAttribute('aria-label', `Filter ${name}`);
    filter.dataset.memberFilter = String(index);
    filterCell.append(filter);
    filterRow.append(filterCell);
    columnFilters.push(filter);
    const option = document.createElement('label');
    option.className = 'fa-column-option';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = visibleColumns.has(index);
    toggle.dataset.columnToggle = String(index);
    option.append(toggle, document.createTextNode(name));
    columnMenu.append(option);
  });
  tableHead.append(labelRow, filterRow);
  let members = [];
  let page = 1;
  const first = (member, ...keys) => keys.map(key => member[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') || '';
  const formatDate = value => {
    if (!value) return '';
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const ageFromBirth = value => {
    if (!value) return '';
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime()) || birth > new Date()) return '';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };
  const rowValues = member => {
    const birth = first(member, 'dob', 'date_of_birth', 'birth_date');
    return [
      first(member, 'status'), first(member, 'farmerNumber', 'farmer_number', 'farmer_id', 'id'),
      first(member, 'last_name', 'lname'), first(member, 'first_name', 'fname'),
      first(member, 'middle_name', 'mname'), first(member, 'extension', 'suffix', 'sfname'),
      formatDate(birth), first(member, 'gender', 'sex'),
      first(member, 'age') || ageFromBirth(birth),
      first(member, 'farmer_role', 'associate_role', 'role', 'position'),
      formatDate(first(member, 'date_registered', 'registration_date', 'savedAt')),
      first(member, 'province'), first(member, 'district'), first(member, 'municipality'),
      first(member, 'barangay'), first(member, 'sitio', 'purok', 'sitio_purok'),
    ];
  };
  function readMembers() {
    let currentAssociation;
    let storedMembers = [];
    try {
      const records = JSON.parse(window.TmisStore.getItem('tmis-farmer-associations') || '[]');
      if (Array.isArray(records)) currentAssociation = records.find(record => record.id === id);
      const stored = JSON.parse(window.TmisStore.getItem('tmis-fa-members') || '[]');
      if (Array.isArray(stored)) storedMembers = stored;
    } catch { /* Invalid browser data leaves the table empty. */ }
    if (currentAssociation) {
      const membersByFarmer = new Map();
      const rosterMembers = Array.isArray(currentAssociation.members) ? currentAssociation.members : [];
      const legacyMembers = storedMembers.filter(member => member.faId === id || member.association_id === id);

      [...rosterMembers, ...legacyMembers].forEach(member => {
        const farmerId = String(member.farmer_id || member.id || '').trim().toLocaleLowerCase();
        if (!farmerId) return;

        const existing = membersByFarmer.get(farmerId);
        if (!existing) {
          membersByFarmer.set(farmerId, member);
          return;
        }

        const merged = { ...member, ...existing };
        Object.entries(member).forEach(([key, value]) => {
          if ((merged[key] === undefined || merged[key] === null || merged[key] === '') && value !== undefined && value !== null && value !== '') {
            merged[key] = value;
          }
        });
        const role = existing.position || existing.associate_role || existing.role || member.position || member.associate_role || member.role;
        if (role) {
          merged.position = role;
          merged.associate_role = role;
          merged.farmer_role = role;
          merged.role = role;
        }
        membersByFarmer.set(farmerId, merged);
      });

      members = [...membersByFarmer.values()];
    } else {
      members = [];
    }
    const showingSamples = !window.TMIS_PAGE && id === demoAssociation.id && members.length === 0 && Boolean(association);
    if (showingSamples) members = sampleMembers;
    sampleNotice.hidden = !showingSamples;
    memberCount.textContent = `${members.length} member${members.length === 1 ? '' : 's'}`;
    renderMembers();
  }
  function filteredMembers() {
    const query = search.value.trim().toLocaleLowerCase();
    return members.filter(member => {
      const values = rowValues(member).map(value => String(value).toLocaleLowerCase());
      return (!query || values.some((value, index) => visibleColumns.has(index) && value.includes(query))) &&
        columnFilters.every(filter => !filter.value.trim() || values[Number(filter.dataset.memberFilter)].includes(filter.value.trim().toLocaleLowerCase()));
    });
  }
  function renderMembers() {
    const filtered = filteredMembers();
    const size = pageSize.value === 'all' ? Math.max(filtered.length, 1) : Number(pageSize.value);
    const totalPages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.min(page, totalPages);
    const start = (page - 1) * size;
    const visible = filtered.slice(start, start + size);
    membersBody.replaceChildren();
    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = visibleColumns.size;
      cell.className = 'text-center text-muted py-4';
      cell.textContent = members.length ? 'No farmer members match the current filters.' : 'No farmer members recorded for this association.';
      row.append(cell);
      membersBody.append(row);
    }
    visible.forEach(member => {
      const row = document.createElement('tr');
      rowValues(member).forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value === '' ? '—' : String(value);
        if (index === 0) cell.className = `fa-member-status ${String(value).toLowerCase() === 'inactive' ? 'is-inactive' : 'is-active'}`;
        if (index === 1) cell.classList.add('fa-member-id');
        cell.hidden = !visibleColumns.has(index);
        row.append(cell);
      });
      membersBody.append(row);
    });
    resultCount.textContent = `Showing ${filtered.length ? start + 1 : 0}–${filtered.length ? start + visible.length : 0} of ${filtered.length} matching members (${members.length} total)`;
    pageStatus.textContent = `Page ${page} of ${totalPages}`;
    previousPage.disabled = page <= 1;
    nextPage.disabled = page >= totalPages;
  }
  const resetPageAndRender = () => { page = 1; renderMembers(); };
  function syncVisibleColumns() {
    tableHead.querySelectorAll('[data-member-column]').forEach(cell => {
      cell.hidden = !visibleColumns.has(Number(cell.dataset.memberColumn));
    });
    renderMembers();
  }
  columnMenu.querySelectorAll('[data-column-toggle]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const index = Number(toggle.dataset.columnToggle);
      if (!toggle.checked && visibleColumns.size === 1) { toggle.checked = true; return; }
      if (toggle.checked) visibleColumns.add(index);
      else {
        visibleColumns.delete(index);
        columnFilters[index].value = '';
      }
      page = 1;
      syncVisibleColumns();
    });
  });
  syncVisibleColumns();
  search.addEventListener('input', resetPageAndRender);
  columnFilters.forEach(filter => filter.addEventListener('input', resetPageAndRender));
  pageSize.addEventListener('change', resetPageAndRender);
  previousPage.addEventListener('click', () => { if (page > 1) { page--; renderMembers(); } });
  nextPage.addEventListener('click', () => { page++; renderMembers(); });
  document.getElementById('faMemberRefresh').addEventListener('click', readMembers);
  document.getElementById('faMemberExport').addEventListener('click', () => {
    if (!window.XLSX) {
      resultCount.textContent = 'Excel export is unavailable. Check your connection and try again.';
      return;
    }
    const exportColumns = columns.filter((_, index) => visibleColumns.has(index));
    const rows = filteredMembers().map(member => Object.fromEntries(columns.flatMap((column, index) => visibleColumns.has(index) ? [[column, rowValues(member)[index]]] : [])));
    const sheet = window.XLSX.utils.json_to_sheet(rows, { header: exportColumns });
    const book = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(book, sheet, 'Farmer Members');
    window.XLSX.writeFile(book, `farmer_members_${id || 'association'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
  window.addEventListener('storage', event => {
    if (event.key === 'tmis-farmer-associations' || event.key === 'tmis-fa-members') readMembers();
  });
  readMembers();
});
