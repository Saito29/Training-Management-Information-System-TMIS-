document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.card-form form');
  if (!form) return;
  const steps = [...form.querySelectorAll('.fa-wizard-step')];
  const indicators = [...document.querySelectorAll('#wizard-steps [data-step]')];
  const fields = ['faProvince', 'faDistrict', 'faMunicipality', 'faBarangay'].map(id => document.getElementById(id));
  const [province, district, municipality, barangay] = fields;
  const locations = {
    Quezon: {
      '1st District': {Jomalig:['Apad', 'Bukal', 'Talisoy']},
      '2nd District': {Alabat:['Villa Esperanza'], Perez:['Villamanzano Sur']},
    },
    Batangas: {
      '3rd District': {'Tanauan City':['San Antonio', 'Darasa', 'Balele', 'Trapiche', 'Mabini', 'Poblacion']},
    },
    Laguna: {'1st District': {Pakil:['Banilan', 'Casa Real']}},
    Pangasinan: {'1st District': {Alaminos:['Alos', 'Baleyadaan']}},
  };

  function fill(select, values, prompt) {
    select.replaceChildren(new Option(prompt, ''), ...values.map(value => new Option(value, value)));
    select.disabled = values.length === 0;
  }
  function showStep(index) {
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
    indicators.forEach((indicator, stepIndex) => {
      indicator.classList.toggle('is-current', stepIndex === index);
      indicator.classList.toggle('is-completed', stepIndex < index);
      indicator.setAttribute('aria-current', stepIndex === index ? 'step' : 'false');
    });
    steps[index].querySelector('h6')?.focus({ preventScroll: true });
  }
  function validateStep(index) {
    const invalid = [...steps[index].querySelectorAll('[required]')].find(control => !control.checkValidity());
    if (invalid) { invalid.reportValidity(); invalid.focus(); return false; }
    return true;
  }

  fill(province, Object.keys(locations).sort(), 'Choose province');
  fill(district, [], 'Choose province first');
  fill(municipality, [], 'Choose district first');
  fill(barangay, [], 'Choose municipality first');
  province.addEventListener('change', () => {
    fill(district, Object.keys(locations[province.value] || {}), 'Choose district');
    fill(municipality, [], 'Choose district first');
    fill(barangay, [], 'Choose municipality first');
  });
  district.addEventListener('change', () => {
    fill(municipality, Object.keys(locations[province.value]?.[district.value] || {}), 'Choose municipality');
    fill(barangay, [], 'Choose municipality first');
  });
  municipality.addEventListener('change', () => {
    fill(barangay, locations[province.value]?.[district.value]?.[municipality.value] || [], 'Choose barangay');
  });
  document.getElementById('faNextStep').addEventListener('click', () => {
    if (validateStep(0)) showStep(1);
  });
  document.getElementById('faPreviousStep').addEventListener('click', () => showStep(0));
  const today = new Date();
  document.getElementById('faRegistrationDate').max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yearCovered = document.getElementById('faYearCovered');
  for (let year = today.getFullYear() + 1; year >= 2000; year--) yearCovered.add(new Option(String(year), String(year)));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateStep(0)) { showStep(0); return; }
    if (!validateStep(1)) return;
    const entry = Object.fromEntries(new FormData(form));
    try {
      const records = JSON.parse(window.TmisStore.getItem('tmis-farmer-associations') || '[]');
      const year = new Date().getFullYear();
      const largestNumber = records.reduce((largest, record) => {
        const match = String(record.id || '').match(new RegExp(`^FA-${year}-(\\d+)$`));
        return Math.max(largest, match ? Number(match[1]) : 0);
      }, 0);
      const id = `FA-${year}-${String(largestNumber + 1).padStart(3, '0')}`;
      records.push({ ...entry, id, status: 'Active', savedAt: new Date().toISOString() });
      await window.TmisStore.setItem('tmis-farmer-associations', JSON.stringify(records));
      const status = document.getElementById('faFormStatus');
      status.textContent = `Farmer association ${id} saved. `;
      const listLink = document.createElement('a');
      listLink.href = '../details/fa-all-list';
      listLink.textContent = 'View the FA list';
      status.append(listLink);
    } catch {
      document.getElementById('faFormStatus').textContent = 'Could not save the association. Please refresh and try again.';
    }
  });
  showStep(0);
});
