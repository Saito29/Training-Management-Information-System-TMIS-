document.querySelectorAll(".authenticator-container form").forEach((form) => {

  let isShowingValidation = false;
  form.addEventListener("invalid", (event) => {
    event.preventDefault();
    if (isShowingValidation) {
      return;
    }
    isShowingValidation = true;
    window.TmisToast.show(event.target.validationMessage, "error");
    event.target.focus();
    window.setTimeout(() => {
      isShowingValidation = false;
    }, 0);
  }, true);
});

document.querySelectorAll("[data-password-target]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const password = document.getElementById(toggle.dataset.passwordTarget);
    if (!password) {
      return;
    }
    const isVisible = password.type === "password";
    password.type = isVisible ? "text" : "password";
    const label = toggle.getAttribute("aria-label").replace(/^(Show|Hide)/, "");
    toggle.setAttribute("aria-label", (isVisible ? "Hide" : "Show") + label);
    toggle.setAttribute("aria-pressed", String(isVisible));
    toggle.textContent = isVisible ? "Hide" : "Show";
  });
});

const resetForm = document.getElementById("reset-password-form");
if (resetForm) {
  const password = document.getElementById("new-password");
  const confirmation = document.getElementById("confirm-password");
  const error = document.getElementById("reset-error");
  const checks = {
    length: (value) => value.length >= 8,
    case: (value) => /[A-Z]/.test(value) && /[a-z]/.test(value),
    number: (value) => /[0-9]/.test(value),
    special: (value) => /[^A-Za-z0-9\s]/.test(value),
  };

  const updateRequirements = () => {
    Object.entries(checks).forEach(([name, check]) => {
      const requirement = document.querySelector('[data-reset-rule="' + name + '"]');
      requirement.classList.toggle("is-valid", check(password.value));
    });
    error.hidden = true;
    password.removeAttribute("aria-invalid");
    confirmation.removeAttribute("aria-invalid");
  };

  password.addEventListener("input", updateRequirements);
  confirmation.addEventListener("input", updateRequirements);
  resetForm.addEventListener("submit", (event) => {
    if (!resetForm.reportValidity()) {
      event.preventDefault();
      return;
    }
    const meetsRequirements = Object.values(checks).every((check) => check(password.value));
    const matches = password.value === confirmation.value;
    if (!meetsRequirements || !matches) {
      event.preventDefault();
      error.textContent = !meetsRequirements
        ? "Your new password must meet all the requirements above."
        : "Your passwords don't match. Re-enter the same password.";
      error.hidden = false;
      window.TmisToast.show(error.textContent, "error");
      const field = !meetsRequirements ? password : confirmation;
      field.setAttribute("aria-invalid", "true");
      field.focus();
      return;
    }

  });
}



document.querySelectorAll('[data-auth-toast]').forEach((message) => {
  window.TmisToast.show(message.textContent.trim(), message.dataset.toastType);
});
