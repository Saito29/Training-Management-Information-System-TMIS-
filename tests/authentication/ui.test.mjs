import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const authentication = readFileSync('resources/js/authentication/authentication.js', 'utf8');
const verification = readFileSync('resources/js/authentication/email-verification.js', 'utf8');

function element(value = '') {
  return {
    value, handlers: {}, dataset: {}, hidden: false, textContent: '', disabled: false,
    attributes: {}, classList: { values: new Set(), add(name) { this.values.add(name); }, toggle() {} },
    addEventListener(name, callback) { this.handlers[name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; }, removeAttribute() {}, focus() {}, reportValidity() { return true; },
  };
}

function context(elements, feedback = []) {
  const toasts = [];
  let tick;
  const window = {
    TmisToast: { show(message, type) { toasts.push({ message, type }); } },
    setTimeout(callback) { callback(); },
    setInterval(callback) { tick = callback; return 1; }, clearInterval() {}, addEventListener() {},
  };
  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelector() { return element(); },
    querySelectorAll(selector) {
      if (selector === '.authenticator-container form') return Object.entries(elements).filter(([id]) => id.endsWith('form')).map(([, value]) => value);
      if (selector === '[data-auth-toast]') return feedback;
      return [];
    },
  };
  return { globals: { window, document, Date }, toasts, tick: () => tick() };
}

test('server authentication messages appear as the requested toast type', () => {
  const feedback = [{ textContent: 'Unable to sign in.', dataset: { toastType: 'info' } }];
  const browser = context({}, feedback);
  vm.runInNewContext(authentication, browser.globals);
  assert.deepEqual(browser.toasts, [{ message: 'Unable to sign in.', type: 'info' }]);
});

test('blank required fields show an error toast and focus the field', () => {
  const form = element();
  const browser = context({ 'email-verification-form': form });
  vm.runInNewContext(authentication, browser.globals);
  let focused = false;
  form.handlers.invalid({ preventDefault() {}, target: { validationMessage: 'Enter the 6-digit verification code.', focus() { focused = true; } } });
  assert.equal(focused, true);
  assert.equal(browser.toasts[0].type, 'error');
});

test('valid reset passwords submit to the server; mismatched passwords show an error', () => {
  const form = element();
  const password = element('Strong-password-123!');
  const confirmation = element('Strong-password-123!');
  const browser = context({ 'reset-password-form': form, 'new-password': password, 'confirm-password': confirmation, 'reset-error': element() });
  vm.runInNewContext(authentication, browser.globals);
  let prevented = false;
  form.handlers.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(browser.toasts.length, 0);
  confirmation.value = 'Different-password-123!';
  form.handlers.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.match(browser.toasts[0].message, /don't match/);
});

test('expired verification code disables submission and warns only once', () => {
  const form = element();
  form.dataset = { expiresAt: '2020-01-01T00:00:00Z', resendAvailableAt: '2020-01-01T00:00:00Z' };
  const elements = { 'email-verification-form': form };
  for (const id of ['verification-code', 'code-error', 'resend-code', 'code-validity-countdown', 'code-validity', 'verify-code-button', 'resend-countdown']) elements[id] = element();
  const browser = context(elements);
  vm.runInNewContext(verification, browser.globals);
  browser.tick();
  assert.equal(elements['verify-code-button'].disabled, true);
  assert.equal(browser.toasts.length, 1);
  assert.equal(browser.toasts[0].type, 'warning');
  assert.match(browser.toasts[0].message, /5 minutes/);
});

test('verification button shows signing-in state during submission', () => {
  const form = element();
  form.dataset = { authenticator: 'false', expiresAt: '2099-01-01T00:00:00Z', resendAvailableAt: '2020-01-01T00:00:00Z' };
  const elements = {
    'email-verification-form': form,
    'verification-code': element(),
    'verify-code-button': element(),
    'verify-code-spinner': element(),
    'verify-code-label': element('Verify and sign in'),
    'verify-code-arrow': element(),
  };
  for (const id of ['code-error', 'resend-code', 'code-validity-countdown', 'code-validity', 'resend-countdown']) elements[id] = element();
  const browser = context(elements);
  vm.runInNewContext(verification, browser.globals);

  form.handlers.submit();

  assert.equal(elements['verify-code-button'].disabled, true);
  assert.equal(elements['verify-code-button'].attributes['aria-busy'], 'true');
  assert.equal(elements['verify-code-button'].classList.values.has('is-loading'), true);
  assert.equal(elements['verify-code-spinner'].hidden, false);
  assert.equal(elements['verify-code-label'].textContent, 'Signing in...');
  assert.equal(elements['verify-code-arrow'].hidden, true);
  browser.tick();
  assert.equal(elements['verify-code-button'].disabled, true);
});

test('complete email verification code submits automatically without clicking verify', () => {
  const form = element();
  form.dataset = { authenticator: 'false', expiresAt: '2099-01-01T00:00:00Z', resendAvailableAt: '2020-01-01T00:00:00Z' };
  form.requestSubmit = () => { form.requestedSubmissions++; };
  form.requestedSubmissions = 0;
  const input = element();
  const elements = { 'email-verification-form': form, 'verification-code': input };
  for (const id of ['code-error', 'resend-code', 'code-validity-countdown', 'code-validity', 'verify-code-button', 'resend-countdown']) elements[id] = element();
  const browser = context(elements);
  vm.runInNewContext(verification, browser.globals);

  input.value = '12345';
  input.handlers.input();
  assert.equal(form.requestedSubmissions, 0);
  input.value = '123456';
  input.handlers.input();

  assert.equal(form.requestedSubmissions, 1);
});

test('complete code autofilled before script initialization submits automatically', () => {
  const form = element();
  form.dataset = { authenticator: 'false', expiresAt: '2099-01-01T00:00:00Z', resendAvailableAt: '2020-01-01T00:00:00Z' };
  form.requestSubmit = () => { form.requestedSubmissions++; };
  form.requestedSubmissions = 0;
  const input = element('123456');
  const elements = { 'email-verification-form': form, 'verification-code': input };
  for (const id of ['code-error', 'resend-code', 'code-validity-countdown', 'code-validity', 'verify-code-button', 'resend-countdown']) elements[id] = element();

  vm.runInNewContext(verification, context(elements).globals);

  assert.equal(form.requestedSubmissions, 1);
});

test('complete authenticator and recovery codes submit automatically', () => {
  const form = element();
  form.dataset = { authenticator: 'true', expiresAt: '2099-01-01T00:00:00Z', resendAvailableAt: '2020-01-01T00:00:00Z' };
  form.requestSubmit = () => { form.requestedSubmissions++; };
  form.requestedSubmissions = 0;
  const input = element();
  const elements = { 'email-verification-form': form, 'verification-code': input };
  for (const id of ['code-error', 'resend-code', 'code-validity-countdown', 'code-validity', 'verify-code-button', 'resend-countdown']) elements[id] = element();
  const browser = context(elements);
  vm.runInNewContext(verification, browser.globals);

  input.value = '123456';
  input.handlers.input();
  input.value = '0123456789-abcdef0123';
  input.handlers.input();

  assert.equal(form.requestedSubmissions, 2);
});
