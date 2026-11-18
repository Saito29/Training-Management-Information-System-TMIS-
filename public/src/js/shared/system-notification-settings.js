document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.settings-page');
  const settings = window.TMIS_NOTIFICATION_SETTINGS;
  if (!page || !settings) return;

  const byId = id => document.getElementById(id);
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
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
  const rules = Array.isArray(settings.rules) ? settings.rules : [];
  const roles = Array.isArray(settings.roles) ? settings.roles : [];
  const transitions = Array.isArray(settings.transitions) ? settings.transitions : [];
  const ruleBody = byId('trainingNotificationRulesBody');
  const empty = byId('trainingNotificationRulesEmpty');
  const editorElement = byId('trainingNotificationRuleModal');
  const deleteElement = byId('deleteTrainingNotificationRuleModal');
  const editor = bootstrap.Modal.getOrCreateInstance(editorElement);
  const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteElement);
  const form = byId('trainingNotificationRuleForm');
  let editingRuleId = null;
  let pendingDeleteRuleId = null;

  const token = () => form.querySelector('[name="_token"]')?.value || '';
  const showToast = (message, type = 'success') => {
    if (window.TmisToast?.show) window.TmisToast.show(message, type);
    else window.alert(message);
  };
  const showError = (element, message) => {
    element.textContent = message;
    element.hidden = false;
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
      throw new Error(validationMessage || result.message || 'The notification rule could not be saved.');
    }

    return result;
  };

  function activeRuleForTransition(fromStatus, toStatus, exceptId = null) {
    return rules.some(rule => String(rule.id) !== String(exceptId || '')
      && rule.fromStatus === fromStatus && rule.toStatus === toStatus);
  }

  function populateToStatuses(selectedValue = '') {
    const fromStatus = byId('notificationRuleFromStatus').value;
    const allowed = transitions.filter(item => item.from_status === fromStatus);
    const toStatusSelect = byId('notificationRuleToStatus');
    toStatusSelect.replaceChildren(...allowed.map(item => {
      const option = new Option(item.to_status === '*' ? 'Any status' : statusLabel(item.to_status), item.to_status);
      option.disabled = activeRuleForTransition(fromStatus, item.to_status, editingRuleId);
      return option;
    }));
    if ([...toStatusSelect.options].some(option => option.value === selectedValue && !option.disabled)) {
      toStatusSelect.value = selectedValue;
    } else {
      const firstAvailable = [...toStatusSelect.options].find(option => !option.disabled);
      toStatusSelect.value = firstAvailable?.value || '';
    }
  }

  function renderRoleToggles(selectedRoleIds = []) {
    const list = byId('notificationRuleRoles');
    const selected = new Set(selectedRoleIds.map(String));
    list.replaceChildren(...roles.map(role => {
      const label = document.createElement('label');
      label.className = 'notification-role-toggle';
      const copy = document.createElement('span');
      copy.innerHTML = `<strong>${escape(role.name)}</strong><small>Accounts assigned this role can receive the training update.</small>`;
      const switchControl = document.createElement('span');
      switchControl.className = 'form-check form-switch notification-role-switch';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'form-check-input';
      input.setAttribute('role', 'switch');
      input.dataset.notificationRoleId = String(role.role_id);
      input.checked = selected.has(String(role.role_id));
      input.setAttribute('aria-label', `Allow ${role.name} to receive this notification`);
      switchControl.append(input);
      label.append(copy, switchControl);
      return label;
    }));
  }

  function renderRules() {
    ruleBody.replaceChildren();
    for (const rule of rules) {
      const row = document.createElement('tr');
      const event = document.createElement('td');
      const transition = document.createElement('strong');
      transition.className = 'notification-rule-transition';
      transition.textContent = transitionName(rule.fromStatus, rule.toStatus);
      const eventType = document.createElement('small');
      eventType.textContent = rule.fromStatus === '*'
        ? 'All training status updates'
        : rule.fromStatus === 'For review' && rule.toStatus === 'For approval'
          ? 'Training submitted for approval'
          : rule.fromStatus === 'For approval' && rule.toStatus === 'For acceptance'
            ? 'Training forwarded for acceptance'
            : rule.toStatus === 'Approved & Accepted'
              ? 'Training approved and accepted'
              : rule.toStatus === 'Rejected'
                ? 'Training rejected'
                : rule.toStatus === 'For review' || rule.toStatus === 'For approval'
                  ? 'Training returned for changes'
                  : 'Training status update';
      event.append(transition, eventType);

      const enabledCell = document.createElement('td');
      const enabled = document.createElement('span');
      enabled.className = `notification-rule-state ${rule.isEnabled ? 'is-enabled' : 'is-disabled'}`;
      enabled.textContent = rule.isEnabled ? 'On' : 'Off';
      enabledCell.append(enabled);

      const roleCell = document.createElement('td');
      const names = roles.filter(role => (rule.roleIds || []).map(String).includes(String(role.role_id))).map(role => role.name);
      const badges = document.createElement('div');
      badges.className = 'notification-rule-role-badges';
      if (names.length) {
        badges.replaceChildren(...names.map(name => {
          const badge = document.createElement('span');
          badge.textContent = name;
          return badge;
        }));
      } else {
        const none = document.createElement('span');
        none.className = 'notification-rule-no-roles';
        none.textContent = 'No recipient roles';
        badges.append(none);
      }
      roleCell.append(badges);

      const actions = document.createElement('td');
      actions.className = 'notification-rule-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn btn-sm btn-outline-primary';
      edit.dataset.editNotificationRule = String(rule.id);
      edit.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i><span>Edit</span>';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-sm btn-outline-danger';
      remove.dataset.deleteNotificationRule = String(rule.id);
      remove.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i><span>Delete</span>';
      actions.append(edit, remove);

      row.append(event, enabledCell, roleCell, actions);
      ruleBody.append(row);
    }
    empty.hidden = rules.length > 0;
  }

  function openEditor(rule = null) {
    editingRuleId = rule?.id || null;
    form.reset();
    byId('trainingNotificationRuleId').value = rule?.id || '';
    byId('trainingNotificationRuleModalTitle').textContent = rule ? 'Edit notification rule' : 'Add notification rule';
    byId('notificationRuleEnabled').checked = rule ? Boolean(rule.isEnabled) : true;
    byId('trainingNotificationRuleError').hidden = true;
    const fromValues = [...new Set(transitions.map(item => item.from_status))];
    byId('notificationRuleFromStatus').replaceChildren(...fromValues.map(value => new Option(value === '*' ? 'Any training status change' : statusLabel(value), value)));
    byId('notificationRuleFromStatus').value = rule?.fromStatus || fromValues[0] || '';
    populateToStatuses(rule?.toStatus || '');
    const defaultRoles = roles.filter(role => ['Program Administrator', 'System Administrator'].includes(role.name)).map(role => String(role.role_id));
    renderRoleToggles(rule?.roleIds || defaultRoles);
    editor.show();
  }

  async function saveRule(event) {
    event.preventDefault();
    const error = byId('trainingNotificationRuleError');
    error.hidden = true;
    const roleIds = [...form.querySelectorAll('[data-notification-role-id]:checked')].map(input => Number(input.dataset.notificationRoleId));
    const payload = {
      from_status: byId('notificationRuleFromStatus').value,
      to_status: byId('notificationRuleToStatus').value,
      is_enabled: byId('notificationRuleEnabled').checked,
      role_ids: roleIds,
    };
    const button = byId('saveTrainingNotificationRule');
    button.disabled = true;
    try {
      const id = byId('trainingNotificationRuleId').value;
      const url = id ? `/system/training-notification-rules/${encodeURIComponent(id)}` : '/system/training-notification-rules';
      const response = await api(url, id ? 'PATCH' : 'POST', payload);
      editor.hide();
      showToast(response.message || 'Training notification rule saved.');
      location.hash = '#notification-control';
      location.reload();
    } catch (saveError) {
      showError(error, saveError.message || 'The notification rule could not be saved.');
    } finally {
      button.disabled = false;
    }
  }

  byId('addTrainingNotificationRule').addEventListener('click', () => openEditor());
  byId('notificationRuleFromStatus').addEventListener('change', () => populateToStatuses());
  form.addEventListener('submit', saveRule);
  ruleBody.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-notification-rule]');
    if (edit) {
      const rule = rules.find(item => String(item.id) === edit.dataset.editNotificationRule);
      if (rule) openEditor(rule);
      return;
    }

    const remove = event.target.closest('[data-delete-notification-rule]');
    if (!remove) return;
    pendingDeleteRuleId = remove.dataset.deleteNotificationRule;
    const rule = rules.find(item => String(item.id) === pendingDeleteRuleId);
    byId('deleteTrainingNotificationRuleSummary').textContent = rule
      ? `${transitionName(rule.fromStatus, rule.toStatus)} · ${roles.filter(role => (rule.roleIds || []).map(String).includes(String(role.role_id))).map(role => role.name).join(', ') || 'No recipient roles'}`
      : 'This notification rule';
    byId('deleteTrainingNotificationRuleError').hidden = true;
    deleteModal.show();
  });

  byId('confirmDeleteTrainingNotificationRule').addEventListener('click', async event => {
    if (!pendingDeleteRuleId) return;
    const button = event.currentTarget;
    const error = byId('deleteTrainingNotificationRuleError');
    error.hidden = true;
    button.disabled = true;
    try {
      const response = await api(`/system/training-notification-rules/${encodeURIComponent(pendingDeleteRuleId)}`, 'DELETE');
      deleteModal.hide();
      showToast(response.message || 'Training notification rule deleted.');
      location.hash = '#notification-control';
      location.reload();
    } catch (deleteError) {
      showError(error, deleteError.message || 'The notification rule could not be deleted.');
    } finally {
      button.disabled = false;
    }
  });

  renderRules();
});
