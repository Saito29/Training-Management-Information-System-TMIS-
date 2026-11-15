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
  const canRemoveMembers = Boolean(window.TMIS_PAGE?.administrator && document.getElementById('faCurrentMembersTab'));
  const actionOffset = canRemoveMembers ? 1 : 0;
  const columns = [
    ...(canRemoveMembers ? ['Action'] : []),
    'Status', 'Farmer ID', 'Year', 'Member', 'Location', 'Office',
    'Farmer Role', 'Date Registered', 'Member Since', 'Last Name', 'First Name',
    'Middle Name', 'Extension', 'Date of Birth', 'Gender', 'Age', 'Province',
    'District', 'Municipality', 'Barangay', 'Sitio/Purok',
  ];
  const visibleColumns = new Set(columns.map((_, index) => index).filter(index => index < actionOffset + 7));
  const actionIndex = canRemoveMembers ? 0 : -1;
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
    if (index === actionIndex) {
      columnFilters[index] = null;
    } else {
      const filter = document.createElement('input');
      filter.type = 'search';
      filter.className = 'form-control form-control-sm';
      filter.placeholder = 'Filter';
      filter.setAttribute('aria-label', `Filter ${name}`);
      filter.dataset.memberFilter = String(index);
      filterCell.append(filter);
      columnFilters[index] = filter;
    }
    filterRow.append(filterCell);
    if (index === actionIndex) return;
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
  const first = (member, ...keys) => member ? keys.map(key => member[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') || '' : '';
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
  let farmerProfiles = new Map();
  function memberProfile(member) {
    const farmerId = String(first(member, 'farmer_id', 'id')).trim();
    const farmer = farmerProfiles.get(farmerId)
      || farmerProfiles.get(String(first(member, 'farmerNumber', 'farmer_number')));
    const membership = farmer?.associationMemberships?.find(item =>
      String(item.id) === String(id)
      || String(item.databaseId) === String(association?._db_id),
    );
    const office = farmer?.beneficiaryOffices?.find(item => item.isPrimary)?.office
      || farmer?.beneficiaryOffices?.[0]?.office
      || '';

    return {
      ...farmer,
      ...member,
      id: farmerId,
      farmer_id: farmerId,
      farmerNumber: first(member, 'farmerNumber', 'farmer_number') || farmer?.farmerNumber || farmerId,
      fname: first(member, 'first_name', 'fname', 'firstName') || first(farmer, 'firstName', 'fname'),
      mname: first(member, 'middle_name', 'mname', 'middleName') || first(farmer, 'middleName', 'mname'),
      lname: first(member, 'last_name', 'lname', 'lastName') || first(farmer, 'lastName', 'lname'),
      suffix: first(member, 'extension', 'suffix', 'sfname') || first(farmer, 'suffix', 'extension'),
      gender: first(member, 'gender', 'sex') || first(farmer, 'gender', 'sex'),
      birthDate: first(member, 'dob', 'birthDate', 'date_of_birth', 'birth_date') || farmer?.birthDate || '',
      yearCovered: first(member, 'yearCovered', 'year_covered') || membership?.yearCovered || farmer?.yearCovered || '',
      position: first(member, 'position', 'associate_role', 'farmer_role', 'role') || membership?.role || farmer?.role || '',
      dateRegistered: first(member, 'date_registered', 'registration_date', 'dateRegistered')
        || membership?.registrationDate
        || farmer?.registrationDate
        || '',
      memberSince: first(member, 'member_since', 'memberSince') || membership?.memberSince || '',
      province: first(member, 'province') || farmer?.province || '',
      district: first(member, 'district') || farmer?.district || '',
      municipality: first(member, 'municipality') || farmer?.municipality || '',
      barangay: first(member, 'barangay') || farmer?.barangay || '',
      sitio: first(member, 'sitio', 'purok', 'sitio_purok') || farmer?.street_purok_sitio_name || '',
      region: first(member, 'region') || farmer?.region || association?.region || '',
      office: first(member, 'office') || farmer?.office || office || association?.office || '',
      status: first(member, 'status') || farmer?.status || 'Active',
    };
  }
  const rowValues = member => {
    const profile = memberProfile(member);
    const birth = first(profile, 'birthDate', 'dob', 'date_of_birth', 'birth_date');
    const age = first(profile, 'age') || ageFromBirth(birth);
    const name = [profile.fname, profile.mname, profile.lname, profile.suffix].filter(Boolean).join(' ');
    const gender = first(profile, 'gender', 'sex');
    const year = first(profile, 'yearCovered', 'year_covered');
    const region = first(profile, 'region');
    const location = [region, profile.province, profile.district, profile.municipality, profile.barangay, profile.sitio].filter(Boolean).join(' ');
    return [
      ...(canRemoveMembers ? [''] : []),
      profile.status,
      profile.farmerNumber,
      year,
      `${name} ${gender} ${birth} ${age}`.trim(),
      location,
      profile.office,
      profile.position,
      formatDate(profile.dateRegistered),
      formatDate(profile.memberSince),
      profile.lname,
      profile.fname,
      profile.mname,
      profile.suffix,
      formatDate(birth),
      gender,
      age,
      profile.province,
      profile.district,
      profile.municipality,
      profile.barangay,
      profile.sitio,
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
    farmerProfiles = new Map();
    window.TmisStore.records('tmis-farmers').forEach(farmer => {
      if (farmer.id) farmerProfiles.set(String(farmer.id), farmer);
      if (farmer.farmerNumber) farmerProfiles.set(String(farmer.farmerNumber), farmer);
    });
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
        columnFilters.every((filter, index) => !filter || !filter.value.trim() || values[index].includes(filter.value.trim().toLocaleLowerCase()));
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
      const profile = memberProfile(member);
      const name = [profile.fname, profile.mname, profile.lname, profile.suffix].filter(Boolean).join(' ');
      const birthDate = String(profile.birthDate || '').slice(0, 10);
      const age = first(profile, 'age') || ageFromBirth(birthDate);
      const gender = String(profile.gender || '').toLowerCase();
      const genderLabel = gender.startsWith('f') ? 'F' : gender.startsWith('m') ? 'M' : '—';
      const region = String(profile.region || '').trim();
      const regionLabel = region.replace(/^region\s*/i, '').replace(/[\s-]+/g, '') || '—';
      const values = rowValues(member);
      values.forEach((value, index) => {
        const cell = document.createElement('td');
        const dataIndex = index - actionOffset;
        if (index === actionIndex) {
          cell.className = 'fa-member-action';
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn btn-sm btn-outline-danger fa-member-remove';
          button.dataset.removeMember = profile.farmer_id;
          button.title = 'Remove farmer from association';
          button.setAttribute('aria-label', `Remove ${name || profile.farmerNumber} from this association`);
          const icon = document.createElement('i');
          icon.className = 'bi bi-person-dash';
          icon.setAttribute('aria-hidden', 'true');
          button.append(icon);
          cell.append(button);
        } else if (dataIndex === 0) {
          cell.textContent = value === '' ? '—' : String(value);
          cell.className = `fa-member-status ${String(value).toLowerCase() === 'inactive' ? 'is-inactive' : 'is-active'}`;
        } else if (dataIndex === 1) {
          const farmerNumber = String(profile.farmerNumber || value);
          const profileUrl = /^\d{8,}$/.test(farmerNumber)
            ? document.getElementById('faMembersBody').dataset.farmerProfileUrlTemplate.replace('__FARMER_ID__', encodeURIComponent(farmerNumber))
            : null;
          cell.className = 'fa-member-id';
          if (profileUrl) {
            const link = document.createElement('a');
            link.className = 'fa-member-profile-link';
            link.href = profileUrl;
            link.textContent = farmerNumber;
            link.setAttribute('aria-label', `View farmer profile for ${farmerNumber}`);
            cell.append(link);
          } else {
            cell.textContent = farmerNumber || '—';
          }
        } else if (dataIndex === 2) {
          const badge = document.createElement('span');
          badge.className = 'fa-member-year-badge';
          badge.textContent = value || '—';
          cell.append(badge);
        } else if (dataIndex === 3) {
          const details = document.createElement('div');
          details.className = 'fa-roster-member';
          const fullName = document.createElement('strong');
          fullName.textContent = name || 'Name not recorded';
          details.append(fullName);
          const demographics = document.createElement('span');
          demographics.className = 'fa-roster-demographics';
          const genderBadge = document.createElement('span');
          genderBadge.className = `fa-roster-gender ${genderLabel === 'F' ? 'is-female' : genderLabel === 'M' ? 'is-male' : 'is-unknown'}`;
          genderBadge.textContent = genderLabel;
          const birthDateLabel = document.createElement('span');
          birthDateLabel.textContent = birthDate
            ? `${birthDate}${age === '' ? '' : ` · ${age} yrs`}`
            : 'Birth date not recorded';
          demographics.append(genderBadge, birthDateLabel);
          details.append(demographics);
          cell.append(details);
        } else if (dataIndex === 4) {
          const details = document.createElement('div');
          details.className = 'fa-roster-location';
          const primary = document.createElement('span');
          primary.className = 'fa-roster-location-primary';
          const regionBadge = document.createElement('span');
          regionBadge.className = 'fa-roster-region';
          regionBadge.title = region || 'Region not recorded';
          regionBadge.textContent = regionLabel;
          const municipalityProvince = [profile.municipality, profile.province].filter(Boolean).join(', ') || 'Location not recorded';
          const place = document.createElement('span');
          place.textContent = municipalityProvince;
          primary.append(regionBadge, place);
          details.append(primary);
          const barangay = document.createElement('span');
          barangay.className = 'fa-roster-location-secondary';
          barangay.textContent = profile.barangay ? `Brgy. ${profile.barangay}` : 'Barangay not recorded';
          details.append(barangay);
          cell.append(details);
        } else if (dataIndex === 5) {
          const badge = document.createElement('span');
          badge.className = 'fa-roster-office';
          badge.textContent = value || 'Office not recorded';
          cell.append(badge);
        } else {
          cell.textContent = value === '' ? '—' : String(value);
        }
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
  columnFilters.forEach(filter => filter?.addEventListener('input', resetPageAndRender));
  pageSize.addEventListener('change', resetPageAndRender);
  previousPage.addEventListener('click', () => { if (page > 1) { page--; renderMembers(); } });
  nextPage.addEventListener('click', () => { page++; renderMembers(); });
  document.getElementById('faMemberRefresh').addEventListener('click', readMembers);
  document.getElementById('faMemberExport').addEventListener('click', () => {
    if (!window.XLSX) {
      resultCount.textContent = 'Excel export is unavailable. Check your connection and try again.';
      return;
    }
    const exportIndexes = columns.map((_, index) => index).filter(index => index !== actionIndex && visibleColumns.has(index));
    const exportColumns = exportIndexes.map(index => columns[index]);
    const rows = filteredMembers().map(member => {
      const values = rowValues(member);
      return Object.fromEntries(exportIndexes.map(index => [columns[index], values[index]]));
    });
    const sheet = window.XLSX.utils.json_to_sheet(rows, { header: exportColumns });
    const book = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(book, sheet, 'Farmer Members');
    window.XLSX.writeFile(book, `farmer_members_${id || 'association'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
  if (canRemoveMembers) {
    const removeMemberModalElement = document.getElementById('faRemoveMemberModal');
    const removeMemberModal = bootstrap.Modal.getOrCreateInstance(removeMemberModalElement);
    const removeMemberButton = document.getElementById('faRemoveMemberConfirm');
    const removeMemberError = document.getElementById('faRemoveMemberError');
    let pendingRemoval = null;
    const setRemovalDetail = (name, value) => {
      const isEmpty = value === undefined || value === null || String(value).trim() === '';
      document.getElementById(name).textContent = isEmpty ? '—' : String(value);
    };

    membersBody.addEventListener('click', event => {
      const button = event.target.closest('[data-remove-member]');
      if (!button || button.disabled) return;

      const farmerId = button.dataset.removeMember;
      const member = members.find(item => String(item.farmer_id || item.id) === farmerId);
      if (!member) {
        readMembers();
        window.TmisToast?.show('This farmer is no longer a member of the association.', 'warning');
        return;
      }

      const profile = memberProfile(member);
      const name = [profile.fname, profile.mname, profile.lname, profile.suffix].filter(Boolean).join(' ') || profile.farmerNumber || farmerId;
      const birthDate = String(profile.birthDate || '').slice(0, 10);
      const location = [profile.region, profile.province, profile.district, profile.municipality, profile.barangay, profile.sitio].filter(Boolean).join(', ');
      pendingRemoval = { farmerId, name };
      setRemovalDetail('faRemoveMemberAssociation', association?.association_name || association?.short_name || id);
      setRemovalDetail('faRemoveMemberName', name);
      setRemovalDetail('faRemoveMemberId', profile.farmerNumber || farmerId);
      setRemovalDetail('faRemoveMemberStatus', profile.status);
      setRemovalDetail('faRemoveMemberYear', profile.yearCovered);
      setRemovalDetail('faRemoveMemberRole', profile.position);
      setRemovalDetail('faRemoveMemberSince', formatDate(profile.memberSince));
      setRemovalDetail('faRemoveMemberBirthDate', formatDate(birthDate));
      setRemovalDetail('faRemoveMemberAge', first(profile, 'age') || ageFromBirth(birthDate));
      setRemovalDetail('faRemoveMemberGender', profile.gender);
      setRemovalDetail('faRemoveMemberLocation', location);
      setRemovalDetail('faRemoveMemberOffice', profile.office);
      removeMemberError.hidden = true;
      removeMemberError.textContent = '';
      removeMemberButton.disabled = false;
      removeMemberModal.show();
    });

    removeMemberButton.addEventListener('click', async () => {
      if (!pendingRemoval || removeMemberButton.disabled) return;

      const { farmerId, name } = pendingRemoval;
      removeMemberButton.disabled = true;
      removeMemberButton.setAttribute('aria-busy', 'true');
      removeMemberError.hidden = true;
      try {
        await window.TmisStore.refresh();
        const records = JSON.parse(window.TmisStore.getItem('tmis-farmer-associations') || '[]');
        if (!Array.isArray(records)) throw new Error('Association records could not be read.');
        const index = records.findIndex(record => record.id === id);
        if (index < 0) throw new Error('This association is no longer available.');
        const currentMembers = Array.isArray(records[index].members) ? records[index].members : [];
        const remainingMembers = currentMembers.filter(item => String(item.farmer_id || item.id) !== farmerId);
        if (remainingMembers.length === currentMembers.length) {
          readMembers();
          pendingRemoval = null;
          removeMemberModal.hide();
          window.TmisToast?.show('This farmer is no longer a member of the association.', 'warning');
          return;
        }

        records[index] = { ...records[index], members: remainingMembers };
        await window.TmisStore.setItem('tmis-farmer-associations', JSON.stringify(records));
        window.dispatchEvent(new StorageEvent('storage', { key: 'tmis-farmer-associations' }));
        readMembers();
        pendingRemoval = null;
        removeMemberModal.hide();
        window.TmisToast?.show(`${name} was removed from the association.`, 'success');
      } catch (error) {
        removeMemberError.textContent = error.message || 'The farmer could not be removed from the association.';
        removeMemberError.hidden = false;
        window.TmisToast?.show(removeMemberError.textContent, 'error');
      } finally {
        removeMemberButton.disabled = false;
        removeMemberButton.removeAttribute('aria-busy');
      }
    });

    removeMemberModalElement.addEventListener('hidden.bs.modal', () => {
      pendingRemoval = null;
      removeMemberError.hidden = true;
      removeMemberError.textContent = '';
      removeMemberButton.disabled = false;
    });
  }
  window.addEventListener('storage', event => {
    if (event.key === 'tmis-farmer-associations' || event.key === 'tmis-fa-members') readMembers();
  });
  readMembers();
});
