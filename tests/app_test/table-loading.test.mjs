import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/js/shared/table-loading.js', import.meta.url), 'utf8');
function fixture() {
  const listeners = {}, tasks = new Map();
  let taskId = 0;
  class Element {
    constructor(tag = 'div') {
      this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.textContent = '';
      this.classList = { add() {}, remove() {} }; this.style = { setProperty() {} };
    }
    append(...nodes) { nodes.forEach(node => { node.parentElement = this; this.children.push(node); }); }
    before() {}
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this); }
    get rows() { return this.children; }
    get cells() { return this.children; }
    get tBodies() { return this.children.filter(node => node.tag === 'tbody'); }
    getAttribute(key) { return this.attrs[key] ?? null; }
    setAttribute(key, value) { this.attrs[key] = value; }
    removeAttribute(key) { delete this.attrs[key]; }
    getClientRects() { return [1]; }
    querySelectorAll() { return tables; }
    closest() { return this; }
  }
  const createTable = () => {
    const table = new Element('table'), body = new Element('tbody'), row = new Element('tr');
    row.append(new Element('td')); body.append(row); table.append(body);
    const headings = ['Actions', 'Status', 'Name'].map(text => { const cell = new Element('th'); cell.textContent = text; cell.colSpan = 1; return cell; });
    headings[1].hidden = true;
    table.tHead = { rows: [{ cells: headings }] };
    return { table, body, row };
  };
  const first = createTable(), second = createTable();
  const tables = [first.table, second.table], scope = new Element(), button = new Element('button');
  button.id = 'refreshTable'; button.parentElement = scope;
  const document = { body: new Element('body'), readyState: 'loading', createElement: tag => new Element(tag),
    querySelectorAll: () => tables, addEventListener: (type, fn) => { listeners[type] = fn; } };
  vm.runInNewContext(source, { document, WeakMap, WeakSet, performance: { now: () => 0 },
    getComputedStyle: () => ({ display: 'table-cell' }),
    MutationObserver: class { observe() {} disconnect() {} }, requestAnimationFrame: fn => fn(),
    setTimeout: (fn, delay) => { tasks.set(++taskId, { fn, delay }); return taskId; }, clearTimeout: id => tasks.delete(id) });
  const flush = () => { const current = [...tasks.values()]; tasks.clear(); current.forEach(task => task.fn()); };
  return { first, second, button, listeners, tasks, flush };
}

test('page load adds skeletons, respects hidden columns, and preserves real rows', () => {
  const f = fixture(); f.listeners.DOMContentLoaded(); f.flush();
  assert.equal(f.first.table.tBodies.length, 2);
  const skeleton = f.first.table.tBodies[1];
  assert.equal(skeleton.rows.length, 4);
  assert.equal(skeleton.rows[0].cells[1].hidden, true);
  assert.equal(f.first.table.getAttribute('aria-busy'), 'true');
  f.flush();
  assert.equal(f.first.table.tBodies.length, 1);
  assert.equal(f.first.body.rows[0], f.first.row);
  assert.equal(f.first.table.getAttribute('aria-busy'), null);
});

test('one refresh can load multiple tables and restores the button busy state', () => {
  const f = fixture();
  const click = { target: f.button, preventDefault() {}, stopImmediatePropagation() {} };
  f.listeners.click(click);
  assert.equal(f.button.getAttribute('aria-busy'), 'true');
  assert.equal(f.first.table.tBodies.length, 2);
  assert.equal(f.second.table.tBodies.length, 2);
  let stopped = false;
  f.listeners.click({ ...click, stopImmediatePropagation() { stopped = true; } });
  assert.equal(stopped, true);
  // Simulate an existing page renderer updating data while the placeholder is shown.
  const updated = { tag: 'tr' }; f.first.body.children = [updated];
  f.flush();
  assert.equal(f.first.body.rows[0], updated);
  assert.equal(f.button.getAttribute('aria-busy'), null);
  assert.equal(f.second.table.getAttribute('aria-busy'), null);
});
