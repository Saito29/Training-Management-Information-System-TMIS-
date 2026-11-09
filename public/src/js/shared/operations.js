(() => {
  const message = document.querySelector('[data-operation-message]')?.dataset.operationMessage;
  const type = document.querySelector('[data-operation-message]')?.dataset.operationType || 'success';
  if (message) window.TmisToast?.show(message, type);
  // Validation feedback is announced once through the toast stack instead of persistent inline alert rows.
  document.querySelectorAll('[data-operation-errors] span').forEach(error => {
    const text = error.textContent.trim();
    if (text) window.TmisToast?.show(text, 'error');
  });
  document.querySelectorAll('[data-confirm-delete]').forEach(form => form.addEventListener('submit', event => {
    if (!confirm('Move this record to trash? Its audit history will be retained.')) event.preventDefault();
  }));
  const region = document.querySelector('[data-region-select]');
  const office = document.querySelector('[data-office-select]');
  if (region && office) {
    const filter = () => {
      for (const option of office.options) {
        if (!option.value) continue;
        option.hidden = option.dataset.region !== region.value;
        option.disabled = option.hidden;
      }
      if (office.selectedOptions[0]?.disabled) office.value = '';
    };
    region.addEventListener('change', filter);
    filter();
  }
  document.querySelectorAll('form').forEach(form => {
    const accountRole = form.querySelector('[data-account-role]');
    const accountCredential = form.querySelector('[data-account-credential]');
    if (!accountRole || !accountCredential) return;
    const profileResetNotice = form.querySelector('[data-profile-reset-notice]');
    const filterAccessProfiles = (showResetNotice = false) => {
      for (const option of accountCredential.options) {
        if (!option.value) continue;
        option.hidden = option.dataset.roleId !== accountRole.value;
        option.disabled = option.hidden;
      }
      const incompatibleSelection = accountCredential.selectedOptions[0]?.disabled ?? false;
      if (incompatibleSelection) accountCredential.value = '';
      if (profileResetNotice && showResetNotice) profileResetNotice.hidden = !incompatibleSelection;
    };
    accountRole.addEventListener('change', () => filterAccessProfiles(true));
    accountCredential.addEventListener('change', () => {
      if (profileResetNotice) profileResetNotice.hidden = true;
    });
    filterAccessProfiles();
  });
  document.querySelector('[data-add-question]')?.addEventListener('click', event => {
    const label = document.createElement('label');
    label.className = 'd-block mb-2';
    label.textContent = 'Question';
    const input = document.createElement('input');
    Object.assign(input, {name: 'questions[]', className: 'form-control', required: true, maxLength: 1000, placeholder: 'Enter question'});
    label.append(input);
    event.target.before(label);
    input.focus();
  });
})();
document.querySelector('[data-evaluation-questionnaire]')?.addEventListener('change', event => {
  const fieldset = document.querySelector('[data-evaluation-answers]');
  fieldset.querySelectorAll('label, p').forEach(element => element.remove());
  const questions = JSON.parse(event.target.selectedOptions[0]?.dataset.questions || '[]');
  for (const question of questions) {
    const label = document.createElement('label');
    label.className = 'd-block mb-3';
    label.textContent = question;
    const answer = document.createElement('textarea');
    Object.assign(answer, {name: 'answers[]', className: 'form-control', required: true, maxLength: 4000, placeholder: 'Enter answer'});
    label.append(answer);
    fieldset.append(label);
  }
});
