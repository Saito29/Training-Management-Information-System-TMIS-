document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('trainingEvaluationEncodeForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const locationHeader = $('farmerTableBody')?.closest('table')?.querySelector('thead th:nth-child(2)');
  if (locationHeader) locationHeader.textContent = 'Region / Province / Municipality';
  const notify = (message, type = 'success') => { $('encodeStatus').textContent = message; window.showQuestionnaireToast(message, type); };
  const read = key => { try { const data = JSON.parse(window.TmisStore.getItem(key) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } };
  const params = new URLSearchParams(location.search);
  const recordMode = ['view', 'edit'].includes(params.get('mode')) ? params.get('mode') : '';
  const existingRecord = recordMode ? read('tmis-training-evaluation-encoded').find(r => r.id === params.get('record') && r.status === 'complete') : null;
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
  const questionnaires = read('tmis-training-evaluation-questionnaires').filter(r => r.id && ['active', 'draft'].includes(String(r.status || 'Active').toLowerCase()) && Array.isArray(r.questions));
  if (existingRecord) {
    const index = questionnaires.findIndex(r => r.id === existingRecord.questionnaireId);
    const snapshot = { ...(questionnaires[index] || {}), id: existingRecord.questionnaireId, questionnaireName: existingRecord.questionnaireName, office: existingRecord.implementingOffice, questions: (existingRecord.ratings || []).map(item => item.question) };
    if (index >= 0) questionnaires[index] = snapshot; else questionnaires.push(snapshot);
  }
  let selectedFarmer = null;
  const draftId = new URLSearchParams(location.search).get('draft');
  const resumedDraft = existingRecord || (draftId ? read('tmis-training-evaluation-encoded').find(r => r.id === draftId && r.status === 'draft') : null);
  let currentPage = 1;
  let activeDraftId = resumedDraft?.id || null;
  let farmerRenderTimer;
  let ratingRenderTimer;
  let ratingsLoading = false;
  const dateLabel = value => { if (!value) return '?'; const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
  const age = birthday => { const d = new Date(`${birthday}T00:00:00`); if (Number.isNaN(d.getTime())) return '?'; const now = new Date(); return String(now.getFullYear() - d.getFullYear() - (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate()) ? 1 : 0)); };
  const selectedQuestionnaire = () => questionnaires.find(r => r.id === $('questionnaireSelect').value);
  function showLoadingRow(body, message) {
    const row = document.createElement('tr'), cell = document.createElement('td'), spinner = document.createElement('span'), label = document.createElement('span');
    cell.colSpan = 7; cell.className = 'table-loading'; spinner.className = 'table-loading-spinner'; spinner.setAttribute('aria-hidden', 'true'); label.textContent = message;
    cell.append(spinner, label); row.append(cell); body.replaceChildren(row); body.setAttribute('aria-busy', 'true');
  }
  function queueFarmerRender() {
    clearTimeout(farmerRenderTimer);
    showLoadingRow($('farmerTableBody'), 'Loading farmers?');
    farmerRenderTimer = setTimeout(renderFarmers, 180);
  }
  function renderFarmers() {
    clearTimeout(farmerRenderTimer);
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
    body.setAttribute('aria-busy', 'false');
  }
  function selectFarmer(r) { selectedFarmer = r; $('farmerId').value = r.id; $('farmerName').value = r.name; $('farmerAssociation').value = r.association; $('farmerLocation').value = r.location; $('farmerBirthday').value = dateLabel(r.birthday); if (questionnaires.length) $('encodeStatus').textContent = 'Fields marked * are required.'; renderFarmers(); updateSummary(); }
  function updateOrganizations() { const control = $('organizationFilter'), chosen = control.value; control.replaceChildren(new Option('All organizations', '')); [...new Set(farmers.map(r => r.association).filter(Boolean))].sort().forEach(name => control.add(new Option(name, name))); control.value = [...control.options].some(option => option.value === chosen) ? chosen : ''; }
  function refreshFarmersForTraining() {
    const training = window.TMIS_TRAINING_PICKER?.selectedTraining() || null;
    if (typeof window.TmisTrainingData?.participantsForEncoding !== 'function') {
      notify('Training participant filtering is unavailable. Refresh the page and try again.', 'error');
      return;
    }
    const eligible = window.TmisTrainingData.participantsForEncoding(training, 'training-evaluation', existingRecord?.id || '');
    const eligibleIds = new Set(eligible.map(record => String(record.id)));
    farmers = loadFarmers().filter(farmer => eligibleIds.has(farmer.id));
    if (selectedFarmer && !farmers.some(farmer => farmer.id === selectedFarmer.id)) {
      selectedFarmer = null;
      ['farmerId', 'farmerName', 'farmerAssociation', 'farmerLocation', 'farmerBirthday'].forEach(id => { $(id).value = ''; });
    }
    updateOrganizations();
    currentPage = 1;
    queueFarmerRender();
    updateSummary();
  }
  updateOrganizations();
  questionnaires.forEach(r => $('questionnaireSelect').add(new Option(`${r.questionnaireName || 'Untitled questionnaire'}${String(r.status).toLowerCase() === 'draft' ? ' (Draft)' : ''}`, r.id)));
  if (!questionnaires.length) $('encodeStatus').textContent = 'No saved training evaluation questionnaires found. Create one before encoding.';
  const scale = q => [5, 4, 3, 2, 1].map(score => q?.ratingScale?.find(item => Number(item.score) === score) || ({ score, label: ({ 5: 'Very Good', 4: 'Good', 3: 'Neutral', 2: 'Not Good', 1: 'Very Not Good' })[score], description: '' }));
  function queueRatingRender() {
    clearTimeout(ratingRenderTimer);
    ratingsLoading = true;
    showLoadingRow($('ratingRows'), 'Loading questionnaire ratings?');
    $('questionCount').textContent = 'Loading?';
    ratingRenderTimer = setTimeout(renderRatings, 180);
  }
  function renderRatings() {
    const q = selectedQuestionnaire(), questions = q?.questions || [], body = $('ratingRows');
    const selectedScale = scale(q);
    selectedScale.forEach(item => {
      const label = document.querySelector(`[data-rating-label="${item.score}"]`);
      if (label) { label.textContent = item.label; label.title = item.description || ''; }
    });
    body.replaceChildren();
    $('questionCount').textContent = `${questions.length} question${questions.length === 1 ? '' : 's'}`;
    if (!questions.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 7; cell.className = 'ratings-empty'; cell.textContent = q ? 'This questionnaire has no questions to rate.' : 'Select a questionnaire to load its questions.'; row.append(cell); body.append(row); }
    questions.forEach((question, index) => {
      const row = document.createElement('tr');
      const number = document.createElement('th'); number.scope = 'row'; number.textContent = String(index + 1); row.append(number);
      const prompt = document.createElement('td'); prompt.textContent = typeof question === 'string' ? question : String(question.text || ''); row.append(prompt);
      selectedScale.forEach(item => { const cell = document.createElement('td'), label = document.createElement('label'), input = document.createElement('input'), indicator = document.createElement('span'); label.className = 'rating-choice'; input.type = 'radio'; input.name = `rating_${index}`; input.value = String(item.score); input.required = true; input.setAttribute('aria-label', `Question ${index + 1}: ${item.score} ${item.label}`); indicator.setAttribute('aria-hidden', 'true'); label.append(input, indicator); cell.append(label); row.append(cell); });
      body.append(row);
    });
    const guide = $('ratingGuide'); guide.replaceChildren();
    if (!q) { const hint = document.createElement('p'); hint.textContent = 'Select a questionnaire to see its rating scale.'; guide.append(hint); }
    else selectedScale.forEach(item => { const row = document.createElement('div'), number = document.createElement('strong'), text = document.createElement('div'), title = document.createElement('b'), description = document.createElement('p'); row.className = 'rating-guide-row'; number.textContent = String(item.score); title.textContent = item.label; description.textContent = item.description || ''; text.append(title, description); row.append(number, text); guide.append(row); });
    body.setAttribute('aria-busy', 'false');
    ratingsLoading = false;
    updateSummary();
  }
  function updateQuestionnaire(immediate = false) { const q = selectedQuestionnaire(); $('implementingOffice').value = q?.office || ''; $('questionnaireDescription').value = q?.description || ''; clearTimeout(ratingRenderTimer); if (immediate || !q) renderRatings(); else queueRatingRender(); }
  function updateSummary() { const q = selectedQuestionnaire(), total = q?.questions?.length || 0, rated = [...$('ratingRows').querySelectorAll('input[type="radio"]:checked')].length; $('summaryQuestionnaire').textContent = q?.questionnaireName || 'Not selected'; $('summaryFarmer').textContent = selectedFarmer?.name || 'Not selected'; $('summaryDate').textContent = $('testDate').value ? dateLabel($('testDate').value) : 'Not selected'; $('progressLabel').textContent = `${rated} of ${total} rated`; $('progressPercent').textContent = `${total ? Math.round(rated / total * 100) : 0}%`; $('progressFill').style.width = `${total ? rated / total * 100 : 0}%`; }
  function clearEntry(resetFilters = false) { form.reset(); selectedFarmer = null; activeDraftId = null; if (resetFilters) { $('organizationFilter').value = ''; $('farmerSearch').value = ''; currentPage = 1; } updateQuestionnaire(true); clearTimeout(farmerRenderTimer); renderFarmers(); $('summaryStatus').textContent = 'New entry'; }
  async function save(draft) {
    if (recordMode === 'view') return;
    if (recordMode && !existingRecord) return;
    if (recordMode === 'edit') draft = false;
    const q = selectedQuestionnaire();
    if (!draft && String(q?.status).toLowerCase() === 'draft') { notify('Activate this questionnaire before completing an assessment.', 'error'); return; }
    if (ratingsLoading) { notify('Wait for the questionnaire ratings to finish loading.', 'error'); return; }
    if (!draft && (!selectedFarmer || !q)) { notify('Select a farmer and training evaluation questionnaire before saving.', 'error'); return; }
    if (!draft && !q.questions.length) { notify('The selected questionnaire has no questions to rate.', 'error'); return; }
    if (!draft && !form.reportValidity()) return;
    const ratings = (q?.questions || []).map((question, index) => ({ question: typeof question === 'string' ? question : String(question.text || ''), rating: Number(form.querySelector(`input[name="rating_${index}"]:checked`)?.value) || null }));
    const training = window.TMIS_TRAINING_PICKER?.selectedTraining();
    const record = { id: activeDraftId || crypto.randomUUID(), trainingId: training?.id || resumedDraft?.trainingId || '', questionnaireId: q?.id || '', questionnaireName: q?.questionnaireName || '', implementingOffice: q?.office || '', farmerId: selectedFarmer?.id || '', farmerName: selectedFarmer?.name || '', farmerAssociation: selectedFarmer?.association || '', farmerLocation: selectedFarmer?.location || '', farmerBirthday: selectedFarmer?.birthday || '', farmerSex: selectedFarmer?.sex || '', date: $('testDate').value, ratings, comments: $('comments').value.trim(), status: draft ? 'draft' : 'complete', savedAt: existingRecord?.savedAt || new Date().toISOString(), updatedAt: recordMode === 'edit' ? new Date().toISOString() : undefined };
    try { const records = read('tmis-training-evaluation-encoded'), index = records.findIndex(item => item.id === record.id); if (index >= 0) records[index] = record; else records.push(record); await window.TmisStore.setItem('tmis-training-evaluation-encoded', JSON.stringify(records)); if (draft) { activeDraftId = record.id; $('summaryStatus').textContent = 'Draft saved'; } else if (recordMode !== 'edit') clearEntry(); notify(recordMode === 'edit' ? 'Training evaluation updated.' : draft ? 'Training evaluation draft saved.' : 'Training evaluation saved.'); }
    catch { notify('Unable to save this training evaluation. Refresh and try again.', 'error'); }
  }
  $('organizationFilter').addEventListener('change', () => { currentPage = 1; renderFarmers(); });
  $('farmerSearch').addEventListener('input', () => { currentPage = 1; renderFarmers(); });
  ['farmerRowsPerPageTop', 'farmerRowsPerPage'].forEach(id => $(id).addEventListener('change', () => { const value = $(id).value; $('farmerRowsPerPageTop').value = value; $('farmerRowsPerPage').value = value; currentPage = 1; renderFarmers(); }));
  $('refreshFarmers').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      if (window.TMIS_PAGE) await window.TmisStore.refresh();
      refreshFarmersForTraining();
    } catch (error) {
      notify(error.message || 'The farmer list could not be refreshed.', 'error');
    } finally {
      button.disabled = false;
    }
  });
  $('questionnaireSelect').addEventListener('change', () => { updateQuestionnaire(); refreshFarmersForTraining(); });
  window.addEventListener('tmis:training-selected', refreshFarmersForTraining);
  window.addEventListener('tmis:data-updated', refreshFarmersForTraining);
  form.addEventListener('input', updateSummary); form.addEventListener('change', updateSummary);
  form.addEventListener('invalid', () => { notify('Enter the date and rate every question before saving.', 'error'); }, true);
  form.addEventListener('submit', async event => { event.preventDefault(); await save(false); });
  $('saveDraft').addEventListener('click', async () => await save(true));
  $('resetEncode').addEventListener('click', () => { clearEntry(true); $('encodeStatus').textContent = ''; });
  if (resumedDraft) {
    $('questionnaireSelect').value = resumedDraft.questionnaireId || ''; updateQuestionnaire(true);
    const farmer = (existingRecord?.farmerId ? { id: resumedDraft.farmerId, name: resumedDraft.farmerName || '', association: resumedDraft.farmerAssociation || '', location: resumedDraft.farmerLocation || '', birthday: resumedDraft.farmerBirthday || '', sex: resumedDraft.farmerSex || '' } : null) || farmers.find(item => item.id === resumedDraft.farmerId) || (resumedDraft.farmerId ? { id: resumedDraft.farmerId, name: resumedDraft.farmerName || '', association: resumedDraft.farmerAssociation || '', location: resumedDraft.farmerLocation || '', birthday: resumedDraft.farmerBirthday || '', sex: resumedDraft.farmerSex || '' } : null);
    if (farmer) selectFarmer(farmer);
    $('testDate').value = resumedDraft.date || '';
    $('comments').value = resumedDraft.comments || '';
    (resumedDraft.ratings || []).forEach((item, index) => { const input = form.querySelector(`input[name="rating_${index}"][value="${Number(item.rating)}"]`); if (input) input.checked = true; });
    $('summaryStatus').textContent = 'Draft loaded';
  }
  refreshFarmersForTraining(); if (!resumedDraft) renderRatings(); updateSummary();
  if (recordMode) {
    const heading = document.querySelector('.encode-heading h1');
    if (heading) heading.textContent = `${recordMode === 'view' ? 'View' : 'Edit'} training evaluation result`;
    $('saveDraft').hidden = true;
    $('resetEncode').hidden = true;
    if (!existingRecord) { form.querySelector('[type="submit"]').hidden = true; $('encodeStatus').textContent = 'This submitted result could not be found.'; }
    else if (recordMode === 'view') {
      document.querySelector('.farmer-table-card').hidden = true;
      document.querySelector('.farmer-table-card + .farmer-table-footer').hidden = true;
      form.querySelectorAll('input, select, textarea, button').forEach(control => { control.disabled = true; });
      form.querySelector('[type="submit"]').hidden = true;
      $('summaryStatus').textContent = 'Submitted';
    } else { form.querySelector('[type="submit"]').textContent = 'Update training evaluation'; $('summaryStatus').textContent = 'Editing submitted result'; }
  }
});
