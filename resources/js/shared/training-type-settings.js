document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#trainingTypeRegistration');
  if (!form) return;

  const options = JSON.parse(document.querySelector('#registeredTrainingTypes').textContent);
  const nameInput = form.elements.name;
  const search = document.querySelector('#trainingTypeSearch');
  const pageSize = document.querySelector('#trainingTypePageSize');
  const refresh = document.querySelector('[data-training-type-refresh]');
  const previous = document.querySelector('[data-training-type-previous]');
  const next = document.querySelector('[data-training-type-next]');
  const body = document.querySelector('[data-training-type-rows]');
  const editModalElement = document.querySelector('#trainingTypeEditModal');
  const editForm = document.querySelector('#trainingTypeEditForm');
  const editNameInput = editForm.elements.name;
  const editModal = bootstrap.Modal.getOrCreateInstance(editModalElement);
  const deleteModalElement = document.querySelector('#settingsDeleteModal');
  let editing = null;
  let saving = false;
  let page = 1;
  let sortField = 'label';
  let sortDirection = 'asc';

  const isActive = option => option.is_active === true || option.is_active === 1 || option.is_active === '1';

  function updateSummary() {
    document.querySelector('[data-training-type-stat-total]').textContent = String(options.length);
    document.querySelector('[data-training-type-stat-used]').textContent = String(options.reduce((total, option) => total + Number(option.training_count || 0), 0));
    document.querySelector('[data-training-type-stat-active]').textContent = String(options.filter(isActive).length);
    document.querySelector('[data-training-type-stat-inactive]').textContent = String(options.filter(option => !isActive(option)).length);
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase('en-PH');
    const filtered = options.filter(option => [option.label, option.value].join(' ').toLocaleLowerCase('en-PH').includes(query));
    filtered.sort((left, right) => {
      const first = sortField === 'training_count' ? Number(left.training_count || 0) : String(left.label || '');
      const second = sortField === 'training_count' ? Number(right.training_count || 0) : String(right.label || '');
      const comparison = typeof first === 'number' && typeof second === 'number'
        ? first - second
        : String(first).localeCompare(String(second), 'en-PH', { numeric: true, sensitivity: 'base' });

      return sortDirection === 'asc' ? comparison : -comparison;
    });
    document.querySelectorAll('[data-training-type-sort]').forEach(control => {
      const selected = control.dataset.trainingTypeSort === sortField;
      control.closest('th')?.setAttribute('aria-sort', selected ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
      const icon = control.querySelector('i');
      if (icon) icon.className = `bi ${selected ? (sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'}`;
    });

    const size = Number(pageSize.value);
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.max(1, Math.min(page, pages));
    const start = (page - 1) * size;
    body.replaceChildren();

    for (const option of filtered.slice(start, start + size)) {
      const row = document.createElement('tr');
      const actions = document.createElement('td');
      actions.className = 'directory-row-actions';

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn directory-icon-action is-edit';
      edit.dataset.trainingTypeEdit = String(option.id);
      edit.title = `Edit ${option.label}`;
      edit.setAttribute('aria-label', edit.title);
      const editIcon = document.createElement('i');
      editIcon.className = 'bi bi-pencil-square';
      editIcon.setAttribute('aria-hidden', 'true');
      edit.append(editIcon);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn directory-icon-action is-delete';
      remove.dataset.trainingTypeDelete = String(option.id);
      remove.title = Number(option.training_count) > 0
        ? `Cannot delete ${option.label}; it is used by saved trainings`
        : `Delete ${option.label}`;
      remove.setAttribute('aria-label', remove.title);
      remove.disabled = Number(option.training_count) > 0;
      const deleteIcon = document.createElement('i');
      deleteIcon.className = 'bi bi-trash3';
      deleteIcon.setAttribute('aria-hidden', 'true');
      remove.append(deleteIcon);
      actions.append(edit, remove);
      row.append(actions);

      const nameCell = document.createElement('td');
      nameCell.className = 'directory-primary-cell';
      const name = document.createElement('strong');
      name.textContent = option.label;
      const detail = document.createElement('small');
      detail.textContent = 'Training registration choice';
      nameCell.append(name, detail);
      row.append(nameCell);

      const countCell = document.createElement('td');
      const count = document.createElement('span');
      count.className = 'directory-count-badge';
      count.textContent = Number(option.training_count || 0).toLocaleString('en-PH');
      count.setAttribute('aria-label', `${count.textContent} saved training records`);
      countCell.append(count);
      row.append(countCell);

      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.className = `directory-status ${isActive(option) ? 'is-active' : 'is-inactive'}`;
      status.textContent = isActive(option) ? 'Active' : 'Inactive';
      statusCell.append(status);
      row.append(statusCell);
      body.append(row);
    }

    if (!filtered.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.className = 'directory-empty';
      cell.textContent = options.length ? 'No training types match your search.' : 'No training types have been added yet.';
      row.append(cell);
      body.append(row);
    }

    document.querySelector('[data-training-type-summary]').textContent = filtered.length
      ? `Showing ${start + 1}-${Math.min(start + size, filtered.length)} of ${filtered.length} training types; ${options.length} total`
      : `Showing 0 of ${options.length} training types`;
    document.querySelector('[data-training-type-page]').textContent = `Page ${page} of ${pages}`;
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
      throw new Error(Object.values(result?.errors || {}).flat()[0] || result?.message || 'Training type could not be saved.');
    }

    return result;
  }

  function confirmDelete(option) {
    const modal = bootstrap.Modal.getOrCreateInstance(deleteModalElement);
    const confirmButton = deleteModalElement.querySelector('[data-settings-delete-confirm]');
    deleteModalElement.querySelector('[data-settings-delete-record]').textContent = `“${option.label}” will be removed from training registration choices.`;
    deleteModalElement.querySelector('[data-settings-delete-note]').textContent = 'This action cannot be undone. Training types linked to saved training records are protected from deletion.';

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
      if (!Array.isArray(result.options)) throw new Error('The server did not return the training types.');
      options.splice(0, options.length, ...result.options);
      render();
      window.TmisToast?.show('Training types refreshed.', 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Training types could not be refreshed.', 'error');
    } finally {
      refresh.disabled = false;
      refresh.removeAttribute('aria-busy');
    }
  });
  document.querySelectorAll('[data-training-type-sort]').forEach(control => control.addEventListener('click', () => {
    const field = control.dataset.trainingTypeSort;
    sortDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    sortField = field;
    page = 1;
    render();
  }));

  body.addEventListener('click', async event => {
    const control = event.target.closest('[data-training-type-edit],[data-training-type-delete]');
    if (!control || saving) return;
    const option = options.find(row => String(row.id) === (control.dataset.trainingTypeEdit || control.dataset.trainingTypeDelete));
    if (!option) return;

    if (control.dataset.trainingTypeEdit) {
      editing = option;
      editNameInput.value = option.label;
      editModal.show();
      editNameInput.focus();
      return;
    }

    if (Number(option.training_count) > 0 || !await confirmDelete(option)) return;
    saving = true;
    control.disabled = true;
    try {
      const result = await request(`${form.action}/${option.id}`, 'DELETE');
      options.splice(options.indexOf(option), 1);
      render();
      window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Training type could not be deleted.', 'error');
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
      const result = await request(`${form.action}/${editing.id}`, 'PATCH', { name: editNameInput.value.trim() });
      if (!result.option) throw new Error('The server did not return the updated training type.');
      const index = options.findIndex(item => String(item.id) === String(result.option.id));
      options[index] = result.option;
      search.value = '';
      page = Math.max(1, Math.ceil(options.length / Number(pageSize.value)));
      render();
      editModal.hide();
      window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Training type could not be updated.', 'error');
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
      const result = await request(form.action, 'POST', { name: nameInput.value.trim() });
      if (!result.option) throw new Error('The server did not return the new training type.');
      options.push(result.option);
      form.reset();
      search.value = '';
      page = Math.max(1, Math.ceil(options.length / Number(pageSize.value)));
      render();
      window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Training type could not be added.', 'error');
    } finally {
      saving = false;
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });

  render();
});
