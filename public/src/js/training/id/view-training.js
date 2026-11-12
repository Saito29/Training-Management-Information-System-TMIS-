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
});

document.addEventListener('DOMContentLoaded', () => {
  if (!window.TMIS_PAGE || !window.TmisStore) return;

  const training = window.TmisStore.selected('tmis-trainings');
  if (!training) return;

  const field = name => document.querySelector(`[data-training-field="${name}"]`);
  const text = (name, value, fallback = 'Not recorded') => {
    const element = field(name);
    if (element) element.textContent = value || fallback;
  };
  const displayDate = value => {
    if (!value) return '';
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(date);
  };
  const startDate = displayDate(training.start_date || training.startDate);
  const endDate = displayDate(training.end_date || training.endDate);
  const schedule = [startDate, endDate].filter(Boolean).join(' – ');
  const participants = Array.isArray(training.participants) ? training.participants : [];
  const farmers = window.TmisStore.records('tmis-farmers')
    .filter(farmer => participants.includes(farmer.id));
  const maleCount = farmers.filter(farmer => farmer.sex === 'Male' || farmer.gender === 'Male').length;
  const femaleCount = farmers.filter(farmer => farmer.sex === 'Female' || farmer.gender === 'Female').length;
  const location = [training.barangay, training.municipality, training.province]
    .filter(Boolean)
    .join(', ');
  const resources = Array.isArray(training.trainers) ? training.trainers : [];
  const target = training.target_participants || training.targetParticipants;
  const budget = Number(training.budget ?? training.training_budget);
  const statusElement = field('status');

  text('title', training.training_title || training.title || training.name);
  text('subtitle', [training.training_type || training.type, training.delivery_mode].filter(Boolean).join(' · '), 'Training record overview');
  text('id', training.id);
  text('type', training.training_type || training.type);
  text('delivery', training.delivery_mode);
  text('schedule', schedule);
  text('participantCount', `${participants.length} enrolled`, '0 enrolled');
  text('participantCountShort', String(participants.length), '0');
  text('office', training.office);
  text('region', training.region);
  text('venue', training.venue_location || training.venue);
  text('location', location);
  text('partner', training.partner_organization);
  text('target', target ? `${target} participants` : '');
  text('budget', Number.isFinite(budget)
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(budget)
    : '');
  text('resources', resources.map(resource => resource.name).filter(Boolean).join(', '), 'No resource persons recorded');
  text('description', training.training_description || training.description, 'No training description has been recorded.');
  text('genderSummary', `${maleCount} male · ${femaleCount} female`, 'No participant demographics recorded');

  if (statusElement) {
    const status = training.workflowStatus || training.status || 'Status not recorded';
    statusElement.textContent = status;
    statusElement.dataset.status = status.toLowerCase().replace(/[^a-z]+/g, '-');
  }
  const activeStatusElement = field('active-status');
  if (activeStatusElement) {
    const activeStatus = training.is_active === false ? 'Inactive' : 'Active';
    activeStatusElement.textContent = activeStatus;
    activeStatusElement.dataset.status = activeStatus.toLowerCase();
  }
  const chart = document.querySelector('[data-gender-chart]');
  if (chart) chart.setAttribute('aria-label', `${maleCount} male and ${femaleCount} female participants`);
  document.querySelectorAll('[data-gender-count]').forEach(element => {
    const count = element.dataset.genderCount === 'Male' ? maleCount : femaleCount;
    element.textContent = `${count} participants`;
  });

  const renderList = (element, items, fallback) => {
    if (!element) return;
    const values = Array.isArray(items) ? items.filter(item => typeof item === 'string' && item.trim()) : [];
    element.replaceChildren(...(values.length
      ? values.map(item => {
        const row = document.createElement('li');
        row.textContent = item;
        return row;
      })
      : [Object.assign(document.createElement('li'), { textContent: fallback })]));
  };
  renderList(document.getElementById('overviewHighlights'), training.bullets?.[0], 'No highlights recorded.');
  renderList(document.getElementById('overviewWaysForward'), training.bullets?.[1], 'No next steps recorded.');

  const resourceList = document.getElementById('overviewResourcePersons');
  if (resourceList) {
    resourceList.replaceChildren(...(resources.length
      ? resources.map(resource => {
        const row = document.createElement('div');
        row.className = 'person-row';
        const initials = document.createElement('span');
        initials.className = 'avatar';
        initials.textContent = String(resource.name || 'RP').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
        const details = document.createElement('span');
        const name = document.createElement('strong');
        name.textContent = resource.name || 'Resource person';
        const role = document.createElement('small');
        role.textContent = resource.role || 'Resource Person';
        details.append(name, role);
        row.append(initials, details);
        return row;
      })
      : [Object.assign(document.createElement('p'), { className: 'training-overview-empty', textContent: 'No resource persons recorded.' })]));
  }

  const editLink = document.querySelector('.training-edit');
  if (editLink) {
    editLink.href = `${editLink.pathname.replace(/\/$/, '')}/${encodeURIComponent(training.id)}`;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const charts = new Map();
  const assessments = window.trainingAssessments;
  const pretest = assessments?.summary('pretest') || { count: 0, totalItems: 0, averageCorrect: null, percentage: null };
  const posttest = assessments?.summary('posttest') || { count: 0, totalItems: 0, averageCorrect: null, percentage: null };
  const percentage = summary => summary.percentage === null ? '—' : `${summary.percentage.toFixed(2)}%`;
  const exams = ['pretest', 'posttest'].flatMap(type => (assessments?.list(type) || []).map((item, index) => ({
    ...item,
    type,
    index: index + 1,
    percentage: item.itemCount && item.averageCorrect !== null ? Number((item.averageCorrect / item.itemCount * 100).toFixed(2)) : null,
  })));
  const examLabel = exam => `${exam.type === 'pretest' ? 'Pre-Test' : 'Post-Test'} ${exam.index}`;
  const chartPercent = value => value !== null && value !== undefined && Number.isFinite(Number(value))
    ? `${Number(Number(value).toFixed(2))}%` : '—';
  const stats = document.getElementById('overviewAssessmentStats');
  const legend = document.getElementById('assessmentChartLegend');
  if (exams.length) {
    exams.forEach(exam => {
      const card = document.createElement('article');
      card.className = `stat-card assessment-stat ${exam.type === 'pretest' ? 'blue' : 'green'}`;
      const icon = document.createElement('span');
      icon.className = 'stat-icon';
      icon.innerHTML = `<i class="bi ${exam.type === 'pretest' ? 'bi-file-earmark-text-fill' : 'bi-file-earmark-check-fill'}"></i>`;
      const body = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = `${examLabel(exam)} · ${exam.name}`;
      const value = document.createElement('strong');
      value.textContent = exam.percentage === null ? '—' : `${exam.percentage.toFixed(2)}%`;
      const detail = document.createElement('small');
      detail.textContent = exam.averageCorrect === null ? `${exam.itemCount || '—'} items · No scores yet` : `${exam.averageCorrect.toFixed(2)} / ${exam.itemCount} items`;
      body.append(title, value, detail);
      card.append(icon, body);
      stats.append(card);
      const legendItem = document.createElement('div');
      legendItem.className = `assessment-chart-key ${exam.type}`;
      const dot = document.createElement('span');
      dot.className = 'assessment-chart-dot';
      const label = document.createElement('span');
      label.textContent = `${examLabel(exam)}: ${exam.name}`;
      legendItem.append(dot, label);
      legend.append(legendItem);
    });
  } else {
    stats.textContent = 'No questionnaires selected for this training.';
  }
  document.querySelectorAll('[data-pretest-average]').forEach(element => { element.textContent = percentage(pretest); });
  document.querySelectorAll('[data-posttest-average]').forEach(element => { element.textContent = percentage(posttest); });
  if (pretest.percentage === null || posttest.percentage === null) {
    const scoreHighlight = document.querySelector('[data-score-highlight]');
    if (scoreHighlight) {
      scoreHighlight.textContent = 'Assessment results are not yet available.';
    }
  }
  document.getElementById('testAverageChart').setAttribute('aria-label', exams.length
    ? exams.map(exam => `${examLabel(exam)} ${exam.name}: ${exam.percentage === null ? 'no scores yet' : `${exam.percentage.toFixed(2)}%`}`).join('; ')
    : 'No questionnaires selected');

  const theme = () => {
    const css = getComputedStyle(document.documentElement);
    return {
      dark: document.documentElement.dataset.theme === 'dark',
      text: css.getPropertyValue('--color-text-primary').trim() || '#263238',
      muted: css.getPropertyValue('--color-text-secondary').trim() || '#607080',
      border: css.getPropertyValue('--color-border').trim() || '#e0e0e0',
      surface: css.getPropertyValue('--color-surface').trim() || '#fff',
    };
  };

  function renderChart(element) {
    if (charts.has(element)) return;
    if (element.id === 'testAverageChart' && !exams.length) {
      element.textContent = 'No questionnaires selected.';
      return;
    }
    if (typeof ApexCharts === 'undefined') {
      element.textContent = 'Chart unavailable';
      return;
    }

    const colors = theme();
    const isGender = element.matches('[data-gender-chart]');
    const options = isGender ? {
      chart: { type: 'donut', height: 185, fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
      series: window.TMIS_PAGE ? ['Male','Female'].map(sex=>window.TmisStore.records('tmis-farmers').filter(item=>window.TmisStore.selected('tmis-trainings')?.participants?.includes(item.id)&&item.sex===sex).length) : [20,4],
      labels: ['Male', 'Female'],
      colors: ['#398bf6', '#f8669f'],
      legend: { show: false },
      stroke: { width: 2, colors: [colors.surface] },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '68%', labels: {
        show: true,
        name: { show: false },
        value: { show: false },
        total: { show: true, showAlways: true, label: 'Total', color: colors.muted,
          fontSize: '12px', formatter: () => window.TMIS_PAGE ? String(window.TmisTrainingData.participantCount()) : '24' },
      } } } },
      tooltip: { theme: colors.dark ? 'dark' : 'light', y: { formatter: value => `${value} participants` } },
    } : {
      chart: { type: 'bar', height: 275, fontFamily: 'Inter, sans-serif', toolbar: { show: false }, redrawOnParentResize: true },
      series: [{ name: 'Average score', data: exams.map(exam => exam.percentage) }],
      colors: exams.map(exam => exam.type === 'pretest' ? '#68a7f8' : '#42c77d'),
      plotOptions: { bar: { distributed: true, columnWidth: '54%', borderRadius: 4, dataLabels: { position: 'top' } } },
      dataLabels: { enabled: true, offsetY: -17, formatter: chartPercent,
        style: { colors: [colors.text], fontSize: '11px', fontWeight: 600 } },
      xaxis: { categories: exams.map(examLabel), labels: { style: { colors: exams.map(() => colors.muted), fontSize: '11px' } },
        axisBorder: { color: colors.border }, axisTicks: { show: false } },
      yaxis: { min: 0, max: 100, tickAmount: 5, labels: { formatter: chartPercent,
        style: { colors: [colors.muted] } } },
      grid: { borderColor: colors.border, padding: { top: 28, left: 5, right: 5 } },
      legend: { show: false },
      tooltip: { theme: colors.dark ? 'dark' : 'light', x: { formatter: (value, context) => exams[context?.dataPointIndex]?.name || value }, y: { formatter: chartPercent } },
    };
    const chart = new ApexCharts(element, options);
    charts.set(element, chart);
    chart.render();
  }

  document.querySelectorAll('#overview-panel [data-gender-chart], #overview-panel #testAverageChart').forEach(renderChart);
  document.addEventListener('training:tabchange', event => {
    event.detail.panel.querySelectorAll('[data-gender-chart], #testAverageChart').forEach(renderChart);
  });
  new MutationObserver(() => {
    const colors = theme();
    charts.forEach((chart, element) => {
      const gender = element.matches('[data-gender-chart]');
      chart.updateOptions(gender ? {
        stroke: { colors: [colors.surface] },
        plotOptions: { pie: { donut: { labels: { total: { color: colors.muted } } } } },
        tooltip: { theme: colors.dark ? 'dark' : 'light' },
      } : {
        dataLabels: { style: { colors: [colors.text] } },
        xaxis: { labels: { style: { colors: exams.map(() => colors.muted) } }, axisBorder: { color: colors.border } },
        yaxis: { labels: { style: { colors: [colors.muted] } } },
        grid: { borderColor: colors.border },
        tooltip: { theme: colors.dark ? 'dark' : 'light' },
      }, false, false);
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});
