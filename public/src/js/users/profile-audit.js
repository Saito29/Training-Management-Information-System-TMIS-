document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('audit-panel');
  if (!panel) return;

  const form = document.getElementById('profileAuditFilters');
  const body = document.getElementById('profileAuditRows');
  const status = document.getElementById('profileAuditStatus');
  const error = document.getElementById('profileAuditError');
  const previous = document.getElementById('profileAuditPrevious');
  const next = document.getElementById('profileAuditNext');
  const selectVisible = document.getElementById('profileAuditSelectVisible');
  const deleteAllFiltered = document.getElementById('profileAuditDeleteAllFiltered');
  const deleteDialog = document.getElementById('profileAuditDeleteDialog');
  const exportDialog = document.getElementById('profileAuditExportDialog');
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const approvals = document.getElementById('profileAuditApprovals');
  const approvalStatus = document.getElementById('profileAuditApprovalsStatus');
  const approvalList = document.getElementById('profileAuditApprovalsList');
  let loaded = false;
  let page = 1;
  let previousPage = false;
  let nextPage = false;
  let controller = null;
  let pendingAction = null;

  const node = (tag, text, className = '') => {
    const element = document.createElement(tag);
    element.textContent = text ?? 'Not recorded';
    if (className) element.className = className;
    return element;
  };
  const renderTableMessage = (message, loading = false) => {
    const row = document.createElement('tr');
    const cell = node('td', '', 'text-center text-secondary py-4');
    cell.colSpan = 9;
    if (loading) {
      const spinner = node('span', '', 'spinner-border spinner-border-sm me-2');
      spinner.setAttribute('aria-hidden', 'true');
      cell.append(spinner);
    }
    cell.append(document.createTextNode(message));
    row.append(cell);
    body.replaceChildren(row);
  };
  const date = value => value
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })
      .format(new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`))
    : 'Not recorded';
  const filters = () => {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (value) params.set(key, value);
    }
    return params;
  };
  const apiRequest = async (url, method, data = {}) => {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
      },
      body: method === 'GET' ? undefined : JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(Object.values(result.errors || {}).flat()[0] || result.message || 'The request could not be completed.');
    }
    return result;
  };

  async function load(number = 1) {
    controller?.abort();
    controller = new AbortController();
    error.hidden = true;
    previous.disabled = true;
    next.disabled = true;
    document.getElementById('profileAuditTable').setAttribute('aria-busy', 'true');
    status.textContent = 'Loading audit history...';
    renderTableMessage('Loading audit entries…', true);
    const params = filters();
    params.set('page', number);
    params.set('per_page', '25');

    try {
      const response = await fetch(`${panel.dataset.auditUrl}?${params}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(Object.values(result.errors || {}).flat()[0] || result.message || 'Audit history could not be loaded.');
      }

      const rows = result.data.map(entry => {
        const row = document.createElement('tr');
        const choiceCell = document.createElement('td');
        const choice = document.createElement('input');
        choice.type = 'checkbox';
        choice.className = 'form-check-input audit-entry-choice';
        choice.value = entry.id;
        choice.setAttribute('aria-label', `Select audit entry ${entry.reference || ''}`);
        choiceCell.append(choice);
        row.append(choiceCell);
        for (const value of [
          entry.reference,
          date(entry.created_at),
          entry.actor_name || 'System / guest',
          entry.user_name || 'Not recorded',
          entry.event,
          entry.outcome,
          entry.ip_address,
        ]) {
          row.append(node('td', value));
        }

        const detailsCell = document.createElement('td');
        const details = document.createElement('details');
        details.append(node('summary', 'View details'));
        details.append(node('p', entry.description || 'No description'));
        if (entry.account_email) details.append(node('p', `Account email: ${entry.account_email}`));
        details.append(node('p', `Reference: ${entry.reference || 'Not recorded'}`));
        detailsCell.append(details);
        row.append(detailsCell);
        return row;
      });

      if (!rows.length) {
        const row = document.createElement('tr');
        const cell = node('td', 'No events match these filters.', 'self-empty');
        cell.colSpan = 9;
        row.append(cell);
        rows.push(row);
      }
      body.replaceChildren(...rows);
      selectVisible.checked = false;
      page = result.current_page;
      previousPage = Boolean(result.prev_page_url);
      nextPage = Boolean(result.next_page_url);
      previous.disabled = !previousPage;
      next.disabled = !nextPage;
      document.getElementById('profileAuditPage').textContent = `Page ${page} of ${result.last_page}`;
      status.textContent = `${result.total} events${result.total ? ` / showing ${result.from}-${result.to}` : ''}`;
      loaded = true;
    } catch (exception) {
      if (exception.name === 'AbortError') return;
      error.textContent = exception.message;
      error.hidden = false;
      status.textContent = 'Audit history is unavailable. Apply filters to retry.';
      renderTableMessage('Audit history could not be loaded. Apply filters to try again.');
    } finally {
      document.getElementById('profileAuditTable').setAttribute('aria-busy', 'false');
    }
  }

  async function loadPending() {
    if (!approvals) return;
    approvalStatus.textContent = 'Loading pending requests...';
    try {
      const result = await apiRequest(approvals.dataset.pendingUrl, 'GET');
      const rows = result.data.map(item => {
        const card = document.createElement('article');
        card.className = 'border rounded p-3 d-flex flex-wrap justify-content-between align-items-center gap-3';
        const summary = document.createElement('div');
        summary.append(node('strong', `${item.requester} · ${item.reference}`));
        summary.append(node('p', item.delete_all_filtered
          ? 'Requests deletion of all audit entries matching the saved filters.'
          : `Requests deletion of ${item.selected_count} selected audit entries.`));
        summary.append(node('span', `Requested ${date(item.created_at)}`, 'small text-secondary'));
        const actions = document.createElement('div');
        actions.className = 'd-flex gap-2';
        const approve = node('button', 'Approve deletion', 'btn btn-danger btn-sm');
        approve.type = 'button';
        approve.disabled = !item.can_review;
        if (!item.can_review) approve.title = 'A different Super Admin must approve this request.';
        approve.addEventListener('click', () => resolve(item, 'approve'));
        const reject = node('button', 'Reject', 'btn self-secondary btn-sm');
        reject.type = 'button';
        reject.addEventListener('click', () => resolve(item, 'reject'));
        actions.append(approve, reject);
        card.append(summary, actions);
        return card;
      });
      approvalList.replaceChildren(...rows);
      approvalStatus.textContent = `${result.data.length} pending request${result.data.length === 1 ? '' : 's'}.`;
    } catch (exception) {
      approvalStatus.textContent = exception.message;
    }
  }

  async function resolve(item, action) {
    const question = action === 'approve'
      ? `Permanently delete the audit entries in request ${item.reference}? This cannot be undone.`
      : `Reject deletion request ${item.reference}?`;
    if (!window.confirm(question)) return;
    try {
      const result = await apiRequest(`${approvals.dataset.resolveUrl}/${item.id}`, 'PATCH', { action });
      approvalStatus.textContent = result.message;
      await Promise.all([load(page), loadPending()]);
    } catch (exception) {
      approvalStatus.textContent = exception.message;
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    load();
  });
  document.getElementById('profileAuditClear').addEventListener('click', () => {
    form.reset();
    load();
  });
  previous.addEventListener('click', () => {
    if (previousPage) load(page - 1);
  });
  next.addEventListener('click', () => {
    if (nextPage) load(page + 1);
  });
  selectVisible.addEventListener('change', () => {
    body.querySelectorAll('.audit-entry-choice').forEach(choice => {
      choice.checked = selectVisible.checked;
    });
    if (selectVisible.checked) deleteAllFiltered.checked = false;
  });
  body.addEventListener('change', event => {
    if (!event.target.matches('.audit-entry-choice')) return;
    selectVisible.checked = [...body.querySelectorAll('.audit-entry-choice')].every(choice => choice.checked);
    if (event.target.checked) deleteAllFiltered.checked = false;
  });
  deleteAllFiltered.addEventListener('change', () => {
    if (!deleteAllFiltered.checked) return;
    selectVisible.checked = false;
    body.querySelectorAll('.audit-entry-choice').forEach(choice => {
      choice.checked = false;
    });
  });

  document.getElementById('profileAuditRequestDelete').addEventListener('click', () => {
    const selected = [...body.querySelectorAll('.audit-entry-choice:checked')].map(choice => choice.value);
    if (!deleteAllFiltered.checked && !selected.length) {
      error.textContent = 'Select audit entries or choose all entries matching the filters.';
      error.hidden = false;
      return;
    }
    pendingAction = { ids: selected, delete_all_filtered: deleteAllFiltered.checked };
    document.getElementById('profileAuditDeleteDescription').textContent = deleteAllFiltered.checked
      ? 'A Super Admin will be notified by email and in the notification center to review permanent deletion of every entry matching these filters. No logs will be removed unless approved.'
      : `A Super Admin will be notified by email and in the notification center to review permanent deletion of ${selected.length} selected entr${selected.length === 1 ? 'y' : 'ies'}. No logs will be removed unless approved.`;
    deleteDialog.showModal();
  });
  document.getElementById('profileAuditConfirmDelete').addEventListener('click', async () => {
    if (!pendingAction) return;
    const data = Object.fromEntries(filters());
    if (pendingAction.delete_all_filtered) {
      data.delete_all_filtered = true;
    } else {
      data.ids = pendingAction.ids;
    }
    const button = document.getElementById('profileAuditConfirmDelete');
    button.disabled = true;
    try {
      const result = await apiRequest(panel.dataset.deleteUrl, 'DELETE', data);
      deleteDialog.close();
      pendingAction = null;
      deleteAllFiltered.checked = false;
      error.hidden = true;
      status.textContent = `${result.message} Reference: ${result.reference}`;
      await load(page);
      await loadPending();
    } catch (exception) {
      error.textContent = exception.message;
      error.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById('profileAuditExportOpen').addEventListener('click', () => {
    const exportFilters = document.getElementById('profileAuditExportFilters');
    const hiddenFields = [...filters()].map(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      return input;
    });
    exportFilters.replaceChildren(...hiddenFields);
    exportDialog.showModal();
  });
  document.getElementById('profileAuditExportCancel').addEventListener('click', () => exportDialog.close());
  document.getElementById('profileAuditExportForm').addEventListener('submit', () => exportDialog.close());
  document.addEventListener('profile:tabchange', event => {
    if (event.detail.key !== 'audit') return;
    if (!loaded) load();
    loadPending();
  });
  if (location.hash === '#audit') {
    load();
    loadPending();
  }
});
