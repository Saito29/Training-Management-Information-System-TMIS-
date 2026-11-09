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
    return null;
  };
  const isAllowed = (path) => {
    if (access.administrator) return true;
    if (path.startsWith('/app/admin/administration/')
      || path === '/app/admin/notification/notification'
      || path.startsWith('/system/')
      || path.startsWith('/maintenance/settings')) {
      return false;
    }

    const module = moduleForPath(path);
    if (!module) return true;

    const usesPageAccess = permissions.has(`${module}.page_access`);
    const pagePermission = pagePermissions[path];
    const readPermission = usesPageAccess && pagePermission?.module === module
      ? pagePermission.permission
      : `${module}.read`;
    const required = [readPermission];
    if (path.includes('/create/') || path.includes('/encode/')) required.push(`${module}.create`);
    if (path.includes('/id/edit-')) required.push(`${module}.edit`);
    if (path.includes('/update/for-review')) required.push('trainings.submit');
    if (path.includes('/update/for-approval')) required.push('trainings.approve');
    if (path.includes('/update/for-acceptance')) required.push('trainings.accept');

    return required.every((permission) => permissions.has(permission));
  };

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
