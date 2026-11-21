(() => {
  const loginUrl = document.querySelector('meta[name="tmis-login-url"]')?.content;
  if (!loginUrl || window.fetch.__tmisSessionExpiryHandler) return;

  const destination = new URL(loginUrl, window.location.origin);
  const originalFetch = window.fetch.bind(window);
  let redirecting = false;

  const authenticatedFetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.redirected && !redirecting) {
      try {
        const finalUrl = new URL(response.url, window.location.href);
        if (finalUrl.origin === window.location.origin
          && finalUrl.pathname === destination.pathname
          && window.location.pathname !== destination.pathname) {
          redirecting = true;
          window.location.replace(destination.href);
        }
      } catch {
        // Ignore malformed response URLs; callers still receive the response.
      }
    }

    return response;
  };

  authenticatedFetch.__tmisSessionExpiryHandler = true;
  window.fetch = authenticatedFetch;
})();
