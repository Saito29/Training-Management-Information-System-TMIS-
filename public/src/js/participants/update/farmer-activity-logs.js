document.addEventListener('DOMContentLoaded', () => {
  const demoLogs = [
    {
      category: 'attachment',
      title: 'Proof of farm ownership added',
      description:
        'A new land tenure document was uploaded to the farmer profile and is ready for verification.',
      actor: 'Maria Santos',
      date: '2026-10-08T13:42:00+08:00',
      status: 'Added',
      reference: 'Farm_Tenure_2026.pdf',
      icon: 'bi-file-earmark-plus',
    },
    {
      category: 'membership',
      title: 'Association membership confirmed',
      description:
        'Juan Dela Cruz was confirmed as an active member of Villa Esperanza Farmers Association.',
      actor: 'Ramon Villanueva',
      date: '2026-10-07T10:18:00+08:00',
      status: 'Confirmed',
      reference: 'Villa Esperanza FA',
      icon: 'bi-person-check',
    },
    {
      category: 'status',
      title: 'Profile moved to For Approval',
      description:
        'The profile passed initial review and was forwarded to the approving officer.',
      actor: 'Liza Mendoza',
      date: '2026-10-06T15:06:00+08:00',
      status: 'For Review → For Approval',
      reference: 'Workflow update',
      icon: 'bi-arrow-left-right',
    },
    {
      category: 'attachment',
      title: 'Valid ID replaced',
      description:
        'The previous identification document was replaced with a clearer, updated copy.',
      actor: 'Maria Santos',
      date: '2026-10-05T09:34:00+08:00',
      status: 'Updated',
      reference: 'Farmer_ID_front.jpg',
      icon: 'bi-arrow-repeat',
    },
    {
      category: 'membership',
      title: 'Membership role updated',
      description:
        'The farmer association record was updated following confirmation from the organization.',
      actor: 'Ramon Villanueva',
      date: '2026-10-03T14:27:00+08:00',
      status: 'Updated',
      reference: 'Member role',
      icon: 'bi-person-gear',
    },
    {
      category: 'status',
      title: 'Profile review started',
      description:
        'A reviewer began validating the farmer’s encoded details and supporting documents.',
      actor: 'Liza Mendoza',
      date: '2026-10-02T08:51:00+08:00',
      status: 'In Review',
      reference: 'Workflow update',
      icon: 'bi-clipboard2-check',
    },
    {
      category: 'attachment',
      title: 'Membership certificate verified',
      description:
        'The association membership certificate was reviewed and marked as verified.',
      actor: 'Maria Santos',
      date: '2026-09-30T16:12:00+08:00',
      status: 'Verified',
      reference: 'Membership_Certificate.pdf',
      icon: 'bi-patch-check',
    },
    {
      category: 'profile',
      title: 'Contact details updated',
      description:
        'The farmer’s mobile number and preferred contact details were updated.',
      actor: 'Juan Dela Cruz',
      date: '2026-09-29T11:20:00+08:00',
      status: 'Updated',
      reference: 'Profile information',
      icon: 'bi-person-vcard',
    },
  ];
  const readLogs = () => window.TMIS_PAGE
    ? window.TmisStore.selected('tmis-farmers')?.activityLogs || []
    : demoLogs;
  let logs = readLogs();

  const list = document.getElementById('activityLogList');
  const search = document.getElementById('activityLogSearch');
  const empty = document.getElementById('activityLogEmpty');
  const resultCount = document.getElementById('activityLogResultCount');
  const filterButtons = [
    ...document.querySelectorAll('[data-activity-filter]'),
  ];
  if (!list || !search || !empty || !resultCount || !filterButtons.length) return;

  let activeFilter = 'all';
  const dateFormatter = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' });
  const timeFormatter = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', timeStyle: 'short' });

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const createLogCard = (log) => {
    const article = makeElement('article', 'activity-log-entry');
    article.dataset.category = log.category;

    const marker = makeElement('span', 'activity-log-entry-icon');
    const icon = makeElement('i', `bi ${log.icon}`);
    icon.setAttribute('aria-hidden', 'true');
    marker.append(icon);

    const content = makeElement('div', 'activity-log-entry-content');
    const top = makeElement('div', 'activity-log-entry-top');
    const heading = makeElement('div', 'activity-log-entry-title-group');
    const title = makeElement('h3', 'activity-log-entry-title', log.title);
    const categoryNames = { attachment: 'Attachment', membership: 'Membership', status: 'Status', profile: 'Profile' };
    const category = makeElement('span', 'activity-log-context', categoryNames[log.category] || 'Activity');
    category.dataset.category = log.category || 'profile';
    if (log.context) category.title = log.context;
    heading.append(title, category);

    const status = makeElement('span', `activity-log-status ${log.status === 'Success' ? 'is-success' : ''}`, log.status || 'Recorded');
    top.append(heading, status);

    const description = makeElement(
      'p',
      'activity-log-entry-description',
      log.description
    );
    const meta = makeElement('div', 'activity-log-entry-meta');

    const addMeta = (label, value, detail, icon, className = '') => {
      const item = makeElement('div', `activity-log-meta-item ${className}`.trim());
      const iconElement = makeElement('i', `bi ${icon}`);
      iconElement.setAttribute('aria-hidden', 'true');
      const copy = makeElement('span', 'activity-log-meta-copy');
      copy.append(makeElement('small', '', label), makeElement('strong', '', value));
      if (detail) copy.append(makeElement('span', 'activity-log-meta-detail', detail));
      item.append(iconElement, copy);
      meta.append(item);
      return item;
    };

    const actorDetails = [
      log.actorRole,
      log.actorOffice || 'Office not recorded',
      log.actorRegion || 'Region not recorded',
    ].filter(Boolean).join(' · ');
    addMeta('Performed by', log.actor || 'Authorized system user', actorDetails, 'bi-person-check');
    const timestamp = addMeta('Date & Time', '', '', 'bi-clock');
    const date = window.TmisDate.parse(log.date);
    const hasDate = date instanceof Date && !Number.isNaN(date.getTime());
    const dateValue = makeElement('time', 'activity-log-date-value', hasDate ? `${dateFormatter.format(date)} · ${timeFormatter.format(date)}` : 'Date not recorded');
    if (hasDate) dateValue.dateTime = log.date;
    timestamp.querySelector('strong').replaceWith(dateValue);
    content.append(top, description, meta);
    article.append(marker, content);
    return article;
  };

  const updateCounts = () => {
    filterButtons.forEach((button) => {
      const category = button.dataset.activityFilter;
      const count = category === 'all'
        ? logs.length
        : logs.filter((log) => log.category === category).length;
      const countElement = button.querySelector(
        `[data-activity-count="${category}"]`
      );
      if (countElement) countElement.textContent = String(count);
    });
  };

  const render = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const visibleLogs = logs.filter((log) => {
      const matchesFilter =
        activeFilter === 'all' || log.category === activeFilter;
      const matchesSearch =
        !query ||
        [
          log.title,
          log.description,
          log.actor,
          log.actorRole,
          log.actorOffice,
          log.actorRegion,
          log.status,
          log.context,
          log.category,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query);
      return matchesFilter && matchesSearch;
    });

    list.replaceChildren(...visibleLogs.map(createLogCard));
    empty.hidden = visibleLogs.length > 0;
    resultCount.textContent = `Showing ${visibleLogs.length} of ${logs.length} activities`;
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.activityFilter;
      filterButtons.forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle('is-active', isActive);
        filterButton.setAttribute('aria-pressed', String(isActive));
      });
      render();
    });
  });

  search.addEventListener('input', render);
  window.addEventListener('tmis:data-updated', () => {
    logs = readLogs();
    const farmer = window.TmisStore.selected('tmis-farmers');
    const heading = document.querySelector('.activity-log-heading p');
    if (heading) {
      heading.textContent = farmer
        ? `Recent updates and actions recorded for ${farmer.name}'s profile.`
        : 'Recent updates and actions recorded for this profile.';
    }
    updateCounts();
    render();
  });
  const initialFarmer = window.TMIS_PAGE ? window.TmisStore.selected('tmis-farmers') : null;
  const description = document.querySelector('.activity-log-heading p');
  if (description && initialFarmer) {
    description.textContent = `Recent updates and actions recorded for ${initialFarmer.name}'s profile.`;
  }
  updateCounts();
  render();
});
