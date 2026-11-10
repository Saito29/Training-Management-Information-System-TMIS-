// Render the supported formatting as DOM nodes; message HTML is always text.
export function renderMessage(target, message) {
  const fragment = document.createDocumentFragment();
  let list = null;
  function inline(parent, text) {
    for (const part of text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g)) {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2); parent.append(strong);
      } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        const em = document.createElement('em');
        em.textContent = part.slice(1, -1); parent.append(em);
      } else parent.append(document.createTextNode(part));
    }
  }
  const lines = String(message || '').split('\n');
  lines.forEach((line, index) => {
    const match = line.match(/^\s*(?:(-)|\d+\.)\s+(.*)$/);
    if (match) {
      const tag = match[1] ? 'UL' : 'OL';
      if (!list || list.tagName !== tag) {
        list = document.createElement(tag.toLowerCase()); fragment.append(list);
      }
      const item = document.createElement('li'); inline(item, match[2]); list.append(item);
    } else {
      list = null; inline(fragment, line);
      if (index < lines.length - 1) fragment.append(document.createElement('br'));
    }
  });
  target.replaceChildren(fragment);
}

export function setupMessageEditor(field) {
  const toolbar = field.previousElementSibling;
  if (!toolbar?.matches('.compose-editor-toolbar')) return;
  let history = [field.value], cursor = 0;
  const remember = () => {
    if (history[cursor] === field.value) return;
    history = history.slice(0, cursor + 1); history.push(field.value); cursor++;
  };
  field.addEventListener('focus', remember);
  field.addEventListener('input', remember);
  toolbar.addEventListener('mousedown', event => event.preventDefault());
  function format(command) {
    remember();
    if (command === 'undo' || command === 'redo') {
      cursor = Math.max(0, Math.min(history.length - 1, cursor + (command === 'undo' ? -1 : 1)));
      field.value = history[cursor];
    } else {
      let start = field.selectionStart, end = field.selectionEnd;
      let replacement, selectionStart, selectionEnd;
      if (command === 'bold' || command === 'italic') {
        const marker = command === 'bold' ? '**' : '*';
        const text = field.value.slice(start, end) || 'text';
        replacement = marker + text + marker;
        selectionStart = start + marker.length; selectionEnd = selectionStart + text.length;
      } else {
        start = field.value.lastIndexOf('\n', start - 1) + 1;
        const next = field.value.indexOf('\n', end);
        end = next < 0 ? field.value.length : next;
        replacement = field.value.slice(start, end).split('\n').map((line, i) =>
          (command === 'bullet' ? '- ' : `${i + 1}. `) + line.replace(/^\s*(?:- |\d+\. )/, '')).join('\n');
        selectionStart = start; selectionEnd = start + replacement.length;
      }
      if (field.value.length - (end - start) + replacement.length > field.maxLength) return;
      field.setRangeText(replacement, start, end, 'end');
      field.setSelectionRange(selectionStart, selectionEnd);
    }
    field.focus(); field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  toolbar.addEventListener('click', event => {
    const button = event.target.closest('[data-message-format]');
    if (button) format(button.dataset.messageFormat);
  });
  field.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const command = { b: 'bold', i: 'italic', z: event.shiftKey ? 'redo' : 'undo', y: 'redo' }[event.key.toLowerCase()];
    if (command) { event.preventDefault(); format(command); }
  });
  field.form.addEventListener('reset', () => { history = ['']; cursor = 0; });
}
