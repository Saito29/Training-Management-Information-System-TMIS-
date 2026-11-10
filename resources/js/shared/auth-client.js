// Same-origin authentication client. Only non-secret profile data is mirrored
// for compatibility with the existing browser-backed administration tables.
const apiRoot = new URL('../../../api/auth/', import.meta.url);
let session = null;
export async function request(path, body) {
  if(window.TMIS_SESSION?.source==='database'){
    const endpoint=path==='security'?'/profile/security':'/profile/security/'+path.replace(/^mfa\//,'');
    const response=await fetch(endpoint,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]').content},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(Object.values(data.errors||{}).flat()[0]||data.message||'The account service is unavailable.');
    return data;
  }

  if (body !== undefined && !session?.csrf) await refreshSession();
  const response = await fetch(new URL(path.replace(/^\//, ''), apiRoot), {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || 'The account service is unavailable.'); error.status = response.status; error.code = data.code; throw error; }
  if (data.csrf) { session = data; publishSession(); }
  return data;
}
function publishSession() {
  if (window.TMIS_SESSION?.source === 'database') return;
  if (session?.authenticated) {
    window.TMIS_SESSION = { userId: session.user.id, user: session.user };
    try {
      sessionStorage.setItem('tmis-current-user-id', session.user.id);
      const saved = JSON.parse(localStorage.getItem('tmis-users') || '[]');
      if (Array.isArray(saved)) {
        const index = saved.findIndex(user => user?.id === session.user.id);
        const record = { ...(index >= 0 ? saved[index] : {}), ...session.user };
        if (index >= 0) saved[index] = record; else saved.push(record);
        localStorage.setItem('tmis-users', JSON.stringify(saved));
      }
    } catch { /* Authentication works even if optional prototype storage is unavailable. */ }
    const name = [session.user.firstName, session.user.middleName, session.user.lastName, session.user.suffix].filter(Boolean).join(' ');
    document.querySelectorAll('.profile-name, .mobile-user-name-role .user-name').forEach(element => { element.textContent = name; });
    document.querySelectorAll('.profile-role, .mobile-user-name-role .user-role').forEach(element => { element.textContent = session.user.role; });
  } else {
    window.TMIS_SESSION = null;
    try { sessionStorage.removeItem('tmis-current-user-id'); } catch { /* No browser session storage. */ }
  }
  window.dispatchEvent(new CustomEvent('tmis:session', { detail: session }));
}
export async function refreshSession() {
  if (window.TMIS_SESSION?.source === 'database') return {authenticated:true,user:window.TMIS_SESSION.user};
  return request('session');
}
export const getSession = () => window.TMIS_SESSION?.source==='database'?{authenticated:true,user:window.TMIS_SESSION.user}:session;
window.TmisAuth = { request, refreshSession, getSession };
window.dispatchEvent(new Event('tmis:auth-ready'));
refreshSession().catch(() => { window.dispatchEvent(new Event('tmis:auth-unavailable')); });
document.addEventListener('click', async event => {
  const link = event.target.closest('.sign-out-item');
  if (window.TMIS_SESSION?.source==='database'||!link || !session?.authenticated) return;
  event.preventDefault();
  try { await request('logout', {}); window.TMIS_SESSION = null; sessionStorage.removeItem('tmis-current-user-id'); location.assign(new URL('../../../', import.meta.url)); }
  catch { window.alert('Sign-out could not be completed. Please try again.'); }
});
