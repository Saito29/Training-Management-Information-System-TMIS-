import { buildNotifications } from './details/notification-data.js';
import { NOTIFICATION_TYPES } from './notification-data.js';

// The header and inbox read the same recipient-scoped local notifications.
let inboxCleanupInProgress = false;
function refresh() {
  const user = window.TmisActivity?.actor();
  if (!user?.id) return;
  const list = document.querySelector('.notification-menu-list');
  if (!list) return;
  const removeRepeatedTitle = (content, title) => {
    const text = String(content ?? '').replace(/\r\n?/g, '\n').trim();
    const heading = String(title ?? '').trim();
    if (!text || !heading) return text;
    const lines = text.split('\n');
    if (lines[0].trim().replace(/^#{1,6}\s*/, '').toLocaleLowerCase() === heading.toLocaleLowerCase()) {
      lines.shift();
      return lines.join('\n').trim();
    }
    if (text.toLocaleLowerCase().startsWith(heading.toLocaleLowerCase())) {
      const remainder = text.slice(heading.length);
      if (/^[\s:–—-]/.test(remainder)) return remainder.replace(/^[\s:–—-]+/, '').trim();
    }
    return text;
  };
  try {
    const stateKey = `tmis-notification-state:${user.id}`;
    let state = JSON.parse(window.TmisStore.getItem(stateKey) || '{}');
    const sourceItems = buildNotifications(user, JSON.parse(window.TmisStore.getItem('tmis-users') || '[]'), JSON.parse(window.TmisStore.getItem('tmis-notifications') || '[]'));
    const cleanupMarker = '__existing-inbox-cleanup__';
    const cleanupState = state[cleanupMarker] || {};
    const existingCutoff = cleanupState.archivedAt;
    const cutoffTime = existingCutoff ? Date.parse(existingCutoff) : Number.NaN;
    const hasOldItemsOutsideCutoff = Array.isArray(cleanupState.hiddenIds)
      && cleanupState.hiddenIds.length === 0
      && sourceItems.some(item => Number.isFinite(Date.parse(item.date || '')) && Date.parse(item.date) <= cutoffTime);
    if ((!Array.isArray(cleanupState.hiddenIds) || hasOldItemsOutsideCutoff) && !inboxCleanupInProgress) {
      const archivedAt = cleanupState.archivedAt || new Date().toISOString();
      const wasPreviouslyArchived = Boolean(cleanupState.archivedAt);
      const cutoff = Date.parse(archivedAt);
      const hiddenItems = sourceItems.filter(item => {
        const archivedValue = state[item.id]?.archivedAt;
        const itemArchiveTime = archivedValue ? Date.parse(archivedValue) : Number.NaN;
        if (wasPreviouslyArchived && Number.isFinite(itemArchiveTime) && Math.abs(itemArchiveTime - cutoff) < 60_000) return true;
        const itemDate = item.date ? Date.parse(item.date) : Number.NaN;
        return Number.isFinite(itemDate) ? itemDate <= cutoff : !wasPreviouslyArchived;
      });
      const hiddenIds = hiddenItems.map(item => String(item.id));
      state = { ...state, [cleanupMarker]: { archivedAt, hiddenIds } };
      if (wasPreviouslyArchived) {
        for (const item of hiddenItems) {
          const currentState = state[item.id] || {};
          const itemArchiveTime = currentState.archivedAt ? Date.parse(currentState.archivedAt) : Number.NaN;
          if (Number.isFinite(itemArchiveTime) && Math.abs(itemArchiveTime - cutoff) < 60_000) {
            state[item.id] = { ...currentState, archivedAt: null };
          }
        }
      }
      inboxCleanupInProgress = true;
      window.TmisStore.setItem(stateKey, JSON.stringify(state))
        .catch(() => console.error('The notification dropdown cutoff could not be saved.'))
        .finally(() => { inboxCleanupInProgress = false; });
    }
    const hiddenIds = new Set(state[cleanupMarker]?.hiddenIds || []);
    const items = sourceItems.map(item => ({ ...item, ...state[item.id] }))
      .filter(item => !item.archivedAt && !hiddenIds.has(String(item.id)));
    const unread = items.filter(item => !item.readAt).length;
    const count = document.querySelector('.notification-count');
    if (count) {
      count.textContent = unread;
      count.hidden = !unread;
      count.dataset.notificationsReady = 'true';
    }
    const subtitle = document.querySelector('.notification-menu-subtitle');
    if (subtitle) subtitle.textContent = `${unread} unread updates`;
    list.replaceChildren(...items.slice(0, 10).map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      const isUnread = !item.readAt;
      button.className = `notification-menu-item ${isUnread ? 'is-unread' : ''}`;
      button.setAttribute('aria-label', `${isUnread ? 'Unread' : 'Read'} notification: ${item.title}`);
      const content = document.createElement('span');
      content.className = 'notification-item-copy';
      const heading = document.createElement('span');
      heading.className = 'notification-item-heading';
      const title = document.createElement('span'); title.className = 'notification-item-title'; title.textContent = item.title;
      const readState = document.createElement('span');
      readState.className = `notification-read-state ${isUnread ? 'is-unread' : 'is-read'}`;
      readState.textContent = isUnread ? 'Unread' : 'Read';
      heading.append(title, readState);
      const summary = document.createElement('span'); summary.className = 'notification-item-summary';
      const cleanSummary = removeRepeatedTitle(item.summary, item.title);
      const preview = cleanSummary || removeRepeatedTitle(item.message, item.title);
      summary.textContent = preview.length > 240 ? `${preview.slice(0,237).trimEnd()}…` : preview;
      content.append(heading, summary); button.append(content);
      button.addEventListener('click', async () => {
        const latest = JSON.parse(window.TmisStore.getItem(stateKey) || '{}');
        latest[item.id] = { ...latest[item.id], readAt: new Date().toISOString() };
        try { await window.TmisStore.setItem(stateKey, JSON.stringify(latest)); } catch { /* Still allow reading. */ }
        window.dispatchEvent(new CustomEvent('tmis:notification-preview', { detail: {
          ...item, summary: preview, message: removeRepeatedTitle(item.message, item.title), type: NOTIFICATION_TYPES[item.type] || 'Notification',
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
