document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('fa-members');
  if (!panel) return;
  const id = window.TmisStore.selectedId();
  const key = 'tmis-farmer-associations';
  const $ = selector => panel.querySelector(selector);
  const sample = (window.TMIS_PAGE ? window.TmisStore.records('tmis-farmers').filter(item => item.status === 'Active').map(item => ({
    ...item,
    farmer_id: item.id,
    farmerNumber: item.farmerNumber || item.id,
    lname: item.lastName || item.lname || item.last_name,
    fname: item.firstName || item.fname || item.first_name,
    mname: item.middleName || item.mname || item.middle_name,
  })) : [
    ['FMR-2026-001', 'Dela Cruz', 'Juan', 'Santos', 'Male', 'Quezon', 'Alabat', 'Villa Esperanza'],
    ['FMR-2026-002', 'Santos', 'Maria', 'Reyes', 'Female', 'Quezon', 'Perez', 'Villamanzano Sur'],
    ['FMR-2025-003', 'Reyes', 'Pedro', 'Garcia', 'Male', 'Quezon', 'Jomalig', 'Apad'],
    ['FMR-2026-004', 'Mendoza', 'Ana', 'Cruz', 'Female', 'Quezon', 'Alabat', 'Villa Norte'],
    ['FMR-2024-005', 'Ramos', 'Roberto', 'Diaz', 'Male', 'Quezon', 'Perez', 'Villamanzano Sur'],
    ['FMR-2026-006', 'Villanueva', 'Liza', 'Aquino', 'Female', 'Quezon', 'Patnanungan', 'Amaga'],
    ['FMR-2025-007', 'Garcia', 'Elena', 'Torres', 'Female', 'Quezon', 'Alabat', 'Caglate'],
    ['FMR-2024-008', 'Navarro', 'Rico', 'Flores', 'Male', 'Quezon', 'Jomalig', 'Bukal'],
  ].map(([farmer_id, lname, fname, mname, gender, province, municipality, barangay]) => ({ farmer_id, lname, fname, mname, gender, province, district: ['Alabat', 'Perez'].includes(municipality) ? '2nd District' : '1st District', municipality, barangay, status: 'Active', associate_role: 'Member' })));
  const additionalNames = [
    ['Bautista', 'Rogelio', 'Cruz'], ['Flores', 'Roberto', 'Diaz'], ['Castillo', 'Noel', 'Mercado'],
    ['Aquino', 'Daniel', 'Reyes'], ['Mercado', 'Paolo', 'Cruz'], ['Torres', 'Francisco', 'Garcia'],
    ['Perez', 'Emmanuel', 'Ramos'], ['Lopez', 'Elena', 'Santos'], ['Domingo', 'Rico', 'Bautista'],
    ['Cruz', 'Eduardo', 'Diaz'], ['Rivera', 'Rommel', 'Aquino'], ['Fernandez', 'Nestor', 'Reyes'],
    ['Gonzales', 'Grace', 'Mercado'], ['Salazar', 'Joel', 'Cruz'], ['Pascual', 'Albert', 'Flores'],
    ['Valdez', 'Michael', 'Ramos'], ['Soriano', 'Leah', 'Cruz'], ['Alvarez', 'Ramon', 'Diaz'],
    ['Manalo', 'Teresa', 'Reyes'], ['Robles', 'Rafael', 'Lopez'], ['Ocampo', 'Nina', 'Santos'],
    ['De Guzman', 'Mario', 'Ramos'], ['Lim', 'Carmen', 'Flores'], ['Padilla', 'Ernesto', 'Cruz'],
    ['Magsino', 'Rosa', 'Garcia'], ['Aguilar', 'Dennis', 'Reyes'], ['Francisco', 'Lourdes', 'Aquino'],
    ['Tadeo', 'Victor', 'Santos'],
  ];
  if(!window.TMIS_PAGE)sample.push(...additionalNames.map(([lname, fname, mname], index) => {
    const batangas = index < 20;
    return {
      farmer_id: `FMR-2025-${String(index + 9).padStart(3, '0')}`, lname, fname, mname,
      gender: ['Elena', 'Grace', 'Leah', 'Teresa', 'Nina', 'Carmen', 'Rosa', 'Lourdes'].includes(fname) ? 'Female' : 'Male',
      province: batangas ? 'Batangas' : 'Laguna', district: batangas ? '3rd District' : '2nd District',
      municipality: batangas ? 'Tanauan City' : 'Calamba City',
      barangay: batangas ? ['San Antonio', 'Darasa', 'Balele', 'Trapiche', 'Mabini', 'Poblacion'][index % 6] : ['Canlubang', 'Poblacion', 'Parian'][index % 3],
      status: 'Active', associate_role: 'Member',
    };
  }));
  const read = name => { try { const value = JSON.parse(window.TmisStore.getItem(name) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const selected = new Set();
  let page = 1;
  let available = [];
  const locationKeys = ['province', 'district', 'municipality', 'barangay'];
  const columnKeys = ['farmer_id', 'name', 'barangay', 'municipality', 'province'];
  const tabs = [$('#faCurrentMembersTab'), $('#faAddMembersTab')];
  $('#faCurrentMembersPanel').append($('.fa-members-card'));
  const memberCount = $('#faMemberCount');
  const headerCount = $('#faRosterHeaderCount');
  const updateCount = () => { headerCount.textContent = memberCount.textContent; };
  new MutationObserver(updateCount).observe(memberCount, { childList: true, characterData: true, subtree: true });
  updateCount();
  function showTab(index) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showTab(index));
    tab.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const next = index === 0 ? 1 : 0;
      showTab(next);
      tabs[next].focus();
    });
  });
  function taggedIds() {
    const association = read(key).find(record => record.id === id);
    return new Set([...(association?.members || []), ...read('tmis-fa-members').filter(member => member.faId === id || member.association_id === id)]
      .map(member => String(member.farmer_id || member.id || '').toLowerCase()));
  }
  function isEligibleForAssociation(member, association) {
    const hasMembership = Boolean(member.association_id || member.associationMemberships?.length);
    const normalize = value => String(value || '').trim().toLocaleLowerCase();
    return !hasMembership
      && String(member.region_id || '') === String(association?.region_id || '')
      && normalize(member.municipality) !== ''
      && normalize(member.municipality) === normalize(association?.municipality);
  }
  function populate(select, values, label) {
    const current = select.value;
    select.replaceChildren(new Option(label, ''), ...[...new Set(values.filter(Boolean))].sort().map(value => new Option(value, value)));
    select.value = [...select.options].some(option => option.value === current) ? current : '';
  }
  function matchingFarmers() {
    const term = $('#faAvailableSearch').value.trim().toLowerCase();
    const columns = Object.fromEntries([...panel.querySelectorAll('[data-fa-column]')].map(input => [input.dataset.faColumn, input.value.trim().toLowerCase()]));
    return available.filter(member => {
      const name = [member.fname, member.mname, member.lname].filter(Boolean).join(' ');
      const values = { ...member, farmer_id: member.farmerNumber || member.farmer_id, name };
      return locationKeys.every(key => {
        const selected = $(`#faAvailable${key[0].toUpperCase()}${key.slice(1)}`).value;
        return !selected || member[key] === selected;
      }) && (!term || [member.farmerNumber, member.farmer_id, name, member.barangay, member.municipality, member.district, member.province].some(value => String(value || '').toLowerCase().includes(term)))
        && columnKeys.every(key => !columns[key] || String(values[key] || '').toLowerCase().includes(columns[key]));
    });
  }
  function render() {
    const tagged = taggedIds();
    const association = read(key).find(record => record.id === id);
    available = sample.filter(member => !tagged.has(member.farmer_id.toLowerCase()) && isEligibleForAssociation(member, association));
    [...selected].forEach(value => { if (tagged.has(value.toLowerCase())) selected.delete(value); });
    let scoped = available;
    locationKeys.forEach(key => {
      const select = $(`#faAvailable${key[0].toUpperCase()}${key.slice(1)}`);
      populate(select, scoped.map(member => member[key]), `All ${key === 'municipality' ? 'municipalities' : `${key}s`}`);
      if (select.value) scoped = scoped.filter(member => member[key] === select.value);
    });
    const filtered = matchingFarmers();
    const size = $('#faAvailablePageSize').value === 'all' ? Math.max(filtered.length, 1) : Number($('#faAvailablePageSize').value);
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.min(page, pages);
    const start = (page - 1) * size;
    $('#faAvailableRows').innerHTML = filtered.slice(start, start + size).map(member => `<tr><td><input type="checkbox" data-farmer-id="${escape(member.farmer_id)}" aria-label="Select ${escape([member.fname, member.lname].filter(Boolean).join(' '))}" ${selected.has(member.farmer_id) ? 'checked' : ''}></td><td>${escape(member.farmerNumber || member.farmer_id)}</td><td><strong>${escape([member.fname, member.mname, member.lname].filter(Boolean).join(' '))}</strong></td><td>${escape(member.barangay)}</td><td>${escape(member.municipality)}</td><td>${escape(member.province)}</td></tr>`).join('');
    $('#faAvailableEmpty').hidden = filtered.length > 0;
    $('#faAvailableCount').textContent = `${filtered.length} matching available`;
    $('#faSelectedCount').textContent = `${selected.size} selected`;
    $('#faAvailableRange').textContent = `Showing ${filtered.length ? start + 1 : 0}–${Math.min(start + size, filtered.length)} of ${filtered.length}`;
    $('#faAvailablePageStatus').textContent = `Page ${page} of ${pages}`;
    $('#faAvailablePrevious').disabled = page === 1;
    $('#faAvailableNext').disabled = page === pages;
    $('#faAddSelected').disabled = selected.size === 0 || !read(key).some(record => record.id === id);
    const all = $('#faAvailableSelectAll');
    all.checked = filtered.length > 0 && filtered.every(member => selected.has(member.farmer_id));
    all.indeterminate = !all.checked && filtered.some(member => selected.has(member.farmer_id));
    all.disabled = filtered.length === 0;
  }
  $('#faAvailableRows').addEventListener('change', event => {
    const input = event.target.closest('[data-farmer-id]');
    if (!input) return;
    if (input.checked) selected.add(input.dataset.farmerId); else selected.delete(input.dataset.farmerId);
    render();
  });
  $('#faAvailableSelectAll').addEventListener('change', event => {
    matchingFarmers().forEach(member => { if (event.target.checked) selected.add(member.farmer_id); else selected.delete(member.farmer_id); });
    render();
  });
  $('#faAddSelected').addEventListener('click', async () => {
    const records = read(key), index = records.findIndex(record => record.id === id);
    if (index < 0) return;
    const association = records[index];
    const chosen = sample.filter(member => selected.has(member.farmer_id) && !taggedIds().has(member.farmer_id.toLowerCase()) && isEligibleForAssociation(member, association));
    if (!chosen.length) return;
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const role = $('#faMemberRole').value.trim() || 'Member';
    records[index].members = [...(records[index].members || []), ...chosen.map(member => ({ ...member, associate_role: role, position: role, date_registered: date }))];
    try {
      await window.TmisStore.setItem(key, JSON.stringify(records));
      selected.clear();
      $('#faRosterMessage').textContent = `${chosen.length} farmer${chosen.length === 1 ? '' : 's'} tagged to this association.`;
      window.dispatchEvent(new StorageEvent('storage', { key }));
      showTab(0);
      render();
    } catch { $('#faRosterMessage').textContent = 'Could not save the selected farmers.'; }
  });
  $('#faAvailableSearch').addEventListener('input', () => { page = 1; render(); });
  locationKeys.forEach((key, index) => $(`#faAvailable${key[0].toUpperCase()}${key.slice(1)}`).addEventListener('change', () => {
    locationKeys.slice(index + 1).forEach(child => { $(`#faAvailable${child[0].toUpperCase()}${child.slice(1)}`).value = ''; });
    page = 1; render();
  }));
  panel.querySelectorAll('[data-fa-column]').forEach(input => input.addEventListener('input', () => { page = 1; render(); }));
  $('#faAvailablePageSize').addEventListener('change', () => { page = 1; render(); });
  $('#faAvailablePrevious').addEventListener('click', () => { page--; render(); });
  $('#faAvailableNext').addEventListener('click', () => { page++; render(); });
  $('#faAvailableClear').addEventListener('click', () => {
    $('#faAvailableSearch').value = '';
    locationKeys.forEach(key => { $(`#faAvailable${key[0].toUpperCase()}${key.slice(1)}`).value = ''; });
    panel.querySelectorAll('[data-fa-column]').forEach(input => { input.value = ''; });
    page = 1; render();
  });
  window.addEventListener('storage', event => { if (event.key === key || event.key === 'tmis-fa-members') render(); });
  showTab(0);
  render();
});
