document.addEventListener('DOMContentLoaded', () => {
  const toggles = [...document.querySelectorAll('[data-notification-email-type-toggle]')];
  if (toggles.length === 0) return;

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const toast = (message, type) => window.TmisToast?.show(message, type);

  toggles.forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const requestedValue = toggle.checked;
      toggle.disabled = true;

      try {
        const response = await fetch(toggle.dataset.url, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          body: JSON.stringify({ enabled: requestedValue }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.message || 'The notification email setting could not be saved.');
        }

        toggle.checked = result.enabled === true;
        toast(result.message || 'Notification email setting updated.', 'success');
      } catch (error) {
        toggle.checked = !requestedValue;
        toast(error.message || 'The notification email setting could not be saved.', 'error');
      } finally {
        toggle.disabled = false;
      }
    });
  });
});
