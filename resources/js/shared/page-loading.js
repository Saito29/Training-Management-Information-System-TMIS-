(() => {
  const root = document.documentElement;
  const finishLoading = () => {
    window.setTimeout(() => {
      root.dataset.pageLoading = 'exit';
      window.setTimeout(() => {
        delete root.dataset.pageLoading;
      }, 220);
    }, 360);
  };

  root.dataset.pageLoading = 'true';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', finishLoading, { once: true });
  } else {
    finishLoading();
  }
})();
