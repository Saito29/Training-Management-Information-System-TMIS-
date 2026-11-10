document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('resource-panel');
  if (!panel) return;

  // Sample feedback for this static view. Replace with saved farmer evaluations when available.
  const farmers = [
    'Juan Dela Cruz', 'Pedro Reyes', 'Rogelio Bautista', 'Antonio Ramos', 'Jose Garcia',
    'Roberto Flores', 'Ana Villanueva', 'Mark Navarro', 'Noel Castillo', 'Daniel Aquino',
    'Paolo Mercado', 'Francisco Torres', 'Emmanuel Perez', 'Elena Lopez', 'Rico Domingo',
    'Eduardo Cruz', 'Grace Gonzales', 'Joel Salazar',
  ];
  const prompts = [
    'Malinaw na naipahayag ang paksa at layunin sa umpisa',
    'Maayos at sunod-sunod ang pagpapaliwanag ng mga paksa',
    'Malinaw na natalakay ang mga paksa at kaisipan',
    'Naging epektibo ang ginamit na pamamaraan sa pagtuturo',
    'Naging epektibo ang mga ginamit na materyales sa pagtuturo',
    'Maayos na nakipag-usap sa mga kalahok',
    'Nasagot nang malinaw ang mga katanungan',
    'Napanatili ang interes ng mga kalahok',
    'Napamahalaan nang maayos ang oras',
  ];
  const resources = (window.TMIS_PAGE ? window.TmisTrainingData.resources() : [
    { id:'maria', name:'Dr. Maria Santos', role:'Lead Resource Person', initials:'MS', offset:0, comments:[
      {farmer:'Juan Dela Cruz', rating:5, text:'Malinaw ang paliwanag at madaling sundan ang mga halimbawa.'},
      {farmer:'Ana Villanueva', rating:5, text:'Maganda ang paraan ng pagsagot sa aming mga tanong.'},
      {farmer:'Pedro Reyes', rating:4, text:'Nakatulong ang mga praktikal na halimbawa sa pag-unawa ng paksa.'},
      {farmer:'Elena Lopez', rating:4, text:'Malinaw ang talakayan at nagamit ko ang mga halimbawa sa aming gawain.'},
    ]},
    { id:'carlo', name:'Engr. Carlo Mendoza', role:'Resource Person', initials:'CM', offset:2, comments:[
      {farmer:'Rogelio Bautista', rating:5, text:'Kapaki-pakinabang ang aktuwal na demonstrasyon.'},
      {farmer:'Grace Gonzales', rating:4, text:'Maayos ang pagpapaliwanag, lalo na sa mga teknikal na bahagi.'},
      {farmer:'Joel Salazar', rating:4, text:'Mas makatutulong pa kung may dagdag na oras para sa tanong at sagot.'},
    ]},
  ].map(resource => ({ ...resource, questions:prompts.map((prompt, questionIndex) => ({
    id:questionIndex + 1, prompt,
    responses:farmers.map((farmer, index) => ({
      farmer,
      association:index < 12 ? 'San Antonio Farmers Cooperative' : 'Batangas Growers Association',
      answeredAt:index < 12 ? '2025-05-22' : '2025-05-23',
      rating:index < 10 + (questionIndex + resource.offset) % 3 - resource.offset ? 5 : index < 16 + questionIndex % 2 ? 4 : 3,
    })),
  })) })));
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let selectedDate = '';
  let selectedAssociation = '';
  const matches = response => (!selectedDate || response.answeredAt === selectedDate) &&
    (!selectedAssociation || response.association === selectedAssociation);
  const filtered = question => (question?.responses||[]).filter(matches);
  const stats = question => { const responses = filtered(question); return {count:responses.length, score:responses.reduce((sum, response) => sum + response.rating, 0)}; };
  let selectedResource = resources[0]?.id;
  let selectedQuestion = 1;
  let selectedRating = null;
  const $ = selector => panel.querySelector(selector);
  panel.innerHTML = `<section class="resource-evaluation-card training-card" aria-labelledby="resourceEvaluationTitle"><header class="training-evaluation-header"><div class="training-evaluation-heading"><span class="training-evaluation-icon"><i class="bi bi-person-check" aria-hidden="true"></i></span><div><span class="training-evaluation-eyebrow">Farmer feedback</span><h2 id="resourceEvaluationTitle">Resource Person Evaluation</h2><p>Review questionnaire ratings for each resource person.</p></div></div><div class="resource-select-wrap"><label for="resourcePersonSelect">Resource person</label><select id="resourcePersonSelect" class="form-select">${resources.map(resource => `<option value="${window.TmisStore.escape(resource.id)}">${escape(resource.name)}</option>`).join('')}</select></div></header><div class="resource-person-summary"><span class="resource-person-avatar" id="resourcePersonAvatar"></span><div><strong id="resourcePersonName"></strong><small id="resourcePersonRole"></small></div><span class="training-evaluation-sample">Saved farmer responses</span></div><div class="training-evaluation-summary"><div><span>Evaluation questions</span><strong id="resourceQuestionCount"></strong></div><div><span>Farmers who evaluated</span><strong id="resourceFarmerCount"></strong></div><div><span>Overall average</span><strong id="resourceOverallAverage"></strong></div></div><div class="training-evaluation-table-wrap table-responsive"><table class="table training-evaluation-table"><thead><tr><th scope="col">Questionnaire</th><th scope="col">5 <i class="bi bi-star-fill"></i></th><th scope="col">4 <i class="bi bi-star-fill"></i></th><th scope="col">3 <i class="bi bi-star-fill"></i></th><th scope="col">2 <i class="bi bi-star-fill"></i></th><th scope="col">1 <i class="bi bi-star-fill"></i></th><th scope="col">Total score</th><th scope="col">Average</th></tr></thead><tbody id="resourceEvaluationRows"></tbody></table></div><p class="training-evaluation-hint"><i class="bi bi-hand-index" aria-hidden="true"></i> Select a rating count to see which farmers gave that rating.</p></section><section class="resource-evaluation-detail training-card" aria-labelledby="resourceDetailTitle"><header class="training-evaluation-detail-header"><div><span class="training-evaluation-eyebrow">Farmer breakdown</span><h2 id="resourceDetailTitle"></h2><p id="resourceDetailPrompt"></p></div><span class="training-evaluation-detail-count" id="resourceDetailCount"></span></header><div class="training-evaluation-detail-body"><div id="resourceRatingTabs" class="training-evaluation-rating-tabs" role="group" aria-label="Filter farmers by rating"></div><div class="table-responsive"><table class="table training-evaluation-participants"><thead><tr><th scope="col">Farmer</th><th scope="col">Rating</th></tr></thead><tbody id="resourceEvaluationFarmers"></tbody></table></div></div></section><section class="resource-comments-card training-card" aria-labelledby="resourceCommentsTitle"><header class="training-evaluation-detail-header"><div><span class="training-evaluation-eyebrow">Written feedback</span><h2 id="resourceCommentsTitle">Farmer comments</h2><p>Comments about the selected resource person.</p></div><span class="training-evaluation-detail-count" id="resourceCommentCount"></span></header><div class="resource-comment-list" id="resourceCommentList"></div></section>`;
  panel.querySelector('.training-evaluation-header').insertAdjacentHTML('afterend', `<div class="evaluation-scope-filters"><label>Answer date<select id="resourceEvaluationDate" class="form-select"><option value="">All dates</option><option value="2025-05-22">May 22, 2025</option><option value="2025-05-23">May 23, 2025</option></select></label><label>Farmer association<select id="resourceEvaluationAssociation" class="form-select"><option value="">All associations</option><option>San Antonio Farmers Cooperative</option><option>Batangas Growers Association</option></select></label></div>`);

  function render() {
    const resource = resources.find(item => item.id === selectedResource);
    if(!resource){$('#resourcePersonName').textContent='No resource persons assigned';$('#resourceQuestionCount').textContent='0';$('#resourceFarmerCount').textContent='0';$('#resourceOverallAverage').textContent='No results';return;}
    const question = resource.questions.find(item => item.id === selectedQuestion);
    const total = resource.questions.reduce((sum, item) => sum + stats(item).score, 0);
    const count = resource.questions.reduce((sum, item) => sum + stats(item).count, 0);
    $('#resourcePersonSelect').value = resource.id;
    $('#resourcePersonAvatar').textContent = resource.initials;
    $('#resourcePersonName').textContent = resource.name;
    $('#resourcePersonRole').textContent = resource.role;
    $('#resourceQuestionCount').textContent = resource.questions.length;
    const attendees = (window.TMIS_PAGE ? window.TmisTrainingData.participantCount() : [
      {date:'2025-05-22', association:'San Antonio Farmers Cooperative', count:14},
      {date:'2025-05-23', association:'Batangas Growers Association', count:10},
    ].filter(group => (!selectedDate || group.date === selectedDate) &&
      (!selectedAssociation || group.association === selectedAssociation)).reduce((sum, group) => sum + group.count, 0));
    $('#resourceFarmerCount').innerHTML = `${filtered(resource.questions[0]).length} <small>/ ${attendees} participants</small>`;
    $('#resourceOverallAverage').textContent = count ? `${(total / count).toFixed(2)} / 5` : '—';
    $('#resourceEvaluationRows').innerHTML = resource.questions.map(item => {
      const result = stats(item);
      return `<tr class="${selectedQuestion === item.id ? 'is-selected' : ''}"><th scope="row"><span class="training-evaluation-row-number">${String(item.id).padStart(2,'0')}</span><span>${escape(item.prompt)}</span></th>${[5,4,3,2,1].map(rating => { const amount = filtered(item).filter(response => response.rating === rating).length; return `<td><button type="button" class="training-evaluation-count ${selectedQuestion === item.id && selectedRating === rating ? 'is-active' : ''}" data-question="${window.TmisStore.escape(item.id)}" data-rating="${rating}" aria-label="${amount} farmers rated ${rating} stars for question ${window.TmisStore.escape(item.id)}" aria-pressed="${selectedQuestion === item.id && selectedRating === rating}">${amount}</button></td>`; }).join('')}<td class="training-evaluation-total">${result.score}</td><td><span class="training-evaluation-average">${result.count ? (result.score / result.count).toFixed(2) : '—'}</span></td></tr>`;
    }).join('');
    if(!question){$('#resourceDetailTitle').textContent='No submitted results';return;}
    const questionResponses = filtered(question);
    const responses = selectedRating === null ? questionResponses : questionResponses.filter(response => response.rating === selectedRating);
    $('#resourceDetailTitle').textContent = `Question ${String(question.id).padStart(2,'0')} responses`;
    $('#resourceDetailPrompt').textContent = question.prompt;
    $('#resourceDetailCount').textContent = `${responses.length} of ${questionResponses.length} responses`;
    $('#resourceRatingTabs').innerHTML = `<button type="button" data-detail-rating="all" class="${selectedRating === null ? 'is-active' : ''}" aria-pressed="${selectedRating === null}">All responses <span>${questionResponses.length}</span></button>${[5,4,3,2,1].map(rating => `<button type="button" data-detail-rating="${rating}" class="${selectedRating === rating ? 'is-active' : ''}" aria-pressed="${selectedRating === rating}">${rating} <i class="bi bi-star-fill" aria-hidden="true"></i> <span>${questionResponses.filter(response => response.rating === rating).length}</span></button>`).join('')}`;
    $('#resourceEvaluationFarmers').innerHTML = responses.length ? responses.map(response => `<tr><td><span class="training-evaluation-avatar" aria-hidden="true">${escape(response.farmer.split(' ').map(part => part[0]).slice(0,2).join(''))}</span>${escape(response.farmer)}</td><td><span class="training-evaluation-participant-score">${response.rating} <i class="bi bi-star-fill" aria-hidden="true"></i></span></td></tr>`).join('') : '<tr><td colspan="2" class="training-evaluation-empty">No farmers gave this rating.</td></tr>';
    const visibleComments = resource.comments.filter(comment => {
      const response = resource.questions[0].responses.find(item => item.farmer === comment.farmer);
      return response && matches(response);
    });
    $('#resourceCommentCount').textContent = `${visibleComments.length} comments`;
    $('#resourceCommentList').innerHTML = visibleComments.length ? visibleComments.map(comment => `<article class="resource-comment"><span class="training-evaluation-avatar" aria-hidden="true">${escape(comment.farmer.split(' ').map(part => part[0]).slice(0,2).join(''))}</span><div><div class="resource-comment-heading"><strong>${escape(comment.farmer)}</strong><span>${comment.rating} <i class="bi bi-star-fill" aria-hidden="true"></i></span></div><p>${escape(comment.text)}</p></div></article>`).join('') : '<p class="evaluation-filter-empty">No farmer comments for these filters.</p>';
  }
  $('#resourcePersonSelect').addEventListener('change', event => { selectedResource = event.target.value; selectedQuestion = 1; selectedRating = null; render(); });
  window.trainingFeedbackFilters.register($('#resourceEvaluationDate'), $('#resourceEvaluationAssociation'), scope => {
    selectedDate = scope.date;
    selectedAssociation = scope.association;
    selectedRating = null;
    render();
  });
  $('#resourceEvaluationRows').addEventListener('click', event => { const button = event.target.closest('[data-question][data-rating]'); if (!button) return; const question = Number(button.dataset.question); const rating = Number(button.dataset.rating); selectedRating = selectedQuestion === question && selectedRating === rating ? null : rating; selectedQuestion = question; render(); });
  $('#resourceRatingTabs').addEventListener('click', event => { const button = event.target.closest('[data-detail-rating]'); if (!button) return; selectedRating = button.dataset.detailRating === 'all' ? null : Number(button.dataset.detailRating); render(); });
  const overviewCard = document.querySelector('a[href="#resource-panel"][data-go-panel]')?.closest('article');
  overviewCard?.querySelectorAll('.person-row').forEach((row, index) => {
    const resource = resources[index];
    if (!resource) return;
    const score = resource.questions.reduce((sum, question) => sum + stats(question).score, 0);
    const responses = resource.questions.reduce((sum, question) => sum + stats(question).count, 0);
    row.querySelector('b').innerHTML = `${(score / responses).toFixed(2)} <small>/ 5</small>`;
  });
});
