document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#interventionUnitForm');
  if (!form) return;

  const options = JSON.parse(document.querySelector('#registeredInterventionUnits').textContent);
  const nameInput = form.elements.name;
  const submitButton = form.querySelector('[type="submit"]');
  const search = document.querySelector('#interventionUnitSearch');
  const pageSize = document.querySelector('#interventionUnitPageSize');
  const previous = document.querySelector('[data-intervention-unit-previous]');
  const next = document.querySelector('[data-intervention-unit-next]');
  const rows = document.querySelector('[data-intervention-unit-rows]');
  const editorElement = document.querySelector('#interventionUnitModal');
  const deleteElement = document.querySelector('#deleteInterventionUnitModal');
  const editor = bootstrap.Modal.getOrCreateInstance(editorElement);
  const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteElement);
  const errorElement = document.querySelector('#interventionUnitError');
  const deleteErrorElement = document.querySelector('#deleteInterventionUnitError');
  let editing = null;
  let pendingDelete = null;
  let saving = false;
  let page = 1;
  let sortDirection = 'asc';

  const showToast = message => window.TmisToast?.show(message, 'success');

  function resetEditor() {
    editing = null;
    form.reset();
    document.querySelector('#interventionUnitModalTitle').textContent = 'Add unit type';
    document.querySelector('#interventionUnitModalDescription').textContent = 'Add a reusable unit label for farmer assistance records.';
    document.querySelector('[data-intervention-unit-submit-label]').textContent = 'Save unit type';
    errorElement.hidden = true;
  }

  function openEditor(option = null) {
    resetEditor();
    editing = option;
    if (option) {
      nameInput.value = option.label;
      document.querySelector('#interventionUnitModalTitle').textContent = 'Edit unit type';
      document.querySelector('#interventionUnitModalDescription').textContent = 'Update the unit label used by future intervention entries.';
      document.querySelector('[data-intervention-unit-submit-label]').textContent = 'Save changes';
    }
    editor.show();
    window.setTimeout(() => nameInput.focus(), 150);
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase('en-PH');
    const filtered = options.filter(option => `${option.label} ${option.value}`.toLocaleLowerCase('en-PH').includes(query));
    filtered.sort((left, right) => {
      const order = String(left.label || '').localeCompare(String(right.label || ''), 'en-PH', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? order : -order;
    });

    const size = Number(pageSize.value);
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.max(1, Math.min(page, pages));
    const start = (page - 1) * size;
    rows.replaceChildren();

    filtered.slice(start, start + size).forEach(option => {
      const row = document.createElement('tr');
      const actions = document.createElement('td');
      actions.className = 'directory-row-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn directory-icon-action is-edit';
      edit.dataset.interventionUnitEdit = String(option.id);
      edit.title = `Edit ${option.label}`;
      edit.setAttribute('aria-label', edit.title);
      edit.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn directory-icon-action is-delete';
      remove.dataset.interventionUnitDelete = String(option.id);
      remove.title = `Delete ${option.label}`;
      remove.setAttribute('aria-label', remove.title);
      remove.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i>';
      actions.append(edit, remove);
      row.append(actions);

      const label = document.createElement('td');
      label.className = 'directory-primary-cell';
      const strong = document.createElement('strong');
      strong.textContent = option.label;
      const description = document.createElement('small');
      description.textContent = 'Intervention quantity unit';
      label.append(strong, description);
      row.append(label);

      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.className = `directory-status ${option.is_active ? 'is-active' : 'is-inactive'}`;
      status.textContent = option.is_active ? 'Active' : 'Inactive';
      statusCell.append(status);
      row.append(statusCell);
      rows.append(row);
    });

    if (!filtered.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.className = 'directory-empty';
      cell.textContent = options.length ? 'No unit types match your search.' : 'No unit types have been added.';
      row.append(cell);
      rows.append(row);
    }

    document.querySelector('[data-intervention-unit-total]').textContent = String(options.length);
    document.querySelector('[data-intervention-unit-active]').textContent = String(options.filter(option => option.is_active).length);
    document.querySelector('[data-intervention-unit-summary]').textContent = filtered.length
      ? `Showing ${start + 1}-${Math.min(start + size, filtered.length)} of ${filtered.length} unit types; ${options.length} total`
      : `Showing 0 of ${options.length} unit types`;
    document.querySelector('[data-intervention-unit-page]').textContent = `Page ${page} of ${pages}`;
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
      throw new Error(Object.values(result?.errors || {}).flat()[0] || result?.message || 'Unit type request failed.');
    }

    return result;
  }

  document.querySelector('#addInterventionUnit').addEventListener('click', () => openEditor());
  editorElement.addEventListener('hidden.bs.modal', resetEditor);
  deleteElement.addEventListener('hidden.bs.modal', () => {
    pendingDelete = null;
    deleteErrorElement.hidden = true;
  });
  search.addEventListener('input', () => { page = 1; render(); });
  pageSize.addEventListener('change', () => { page = 1; render(); });
  previous.addEventListener('click', () => { page--; render(); });
  next.addEventListener('click', () => { page++; render(); });
  document.querySelector('[data-intervention-unit-sort]').addEventListener('click', () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    page = 1;
    render();
  });

  rows.addEventListener('click', event => {
    const button = event.target.closest('[data-intervention-unit-edit],[data-intervention-unit-delete]');
    if (!button || saving) return;
    const option = options.find(item => String(item.id) === (button.dataset.interventionUnitEdit || button.dataset.interventionUnitDelete));
    if (!option) return;
    if (button.dataset.interventionUnitEdit) {
      openEditor(option);
      return;
    }
    pendingDelete = option;
    document.querySelector('#deleteInterventionUnitName').textContent = option.label;
    document.querySelector('#deleteInterventionUnitState').textContent = option.is_active
      ? 'Available in farmer and farmer-association forms'
      : 'Already unavailable for new entries';
    const status = document.querySelector('#deleteInterventionUnitStatus');
    status.className = `directory-status ${option.is_active ? 'is-active' : 'is-inactive'}`;
    status.textContent = option.is_active ? 'Active' : 'Inactive';
    deleteErrorElement.hidden = true;
    deleteModal.show();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !form.reportValidity()) return;
    saving = true;
    submitButton.disabled = true;
    errorElement.hidden = true;
    try {
      const target = editing;
      const result = await request(target ? `${form.action}/${target.id}` : form.action, target ? 'PATCH' : 'POST', { name: nameInput.value.trim() });
      const index = options.findIndex(item => String(item.id) === String(result.option.id));
      if (index < 0) options.push(result.option); else options[index] = result.option;
      editor.hide();
      search.value = '';
      page = Math.max(1, Math.ceil(options.length / Number(pageSize.value)));
      render();
      showToast(result.message || 'Unit type saved.');
    } catch (error) {
      errorElement.textContent = error.message || 'Unit type could not be saved.';
      errorElement.hidden = false;
    } finally {
      saving = false;
      submitButton.disabled = false;
    }
  });

  document.querySelector('#confirmDeleteInterventionUnit').addEventListener('click', async event => {
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
      showToast(result.message || 'Unit type deleted.');
    } catch (error) {
      deleteErrorElement.textContent = error.message || 'Unit type could not be deleted.';
      deleteErrorElement.hidden = false;
    } finally {
      saving = false;
      button.disabled = false;
    }
  });

  render();
});
