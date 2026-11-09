// Database accounts use the authenticated session provider. The preview provider remains for isolated UI tests.
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
export function describeBrowser(userAgent = '') {
  const browser = /Edg\//.test(userAgent) ? 'Microsoft Edge' : /Firefox\//.test(userAgent) ? 'Firefox' : /Chrome\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : 'Web browser';
  const platform = /iPhone|iPad/.test(userAgent) ? 'iOS / iPadOS' : /Android/.test(userAgent) ? 'Android' : /Windows/.test(userAgent) ? 'Windows' : /Macintosh/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : 'This device';
  return { browser, platform, deviceType: /iPhone|iPad|Android/.test(userAgent) ? 'mobile' : 'desktop' };
}
export function createPreviewSessionProvider({ userAgent = globalThis.navigator?.userAgent || '', now = () => Date.now(), delay = 200 } = {}) {
  let sessions;
  function reset() {
    const time = now(), browser = describeBrowser(userAgent);
    sessions = [
      { id: 'preview-current', deviceName: 'This browser', ...browser, isCurrent: true, location: 'Not available in preview', lastActiveAt: new Date(time).toISOString(), createdAt: null },
      { id: 'preview-phone', deviceName: 'Sample mobile device', browser: 'Safari', platform: 'iOS', deviceType: 'mobile', isCurrent: false, location: 'Sample office connection', lastActiveAt: new Date(time - 2 * 3600000).toISOString(), createdAt: new Date(time - 3 * 86400000).toISOString() },
      { id: 'preview-workstation', deviceName: 'Sample workstation', browser: 'Microsoft Edge', platform: 'Windows', deviceType: 'desktop', isCurrent: false, location: 'Sample office connection', lastActiveAt: new Date(time - 86400000).toISOString(), createdAt: new Date(time - 7 * 86400000).toISOString() },
    ];
  }
  reset();
  return {
    mode: 'preview',
    async list() { await pause(delay); return sessions.map(session => ({ ...session })); },
    async revoke(id) {
      await pause(delay);
      const session = sessions.find(item => item.id === id);
      if (!session) throw new Error('This preview session is no longer listed. Refresh and try again.');
      if (session.isCurrent) throw new Error('Your current session is kept open.');
      sessions = sessions.filter(item => item.id !== id);
    },
    async revokeOthers() { await pause(delay); sessions = sessions.filter(session => session.isCurrent); },
    reset,
  };
}
export function validateSessions(sessions) {
  if (!Array.isArray(sessions)) throw new Error('The session list could not be read.');
  const ids = new Set(); let current = 0;
  return sessions.map(session => {
    if (!session || typeof session.id !== 'string' || !session.id || ids.has(session.id) || typeof session.isCurrent !== 'boolean') throw new Error('The service returned invalid session data.');
    ids.add(session.id); current += Number(session.isCurrent);
    if (current > 1) throw new Error('The service returned more than one current session.');
    return { ...session };
  });
}
// This adapter is ready for future session endpoints; it is never selected by default.
// request() must attach the real HttpOnly session cookie and CSRF header.
export function createSessionApiProvider(request) {
  if (typeof request !== 'function') throw new TypeError('An authenticated request function is required.');
  return {
    mode: 'live',
    async list() { const result = await request('sessions'); return validateSessions(result.sessions); },
    async revoke(id) { await request('sessions/revoke', { id }); },
    async revokeOthers() { await request('sessions/revoke-others', {}); },
  };
}

