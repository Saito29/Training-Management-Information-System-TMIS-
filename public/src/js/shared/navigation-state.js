document.addEventListener('DOMContentLoaded', () => {
  const normalizePath = (path) => {
    try { return decodeURIComponent(path).replace(/\/+$/, '').toLowerCase(); }
    catch { return path.replace(/\/+$/, '').toLowerCase(); }
  };

  const currentSection = () => {
    const path = normalizePath(window.location.pathname);
    if(path==='/system/settings')return 'settings';
    const route = path.match(/\/app\/admin\/(participants|training|evaluation|administration|users)\//);
    if (route) return route[1];
    if (/\/app\/admin\/dashboard\//.test(path)) {
      return window.location.hash.toLowerCase() === '#summary-report' ? 'tools' : 'dashboard';
    }
    return null;
  };

  const sectionForLink = (link) => {
    if(new URL(link.href,location.href).pathname==='/system/settings')return {key:'settings',trigger:null};
    if (['Profile', 'Logs'].includes(link.textContent.trim())) return { key: 'users', trigger: null };
    const section = link.closest(
      '.app-navigation-bar .navbar-nav > .nav-item, .app-mobile-menu .mobile-nav > .mobile-list-navigation'
    );
    const trigger = section?.querySelector(':scope > .nav-link');
    const target = trigger?.getAttribute('data-bs-target')?.toLowerCase() || '';
    if (target.includes('participant')) return { key: 'participants', trigger };
    if (target.includes('training')) return { key: 'training', trigger };
    if (target.includes('evaluation')) return { key: 'evaluation', trigger };
    if (target.includes('administration')) return { key: 'administration', trigger };
    if (target.includes('tools')) return { key: 'tools', trigger };
    if (trigger?.textContent?.trim().toLowerCase() === 'dashboard') return { key: 'dashboard', trigger };
    return { key: null, trigger };
  };

  const activateParents = (link) => {
    let parent = link.parentElement;
    while (parent && !parent.matches('.app-header, .app-mobile-menu')) {
      if (parent.classList.contains('collapse') && parent.id) {
        const scope = parent.closest('.app-header, .app-mobile-menu');
        scope?.querySelectorAll('[data-bs-target]').forEach((trigger) => {
          if (trigger.getAttribute('data-bs-target') === `#${parent.id}`) {
            trigger.classList.add('active-page');
          }
        });
      }
      parent = parent.parentElement;
    }
  };

  const updateActiveNavigation = () => {
    const currentPath = normalizePath(window.location.pathname);
    const currentHash = window.location.hash.toLowerCase();
    const routeSection = currentSection();
    const navigation = document.querySelectorAll('.app-header a[href], .app-mobile-menu a[href]');

    navigation.forEach((link) => {
      link.classList.remove('active-page');
      if(link.closest('.user-menu'))link.classList.remove('active');
      link.removeAttribute('aria-current');
    });

    const matchedScopes = new Set();
    navigation.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('#')) return;
      const { key, trigger } = sectionForLink(link);
      if (!key || key !== routeSection) return;

      let target;
      try { target = new URL(href, window.location.href); }
      catch { return; }

      if (
        target.origin !== window.location.origin ||
        normalizePath(target.pathname) !== currentPath ||
        (!['users','settings'].includes(routeSection) && target.hash.toLowerCase() !== currentHash)
      ) return;

      link.classList.add('active-page');
      link.setAttribute('aria-current', 'page');
      activateParents(link);
      if (trigger && trigger !== link) trigger.classList.add('active-page');
      matchedScopes.add(link.closest('.app-header, .app-mobile-menu'));
    });

    if (routeSection) {
      navigation.forEach((link) => {
        const { key, trigger } = sectionForLink(link);
        const scope = link.closest('.app-header, .app-mobile-menu');
        if (key === routeSection && link === trigger && !matchedScopes.has(scope)) {
          link.classList.add('active-page');
        }
      });
    }
  };

  updateActiveNavigation();
  window.addEventListener('hashchange', updateActiveNavigation);
  window.addEventListener('tmis:navigation-updated',updateActiveNavigation);
});
