document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-fa-mode]');
  if (!root) return;
  const editing = root.dataset.faMode === 'edit';
  const id = new URLSearchParams(location.search).get('faId');
  const key = 'tmis-farmer-associations';
  const form = document.getElementById('faDetailForm');
  const fields = document.getElementById('faDetailFields');
  const labels = [
    ['id', 'Farmer Association ID'], ['status', 'Status'], ['association_name', 'Association name'], ['short_name', 'Shortened name'],
    ['organization_type', 'Organization type'], ['office', 'Office'], ['year_covered', 'Year covered'],
    ['registration_date', 'Registration date'], ['province', 'Province'], ['district', 'District'],
    ['municipality', 'Municipality'], ['barangay', 'Barangay'],
  ];
  const read = () => { try { const data = JSON.parse(window.TmisStore.getItem(key) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } };
  function showRecord() {
    const record = read().find(item => item.id === id);
    document.getElementById('faMissingRecord').hidden = Boolean(record);
    form.hidden = !record;
    if (!record) { document.getElementById('faDetailTitle').textContent = 'Association not found'; return; }
    document.getElementById('faDetailTitle').textContent = record.association_name;
    document.getElementById('faPageSubtitle').textContent = `${record.id} · ${record.province || 'Location unavailable'}`;
    const status = document.getElementById('faDetailStatus');
    status.textContent = record.status || 'Active';
    status.classList.toggle('is-inactive', record.status === 'Inactive');
    const editLink = document.getElementById('faEditLink');
    if (editLink) editLink.href = `edit-fa?faId=${encodeURIComponent(record.id)}`;
    fields.replaceChildren();
    labels.forEach(([name, title]) => {
      const wrapper = document.createElement('div'); wrapper.className = 'col-12 col-md-6';
      const label = document.createElement('label'); label.className = 'fa-detail-label'; label.textContent = title;
      const value = name === 'year_covered' ? String(record[name] || String(record.registration_date || '').slice(0, 4)) : record[name] || '';
      if (editing && name !== 'id') {
        const input = name === 'organization_type' || name === 'year_covered' || name === 'status' ? document.createElement('select') : document.createElement('input');
        input.className = 'form-control'; input.name = name; input.required = true;
        if (name === 'organization_type') ['Association', 'Cooperative'].forEach(option => input.add(new Option(option, option)));
        else if (name === 'status') ['Active', 'Inactive'].forEach(option => input.add(new Option(option, option)));
        else if (name === 'year_covered') { input.add(new Option('Choose year', '')); for (let year = new Date().getFullYear() + 1; year >= 2000; year--) input.add(new Option(String(year), String(year))); }
        else if (name === 'registration_date') { const today = new Date(); input.type = 'date'; input.max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; }
        else { input.type = 'text'; input.maxLength = name === 'association_name' ? 150 : name === 'short_name' ? 30 : 120; }
        input.value = value; label.append(input);
      } else {
        const display = document.createElement('div'); display.className = 'fa-detail-value'; display.textContent = value || '—'; label.append(display);
      }
      wrapper.append(label); fields.append(wrapper);
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!editing || !id || !form.reportValidity()) return;
    const records = read();
    const index = records.findIndex(item => item.id === id);
    if (index < 0) { showRecord(); return; }
    records[index] = { ...records[index], ...Object.fromEntries(new FormData(form)) };
    try {
      await window.TmisStore.setItem(key, JSON.stringify(records));
      document.getElementById('faDetailMessage').textContent = 'Association changes saved.';
      showRecord();
    } catch { document.getElementById('faDetailMessage').textContent = 'Could not save changes in this browser.'; }
  });
  window.addEventListener('storage', event => { if (event.key === key && !editing) showRecord(); });
  showRecord();
});
