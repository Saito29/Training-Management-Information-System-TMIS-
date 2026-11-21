document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#interventionTypeRegistration');
  if (!form) return;

  const options = JSON.parse(document.querySelector('#registeredInterventionTypes').textContent);
  const nameInput = form.elements.name;
  const submitButton = form.querySelector('[type="submit"]');
  const search = document.querySelector('#interventionTypeSearch');
  const pageSize = document.querySelector('#interventionTypePageSize');
  const previous = document.querySelector('[data-intervention-type-previous]');
  const next = document.querySelector('[data-intervention-type-next]');
  const rows = document.querySelector('[data-intervention-type-rows]');
  const editorElement = document.querySelector('#interventionTypeModal');
  const deleteElement = document.querySelector('#deleteInterventionTypeModal');
  const editor = bootstrap.Modal.getOrCreateInstance(editorElement);
  const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteElement);
  const errorElement = document.querySelector('#interventionTypeError');
  const deleteErrorElement = document.querySelector('#deleteInterventionTypeError');
  let editing = null;
  let pendingDelete = null;
  let saving = false;
  let page = 1;
  let sortDirection = 'asc';

  function showToast(message, type = 'success') {
    window.TmisToast?.show(message, type);
  }

  function resetEditor() {
    editing = null;
    form.reset();
    document.querySelector('#interventionTypeId').value = '';
    document.querySelector('#interventionTypeModalTitle').textContent = 'Add intervention type';
    document.querySelector('#interventionTypeModalDescription').textContent = 'Add a reusable category for recording assistance provided to farmers.';
    document.querySelector('[data-intervention-type-submit-label]').textContent = 'Save intervention type';
    errorElement.hidden = true;
  }

  function openEditor(option = null) {
    resetEditor();
    editing = option;
    if (option) {
      document.querySelector('#interventionTypeId').value = String(option.id);
      nameInput.value = option.label;
      document.querySelector('#interventionTypeModalTitle').textContent = 'Edit intervention type';
      document.querySelector('#interventionTypeModalDescription').textContent = 'Update the label staff use when recording farmer assistance.';
      document.querySelector('[data-intervention-type-submit-label]').textContent = 'Save changes';
    }
    editor.show();
    window.setTimeout(() => nameInput.focus(), 150);
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase('en-PH');
    const filtered = options.filter(option => [option.label, option.value].join(' ').toLocaleLowerCase('en-PH').includes(query));
    filtered.sort((left, right) => {
      const order = String(left.label || '').localeCompare(String(right.label || ''), 'en-PH', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? order : -order;
    });

    const size = Number(pageSize.value), pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.max(1, Math.min(page, pages));
    const start = (page - 1) * size;
    rows.replaceChildren();

    for (const option of filtered.slice(start, start + size)) {
      const row = document.createElement('tr'), actions = document.createElement('td');
      actions.className = 'directory-row-actions';

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn directory-icon-action is-edit';
      edit.dataset.interventionTypeEdit = String(option.id);
      edit.title = `Edit ${option.label}`;
      edit.setAttribute('aria-label', edit.title);
      const editIcon = document.createElement('i');
      editIcon.className = 'bi bi-pencil-square';
      editIcon.setAttribute('aria-hidden', 'true');
      edit.append(editIcon);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn directory-icon-action is-delete';
      remove.dataset.interventionTypeDelete = String(option.id);
      remove.title = `Delete ${option.label}`;
      remove.setAttribute('aria-label', remove.title);
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
      detail.textContent = 'Farmer assistance category';
      nameCell.append(name, detail);
      row.append(nameCell);

      const statusCell = document.createElement('td'), status = document.createElement('span');
      status.className = `directory-status ${option.is_active ? 'is-active' : 'is-inactive'}`;
      status.textContent = option.is_active ? 'Active' : 'Inactive';
      statusCell.append(status);
      row.append(statusCell);
      rows.append(row);
    }

    if (!filtered.length) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      cell.colSpan = 3;
      cell.className = 'directory-empty';
      cell.textContent = options.length ? 'No intervention types match your search.' : 'No intervention types have been added. Add one to make it available on farmer profiles.';
      row.append(cell);
      rows.append(row);
    }

    document.querySelector('[data-intervention-type-total]').textContent = String(options.length);
    document.querySelector('[data-intervention-type-active]').textContent = String(options.filter(option => option.is_active).length);
    document.querySelector('[data-intervention-type-summary]').textContent = filtered.length
      ? `Showing ${start + 1}-${Math.min(start + size, filtered.length)} of ${filtered.length} intervention types; ${options.length} total`
      : `Showing 0 of ${options.length} intervention types`;
    document.querySelector('[data-intervention-type-page]').textContent = `Page ${page} of ${pages}`;
    previous.disabled = page === 1;
    next.disabled = page === pages;
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
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) {
      throw new Error(Object.values(result?.errors || {}).flat()[0] || result?.message || 'Intervention type request failed.');
    }

    return result;
  }

  document.querySelector('#addInterventionType').addEventListener('click', () => openEditor());
  editorElement.addEventListener('hidden.bs.modal', resetEditor);
  deleteElement.addEventListener('hidden.bs.modal', () => {
    pendingDelete = null;
    deleteErrorElement.hidden = true;
  });
  search.addEventListener('input', () => { page = 1; render(); });
  pageSize.addEventListener('change', () => { page = 1; render(); });
  previous.addEventListener('click', () => { page--; render(); });
  next.addEventListener('click', () => { page++; render(); });
  document.querySelectorAll('[data-intervention-type-sort]').forEach(control => control.addEventListener('click', () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    page = 1;
    render();
  }));

  rows.addEventListener('click', event => {
    const control = event.target.closest('[data-intervention-type-edit],[data-intervention-type-delete]');
    if (!control || saving) return;
    const option = options.find(item => String(item.id) === (control.dataset.interventionTypeEdit || control.dataset.interventionTypeDelete));
    if (!option) return;

    if (control.dataset.interventionTypeEdit) {
      openEditor(option);
      return;
    }

    pendingDelete = option;
    document.querySelector('#deleteInterventionTypeSummary').textContent = `${option.label} · Farmer assistance category · ${option.is_active ? 'Active and available for new entries' : 'Inactive and unavailable for new entries'}`;
    deleteErrorElement.hidden = true;
    deleteModal.show();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !form.reportValidity()) return;

    saving = true;
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    errorElement.hidden = true;
    try {
      const target = editing;
      const result = await request(target ? `${form.action}/${target.id}` : form.action, target ? 'PATCH' : 'POST', { name: nameInput.value.trim() });
      if (!result.option) throw new Error('The server did not return the saved intervention type.');
      const index = options.findIndex(item => String(item.id) === String(result.option.id));
      if (index < 0) options.push(result.option); else options[index] = result.option;
      editor.hide();
      search.value = '';
      page = Math.max(1, Math.ceil(options.length / Number(pageSize.value)));
      render();
      showToast(result.message || 'Intervention type saved.', 'success');
    } catch (error) {
      errorElement.textContent = error.message || 'Intervention type could not be saved.';
      errorElement.hidden = false;
    } finally {
      saving = false;
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });

  document.querySelector('#confirmDeleteInterventionType').addEventListener('click', async event => {
    if (!pendingDelete || saving) return;
    const button = event.currentTarget;
    saving = true;
    button.disabled = true;
    deleteErrorElement.hidden = true;
    try {
      const result = await request(`${form.action}/${pendingDelete.id}`, 'DELETE');
      options.splice(options.indexOf(pendingDelete), 1);
      deleteModal.hide();
      render();
      showToast(result.message || 'Intervention type deleted.', 'success');
    } catch (error) {
      deleteErrorElement.textContent = error.message || 'Intervention type could not be deleted.';
      deleteErrorElement.hidden = false;
    } finally {
      saving = false;
      button.disabled = false;
    }
  });

  render();
});
