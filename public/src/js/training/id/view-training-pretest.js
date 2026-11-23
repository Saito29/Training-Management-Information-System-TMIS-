document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('pretest-panel');
  const items = window.trainingAssessments?.list('pretest') || [];
  if (!panel) return;

  const roster = [
    ['Juan Santos Dela Cruz', 'FMR-2025-001'], ['Pedro Garcia Reyes', 'FMR-2025-002'],
    ['Carlo Ramos Mendoza', 'FMR-2025-003'], ['Maria Reyes Santos', 'FMR-2025-004'],
    ['Rogelio Cruz Bautista', 'FMR-2025-005'], ['Antonio Lopez Ramos', 'FMR-2025-006'],
    ['Jose Aquino Garcia', 'FMR-2025-007'], ['Roberto Diaz Flores', 'FMR-2025-008'],
    ['Ana Cruz Villanueva', 'FMR-2025-009'], ['Mark Santos Navarro', 'FMR-2025-010'],
    ['Noel Mercado Castillo', 'FMR-2025-011'], ['Daniel Reyes Aquino', 'FMR-2025-012'],
    ['Paolo Cruz Mercado', 'FMR-2025-013'], ['Francisco Garcia Torres', 'FMR-2025-014'],
    ['Emmanuel Ramos Perez', 'FMR-2025-015'], ['Elena Santos Lopez', 'FMR-2025-016'],
    ['Rico Bautista Domingo', 'FMR-2025-017'], ['Eduardo Diaz Cruz', 'FMR-2025-018'],
    ['Rommel Aquino Rivera', 'FMR-2025-019'], ['Nestor Reyes Fernandez', 'FMR-2025-020'],
    ['Grace Mercado Gonzales', 'FMR-2025-021'], ['Joel Cruz Salazar', 'FMR-2025-022'],
    ['Albert Flores Pascual', 'FMR-2025-023'], ['Michael Ramos Valdez', 'FMR-2025-024'],
  ];
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const trainingTitle = (window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings')?.title||'Training' : document.querySelector('#overview-panel .training-title-row h2')?.textContent.trim() || 'Training');
  // Example participant scores. The questionnaire metadata has no individual scores yet.
  const scoreRows = (window.TMIS_PAGE ? items.map(item=>window.TmisTrainingData.scores('pre-test',item.id)) : items.map(item => {
    if (!item.itemCount || item.averageCorrect === null) return [];
    const count = roster.length;
    const target = Math.round(item.averageCorrect * count);
    const scores = Array.from({length:count}, (_, index) => Math.max(0, Math.min(item.itemCount, Math.round(item.averageCorrect) + (index % 5) - 2)));
    let difference = target - scores.reduce((sum, score) => sum + score, 0);
    for (let cursor = 0; difference !== 0 && cursor < count * item.itemCount; cursor++) {
      const index = cursor % count;
      const adjustment = Math.sign(difference);
      if (scores[index] + adjustment < 0 || scores[index] + adjustment > item.itemCount) continue;
      scores[index] += adjustment;
      difference -= adjustment;
    }
    return roster.slice(0, count).map(([name, id], index) => ({
      name, id, score:scores[index],
      association:index < 14 ? 'San Antonio Farmers Cooperative' : 'Batangas Growers Association',
      answeredAt:index < 14 ? '2025-05-22' : '2025-05-23',
    }));
  }));
  let selectedIndex = 0;
  let search = '';
  let answerDate = '';
  let association = '';
  panel.innerHTML = `<section class="pretest-results-card training-card" aria-labelledby="pretestResultsTitle"><header class="training-evaluation-header"><div class="training-evaluation-heading"><span class="training-evaluation-icon"><i class="bi bi-file-earmark-text" aria-hidden="true"></i></span><div><span class="training-evaluation-eyebrow">Knowledge assessment</span><h2 id="pretestResultsTitle">Pre-Test Questionnaires</h2><p>View participant scores for the selected pre-test.</p></div></div><div class="pretest-select-wrap"><label for="pretestQuestionnaireSelect">Pre-test questionnaire</label><select id="pretestQuestionnaireSelect" class="form-select">${items.map((item, index) => `<option value="${index}">${escape(item.name)}</option>`).join('')}</select></div></header>${items.length ? `<div class="pretest-selected-heading"><span class="pretest-selected-icon"><i class="bi bi-journal-check" aria-hidden="true"></i></span><div><strong id="pretestSelectedTitle"></strong><small id="pretestSelectedMeta"></small></div><span class="training-evaluation-sample">Saved participant scores</span></div><div class="training-evaluation-summary"><div><span>Participants scored</span><strong id="pretestParticipantCount"></strong></div><div><span>Questionnaire items</span><strong id="pretestItemCount"></strong></div><div><span>Average score</span><strong id="pretestAverageScore"></strong></div></div><div class="pretest-table-toolbar"><div><h3>Participant results</h3><p>Scores are shown for the selected questionnaire only.</p></div><label class="pretest-search"><i class="bi bi-search" aria-hidden="true"></i><span class="visually-hidden">Search participants</span><input id="pretestParticipantSearch" class="form-control" type="search" placeholder="Search participant" autocomplete="off"></label></div><div class="training-evaluation-table-wrap table-responsive"><table class="table pretest-results-table"><thead><tr><th scope="col">Participant full name</th><th scope="col">Training title</th><th scope="col">Pre-test score</th><th scope="col">Percentage</th></tr></thead><tbody id="pretestResultsBody"></tbody></table></div><p id="pretestResultsCount" class="pretest-results-count" role="status" aria-live="polite"></p>` : '<div class="pretest-empty">No pre-test questionnaires are linked to this training.</div>'}</section>`;
  if (!items.length) return;
  panel.querySelector('.training-evaluation-summary > div:first-child > span').textContent = 'Total participants';
  panel.querySelector('.pretest-search').insertAdjacentHTML('beforebegin', '<label class="pretest-date-filter"><span>Answer date</span><select id="pretestAnswerDateFilter" class="form-select" aria-label="Filter by pre-test answer date"></select></label>');
  panel.querySelector('.pretest-search').insertAdjacentHTML('beforebegin', '<label class="pretest-association-filter"><span>Farmer association</span><select id="pretestAssociationFilter" class="form-select" aria-label="Filter by farmer association"></select></label>');
  panel.querySelector('.pretest-results-table thead th:nth-child(3)').insertAdjacentHTML('beforebegin', '<th scope="col">Date answered</th>');
  panel.querySelector('.pretest-results-table thead th:nth-child(3)').insertAdjacentHTML('beforebegin', '<th scope="col">Farmer association</th>');
  const $ = selector => panel.querySelector(selector);
  function render() {
    const item = items[selectedIndex];
    const rows = scoreRows[selectedIndex];
    const scopedRows = rows.filter(row => (!answerDate || row.answeredAt === answerDate) && (!association || row.association === association));
    const average = scopedRows.length ? scopedRows.reduce((sum, row) => sum + row.score, 0) / scopedRows.length : null;
    const shown = scopedRows.filter(row => `${row.name} ${row.id} ${row.association}`.toLowerCase().includes(search));
    $('#pretestQuestionnaireSelect').value = String(selectedIndex);
    $('#pretestSelectedTitle').textContent = item.name;
    $('#pretestSelectedMeta').textContent = `${item.id} · ${trainingTitle}${answerDate ? ` · ${new Date(`${answerDate}T00:00:00`).toLocaleDateString('en-PH', {year:'numeric', month:'short', day:'numeric'})}` : ''}${association ? ` · ${association}` : ''}`;
    const totalForScope = new Set(scoreRows.flat().filter(row => (!answerDate || row.answeredAt === answerDate) && (!association || row.association === association)).map(row => row.id)).size;
    $('#pretestParticipantCount').textContent = totalForScope;
    $('#pretestItemCount').textContent = item.itemCount ?? '—';
    $('#pretestAverageScore').innerHTML = average === null ? 'No scores yet' : `${average.toFixed(2)} <small>/ ${window.TmisStore.escape(item.itemCount)} (${(average / item.itemCount * 100).toFixed(1)}%)</small>`;
    $('#pretestResultsBody').innerHTML = shown.length ? shown.map((row, index) => `<tr><th scope="row"><span class="pretest-row-number">${String(index + 1).padStart(2,'0')}</span><span><strong>${escape(row.name)}</strong><small>${escape(row.id)}</small></span></th><td>${escape(trainingTitle)}</td><td>${escape(row.association)}</td><td>${new Date(`${row.answeredAt}T00:00:00`).toLocaleDateString('en-PH', {year:'numeric', month:'short', day:'numeric'})}</td><td><span class="pretest-score">${row.score} <small>/ ${window.TmisStore.escape(item.itemCount)}</small></span></td><td>${(row.score / item.itemCount * 100).toFixed(1)}%</td></tr>`).join('') : `<tr><td colspan="6" class="pretest-empty">${scopedRows.length ? 'No participants match your search.' : 'No participant scores are available for these filters.'}</td></tr>`;
    $('#pretestResultsCount').textContent = `Showing ${shown.length} of ${scopedRows.length} scored participants${answerDate || association ? ' for the selected filters' : ''}`;
  }
  $('#pretestQuestionnaireSelect').addEventListener('change', event => { selectedIndex = Number(event.target.value); search = ''; $('#pretestParticipantSearch').value = ''; render(); });
  $('#pretestParticipantSearch').addEventListener('input', event => { search = event.target.value.trim().toLowerCase(); render(); });
  window.trainingFeedbackFilters.register($('#pretestAnswerDateFilter'), $('#pretestAssociationFilter'), scope => {
    answerDate = scope.date;
    association = scope.association;
    render();
  });
});
