document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('#attachment-types');
  if (!root) return;

  const editModalElement = root.querySelector('#attachmentTypeEditModal');
  const editForm = root.querySelector('#attachmentTypeEditForm');
  const editNameInput = editForm.elements.name;
  const editRequiredInput = editForm.elements.is_required;
  const editModal = bootstrap.Modal.getOrCreateInstance(editModalElement);
  const deleteModalElement = document.querySelector('#settingsDeleteModal');
  let editing = null;
  let saving = false;

  const isBuiltIn = option => option.is_builtin === true || option.is_builtin === 1 || option.is_builtin === '1';
  const isRequired = option => option.is_required === true || option.is_required === 1 || option.is_required === '1';

  async function request(url, method, form, data = {}) {
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
      throw new Error(Object.values(result?.errors || {}).flat()[0] || result?.message || 'Attachment types could not be saved.');
    }

    return result;
  }

  function confirmDelete(state, option) {
    const modal = bootstrap.Modal.getOrCreateInstance(deleteModalElement);
    const confirmButton = deleteModalElement.querySelector('[data-settings-delete-confirm]');
    deleteModalElement.querySelector('[data-settings-delete-record]').textContent = `"${option.name}" will be removed from ${state.label.toLocaleLowerCase('en-PH')} attachment choices.`;
    deleteModalElement.querySelector('[data-settings-delete-note]').textContent = 'This action cannot be undone. Types used by saved documents and protected system types cannot be deleted.';

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

  [...root.querySelectorAll('[data-attachment-type-panel]')].forEach(panel => {
    const form = panel.querySelector('[data-attachment-type-form]');
    const dataElement = panel.querySelector('[data-attachment-type-data]');
    const options = JSON.parse(dataElement.textContent);
    if (!Array.isArray(options)) throw new Error('The attachment type directory is not available.');

    const state = {
      panel,
      form,
      label: panel.dataset.attachmentTypeLabel,
      options,
      search: panel.querySelector('[data-attachment-type-search]'),
      pageSize: panel.querySelector('[data-attachment-type-page-size]'),
      refresh: panel.querySelector('[data-attachment-type-refresh]'),
      previous: panel.querySelector('[data-attachment-type-previous]'),
      next: panel.querySelector('[data-attachment-type-next]'),
      body: panel.querySelector('[data-attachment-type-rows]'),
      page: 1,
      sortField: 'name',
      sortDirection: 'asc',
    };

    function render() {
      const query = state.search.value.trim().toLocaleLowerCase('en-PH');
      const filtered = state.options.filter(option => option.name.toLocaleLowerCase('en-PH').includes(query));
      filtered.sort((left, right) => {
        const first = state.sortField === 'attachment_count'
          ? Number(left.attachment_count || 0)
          : state.sortField === 'is_required'
            ? Number(isRequired(left))
            : String(left.name || '');
        const second = state.sortField === 'attachment_count'
          ? Number(right.attachment_count || 0)
          : state.sortField === 'is_required'
            ? Number(isRequired(right))
            : String(right.name || '');
        const comparison = typeof first === 'number' && typeof second === 'number'
          ? first - second
          : String(first).localeCompare(String(second), 'en-PH', { numeric: true, sensitivity: 'base' });

        return state.sortDirection === 'asc' ? comparison : -comparison;
      });

      panel.querySelectorAll('[data-attachment-type-sort]').forEach(control => {
        const selected = control.dataset.attachmentTypeSort === state.sortField;
        control.closest('th')?.setAttribute('aria-sort', selected ? (state.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
        const icon = control.querySelector('i');
        if (icon) icon.className = `bi ${selected ? (state.sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'}`;
      });

      const size = Number(state.pageSize.value);
      const pages = Math.max(1, Math.ceil(filtered.length / size));
      state.page = Math.max(1, Math.min(state.page, pages));
      const start = (state.page - 1) * size;
      state.body.replaceChildren();

      for (const option of filtered.slice(start, start + size)) {
        const row = document.createElement('tr');
        const actions = document.createElement('td');
        actions.className = 'directory-row-actions';

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn directory-icon-action is-edit';
        edit.dataset.attachmentTypeEdit = String(option.id);
        edit.title = isBuiltIn(option) ? `Edit the requirement setting for ${option.name}` : `Edit ${option.name}`;
        edit.setAttribute('aria-label', edit.title);
        const editIcon = document.createElement('i');
        editIcon.className = 'bi bi-pencil-square';
        editIcon.setAttribute('aria-hidden', 'true');
        edit.append(editIcon);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn directory-icon-action is-delete';
        remove.dataset.attachmentTypeDelete = String(option.id);
        remove.title = isBuiltIn(option)
          ? `${option.name} is a protected type`
          : Number(option.attachment_count) > 0
            ? `Cannot delete ${option.name}; documents use it`
            : `Delete ${option.name}`;
        remove.setAttribute('aria-label', remove.title);
        remove.disabled = isBuiltIn(option) || Number(option.attachment_count) > 0;
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'bi bi-trash3';
        deleteIcon.setAttribute('aria-hidden', 'true');
        remove.append(deleteIcon);
        actions.append(edit, remove);
        row.append(actions);

        const nameCell = document.createElement('td');
        nameCell.className = 'directory-primary-cell';
        const name = document.createElement('strong');
        name.textContent = option.name;
        const detail = document.createElement('small');
        detail.textContent = isBuiltIn(option) ? 'Protected system type' : 'Custom attachment type';
        nameCell.append(name, detail);
        row.append(nameCell);

        const requirementCell = document.createElement('td');
        const requirement = document.createElement('span');
        requirement.className = `directory-status ${isRequired(option) ? 'is-active' : ''}`;
        requirement.textContent = isRequired(option) ? 'Required' : 'Optional';
        requirementCell.append(requirement);
        row.append(requirementCell);

        const countCell = document.createElement('td');
        const count = document.createElement('span');
        count.className = 'directory-count-badge';
        count.textContent = Number(option.attachment_count || 0).toLocaleString('en-PH');
        count.setAttribute('aria-label', `${count.textContent} tagged documents`);
        countCell.append(count);
        row.append(countCell);

        const statusCell = document.createElement('td');
        const status = document.createElement('span');
        status.className = 'directory-status is-active';
        status.textContent = isBuiltIn(option) ? 'Protected' : 'Available';
        statusCell.append(status);
        row.append(statusCell);
        state.body.append(row);
      }

      if (!filtered.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.className = 'directory-empty';
        cell.textContent = state.options.length ? 'No attachment types match your search.' : 'No attachment types have been added yet.';
        row.append(cell);
        state.body.append(row);
      }

      panel.querySelector('[data-attachment-type-stat-total]').textContent = String(state.options.length);
      panel.querySelector('[data-attachment-type-stat-used]').textContent = String(state.options.reduce((total, option) => total + Number(option.attachment_count || 0), 0));
      panel.querySelector('[data-attachment-type-stat-protected]').textContent = String(state.options.filter(isBuiltIn).length);
      panel.querySelector('[data-attachment-type-summary]').textContent = filtered.length
        ? `Showing ${start + 1}-${Math.min(start + size, filtered.length)} of ${filtered.length} types; ${state.options.length} total`
        : `Showing 0 of ${state.options.length} types`;
      panel.querySelector('[data-attachment-type-page]').textContent = `Page ${state.page} of ${pages}`;
      state.previous.disabled = state.page === 1;
      state.next.disabled = state.page === pages;
    }
    state.render = render;

    state.search.addEventListener('input', () => {
      state.page = 1;
      render();
    });
    state.pageSize.addEventListener('change', () => {
      state.page = 1;
      render();
    });
    state.previous.addEventListener('click', () => {
      state.page -= 1;
      render();
    });
    state.next.addEventListener('click', () => {
      state.page += 1;
      render();
    });
    state.refresh.addEventListener('click', async () => {
      if (saving || state.refresh.disabled) return;
      state.refresh.disabled = true;
      state.refresh.setAttribute('aria-busy', 'true');
      try {
        const result = await request(form.action, 'GET', form);
        if (!Array.isArray(result.options)) throw new Error('The server did not return attachment types.');
        options.splice(0, options.length, ...result.options);
        render();
        window.TmisToast?.show(`${state.label} attachment types refreshed.`, 'success');
      } catch (error) {
        window.TmisToast?.show(error.message || 'Attachment types could not be refreshed.', 'error');
      } finally {
        state.refresh.disabled = false;
        state.refresh.removeAttribute('aria-busy');
      }
    });
    panel.querySelectorAll('[data-attachment-type-sort]').forEach(control => control.addEventListener('click', () => {
      const field = control.dataset.attachmentTypeSort;
      state.sortDirection = state.sortField === field && state.sortDirection === 'asc' ? 'desc' : 'asc';
      state.sortField = field;
      state.page = 1;
      render();
    }));

    state.body.addEventListener('click', async event => {
      const control = event.target.closest('[data-attachment-type-edit],[data-attachment-type-delete]');
      if (!control || saving) return;
      const optionId = control.dataset.attachmentTypeEdit || control.dataset.attachmentTypeDelete;
      const option = options.find(item => String(item.id) === optionId);
      if (!option) return;

      if (control.dataset.attachmentTypeEdit) {
        editing = { state, option };
        editNameInput.value = option.name;
        editNameInput.disabled = isBuiltIn(option);
        editRequiredInput.checked = isRequired(option);
        root.querySelector('[data-attachment-type-edit-category]').textContent = state.label;
        editModal.show();
        editNameInput.focus();
        return;
      }

      if (isBuiltIn(option) || Number(option.attachment_count) > 0 || !await confirmDelete(state, option)) return;
      saving = true;
      control.disabled = true;
      try {
        const result = await request(`${form.action}/${option.id}`, 'DELETE', form);
        options.splice(options.indexOf(option), 1);
        render();
        window.TmisToast?.show(result.message, 'success');
      } catch (error) {
        window.TmisToast?.show(error.message || 'Attachment type could not be deleted.', 'error');
      } finally {
        saving = false;
        control.disabled = false;
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
        const result = await request(form.action, 'POST', form, {
          name: form.elements.name.value.trim(),
          is_required: form.elements.is_required.checked,
        });
        if (!result.option) throw new Error('The server did not return the new attachment type.');
        options.push(result.option);
        form.reset();
        state.search.value = '';
        state.page = Math.max(1, Math.ceil(options.length / Number(state.pageSize.value)));
        render();
        window.TmisToast?.show(result.message, 'success');
      } catch (error) {
        window.TmisToast?.show(error.message || 'Attachment type could not be added.', 'error');
      } finally {
        saving = false;
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
      }
    });

    render();
  });

  editModalElement.addEventListener('hidden.bs.modal', () => {
    editing = null;
    editForm.reset();
    editNameInput.disabled = false;
  });
  editForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !editing || !editForm.reportValidity()) return;
    saving = true;
    const submitButton = editForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const result = await request(`${editing.state.form.action}/${editing.option.id}`, 'PATCH', editing.state.form, {
        name: editNameInput.value.trim(),
        is_required: editRequiredInput.checked,
      });
      if (!result.option) throw new Error('The server did not return the updated attachment type.');
      const index = editing.state.options.findIndex(item => String(item.id) === String(result.option.id));
      if (index < 0) throw new Error('The attachment type is no longer in this directory.');
      editing.state.options[index] = result.option;
      editing.state.search.value = '';
      editing.state.page = Math.max(1, Math.ceil(editing.state.options.length / Number(editing.state.pageSize.value)));
      editing.state.render();
      editModal.hide();
      window.TmisToast?.show(result.message, 'success');
    } catch (error) {
      window.TmisToast?.show(error.message || 'Attachment type could not be updated.', 'error');
    } finally {
      saving = false;
      submitButton.disabled = false;
    }
  });
});
