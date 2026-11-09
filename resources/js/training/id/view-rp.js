document.addEventListener('DOMContentLoaded', () => {
  const tabs = [...document.querySelectorAll('#rpTabs [role="tab"]')];
  function activate(tab, focus = false) {
    tabs.forEach(button => {
      const selected = button === tab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); activate(tabs[next], true);
    });
  });
  activate(tabs[0]);

  const id = new URLSearchParams(location.search).get('id');
  let records = [];
  try { const stored = JSON.parse(window.TmisStore.getItem('tmis-resource-persons') || '[]'); if (Array.isArray(stored)) records = stored; }
  catch { /* A missing or invalid saved list shows the empty state. */ }
  const record = records.find(item => item.id === id);
  const missing = document.getElementById('rpMissing');
  const content = document.getElementById('rpContent');
  if (!record) {
    missing.hidden = false; content.hidden = true;
    document.getElementById('rpEditLink').hidden = true;
    return;
  }
  const value = key => String(record[key] || '').trim();
  const displayName = [
    ...(value('title') === 'RAgr' ? [] : [value('title')]),
    value('first_name'), value('middle_name'), value('last_name'), value('suffix'),
    ...(value('title') === 'RAgr' ? ['RAgr'] : []),
  ].filter(Boolean).join(' ');
  document.getElementById('rpName').textContent = displayName || 'Resource Person';
  document.getElementById('rpHeroId').textContent = value('id') || '—';
  document.getElementById('rpHeroOffice').textContent = value('office') || 'Not provided';
  const registered = record.savedAt ? new Date(record.savedAt) : null;
  document.getElementById('rpRegistered').textContent = registered && !Number.isNaN(registered.getTime())
    ? registered.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not available';
  document.getElementById('rpStatus').textContent = value('status') || 'Active';
  document.getElementById('rpStatus').classList.toggle('is-inactive', value('status') === 'Inactive');
  if (value('status') === 'Inactive' && value('status_remarks')) {
    const remark = document.createElement('p');
    remark.className = 'rp-status-remark';
    remark.textContent = `Remarks: ${value('status_remarks')}`;
    document.getElementById('rpStatus').after(remark);
  }
  document.getElementById('rpEditLink').href = `edit-rp?id=${encodeURIComponent(id)}`;
  document.querySelectorAll('[data-rp-field]').forEach(node => {
    const field = node.dataset.rpField;
    node.textContent = value(field) || 'Not provided';
  });
  const email = document.getElementById('rpEmailValue');
  if (value('email')) {
    const link = document.createElement('a'); link.href = `mailto:${value('email')}`; link.textContent = value('email');
    email.replaceChildren(link);
  }
  const phone = document.getElementById('rpPhoneValue');
  if (value('phone')) {
    const link = document.createElement('a'); link.href = `tel:${value('phone').replace(/[^+\d]/g, '')}`; link.textContent = value('phone');
    phone.replaceChildren(link);
  }
  for (const key of ['qualification', 'expertise']) {
    const list = document.getElementById(key === 'qualification' ? 'rpQualifications' : 'rpExpertise');
    const parts = value(key).split(/[\n;,]+/).map(part => part.trim()).filter(Boolean);
    list.replaceChildren();
    if (!parts.length) {
      const item = document.createElement('li'); item.className = 'rp-list-empty'; item.textContent = 'Not provided'; list.append(item);
    } else parts.forEach(part => { const item = document.createElement('li'); item.textContent = part; list.append(item); });
  }
  const trainingCards = document.getElementById('rpTrainingCards');
  const trainingEmpty = document.getElementById('rpTrainingEmpty');
  const trainingCount = document.getElementById('rpTrainingCount');
  const normalize = text => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const names = [displayName, [value('first_name'), value('middle_name'), value('last_name')].filter(Boolean).join(' '), [value('first_name'), value('last_name')].filter(Boolean).join(' ')].map(normalize).filter(Boolean);
  let training;
  try { training = JSON.parse(window.TmisStore.getItem('tmis:training:TRN-000246:overview') || 'null'); }
  catch { training = null; }
  const isAssigned = training && Array.isArray(training.trainers) && training.trainers.some(trainer =>
    names.includes(normalize(trainer.name)) ||
    (value('email') && normalize(trainer.email) === normalize(value('email'))) ||
    (value('phone') && normalize(trainer.contact) === normalize(value('phone')))
  );
  const previewTrainings = [
    { id: 'TRN-000246', training_title: 'Good Agricultural Practices (GAP) for High Value Crops', training_type: 'In-Plant Training', start_date: '2025-05-22', end_date: '2025-05-23', barangay_id: 'San Antonio', municipality_id: 'Tanauan City', province_id: 'Batangas', venue_location: 'Tanauan City Agricultural Training Center', delivery_mode: 'In-person' },
    { id: 'TRN-000247', training_title: 'Climate-Smart Farming and Crop Resilience', training_type: 'Skills Training', start_date: '2025-07-15', end_date: '2025-07-17', barangay_id: 'Mayao Crossing', municipality_id: 'Lucena City', province_id: 'Quezon', venue_location: 'Quezon Provincial Agriculture Office', delivery_mode: 'Hybrid' },
    { id: 'TRN-000248', training_title: 'Farm Business Planning and Record Keeping', training_type: 'Workshop', start_date: '2025-09-04', end_date: '2025-09-04', barangay_id: 'Poblacion', municipality_id: 'Calamba City', province_id: 'Laguna', venue_location: 'Regional Training Hall', delivery_mode: 'Online' },
    { id: 'TRN-000249', training_title: 'Sustainable Vegetable Production', training_type: 'Field Training', start_date: '2025-10-08', end_date: '2025-10-09', barangay_id: 'Lipa', municipality_id: 'Lipa City', province_id: 'Batangas', venue_location: 'City Agriculture Demonstration Farm', delivery_mode: 'In-person' },
    { id: 'TRN-000250', training_title: 'Integrated Pest Management', training_type: 'Workshop', start_date: '2025-11-12', end_date: '2025-11-13', barangay_id: 'Sariaya', municipality_id: 'Sariaya', province_id: 'Quezon', venue_location: 'Municipal Training Center', delivery_mode: 'In-person' },
    { id: 'TRN-000251', training_title: 'Digital Tools for Farm Records', training_type: 'Skills Training', start_date: '2026-01-21', end_date: '2026-01-21', barangay_id: 'Poblacion', municipality_id: 'Los Baños', province_id: 'Laguna', venue_location: 'ATI Regional Training Hall', delivery_mode: 'Hybrid' },
    { id: 'TRN-000252', training_title: 'Soil Health and Nutrient Management', training_type: 'Field Training', start_date: '2026-03-05', end_date: '2026-03-06', barangay_id: 'Tiaong', municipality_id: 'Tiaong', province_id: 'Quezon', venue_location: 'Farm Learning Site', delivery_mode: 'In-person' },
    { id: 'TRN-000253', training_title: 'Postharvest Handling for Small Farms', training_type: 'Seminar', start_date: '2026-05-14', end_date: '2026-05-14', barangay_id: 'Poblacion', municipality_id: 'San Pablo City', province_id: 'Laguna', venue_location: 'City Conference Hall', delivery_mode: 'Online' },
    { id: 'TRN-000254', training_title: 'Organic Fertilizer Preparation', training_type: 'Workshop', start_date: '2026-06-11', end_date: '2026-06-12', barangay_id: 'Malvar', municipality_id: 'Malvar', province_id: 'Batangas', venue_location: 'Municipal Agriculture Office', delivery_mode: 'In-person' },
    { id: 'TRN-000255', training_title: 'Water Efficient Irrigation Methods', training_type: 'Field Training', start_date: '2026-07-16', end_date: '2026-07-17', barangay_id: 'Poblacion', municipality_id: 'Santa Cruz', province_id: 'Laguna', venue_location: 'Provincial Demonstration Farm', delivery_mode: 'In-person' },
    { id: 'TRN-000256', training_title: 'Livestock Health and Biosecurity', training_type: 'Seminar', start_date: '2026-08-19', end_date: '2026-08-19', barangay_id: 'Poblacion', municipality_id: 'Lucena City', province_id: 'Quezon', venue_location: 'Provincial Training Hall', delivery_mode: 'Hybrid' },
    { id: 'TRN-000257', training_title: 'Market Access for Farmer Groups', training_type: 'Skills Training', start_date: '2026-09-10', end_date: '2026-09-11', barangay_id: 'Poblacion', municipality_id: 'Calamba City', province_id: 'Laguna', venue_location: 'Agribusiness Learning Center', delivery_mode: 'Online' },
  ];
  const trainings = (window.TMIS_PAGE ? window.TmisStore.records('tmis-trainings').filter(item=>item.trainers?.some(trainer=>trainer.id===record.id)).map(item=>({...item,municipality_id:item.municipality,province_id:item.province,barangay_id:item.barangay})) : isAssigned ? [training] : previewTrainings);
  if (!isAssigned) document.getElementById('rpTrainingDescription').textContent = 'Preview training information for the resource person profile.';
  const label = input => String(input || '').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase()).trim();
  const date = input => {
    if (!input) return '';
    const parsed = new Date(`${input}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? String(input) : parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const detail = (icon, name, content) => {
    const item = document.createElement('div'); item.className = 'rp-training-detail';
    const symbol = document.createElement('i'); symbol.className = `bi bi-${icon}`; symbol.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('div');
    const caption = document.createElement('span'); caption.textContent = name;
    const valueNode = document.createElement('strong'); valueNode.textContent = content || 'Not provided';
    copy.append(caption, valueNode); item.append(symbol, copy); return item;
  };
  const paginationControls = [...document.querySelectorAll('#rpTrainingsPanel .rp-training-pagination')];
  const pageSizeSelects = [...document.querySelectorAll('#rpTrainingsPanel [data-training-page-size]')];
  const getPageSize = () => pageSizeSelects[0].value === 'all' ? Math.max(trainings.length, 1) : Number(pageSizeSelects[0].value);
  let currentPage = 1;
  const renderTrainings = () => {
  const pageSize = getPageSize();
  const pageCount = Math.max(1, Math.ceil(trainings.length / pageSize));
  currentPage = Math.min(currentPage, pageCount);
  trainingCards.replaceChildren();
  trainings.slice((currentPage - 1) * pageSize, currentPage * pageSize).forEach(item => {
    const card = document.createElement('article'); card.className = 'rp-training-card';
    const heading = document.createElement('div'); heading.className = 'rp-training-card-heading';
    const icon = document.createElement('span'); icon.className = 'rp-training-icon'; icon.innerHTML = '<i class="bi bi-mortarboard" aria-hidden="true"></i>';
    const titleBlock = document.createElement('div');
    const title = document.createElement('h3');
    const titleLink = document.createElement('a'); titleLink.href = `view-training?id=${encodeURIComponent(item.id || 'TRN-000246')}`;
    titleLink.textContent = item.training_title || 'Untitled training';
    title.append(titleLink);
    const type = document.createElement('span'); type.className = 'rp-training-type'; type.textContent = item.training_type || 'Training type not provided';
    titleBlock.append(title, type); heading.append(icon, titleBlock);
    const details = document.createElement('div'); details.className = 'rp-training-details';
    const dates = [date(item.start_date), date(item.end_date)].filter(Boolean);
    const dateText = dates.length === 2 && dates[0] !== dates[1] ? dates.join(' – ') : dates[0];
    const location = [item.barangay_id, item.municipality_id, item.province_id].filter(Boolean).map(label).join(', ');
    details.append(
      detail('calendar3', 'Dates', dateText),
      detail('geo-alt', 'Location', location),
      detail('building', 'Venue', item.venue_location),
      detail('broadcast', 'Delivery mode', item.delivery_mode)
    );
    card.append(heading, details); trainingCards.append(card);
  });
  paginationControls.forEach(pagination => {
    pagination.hidden = trainings.length === 0;
    pagination.querySelector('[data-training-page-summary]').textContent = `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, trainings.length)} of ${trainings.length}`;
    const numbers = pagination.querySelector('[data-training-page-numbers]');
    numbers.replaceChildren();
    const visiblePages = new Set([1, pageCount]);
    for (let page = Math.max(1, currentPage - 1); page <= Math.min(pageCount, currentPage + 1); page++) visiblePages.add(page);
    let previousPage = 0;
    [...visiblePages].sort((a, b) => a - b).forEach(page => {
      if (page - previousPage > 1) {
        const gap = document.createElement('span'); gap.className = 'rp-training-page-gap'; gap.textContent = '…'; gap.setAttribute('aria-hidden', 'true'); numbers.append(gap);
      }
      const button = document.createElement('button'); button.type = 'button'; button.textContent = String(page);
      button.setAttribute('aria-label', `Go to training page ${page}`);
      if (page === currentPage) { button.classList.add('active'); button.setAttribute('aria-current', 'page'); }
      button.addEventListener('click', () => { currentPage = page; renderTrainings(); });
      numbers.append(button);
      previousPage = page;
    });
    pagination.querySelector('[data-training-previous]').disabled = currentPage === 1;
    pagination.querySelector('[data-training-next]').disabled = currentPage === pageCount;
  });
  };
  paginationControls.forEach(pagination => {
    pagination.querySelector('[data-training-previous]').addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTrainings(); } });
    pagination.querySelector('[data-training-next]').addEventListener('click', () => { if (currentPage * getPageSize() < trainings.length) { currentPage++; renderTrainings(); } });
  });
  pageSizeSelects.forEach(select => select.addEventListener('change', () => {
    pageSizeSelects.forEach(other => { other.value = select.value; });
    currentPage = 1;
    renderTrainings();
  }));
  renderTrainings();
  trainingCount.textContent = `${trainings.length} ${trainings.length === 1 ? 'training' : 'trainings'}`;
  trainingEmpty.hidden = trainings.length > 0;
  const evaluationSamples = [
    { rating: 4.8, responses: [{ farmer: 'Juan Dela Cruz', feedback: 'Clear explanations and practical examples helped me apply GAP standards.', suggestion: 'Allow more time for the field demonstration.' }, { farmer: 'Maria Reyes', feedback: 'The examples from local farms made the lesson easier to understand.', suggestion: 'Provide a printed checklist for home use.' }] },
    { rating: 4.6, responses: [{ farmer: 'Pedro Santos', feedback: 'The discussion connected climate risks to our farming practices.', suggestion: 'Share the crop planning guide after the session.' }, { farmer: 'Ana Mendoza', feedback: 'I learned ways to prepare for irregular rainfall.', suggestion: 'Include more examples for small vegetable farms.' }] },
    { rating: 4.9, responses: [{ farmer: 'Rosa Garcia', feedback: 'The record keeping exercises were simple and useful.', suggestion: 'Include a printable sample farm ledger.' }] },
    { rating: 4.7, responses: [{ farmer: 'Elena Cruz', feedback: 'The hands-on activities made the techniques easier to understand.', suggestion: 'Add a follow-up visit to review farm application.' }] },
    { rating: 4.5, responses: [{ farmer: 'Nora Villanueva', feedback: 'The facilitator answered questions thoroughly and used relevant cases.', suggestion: 'Provide more time for pest identification.' }] },
    { rating: 4.7, responses: [{ farmer: 'Ricardo Lopez', feedback: 'The digital record examples were easy to follow.', suggestion: 'Offer a short practice session using mobile phones.' }] },
    { rating: 4.8, responses: [{ farmer: 'Liza Navarro', feedback: 'The soil testing demonstration helped me understand fertilizer needs.', suggestion: 'Share a guide for reading soil test results.' }] },
    { rating: 4.6, responses: [{ farmer: 'Benjamin Aquino', feedback: 'The postharvest handling tips were relevant to our crops.', suggestion: 'Show more packaging examples for local markets.' }] },
    { rating: 4.9, responses: [{ farmer: 'Teresa Castillo', feedback: 'The fertilizer preparation steps were explained clearly.', suggestion: 'Provide a printed recipe with quantities.' }] },
    { rating: 4.7, responses: [{ farmer: 'Mario Rivera', feedback: 'The irrigation demonstration showed ways to save water.', suggestion: 'Include a cost comparison for small farms.' }] },
    { rating: 4.5, responses: [{ farmer: 'Celia Fernandez', feedback: 'The biosecurity examples were useful for our livestock groups.', suggestion: 'Add a checklist for daily farm routines.' }] },
    { rating: 4.8, responses: [{ farmer: 'Ramon Perez', feedback: 'The market access discussion gave us practical selling ideas.', suggestion: 'Invite a buyer for a future question and answer session.' }] },
  ];
  const evaluationRows = document.getElementById('rpEvaluationRows');
  const evaluations = (window.TMIS_PAGE ? trainings.map(training=>{const results=window.TmisStore.records('tmis-rp-evaluation-encoded').filter(item=>item.status==='complete'&&item.resourcePersonId===record.id&&Number(item.trainingDatabaseId)===Number(training._db_id));const ratings=results.flatMap(item=>item.ratings||[]).map(item=>Number(item.rating));return {training,rating:ratings.length?ratings.reduce((sum,value)=>sum+value,0)/ratings.length:null,responses:results.map(item=>({farmer:item.farmerName,feedback:item.comments||'',suggestion:''}))};}) : isAssigned
    ? [{ training, rating: training.evaluation_rating, responses: Array.isArray(training.evaluation_responses) ? training.evaluation_responses : [] }]
    : previewTrainings.map((item, index) => ({ training: item, ...evaluationSamples[index] })));
  if (!isAssigned) document.getElementById('rpEvaluationDescription').textContent = 'Preview ratings and feedback for the resource person profile.';
  const evaluationSearch = document.getElementById('rpEvaluationSearch');
  const evaluationPageSizes = [...document.querySelectorAll('#rpEvaluationPanel [data-evaluation-page-size]')];
  const evaluationPaginators = [...document.querySelectorAll('#rpEvaluationPanel .rp-evaluation-pagination')];
  let evaluationPage = 1;
  const renderEvaluations = () => {
  const query = evaluationSearch.value.trim().toLowerCase();
  const filtered = evaluations.filter(entry => [entry.training.training_title, entry.training.municipality_id, entry.training.province_id,
    entry.rating, ...entry.responses.flatMap(response => [response.farmer, response.feedback, response.suggestion])]
    .some(value => String(value || '').toLowerCase().includes(query)));
  const pageSize = evaluationPageSizes[0].value === 'all' ? Math.max(filtered.length, 1) : Number(evaluationPageSizes[0].value);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  evaluationPage = Math.min(evaluationPage, pageCount);
  evaluationRows.replaceChildren();
  filtered.slice((evaluationPage - 1) * pageSize, evaluationPage * pageSize).forEach((entry, index) => {
    const row = document.createElement('tr');
    const titleCell = document.createElement('td');
    const titleLink = document.createElement('a');
    titleLink.href = `view-training?id=${encodeURIComponent(entry.training.id || 'TRN-000246')}`;
    titleLink.textContent = entry.training.training_title || 'Untitled training';
    titleCell.append(titleLink);
    const locationCell = document.createElement('td');
    locationCell.textContent = [entry.training.municipality_id, entry.training.province_id].filter(Boolean).map(label).join(', ') || 'Not provided';
    const ratingCell = document.createElement('td');
    const rating = Number(entry.rating);
    if (entry.rating !== undefined && entry.rating !== null && Number.isFinite(rating) && rating >= 0 && rating <= 5) {
      const badge = document.createElement('span'); badge.className = 'rp-evaluation-rating';
      badge.textContent = `★ ${rating.toFixed(1)} / 5`;
      ratingCell.append(badge);
    } else ratingCell.textContent = 'Not yet rated';
    const actionCell = document.createElement('td');
    const button = document.createElement('button'); button.type = 'button'; button.className = 'rp-evaluation-toggle';
    button.textContent = 'View feedback'; button.setAttribute('aria-expanded', 'false');
    const detailId = `rpEvaluationDetail${(evaluationPage - 1) * pageSize + index}`; button.setAttribute('aria-controls', detailId);
    actionCell.append(button); row.append(titleCell, locationCell, ratingCell, actionCell);
    const detailRow = document.createElement('tr'); detailRow.id = detailId; detailRow.className = 'rp-evaluation-detail-row'; detailRow.hidden = true;
    const detailCell = document.createElement('td'); detailCell.colSpan = 4;
    const responseList = document.createElement('ul'); responseList.className = 'rp-evaluation-response-list';
    if (entry.responses.length) entry.responses.forEach(response => {
      const item = document.createElement('li');
      const farmer = document.createElement('strong'); farmer.textContent = response.farmer || 'Farmer member';
      const responseText = document.createElement('p');
      responseText.textContent = `Comment / feedback: ${response.feedback || 'Not provided'} Suggestion: ${response.suggestion || 'Not provided'}`;
      item.append(farmer, responseText); responseList.append(item);
    });
    else { const item = document.createElement('li'); item.textContent = 'No farmer feedback recorded yet.'; responseList.append(item); }
    detailCell.append(responseList); detailRow.append(detailCell);
    button.addEventListener('click', () => {
      detailRow.hidden = !detailRow.hidden;
      button.setAttribute('aria-expanded', String(!detailRow.hidden));
      button.textContent = detailRow.hidden ? 'View feedback' : 'Hide feedback';
    });
    evaluationRows.append(row, detailRow);
  });
  if (!filtered.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td'); cell.colSpan = 4; cell.className = 'rp-evaluation-no-results';
    cell.textContent = 'No evaluations match your search.'; row.append(cell); evaluationRows.append(row);
  }
  evaluationPaginators.forEach(paginator => {
    const first = filtered.length ? (evaluationPage - 1) * pageSize + 1 : 0;
    paginator.querySelector('[data-evaluation-summary]').textContent = `Showing ${first}–${Math.min(evaluationPage * pageSize, filtered.length)} of ${filtered.length}`;
    paginator.querySelector('[data-evaluation-previous]').disabled = evaluationPage === 1;
    paginator.querySelector('[data-evaluation-next]').disabled = evaluationPage === pageCount;
    const numbers = paginator.querySelector('[data-evaluation-page-numbers]'); numbers.replaceChildren();
    const visiblePages = new Set([1, pageCount]);
    for (let page = Math.max(1, evaluationPage - 1); page <= Math.min(pageCount, evaluationPage + 1); page++) visiblePages.add(page);
    let previousPage = 0;
    [...visiblePages].sort((a, b) => a - b).forEach(page => {
      if (page - previousPage > 1) { const gap = document.createElement('span'); gap.textContent = '…'; gap.setAttribute('aria-hidden', 'true'); numbers.append(gap); }
      const button = document.createElement('button'); button.type = 'button'; button.textContent = String(page);
      button.setAttribute('aria-label', `Go to evaluation page ${page}`);
      if (page === evaluationPage) { button.classList.add('active'); button.setAttribute('aria-current', 'page'); }
      button.addEventListener('click', () => { evaluationPage = page; renderEvaluations(); });
      numbers.append(button); previousPage = page;
    });
  });
  };
  evaluationSearch.addEventListener('input', () => { evaluationPage = 1; renderEvaluations(); });
  evaluationPageSizes.forEach(select => select.addEventListener('change', () => {
    evaluationPageSizes.forEach(other => { other.value = select.value; });
    evaluationPage = 1; renderEvaluations();
  }));
  evaluationPaginators.forEach(paginator => {
    paginator.querySelector('[data-evaluation-previous]').addEventListener('click', () => { if (evaluationPage > 1) { evaluationPage--; renderEvaluations(); } });
    paginator.querySelector('[data-evaluation-next]').addEventListener('click', event => {
      if (!event.currentTarget.disabled) { evaluationPage++; renderEvaluations(); }
    });
  });
  renderEvaluations();
  const logList = document.getElementById('rpLogList');
  const logSearch = document.getElementById('rpLogSearch');
  const logEmpty = document.getElementById('rpLogEmpty');
  const logResultCount = document.getElementById('rpLogResultCount');
  const logFilters = [...document.querySelectorAll('[data-rp-log-filter]')];
  const logs = Array.isArray(record.activityLogs) ? [...record.activityLogs] : [];
  if (record.savedAt) logs.push({ category: 'registration', title: 'Resource person registered', description: `${displayName || 'Resource person'} was added to the resource person directory.`, actor: 'System user', date: record.savedAt, status: 'Registered', reference: value('id'), icon: 'bi-person-plus' });
  logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  let activeLogFilter = 'all';
  const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
  const renderLogs = () => {
    const query = logSearch.value.trim().toLowerCase();
    const visible = logs.filter(log => (activeLogFilter === 'all' || log.category === activeLogFilter) &&
      [log.title, log.description, log.actor, log.status, log.reference].some(part => String(part || '').toLowerCase().includes(query)));
    logFilters.forEach(button => {
      const category = button.dataset.rpLogFilter;
      button.querySelector('[data-rp-log-count]').textContent = String(category === 'all' ? logs.length : logs.filter(log => log.category === category).length);
      const selected = category === activeLogFilter;
      button.classList.toggle('is-active', selected); button.setAttribute('aria-pressed', String(selected));
    });
    logList.replaceChildren();
    visible.forEach(log => {
      const article = document.createElement('article'); article.className = 'rp-log-entry'; article.dataset.category = log.category;
      const iconWrap = document.createElement('span'); iconWrap.className = 'rp-log-entry-icon';
      const icon = document.createElement('i'); icon.className = `bi ${log.icon || 'bi-clock-history'}`; icon.setAttribute('aria-hidden', 'true'); iconWrap.append(icon);
      const content = document.createElement('div'); content.className = 'rp-log-entry-content';
      const top = document.createElement('div'); top.className = 'rp-log-entry-top';
      const title = document.createElement('h3'); title.textContent = log.title || 'Activity recorded';
      const category = document.createElement('span'); category.className = 'rp-log-category'; category.textContent = log.category || 'Activity';
      const status = document.createElement('span'); status.className = 'rp-log-status'; status.textContent = log.status || 'Recorded';
      top.append(title, category, status);
      const description = document.createElement('p'); description.className = 'rp-log-description'; description.textContent = log.description || '';
      const meta = document.createElement('div'); meta.className = 'rp-log-meta';
      const actor = document.createElement('span'); actor.textContent = `By ${log.actor || 'System user'}`;
      const reference = document.createElement('span'); reference.textContent = log.reference || value('id');
      const timestamp = document.createElement('time');
      const parsed = new Date(log.date);
      timestamp.textContent = Number.isNaN(parsed.getTime()) ? 'Date unavailable' : dateTime.format(parsed);
      if (!Number.isNaN(parsed.getTime())) timestamp.dateTime = parsed.toISOString();
      meta.append(actor, reference, timestamp);
      content.append(top, description, meta); article.append(iconWrap, content); logList.append(article);
    });
    logEmpty.hidden = visible.length > 0;
    logResultCount.textContent = `${visible.length} of ${logs.length} activities`;
  };
  logSearch.addEventListener('input', renderLogs);
  logFilters.forEach(button => button.addEventListener('click', () => { activeLogFilter = button.dataset.rpLogFilter; renderLogs(); }));
  renderLogs();
  missing.hidden = true; content.hidden = false;
});
