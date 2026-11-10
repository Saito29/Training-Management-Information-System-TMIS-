(() => {
  const form = document.getElementById('email-verification-form');
  if (!form) return;
  const input = document.getElementById('verification-code');
  const error = document.getElementById('code-error');
  const resend = document.getElementById('resend-code');
  const verifyButton = document.getElementById('verify-code-button');
  const submitSpinner = document.getElementById('verify-code-spinner');
  const submitLabel = document.getElementById('verify-code-label');
  const submitArrow = document.getElementById('verify-code-arrow');
  const expiresAt = Date.parse(form.dataset.expiresAt);
  const resendAt = Date.parse(form.dataset.resendAvailableAt);
  let expiryNotified = false;
  let submitting = false;

  const submitCompleteCode = () => {
    input.value = form.dataset.authenticator==='true'?input.value.replace(/[^a-fA-F0-9-]/g,'').slice(0,21):input.value.replace(/[^0-9]/g, '').slice(0, 6);
    error.hidden = true;
    const isCompleteCode = form.dataset.authenticator === 'true'
      ? /^(?:[0-9]{6}|[a-fA-F0-9]{10}-[a-fA-F0-9]{10})$/.test(input.value)
      : /^[0-9]{6}$/.test(input.value);
    if (isCompleteCode && !submitting && Date.now() < expiresAt) form.requestSubmit();
  };

  input.addEventListener('input', submitCompleteCode);

  form.addEventListener('submit', () => {
    submitting = true;
    verifyButton.disabled = true;
    verifyButton.setAttribute('aria-busy', 'true');
    verifyButton.classList.add('is-loading');
    submitSpinner.hidden = false;
    submitLabel.textContent = 'Signing in...';
    submitArrow.hidden = true;
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
    verifyButton.disabled = submitting || seconds === 0;
    const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
    resend.disabled = remaining > 0;
    document.getElementById('resend-countdown').textContent = remaining > 0
      ? 'Available in ' + remaining + ' seconds'
      : 'You can request another code.';
  };

  updateCountdown();
  submitCompleteCode();
  let timer = window.setInterval(updateCountdown, 1000);
  window.addEventListener('pagehide', () => window.clearInterval(timer));
  window.addEventListener('pageshow', () => {
    updateCountdown();
    window.clearInterval(timer);
    timer = window.setInterval(updateCountdown, 1000);
  });
})();
