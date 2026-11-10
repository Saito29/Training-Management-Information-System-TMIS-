document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('logs-panel');
  if (!panel) return;

  const demoLogs = [
    { category: 'status', title: 'Training approved', description: 'The training status was changed from Pending to Approved.', date: 'May 20, 2025, 10:15 AM', icon: 'bi-check-circle' },
    { category: 'training', title: 'Training details updated', description: 'The venue and schedule for Good Agricultural Practices (GAP) were reviewed.', date: 'May 19, 2025, 3:40 PM', icon: 'bi-pencil-square' },
    { category: 'participant', title: 'Participants added', description: 'Five farmers were added to the training roster.', date: 'May 18, 2025, 11:25 AM', icon: 'bi-person-plus' },
    { category: 'attachment', title: 'Attachment added', description: 'The training program was added to the supporting documents.', date: 'May 17, 2025, 2:10 PM', icon: 'bi-file-earmark-plus' },
    { category: 'training', title: 'Training created', description: 'Good Agricultural Practices (GAP) was added to the training list.', date: 'May 16, 2025, 9:00 AM', icon: 'bi-journal-plus' },
  ];
  const readLogs = () => window.TMIS_PAGE
    ? window.TmisStore.selected('tmis-trainings')?.activityLogs || []
    : demoLogs;
  let logs = readLogs();
  const filters = [
    ['all', 'All activity', ''],
    ['attachment', 'Attachments', 'bi-paperclip'],
    ['participant', 'Participants', 'bi-people'],
    ['status', 'Status changes', 'bi-arrow-left-right'],
    ['training', 'Training details', 'bi-journal-text'],
  ];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
  const dateFormatter = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    timeStyle: 'short',
  });
  let active = 'all';

  panel.innerHTML = `<section class="training-activity-card training-card" aria-labelledby="trainingActivityTitle"><header class="training-activity-header"><div class="training-activity-heading"><span class="training-activity-icon"><i class="bi bi-activity"></i></span><div><h2 id="trainingActivityTitle">Activity Logs</h2><p>Recorded activity for this training.</p></div></div><div class="training-activity-search input-group"><label class="visually-hidden" for="trainingActivitySearch">Search activity logs</label><span class="input-group-text"><i class="bi bi-search"></i></span><input id="trainingActivitySearch" class="form-control" type="search" placeholder="Search activity" autocomplete="off"></div></header><div class="training-activity-toolbar"><nav class="training-activity-filters" aria-label="Filter training activity">${filters.map(([key, label, icon]) => `<button class="training-activity-filter ${key === 'all' ? 'is-active' : ''}" type="button" data-filter="${key}" aria-pressed="${key === 'all'}">${icon ? `<i class="bi ${icon}"></i>` : ''}${label} <span data-count="${key}">0</span></button>`).join('')}</nav><p id="trainingActivityCount" aria-live="polite"></p></div><div class="training-activity-list" id="trainingActivityList" aria-live="polite"></div></section>`;

  const search = panel.querySelector('#trainingActivitySearch');
  const list = panel.querySelector('#trainingActivityList');

  function formatDate(value) {
    const date = window.TmisDate.parse(value);
    if (Number.isNaN(date.getTime())) return { label: 'Date not recorded', dateTime: '' };

    return {
      label: `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`,
      dateTime: date.toISOString(),
    };
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const shown = logs.filter(item => {
      const searchable = [
        item.title,
        item.description,
        item.actor,
        item.actorOffice,
        item.actorRegion,
        item.status,
        item.context,
        item.category,
      ].join(' ').toLocaleLowerCase();

      return (active === 'all' || item.category === active) && searchable.includes(query);
    });

    filters.forEach(([key]) => {
      panel.querySelector(`[data-count="${key}"]`).textContent = key === 'all'
        ? String(logs.length)
        : String(logs.filter(item => item.category === key).length);
    });
    panel.querySelector('#trainingActivityCount').textContent = `${shown.length} ${shown.length === 1 ? 'result' : 'results'}`;

    list.innerHTML = shown.length ? shown.map(item => {
      const date = formatDate(item.date);
      const status = item.status || 'Recorded';
      const statusClass = status === 'Success' ? ' is-success' : '';
      const actorDetails = [
        item.actorOffice || 'Office not recorded',
        item.actorRegion || 'Region not recorded',
      ].join(' · ');
      const categoryLabels = { attachment: 'Attachment', participant: 'Participant', status: 'Status', training: 'Training' };
      const categoryLabel = categoryLabels[item.category] || 'Activity';

      return `<article class="training-activity-entry" data-category="${escape(item.category)}"><span class="training-activity-entry-icon"><i class="bi ${escape(item.icon || 'bi-clock-history')}" aria-hidden="true"></i></span><div class="training-activity-entry-content"><div class="training-activity-entry-top"><div class="training-activity-entry-heading"><h3>${escape(item.title)}</h3><span class="training-activity-context" data-category="${escape(item.category)}" title="${escape(item.context || '')}">${escape(categoryLabel)}</span></div><span class="training-activity-status${statusClass}">${escape(status)}</span></div><p>${escape(item.description)}</p><div class="training-activity-meta"><div class="training-activity-meta-item"><i class="bi bi-person-check" aria-hidden="true"></i><span><small>Performed by</small><strong>${escape(item.actor || 'Authorized system user')}</strong><span>${escape(actorDetails)}</span></span></div><div class="training-activity-meta-item"><i class="bi bi-clock" aria-hidden="true"></i><span><small>Date &amp; Time</small><time${date.dateTime ? ` datetime="${escape(date.dateTime)}"` : ''}>${escape(date.label)}</time></span></div></div></div></article>`;
    }).join('') : `<div class="training-activity-empty"><i class="bi ${logs.length ? 'bi-search' : 'bi-clock-history'}"></i><strong>${logs.length ? 'No matching activity' : 'No activity logs yet'}</strong><span>${logs.length ? 'Try another search or activity filter.' : 'Updates to this training will appear here.'}</span></div>`;
  }

  panel.querySelector('.training-activity-filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;

    active = button.dataset.filter;
    panel.querySelectorAll('[data-filter]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    render();
  });
  search.addEventListener('input', render);
  window.addEventListener('tmis:data-updated', () => {
    logs = readLogs();
    const training = window.TmisStore.selected('tmis-trainings');
    const heading = panel.querySelector('.training-activity-heading p');
    if (heading) {
      heading.textContent = training
        ? `Recorded activity for ${training.title || training.name || 'this training'}.`
        : 'Recorded activity for this training.';
    }
    render();
  });
  const initialTraining = window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings') : null;
  const heading = panel.querySelector('.training-activity-heading p');
  if (heading && initialTraining) {
    heading.textContent = `Recorded activity for ${initialTraining.title || initialTraining.name || 'this training'}.`;
  }
  document.addEventListener('training:attachment', event => {
    const { action, file } = event.detail;
    logs.unshift({
      category: 'attachment',
      title: `Attachment ${action}`,
      description: `${file} was ${action} in this training view.`,
      date: new Date().toISOString(),
      actor: 'Current user',
      status: 'Success',
      reference: 'Training attachment',
      context: 'Training Management · Attachment Update',
      icon: action === 'added' ? 'bi-file-earmark-plus' : 'bi-file-earmark-minus',
    });
    render();
  });
  render();
});
