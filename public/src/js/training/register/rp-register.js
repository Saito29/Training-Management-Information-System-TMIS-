document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('rpRegisterForm');
  if (!form) return;
  const steps = [...form.querySelectorAll('.rp-wizard-step')];
  const indicators = [...document.querySelectorAll('#wizard-steps [data-step]')];
  const office = document.getElementById('rpOffice');
  const otherOffice = document.getElementById('rpOtherOffice');
  const otherOfficeWrap = document.getElementById('rpOtherOfficeWrap');
  const title = document.getElementById('rpTitle');
  const otherTitle = document.getElementById('rpOtherTitle');
  const otherTitleWrap = document.getElementById('rpOtherTitleWrap');
  const phone = document.getElementById('rpPhone');
  const email = document.getElementById('rpEmail');
  const status = document.getElementById('rpFormStatus');
  const messages = ['Enter the resource person’s name.', 'Choose an affiliated office.', 'Provide a phone number or email.'];
  let currentStep = 0;

  function showStep(index) {
    currentStep = index;
    steps.forEach((step, number) => { step.hidden = number !== index; });
    indicators.forEach((item, number) => {
      item.classList.toggle('is-current', number === index);
      item.classList.toggle('is-completed', number < index);
      item.setAttribute('aria-current', number === index ? 'step' : 'false');
    });
    const progress = Math.round((index / steps.length) * 100);
    document.getElementById('step_summary_label').textContent = `Step ${index + 1} of ${steps.length}`;
    document.getElementById('step_summary_percent').textContent = `${progress}%`;
    document.getElementById('step_summary_bar').setAttribute('aria-valuenow', String(progress));
    document.getElementById('step_summary_fill').style.width = `${progress}%`;
    document.getElementById('step_summary_message').textContent = messages[index];
    steps[index].querySelector('.card-header-title')?.focus({ preventScroll: true });
  }
  function validate(index) {
    if (index === 2) {
      phone.setCustomValidity('');
      if (phone.value.trim() && !/^[+()\d .-]{7,20}$/.test(phone.value.trim())) phone.setCustomValidity('Enter a valid phone number (7–20 characters).');
    }
    for (const control of steps[index].querySelectorAll('input, select, textarea')) {
      if (control.disabled || (control === otherOffice && otherOfficeWrap.hidden) || (control === otherTitle && otherTitleWrap.hidden)) continue;
      if (control.required && !control.value.trim()) control.setCustomValidity('Please complete this field.');
      else control.setCustomValidity('');
      if (!control.checkValidity()) { control.reportValidity(); control.focus(); return false; }
    }
    if (index === 2 && !phone.value.trim() && !email.value.trim()) {
      phone.setCustomValidity('Enter a phone number or email address.');
      phone.reportValidity(); phone.focus(); return false;
    }
    phone.setCustomValidity('');
    return true;
  }
  office.addEventListener('change', () => {
    const isOther = office.value === 'Other';
    otherOfficeWrap.hidden = !isOther;
    otherOffice.required = isOther;
    if (!isOther) otherOffice.value = '';
  });
  title.addEventListener('change', () => {
    const isOther = title.value === 'Other';
    otherTitleWrap.hidden = !isOther;
    otherTitle.required = isOther;
    if (!isOther) otherTitle.value = '';
  });
  form.querySelectorAll('input, select, textarea').forEach(control => control.addEventListener('input', () => { control.setCustomValidity(''); status.textContent = ''; }));
  form.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => { if (validate(currentStep)) showStep(currentStep + 1); }));
  form.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(currentStep - 1)));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    for (let index = 0; index <steps.length; index++) { showStep(index); if (!validate(index)) return; }
    const entry = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
    if (entry.office === 'Other') entry.office = entry.other_office.trim();
    delete entry.other_office;
    if (entry.title === 'Other') entry.title = entry.other_title.trim();
    delete entry.other_title;
    try {
      const saved = JSON.parse(window.TmisStore.getItem('tmis-resource-persons') || '[]');
      const records = Array.isArray(saved) ? saved : [];
      const year = new Date().getFullYear();
      const largest = records.reduce((max, item) => {
        const match = String(item.id || '').match(new RegExp(`^RP-${year}-(\\d+)$`));
        return Math.max(max, match ? Number(match[1]) : 0);
      }, 0);
      const id = `RP-${year}-${String(largest + 1).padStart(3, '0')}`;
      records.push({ ...entry, id, status: 'Active', savedAt: new Date().toISOString() });
      await window.TmisStore.setItem('tmis-resource-persons', JSON.stringify(records));
      status.textContent = `Resource person ${id} registered in this browser. `;
      const another = document.createElement('a'); another.href = 'rp-register'; another.textContent = 'Register another'; status.append(another);
      form.querySelector('button[type="submit"]').disabled = true;
      document.getElementById('step_summary_percent').textContent = '100%';
      document.getElementById('step_summary_bar').setAttribute('aria-valuenow', '100');
      document.getElementById('step_summary_fill').style.width = '100%';
      document.getElementById('step_summary_message').textContent = 'Registration complete.';
    } catch { status.textContent = 'Could not save this resource person. Please refresh and try again.'; }
  });
  showStep(0);
});
