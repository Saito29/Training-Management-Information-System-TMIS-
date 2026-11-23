(() => {
  const fallbackBranding = {
    name: 'TMIS',
    logoUrl: `${window.location.origin}/assets/logo/DA%20Logo/DA%20logo_120519.png`,
    faviconUrl: `${window.location.origin}/assets/logo/DA%20Logo/DA%20logo_120519.png`,
    faviconMimeType: 'image/png',
    dashboardImageUrl: `${window.location.origin}/assets/img/ricefield_with_farmer-Picsart-AiImageEnhancer.png`,
  };
  let savedBranding = { ...fallbackBranding, ...(window.TMIS_BRANDING || {}) };
  let appliedName = 'TMIS';
  let brandingChannel = null;

  const applyBranding = (branding, persist = false) => {
    if (!branding || typeof branding !== 'object') {
      return;
    }

    const currentBranding = { ...savedBranding, ...branding };
    if (persist) {
      savedBranding = currentBranding;
    }
    const name = typeof currentBranding.name === 'string' && currentBranding.name.trim()
      ? currentBranding.name.trim()
      : 'TMIS';

    document.querySelectorAll('.app-logo img, .offcanvas-brand img, .brand img.brand-mark, .brand img.mark, .mobile-brand img.brand-mark').forEach(image => {
      image.src = currentBranding.logoUrl;
      image.alt = `${name} logo`;
    });
    document.querySelectorAll('.app-name, .text-logo-name, .brand strong, .brand span > strong').forEach(element => {
      element.textContent = name;
    });
    document.querySelectorAll('.mobile-brand strong').forEach(element => {
      const label = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
      if (label) {
        label.nodeValue = `${name} `;
      }
    });

    document.querySelectorAll('[data-dashboard-welcome-image]').forEach(element => {
      element.style.setProperty('--dashboard-welcome-image', `url("${currentBranding.dashboardImageUrl}")`);
    });

    const favicon = document.getElementById('tmis-favicon');
    if (favicon) {
      favicon.href = currentBranding.faviconUrl;
      favicon.type = currentBranding.faviconMimeType || 'image/png';
    }

    document.title = document.title.replaceAll(appliedName, name);
    appliedName = name;
    window.TMIS_BRANDING = { ...currentBranding, name };
  };

  try {
    brandingChannel = new BroadcastChannel('tmis-system-branding');
    brandingChannel.addEventListener('message', event => applyBranding(event.data, true));
  } catch {
    brandingChannel = null;
  }

  window.addEventListener('storage', event => {
    if (event.key !== 'tmis-system-branding-update' || !event.newValue) {
      return;
    }

    try {
      applyBranding(JSON.parse(event.newValue), true);
    } catch {
      // Ignore corrupt cross-tab cache events and keep this tab's last valid branding.
    }
  });

  const initialize = () => {
    applyBranding(savedBranding);
    const form = document.querySelector('[data-branding-form]');
    if (!form) {
      return;
    }

    const nameInput = form.elements.namedItem('system_name');
    const status = form.querySelector('[data-branding-status-text]');
    const submit = form.querySelector('button[type="submit"]');
    const draftUrls = new Map();
    const uploadFields = [
      { id: 'systemLogo', key: 'logoUrl', label: 'logo' },
      { id: 'systemFavicon', key: 'faviconUrl', label: 'favicon' },
      { id: 'dashboardImage', key: 'dashboardImageUrl', label: 'dashboard picture' },
    ];
    let busy = false;

    const displayStatus = message => {
      if (status) {
        status.textContent = message;
      }
    };

    const revokeDraftUrls = () => {
      for (const url of draftUrls.values()) {
        URL.revokeObjectURL(url);
      }
      draftUrls.clear();
    };

    const currentDraft = () => {
      const branding = { ...savedBranding };
      const name = String(nameInput?.value || '').trim();
      if (name) {
        branding.name = name;
      }
      for (const field of uploadFields) {
        const url = draftUrls.get(field.id);
        if (url) {
          branding[field.key] = url;
          if (field.id === 'systemFavicon') {
            branding.faviconMimeType = form.elements.namedItem(field.id)?.files?.[0]?.type || 'image/png';
          }
        }
      }
      return branding;
    };

    const resetSavedPreviews = () => {
      revokeDraftUrls();
      for (const field of uploadFields) {
        const input = form.elements.namedItem(field.id);
        const preview = form.querySelector(`[data-branding-preview="${field.id}"]`);
        const selectedFile = form.querySelector(`[data-branding-selected-file="${field.id}"]`);
        if (input) {
          input.value = '';
        }
        if (preview) {
          preview.src = savedBranding[field.key];
          if (field.id === 'systemLogo') {
            preview.alt = `Current ${savedBranding.name} logo`;
          }
        }
        if (selectedFile) {
          selectedFile.textContent = field.id === 'dashboardImage'
            ? 'No new picture selected. The current picture will be kept.'
            : `No ${field.label} selected. The current ${field.label} will be kept.`;
        }
      }
      if (nameInput) {
        nameInput.value = savedBranding.name;
      }
      applyBranding(savedBranding);
    };

    for (const field of uploadFields) {
      const input = form.elements.namedItem(field.id);
      if (!input) {
        continue;
      }

      input.addEventListener('change', () => {
        const file = input.files?.[0];
        const preview = form.querySelector(`[data-branding-preview="${field.id}"]`);
        const selectedFile = form.querySelector(`[data-branding-selected-file="${field.id}"]`);
        const priorUrl = draftUrls.get(field.id);
        if (priorUrl) {
          URL.revokeObjectURL(priorUrl);
          draftUrls.delete(field.id);
        }
        if (!file) {
          applyBranding(currentDraft());
          return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type) || file.size > 20 * 1024 * 1024) {
          input.value = '';
          if (selectedFile) {
            selectedFile.textContent = 'Choose a JPG, PNG, or WebP image up to 20 MB.';
          }
          window.TmisToast?.show('Choose a JPG, PNG, or WebP image up to 20 MB.', 'error');
          applyBranding(currentDraft());
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        draftUrls.set(field.id, previewUrl);
        if (preview) {
          preview.src = previewUrl;
          if (field.id === 'systemLogo') {
            preview.alt = `Preview of ${savedBranding.name} logo`;
          }
        }
        if (selectedFile) {
          selectedFile.textContent = `${file.name} selected. Save branding to apply it.`;
        }
        applyBranding(currentDraft());
        displayStatus(`${file.name} preview is ready. Save branding to apply it.`);
      });
    }

    nameInput?.addEventListener('input', () => applyBranding(currentDraft()));

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) {
        return;
      }

      busy = true;
      if (submit) {
        submit.disabled = true;
      }
      displayStatus('Saving branding and uploading selected images…');

      try {
        const response = await fetch(form.action, {
          method: form.method || 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: new FormData(form),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const validationMessage = Object.values(result.errors || {}).flat()[0];
          throw new Error(validationMessage || result.message || 'Branding changes could not be saved.');
        }
        if (!result.branding) {
          throw new Error('Branding was saved, but the updated logo and favicon details were not returned. Refresh the page to load them.');
        }

        savedBranding = { ...savedBranding, ...result.branding };
        resetSavedPreviews();
        displayStatus(result.message || 'Branding settings saved and applied.');
        window.TmisToast?.show(result.message || 'Branding settings saved and applied.', 'success');
        brandingChannel?.postMessage(savedBranding);
        try {
          localStorage.setItem('tmis-system-branding-update', JSON.stringify({ ...savedBranding, updatedAt: Date.now() }));
        } catch {
          // BroadcastChannel still updates open tabs when local storage is unavailable.
        }
      } catch (error) {
        applyBranding(savedBranding);
        displayStatus(error.message || 'Branding changes could not be saved.');
        window.TmisToast?.show(error.message || 'Branding changes could not be saved.', 'error');
      } finally {
        busy = false;
        if (submit) {
          submit.disabled = false;
        }
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
