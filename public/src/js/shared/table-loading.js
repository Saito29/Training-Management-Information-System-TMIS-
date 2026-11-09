/* Shared table feedback. Page-specific handlers still own fetching and rendering data. */
(() => {
  const sessions = new WeakMap();
  const initialized = new WeakSet();
  const buttons = new WeakMap();
  const minimumDuration = 500;
  const isVisible = (element) => element.getClientRects().length > 0;

  function start(table, button) {
    if (!table || sessions.has(table)) return;
    const bodies = [...table.tBodies];
    if (!bodies.length || !isVisible(table)) return;
    const headings = [...(table.tHead?.rows[0]?.cells || bodies[0].rows[0]?.cells || [])];
    if (!headings.length) return;
    const previousBusy = table.getAttribute('aria-busy');
    const skeleton = document.createElement('tbody');
    skeleton.className = 'tmis-table-skeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    const rowCount = Math.max(4, Math.min(8, bodies.reduce((sum, body) => sum + body.rows.length, 0)));
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const row = document.createElement('tr');
      headings.forEach((heading, column) => {
        const cell = document.createElement('td');
        cell.hidden = heading.hidden || getComputedStyle(heading).display === 'none';
        cell.colSpan = heading.colSpan;
        const bar = document.createElement('span');
        bar.className = 'tmis-skeleton-bar';
        if (/action/i.test(heading.textContent)) bar.classList.add('tmis-skeleton-actions');
        else if (/status/i.test(heading.textContent)) bar.classList.add('tmis-skeleton-badge');
        bar.style.setProperty('--skeleton-width', `${[72, 88, 62, 80][(rowIndex + column) % 4]}%`);
        cell.append(bar); row.append(cell);
      });
      skeleton.append(row);
    }
    const status = document.createElement('span');
    status.className = 'tmis-table-loading-status';
    status.setAttribute('role', 'status');
    status.textContent = 'Loading table data. Please wait.';
    table.before(status);
    table.dataset.tmisLoading = 'true';
    table.setAttribute('aria-busy', 'true');
    table.append(skeleton);
    if (button) {
      const buttonState = buttons.get(button) || { count: 0, busy: button.getAttribute('aria-busy') };
      buttonState.count++;
      buttons.set(button, buttonState);
      button.setAttribute('aria-busy', 'true'); button.classList.add('tmis-table-refreshing');
    }
    const started = performance.now();
    const state = { timer: null, observer: null };
    const finish = () => {
      state.observer.disconnect();
      skeleton.remove(); status.remove(); delete table.dataset.tmisLoading;
      previousBusy === null ? table.removeAttribute('aria-busy') : table.setAttribute('aria-busy', previousBusy);
      if (button) {
        const buttonState = buttons.get(button);
        if (--buttonState.count === 0) {
          button.classList.remove('tmis-table-refreshing');
          buttonState.busy === null ? button.removeAttribute('aria-busy') : button.setAttribute('aria-busy', buttonState.busy);
          buttons.delete(button);
        }
      }
      sessions.delete(table);
    };
    // Allow queued render work to settle without replacing or cloning real rows.
    const schedule = () => {
      clearTimeout(state.timer);
      state.timer = setTimeout(finish, Math.max(100, (button ? minimumDuration : 900) - (performance.now() - started)));
    };
    state.observer = new MutationObserver(schedule);
    bodies.forEach((body) => state.observer.observe(body, { childList: true, subtree: true, characterData: true }));
    sessions.set(table, state);
    schedule();
  }

  function tablesFor(button) {
    let scope = button.parentElement;
    while (scope && scope !== document.body) {
      const tables = [...scope.querySelectorAll('table')].filter(isVisible);
      if (tables.length) return tables;
      scope = scope.parentElement;
    }
    return [...document.querySelectorAll('table')].filter(isVisible);
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button, a[role="button"], input[type="button"]');
    if (!button) return;
    const label = [button.id, button.title, button.getAttribute('aria-label'), button.textContent, button.value].join(' ');
    if (!/refresh/i.test(label)) return;
    const tables = tablesFor(button);
    if (tables.some((table) => sessions.has(table))) {
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    tables.forEach((table) => start(table, button));
  }, true);

  function initialize() {
    document.querySelectorAll('table').forEach((table) => {
      if (!initialized.has(table) && isVisible(table) && table.tBodies.length) {
        initialized.add(table); start(table);
      }
    });
  }
  const ready = () => {
    // Page render handlers run before we read column visibility and row counts.
    setTimeout(initialize, 0);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; initialize(); });
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
