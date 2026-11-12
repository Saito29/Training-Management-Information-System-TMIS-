document.addEventListener('DOMContentLoaded', () => {
  const id = window.TmisStore.selectedId();
  const storageKey = 'tmis-farmer-associations';
  const editForm = document.getElementById('faEditForm');
  if (!editForm) return;

  const pageUrl = new URL(window.location.href);
  if (pageUrl.searchParams.get('associationUpdated') === '1') {
    pageUrl.searchParams.delete('associationUpdated');
    window.history.replaceState(null, '', pageUrl);
    window.TmisToast?.show('Association information updated successfully.', 'success');
  }

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
  const regionSelect = document.getElementById('faEditRegion');
  const officeSelect = document.getElementById('faEditOffice');
  const editMessage = document.getElementById('faEditMessage');
  const registrationDateInput = document.getElementById('faEditDate');
  const registrationDateReadable = document.getElementById('faEditDateReadable');
  const pageData = window.TMIS_PAGE || {};
  const registration = pageData.registration || {};
  const read = () => {
    try { const records = JSON.parse(window.TmisStore.getItem(storageKey) || '[]'); return Array.isArray(records) ? records : []; }
    catch { return []; }
  };
  const setMessage = (element, message, error = false) => { element.textContent = message; element.classList.toggle('is-error', error); };
  const isInScope = (ids, id) => ids == null || ids.some(value => String(value) === String(id));
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  registrationDateInput.max = todayValue;
  function showReadableRegistrationDate() {
    if (!registrationDateInput.value) {
      registrationDateReadable.textContent = '';
      return;
    }
    const date = new Date(`${registrationDateInput.value}T00:00:00`);
    registrationDateReadable.textContent = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  registrationDateInput.addEventListener('change', showReadableRegistrationDate);

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
  function setRegistrationLocation(record = {}) {
    const regions = (registration.regions || []).filter(region => isInScope(registration.regionIds, region.region_id));
    regionSelect.replaceChildren(new Option(regions.length ? 'Saved registration region' : 'Region unavailable', ''));
    regionSelect.append(...regions.map(region => new Option(region.name, String(region.region_id))));
    if (record.region_id && !regions.some(region => String(region.region_id) === String(record.region_id))) {
      regionSelect.append(new Option(record.region || 'Saved region', String(record.region_id)));
    }
    regionSelect.value = String(record.region_id || '');

    const offices = (registration.offices || []).filter(office =>
      String(office.region_id) === regionSelect.value
      && isInScope(registration.officeIds, office.org_id)
    );
    officeSelect.replaceChildren(new Option(offices.length ? 'Saved registration office' : 'Office unavailable', ''));
    officeSelect.append(...offices.map(office => new Option(office.name, String(office.org_id))));
    if (record.org_id && !offices.some(office => String(office.org_id) === String(record.org_id))) {
      officeSelect.append(new Option(record.office || 'Saved office', String(record.org_id)));
    }
    officeSelect.value = String(record.org_id || '');
    regionSelect.disabled = true;
    officeSelect.disabled = true;
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
      if (['region_id', 'org_id', 'province', 'district', 'municipality', 'barangay'].includes(control.name)) return;
      control.value = record[control.name] || (control.name === 'year_covered' ? String(record.registration_date || '').slice(0, 4) : '');
    });
    setRegistrationLocation(record);
    setLocation(record);
    showReadableRegistrationDate();
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
    } catch (error) {
      setMessage(editMessage, error instanceof Error ? error.message : 'Could not save the association. Refresh and try again.', true);
      return;
    }
    pageUrl.searchParams.set('associationUpdated', '1');
    window.location.assign(pageUrl);
  });
  showRecord();
});
