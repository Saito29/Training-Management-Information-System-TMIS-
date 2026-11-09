(() => {
  const form = document.getElementById('email-verification-form');
  if (!form) return;
  const input = document.getElementById('verification-code');
  const error = document.getElementById('code-error');
  const resend = document.getElementById('resend-code');
  const expiresAt = Date.parse(form.dataset.expiresAt);
  const resendAt = Date.parse(form.dataset.resendAvailableAt);
  let expiryNotified = false;

  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 6);
    error.hidden = true;
  });

  const updateCountdown = () => {
    const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    document.getElementById('code-validity-countdown').textContent =
      String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    document.getElementById('code-validity').classList.toggle('is-expired', seconds === 0);
    if (seconds === 0 && !expiryNotified) {
      window.TmisToast.show('Your verification code has expired after 5 minutes. Request a new code.', 'warning');
      expiryNotified = true;
    }
    document.getElementById('verify-code-button').disabled = seconds === 0;
    const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
    resend.disabled = remaining > 0;
    document.getElementById('resend-countdown').textContent = remaining > 0
      ? 'Available in ' + remaining + ' seconds'
      : 'You can request another code.';
  };

  updateCountdown();
  let timer = window.setInterval(updateCountdown, 1000);
  window.addEventListener('pagehide', () => window.clearInterval(timer));
  window.addEventListener('pageshow', () => {
    updateCountdown();
    window.clearInterval(timer);
    timer = window.setInterval(updateCountdown, 1000);
  });
})();
