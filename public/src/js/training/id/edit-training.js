document.addEventListener('DOMContentLoaded', () => {
  const tabs = [...document.querySelectorAll('.training-view .training-tab')];
  const panels = [...document.querySelectorAll('.training-view .training-panel')];
  function showPanel(id, focus = false) {
    const selected = tabs.find(tab => tab.dataset.panel === id);
    const panel = panels.find(item => item.id === id);
    if (!selected || !panel) return;
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(item => { item.hidden = item !== panel; });
    document.dispatchEvent(new CustomEvent('training:tabchange', { detail: { panel } }));
    if (focus) selected.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.panel));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : -1;
      if (next < 0) return;
      event.preventDefault();
      showPanel(tabs[next].dataset.panel, true);
    });
  });
  document.querySelectorAll('.training-view [data-go-panel]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      showPanel(link.dataset.goPanel, true);
    });
  });
  showPanel('overview-panel');

  const form = document.getElementById('editTrainingForm');
  if (!form) return;

  const storageKey = 'tmis:training:TRN-000246:overview';
  const field = name => form.elements.namedItem(name);
  const state = document.getElementById('editTrainingState');
  const saveButton = form.querySelector('.training-edit-save');
  const trainerList = document.getElementById('editTrainerList');
  const questionnaireLists = {
    pretest: document.getElementById('editPretestList'),
    posttest: document.getElementById('editPosttestList'),
  };
  const trainers = (window.TMIS_PAGE ? window.TmisStore.records('tmis-resource-persons').map(item=>[item.id,item.office,item.name]) : [
    ['Maria Teresa Santos', 'Department of Agriculture - Quezon Provincial Office'],
    ['Roberto Mendoza', 'Agricultural Training Institute - RTC IV-A'],
    ['Liza Villanueva', 'Quezon State University'],
    ['Dr. Maria Santos', 'Agricultural Training Division (ATD)'],
    ['Engr. Carlo Mendoza', 'Agricultural Training Division (ATD)'],
  ]);
  const addresses = {
    region_4a: {
      batangas_3rd: { label: 'Batangas 3rd District', provinces: { batangas: { label: 'Batangas', municipalities: { tanauan: { label: 'Tanauan City', barangays: { san_antonio: 'San Antonio' } } } } } },
      quezon_1st: { label: 'Quezon 1st District', provinces: { quezon: { label: 'Quezon', municipalities: { jomalig: { label: 'Jomalig', barangays: { bukal: 'Bukal', talisoy: 'Talisoy' } } } } } },
      laguna_1st: { label: 'Laguna 1st District', provinces: { laguna: { label: 'Laguna', municipalities: { pakil: { label: 'Pakil', barangays: { banilan: 'Banilan', casa_real: 'Casa Real' } } } } } },
    },
    region_1: { pangasinan_1st: { label: 'Pangasinan 1st District', provinces: { pangasinan: { label: 'Pangasinan', municipalities: { alaminos: { label: 'Alaminos', barangays: { alos: 'Alos', baleyadaan: 'Baleyadaan' } } } } } } },
  };
  const addressNames = ['region_id', 'district_id', 'province_id', 'municipality_id', 'barangay_id'];
  const defaultAddress = ['region_4a', 'batangas_3rd', 'batangas', 'tanauan', 'san_antonio'];
  const questionOptions = (window.TMIS_PAGE ? {pretest:window.TmisStore.records('tmis-pre-test-questionnaires').map(item=>[item.id,item.trainingQuestionnaire]),posttest:window.TmisStore.records('tmis-post-test-questionnaires').map(item=>[item.id,item.trainingQuestionnaire])} : {
    pretest: [['PRE-GEN-01', 'General Knowledge Assessment (Pre-test)'], ['PRE-CROP-01', 'Crop Production Pre-test'], ['PRE-ORG-01', 'Organic Agriculture Pre-test'], ['PRE-BIZ-01', 'Agribusiness Pre-test']],
    posttest: [['POST-GEN-01', 'General Knowledge Assessment (Post-test)'], ['POST-CROP-01', 'Crop Production Post-test'], ['POST-ORG-01', 'Organic Agriculture Post-test'], ['POST-BIZ-01', 'Agribusiness Post-test']],
  });
  for (const type of ['pretest', 'posttest']) {
    (window.trainingAssessments?.list(type) || []).forEach(item => {
      if (!questionOptions[type].some(([id]) => id === item.id)) questionOptions[type].push([item.id, item.name]);
    });
  }

  function addTrainer(data = {}) {
    const row = document.createElement('div');
    row.className = 'training-edit-row';
    row.innerHTML = '<label>Full name<select class="form-select" data-trainer-name required></select></label><label>Organization<input class="form-control" data-trainer-organization readonly required></label><label class="training-edit-row-wide">Qualification / expertise<input class="form-control" data-trainer-qualification></label><label>Contact number<input class="form-control" data-trainer-contact type="tel" inputmode="numeric" pattern="[0-9]{10}" placeholder="10 digits after +63"></label><label>Email address<input class="form-control" data-trainer-email type="email"></label><button class="training-edit-remove" type="button" aria-label="Remove trainer" title="Remove trainer"><i class="bi bi-trash3"></i></button>';
    const select = row.querySelector('[data-trainer-name]');
    select.add(new Option('Select a trainer / facilitator', ''));
    trainers.forEach(([name, organization, label]) => {
      const option = new Option(label || name, name);
      option.dataset.organization = organization;
      select.add(option);
    });
    if (data.name && ![...select.options].some(option => option.value === data.name)) select.add(new Option(data.name, data.name));
    select.value = data.id || data.name || '';
    row.querySelector('[data-trainer-organization]').value = data.organization || select.selectedOptions[0]?.dataset.organization || '';
    row.querySelector('[data-trainer-qualification]').value = data.qualification || '';
    row.querySelector('[data-trainer-contact]').value = data.contact || '';
    row.querySelector('[data-trainer-email]').value = data.email || '';
    trainerList.append(row);
    updateRemoveButtons();
    return row;
  }

  function addQuestion(type, value = '') {
    const row = document.createElement('div');
    row.className = 'training-edit-row training-edit-question-row';
    row.innerHTML = '<label class="training-edit-row-wide">Questionnaire<select class="form-select" required></select></label><button class="training-edit-remove" type="button" aria-label="Remove questionnaire" title="Remove questionnaire"><i class="bi bi-trash3"></i></button>';
    const select = row.querySelector('select');
    select.name = `${type}_questionnaire[]`;
    select.add(new Option(`Select ${type === 'pretest' ? 'pre-test' : 'post-test'} questionnaire`, ''));
    questionOptions[type].forEach(([id, label]) => select.add(new Option(label, id)));
    if (value && ![...select.options].some(option => option.value === value)) select.add(new Option(value, value));
    select.value = value;
    questionnaireLists[type].append(row);
    updateRemoveButtons();
    return row;
  }

  function updateRemoveButtons() {
    [trainerList, ...Object.values(questionnaireLists)].forEach(list => {
      list.querySelectorAll('.training-edit-remove').forEach(button => { button.disabled = list.children.length === 1; });
    });
  }

  function addressChildren(level) {
    const [region, district, province, municipality] = addressNames.map(name => field(name).value);
    if (level === 1) return addresses[region];
    if (level === 2) return addresses[region]?.[district]?.provinces;
    if (level === 3) return addresses[region]?.[district]?.provinces?.[province]?.municipalities;
    return addresses[region]?.[district]?.provinces?.[province]?.municipalities?.[municipality]?.barangays;
  }

  function populateAddress(level, selected = '') {
    const select = field(addressNames[level]);
    const records = addressChildren(level);
    select.replaceChildren(new Option(`Choose ${['', 'district', 'province', 'municipality', 'barangay'][level]}`, ''));
    Object.entries(records || {}).forEach(([id, record]) => select.add(new Option(typeof record === 'string' ? record : record.label, id)));
    select.disabled = !records;
    select.value = [...select.options].some(option => option.value === selected) ? selected : '';
  }

  function setAddress(values) {
    field('region_id').value = values[0] || '';
    for (let level = 1; level < addressNames.length; level++) populateAddress(level, values[level]);
  }

  function collect() {
    const values = {};
    form.querySelectorAll('[name]:not([name$="[]"]):not([type="radio"])').forEach(control => { values[control.name] = control.value; });
    values.delivery_mode = form.querySelector('[name="delivery_mode"]:checked')?.value || '';
    values.trainers = [...trainerList.children].map(row => ({
      name: row.querySelector('[data-trainer-name]').value,
      organization: row.querySelector('[data-trainer-organization]').value,
      qualification: row.querySelector('[data-trainer-qualification]').value,
      contact: row.querySelector('[data-trainer-contact]').value,
      email: row.querySelector('[data-trainer-email]').value,
    }));
    for (const type of ['pretest', 'posttest']) values[type] = [...questionnaireLists[type].querySelectorAll('select')].map(select => select.value);
    if(window.TMIS_PAGE){for(const name of addressNames){const control=field(name);if(control?.selectedOptions[0]?.value)values[name.replace('_id','')]=control.selectedOptions[0].textContent;}if(values.region)values.region_id=values.region;}
    return values;
  }

  let saved;
  try { saved = JSON.parse(window.TmisStore.getItem(storageKey) || 'null'); } catch { saved = null; }
  if (saved && typeof saved === 'object') {
    Object.entries(saved).forEach(([name, value]) => {
      if (name === 'trainers' || name === 'pretest' || name === 'posttest' || addressNames.includes(name) || name === 'delivery_mode') return;
      const control = field(name);
      if (control && typeof value === 'string') control.value = value;
    });
    setAddress(addressNames.map(name => saved[name]));
    const mode = [...form.querySelectorAll('[name="delivery_mode"]')].find(input => input.value === saved.delivery_mode);
    if (mode) mode.checked = true;
  } else setAddress(defaultAddress);
  (saved?.trainers?.length ? saved.trainers : [{}]).forEach(addTrainer);
  for (const type of ['pretest', 'posttest']) {
    const defaults = window.trainingAssessments?.list(type).map(item => item.id) || [];
    const selections = saved?.[type]?.length ? saved[type] : defaults.length ? defaults : [];
    selections.forEach(value => addQuestion(type, value));
  }

  function syncDate() {
    const start = field('start_date');
    const end = field('end_date');
    end.min = start.value;
    end.setCustomValidity(start.value && end.value && end.value < start.value ? 'End date cannot be earlier than the start date.' : '');
  }
  function syncHeading() { document.getElementById('editTrainingHeading').textContent = field('training_title').value.trim() || 'Untitled training'; }
  let baseline = JSON.stringify(collect());
  function refresh() {
    syncDate();
    syncHeading();
    const dirty = JSON.stringify(collect()) !== baseline;
    saveButton.disabled = !dirty;
    state.textContent = dirty ? 'Unsaved changes' : 'Up to date';
    state.classList.toggle('is-dirty', dirty);
  }
  form.addEventListener('change', event => {
    const target = event.target;
    if (addressNames.slice(0, -1).includes(target.name)) {
      const level = addressNames.indexOf(target.name);
      for (let next = level + 1; next < addressNames.length; next++) populateAddress(next);
    }
    if (target.matches('[data-trainer-name]')) target.closest('.training-edit-row').querySelector('[data-trainer-organization]').value = target.selectedOptions[0]?.dataset.organization || '';
    refresh();
  });
  form.addEventListener('input', event => {
    if (event.target.matches('[data-trainer-contact]')) event.target.value = event.target.value.replace(/\D/g, '').replace(/^(63|0)(?=\d{10,})/, '').slice(0, 10);
    refresh();
  });
  form.addEventListener('click', event => {
    const remove = event.target.closest('.training-edit-remove');
    if (remove && !remove.disabled) { remove.closest('.training-edit-row').remove(); updateRemoveButtons(); refresh(); }
    if (event.target.closest('#editAddTrainer')) { addTrainer(); refresh(); }
    const add = event.target.closest('[data-add-questionnaire]');
    if (add) { addQuestion(add.dataset.addQuestionnaire); refresh(); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    syncDate();
    if (!form.reportValidity()) return;
    const values = collect();
    try {
      await window.TmisStore.setItem(storageKey, JSON.stringify(values));
      baseline = JSON.stringify(values);
      refresh();
      state.textContent = 'Saved to the database';
    } catch {
      state.textContent = 'Unable to save changes';
    }
  });
  refresh();
});
