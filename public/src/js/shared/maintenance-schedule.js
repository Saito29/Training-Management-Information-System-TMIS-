document.addEventListener('DOMContentLoaded', () => {
  const enabled = document.getElementById('maintenanceEnabled');
  const until = document.getElementById('maintenanceUntil');
  const feedback = document.getElementById('maintenanceScheduleFeedback');
  const form = enabled?.closest('form');
  if (!form || !enabled || !until || !feedback || !enabled.checked) return;

  const expiresAt = Date.parse(until.dataset.maintenanceUntilUtc || '');
  if (Number.isNaN(expiresAt)) return;

  let timer;
  const checkSchedule = () => {
    if (!enabled.checked) return;
    const remaining = expiresAt - Date.now();
    if (remaining > 0) {
      timer = window.setTimeout(checkSchedule, Math.min(remaining, 60_000));
      return;
    }

    enabled.checked = false;
    until.value = '';
    feedback.className = 'alert alert-info mt-3';
    feedback.textContent = 'The scheduled return time has passed. Turning maintenance mode off...';
    feedback.hidden = false;

    const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
    fetch(form.action, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-CSRF-TOKEN': token,
      },
      body: new URLSearchParams(new FormData(form)),
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Maintenance could not be turned off automatically.');
        until.dataset.maintenanceUntilUtc = '';
        feedback.className = 'alert alert-success mt-3';
        feedback.textContent = 'The scheduled maintenance window ended. Maintenance mode is now off.';
      })
      .catch(error => {
        feedback.className = 'alert alert-danger mt-3';
        feedback.textContent = error.message;
      });
  };

  enabled.addEventListener('change', () => {
    if (!enabled.checked) window.clearTimeout(timer);
  });
  checkSchedule();
});
