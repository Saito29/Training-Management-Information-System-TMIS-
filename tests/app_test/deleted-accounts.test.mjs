import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../public/src/js/administration/details/deleted-accounts.js', import.meta.url), 'utf8');

test('restore modal shows the selected account details and uses its restore endpoint', () => {
  class Element {
    constructor(dataset = {}) {
      this.dataset = dataset;
      this.children = [];
      this.events = {};
      this.textContent = '';
    }
    addEventListener(type, handler) { this.events[type] = handler; }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
  }
  class HTMLElement extends Element {}

  const modal = new Element();
  const form = new Element();
  const details = new Element();
  const elements = new Map([
    ['restoreAccountModal', modal],
    ['restoreAccountForm', form],
    ['restoreAccountDetails', details],
  ]);
  vm.runInNewContext(source, {
    document: {
      addEventListener: (_, handler) => handler(),
      getElementById: (id) => elements.get(id),
      createElement: () => new Element(),
    },
    HTMLElement,
  });

  const trigger = new HTMLElement({
    userId: '260001',
    name: '<Account Name>',
    email: 'account@example.test',
    role: 'Data Encoder',
    credential: 'Evaluator',
    region: 'Region IV-A',
    office: 'DA-SAAD',
    status: 'Approved & Accepted',
    deletedAt: 'Nov 13, 2026 1:00 PM',
    registeredAt: 'Nov 1, 2026 9:00 AM',
    restoreUrl: '/system/accounts/260001',
  });
  modal.events['show.bs.modal']({ relatedTarget: trigger });

  assert.equal(form.action, '/system/accounts/260001');
  assert.equal(details.children.length, 10);
  assert.equal(details.children[1].children[1].textContent, '<Account Name>');
});
