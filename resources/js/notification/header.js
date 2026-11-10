import { buildNotifications } from './details/notification-data.js';
import { NOTIFICATION_TYPES } from './notification-data.js';

// The header and inbox read the same recipient-scoped local notifications.
function refresh() {
  const user = window.TmisActivity?.actor();
  if (!user?.id) return;
  const list = document.querySelector('.notification-menu-list');
  if (!list) return;
  try {
    const stateKey = `tmis-notification-state:${user.id}`;
    const state = JSON.parse(window.TmisStore.getItem(stateKey) || '{}');
    const items = buildNotifications(user, JSON.parse(window.TmisStore.getItem('tmis-users') || '[]'), JSON.parse(window.TmisStore.getItem('tmis-notifications') || '[]'))
      .map(item => ({ ...item, ...state[item.id] })).filter(item => !item.archivedAt);
    const unread = items.filter(item => !item.readAt).length;
    const count = document.querySelector('.notification-count');
    if (count) { count.textContent = unread; count.hidden = !unread; }
    const subtitle = document.querySelector('.notification-menu-subtitle');
    if (subtitle) subtitle.textContent = `${unread} unread updates`;
    list.replaceChildren(...items.slice(0, 10).map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `notification-menu-item ${item.readAt ? '' : 'is-unread'}`;
      const content = document.createElement('span');
      content.className = 'notification-item-copy';
      const title = document.createElement('span'); title.className = 'notification-item-title'; title.textContent = item.title;
      const summary = document.createElement('span'); summary.className = 'notification-item-summary'; summary.textContent = item.summary || item.message.slice(0,240);
      content.append(title, summary); button.append(content);
      button.addEventListener('click', async () => {
        const latest = JSON.parse(window.TmisStore.getItem(stateKey) || '{}');
        latest[item.id] = { ...latest[item.id], readAt: new Date().toISOString() };
        try { await window.TmisStore.setItem(stateKey, JSON.stringify(latest)); } catch { /* Still allow reading. */ }
        window.dispatchEvent(new CustomEvent('tmis:notification-preview', { detail: {
          ...item, type: NOTIFICATION_TYPES[item.type] || 'Notification',
          time: item.date ? window.TmisDate.parse(item.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '',
        } }));
        refresh();
      });
      return button;
    }));
    if (!items.length) { const empty = document.createElement('p'); empty.className = 'notification-empty-state'; empty.textContent = 'No notifications for your account.'; list.append(empty); }
  } catch { /* Keep the current header if browser storage is unavailable. */ }
}
window.addEventListener('tmis:activity-ready', refresh);
window.addEventListener('tmis:notifications-updated', refresh);
window.addEventListener('tmis:data-updated', refresh);
window.addEventListener('storage', refresh);
for (const [selector, archive] of [['.notification-mark-read', false], ['.notification-clear-all', true]]) {
  document.querySelector(selector)?.addEventListener('click', async event => {
    const user = window.TmisActivity?.actor();
    if (!user?.id) return;
    event.stopImmediatePropagation();
    try {
      const key = `tmis-notification-state:${user.id}`;
      const state = JSON.parse(window.TmisStore.getItem(key) || '{}');
      const items = buildNotifications(user, JSON.parse(window.TmisStore.getItem('tmis-users') || '[]'), JSON.parse(window.TmisStore.getItem('tmis-notifications') || '[]'));
      const now = new Date().toISOString();
      for (const item of items) state[item.id] = { ...state[item.id], readAt: now, ...(archive ? { archivedAt: now } : {}) };
      await window.TmisStore.setItem(key, JSON.stringify(state));
      refresh();
    } catch { /* Leave the existing state intact when saving fails. */ }
  }, true);
}
refresh();
