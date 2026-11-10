document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-account-filters]');
  const results = document.querySelector('[data-account-results]');

  if (!form || !results) {
    return;
  }

  let activeRequest;

  const showError = (message) => {
    results.querySelector('[data-account-load-error]')?.remove();

    const alert = document.createElement('div');
    alert.className = 'alert alert-danger account-load-error';
    alert.setAttribute('role', 'alert');
    alert.dataset.accountLoadError = '';
    alert.textContent = message;
    results.prepend(alert);
  };

  const loadResults = async (url, updateHistory = true) => {
    activeRequest?.abort();
    const request = new AbortController();
    activeRequest = request;
    results.setAttribute('aria-busy', 'true');
    results.querySelector('[data-account-load-error]')?.remove();

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json, text/html',
          'X-Account-Table': '1',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: request.signal,
      });

      if (!response.ok) {
        let message = 'Unable to load account results. Check the filters and try again.';
        if (response.headers.get('content-type')?.includes('application/json')) {
          const payload = await response.json();
          message = Object.values(payload.errors || {}).flat().join(' ') || payload.message || message;
        }
        throw new Error(message);
      }

      const markup = await response.text();
      if (!markup.trim() || /<!doctype|<html[\s>]/i.test(markup)) {
        throw new Error('The account results could not be refreshed. Please try again.');
      }

      results.innerHTML = markup;
      if (updateHistory) {
        window.history.pushState({}, '', url);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        showError(error.message);
      }
    } finally {
      if (activeRequest === request) {
        activeRequest = null;
        results.setAttribute('aria-busy', 'false');
      }
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const url = new URL(form.action, window.location.href);
    const parameters = new URLSearchParams(new FormData(form));
    parameters.delete('accounts_page');
    url.search = parameters.toString();
    loadResults(url);
  });

  form.querySelector('[data-account-clear]')?.addEventListener('click', (event) => {
    form.reset();

    const url = new URL(event.currentTarget.dataset.accountClearUrl, window.location.href);
    loadResults(url);
  });

  results.addEventListener('click', (event) => {
    const link = event.target.closest('[data-account-pagination] a[href]');
    if (!link || link.getAttribute('aria-disabled') === 'true' || link.classList.contains('disabled')) {
      return;
    }

    event.preventDefault();
    loadResults(new URL(link.href, window.location.href));
  });

  window.addEventListener('popstate', () => {
    loadResults(new URL(window.location.href), false);
  });
});
