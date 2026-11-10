import { request, getSession, refreshSession } from '../shared/auth-client.js';
const $ = id => document.getElementById(id);
let state = null, recoveryCodes = [], busy = false, expiryTimer;
const panels = ['mfaSignedOut','mfaSetupForm','mfaVerifyForm','mfaRecoveryPanel','mfaManageForm'];
function feedback(message, error = false) { if(error)window.TmisToast?.show(message,'error'); $('mfaFeedback').textContent = message; $('mfaFeedback').classList.toggle('is-error', error); }
function show(panel) { panels.forEach(id => { $(id).hidden = id !== panel; }); }
function clearSetup() {
  clearTimeout(expiryTimer); $('mfaQr').removeAttribute('src'); $('mfaManualKey').value = ''; $('mfaVerifyCode').value = ''; $('mfaSetupPassword').value = '';
}
function displayState() {
  if (!state) { show('mfaSignedOut'); $('mfaBadge').textContent = 'Not connected'; return; }
  $('mfaSummary').textContent = state.enabled ? 'Authenticator verification is required when you sign in.' : 'Authenticator is disabled. '+(state.emailVerificationEnabled?'Email verification remains enabled.':'You can enable an authenticator app below.');
  $('mfaBadge').textContent = state.enabled ? 'Enabled' : 'Not enabled';
  $('mfaRecoveryRemaining').textContent = `${state.recoveryRemaining} unused recovery codes remain. Replacing them invalidates all previous codes.`;
  $('passwordVerificationField').hidden = !state.enabled;
  $('passwordFormHelp').textContent = state.passwordChangeAvailable ? 'Choose a new password. Your other sign-in sessions will be signed out after saving.' : 'Sign in again to change your password. Password updates require a recent sign-in.';
  // Session inventory is rendered by profile-sessions.js.
  // $('accountSessionSummary').textContent = `Your current signed-in session expires ${new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(state.sessionExpiresAt))}. Sign-in events appear in Logs.`;
  // Session inventory is rendered by profile-sessions.js.
  // $('accountSessionBadge').textContent = 'Signed in';
  updatePasswordButton();
  if (recoveryCodes.length) show('mfaRecoveryPanel'); else show(state.enabled ? 'mfaManageForm' : 'mfaSetupForm');
}
function updatePasswordButton() {
  const password = $('password-new').value;
  const valid = password.length >= 8 && password.length <= 128 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^\p{L}\p{N}\s]/u.test(password);
  $('saveAccountPassword').disabled = !state?.passwordChangeAvailable || !valid || password !== $('password-confirm').value || busy;
  $('saveAccountPassword').title = state?.passwordChangeAvailable ? 'Save your new password' : 'A recent server sign-in is required';
}
async function refresh() {
  if (!getSession()?.authenticated) { state = null; show('mfaSignedOut'); updatePasswordButton(); return; }
  try {
    state = await request('security'); displayState();
    const result = await request('logs');
    const user = getSession().user;
    const actor = [user.firstName,user.middleName,user.lastName,user.suffix].filter(Boolean).join(' ');
    window.dispatchEvent(new CustomEvent('tmis:security-logs', { detail: result.logs.map(log => ({ ...log, detail: 'Recorded by the account service.', actor, reference: user.id, source: 'account', status: 'Recorded' })) }));
    feedback(state.enabled ? 'Two-step verification is enabled for this account.' : 'Start setup to link an authenticator app. Verification is enabled only after a valid code.');
  } catch (error) { feedback(error.message, true); }
}
async function action(event, handler) {
  event?.preventDefault(); if (busy) return;
  busy = true; const target = event?.currentTarget;
  const buttons = target ? [...target.querySelectorAll('button')] : [];
  buttons.forEach(button => { button.disabled = true; }); updatePasswordButton();
  try { await handler(); } catch (error) { feedback(error.message, true); $('passwordFormStatus').textContent = error.message; }
  finally { busy = false; buttons.forEach(button => { button.disabled = false; }); updatePasswordButton(); }
}
function showCodes(codes) {
  recoveryCodes = codes;
  $('mfaRecoveryCodes').replaceChildren(...codes.map(code => { const item = document.createElement('li'); item.textContent = code; return item; }));
  show('mfaRecoveryPanel');
}
function init() {
  $('mfaSetupForm').addEventListener('submit', event => action(event, async () => {
    const password = $('mfaSetupPassword').value; $('mfaSetupPassword').value = '';
    const result = await request('mfa/setup', { current_password:password });
    $('mfaQr').hidden=true; $('mfaManualKey').value = result.secret; show('mfaVerifyForm');
    feedback('In your authenticator app, add a time-based account using this setup key, then verify a current code.');
    clearTimeout(expiryTimer); expiryTimer = setTimeout(() => { clearSetup(); show('mfaSetupForm'); feedback('Setup expired. Start again to generate a new key.', true); }, Math.max(0, Date.parse(result.expiresAt) - Date.now()));
  }));
  $('mfaVerifyForm').addEventListener('submit', event => action(event, async () => {
    const result = await request('mfa/enable', { code: $('mfaVerifyCode').value.trim() });
    clearSetup(); showCodes(result.recoveryCodes); await refresh(); feedback('Verification is enabled. Save your recovery codes before continuing.');
  }));
  $('mfaCancelSetup').addEventListener('click', event => action(event, async () => { await request('mfa/cancel', {}); clearSetup(); displayState(); feedback('Authenticator setup cancelled.'); }));
  $('mfaManageForm').addEventListener('submit', event => {
    const operation = event.submitter?.value;
    return action(event, async () => {
      if (!['disable','recovery'].includes(operation)) return;
      if (!window.confirm(operation === 'disable' ? 'Disable two-step verification for this account?' : 'Replace all existing recovery codes?')) return;
      const password = $('mfaManagePassword').value, code = $('mfaManageCode').value.trim(); $('mfaManagePassword').value = $('mfaManageCode').value = '';
      const result = await request(`mfa/${operation}`, { current_password:password, code });
      if (result.recoveryCodes) showCodes(result.recoveryCodes);
      await refresh(); feedback(operation === 'disable' ? 'Authenticator disabled. Email verification settings are unchanged.' : 'Recovery codes replaced. Save the new codes.');
    });
  });
  $('mfaDownloadCodes').addEventListener('click', () => {
    if (!recoveryCodes.length) return;
    const url = URL.createObjectURL(new Blob([`TMIS recovery codes\nEach code can be used once. Keep these private.\n\n${recoveryCodes.join('\n')}\n`], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = 'tmis-recovery-codes.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('mfaAcknowledgeCodes').addEventListener('click', () => { recoveryCodes = []; $('mfaRecoveryCodes').replaceChildren(); displayState(); });
  ['password-new','password-confirm'].forEach(id => $(id).addEventListener('input', updatePasswordButton));
  $('passwordChangeForm').addEventListener('submit', event => action(event, async () => {
    if (!state?.passwordChangeAvailable) throw new Error('Sign in again before updating your password.');
    if ($('password-new').value !== $('password-confirm').value) throw new Error('The passwords do not match.');
    await request('password', { current_password: $('password-current').value, password: $('password-new').value, password_confirmation:$('password-confirm').value, code: $('passwordVerificationCode').value.trim() });
    $('passwordChangeForm').reset(); $('password-new').dispatchEvent(new Event('input')); $('password-confirm').dispatchEvent(new Event('input'));
    $('passwordFormStatus').textContent = 'Your password was updated. Other sessions have been signed out.';
    await refresh();
  }));
  $('refreshMyProfile').addEventListener('click', refresh);
  window.addEventListener('tmis:session', () => { clearSetup(); refresh(); });
  window.addEventListener('pagehide', () => { clearSetup(); recoveryCodes = []; $('mfaRecoveryCodes').replaceChildren(); $('mfaManagePassword').value = $('mfaManageCode').value = ''; });
  refresh();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
