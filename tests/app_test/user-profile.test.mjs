import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../../public/src/js/administration/id/view-user.js', import.meta.url), 'utf8');
function profile(search = '?id=USR-1', storedStatus = 'Pending approval', pathname = '/app/admin/administration/id/view-user') {
  class Element {
    constructor() { this.children = []; this.events = {}; this.dataset = {}; this.hidden = false; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute() {}
    addEventListener(type, handler) { this.events[type] = handler; }
    click() { return this.events.click?.(); }
  }
  const elements = new Map(), get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  let data = JSON.stringify([{ id: 'USR-1', firstName: 'Ana', middleName: 'Cruz', lastName: 'Reyes', suffix: 'Jr.', dateOfBirth: '1990-04-12', email: 'ana@example.com', phone: '09171234567', role: 'Data Encoder', region: 'Region IV-A', office: 'DA-SAAD', position: 'Encoder', status: storedStatus, createdAt: '2026-10-01T01:00:00Z', updatedAt: '2026-10-02T02:00:00Z' }, { id: 'OTHER' }]);
  let now = 1000, tick;
  const events = {};
  vm.runInNewContext(source, { document: { getElementById: get, querySelector: () => null, createElement: () => new Element(), addEventListener: (_, handler) => handler() },
    bootstrap: { Modal: { getOrCreateInstance: () => ({ show() {}, hide() {} }) }, Toast: { getOrCreateInstance: () => ({ show() {} }) } },
    window: { TmisStore: { can: () => true, getItem: () => data, setItem: (_, value) => { data = value; } }, addEventListener: (type, fn) => { events[type] = fn; } },
    location: { search, pathname }, URLSearchParams, Intl, Date: class extends Date { static now() { return now; } },
    setInterval: fn => { tick = fn; return 1; }, clearInterval() {} });
  return { get, records: () => JSON.parse(data), advance: async () => { now += 10001; await tick(); } };
}
test('profile displays registration fields, metadata, badge and edit destination', () => {
  const p = profile();
  assert.equal(p.get('profileName').textContent, 'Ana Cruz Reyes Jr.');
  assert.equal(p.get('profileUserId').textContent, 'USR-1');
  assert.equal(p.get('profileStatus').textContent, 'For approval');
  assert.equal(p.get('profileRole').textContent, 'Data Encoder');
  assert.notEqual(p.get('profileRegistered').textContent, p.get('profileUpdated').textContent);
  assert.equal(p.get('profilePersonal').children.length, 7);
  assert.equal(p.get('profileAccess').children.length, 4);
  assert.equal(p.get('editUserProfile').href, '/app/admin/administration/id/edit/USR-1');
});
test('path-based view URL reads the profile identifier', () => {
  const p = profile('', 'Pending approval', '/app/admin/administration/id/view/USR-1');
  assert.equal(p.get('profileUserId').textContent, 'USR-1');
});
test('missing ID and missing user show an unavailable state', () => {
  for (const query of ['', '?id=MISSING']) {
    const p = profile(query);
    assert.equal(p.get('userProfileContent').hidden, true);
    assert.equal(p.get('profileUnavailable').hidden, false);
  }
});
test('deletion keeps the record until the deadline; undo cancels removal', async () => {
  const p = profile('?id=USR-1', 'Approved');
  assert.equal(p.get('profileStatus').textContent, 'Approved & Accepted');
  p.get('deleteUserProfile').click(); await p.get('confirmUserDelete').click();
  assert.equal(p.records().length, 2);
  p.get('undoUserDelete').click(); assert.equal(p.records().length, 2);
  p.get('deleteUserProfile').click(); await p.get('confirmUserDelete').click(); await p.advance();
  assert.equal(p.records().length, 1);
  assert.equal(p.records()[0].id, 'OTHER');
  assert.equal(p.get('profileUnavailable').hidden, false);
});
