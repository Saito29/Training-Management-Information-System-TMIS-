(() => {
  if (window.TmisToast) return;
  const lifetimes = new WeakMap();
  function stack() {
    let region = document.getElementById('composeToastStack');
    if (!region) {
      region = document.createElement('div');
      region.id = 'composeToastStack';
      region.className = 'compose-toast-stack';
      region.setAttribute('aria-label', 'Notification messages');
      document.body.append(region);
    }
    return region;
  }
  function lifetime(toast, onDismiss, persistent = false) {
    lifetimes.get(toast)?.cleanup();
    let timer, started = 0, remaining = 3000, closing = false;
    const pause = () => {
      clearTimeout(timer);
      if (started) remaining = Math.max(0, remaining - (performance.now() - started));
      started = 0;
      toast.classList.add('is-paused');
    };
    const dismiss = () => {
      if (closing) return;
      closing = true;
      pause();
      toast.classList.add('is-leaving');
      timer = setTimeout(() => { cleanup(); onDismiss(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250);
    };
    const resume = () => {
      if (persistent || closing || toast.matches(':hover') || toast.contains(document.activeElement)) return;
      clearTimeout(timer);
      started = performance.now();
      toast.classList.remove('is-paused');
      timer = setTimeout(dismiss, remaining);
    };
    const close = event => {
      if (event.target.closest('[data-toast-close], [data-bs-dismiss="toast"], .btn-close, .attachment-toast-close')) {
        event.preventDefault(); event.stopPropagation(); dismiss();
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      toast.removeEventListener('pointerenter', pause);
      toast.removeEventListener('pointerleave', resume);
      toast.removeEventListener('focusin', pause);
      toast.removeEventListener('focusout', resume);
      toast.removeEventListener('click', close);
    };
    toast.classList.remove('is-leaving', 'is-paused');
    toast.classList.toggle('is-persistent', persistent);
    toast.classList.add('is-resetting');
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = '';
    toast.classList.remove('is-resetting');
    toast.addEventListener('pointerenter', pause);
    toast.addEventListener('pointerleave', resume);
    toast.addEventListener('focusin', pause);
    toast.addEventListener('focusout', resume);
    toast.addEventListener('click', close);
    lifetimes.set(toast, { dismiss, cleanup });
    resume();
    return dismiss;
  }
  function show(message, type = 'success') {
    if (!message) return;
    const titles = { success: 'Success', warning: 'Warning', error: 'Error' };
    if (!titles[type]) type = 'success';
    const toast = document.createElement('div');
    toast.className = 'compose-toast'; toast.dataset.type = type;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-atomic', 'true');
    const icon = document.createElement('i');
    icon.className = 'bi ' + {success:'bi-check-circle-fill',warning:'bi-exclamation-triangle-fill',error:'bi-x-circle-fill'}[type];
    icon.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div'), title = document.createElement('strong'), body = document.createElement('p');
    title.textContent = titles[type]; body.textContent = message; content.append(title, body);
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = '\u00d7'; close.dataset.toastClose = '';
    close.setAttribute('aria-label', 'Dismiss ' + type + ' notification');
    toast.append(icon, content, close);
    const region = stack();
    const existing = region.querySelectorAll('.compose-toast');
    if (existing.length >= 3) { lifetimes.get(existing[0])?.cleanup(); existing[0].remove(); }
    region.append(toast);
    const dismiss = lifetime(toast, () => toast.remove());
    return { element: toast, dismiss };
  }
  function legacyType(toast) {
    const signals = [toast.dataset.type, toast.className, toast.querySelector('.toast-header i')?.className || ''].join(' ').toLowerCase();
    if (/error|danger|exclamation-circle|x-circle/.test(signals)) return 'error';
    if (/warn|blocked|exclamation-triangle/.test(signals)) return 'warning';
    return 'success';
  }
  // Keep original elements, IDs, actions and Bootstrap lifecycle events intact.
  document.addEventListener('show.bs.toast', event => {
    const toast = event.target;
    if (!toast.matches?.('.toast') || event.defaultPrevented) return;
    event.preventDefault();
    toast.dataset.toastKind = legacyType(toast);
    toast.setAttribute('role', toast.dataset.toastKind === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', toast.dataset.toastKind === 'error' ? 'assertive' : 'polite');
    toast.classList.add('app-legacy-toast', 'show');
    toast.classList.remove('hide', 'showing');
    stack().append(toast);
    lifetime(toast, () => {
      toast.classList.remove('show', 'showing', 'is-leaving');
      toast.dispatchEvent(new Event('hidden.bs.toast', { bubbles: true }));
    }, toast.id === 'rpUndoToast' || toast.dataset.bsAutohide === 'false');
    toast.dispatchEvent(new Event('shown.bs.toast', { bubbles: true }));
  });
  document.addEventListener('hide.bs.toast', event => {
    if (!event.target.classList?.contains('app-legacy-toast')) return;
    event.preventDefault(); lifetimes.get(event.target)?.dismiss();
  });
  window.TmisToast = { show };
})();
