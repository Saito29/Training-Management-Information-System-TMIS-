(() => {
  const access = window.TMIS_NAV_ACCESS;
  if (!access) return;

  const permissions = new Set(access.permissions || []);
  const pagePermissions = access.page_permissions || {};
  const moduleForPath = (path) => {
    if (path.startsWith('/app/admin/training/')) {
      return path.includes('rp-') || path.includes('-rp') ? 'resource_persons' : 'trainings';
    }
    if (path.startsWith('/app/admin/participants/')) {
      return path.includes('fa-') || path.includes('-fa') ? 'associations' : 'participants';
    }
    if (path.startsWith('/app/admin/evaluation/')) {
      return path.includes('/encode/') || path.includes('encoded-') ? 'evaluations' : 'questionnaires';
    }
    if (path.startsWith('/app/admin/administration/')) return 'administration';
    return null;
  };
  const isAllowed = (path) => {
    if (access.administrator) return true;
    if (path === '/app/admin/notification/notification'
      || path.startsWith('/system/')
      || path.startsWith('/maintenance/settings')) {
      return false;
    }

    const module = moduleForPath(path);
    if (!module) return true;

    const usesPageAccess = permissions.has(`${module}.page_access`);
    const pagePermission = pagePermissions[path]
      || (path === '/app/admin/administration/id/edit-user'
        || path.startsWith('/app/admin/administration/id/edit/')
        ? pagePermissions['/app/admin/administration/id/edit']
        : undefined);
    const resolvedPagePermission = pagePermission
      || (path === '/app/admin/administration/id/view-user'
        || path.startsWith('/app/admin/administration/id/view/')
        ? pagePermissions['/app/admin/administration/id/view']
        : undefined);
    const readPermission = usesPageAccess && resolvedPagePermission?.module === module
      ? resolvedPagePermission.permission
      : `${module}.read`;
    const required = [readPermission];
    if (path.includes('/create/') || path.includes('/encode/')) required.push(`${module}.create`);
    if (path.includes('/id/edit-') || path.includes('/id/edit/')) required.push(`${module}.edit`);
    if (module === 'administration' && path.includes('/update/for-approval')) required.push('administration.approve');
    if (path.includes('/update/for-review')) required.push('trainings.submit');
    if (path.includes('/update/for-approval')) required.push('trainings.approve');
    if (path.includes('/update/for-acceptance')) required.push('trainings.accept');

    return required.every((permission) => permissions.has(permission));
  };

  const deletedAccountsPath = '/app/admin/administration/details/trash';
  const hasNavigationLink = (container, path) => [...container.querySelectorAll('a[href]')].some((anchor) => {
    try {
      const url = new URL(anchor.getAttribute('href'), window.location.href);
      return url.origin === window.location.origin && url.pathname === path;
    } catch {
      return false;
    }
  });
  const createDeletedAccountsLink = (className) => {
    const link = document.createElement('a');
    link.href = deletedAccountsPath;
    link.className = className;
    const icon = document.createElement('i');
    icon.className = 'bi bi-person-x';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = 'Deleted accounts';
    link.append(icon, label);
    return link;
  };
  const desktopDetails = document.querySelector('#detailsAdministrationHeaderCollapse .header-sub-collapse-menu');
  if (desktopDetails && !hasNavigationLink(desktopDetails, deletedAccountsPath)) {
    desktopDetails.append(createDeletedAccountsLink('header-sub-collapse-item'));
  }
  const mobileDetails = document.querySelector('#detailsAdministrationMobile');
  if (mobileDetails && !hasNavigationLink(mobileDetails, deletedAccountsPath)) {
    const item = document.createElement('li');
    item.className = 'mobile-subnav-panel-navigation';
    item.append(createDeletedAccountsLink('nav-link'));
    mobileDetails.append(item);
  }

  const deletedFarmersPath = '/app/admin/participants/details/trash';
  const createDeletedFarmersLink = (className) => {
    const link = document.createElement('a');
    link.href = deletedFarmersPath;
    link.className = className;
    const icon = document.createElement('i');
    icon.className = 'bi bi-person-x';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = 'Deleted farmers';
    link.append(icon, label);
    return link;
  };
  const desktopParticipantDetails = document.querySelector('#detailsParticipantHeaderCollapse .header-sub-collapse-menu');
  if (desktopParticipantDetails && !hasNavigationLink(desktopParticipantDetails, deletedFarmersPath)) {
    desktopParticipantDetails.append(createDeletedFarmersLink('header-sub-collapse-item'));
  }
  const mobileParticipantDetails = document.querySelector('#detailsParticipantMobile');
  if (mobileParticipantDetails && !hasNavigationLink(mobileParticipantDetails, deletedFarmersPath)) {
    const item = document.createElement('li');
    item.className = 'mobile-subnav-panel-navigation';
    item.append(createDeletedFarmersLink('nav-link'));
    mobileParticipantDetails.append(item);
  }

  const navigationRoots = [...document.querySelectorAll('.app-navigation-bar, #mobileNavMenu')];
  navigationRoots.forEach((root) => root.querySelectorAll('a[href]').forEach((anchor) => {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin === window.location.origin && !isAllowed(url.pathname)) {
      anchor.remove();
    }
  }));

  let removed;
  do {
    removed = false;
    navigationRoots.forEach((root) => {
      const hasDestinationLink = (container) => [...container.querySelectorAll('a[href]')]
        .some((anchor) => anchor.getAttribute('href') && anchor.getAttribute('href') !== '#');
      [...root.querySelectorAll('[data-bs-toggle="collapse"][data-bs-target]')].reverse().forEach((trigger) => {
        const targetSelector = trigger.getAttribute('data-bs-target');
        const target = targetSelector?.startsWith('#')
          ? document.getElementById(targetSelector.slice(1))
          : null;
        if (!target || !hasDestinationLink(target)) {
          trigger.remove();
          target?.remove();
          removed = true;
        }
      });

      const sectionSelector = '.participant-nav-section-label, .training-nav-section-label, .mobile-subnav-section-label';
      [...root.querySelectorAll(sectionSelector)].forEach((label) => {
        let next = label.nextElementSibling;
        let hasDestination = false;
        while (next && !next.matches(sectionSelector)) {
          if (hasDestinationLink(next)) hasDestination = true;
          next = next.nextElementSibling;
        }
        if (!hasDestination) {
          label.remove();
          removed = true;
        }
      });

      [...root.querySelectorAll('li')].reverse().forEach((item) => {
        if (!hasDestinationLink(item)) {
          item.remove();
          removed = true;
        }
      });
    });
  } while (removed);
})();
