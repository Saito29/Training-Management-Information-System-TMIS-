(() => {
  const workflowTransitions = {
    'For Review': ['For Approval'],
    'For Approval': ['For Acceptance', 'For Review'],
    'For Acceptance': ['Approved & Accepted', 'For Approval', 'For Review'],
    'Approved & Accepted': [],
  };
  const apiStatuses = {
    'For Review': 'For review',
    'For Approval': 'For approval',
    'For Acceptance': 'For acceptance',
    'Approved & Accepted': 'Approved & Accepted',
  };
  const hasPermission = (permission) => Boolean(
    window.TMIS_NAV_ACCESS?.administrator || window.TMIS_NAV_ACCESS?.permissions?.includes(permission)
  );
  const statusPermission = {
    'For Review': 'trainings.submit',
    'For Approval': 'trainings.approve',
    'For Acceptance': 'trainings.accept',
  };
  const availableTransitions = (status) => (workflowTransitions[status] || [])
    .filter((target) => target !== 'Approved & Accepted' || window.TMIS_NAV_ACCESS?.administrator);

  window.TmisTrainingStatusActions = {
    render(record) {
      if (!window.TMIS_PAGE || !Number.isInteger(Number(record._db_id)) || !Number.isInteger(Number(record.version))) {
        return '';
      }

      const currentStatus = record.workflowStatus || record.status;
      const choices = availableTransitions(currentStatus);
      const hasStatusPermission = hasPermission(statusPermission[currentStatus])
        && (currentStatus !== 'For Acceptance' || hasPermission('trainings.accept'));
      const updateStatus = record.is_active === true
        && hasStatusPermission
        && choices.length
        ? `<button type="button" class="btn table-action-button status-action" data-training-status-update="${window.TmisStore.escape(record.id)}" data-training-db-id="${window.TmisStore.escape(record._db_id)}" data-training-version="${window.TmisStore.escape(record.version)}" data-training-status="${window.TmisStore.escape(currentStatus)}" title="Update workflow status" aria-label="Update status for ${window.TmisStore.escape(record.id)}"><i class="bi bi-arrow-left-right"></i></button>`
        : '';

      return updateStatus;
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    const successMessages = {status: 'Training workflow status updated.'};
    const pageUrl = new URL(window.location.href);
    const result = pageUrl.searchParams.get('trainingStatusUpdated');
    if (result && successMessages[result]) {
      pageUrl.searchParams.delete('trainingStatusUpdated');
      window.history.replaceState(null, '', pageUrl);
      window.TmisToast?.show(successMessages[result], 'success');
    }

    const modalElement = document.createElement('div');
    modalElement.className = 'modal fade';
    modalElement.id = 'trainingStatusActionModal';
    modalElement.tabIndex = -1;
    modalElement.setAttribute('aria-labelledby', 'trainingStatusActionTitle');
    modalElement.setAttribute('aria-hidden', 'true');
    modalElement.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content" id="trainingStatusActionForm">
          <div class="modal-header">
            <h5 class="modal-title" id="trainingStatusActionTitle">Update training status</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p id="trainingStatusActionSummary"></p>
            <div id="trainingWorkflowFields">
              <label class="form-label" for="trainingStatusTarget">New workflow status</label>
              <select class="form-select" id="trainingStatusTarget" required></select>
              <label class="form-label mt-3" for="trainingStatusReason">Reason (required when returning to an earlier step)</label>
              <textarea class="form-control" id="trainingStatusReason" rows="3" maxlength="2000"></textarea>
            </div>
            <p class="text-danger mt-3 mb-0" id="trainingStatusActionError" role="alert" hidden></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary" id="trainingStatusActionSubmit">Save status</button>
          </div>
        </form>
      </div>`;
    document.body.append(modalElement);

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    const form = document.getElementById('trainingStatusActionForm');
    const summary = document.getElementById('trainingStatusActionSummary');
    const workflowFields = document.getElementById('trainingWorkflowFields');
    const target = document.getElementById('trainingStatusTarget');
    const reason = document.getElementById('trainingStatusReason');
    const error = document.getElementById('trainingStatusActionError');
    const submit = document.getElementById('trainingStatusActionSubmit');
    let pendingAction = null;

    const requiresReason = () => target.value === 'For Review'
      || (pendingAction?.currentStatus === 'For Acceptance' && target.value === 'For Approval');
    const redirectWithResult = (result) => {
      const pageUrl = new URL(window.location.href);
      pageUrl.searchParams.set('trainingStatusUpdated', result);
      window.location.assign(pageUrl);
    };

    document.addEventListener('click', (event) => {
      const statusButton = event.target.closest('[data-training-status-update]');
      if (!statusButton) return;

      error.hidden = true;
      error.textContent = '';
      reason.value = '';
      const currentStatus = statusButton.dataset.trainingStatus;
      const choices = availableTransitions(currentStatus);
      if (!choices.length) return;
      pendingAction = {
        type: 'status',
        databaseId: statusButton.dataset.trainingDbId,
        version: statusButton.dataset.trainingVersion,
        currentStatus,
      };
      document.getElementById('trainingStatusActionTitle').textContent = 'Update training status';
      summary.textContent = `Current status: ${currentStatus}`;
      workflowFields.hidden = false;
      target.replaceChildren(...choices.map((status) => new Option(status, status)));
      reason.required = requiresReason();
      submit.textContent = 'Save status';
      modal.show();
    });

    target.addEventListener('change', () => {
      reason.required = requiresReason();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!pendingAction || !form.reportValidity()) return;

      const databaseId = Number(pendingAction.databaseId);
      const version = Number(pendingAction.version);
      if (!Number.isSafeInteger(databaseId) || databaseId < 1 || !Number.isSafeInteger(version) || version < 1) {
        error.textContent = 'The training details are invalid. Refresh the page and try again.';
        error.hidden = false;
        return;
      }

      submit.disabled = true;
      error.hidden = true;
      try {
        const nextStatus = target.value;
        await window.TmisStore.request(`/operations/trainings/${databaseId}/status`, {
          status: apiStatuses[nextStatus],
          version,
          reason: reason.value.trim() || undefined,
        });
        redirectWithResult('status');
      } catch (requestError) {
        error.textContent = requestError instanceof Error ? requestError.message : 'The training status could not be updated.';
        error.hidden = false;
      } finally {
        submit.disabled = false;
      }
    });
  });
})();
