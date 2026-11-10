document.addEventListener('DOMContentLoaded', () => {
  const region = document.querySelector('select[name="region"]');
  const office = document.querySelector('select[name="office"], select[name="implementing_office"]');
  if (!region || !office) return;

  function syncOffice() {
    office.querySelectorAll('[data-regional-office]').forEach((option) => option.remove());
    if (!region.value) return;
    const option = document.createElement('option');
    option.value = `DA Regional Field Office - ${region.value}`;
    option.textContent = option.value;
    option.dataset.regionalOffice = 'true';
    office.add(option, 1);
    office.value = option.value;
  }

  region.addEventListener('change', syncOffice);
  window.syncQuestionnaireOffice = syncOffice;
});
