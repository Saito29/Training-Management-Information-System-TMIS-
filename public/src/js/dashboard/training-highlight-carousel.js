document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.getElementById('communityFeedbackCarousel');
  if (!carousel) {
    return;
  }

  const makeText = (tagName, value, className = '') => {
    const element = document.createElement(tagName);
    element.textContent = value || '';
    if (className) {
      element.className = className;
    }

    return element;
  };
  const isActiveTraining = (training) => training.is_active !== false
    && String(training.status || '').trim().toLowerCase() !== 'inactive';
  const trainings = (window.TmisStore?.records('tmis-trainings') || [])
    .filter(isActiveTraining)
    .sort((first, second) => String(second.updatedAt || '').localeCompare(String(first.updatedAt || '')));
  const slides = trainings.flatMap((training) => {
    const hasDashboardChoice = training.dashboardSlide !== undefined
      && training.dashboardSlide !== null
      && training.dashboardSlide !== '';
    const selectedSlide = hasDashboardChoice ? Number(training.dashboardSlide) : 0;
    if (!Number.isInteger(selectedSlide) || selectedSlide < 0) {
      return [];
    }

    return Object.entries(training.highlights || {})
      .filter(([index, item]) => Number(index) === selectedSlide
        && Boolean(item.heading || item.description || item.quote || item.image))
      .map(([index, item]) => ({ training, index, item }));
  });

  window.bootstrap?.Carousel.getInstance(carousel)?.dispose();
  const inner = carousel.querySelector('.carousel-inner');
  const indicators = carousel.querySelector('.carousel-indicators');
  inner.replaceChildren();
  indicators?.replaceChildren();

  if (slides.length === 0) {
    const article = document.createElement('article');
    article.className = 'carousel-item active dashboard-highlight-empty';
    const body = document.createElement('div');
    const icon = document.createElement('i');
    icon.className = 'bi bi-images';
    icon.setAttribute('aria-hidden', 'true');
    body.append(icon, makeText('h3', 'No highlights to show'), makeText('p', 'Selected training highlights and ways forward will appear here.'));
    article.append(body);
    inner.append(article);
    for (const control of carousel.querySelectorAll('.carousel-control-prev, .carousel-control-next, .carousel-indicators')) {
      control.hidden = true;
    }

    return;
  }

  slides.forEach(({ training, index, item }, offset) => {
    const article = document.createElement('article');
    article.className = `carousel-item dashboard-training-highlight${offset === 0 ? ' active' : ''}`;
    article.style.minHeight = '360px';
    if (item.image) {
      const image = document.createElement('img');
      image.className = 'community-feedback-image';
      image.src = item.image;
      image.alt = training.title || 'Training highlight';
      article.append(image);
    } else {
      article.classList.add('dashboard-highlight-text');
    }

    const overlay = document.createElement('div');
    overlay.className = 'community-feedback-overlay';
    const topline = document.createElement('div');
    topline.className = 'community-feedback-topline';
    topline.append(makeText('span', Number(index) === 0 ? 'Key Highlights' : 'Ways Forward', 'community-feedback-label'));

    const copy = document.createElement('div');
    copy.className = 'community-feedback-copy';
    copy.append(makeText('h3', item.heading || training.title), makeText('p', item.description));
    if (item.quote) {
      copy.append(makeText('blockquote', item.quote, 'community-feedback-quote'));
    }

    const caption = document.createElement('div');
    caption.className = 'community-feedback-caption';
    caption.append(makeText('h5', item.trainingTitle || training.title));
    overlay.append(topline, copy, caption);
    article.append(overlay);
    inner.append(article);

    if (indicators) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.bsTarget = '#communityFeedbackCarousel';
      button.dataset.bsSlideTo = String(offset);
      button.setAttribute('aria-label', `Show highlight ${offset + 1}`);
      if (offset === 0) {
        button.className = 'active';
        button.setAttribute('aria-current', 'true');
      }
      indicators.append(button);
    }
  });

  for (const control of carousel.querySelectorAll('.carousel-control-prev, .carousel-control-next, .carousel-indicators')) {
    control.hidden = slides.length < 2;
  }
  if (slides.length > 1 && window.bootstrap) {
    new window.bootstrap.Carousel(carousel, { interval: 6000, ride: false });
  }
});
