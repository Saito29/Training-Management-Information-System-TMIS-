import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const context = {};
runInNewContext(readFileSync(new URL('../public/profile-mail.js', import.meta.url), 'utf8'), context);
const { sampleRecipients, recipientResults } = context;
test('samples and combined region, office and search filters', () => {
    const users = sampleRecipients();
    assert.equal(users.length, 60);
    assert.equal(new Set(users.map(user => user.id)).size, 60);
    const result = recipientResults(users, { region: 'Region V', office: 'Municipal Office', size: 'all' });
    assert.equal(result.rows.length, 4);
    assert.ok(result.rows.every(user => user.region === 'Region V' && user.office === 'Municipal Office'));
    assert.equal(recipientResults(users, { search: 'sample.user11@example.com' }).rows[0].id, 'SAMPLE-011');
});
test('row sizes, last page and empty ranges', () => {
    const users = sampleRecipients();
    for (const size of ['10', '20', '50', '100', '200', '500', '1000', 'all']) assert.equal(recipientResults(users, { size }).rows.length, size === 'all' ? 60 : Math.min(60, Number(size)));
    const last = recipientResults(users, { size: '50', page: 9 });
    assert.deepEqual([last.page, last.pages, last.start, last.end, last.rows.length], [2, 2, 51, 60, 10]);
    const empty = recipientResults(users, { search: 'no such person', page: 4 });
    assert.deepEqual([empty.page, empty.pages, empty.start, empty.end], [1, 1, 0, 0]);
});
test('role filters combine with region and office', () => {
    const users = sampleRecipients();
    const result = recipientResults(users, { role: 'Program Head', region: 'Region I', office: 'Municipal Office', size: 'all' });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].id, 'SAMPLE-011');
    assert.equal(recipientResults(users, { role: 'Unknown role' }).filtered.length, 0);
});
test('recipient modes resolve the same users represented by table selection', () => {
    const users = sampleRecipients();
    const { audienceRecipients } = context;
    const selected = new Set(['SAMPLE-001', 'SAMPLE-022']);
    assert.equal(audienceRecipients(users, 'users', '', selected).length, 2);
    assert.equal(audienceRecipients(users, 'all', '', selected).length, 60);
    const roleUsers = audienceRecipients(users, 'role', 'Data Encoder', selected);
    assert.equal(roleUsers.length, 15);
    assert.ok(roleUsers.every(user => user.role === 'Data Encoder'));
    assert.equal(audienceRecipients(users, 'role', '', selected).length, 0);
    const customized = new Set(roleUsers.map(user => user.id));
    customized.delete(roleUsers[0].id);
    assert.equal(audienceRecipients(users, 'users', '', customized).length, 14);
});
