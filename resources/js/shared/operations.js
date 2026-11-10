(() => {
  const message = document.querySelector('[data-operation-message]')?.dataset.operationMessage;
  if (message) window.TmisToast?.show(message, 'success');
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

