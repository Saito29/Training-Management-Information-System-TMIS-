document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('faId');
  const storageKey = 'tmis-farmer-associations';
  const editForm = document.getElementById('faEditForm');
  if (!editForm) return;

  const locations = {
    Quezon: {
      '1st District': { Jomalig: ['Apad', 'Bukal', 'Talisoy'] },
      '2nd District': { Alabat: ['Villa Esperanza'], Perez: ['Villamanzano Sur'] },
    },
    Batangas: { '3rd District': { 'Tanauan City': ['San Antonio', 'Darasa', 'Balele', 'Trapiche', 'Mabini', 'Poblacion'] } },
    Laguna: { '1st District': { Pakil: ['Banilan', 'Casa Real'] } },
    Pangasinan: { '1st District': { Alaminos: ['Alos', 'Baleyadaan'] } },
  };
  const province = document.getElementById('faEditProvince');
  const district = document.getElementById('faEditDistrict');
  const municipality = document.getElementById('faEditMunicipality');
  const barangay = document.getElementById('faEditBarangay');
  const editMessage = document.getElementById('faEditMessage');
  const read = () => {
    try { const records = JSON.parse(window.TmisStore.getItem(storageKey) || '[]'); return Array.isArray(records) ? records : []; }
    catch { return []; }
  };
  const setMessage = (element, message, error = false) => { element.textContent = message; element.classList.toggle('is-error', error); };
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  document.getElementById('faEditDate').max = todayValue;

  const year = document.getElementById('faEditYear');
  year.add(new Option('Choose year', ''));
  for (let value = today.getFullYear() + 1; value >= 2000; value--) year.add(new Option(String(value), String(value)));

  function fill(select, values, prompt, selected = '') {
    const choices = [...new Set(values)];
    if (selected && !choices.includes(selected)) choices.push(selected);
    select.replaceChildren(new Option(prompt, ''), ...choices.map(value => new Option(value, value)));
    select.value = selected;
    select.disabled = choices.length === 0;
  }
  function setLocation(record = {}) {
    fill(province, Object.keys(locations).sort(), 'Choose province', record.province || '');
    fill(district, Object.keys(locations[province.value] || {}), 'Choose district', record.district || '');
    fill(municipality, Object.keys(locations[province.value]?.[district.value] || {}), 'Choose municipality', record.municipality || '');
    fill(barangay, locations[province.value]?.[district.value]?.[municipality.value] || [], 'Choose barangay', record.barangay || '');
  }
  province.addEventListener('change', () => {
    fill(district, Object.keys(locations[province.value] || {}), 'Choose district');
    fill(municipality, [], 'Choose district first');
    fill(barangay, [], 'Choose municipality first');
  });
  district.addEventListener('change', () => {
    fill(municipality, Object.keys(locations[province.value]?.[district.value] || {}), 'Choose municipality');
    fill(barangay, [], 'Choose municipality first');
  });
  municipality.addEventListener('change', () => {
    fill(barangay, locations[province.value]?.[district.value]?.[municipality.value] || [], 'Choose barangay');
  });

  function showRecord() {
    const record = read().find(item => item.id === id);
    if (!record) {
      setMessage(editMessage, 'Association not found. Open this page from the association list.', true);
      editForm.querySelectorAll('input, select, button').forEach(control => { control.disabled = true; });
      return;
    }
    document.getElementById('faEditId').value = record.id;
    editForm.querySelectorAll('[name]').forEach(control => {
      if (['province', 'district', 'municipality', 'barangay'].includes(control.name)) return;
      control.value = record[control.name] || (control.name === 'year_covered' ? String(record.registration_date || '').slice(0, 4) : '');
    });
    setLocation(record);
    document.getElementById('faOverviewTitle').textContent = record.association_name || 'Farmer Association';
    const badge = document.getElementById('faOverviewStatus');
    badge.textContent = record.status || 'Active';
    badge.classList.toggle('is-inactive', record.status === 'Inactive');
  }
  editForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!editForm.reportValidity()) return;
    const records = read();
    const index = records.findIndex(record => record.id === id);
    if (index < 0) { setMessage(editMessage, 'Association record is no longer available.', true); return; }
    records[index] = { ...records[index], ...Object.fromEntries(new FormData(editForm)) };
    try {
      await window.TmisStore.setItem(storageKey, JSON.stringify(records));
      setMessage(editMessage, 'Association information saved.');
      showRecord();
      window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
    } catch { setMessage(editMessage, 'Could not save the association. Refresh and try again.', true); }
  });
  showRecord();
});
