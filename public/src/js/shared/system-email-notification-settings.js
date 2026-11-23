document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.settings-page');
  const settings = window.TMIS_EMAIL_NOTIFICATION_SETTINGS;
  if (!page || !settings) return;

  const byId = id => document.getElementById(id);
  const rules = Array.isArray(settings.rules) ? settings.rules : [];
  const roles = Array.isArray(settings.roles) ? settings.roles : [];
  const transitions = Array.isArray(settings.transitions) ? settings.transitions : [];
  const canEdit = settings.canEdit === true;
  const ruleBody = byId('trainingEmailNotificationRulesBody');
  const empty = byId('trainingEmailNotificationRulesEmpty');
  const form = byId('trainingEmailNotificationRuleForm');
  const editorElement = byId('trainingEmailNotificationRuleModal');
  const deleteElement = byId('deleteTrainingEmailNotificationRuleModal');
  const editor = canEdit ? bootstrap.Modal.getOrCreateInstance(editorElement) : null;
  const deleteModal = canEdit ? bootstrap.Modal.getOrCreateInstance(deleteElement) : null;
  let editingRuleId = null;
  let pendingDeleteRuleId = null;

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
  const statusLabel = value => ({
    'For review': 'For Review',
    'For approval': 'For Approval',
    'For acceptance': 'For Acceptance',
    'Approved & Accepted': 'Approved & Accepted',
    Rejected: 'Rejected',
  })[value] || value;
  const transitionName = (fromStatus, toStatus) => fromStatus === '*' && toStatus === '*'
    ? 'Any training status change'
    : `${statusLabel(fromStatus)} → ${statusLabel(toStatus)}`;
  const eventDescription = (fromStatus, toStatus) => fromStatus === '*'
    ? 'All training status updates'
    : fromStatus === 'For review' && toStatus === 'For approval'
      ? 'Training submitted for approval'
      : fromStatus === 'For approval' && toStatus === 'For acceptance'
        ? 'Training forwarded for acceptance'
        : toStatus === 'Approved & Accepted'
          ? 'Training approved and accepted'
          : toStatus === 'Rejected'
            ? 'Training rejected'
            : toStatus === 'For review' || toStatus === 'For approval'
              ? 'Training returned for changes'
              : 'Training status update';
  const token = () => form?.querySelector('[name="_token"]')?.value || '';
  const showToast = (message, type = 'success') => window.TmisToast?.show(message, type);
  const showError = (element, message) => {
    element.textContent = message;
    element.hidden = false;
    element.scrollIntoView({ block: 'nearest' });
  };
  const api = async (url, method, payload = null) => {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': token(),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const validationMessage = result.errors ? Object.values(result.errors).flat()[0] : '';
      throw new Error(validationMessage || result.message || 'The email notification rule could not be saved.');
    }

    return result;
  };

  const ruleForTransition = (fromStatus, toStatus, exceptId = null) => rules.find(rule =>
    String(rule.id) !== String(exceptId || '')
      && rule.fromStatus === fromStatus
      && rule.toStatus === toStatus
  );

  function populateToStatuses(selectedValue = '') {
    const fromStatus = byId('emailNotificationRuleFromStatus').value;
    const select = byId('emailNotificationRuleToStatus');
    const allowed = transitions.filter(item => item.from_status === fromStatus);
    select.replaceChildren(...allowed.map(item => {
      const option = new Option(statusLabel(item.to_status), item.to_status);
      option.disabled = Boolean(ruleForTransition(fromStatus, item.to_status, editingRuleId));
      return option;
    }));
    if ([...select.options].some(option => option.value === selectedValue && !option.disabled)) {
      select.value = selectedValue;
    } else {
      select.value = [...select.options].find(option => !option.disabled)?.value || '';
    }
  }

  function renderRoleToggles(selectedRoleIds = []) {
    const list = byId('emailNotificationRuleRoles');
    const selected = new Set(selectedRoleIds.map(String));
    list.replaceChildren(...roles.map(role => {
      const label = document.createElement('label');
      label.className = 'notification-role-toggle';
      const copy = document.createElement('span');
      copy.innerHTML = `<strong>${escape(role.name)}</strong><small>Active accounts in the training’s region and office can receive the email.</small>`;
      const control = document.createElement('span');
      control.className = 'form-check form-switch notification-role-switch';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'form-check-input';
      input.setAttribute('role', 'switch');
      input.dataset.emailNotificationRoleId = String(role.role_id);
      input.checked = selected.has(String(role.role_id));
      input.setAttribute('aria-label', `Allow ${role.name} to receive this status email`);
      control.append(input);
      label.append(copy, control);
      return label;
    }));
  }

  function updateEmailPreview() {
    const fromStatus = byId('emailNotificationRuleFromStatus').value;
    const toStatus = byId('emailNotificationRuleToStatus').value;
    const anyTransition = fromStatus === '*' && toStatus === '*';
    const statusAction = anyTransition
      ? 'updated'
      : fromStatus === 'For review' && toStatus === 'For approval'
      ? 'submitted for approval'
      : fromStatus === 'For approval' && toStatus === 'For acceptance'
        ? 'forwarded for acceptance'
        : fromStatus === 'For acceptance' && toStatus === 'Approved & Accepted'
          ? 'approved and accepted'
          : toStatus === 'Rejected'
            ? 'rejected'
            : toStatus === 'For review' || toStatus === 'For approval'
              ? 'returned for changes'
              : 'changed status';
    const isReturn = (fromStatus === 'For approval' && toStatus === 'For review')
      || (fromStatus === 'For acceptance' && ['For approval', 'For review'].includes(toStatus));
    const samples = {
      training_title: 'Sample training',
      training_id: '12345',
      from_status: fromStatus === '*' ? 'Any status change' : fromStatus || 'Current status',
      to_status: toStatus === '*' ? 'Status update' : toStatus || 'New status',
      reason: 'Sample reason',
      changed_by: 'Sample reviewer',
      actor_office: 'DA-SAAD - Region IV-A',
      training_office: 'DA-SAAD - Region IV-A',
      changed_at: 'Nov 21, 2026, 9:00 AM (Asia/Manila)',
    };
    const renderTemplate = template => template.replace(/\{([^}]+)\}/g, (placeholder, key) => samples[key] ?? placeholder);
    const subjectTemplate = byId('emailNotificationRuleSubject').value.trim();
    const defaultSubject = anyTransition
      ? 'TMIS training status update: Sample training'
      : fromStatus === 'For review' && toStatus === 'For approval'
      ? 'TMIS training submitted for approval: Sample training'
      : fromStatus === 'For approval' && toStatus === 'For acceptance'
        ? 'TMIS training forwarded for acceptance: Sample training'
        : fromStatus === 'For acceptance' && toStatus === 'Approved & Accepted'
          ? 'TMIS training approved and accepted: Sample training'
        : isReturn
          ? 'TMIS training returned for changes: Sample training'
          : `TMIS training status: ${toStatus || 'Status update'}`;
    const customMessage = byId('emailNotificationRuleMessage').value.trim();
    const defaultMessage = [
      anyTransition
        ? 'A training assigned to your office has had a status update.'
        : `A training assigned to your office has been ${statusAction}.`,
      'Sample training (ID 12345)',
      ...(anyTransition ? [] : [`Previous status: ${statusLabel(fromStatus || 'Current status')}`]),
      ...(anyTransition ? [] : [`New status: ${statusLabel(toStatus || 'New status')}`]),
      ...(isReturn ? ['Reason for return: Sample reason'] : []),
      'Status changed by Sample reviewer (DA-SAAD - Region IV-A) on Nov 21, 2026, 9:00 AM (Asia/Manila).',
      'Training office / organization: DA-SAAD - Region IV-A',
      'Sign in to TMIS to view the training if your role has access.',
    ].join('\n\n');
    const recipientNames = [...form.querySelectorAll('[data-email-notification-role-id]:checked')]
      .map(input => roles.find(role => String(role.role_id) === input.dataset.emailNotificationRoleId)?.name)
      .filter(Boolean);

    byId('emailNotificationRulePreviewTransition').textContent = transitionName(fromStatus, toStatus);
    byId('emailNotificationRulePreviewSubject').textContent = subjectTemplate ? renderTemplate(subjectTemplate) : defaultSubject;
    byId('emailNotificationRulePreviewMessage').textContent = customMessage ? renderTemplate(customMessage) : defaultMessage;
    byId('emailNotificationRulePreviewRecipients').textContent = recipientNames.length ? recipientNames.join(', ') : 'No recipient roles selected';
  }

  function renderRules() {
    ruleBody.replaceChildren();
    rules.forEach(rule => {
      const row = document.createElement('tr');
      const transitionCell = document.createElement('td');
      const transition = document.createElement('strong');
      transition.className = 'notification-rule-transition';
      transition.textContent = transitionName(rule.fromStatus, rule.toStatus);
      const eventType = document.createElement('small');
      eventType.textContent = eventDescription(rule.fromStatus, rule.toStatus);
      transitionCell.append(transition, eventType);

      const notificationCell = document.createElement('td');
      const notificationSummary = document.createElement('div');
      notificationSummary.className = 'email-notification-summary';
      const subject = document.createElement('strong');
      subject.className = 'email-notification-subject';
      subject.textContent = rule.subjectTemplate || 'Standard training update subject';
      const state = document.createElement('span');
      state.className = `notification-rule-state ${rule.isEnabled ? 'is-enabled' : 'is-disabled'}`;
      state.textContent = rule.isEnabled ? 'On' : 'Off';
      notificationSummary.append(subject, state);
      const body = document.createElement('small');
      body.textContent = rule.messageTemplate ? `${rule.messageTemplate.slice(0, 110)}${rule.messageTemplate.length > 110 ? '…' : ''}` : 'Standard detailed message';
      notificationCell.append(notificationSummary, body);
      if (rule.messageTemplate) {
        const messageDetails = document.createElement('details');
        messageDetails.className = 'email-notification-message-details';
        const summary = document.createElement('summary');
        summary.textContent = 'View full message';
        const fullMessage = document.createElement('p');
        fullMessage.textContent = rule.messageTemplate;
        messageDetails.append(summary, fullMessage);
        notificationCell.append(messageDetails);
      }

      const roleCell = document.createElement('td');
      const roleBadges = document.createElement('div');
      roleBadges.className = 'notification-rule-role-badges';
      const recipientNames = roles.filter(role => (rule.roleIds || []).map(String).includes(String(role.role_id))).map(role => role.name);
      roleBadges.replaceChildren(...(recipientNames.length ? recipientNames : ['No recipient roles']).map(name => {
        const badge = document.createElement('span');
        badge.textContent = name;
        if (name === 'No recipient roles') badge.className = 'notification-rule-no-roles';
        return badge;
      }));
      roleCell.append(roleBadges);
      row.append(transitionCell, notificationCell, roleCell);

      if (canEdit) {
        const actions = document.createElement('td');
        actions.className = 'notification-rule-actions';
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn btn-sm btn-outline-primary';
        edit.dataset.editEmailNotificationRule = String(rule.id);
        edit.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i><span>Edit</span>';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn btn-sm btn-outline-danger';
        remove.dataset.deleteEmailNotificationRule = String(rule.id);
        remove.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i><span>Delete</span>';
        actions.append(edit, remove);
        row.append(actions);
      }

      ruleBody.append(row);
    });
    empty.hidden = rules.length > 0;
  }

  if (canEdit) {
    function openEditor(rule = null) {
      editingRuleId = rule?.id || null;
      form.reset();
      byId('trainingEmailNotificationRuleId').value = rule?.id || '';
      byId('trainingEmailNotificationRuleModalTitle').textContent = rule ? 'Edit email notification rule' : 'Add email notification rule';
      byId('saveTrainingEmailNotificationRule').innerHTML = `<i class="bi bi-check2 me-1" aria-hidden="true"></i>${rule ? 'Update email rule' : 'Save email rule'}`;
      byId('emailNotificationRuleEnabled').checked = rule ? Boolean(rule.isEnabled) : true;
      byId('emailNotificationRuleSubject').value = rule?.subjectTemplate || '';
      byId('emailNotificationRuleMessage').value = rule?.messageTemplate || '';
      byId('trainingEmailNotificationRuleError').hidden = true;
      const from = byId('emailNotificationRuleFromStatus');
      from.replaceChildren(...[...new Set(transitions.map(item => item.from_status))].map(value => new Option(value === '*' ? 'Any status change' : statusLabel(value), value)));
      from.value = rule?.fromStatus || [...from.options][0]?.value || '';
      populateToStatuses(rule?.toStatus || '');
      const defaults = roles.filter(role => ['Program Administrator', 'System Administrator'].includes(role.name)).map(role => String(role.role_id));
      renderRoleToggles(rule?.roleIds || defaults);
      updateEmailPreview();
      editor.show();
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const error = byId('trainingEmailNotificationRuleError');
      error.hidden = true;
      const payload = {
        from_status: byId('emailNotificationRuleFromStatus').value,
        to_status: byId('emailNotificationRuleToStatus').value,
        is_enabled: byId('emailNotificationRuleEnabled').checked,
        subject_template: byId('emailNotificationRuleSubject').value.trim() || null,
        message_template: byId('emailNotificationRuleMessage').value.trim() || null,
        role_ids: [...form.querySelectorAll('[data-email-notification-role-id]:checked')].map(input => Number(input.dataset.emailNotificationRoleId)),
      };
      const button = byId('saveTrainingEmailNotificationRule');
      button.disabled = true;
      try {
        const id = byId('trainingEmailNotificationRuleId').value;
        const url = id ? `/system/training-email-notification-rules/${encodeURIComponent(id)}` : '/system/training-email-notification-rules';
        const response = await api(url, id ? 'PATCH' : 'POST', payload);
        editor.hide();
        showToast(response.message || 'Training email notification rule saved.');
        location.hash = '#email-notification-control';
        location.reload();
      } catch (saveError) {
        showError(error, saveError.message || 'The email rule could not be saved.');
      } finally {
        button.disabled = false;
      }
    });

    byId('addTrainingEmailNotificationRule').addEventListener('click', () => openEditor());
    byId('emailNotificationRuleFromStatus').addEventListener('change', () => populateToStatuses());
    form.addEventListener('input', updateEmailPreview);
    form.addEventListener('change', updateEmailPreview);
    ruleBody.addEventListener('click', event => {
      const edit = event.target.closest('[data-edit-email-notification-rule]');
      if (edit) {
        const rule = rules.find(item => String(item.id) === edit.dataset.editEmailNotificationRule);
        if (rule) openEditor(rule);
        return;
      }
      const remove = event.target.closest('[data-delete-email-notification-rule]');
      if (!remove) return;
      pendingDeleteRuleId = remove.dataset.deleteEmailNotificationRule;
      const rule = rules.find(item => String(item.id) === pendingDeleteRuleId);
      const recipientNames = roles.filter(role => (rule?.roleIds || []).map(String).includes(String(role.role_id))).map(role => role.name);
      byId('deleteTrainingEmailNotificationRuleSummary').textContent = rule
        ? `${transitionName(rule.fromStatus, rule.toStatus)} · ${rule.subjectTemplate || 'Standard subject'} · ${recipientNames.join(', ') || 'No recipient roles'}`
        : 'Selected email notification rule';
      byId('deleteTrainingEmailNotificationRuleError').hidden = true;
      deleteModal.show();
    });

    byId('confirmDeleteTrainingEmailNotificationRule').addEventListener('click', async event => {
      if (!pendingDeleteRuleId) return;
      const button = event.currentTarget;
      const error = byId('deleteTrainingEmailNotificationRuleError');
      error.hidden = true;
      button.disabled = true;
      try {
        const response = await api(`/system/training-email-notification-rules/${encodeURIComponent(pendingDeleteRuleId)}`, 'DELETE');
        deleteModal.hide();
        showToast(response.message || 'Training email notification rule deleted.');
        location.hash = '#email-notification-control';
        location.reload();
      } catch (deleteError) {
        showError(error, deleteError.message || 'The email rule could not be deleted.');
      } finally {
        button.disabled = false;
      }
    });
  }

  renderRules();
});
