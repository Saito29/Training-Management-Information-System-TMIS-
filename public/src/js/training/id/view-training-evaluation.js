document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('evaluation-panel');
  if (!panel) return;

  // Saved responses for this static page. Replace with saved evaluation answers when available.
  const participants = (window.TMIS_PAGE ? [...new Set(window.TmisTrainingData.results('training-evaluation').map(item=>item.farmerName))] : [
    'Juan Dela Cruz', 'Pedro Reyes', 'Rogelio Bautista', 'Antonio Ramos', 'Jose Garcia',
    'Roberto Flores', 'Ana Villanueva', 'Mark Navarro', 'Noel Castillo', 'Daniel Aquino',
    'Paolo Mercado', 'Francisco Torres', 'Emmanuel Perez', 'Elena Lopez', 'Rico Domingo',
    'Eduardo Cruz', 'Grace Gonzales', 'Joel Salazar',
  ]);
  const prompts = [
    'Malinaw na naipahayag ang paksa at layunin sa umpisa',
    'Maayos at sunod-sunod ang bawat paksa',
    'Malinaw na natalakay ang mga paksa at kaisipan',
    'Naging epektibo ang ginamit na pamamaraan sa pagtuturo',
    'Naging epektibo ang mga ginamit na materyales sa pagtuturo',
    'May kakayahan na makapagturo o makipag-usap nang maayos sa mga kalahok',
    'May kakayahang sumagot ng mga katanungan',
    'May kakayahang panatilihin ang interes ng mga kalahok',
    'May kakayahang pamahalaan ang oras',
  ];
  const questions = (window.TMIS_PAGE ? window.TmisTrainingData.questions('training-evaluation') : prompts.map((prompt, questionIndex) => ({
    id: questionIndex + 1,
    prompt,
    responses: participants.map((participant, index) => ({
      participant,
      association: index < 12 ? 'San Antonio Farmers Cooperative' : 'Batangas Growers Association',
      answeredAt: index < 12 ? '2025-05-22' : '2025-05-23',
      rating: index < 9 + questionIndex % 3 ? 5 : index < 16 + questionIndex % 2 ? 4 : 3,
    })),
  })));
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  let selectedDate = '';
  let selectedAssociation = '';
  const matches = response => (!selectedDate || response.answeredAt === selectedDate) &&
    (!selectedAssociation || response.association === selectedAssociation);
  const filtered = question => (question?.responses||[]).filter(matches);
  const stats = question => {
    const responses = filtered(question);
    return { count: responses.length, score: responses.reduce((sum, response) => sum + response.rating, 0) };
  };
  const uniqueEvaluators = participants.length;
  const totalParticipants = (window.TMIS_PAGE ? window.TmisTrainingData.participantCount() : 24);
  const comments = (window.TMIS_PAGE ? window.TmisTrainingData.comments() : [
    { farmer:'Juan Dela Cruz', rating:5, text:'Malinaw ang mga paksa at nakatulong ang praktikal na gawain sa pag-unawa ko.' },
    { farmer:'Ana Villanueva', rating:5, text:'Maayos ang daloy ng pagsasanay at kapaki-pakinabang ang mga halimbawa.' },
    { farmer:'Pedro Reyes', rating:4, text:'Maganda ang mga materyales. Sana ay may dagdag na oras para sa talakayan.' },
    { farmer:'Elena Lopez', rating:4, text:'Natutuhan ko ang mga bagong paraan na maaari kong gamitin sa aming sakahan.' },
  ]);
  let selectedQuestion = questions[0]?.id;
  let selectedRating = null;

  panel.innerHTML = `<section class="training-evaluation-card training-card" aria-labelledby="trainingEvaluationTitle"><header class="training-evaluation-header"><div class="training-evaluation-heading"><span class="training-evaluation-icon"><i class="bi bi-star-half" aria-hidden="true"></i></span><div><span class="training-evaluation-eyebrow">Training feedback</span><h2 id="trainingEvaluationTitle">Questionnaire results</h2><p>Rating distribution and average score for every evaluation question.</p></div></div><span class="training-evaluation-sample">Saved responses</span></header><div class="training-evaluation-summary"><div><span>Evaluation questions</span><strong>${questions.length}</strong></div><div><span>Participants who evaluated</span><strong>${uniqueEvaluators} <small>/ ${totalParticipants}</small></strong></div><div><span>Response rate</span><strong>${(totalParticipants ? Math.round(uniqueEvaluators / totalParticipants * 100) : 0)}%</strong></div></div><div class="training-evaluation-table-wrap table-responsive"><table class="table training-evaluation-table"><thead><tr><th scope="col">Questionnaire</th><th scope="col">5 <i class="bi bi-star-fill"></i></th><th scope="col">4 <i class="bi bi-star-fill"></i></th><th scope="col">3 <i class="bi bi-star-fill"></i></th><th scope="col">2 <i class="bi bi-star-fill"></i></th><th scope="col">1 <i class="bi bi-star-fill"></i></th><th scope="col">Total score</th><th scope="col">Average</th></tr></thead><tbody id="trainingEvaluationRows"></tbody></table></div><p class="training-evaluation-hint"><i class="bi bi-hand-index" aria-hidden="true"></i> Select a rating count to see which participants gave that rating.</p></section><section class="training-evaluation-detail training-card" aria-labelledby="trainingEvaluationDetailTitle"><header class="training-evaluation-detail-header"><div><span class="training-evaluation-eyebrow">Participant breakdown</span><h2 id="trainingEvaluationDetailTitle"></h2><p id="trainingEvaluationDetailPrompt"></p></div><span class="training-evaluation-detail-count" id="trainingEvaluationDetailCount"></span></header><div class="training-evaluation-detail-body"><div id="trainingEvaluationRatingTabs" class="training-evaluation-rating-tabs" role="group" aria-label="Filter participants by rating"></div><div class="table-responsive"><table class="table training-evaluation-participants"><thead><tr><th scope="col">Participant</th><th scope="col">Rating</th></tr></thead><tbody id="trainingEvaluationParticipants"></tbody></table></div></div></section>`;
  panel.insertAdjacentHTML('beforeend', `<section class="training-evaluation-comments training-card" aria-labelledby="trainingEvaluationCommentsTitle"><header class="training-evaluation-detail-header"><div><span class="training-evaluation-eyebrow">Written feedback</span><h2 id="trainingEvaluationCommentsTitle">Farmer comments</h2><p>What participating farmers said about the training.</p></div><span class="training-evaluation-detail-count">${comments.length} comments</span></header><div class="resource-comment-list">${comments.map(comment => `<article class="resource-comment"><span class="training-evaluation-avatar" aria-hidden="true">${escape(comment.farmer.split(' ').map(part => part[0]).slice(0,2).join(''))}</span><div><div class="resource-comment-heading"><strong>${escape(comment.farmer)}</strong><span>${comment.rating} <i class="bi bi-star-fill" aria-hidden="true"></i></span></div><p>${escape(comment.text)}</p></div></article>`).join('')}</div></section>`);
  panel.querySelector('.training-evaluation-header').insertAdjacentHTML('afterend', `<div class="evaluation-scope-filters"><label>Answer date<select id="trainingEvaluationDate" class="form-select"><option value="">All dates</option><option value="2025-05-22">May 22, 2025</option><option value="2025-05-23">May 23, 2025</option></select></label><label>Farmer association<select id="trainingEvaluationAssociation" class="form-select"><option value="">All associations</option><option>San Antonio Farmers Cooperative</option><option>Batangas Growers Association</option></select></label></div>`);

  const $ = selector => panel.querySelector(selector);
  function renderRows() {
    $('#trainingEvaluationRows').innerHTML = questions.map(question => {
      const {count, score} = stats(question);
      return `<tr class="${selectedQuestion === question.id ? 'is-selected' : ''}"><th scope="row"><span class="training-evaluation-row-number">${String(question.id).padStart(2, '0')}</span><span>${escape(question.prompt)}</span></th>${[5,4,3,2,1].map(rating => {
        const amount = filtered(question).filter(response => response.rating === rating).length;
        return `<td><button type="button" class="training-evaluation-count ${selectedQuestion === question.id && selectedRating === rating ? 'is-active' : ''}" data-question="${question.id}" data-rating="${rating}" aria-label="${amount} participants rated ${rating} stars for question ${question.id}" aria-pressed="${selectedQuestion === question.id && selectedRating === rating}">${amount}</button></td>`;
      }).join('')}<td class="training-evaluation-total">${score}</td><td><span class="training-evaluation-average">${count ? (score / count).toFixed(2) : '—'}</span></td></tr>`;
    }).join('');
  }
  function renderDetail() {
    const question = questions.find(item => item.id === selectedQuestion);
    if(!question){$('#trainingEvaluationDetailTitle').textContent='No submitted results';return;}
    $('#trainingEvaluationDetailTitle').textContent = `Question ${String(question.id).padStart(2, '0')} responses`;
    $('#trainingEvaluationDetailPrompt').textContent = question.prompt;
    const questionResponses = filtered(question);
    const responses = selectedRating === null ? questionResponses : questionResponses.filter(response => response.rating === selectedRating);
    $('#trainingEvaluationDetailCount').textContent = `${responses.length} of ${questionResponses.length} responses`;
    $('#trainingEvaluationRatingTabs').innerHTML = `<button type="button" data-detail-rating="all" class="${selectedRating === null ? 'is-active' : ''}" aria-pressed="${selectedRating === null}">All responses <span>${questionResponses.length}</span></button>${[5,4,3,2,1].map(rating => `<button type="button" data-detail-rating="${rating}" class="${selectedRating === rating ? 'is-active' : ''}" aria-pressed="${selectedRating === rating}">${rating} <i class="bi bi-star-fill" aria-hidden="true"></i> <span>${questionResponses.filter(response => response.rating === rating).length}</span></button>`).join('')}`;
    $('#trainingEvaluationParticipants').innerHTML = responses.length ? responses.map(response => `<tr><td><span class="training-evaluation-avatar" aria-hidden="true">${escape(response.participant.split(' ').map(part => part[0]).slice(0,2).join(''))}</span>${escape(response.participant)}</td><td><span class="training-evaluation-participant-score">${response.rating} <i class="bi bi-star-fill" aria-hidden="true"></i></span></td></tr>`).join('') : '<tr><td colspan="2" class="training-evaluation-empty">No participants gave this rating.</td></tr>';
  }
  function renderScope() {
    const respondents = new Set(filtered(questions[0]).map(response => response.participant)).size;
    const attendeeGroups = [
      {date:'2025-05-22', association:'San Antonio Farmers Cooperative', count:14},
      {date:'2025-05-23', association:'Batangas Growers Association', count:10},
    ];
    const attendees = window.TMIS_PAGE ? window.TmisTrainingData.participantCount() : attendeeGroups.filter(group => (!selectedDate || group.date === selectedDate) &&
      (!selectedAssociation || group.association === selectedAssociation)).reduce((sum, group) => sum + group.count, 0);
    $('.training-evaluation-summary > div:nth-child(2) strong').innerHTML = `${respondents} <small>/ ${attendees}</small>`;
    $('.training-evaluation-summary > div:nth-child(3) strong').textContent = attendees ? `${Math.round(respondents / attendees * 100)}%` : '—';
    const visibleComments = comments.filter(comment => {
      const response = (questions[0]?.responses||[]).find(item => item.participant === comment.farmer);
      return response && matches(response);
    });
    $('.training-evaluation-comments .training-evaluation-detail-count').textContent = `${visibleComments.length} comments`;
    $('.training-evaluation-comments .resource-comment-list').innerHTML = visibleComments.length
      ? visibleComments.map(comment => `<article class="resource-comment"><span class="training-evaluation-avatar" aria-hidden="true">${escape(comment.farmer.split(' ').map(part => part[0]).slice(0,2).join(''))}</span><div><div class="resource-comment-heading"><strong>${escape(comment.farmer)}</strong><span>${comment.rating} <i class="bi bi-star-fill" aria-hidden="true"></i></span></div><p>${escape(comment.text)}</p></div></article>`).join('')
      : '<p class="evaluation-filter-empty">No farmer comments for these filters.</p>';
  }
  function renderFiltered() { renderScope(); renderRows(); renderDetail(); }
  $('#trainingEvaluationRows').addEventListener('click', event => {
    const button = event.target.closest('[data-question][data-rating]');
    if (!button) return;
    const question = Number(button.dataset.question);
    const rating = Number(button.dataset.rating);
    selectedRating = selectedQuestion === question && selectedRating === rating ? null : rating;
    selectedQuestion = question;
    renderRows();
    renderDetail();
  });
  $('#trainingEvaluationRatingTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-detail-rating]');
    if (!button) return;
    selectedRating = button.dataset.detailRating === 'all' ? null : Number(button.dataset.detailRating);
    renderRows();
    renderDetail();
  });
  window.trainingFeedbackFilters.register($('#trainingEvaluationDate'), $('#trainingEvaluationAssociation'), scope => {
    selectedDate = scope.date;
    selectedAssociation = scope.association;
    selectedRating = null;
    renderFiltered();
  });

  const overall = questions.reduce((accumulator, question) => {
    const {count, score} = stats(question);
    accumulator.count += count;
    accumulator.score += score;
    return accumulator;
  }, {count:0, score:0});
  const average = overall.count ? overall.score / overall.count : null;
  const ring = document.querySelector('.training-evaluation-card .evaluation-score-ring');
  if (ring) {
    ring.style.background = `conic-gradient(#8a35d5 0 ${average / 5 * 100}%, var(--color-border) ${average / 5 * 100}% 100%)`;
    ring.setAttribute('aria-label', average===null?'No submitted training evaluations':`Training evaluation: ${average.toFixed(2)} out of 5`);
    ring.querySelector('strong').textContent = average===null?'No results':average.toFixed(2);
    ring.closest('.training-evaluation-card').querySelector('.evaluation-grade').textContent=average===null?'No results':average>=4?'Very Good':average>=3?'Good':'Needs improvement';
    ring.closest('.training-evaluation-card').querySelector('.evaluation-score-copy p').textContent = overall.count?'Overall training rating':'No submitted evaluations';
  }
});
