/* Shared header and mobile navigation behavior. */
document.addEventListener('DOMContentLoaded', () => {
  // Resolve account navigation from this script, independent of page depth.
  const profileScript = [...document.scripts].find((script) => /\/src\/js\/shared\/nav\.js(?:[?#]|$)/.test(script.src));
  if (profileScript) {
    const loginUrl = new URL('../../../', profileScript.src);
    document.querySelectorAll('.sign-out-item').forEach((link) => {
      link.href = loginUrl.href;
    });
    document.addEventListener('click', (event) => {
      const link = event.target.closest('.sign-out-item');
      if (!link || event.defaultPrevented) return;
      const logoutForm = document.getElementById('logout-form');
      if (logoutForm) {
        event.preventDefault();
        logoutForm.requestSubmit();
        return;
      }
      // The auth client owns server logout when a real session is active.
      if (window.TmisAuth?.getSession()?.authenticated) return;
      event.preventDefault();
      window.TMIS_SESSION = null;
      try { sessionStorage.removeItem('tmis-current-user-id'); } catch { /* Storage may be disabled. */ }
      window.location.assign(loginUrl.href);
    });
    const queueBadges = [
      ...document.querySelectorAll('.badge-review'),
      ...document.querySelectorAll('.badge-approval'),
      ...document.querySelectorAll('.badge-acceptance'),
    ];
    queueBadges.forEach((badge) => { badge.textContent = '…'; });
    fetch(new URL('../../../operations/training-queue-counts', profileScript.src), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }).then((response) => {
      if (!response.ok) throw new Error('Queue counts unavailable');
      return response.json();
    }).then((counts) => {
      document.querySelectorAll('.badge-review').forEach((badge) => {
        const count = counts.for_review;
        badge.textContent = count ?? '';
        badge.hidden = count === null || count === 0;
        badge.setAttribute('aria-label', count === null ? 'Review queue access unavailable' : `${count} trainings for review`);
      });
      document.querySelectorAll('.badge-approval').forEach((badge) => {
        const count = counts.for_approval;
        badge.textContent = count ?? '';
        badge.hidden = count === null || count === 0;
        badge.setAttribute('aria-label', count === null ? 'Approval queue access unavailable' : `${count} trainings for approval`);
      });
      document.querySelectorAll('.badge-acceptance').forEach((badge) => {
        const count = counts.for_acceptance;
        badge.textContent = count ?? '';
        badge.hidden = count === null || count === 0;
        badge.setAttribute('aria-label', count === null ? 'Acceptance queue access unavailable' : `${count} trainings for acceptance`);
      });
    }).catch((error) => {
      queueBadges.forEach((badge) => { badge.hidden = true; });
      console.error('Unable to load training queue counts.', error);
    });
    const accountPages = { Profile: 'profile', Logs: 'logs' };
    document.querySelectorAll('.app-profile a, .app-mobile-menu a').forEach((link) => {
      const file = accountPages[link.textContent.trim()];
      if (!file) return;
      const profileUrl = window.TMIS_ACCOUNT_NAV?.[file] || new URL(`../../../app/admin/users/${file}`, profileScript.src).href;
      const normalizedUrl = new URL(profileUrl, location.href);
      link.href = normalizedUrl.href;
      if (window.location.pathname === normalizedUrl.pathname) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('active-page');
      }
    });
    const accountMenu = document.querySelector('.app-profile .user-menu');
    const administratorLinks = window.TMIS_ACCOUNT_NAV;
    if (accountMenu && administratorLinks?.visibility && !accountMenu.querySelector('[data-open-profile-visibility]')) {
      const signOut = accountMenu.querySelector('.sign-out-item')?.closest('li');
      if (signOut) {
        const item = document.createElement('li'), link = document.createElement('button');
        link.className = 'dropdown-item'; link.type = 'button'; link.setAttribute('data-open-profile-visibility', ''); link.setAttribute('aria-haspopup', 'dialog'); link.setAttribute('aria-controls', 'profileVisibilityDialog');
        const symbol = document.createElement('i'); symbol.className = 'bi bi-globe2'; symbol.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span'); text.textContent = 'Data visibility';
        link.append(symbol, text); item.append(link); accountMenu.insertBefore(item, signOut);
      }
    }
  }

  const mobileMainCollapses = {
    participantMobile: ['createParticipantMobile', 'updateParticipantMobile', 'detailsParticipantMobile', 'createFarmerAssociationMobile', 'detailsFarmerAssociationMobile'],
    trainingMobile: ['createTrainingMobile', 'updateTrainingMobile', 'detailsTrainingMobile', 'createFacilitatorRpMobile', 'detailsFacilitatorRpMobile'],
    evaluationMobile: ['createEvaluationMobile', 'encodeEvaluationMobile', 'encodedResultsMobile', 'detailsEvaluationMobile'],
    administrationMobile: ['createAdministrationMobile', 'updateAdministrationMobile', 'detailsAdministrationMobile'],
    toolsMobile: [],
  };
  const headerMainCollapses = {
    participantHeaderCollapse: ['createParticipantHeaderCollapse', 'updateParticipantHeaderCollapse', 'detailsParticipantHeaderCollapse', 'createFarmerAssociationHeaderCollapse', 'detailsFarmerAssociationHeaderCollapse'],
    trainingHeaderCollapse: ['createTrainingHeaderCollapse', 'updateTrainingHeaderCollapse', 'detailsTrainingHeaderCollapse', 'createFacilitatorRpHeaderCollapse', 'detailsFacilitatorRpHeaderCollapse'],
    evaluationHeaderCollapse: ['createEvaluationHeaderCollapse', 'encodeEvaluationHeaderCollapse', 'encodedResultsHeaderCollapse', 'detailsEvaluationHeaderCollapse'],
    administrationHeaderCollapse: ['createAdministrationHeaderCollapse', 'updateAdministrationHeaderCollapse', 'detailsAdministrationHeaderCollapse'],
    toolsHeaderCollapse: [],
  };

  document.querySelectorAll('.notification-view-all').forEach(control => {
    if (!profileScript) return;
    const href = new URL('../../../app/admin/notification/details/all-notification', profileScript.src).href;
    if (control.tagName === 'A') control.href = href;
    else control.addEventListener('click', () => window.location.assign(href));
  });

  const notificationDetailModal = document.getElementById('notificationDetailModal');
  if (profileScript) import(new URL('../notification/header.js', profileScript.src).href);
  let notificationFullContent = '';
  let notificationMetadata = { priority: '', reference: '' };
  if (notificationDetailModal) {
    notificationDetailModal.tabIndex = -1;
    const body = notificationDetailModal.querySelector('.modal-body');
    if (body) {
      body.tabIndex = 0;
      body.setAttribute('role', 'region');
      body.setAttribute('aria-label', 'Full notification content');
    }
    let previewOpening = false;
    notificationDetailModal.addEventListener('show.bs.modal', () => { previewOpening = true; });
    notificationDetailModal.addEventListener('shown.bs.modal', () => {
      previewOpening = false;
      if (body) body.scrollTop = 0;
    });
    // Reuse the page's modal styling while keeping the preview compact.
    const fullModal = notificationDetailModal.cloneNode(true);
    fullModal.id = 'notificationFullModal';
    fullModal.querySelectorAll('[id]').forEach((element) => {
      element.id = element.id.replace('notificationDetail', 'notificationFull');
    });
    fullModal.setAttribute('aria-labelledby', 'notificationFullModalLabel');
    fullModal.querySelector('.modal-dialog').classList.add('notification-full-dialog');
    fullModal.querySelector('.modal-content')?.classList.add('notification-full-modal');
    fullModal.querySelector('#notificationFullAction')?.remove();
    document.body.append(fullModal);
    const metadata = document.createElement('div');
    metadata.className = 'notification-full-meta';
    fullModal.querySelector('#notificationFullDescription')?.classList.add('notification-full-message');
    fullModal.querySelector('.modal-body').prepend(metadata);
    const fullBody = fullModal.querySelector('.modal-body');
    fullModal.addEventListener('show.bs.modal', () => document.body.classList.add('notification-modal-open'));
    fullModal.addEventListener('shown.bs.modal', () => { fullBody.scrollTop = 0; fullBody.focus(); });
    fullModal.addEventListener('hidden.bs.modal', () => {
      document.body.classList.remove('notification-modal-open');
      document.querySelector('.notification-btn')?.focus();
    });
    let openingFullModal = false;
    document.getElementById('notificationDetailAction')?.addEventListener('click', () => {
      if (openingFullModal || typeof bootstrap === 'undefined') return;
      openingFullModal = true;
      ['Type', 'Time', 'ModalLabel'].forEach((suffix) => {
        fullModal.querySelector('#notificationFull' + suffix).textContent =
          document.getElementById('notificationDetail' + suffix).textContent;
      });
      fullModal.querySelector('#notificationFullDescription').textContent = notificationFullContent ||
        document.getElementById('notificationDetailDescription').textContent;
      metadata.replaceChildren();
      for (const [icon, value, className] of [
        ['bi-exclamation-circle', notificationMetadata.priority, 'is-priority'],
        ['bi-hash', notificationMetadata.reference ? `Reference ${notificationMetadata.reference}` : '', 'is-reference'],
      ]) {
        if (!value) continue;
        const badge = document.createElement('span'); badge.className = `notification-full-chip ${className}`;
        const symbol = document.createElement('i'); symbol.className = `bi ${icon}`; symbol.setAttribute('aria-hidden', 'true');
        badge.append(symbol, document.createTextNode(value)); metadata.append(badge);
      }
      if (profileScript) {
        const content = notificationFullContent;
        import(new URL('../notification/message-editor.js?v=role-access-message-templates-1', profileScript.src).href).then(({ renderMessage }) => {
          renderMessage(fullModal.querySelector('#notificationFullDescription'), content);
        });
      }
      // Finish closing the preview before opening the full view: one backdrop and focus trap.
      notificationDetailModal.addEventListener('hidden.bs.modal', () => {
        bootstrap.Modal.getOrCreateInstance(fullModal).show();
        openingFullModal = false;
      }, { once: true });
      const closePreview = () => bootstrap.Modal.getOrCreateInstance(notificationDetailModal).hide();
      if (previewOpening) {
        notificationDetailModal.addEventListener('shown.bs.modal', closePreview, { once: true });
      } else {
        closePreview();
      }
    });
    window.addEventListener('tmis:notification-preview', ({ detail }) => {
      notificationFullContent = String(detail.message || '');
      const reference = String(detail.reference || '');
      const roleAccessNotice = /role|permission|access profile/i.test(String(detail.title || ''));
      notificationMetadata = { priority: detail.priority === 'high' ? 'Important' : '', reference: roleAccessNotice ? (/^TMIS-[A-Z0-9]{12}$/.test(reference) ? reference : '') : (/^\d+$/.test(reference) ? '' : reference) };
      for (const [suffix, value] of Object.entries({ Type: detail.type || 'Notification', Time: detail.time || '', ModalLabel: detail.title || 'Notification', Description: detail.summary || notificationFullContent.slice(0,240), Action: 'View full details' })) {
        document.getElementById('notificationDetail' + suffix).textContent = value;
      }
      if (typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(notificationDetailModal).show();
    });
  }
  const updateUnreadNotificationCount = () => {
    const unreadCount = document.querySelectorAll('.notification-menu-item.is-unread').length;
    const notificationCount = document.querySelector('.notification-count');
    const notificationSubtitle = document.querySelector('.notification-menu-subtitle');
    if (notificationCount) {
      notificationCount.textContent = unreadCount;
      notificationCount.hidden = unreadCount === 0;
    }
    if (notificationSubtitle) notificationSubtitle.textContent = `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`;
  };

  document.querySelectorAll('.notification-menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const { notificationType, notificationTime, notificationTitle, notificationDescription, notificationAction } = item.dataset;
      notificationFullContent = item.dataset.notificationContent || notificationDescription || '';
      notificationMetadata = { priority: '', reference: '' };
      const detailFields = {
        notificationDetailType: notificationType,
        notificationDetailTime: notificationTime,
        notificationDetailModalLabel: notificationTitle,
        notificationDetailDescription: notificationDescription,
        notificationDetailAction: notificationAction,
      };
      Object.entries(detailFields).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.textContent = value;
      });
      item.classList.remove('is-unread');
      updateUnreadNotificationCount();
    });
  });

  document.querySelector('.notification-mark-read')?.addEventListener('click', () => {
    document.querySelectorAll('.notification-menu-item.is-unread').forEach((item) => item.classList.remove('is-unread'));
    updateUnreadNotificationCount();
  });
  document.querySelector('.notification-clear-all')?.addEventListener('click', () => {
    const notificationMenuList = document.querySelector('.notification-menu-list');
    if (!notificationMenuList) return;
    notificationMenuList.replaceChildren();
    const emptyState = document.createElement('p');
    emptyState.className = 'notification-empty-state';
    emptyState.textContent = 'You have no notifications.';
    notificationMenuList.append(emptyState);
    updateUnreadNotificationCount();
  });
  notificationDetailModal?.addEventListener('show.bs.modal', () => document.body.classList.add('notification-modal-open'));
  notificationDetailModal?.addEventListener('hidden.bs.modal', () => {
    document.body.classList.remove('notification-modal-open');
    document.querySelector('.notification-btn')?.focus();
  });

  const hideCollapse = (element) => {
    if (!element?.classList.contains('show') || typeof bootstrap === 'undefined') return;
    bootstrap.Collapse.getOrCreateInstance(element, { toggle: false }).hide();
  };
  const bindCollapseGroup = (groups) => {
    let activeMainId = null;
    Object.entries(groups).forEach(([mainId, nestedIds]) => {
      const main = document.getElementById(mainId);
      let activeNestedId = null;
      main?.addEventListener('show.bs.collapse', (event) => {
        if (event.target !== main) return;
        activeMainId = mainId;
        Object.entries(groups).forEach(([otherId, otherNestedIds]) => {
          if (otherId === mainId) return;
          hideCollapse(document.getElementById(otherId));
          otherNestedIds.forEach((id) => hideCollapse(document.getElementById(id)));
        });
      });
      main?.addEventListener('shown.bs.collapse', (event) => {
        if (event.target === main && activeMainId !== mainId) hideCollapse(main);
      });
      nestedIds.forEach((nestedId) => {
        const nested = document.getElementById(nestedId);
        nested?.addEventListener('show.bs.collapse', (event) => {
          if (event.target !== nested) return;
          activeNestedId = nestedId;
          nestedIds.filter((otherId) => otherId !== nestedId).forEach((otherId) => hideCollapse(document.getElementById(otherId)));
        });
        nested?.addEventListener('shown.bs.collapse', (event) => {
          if (event.target === nested && activeNestedId !== nestedId) hideCollapse(nested);
        });
      });
    });
  };
  const addEncodedResultsNavigation = () => {
    const script = document.querySelector('script[src$="/src/js/shared/nav.js"]');
    if (!script) return;
    const base = new URL('../../../app/admin/evaluation/details/', script.src);
    const links = [
      ['encoded-pre-test', 'Pre-test'],
      ['encoded-post-test', 'Post-test'],
      ['encoded-training-evaluation', 'Training Evaluation'],
      ['encoded-rp-evaluation', 'Resource Person Evaluation'],
    ];
    const desktopDetails = document.getElementById('detailsEvaluationHeaderCollapse');
    const desktopTrigger = desktopDetails?.previousElementSibling;
    if (desktopTrigger && !document.getElementById('encodedResultsHeaderCollapse')) {
      const trigger = document.createElement('a');
      trigger.href = '#';
      trigger.className = 'header-collapse-item';
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('data-bs-toggle', 'collapse');
      trigger.setAttribute('data-bs-target', '#encodedResultsHeaderCollapse');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', 'encodedResultsHeaderCollapse');
      trigger.innerHTML = '<i class="bi bi-clipboard-check"></i><span>Encoded Results</span><i class="bi bi-chevron-down ms-auto"></i>';
      const panel = document.createElement('div');
      panel.className = 'collapse';
      panel.id = 'encodedResultsHeaderCollapse';
      const menu = document.createElement('div');
      menu.className = 'header-sub-collapse-menu';
      links.forEach(([file, label]) => {
        const link = document.createElement('a');
        link.href = new URL(file, base).href;
        link.className = 'header-sub-collapse-item';
        link.innerHTML = '<i class="bi bi-card-checklist"></i><span></span>';
        link.querySelector('span').textContent = label;
        menu.append(link);
      });
      panel.append(menu);
      desktopTrigger.before(trigger, panel);
    }
    const mobileDetails = document.getElementById('detailsEvaluationMobile')?.closest('li.mobile-list-navigation');
    if (mobileDetails && !document.getElementById('encodedResultsMobile')) {
      const section = document.createElement('li');
      section.className = 'mobile-list-navigation';
      section.innerHTML = '<a href="#" class="nav-link" data-bs-toggle="collapse" data-bs-target="#encodedResultsMobile" aria-controls="encodedResultsMobile" aria-expanded="false"><i class="bi bi-clipboard-check"></i><span>Encoded Results</span><i class="bi bi-chevron-down ms-auto"></i></a><ul class="collapse mobile-submenu" id="encodedResultsMobile"></ul>';
      const menu = section.querySelector('ul');
      links.forEach(([file, label]) => {
        const item = document.createElement('li');
        item.className = 'mobile-subnav-panel-navigation';
        const link = document.createElement('a');
        link.href = new URL(file, base).href;
        link.className = 'nav-link';
        link.innerHTML = '<i class="bi bi-card-checklist"></i><span></span>';
        link.querySelector('span').textContent = label;
        item.append(link);
        menu.append(item);
      });
      mobileDetails.before(section);
    }
  };
  const addToolsNavigation = () => {
    const script = document.querySelector('script[src$="/src/js/shared/nav.js"]');
    if (!script) return;
    const reportUrl = new URL('../../../app/admin/dashboard/dashboard#summary-report', script.src).href;
    const desktopAdministration = document.getElementById('administrationHeaderCollapse')?.closest('.nav-item');
    if (desktopAdministration && !document.getElementById('toolsHeaderCollapse')) {
      const section = document.createElement('li');
      section.className = 'nav-item';
      section.innerHTML = '<a href="#" class="nav-link" role="button" data-bs-toggle="collapse" data-bs-target="#toolsHeaderCollapse" aria-expanded="false" aria-controls="toolsHeaderCollapse"><i class="bi bi-tools"></i><span class="text-icon">Tools</span><i class="bi bi-chevron-down ms-2"></i></a><div class="collapse header-collapse" id="toolsHeaderCollapse"><div class="header-collapse-menu"><a class="header-collapse-item" href=""><i class="bi bi-file-earmark-bar-graph"></i><span>Summary Report</span></a></div></div>';
      section.querySelector('.header-collapse-item').href = reportUrl;
      desktopAdministration.before(section);
    }
    const mobileAdministration = document.getElementById('administrationMobile')?.closest('li.mobile-list-navigation');
    if (mobileAdministration && !document.getElementById('toolsMobile')) {
      const section = document.createElement('li');
      section.className = 'mobile-list-navigation';
      section.innerHTML = '<a href="#" class="nav-link" data-bs-toggle="collapse" data-bs-target="#toolsMobile" aria-controls="toolsMobile" aria-expanded="false"><i class="bi bi-tools"></i><span>Tools</span><i class="bi bi-chevron-down ms-auto"></i></a><ul class="collapse mobile-subnav" id="toolsMobile"><li class="mobile-list-navigation"><a class="nav-link" href=""><i class="bi bi-file-earmark-bar-graph"></i><span>Summary Report</span></a></li></ul>';
      section.querySelector('#toolsMobile a').href = reportUrl;
      mobileAdministration.before(section);
    }
  };
  addEncodedResultsNavigation();
  addToolsNavigation();
  bindCollapseGroup(mobileMainCollapses);
  bindCollapseGroup(headerMainCollapses);

  document.querySelectorAll('.offcanvas').forEach((offcanvas) => {
    offcanvas.addEventListener('show.bs.offcanvas', () => {
      document.querySelectorAll('.offcanvas.show').forEach((openOffcanvas) => {
        if (openOffcanvas !== offcanvas && typeof bootstrap !== 'undefined') bootstrap.Offcanvas.getOrCreateInstance(openOffcanvas).hide();
      });
    });
    offcanvas.addEventListener('hidden.bs.offcanvas', () => {
      Object.values(mobileMainCollapses).flat().forEach((id) => hideCollapse(document.getElementById(id)));
    });
  });

  updateUnreadNotificationCount();
});
