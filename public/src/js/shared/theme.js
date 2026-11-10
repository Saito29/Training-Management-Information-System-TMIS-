(() => {
  const storageKey = 'tmis-theme-preference';
  const validPreferences = ['light', 'dark', 'auto'];
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'auto';

  try {
    const savedPreference = window.localStorage.getItem(storageKey);
    if (validPreferences.includes(savedPreference)) preference = savedPreference;
  } catch (error) {
    console.error('Unable to read the saved theme preference.', error);
  }

  const resolvedTheme = () =>
    preference === 'auto' ? (systemTheme.matches ? 'dark' : 'light') : preference;

  const controls = () => document.querySelectorAll('.theme-control');

  const updateTheme = () => {
    const theme = resolvedTheme();
    if (document.documentElement.dataset.theme !== theme) document.documentElement.dataset.theme = theme;
    if (document.documentElement.dataset.bsTheme !== theme) document.documentElement.dataset.bsTheme = theme;

    controls().forEach((control) => {
      const button = control.querySelector('.theme-toggle-button');
      const icon = button?.querySelector('i');
      if (!button || !icon) return;

      const iconClass = {
        light: 'bi-sun-fill',
        dark: 'bi-moon-stars-fill',
        auto: 'bi-circle-half',
      }[preference];
      const preferenceLabel =
        preference.charAt(0).toUpperCase() + preference.slice(1);
      button.setAttribute('aria-label', `Theme: ${preferenceLabel}`);
      button.title = `Theme: ${preferenceLabel}`;
      icon.className = `bi ${iconClass}`;

      control.querySelectorAll('[data-theme-choice]').forEach((choice) => {
        const selected = choice.dataset.themeChoice === preference;
        choice.classList.toggle('is-selected', selected);
        choice.setAttribute('aria-checked', String(selected));
        const check = choice.querySelector('.theme-choice-check');
        if (check) check.hidden = !selected;
      });
    });
  };

  const createThemeControl = () => {
    const control = document.createElement('div');
    control.className = 'dropdown theme-control';
    control.innerHTML = `
      <button class="btn theme-toggle-button dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Theme: Auto" title="Theme: Auto">
        <i class="bi bi-circle-half" aria-hidden="true"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end theme-menu" role="menu" aria-label="Choose color theme">
        <li><span class="theme-menu-heading">Appearance</span></li>
        <li><button class="dropdown-item" type="button" role="menuitemradio" data-theme-choice="light" aria-checked="false"><i class="bi bi-sun-fill" aria-hidden="true"></i><span>Light</span><i class="bi bi-check2 theme-choice-check" aria-hidden="true" hidden></i></button></li>
        <li><button class="dropdown-item" type="button" role="menuitemradio" data-theme-choice="dark" aria-checked="false"><i class="bi bi-moon-stars-fill" aria-hidden="true"></i><span>Dark</span><i class="bi bi-check2 theme-choice-check" aria-hidden="true" hidden></i></button></li>
        <li><button class="dropdown-item" type="button" role="menuitemradio" data-theme-choice="auto" aria-checked="true"><i class="bi bi-circle-half" aria-hidden="true"></i><span>Auto</span><i class="bi bi-check2 theme-choice-check" aria-hidden="true"></i></button></li>
      </ul>
    `;

    control.querySelectorAll('[data-theme-choice]').forEach((choice) => {
      choice.addEventListener('click', () => {
        preference = choice.dataset.themeChoice;
        try {
          window.localStorage.setItem(storageKey, preference);
        } catch (error) {
          console.error('Unable to save the theme preference.', error);
        }
        updateTheme();
      });
    });

    return control;
  };

  const addControls = () => {
    let added = false;
    document.querySelectorAll('.app-noti-profile').forEach((headerActions) => {
      if (headerActions.querySelector('.theme-control')) return;

      const notification = headerActions.querySelector('.app-notification');
      if (!notification) return;
      headerActions.insertBefore(createThemeControl(), notification.nextSibling);
      added = true;
    });
    if (added) updateTheme();
  };

  updateTheme();
  systemTheme.addEventListener('change', () => {
    if (preference === 'auto') updateTheme();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;
    preference = validPreferences.includes(event.newValue) ? event.newValue : 'auto';
    updateTheme();
  });

  document.addEventListener('DOMContentLoaded', () => {
    addControls();
    const observer = new MutationObserver(addControls);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
