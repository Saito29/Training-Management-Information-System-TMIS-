import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../backend/server.mjs';
import { base32, totp, verifyTotp, encrypt, decrypt, hashPassword, verifyPassword, recoveryHash } from '../backend/services/security.mjs';

const password = 'Example-Password1!';
async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tmis-auth-test-')); let clock = Date.now();
  const server = createApp({ dataDir: dir, origin: 'http://127.0.0.1:0', now: () => clock });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true, force: true }); });
  const address = `http://127.0.0.1:${server.address().port}`;
  function client() {
    let cookie = '', csrf = '';
    async function send(path, body, extra = {}) {
      const response = await fetch(`${address}/TMIS/api/auth/${path}`, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual', headers: { Cookie: cookie, ...(body === undefined ? {} : { Origin: address, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const data = await response.json(); if (data.csrf) csrf = data.csrf;
      return { status: response.status, data, headers: response.headers };
    }
    return { send, cookie: () => cookie };
  }
  const one = client(); await one.send('session');
  return { ...one, client, dir, now: () => clock, advance: ms => { clock += ms; }, address };
}
async function setup(f) {
  const result = await f.send('setup', { firstName: 'Test', lastName: 'Administrator', email: 'test@example.com', password, id: 'TEST-ADMIN' });
  assert.equal(result.status, 200); assert.equal(result.data.authenticated, true); return result;
}
async function enroll(f) {
  const result = await f.send('mfa/setup', { password }); assert.equal(result.status, 200);
  const secret = result.data.secret; assert.match(result.data.qr, /^data:image\/png;base64,/);
  const code = totp(secret, Math.floor(f.now() / 30000));
  const enabled = await f.send('mfa/enable', { code }); assert.equal(enabled.status, 200);
  assert.equal(enabled.data.recoveryCodes.length, 10);
  return { secret, code, codes: enabled.data.recoveryCodes };
}

test('TOTP matches RFC 6238 SHA-1 vectors and rejects invalid/replayed codes', () => {
  const secret = base32(Buffer.from('12345678901234567890'));
  for (const [time, expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']]) assert.equal(totp(secret, Math.floor(time / 30), 8), expected);
  const step = 123456, code = totp(secret, step);
  assert.equal(verifyTotp(secret, code, -1, step * 30000), step);
  assert.equal(verifyTotp(secret, code, step, step * 30000), null);
  assert.equal(verifyTotp(secret, '123', -1, step * 30000), null);
});
test('password hashing and authenticated encryption keep secrets out of plaintext', async () => {
  const hash = await hashPassword(password); assert.equal(await verifyPassword(password, hash), true); assert.equal(await verifyPassword('wrong', hash), false); assert.ok(!hash.includes(password));
  const key = Buffer.alloc(32, 7), encrypted = encrypt('secret', key); assert.equal(decrypt(encrypted, key), 'secret'); assert.throws(() => decrypt(encrypted, Buffer.alloc(32, 8)));
});
test('bootstrap, origin/CSRF checks, and protected routes enforce server sessions', async t => {
  const f = await fixture(t);
  const blocked = await fetch(`${f.address}/TMIS/app/admin/users/profile.html`, { redirect: 'manual' }); assert.equal(blocked.status, 302);
  assert.equal((await f.send('setup', {}, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await f.send('setup', {}, { 'X-CSRF-Token': 'invalid' })).status, 403);
  const session = await setup(f); assert.ok(!JSON.stringify(session.data).includes(password));
  assert.equal((await f.send('setup', {})).status, 403);
  assert.equal((await f.send('security')).data.enabled, false);
  const hidden = await fetch(`${f.address}/TMIS/backend/.data/auth.sqlite`); assert.equal(hidden.status, 404);
});
test('enrollment requires verification, stores encrypted secrets, and login requires an unused factor', async t => {
  const f = await fixture(t); await setup(f);
  assert.equal((await f.send('mfa/enable', { code: '000000' })).status, 400);
  const { secret, code, codes } = await enroll(f);
  const db = new DatabaseSync(join(f.dir, 'auth.sqlite'));
  const stored = db.prepare('SELECT mfa_secret,recovery FROM users').get();
  assert.ok(!stored.mfa_secret.includes(secret)); assert.ok(!stored.recovery.includes(codes[0])); assert.ok(JSON.parse(stored.recovery).includes(recoveryHash(codes[0]))); db.close();
  assert.equal((await f.send('security')).data.enabled, true);
  await f.send('logout', {}); await f.send('session');
  const login = await f.send('login', { email: 'test@example.com', password }); assert.equal(login.data.mfaRequired, true); assert.equal(login.data.authenticated, false);
  assert.equal((await f.send('security')).status, 401);
  assert.equal((await f.send('login/verify', { code })).status, 400);
  f.advance(31000);
  const verified = await f.send('login/verify', { code: totp(secret, Math.floor(f.now() / 30000)) }); assert.equal(verified.status, 200); assert.equal(verified.data.authenticated, true);
  const logs = (await f.send('logs')).data.logs; assert.ok(logs.some(log => log.title === 'Two-step verification enabled')); assert.ok(!JSON.stringify(logs).includes(secret));
});
test('recovery codes are single-use; disable requires password and factor', async t => {
  const f = await fixture(t); await setup(f); const { codes } = await enroll(f);
  await f.send('logout', {}); await f.send('session'); await f.send('login', { email: 'test@example.com', password });
  assert.equal((await f.send('login/verify', { code: codes[0] })).data.authenticated, true);
  await f.send('logout', {}); await f.send('session'); await f.send('login', { email: 'test@example.com', password });
  assert.equal((await f.send('login/verify', { code: codes[0] })).status, 400);
  assert.equal((await f.send('login/verify', { code: codes[1] })).data.authenticated, true);
  assert.equal((await f.send('mfa/disable', { password: 'wrong', code: codes[2] })).status, 400);
  assert.equal((await f.send('mfa/disable', { password, code: codes[2] })).status, 200);
  assert.equal((await f.send('security')).data.enabled, false);
});
test('expired setup and excessive factor guesses fail without enabling MFA', async t => {
  const f = await fixture(t); await setup(f);
  const pending = await f.send('mfa/setup', { password }); f.advance(601000);
  assert.equal((await f.send('mfa/enable', { code: totp(pending.data.secret, Math.floor(f.now() / 30000)) })).status, 400);
  for (let i = 0; i < 4; i++) assert.equal((await f.send('mfa/enable', { code: 'invalid' })).status, 400);
  assert.equal((await f.send('mfa/enable', { code: 'invalid' })).status, 429);
  assert.equal((await f.send('security')).data.enabled, false);
});
test('password changes preserve MFA and invalidate other signed-in sessions', async t => {
  const f = await fixture(t); await setup(f);
  const other = f.client(); await other.send('session'); await other.send('login', { email: 'test@example.com', password });
  const changed = await f.send('password', { password: 'Updated-Password2!' }); assert.equal(changed.status, 200);
  assert.equal((await other.send('security')).status, 401);
  f.advance(301000); assert.equal((await f.send('password', { password })).status, 403);
});
