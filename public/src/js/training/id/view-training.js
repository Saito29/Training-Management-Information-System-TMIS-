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
    document.querySelector('[data-score-highlight]').textContent = 'Assessment results are not yet available.';
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
