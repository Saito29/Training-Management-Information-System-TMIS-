import { ACTIVITY_KEY, COLLECTIONS, findActor, actorName, normalizeName, collectionFor, describeChanges, safeFields, mutationAction } from './activity-core.js';
// Frontend prototype journal: no network, no form values, no trusted audit claims.
const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem, nativeGet = Storage.prototype.getItem;
let contextUntil = 0, contextAction = null, lastActionAt = 0;
const parse = (value, fallback = []) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
function actor() {
  if (window.TMIS_SESSION?.source === 'database') return window.TMIS_SESSION.user;
  try {
    const users = parse(nativeGet.call(localStorage, 'tmis-users'));
    return findActor(users, window.TMIS_SESSION?.userId || sessionStorage.getItem('tmis-current-user-id'), document.querySelector('.app-profile .profile-name')?.textContent || document.querySelector('.mobile-user-name-role .user-name')?.textContent);
  } catch { return null; }
}
function moduleName() { return /\/app\/admin\/(participants|training|evaluation|administration|users|dashboard)\//.exec(location.pathname)?.[1] || 'system'; }
function stored() { const list = parse(nativeGet.call(localStorage, ACTIVITY_KEY)); return Array.isArray(list) ? list : []; }
function record(event, attributedActor = null) {
  try {
    const action = mutationAction(event.action);
    if (!action || (event.status && event.status !== 'success')) return false;
    const user = attributedActor || actor(); if (!user) return false;
    const entry = { id: crypto.randomUUID(), actorId: user.id, actor: actorName(user), date: new Date().toISOString(), module: event.module || moduleName(), action, title: String(event.title || 'Activity recorded').slice(0, 160), description: String(event.description || '').slice(0, 600), reference: String(event.reference || '').slice(0, 100), status: event.status || 'success', page: location.pathname, fields: safeFields(Array.isArray(event.fields) ? event.fields : []), source: 'browser' };
    lastActionAt = Date.now();
    const entries = stored(); entries.push(entry); nativeSet.call(localStorage, ACTIVITY_KEY, JSON.stringify(entries.slice(-2000)));
    window.dispatchEvent(new CustomEvent('tmis:activity', { detail: entry })); return true;
  } catch { window.dispatchEvent(new Event('tmis:activity-storage-error')); return false; }
}
function entries() {
  const user = actor(); if (!user) return [];
  const own = stored().filter(entry => entry?.actorId === user.id && mutationAction(entry.action) && entry.status === 'success').map(entry => ({ ...entry, action: mutationAction(entry.action) }));
  // Import only saved history with explicit actor attribution, never sample logs.
  for (const key of ['tmis-users','tmis-resource-persons','tmis-farmer-associations']) {
    const records = parse(nativeGet.call(localStorage, key)); if (!Array.isArray(records)) continue;
    for (const row of records) {
      if (!row || typeof row !== 'object') continue;
      const history = [...(Array.isArray(row.activityLogs) ? row.activityLogs : []), ...(Array.isArray(row.activity_logs) ? row.activity_logs : [])];
      for (const log of history) {
        const actorId = log?.actorId || log?.actor_id || log?.userId;
        if (!(actorId ? actorId === user.id : normalizeName(log?.actor) === normalizeName(actorName(user)))) continue;
        if (!log.date || Number.isNaN(Date.parse(log.date))) continue;
        const area = COLLECTIONS[key].module, reference = String(log.reference || row.id || '');
        if (own.some(entry => entry.module === area && entry.reference === reference && Math.abs(Date.parse(entry.date) - Date.parse(log.date)) < 1500)) continue;
        own.push({ id: `saved:${key}:${row.id}:${log.date}:${log.title}`, actorId: user.id, actor: actorName(user), date: log.date, module: area, action: log.category === 'registration' ? 'create' : log.category === 'delete' ? 'delete' : 'update', title: String(log.title || 'Saved activity'), description: String(log.description || ''), reference, status: 'success', page: '', fields: [], source: 'saved' });
      }
    }
  }
  return own.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
function trackWrite(storage, key, previous, next, user) {
  if (storage !== localStorage || Date.now() > contextUntil || !collectionFor(key)) return;
  describeChanges(key, previous, next).forEach(change => record({ ...change, status: 'success' }, user));
}
Storage.prototype.setItem = function(key, value) {
  const watched = this === localStorage && collectionFor(String(key));
  const previous = watched ? nativeGet.call(this, key) : null;
  const user = watched ? actor() : null;
  const result = nativeSet.call(this, key, value);
  try { if (watched) trackWrite(this, String(key), previous, String(value), user); } catch { /* Never interrupt the underlying save. */ }
  return result;
};
Storage.prototype.removeItem = function(key) {
  const watched = this === localStorage && collectionFor(String(key));
  const previous = watched ? nativeGet.call(this, key) : null;
  const user = watched ? actor() : null;
  const result = nativeRemove.call(this, key);
  try { if (watched) trackWrite(this, String(key), previous, null, user); } catch { /* Never interrupt the underlying deletion. */ }
  return result;
};
function init() {
  document.addEventListener('click', event => {
    if (!event.isTrusted) return;
    contextUntil = Date.now() + 30000;
    const button = event.target.closest('button, a'); if (!button) return;
    const label = [button.id, button.title, button.getAttribute('aria-label'), button.textContent].join(' ');
    const actions = [['approve', /approve/i], ['reject', /reject/i], ['delete', /delete|remove/i], ['restore', /undo|restore/i], ['create', /register|create/i], ['update', /save|submit|update/i], ['attachment', /attach|upload/i]];
    contextAction = actions.find(([, pattern]) => pattern.test(label))?.[0] || null;

  }, true);
  // Input merely establishes an autosave context; its value is never read or logged.
  document.addEventListener('input', event => { if (event.isTrusted && event.target.type !== 'password') { contextUntil = Date.now() + 30000; contextAction = 'update'; } }, true);
  document.addEventListener('change', event => { if (event.isTrusted && event.target.type !== 'password') { contextUntil = Date.now() + 30000; contextAction = event.target.type === 'file' ? 'attachment' : 'update'; } }, true);
  document.addEventListener('training:attachment', event => {
    if (Date.now() > contextUntil) return;
    const action = ['added','updated','removed'].includes(event.detail?.action) ? event.detail.action : 'changed';
    record({ action: action === 'added' ? 'create' : action === 'removed' ? 'delete' : 'update', module: 'training', title: `Training attachment ${action}`, description: 'A supporting attachment was changed in the training view.', reference: String(event.detail?.file || 'Attachment') });
  });
  // Older in-memory screens signal completed actions through Bootstrap toasts.
  // Record the action/result only; toast bodies may contain personal information.
  document.addEventListener('shown.bs.toast', event => {
    if (!contextAction || Date.now() > contextUntil || Date.now() - lastActionAt < 1500) return;
    const toast = event.target;
    const status = toast.dataset.type === 'error' || toast.classList.contains('is-error') ? 'error' : toast.dataset.type === 'warning' || toast.classList.contains('is-warning') ? 'warning' : 'success';
    record({ action: contextAction, title: `${contextAction.charAt(0).toUpperCase() + contextAction.slice(1)} action reported`, description: status === 'success' ? 'The page reported that the action completed.' : 'The page reported a warning or error for this action.', status });
  });

}
window.TmisActivity = { record, entries, actor };
window.dispatchEvent(new Event('tmis:activity-ready'));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