export function mountDeviceSessions({ provider = createPreviewSessionProvider(), document: doc = globalThis.document } = {}) {
  const $ = id => doc.getElementById(id);
  if (!$('deviceSessionsSection')) return;
  const preview = provider.mode === 'preview';
  let sessions = [], busy = false, pending = null;
  const dialog = $('deviceSessionDialog');
  const make = (tag, className, text) => { const node = doc.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const formatDate = value => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? 'Not available' : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(date);
  };
  function feedback(message, error = false) {
    $('deviceSessionFeedback').hidden = !message;
    $('deviceSessionFeedback').textContent = message;
    $('deviceSessionFeedback').dataset.type = error ? 'error' : 'success';
    $('deviceSessionFeedback').setAttribute('role', error ? 'alert' : 'status');
  }
  function controls() {
    $('refreshDeviceSessions').disabled = busy;
    $('resetDevicePreview').hidden = !preview;
    $('resetDevicePreview').disabled = busy;
    $('revokeOtherDeviceSessions').disabled = busy || !sessions.some(session => !session.isCurrent);
    $('confirmDeviceSessionRevoke').disabled = busy;
    $('deviceSessionList').setAttribute('aria-busy', String(busy));
    $('deviceSessionList').querySelectorAll('button').forEach(button => { button.disabled = busy; });
  }
  function ask(session = null) {
    pending = session ? { id: session.id, name: session.deviceName || session.browser || 'this device' } : { all: true };
    $('deviceSessionDialogTitle').textContent = session ? 'Sign out this device?' : 'Sign out all other sessions?';
    $('deviceSessionDialogDescription').textContent = session ? `${pending.name} will need to sign in again. Your current session will stay open.` : `${sessions.filter(item => !item.isCurrent).length} other sessions will be signed out. Your current session will stay open.`;
    $('deviceSessionDialogPreview').hidden = !preview;
    $('confirmDeviceSessionRevoke').textContent = session ? 'Sign out session' : 'Sign out other sessions';
    dialog.showModal();
  }
  function render() {
    $('deviceSessionList').replaceChildren(...sessions.map(session => {
      const card = make('article', 'self-device-card');
      const symbol = make('span', 'self-device-icon');
      const icon = make('i', `bi ${session.deviceType === 'mobile' ? 'bi-phone' : session.deviceType === 'tablet' ? 'bi-tablet' : 'bi-laptop'}`); icon.setAttribute('aria-hidden', 'true'); symbol.append(icon);
      const content = make('div', 'self-device-content'), heading = make('div', 'self-device-heading');
      heading.append(make('h4', '', session.deviceName || 'Device'));
      if (session.isCurrent) heading.append(make('span', 'self-device-current', 'Current session'));
      if (preview) heading.append(make('span', 'self-device-preview-tag', 'Preview'));
      content.append(heading, make('p', 'self-device-browser', [session.browser, session.platform].filter(Boolean).join(' on ') || 'Device details unavailable'));
      const details = make('dl', 'self-device-details');
      [['Location', session.location || 'Not available'], ['Last activity', formatDate(session.lastActiveAt)], ['Signed in', formatDate(session.createdAt)]].forEach(([label, value]) => {
        const group = make('div', ''); group.append(make('dt', '', label), make('dd', '', value)); details.append(group);
      });
      content.append(details); card.append(symbol, content);
      if (!session.isCurrent) {
        const revoke = make('button', 'btn self-device-signout', 'Sign out'); revoke.type = 'button'; revoke.setAttribute('aria-label', `Sign out ${session.deviceName || session.browser || 'device'}`); revoke.addEventListener('click', () => ask(session)); card.append(revoke);
      } else card.append(make('span', 'self-device-this', 'This session stays open'));
      return card;
    }));
    $('deviceSessionCount').textContent = `${sessions.length} ${preview ? 'preview ' : ''}sessions - ${sessions.filter(session => !session.isCurrent).length} on other devices`;
    $('accountSessionSummary').textContent = preview ? 'Preview device activity and sign-out controls.' : `${sessions.length} active account sessions`;
    $('accountSessionBadge').textContent = preview ? 'Preview' : `${sessions.length} active`;
    $('devicePreviewNotice').hidden = !preview;
    $('deviceSessionsEmpty').hidden = sessions.length > 0;
    controls();
  }
  function loading() {
    const list = $('deviceSessionList');
    list.replaceChildren(...Array.from({ length: 2 }, () => {
      const skeleton = make('div', 'self-device-skeleton'); skeleton.setAttribute('aria-hidden', 'true');
      skeleton.append(make('span', ''), make('span', ''), make('span', '')); return skeleton;
    }));
    $('deviceSessionCount').textContent = 'Refreshing device sessions...';
    $('deviceSessionsEmpty').hidden = true; controls();
  }
  async function refresh(reset = false) {
    if (busy) return;
    busy = true; feedback(''); loading();
    try { if (reset && preview) provider.reset(); sessions = validateSessions(await provider.list()); }
    catch (error) { feedback(error.message || 'Sessions could not be refreshed.', true); }
    finally { busy = false; render(); }
  }
  $('refreshDeviceSessions').addEventListener('click', () => refresh());
  $('resetDevicePreview').addEventListener('click', () => refresh(true));
  $('revokeOtherDeviceSessions').addEventListener('click', () => { if (!busy && sessions.some(session => !session.isCurrent)) ask(); });
  dialog.addEventListener('close', () => { pending = null; });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  $('confirmDeviceSessionRevoke').addEventListener('click', async () => {
    if (!pending || busy) return;
    busy = true; controls();
    dialog.querySelectorAll('button').forEach(button => { button.disabled = true; });
    const operation = pending;
    try {
      if (operation.all) await provider.revokeOthers(); else await provider.revoke(operation.id);
      sessions = validateSessions(await provider.list());
      feedback(preview ? 'Preview updated. No real sessions were signed out.' : operation.all ? 'Other sessions were signed out.' : 'The device session was signed out.');
    } catch (error) { feedback(error.message || 'The session action could not be completed.', true); }
    finally {
      busy = false; dialog.querySelectorAll('button').forEach(button => { button.disabled = false; }); dialog.close(); render(); $('refreshDeviceSessions').focus();
    }
  });
  refresh();
  return { refresh };
}
if (typeof document !== 'undefined') {
  const init = () => {
    if(window.TMIS_SESSION?.source==='database'){
      const provider=createSessionApiProvider(async(path,body)=>{
        const result=await window.TmisStore.request('/profile/security/'+path,body,body===undefined?'GET':'POST');
        if(result.sessions)result.sessions=result.sessions.map(session=>({...session,...describeBrowser(session.userAgent)}));
        return result;
      });
      mountDeviceSessions({provider});
    } else mountDeviceSessions();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}
