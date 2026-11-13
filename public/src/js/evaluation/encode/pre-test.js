document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('preTestEncodeForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const locationHeader = $('farmerTableBody')?.closest('table')?.querySelector('thead th:nth-child(2)');
  if (locationHeader) locationHeader.textContent = 'Region / Province / Municipality';
  const notify = (message, type = 'success') => { $('encodeStatus').textContent = message; window.showQuestionnaireToast(message, type); };
  const read = key => { try { const data = JSON.parse(window.TmisStore.getItem(key) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } };
  const params = new URLSearchParams(location.search);
  const recordMode = ['view', 'edit'].includes(params.get('mode')) ? params.get('mode') : '';
  const existingRecord = recordMode ? read('tmis-pre-test-encoded').find(r => r.id === params.get('record') && r.status === 'complete') : null;
  const sampleFarmers = [
    ['FMR-2026-001', 'Juan Santos Dela Cruz', 'Alabat, Quezon', 'Villa Esperanza FA', '1980-01-10', 'Male'],
    ['FMR-2026-002', 'Maria Reyes Santos', 'Perez, Quezon', 'Perez Farmers Association', '1981-02-11', 'Female'],
    ['FMR-2025-003', 'Pedro Garcia Reyes', 'Jomalig, Quezon', 'Jomalig Farmers Association', '1982-03-12', 'Male'],
    ['FMR-2026-004', 'Ana Cruz Mendoza', 'Alabat, Quezon', 'Alabat Farmers Association', '1983-04-13', 'Female'],
    ['FMR-2024-005', 'Roberto Diaz Ramos', 'Perez, Quezon', 'Perez Farmers Association', '1984-05-14', 'Male'],
    ['FMR-2026-006', 'Liza Aquino Villanueva', 'Patnanungan, Quezon', 'Patnanungan Agricultural Cooperative', '1985-06-15', 'Female'],
    ['FMR-2025-007', 'Elena Torres Garcia', 'Alabat, Quezon', 'Alabat Farmers Association', '1986-07-16', 'Female'],
    ['FMR-2024-008', 'Rico Flores Navarro', 'Jomalig, Quezon', 'Jomalig Farmers Association', '1987-08-17', 'Male'],
  ].map(([id, name, location, association, birthday, sex]) => ({ id, name, location, association, birthday, sex }));
  const loadFarmers = () => {
    const stored = read('tmis-farmers').map(r => {
      const offices = Array.isArray(r.beneficiaryOffices) ? r.beneficiaryOffices : [];
      const region = String(r.region || offices.find(office => office.isPrimary)?.region || offices[0]?.region || '');
      const province = String(r.province || '');
      const municipality = String(r.municipality || '');
      return {
        ...r,
        id: String(r.id || ''),
        name: [r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(' ') || String(r.fullName || ''),
        region,
        province,
        municipality,
        location: [region, province, municipality, r.barangay].filter(Boolean).join(', ') || String(r.location || ''),
        association: String(r.organization || r.association || r.associate_name || ''),
        birthday: String(r.birthDate || r.birthday || ''),
        sex: String(r.sex || ''),
      };
    }).filter(r => r.id && r.name);
    return window.TMIS_PAGE ? stored : stored.length ? stored : sampleFarmers;
  };
  let farmers = loadFarmers();
  const questionnaires = read('tmis-pre-test-questionnaires').filter(r => r.id && r.trainingQuestionnaire && ['active', 'draft'].includes(String(r.status || 'Active').toLowerCase()));
  if (existingRecord) {
    const index = questionnaires.findIndex(r => r.id === existingRecord.questionnaireId);
    const snapshot = { ...(questionnaires[index] || {}), id: existingRecord.questionnaireId, trainingQuestionnaire: existingRecord.questionnaireName, implementingOffice: existingRecord.implementingOffice, totalItems: existingRecord.totalItems };
    if (index >= 0) questionnaires[index] = snapshot; else questionnaires.push(snapshot);
  }
  let selectedFarmer = null;
  const draftId = new URLSearchParams(location.search).get('draft');
  const resumedDraft = existingRecord || (draftId ? read('tmis-pre-test-encoded').find(r => r.id === draftId && r.status === 'draft') : null);
  let currentPage = 1;
  const dateLabel = value => { if (!value) return '—'; const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
  const age = birthday => { const d = new Date(`${birthday}T00:00:00`); if (Number.isNaN(d.getTime())) return '—'; const now = new Date(); return String(now.getFullYear() - d.getFullYear() - (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate()) ? 1 : 0)); };
  const selectedQuestionnaire = () => questionnaires.find(r => r.id === $('questionnaireSelect').value);
  const questionnaireMaximum = questionnaire => questionnaire?.questions?.length || Number(questionnaire?.totalItems) || 0;
  function renderFarmers() {
    const organization = $('organizationFilter').value, query = $('farmerSearch').value.trim().toLocaleLowerCase();
    const matches = farmers.filter(r => (!organization || r.association === organization) && (!query || `${r.name} ${r.location} ${r.association}`.toLocaleLowerCase().includes(query)));
    const pageSize = $('farmerRowsPerPage').value === 'all' ? Math.max(matches.length, 1) : Number($('farmerRowsPerPage').value);
    const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * pageSize;
    const visible = matches.slice(start, start + pageSize);
    const body = $('farmerTableBody'); body.replaceChildren();
    visible.forEach(r => { const row = document.createElement('tr'); row.tabIndex = 0; row.setAttribute('aria-label', `Select farmer ${r.name}`); if (r.id === selectedFarmer?.id) row.classList.add('is-selected'); [r.name, r.location || '—', r.association || '—', age(r.birthday), dateLabel(r.birthday), r.sex || '—'].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }); const cell = document.createElement('td'), button = document.createElement('button'); button.type = 'button'; button.className = 'select-farmer'; button.textContent = r.id === selectedFarmer?.id ? 'Selected' : 'Select'; button.setAttribute('aria-label', `Select ${r.name}`); button.addEventListener('click', () => selectFarmer(r)); cell.append(button); row.append(cell); row.addEventListener('click', event => { if (!event.target.closest('button,a,input,select,textarea,label')) selectFarmer(r); }); row.addEventListener('keydown', event => { if (event.target === row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectFarmer(r); } }); body.append(row); });
    if (!matches.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 7; cell.className = 'table-empty'; cell.textContent = 'No farmers match the current filters.'; row.append(cell); body.append(row); }
    $('farmerTableStatus').textContent = `${matches.length} farmer${matches.length === 1 ? '' : 's'} shown`;
    const range = matches.length ? `Showing ${start + 1}–${start + visible.length} of ${matches.length} farmers` : 'Showing 0 of 0 farmers';
    $('farmerTableRange').textContent = range; $('farmerTableRangeTop').textContent = range;
    ['farmerPaginationTop', 'farmerPagination'].forEach(id => {
      const pagination = $(id); pagination.replaceChildren();
      const addButton = (label, page, disabled, current = false) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = disabled; button.className = current ? 'is-current' : ''; if (current) button.setAttribute('aria-current', 'page'); button.setAttribute('aria-label', label === 'Previous' || label === 'Next' ? `${label} page` : `Page ${label}`); button.addEventListener('click', () => { currentPage = page; renderFarmers(); }); pagination.append(button); };
      addButton('Previous', currentPage - 1, currentPage === 1);
      const first = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
      for (let page = first; page <= Math.min(pageCount, first + 4); page++) addButton(String(page), page, false, page === currentPage);
      addButton('Next', currentPage + 1, currentPage === pageCount);
    });
  }
  function selectFarmer(r) { selectedFarmer = r; $('farmerId').value = r.id; $('farmerName').value = r.name; $('farmerAssociation').value = r.association; $('farmerLocation').value = r.location; $('farmerBirthday').value = dateLabel(r.birthday); if (questionnaires.length) $('encodeStatus').textContent = 'Fields marked * are required.'; renderFarmers(); updateSummary(); }
  function updateOrganizations() { const control = $('organizationFilter'), chosen = control.value; control.replaceChildren(new Option('All organizations', '')); [...new Set(farmers.map(r => r.association).filter(Boolean))].sort().forEach(name => control.add(new Option(name, name))); control.value = [...control.options].some(option => option.value === chosen) ? chosen : ''; }
  function refreshFarmersForTraining() {
    const training = window.TMIS_TRAINING_PICKER?.selectedTraining() || null;
    if (typeof window.TmisTrainingData?.participantsForEncoding !== 'function') {
      notify('Training participant filtering is unavailable. Refresh the page and try again.', 'error');
      return;
    }
    const eligible = window.TmisTrainingData.participantsForEncoding(training, 'pre-test', existingRecord?.id || '');
    const eligibleIds = new Set(eligible.map(record => String(record.id)));
    farmers = loadFarmers().filter(farmer => eligibleIds.has(farmer.id));
    if (selectedFarmer && !farmers.some(farmer => farmer.id === selectedFarmer.id)) {
      selectedFarmer = null;
      ['farmerId', 'farmerName', 'farmerAssociation', 'farmerLocation', 'farmerBirthday'].forEach(id => { $(id).value = ''; });
    }
    updateOrganizations();
    currentPage = 1;
    renderFarmers();
    updateSummary();
  }
  function updateQuestionnaireChoices() {
    const select = $('questionnaireSelect');
    const selectedId = select.value || resumedDraft?.questionnaireId || '';
    const training = window.TMIS_TRAINING_PICKER?.selectedTraining();
    const assignedIds = training ? new Set((training.pretest || []).map(String)) : null;
    const choices = assignedIds ? questionnaires.filter(questionnaire => assignedIds.has(String(questionnaire.id))) : questionnaires;
    select.replaceChildren(new Option('Select a questionnaire', ''), ...choices.map(questionnaire => new Option(`${questionnaire.trainingQuestionnaire}${String(questionnaire.status).toLowerCase() === 'draft' ? ' (Draft)' : ''}`, questionnaire.id)));
    select.value = choices.some(questionnaire => questionnaire.id === selectedId) ? selectedId : '';
    updateQuestionnaire();
    refreshFarmersForTraining();
  }
  updateOrganizations();
  questionnaires.forEach(r => $('questionnaireSelect').add(new Option(`${r.trainingQuestionnaire}${String(r.status).toLowerCase() === 'draft' ? ' (Draft)' : ''}`, r.id)));
  if (!questionnaires.length) $('encodeStatus').textContent = 'No pre-test questionnaires found. Register a questionnaire before encoding a result.';
  function updateQuestionnaire() { const r = selectedQuestionnaire(), maximum = questionnaireMaximum(r); $('implementingOffice').value = r?.implementingOffice || ''; $('totalItems').value = r ? maximum : ''; $('questionnaireDescription').value = r?.description || ''; $('score').max = r ? String(maximum) : ''; $('scoreHint').textContent = r ? `Maximum score: ${maximum}. Enter a whole number from 0 to ${maximum}.` : 'Select a questionnaire to see the maximum score.'; updateSummary(); }
  function updateSummary() { const r = selectedQuestionnaire(); $('summaryQuestionnaire').textContent = r?.trainingQuestionnaire || 'Not selected'; $('summaryFarmer').textContent = selectedFarmer?.name || 'Not selected'; $('summaryCommodity').textContent = $('commodity').value.trim() || 'Not entered'; $('summaryDate').textContent = $('testDate').value ? dateLabel($('testDate').value) : 'Not selected'; $('summaryScore').textContent = $('score').value === '' ? 'Not entered' : `${$('score').value}${r ? ` / ${questionnaireMaximum(r)}` : ''}`; }
  function clearEntry(resetFilters = false) {
    form.reset();
    selectedFarmer = null;
    activeDraftId = null;
    if (resetFilters) { $('organizationFilter').value = ''; $('farmerSearch').value = ''; currentPage = 1; }
    updateQuestionnaire();
    renderFarmers();
    $('summaryStatus').textContent = 'New entry';
  }
  async function save(draft) {
    if (recordMode === 'view') return;
    if (recordMode && !existingRecord) return;
    if (recordMode === 'edit') draft = false;
    const q = selectedQuestionnaire();
    if (!draft && String(q?.status).toLowerCase() === 'draft') { notify('Activate this questionnaire before completing an assessment.', 'error'); return; }
    if (!draft && (!selectedFarmer || !q)) { notify('Select a farmer and a questionnaire before saving.', 'error'); return; }
    if (!draft && !form.reportValidity()) { $('encodeStatus').textContent = 'Enter the date and a valid score.'; return; }
    const score = $('score').value === '' ? null : Number($('score').value);
    if (score !== null && (!Number.isInteger(score) || score < 0 || (q && score > questionnaireMaximum(q)))) { notify('Score must be a whole number within the questionnaire total.', 'error'); return; }
    const training = window.TMIS_TRAINING_PICKER?.selectedTraining();
    const record = { id: activeDraftId || crypto.randomUUID(), trainingId: training?.id || resumedDraft?.trainingId || '', questionnaireId: q?.id || '', questionnaireName: q?.trainingQuestionnaire || '', implementingOffice: q?.implementingOffice || '', totalItems: q ? questionnaireMaximum(q) : null, farmerId: selectedFarmer?.id || '', farmerName: selectedFarmer?.name || '', farmerAssociation: selectedFarmer?.association || '', farmerLocation: selectedFarmer?.location || '', farmerBirthday: selectedFarmer?.birthday || '', farmerSex: selectedFarmer?.sex || '', date: $('testDate').value, commodity: $('commodity').value.trim(), score, status: draft ? 'draft' : 'complete', savedAt: existingRecord?.savedAt || new Date().toISOString(), updatedAt: recordMode === 'edit' ? new Date().toISOString() : undefined };
    try {
      const records = read('tmis-pre-test-encoded');
      const index = records.findIndex(item => item.id === record.id);
      if (index >= 0) records[index] = record; else records.push(record);
      await window.TmisStore.setItem('tmis-pre-test-encoded', JSON.stringify(records));
      if (draft) { activeDraftId = record.id; $('summaryStatus').textContent = 'Draft saved'; }
      else if (recordMode !== 'edit') clearEntry();
      notify(recordMode === 'edit' ? 'Pre-test result updated.' : draft ? 'Draft saved to the database.' : 'Pre-test result saved to the database.');
    } catch { notify('Unable to save this result. Refresh and try again.', 'error'); }
  }
  $('organizationFilter').addEventListener('change', () => { currentPage = 1; renderFarmers(); }); $('farmerSearch').addEventListener('input', () => { currentPage = 1; renderFarmers(); });
  ['farmerRowsPerPageTop', 'farmerRowsPerPage'].forEach(id => $(id).addEventListener('change', () => { const value = $(id).value; $('farmerRowsPerPageTop').value = value; $('farmerRowsPerPage').value = value; currentPage = 1; renderFarmers(); }));
  $('refreshFarmers').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      if (window.TMIS_PAGE) await window.TmisStore.refresh();
      refreshFarmersForTraining();
      $('farmerTableStatus').textContent += ' · Refreshed';
    } catch (error) {
      notify(error.message || 'The farmer list could not be refreshed.', 'error');
    } finally {
      button.disabled = false;
    }
  });
  $('questionnaireSelect').addEventListener('change', () => { updateQuestionnaire(); refreshFarmersForTraining(); }); form.addEventListener('input', updateSummary); form.addEventListener('change', updateSummary);
  window.addEventListener('tmis:training-selected', updateQuestionnaireChoices);
  window.addEventListener('tmis:data-updated', refreshFarmersForTraining);
  form.addEventListener('invalid', () => { notify('Enter the required fields and a valid score before saving.', 'error'); }, true);
  form.addEventListener('submit', async e => { e.preventDefault(); await save(false); }); $('saveDraft').addEventListener('click', async () => await save(true));
  $('resetEncode').addEventListener('click', () => { clearEntry(true); $('encodeStatus').textContent = ''; });
  let activeDraftId = resumedDraft?.id || null;
  if (resumedDraft) {
    $('questionnaireSelect').value = resumedDraft.questionnaireId || '';
    updateQuestionnaire();
    const farmer = (existingRecord?.farmerId ? { id: resumedDraft.farmerId, name: resumedDraft.farmerName || '', association: resumedDraft.farmerAssociation || '', location: resumedDraft.farmerLocation || '', birthday: resumedDraft.farmerBirthday || '', sex: resumedDraft.farmerSex || '' } : null) || farmers.find(r => r.id === resumedDraft.farmerId) || (resumedDraft.farmerId ? { id: resumedDraft.farmerId, name: resumedDraft.farmerName || '', association: resumedDraft.farmerAssociation || '', location: resumedDraft.farmerLocation || '', birthday: resumedDraft.farmerBirthday || '', sex: resumedDraft.farmerSex || '' } : null);
    if (farmer) selectFarmer(farmer);
    $('testDate').value = resumedDraft.date || '';
    $('commodity').value = resumedDraft.commodity || '';
    $('score').value = resumedDraft.score ?? '';
    $('summaryStatus').textContent = 'Draft loaded';
    $('encodeStatus').textContent = 'Encoding draft loaded. Complete the remaining fields and save.';
  }
  updateQuestionnaireChoices();
  if (recordMode) {
    const heading = document.querySelector('.encode-heading h1');
    if (heading) heading.textContent = `${recordMode === 'view' ? 'View' : 'Edit'} pre-test result`;
    $('saveDraft').hidden = true;
    $('resetEncode').hidden = true;
    if (!existingRecord) { form.querySelector('[type="submit"]').hidden = true; $('encodeStatus').textContent = 'This submitted result could not be found.'; }
    else if (recordMode === 'view') {
      document.querySelector('.farmer-table-card').hidden = true;
      document.querySelector('.farmer-table-card + .farmer-table-footer').hidden = true;
      form.querySelectorAll('input, select, textarea, button').forEach(control => { control.disabled = true; });
      form.querySelector('[type="submit"]').hidden = true;
      $('summaryStatus').textContent = 'Submitted';
    } else { form.querySelector('[type="submit"]').textContent = 'Update pre-test result'; $('summaryStatus').textContent = 'Editing submitted result'; }
  }
});
