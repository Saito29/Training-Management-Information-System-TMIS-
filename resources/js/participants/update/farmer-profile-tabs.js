document.addEventListener('DOMContentLoaded', () => {
  const tabs = [...document.querySelectorAll('.profile-tabs [role="tab"]')];

  const activateTab = (tab, moveFocus = false) => {
    tabs.forEach((item) => {
      const isActive = item === tab;
      const panel = document.getElementById(item.getAttribute('aria-controls'));

      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', String(isActive));
      item.tabIndex = isActive ? 0 : -1;
      item.closest('.profile-tab')?.classList.toggle('is-current', isActive);

      if (panel) {
        panel.classList.toggle('d-none', !isActive);
        panel.hidden = !isActive;
      }
    });

    if (moveFocus) tab.focus();
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      activateTab(tab);
    });

    tab.addEventListener('keydown', (event) => {
      const currentIndex = tabs.indexOf(tab);
      let nextIndex;

      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === 'ArrowLeft')
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      activateTab(tabs[nextIndex], true);
    });
  });

  const initialTab =
    tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
  if (initialTab) activateTab(initialTab);

  const trainingTrack = document.getElementById('overviewTrainingTrack');
  const trainingCarousel = document.getElementById('overviewTrainingCarousel');
  const trainingCount = document.getElementById('overviewTrainingCount');
  const trainingPrevious = document.getElementById('overviewTrainingPrevious');
  const trainingNext = document.getElementById('overviewTrainingNext');

  if (
    trainingTrack &&
    trainingCarousel &&
    trainingCount &&
    trainingPrevious &&
    trainingNext
  ) {
    const trainingCards = [...trainingTrack.children];
    trainingCards.forEach((card, index) => {
      card.hidden = index >= 10;
    });
    const visibleCards = trainingCards.slice(0, 10);
    const getVisibleCount = () => {
      const card = visibleCards[0];
      if (!card) return 1;
      const cardWidth = card.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(trainingTrack).columnGap) || 0;
      return Math.max(
        1,
        Math.round(
          (trainingCarousel.clientWidth + gap + 0.01) / (cardWidth + gap)
        )
      );
    };
    const updateTrainingControls = () => {
      const visibleCount = getVisibleCount();
      const start = Math.min(
        visibleCards.length,
        Math.round(trainingCarousel.scrollLeft / trainingCarousel.clientWidth) *
          visibleCount
      );
      const end = Math.min(start + visibleCount, visibleCards.length);
      trainingCount.textContent = visibleCards.length
        ? `${start + 1}–${end} of ${visibleCards.length}`
        : '0 trainings';
      trainingPrevious.disabled = trainingCarousel.scrollLeft <= 1;
      trainingNext.disabled =
        trainingCarousel.scrollLeft + trainingCarousel.clientWidth >=
        trainingCarousel.scrollWidth - 1;
    };

    trainingPrevious.addEventListener('click', () => {
      trainingCarousel.scrollBy({
        left: -trainingCarousel.clientWidth,
        behavior: 'smooth',
      });
    });
    trainingNext.addEventListener('click', () => {
      trainingCarousel.scrollBy({
        left: trainingCarousel.clientWidth,
        behavior: 'smooth',
      });
    });
    trainingCarousel.addEventListener('scroll', updateTrainingControls, {
      passive: true,
    });
    window.addEventListener('resize', updateTrainingControls);
    window.addEventListener('load', updateTrainingControls, { once: true });
    if ('ResizeObserver' in window) {
      new ResizeObserver(updateTrainingControls).observe(trainingCarousel);
    }
    requestAnimationFrame(updateTrainingControls);
    updateTrainingControls();
  }

  document.querySelectorAll('[data-view-all-trainings]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      tabs.find((tab) => tab.getAttribute('aria-controls') === 'trainings-info')?.click();
    });
  });

});
