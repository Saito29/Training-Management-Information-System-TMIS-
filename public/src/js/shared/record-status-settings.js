document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#recordStatusRegistration');
  if (!form) return;

  const statuses = JSON.parse(document.querySelector('#registeredRecordStatuses').textContent);
  const nameInput = form.elements.name;
  const descriptionInput = form.elements.description;
  const search = document.querySelector('#recordStatusSearch');
  const pageSize = document.querySelector('#recordStatusPageSize');
  const refresh = document.querySelector('[data-record-status-refresh]');
  const previous = document.querySelector('[data-record-status-previous]');
  const next = document.querySelector('[data-record-status-next]');
  const body = document.querySelector('[data-record-status-rows]');
  const editModalElement = document.querySelector('#recordStatusEditModal');
  const editForm = document.querySelector('#recordStatusEditForm');
  const editNameInput = editForm.elements.name;
  const editDescriptionInput = editForm.elements.description;
  const editActiveInput = editForm.elements.is_active;
  const editModal = bootstrap.Modal.getOrCreateInstance(editModalElement);
  const deleteModalElement = document.querySelector('#settingsDeleteModal');
  let editing = null;
  let saving = false;
  let page = 1;
  let sortField = 'name';
  let sortDirection = 'asc';

  const isActive = status => status.is_active === true || status.is_active === 1 || status.is_active === '1';

  function updateSummary() {
    document.querySelector('[data-record-status-stat-total]').textContent = String(statuses.length);
    document.querySelector('[data-record-status-stat-used]').textContent = String(statuses.reduce((total, status) => total + Number(status.usage_count || 0), 0));
    document.querySelector('[data-record-status-stat-active]').textContent = String(statuses.filter(isActive).length);
    document.querySelector('[data-record-status-stat-inactive]').textContent = String(statuses.filter(status => !isActive(status)).length);
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase('en-PH');
    const filtered = statuses.filter(status => [status.name, status.description || ''].join(' ').toLocaleLowerCase('en-PH').includes(query));
    filtered.sort((left, right) => {
      const first = sortField === 'usage_count' ? Number(left.usage_count || 0) : String(left.name || '');
      const second = sortField === 'usage_count' ? Number(right.usage_count || 0) : String(right.name || '');
      const comparison = typeof first === 'number' && typeof second === 'number'
        ? first - second
        : String(first).localeCompare(String(second), 'en-PH', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    document.querySelectorAll('[data-record-status-sort]').forEach(control => {
      const selected = control.dataset.recordStatusSort === sortField;
      control.closest('th')?.setAttribute('aria-sort', selected ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
      const icon = control.querySelector('i');
      if (icon) icon.className = `bi ${selected ? (sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'}`;
    });

    const size = Number(pageSize.value);
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.max(1, Math.min(page, pages));
    const start = (page - 1) * size;
    body.replaceChildren();

    for (const status of filtered.slice(start, start + size)) {
      const row = document.createElement('tr');
      const actions = document.createElement('td');
      actions.className = 'directory-row-actions';

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn directory-icon-action is-edit';
      edit.dataset.recordStatusEdit = String(status.id);
      edit.title = `Edit ${status.name}`;
      edit.setAttribute('aria-label', edit.title);
      const editIcon = document.createElement('i');
      editIcon.className = 'bi bi-pencil-square';
      editIcon.setAttribute('aria-hidden', 'true');
      edit.append(editIcon);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn directory-icon-action is-delete';
      remove.dataset.recordStatusDelete = String(status.id);
      remove.title = Number(status.usage_count) > 0
        ? `Cannot delete ${status.name}; it is assigned to records`
        : `Delete ${status.name}`;
      remove.setAttribute('aria-label', remove.title);
      remove.disabled = Number(status.usage_count) > 0;
      const deleteIcon = document.createElement('i');
      deleteIcon.className = 'bi bi-trash3';
      deleteIcon.setAttribute('aria-hidden', 'true');
      remove.append(deleteIcon);
      actions.append(edit, remove);
      row.append(actions);

      const nameCell = document.createElement('td');
      nameCell.className = 'directory-primary-cell';
      const name = document.createElement('strong');
      name.textContent = status.name;
      const detail = document.createElement('small');
      detail.textContent = status.description || 'Shared across farmers, associations, trainings, and resource persons';
      nameCell.append(name, detail);
      row.append(nameCell);

      const countCell = document.createElement('td');
      const count = document.createElement('span');
      count.className = 'directory-count-badge';
      count.textContent = Number(status.usage_count || 0).toLocaleString('en-PH');
      count.setAttribute('aria-label', `${count.textContent} assigned records`);
      const breakdown = document.createElement('small');
      breakdown.className = 'd-block mt-1 text-body-secondary';
      breakdown.textContent = `${Number(status.farmer_count || 0)} farmers · ${Number(status.association_count || 0)} associations · ${Number(status.training_count || 0)} trainings · ${Number(status.resource_person_count || 0)} resource persons`;
      countCell.append(count, breakdown);
      row.append(countCell);

      const stateCell = document.createElement('td');
      const state = document.createElement('span');
      state.className = `directory-status ${isActive(status) ? 'is-active' : 'is-inactive'}`;
      state.textContent = isActive(status) ? 'Available' : 'Inactive';
      stateCell.append(state);
      row.append(stateCell);
      body.append(row);
    }

    if (!filtered.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.className = 'directory-empty';
      cell.textContent = statuses.length ? 'No statuses match your search.' : 'No additional statuses have been added yet.';
      row.append(cell);
      body.append(row);
    }

    document.querySelector('[data-record-status-summary]').textContent = filtered.length
      ? `Showing ${start + 1}-${Math.min(start + size, filtered.length)} of ${filtered.length} statuses; ${statuses.length} total`
      : `Showing 0 of ${statuses.length} statuses`;
    document.querySelector('[data-record-status-page]').textContent = `Page ${page} of ${pages}`;
    previous.disabled = page === 1;
    next.disabled = page === pages;
    updateSummary();
  }

  async function request(url, method, data = {}) {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': form.querySelector('[name="_token"]').value,
      },
      ...(method === 'GET' ? {} : { body: JSON.stringify(data) }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) {
      throw new Error(Object.values(result?.errors || {}).flat()[0] || result?.message || 'Status could not be saved.');
    }
    return result;
  }

  function confirmDelete(status) {
    const modal = bootstrap.Modal.getOrCreateInstance(deleteModalElement);
    const confirmButton = deleteModalElement.querySelector('[data-settings-delete-confirm]');
    deleteModalElement.querySelector('[data-settings-delete-record]').textContent = `“${status.name}” will be removed from the shared status directory.`;
    deleteModalElement.querySelector('[data-settings-delete-note]').textContent = 'This action cannot be undone. Statuses assigned to saved records are protected from deletion.';

    return new Promise(resolve => {
      const finish = value => {
        confirmButton.removeEventListener('click', onConfirm);
        deleteModalElement.removeEventListener('hidden.bs.modal', onDismiss);
        resolve(value);
      };
      const onConfirm = () => {
        finish(true);
        modal.hide();
      };
      const onDismiss = () => finish(false);
      confirmButton.addEventListener('click', onConfirm, { once: true });
      deleteModalElement.addEventListener('hidden.bs.modal', onDismiss, { once: true });
      modal.show();
    });
  }

  for (const [control, event] of [[search, 'input'], [pageSize, 'change']]) {
    control.addEventListener(event, () => {
      page = 1;
      render();
    });
  }
  previous.addEventListener('click', () => {
    page -= 1;
    render();
  });
  next.addEventListener('click', () => {
    page += 1;
    render();
  });
  refresh.addEventListener('click', async () => {
    if (saving || refresh.disabled) return;
    refresh.disabled = true;
    refresh.setAttribute('aria-busy', 'true');
    try {
      const result = await request(form.action, 'GET');
      if (!Array.isArray(result.statuses)) throw new Error('The server did not return the statuses.');
      statuses.splice(0, statuses.length, ...result.statuses);
      render();
      window.TmisToast?.show('Statuses refreshed.', 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Statuses could not be refreshed.', 'error');
    } finally {
      refresh.disabled = false;
      refresh.removeAttribute('aria-busy');
    }
  });
  document.querySelectorAll('[data-record-status-sort]').forEach(control => control.addEventListener('click', () => {
    const field = control.dataset.recordStatusSort;
    sortDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    sortField = field;
    page = 1;
    render();
  }));

  body.addEventListener('click', async event => {
    const control = event.target.closest('[data-record-status-edit],[data-record-status-delete]');
    if (!control || saving) return;
    const status = statuses.find(item => String(item.id) === (control.dataset.recordStatusEdit || control.dataset.recordStatusDelete));
    if (!status) return;

    if (control.dataset.recordStatusEdit) {
      editing = status;
      editNameInput.value = status.name;
      editDescriptionInput.value = status.description || '';
      editActiveInput.checked = isActive(status);
      editModal.show();
      editNameInput.focus();
      return;
    }

    if (Number(status.usage_count) > 0 || !await confirmDelete(status)) return;
    saving = true;
    control.disabled = true;
    try {
      const result = await request(`${form.action}/${status.id}`, 'DELETE');
      statuses.splice(statuses.indexOf(status), 1);
      render();
      window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Status could not be deleted.', 'error');
    } finally {
      saving = false;
      control.disabled = false;
    }
  });

  editModalElement.addEventListener('hidden.bs.modal', () => {
    editing = null;
    editForm.reset();
  });
  editForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !editing || !editForm.reportValidity()) return;
    saving = true;
    const submitButton = editForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const result = await request(`${form.action}/${editing.id}`, 'PATCH', {
        name: editNameInput.value.trim(),
        description: editDescriptionInput.value.trim(),
        is_active: editActiveInput.checked,
      });
      if (!result.status) throw new Error('The server did not return the updated status.');
      const index = statuses.findIndex(item => String(item.id) === String(result.status.id));
      statuses[index] = result.status;
      search.value = '';
      page = Math.max(1, Math.ceil(statuses.length / Number(pageSize.value)));
      render();
      editModal.hide();
      window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Status could not be updated.', 'error');
    } finally {
      saving = false;
      submitButton.disabled = false;
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !form.reportValidity()) return;
    saving = true;
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    try {
      const result = await request(form.action, 'POST', {
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
      });
      if (!result.status) throw new Error('The server did not return the new status.');
      statuses.push(result.status);
      form.reset();
      search.value = '';
      page = Math.max(1, Math.ceil(statuses.length / Number(pageSize.value)));
      render();
      window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Status could not be added.', 'error');
    } finally {
      saving = false;
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });

  render();
});
