import { request, getSession } from '../shared/auth-client.js';
const $ = id => document.getElementById(id);
const form = $('authenticator_form');
const base = new URL('../../../', import.meta.url);
let busy = false, redirecting = false, importedProfile = null;
function message(text, error = false) { $('signInMessage').textContent = text; $('signInMessage').classList.toggle('is-error', error); }
function render(session) {
  if (!session) return;
  if (session.authenticated) { if (!redirecting) { redirecting = true; location.assign(new URL('app/admin/users/profile.html#security', base)); } return; }
  $('initialAccountSetup').hidden = !session.setupRequired;
  form.hidden = session.setupRequired || session.mfaRequired;
  $('signInVerification').hidden = !session.mfaRequired;
  if (session.setupRequired) message('Create the first local sign-in account. Use your registered work email to link your profile.');
  else if (session.mfaRequired) message('Enter your authenticator code or one unused recovery code.');
}
window.addEventListener('tmis:session', event => render(event.detail));
window.addEventListener('tmis:auth-unavailable', () => message('The account service is not running. Start npm run auth:serve and open http://127.0.0.1:3001/TMIS/app/authentication/login.html.', true));
render(getSession());
async function submit(event, path, data) {
  event.preventDefault(); if (busy) return;
  busy = true; const target = event.currentTarget; const button = target.querySelector('[type="submit"]'); button.disabled = true;
  try { const session = await request(path, data()); target.reset(); message(''); render(session); }
  catch (error) { message(error.message, true); }
  finally { button.disabled = false; busy = false; }
}
form.addEventListener('submit', event => submit(event, 'login', () => ({ email: $('email-input').value, password: $('password_input').value })));
$('signInVerification').addEventListener('submit', event => submit(event, 'login/verify', () => ({ code: $('signInCode').value.trim() })));
$('initialAccountSetup').addEventListener('submit', event => submit(event, 'setup', () => {
  if ($('setupPassword').value !== $('setupConfirm').value) throw new Error('The passwords do not match.');
  const email = $('setupEmail').value.trim().toLowerCase();
  let existing = importedProfile && String(importedProfile.email).toLowerCase() === email ? importedProfile : {};
  try {
    const users = JSON.parse(localStorage.getItem('tmis-users') || '[]');
    if (Array.isArray(users)) existing = users.find(user => String(user?.email || '').toLowerCase() === email) || existing;
  } catch { /* An existing browser profile is optional. */ }
  return { ...Object.fromEntries(['id','middleName','suffix','dateOfBirth','phone','region','office','position','createdAt','updatedAt'].map(key => [key, existing[key] || ''])), firstName: $('setupFirstName').value.trim(), lastName: $('setupLastName').value.trim(), email, password: $('setupPassword').value };
}));
$('restartSignIn').addEventListener('click', async () => { try { await request('logout', {}); location.reload(); } catch (error) { message(error.message, true); } });

$('setupProfileImport').addEventListener('change', async event => {
  try {
    importedProfile = null;
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 16384) throw new Error('Choose a single-user profile transfer smaller than 16 KB.');
    const record = JSON.parse(await file.text());
    if (!record || Array.isArray(record) || typeof record.email !== 'string' || typeof record.firstName !== 'string' || typeof record.lastName !== 'string') throw new Error('Choose the profile JSON downloaded using Transfer profile.');
    importedProfile = record;
    $('setupFirstName').value = record.firstName; $('setupLastName').value = record.lastName; $('setupEmail').value = record.email;
    message('Profile details imported. Choose a new sign-in password to continue.');
  } catch (error) { event.target.value = ''; message(error.message, true); }
});
