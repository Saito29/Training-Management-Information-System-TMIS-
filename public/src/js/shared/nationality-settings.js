document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#nationalityRegistration');
  if (!form) return;

  const options = JSON.parse(document.querySelector('#registeredNationalities').textContent);
  const nameInput = form.elements.name;
  const submitButton = form.querySelector('[type="submit"]');
  const cancelButton = form.querySelector('[data-nationality-cancel]');
  const search = document.querySelector('#nationalitySearch');
  const pageSize = document.querySelector('#nationalityPageSize');
  const previous = document.querySelector('[data-nationality-previous]');
  const next = document.querySelector('[data-nationality-next]');
  const deleteModalElement = document.querySelector('#settingsDeleteModal');
  let editing = null;
  let saving = false;
  let page = 1;
  let sortField = 'label';
  let sortDirection = 'asc';

  function resetEdit() {
    editing = null;
    nameInput.value = '';
    cancelButton.hidden = true;
    form.querySelector('[data-nationality-submit-label]').textContent = 'Add nationality';
  }

  function updateSummary() {
    document.querySelector('[data-nationality-stat-total]').textContent = options.length;
    document.querySelector('[data-nationality-stat-used]').textContent = options.reduce((total, option) => total + Number(option.participant_count || 0), 0);
    document.querySelector('[data-nationality-stat-active]').textContent = options.filter(option => option.is_active).length;
    document.querySelector('[data-nationality-stat-inactive]').textContent = options.filter(option => !option.is_active).length;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase('en-PH');
    const filtered = options.filter(option => [option.label, option.value].join(' ').toLocaleLowerCase('en-PH').includes(query));
    const sortValues = { label: option => String(option.label || ''), participant_count: option => Number(option.participant_count || 0) };
    const getValue = sortValues[sortField] || sortValues.label;
    filtered.sort((left, right) => {
      const first = getValue(left), second = getValue(right);
      const comparison = typeof first === 'number' && typeof second === 'number'
        ? first - second
        : String(first).localeCompare(String(second), 'en-PH', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    document.querySelectorAll('[data-nationality-sort]').forEach(control => {
      const selected = control.dataset.nationalitySort === sortField;
      control.closest('th')?.setAttribute('aria-sort', selected ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
      const icon = control.querySelector('i');
      if (icon) icon.className = `bi ${selected ? (sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'}`;
    });
    const size = Number(pageSize.value), pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.max(1, Math.min(page, pages));
    const start = (page - 1) * size, body = document.querySelector('[data-nationality-rows]');
    body.replaceChildren();
    for (const option of filtered.slice(start, start + size)) {
      const row = document.createElement('tr'), actions = document.createElement('td');
      actions.className = 'directory-row-actions';
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'btn directory-icon-action is-edit'; edit.dataset.nationalityEdit = String(option.id);
      edit.title = `Edit ${option.label}`; edit.setAttribute('aria-label', edit.title);
      const editIcon = document.createElement('i'); editIcon.className = 'bi bi-pencil-square'; editIcon.setAttribute('aria-hidden', 'true'); edit.append(editIcon);
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'btn directory-icon-action is-delete'; remove.dataset.nationalityDelete = String(option.id);
      remove.title = Number(option.participant_count) > 0 ? `Cannot delete ${option.label}; it is used by saved participants` : `Delete ${option.label}`;
      remove.setAttribute('aria-label', remove.title); remove.disabled = Number(option.participant_count) > 0;
      const deleteIcon = document.createElement('i'); deleteIcon.className = 'bi bi-trash3'; deleteIcon.setAttribute('aria-hidden', 'true'); remove.append(deleteIcon);
      actions.append(edit, remove); row.append(actions);
      const nameCell = document.createElement('td'); nameCell.className = 'directory-primary-cell';
      const name = document.createElement('strong'); name.textContent = option.label;
      const detail = document.createElement('small'); detail.textContent = 'Participant registration option';
      nameCell.append(name, detail); row.append(nameCell);
      const countCell = document.createElement('td'); countCell.append(makeCount(option.participant_count)); row.append(countCell);
      const statusCell = document.createElement('td'), status = document.createElement('span');
      status.className = `directory-status ${option.is_active ? 'is-active' : 'is-inactive'}`;
      status.textContent = option.is_active ? 'Active' : 'Inactive'; statusCell.append(status); row.append(statusCell);
      body.append(row);
    }
    if (!filtered.length) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      cell.colSpan = 4; cell.className = 'directory-empty';
      cell.textContent = options.length ? 'No nationalities match your search.' : 'No nationality options have been added yet.';
      row.append(cell); body.append(row);
    }
    document.querySelector('[data-nationality-summary]').textContent = filtered.length
      ? `Showing ${start + 1}-${Math.min(start + size, filtered.length)} of ${filtered.length} nationalities; ${options.length} total`
      : `Showing 0 of ${options.length} nationalities`;
    document.querySelector('[data-nationality-page]').textContent = `Page ${page} of ${pages}`;
    previous.disabled = page === 1; next.disabled = page === pages; updateSummary();
  }

  function makeCount(count) {
    const badge = document.createElement('span');
    badge.className = 'directory-count-badge'; badge.textContent = Number(count || 0).toLocaleString('en-PH');
    badge.setAttribute('aria-label', `${badge.textContent} saved participant records`);
    return badge;
  }

  async function request(url, method, data = {}) {
    const response = await fetch(url, {
      method, credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': form.querySelector('[name="_token"]').value },
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error(Object.values(result?.errors || {}).flat()[0] || result?.message || 'Nationality could not be saved.');
    return result;
  }

  function confirmDelete(option) {
    const modal = bootstrap.Modal.getOrCreateInstance(deleteModalElement);
    deleteModalElement.querySelector('[data-settings-delete-record]').textContent = `“${option.label}” will be removed from participant registration options.`;
    deleteModalElement.querySelector('[data-settings-delete-note]').textContent = 'This action cannot be undone. Nationalities used by saved participant records are protected from deletion.';
    return new Promise(resolve => {
      const confirmButton = deleteModalElement.querySelector('[data-settings-delete-confirm]');
      const finish = value => {
        confirmButton.removeEventListener('click', onConfirm);
        deleteModalElement.removeEventListener('hidden.bs.modal', onDismiss);
        resolve(value);
      };
      const onConfirm = () => { finish(true); modal.hide(); };
      const onDismiss = () => finish(false);
      confirmButton.addEventListener('click', onConfirm, { once: true });
      deleteModalElement.addEventListener('hidden.bs.modal', onDismiss, { once: true });
      modal.show();
    });
  }

  for (const [control, event] of [[search, 'input'], [pageSize, 'change']]) control.addEventListener(event, () => { page = 1; render(); });
  previous.addEventListener('click', () => { page--; render(); });
  next.addEventListener('click', () => { page++; render(); });
  document.querySelectorAll('[data-nationality-sort]').forEach(control => control.addEventListener('click', () => {
    const field = control.dataset.nationalitySort;
    sortDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    sortField = field; page = 1; render();
  }));
  document.querySelector('[data-nationality-rows]').addEventListener('click', async event => {
    const control = event.target.closest('[data-nationality-edit],[data-nationality-delete]');
    if (!control || saving) return;
    const option = options.find(row => String(row.id) === (control.dataset.nationalityEdit || control.dataset.nationalityDelete));
    if (!option) return;
    if (control.dataset.nationalityEdit) {
      editing = option; nameInput.value = option.label; cancelButton.hidden = false;
      form.querySelector('[data-nationality-submit-label]').textContent = 'Update nationality';
      form.scrollIntoView({ block: 'start', behavior: 'smooth' }); nameInput.focus();
      return;
    }
    if (Number(option.participant_count) > 0 || !await confirmDelete(option)) return;
    saving = true; control.disabled = true;
    try {
      const result = await request(`${form.action}/${option.id}`, 'DELETE');
      options.splice(options.indexOf(option), 1); render(); window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Nationality could not be deleted.', 'error');
    } finally { saving = false; control.disabled = false; }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !form.reportValidity()) return;
    saving = true; submitButton.disabled = true; submitButton.setAttribute('aria-busy', 'true');
    try {
      const target = editing;
      const result = await request(target ? `${form.action}/${target.id}` : form.action, target ? 'PATCH' : 'POST', { name: nameInput.value.trim() });
      if (!result.option) throw new Error('The server did not return the saved nationality.');
      const index = options.findIndex(item => String(item.id) === String(result.option.id));
      if (index < 0) options.push(result.option); else options[index] = result.option;
      resetEdit(); search.value = ''; page = Math.max(1, Math.ceil(options.length / Number(pageSize.value)));
      render(); window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Nationality could not be saved.', 'error');
    } finally { saving = false; submitButton.disabled = false; submitButton.removeAttribute('aria-busy'); }
  });
  cancelButton.addEventListener('click', resetEdit);
  render();
});
