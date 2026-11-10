document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.querySelector('#profileVisibilityDialog');
  if (!dialog) return;

  document.querySelectorAll('.user-menu').forEach(menu => {
    if (menu.querySelector('[data-open-profile-visibility]')) return;

    const logsItem = [...menu.querySelectorAll('.dropdown-item')]
      .find(item => item.textContent.trim() === 'Logs')
      ?.closest('li');
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    const icon = document.createElement('i');
    const label = document.createElement('span');

    button.type = 'button';
    button.className = 'dropdown-item';
    button.dataset.openProfileVisibility = '';
    icon.className = 'bi bi-globe2';
    icon.setAttribute('aria-hidden', 'true');
    label.textContent = 'Data visibility';
    button.append(icon, label);
    listItem.append(button);

    if (logsItem) {
      logsItem.after(listItem);
    } else {
      menu.querySelector('.dropdown-divider')?.closest('li')?.before(listItem);
    }
  });

  const regionsContainer = document.querySelector('#profileVisibilityRegions');
  const officesContainer = document.querySelector('#profileVisibilityOffices');
  const regionSearch = document.querySelector('#profileVisibilityRegionSearch');
  const officeSearch = document.querySelector('#profileVisibilityOfficeSearch');
  const error = document.querySelector('#profileVisibilityError');
  const saveButton = document.querySelector('#saveProfileVisibility');
  let visibilityTrigger = null;
  let regions = [];
  let offices = [];
  let selectedRegions = new Set();
  let selectedOffices = new Set();
  let saving = false;

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const checkedValues = (items, selected, idField) => items.filter(item => selected.has(String(item[idField])));

  function optionLabel(item, kind) {
    const label = make('label', 'profile-visibility-option');
    if (kind === 'office') label.dataset.regionId = String(item.region_id);
    const input = make('input');
    input.type = 'checkbox';
    input.value = String(kind === 'region' ? item.region_id : item.org_id);
    input.checked = kind === 'region' ? selectedRegions.has(input.value) : selectedOffices.has(input.value);
    const text = make('span', '', item.name);
    if (kind === 'office') {
      const region = regions.find(record => String(record.region_id) === String(item.region_id));
      text.append(make('small', '', region?.name || 'Region unavailable'));
    }
    label.append(input, text);
    input.addEventListener('change', () => {
      const target = kind === 'region' ? selectedRegions : selectedOffices;
      if (input.checked) target.add(input.value);
      else target.delete(input.value);
      refreshLists();
    });
    return label;
  }

  function renderOptions() {
    regionsContainer.replaceChildren(...regions.map(region => optionLabel(region, 'region')));
    officesContainer.replaceChildren(...offices.map(office => optionLabel(office, 'office')));
    regionsContainer.append(make('p', 'profile-visibility-empty', 'No matching regions.'));
    officesContainer.append(make('p', 'profile-visibility-empty', 'No matching offices.'));
    refreshLists();
  }

  function updateSelectButton(button, items, selected, idField) {
    const everySelected = items.length > 0 && items.every(item => selected.has(String(item[idField])));
    button.textContent = everySelected ? 'Clear all' : 'Select all';
    button.setAttribute('aria-pressed', String(everySelected));
  }

  function refreshLists() {
    const allowedRegions = selectedRegions;
    const scopedOffices = offices.filter(office => !allowedRegions.size || allowedRegions.has(String(office.region_id)));
    if (allowedRegions.size) {
      const allowedOfficeIds = new Set(scopedOffices.map(office => String(office.org_id)));
      selectedOffices = new Set([...selectedOffices].filter(id => allowedOfficeIds.has(id)));
    }
    regionsContainer.querySelectorAll('.profile-visibility-option').forEach(label => {
      label.hidden = !label.textContent.toLocaleLowerCase('en-PH').includes(regionSearch.value.trim().toLocaleLowerCase('en-PH'));
    });
    officesContainer.querySelectorAll('.profile-visibility-option').forEach(label => {
      const input = label.querySelector('input');
      const allowed = !allowedRegions.size || allowedRegions.has(label.dataset.regionId);
      input.disabled = !allowed;
      if (!allowed) input.checked = false;
      label.hidden = !allowed || !label.textContent.toLocaleLowerCase('en-PH').includes(officeSearch.value.trim().toLocaleLowerCase('en-PH'));
    });
    document.querySelector('#profileVisibilityRegionCount').textContent = selectedRegions.size ? `${selectedRegions.size} selected` : 'All regions';
    const selectedOfficeCount = scopedOffices.filter(office => selectedOffices.has(String(office.org_id))).length;
    document.querySelector('#profileVisibilityOfficeCount').textContent = selectedOfficeCount ? `${selectedOfficeCount} selected` : selectedRegions.size ? 'All offices in selected regions' : 'All offices';
    document.querySelector('#profileVisibilityOfficeScope').textContent = selectedRegions.size ? 'Offices related to the selected regions' : 'All available offices';
    regionsContainer.querySelector('.profile-visibility-empty').hidden = [...regionsContainer.querySelectorAll('.profile-visibility-option')].some(label => !label.hidden);
    officesContainer.querySelector('.profile-visibility-empty').hidden = [...officesContainer.querySelectorAll('.profile-visibility-option')].some(label => !label.hidden);
    updateSelectButton(document.querySelector('[data-visibility-select="regions"]'), regions, selectedRegions, 'region_id');
    updateSelectButton(document.querySelector('[data-visibility-select="offices"]'), scopedOffices, selectedOffices, 'org_id');
  }

  async function loadOptions(preserveSelection = false) {
    const previousRegions = preserveSelection ? selectedRegions : new Set();
    const previousOffices = preserveSelection ? selectedOffices : new Set();
    const response = await fetch(dialog.dataset.loadUrl, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Visibility options could not be loaded.');
    regions = Array.isArray(result.regions) ? result.regions : [];
    offices = Array.isArray(result.offices) ? result.offices : [];
    selectedRegions = new Set((preserveSelection ? [...previousRegions] : result.selectedRegions || []).map(String));
    selectedOffices = new Set((preserveSelection ? [...previousOffices] : result.selectedOffices || []).map(String));
    renderOptions();
  }

  document.querySelectorAll('[data-visibility-select]').forEach(button => button.addEventListener('click', () => {
    const kind = button.dataset.visibilitySelect;
    const selected = kind === 'regions' ? selectedRegions : selectedOffices;
    const items = kind === 'regions'
      ? regions
      : offices.filter(office => !selectedRegions.size || selectedRegions.has(String(office.region_id)));
    const idField = kind === 'regions' ? 'region_id' : 'org_id';
    const clear = items.length > 0 && items.every(item => selected.has(String(item[idField])));
    items.forEach(item => clear ? selected.delete(String(item[idField])) : selected.add(String(item[idField])));
    renderOptions();
  }));
  document.querySelectorAll('[data-visibility-clear]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.visibilityClear === 'regions') selectedRegions.clear();
    else selectedOffices.clear();
    if (button.dataset.visibilityClear === 'regions') regionSearch.value = '';
    else officeSearch.value = '';
    renderOptions();
  }));
  regionSearch.addEventListener('input', refreshLists);
  officeSearch.addEventListener('input', refreshLists);
  document.querySelector('#refreshProfileVisibilityOffices').addEventListener('click', async () => {
    officeSearch.value = '';
    const refreshButton = document.querySelector('#refreshProfileVisibilityOffices');
    const originalLabel = refreshButton.innerHTML;
    refreshButton.disabled = true;
    refreshButton.setAttribute('aria-busy', 'true');
    officesContainer.setAttribute('aria-busy', 'true');
    officesContainer.replaceChildren(make('p', 'profile-visibility-loading', 'Refreshing offices…'));
    try {
      await loadOptions(true);
      officesContainer.scrollTop = 0;
    } catch (loadError) {
      officesContainer.replaceChildren(make('p', 'profile-visibility-empty', 'Offices could not be refreshed.'));
      error.textContent = loadError.message || 'Visibility options could not be refreshed.';
      error.hidden = false;
    } finally {
      refreshButton.disabled = false;
      refreshButton.removeAttribute('aria-busy');
      refreshButton.innerHTML = originalLabel;
      officesContainer.removeAttribute('aria-busy');
    }
  });

  function close() {
    if (dialog.open) dialog.close();
    const dropdownToggle = visibilityTrigger?.closest('.app-profile')?.querySelector('.profile-button');
    (dropdownToggle || visibilityTrigger)?.focus();
  }
  document.addEventListener('click', async event => {
    const trigger = event.target.closest('[data-open-profile-visibility]');
    if (!trigger) return;
    visibilityTrigger = trigger;
    const dropdownToggle = trigger.closest('.app-profile')?.querySelector('[data-bs-toggle="dropdown"]');
    window.bootstrap?.Dropdown?.getInstance(dropdownToggle)?.hide();
    error.hidden = true;
    dialog.showModal();
    try {
      await loadOptions();
      regionSearch.focus();
    } catch (loadError) {
      error.textContent = loadError.message || 'Visibility options could not be loaded.';
      error.hidden = false;
    }
  });
  document.querySelector('#closeProfileVisibility').addEventListener('click', close);
  document.querySelector('#cancelProfileVisibility').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  document.querySelector('#profileVisibilityForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    saving = true;
    error.hidden = true;
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
    try {
      const payload = {
        region_ids: checkedValues(regions, selectedRegions, 'region_id').map(item => Number(item.region_id)),
        office_ids: checkedValues(offices, selectedOffices, 'org_id').map(item => Number(item.org_id)),
      };
      const response = await fetch(dialog.dataset.saveUrl, {
        method: 'POST', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors || {}).flat()[0] || result.message || 'Visibility settings could not be saved.');
      location.reload();
    } catch (saveError) {
      error.textContent = saveError.message || 'Visibility settings could not be saved.';
      error.hidden = false;
    } finally {
      saving = false;
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
    }
  });
});
