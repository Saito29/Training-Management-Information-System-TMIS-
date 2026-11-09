document.addEventListener('DOMContentLoaded', () => {
  const branding = window.TMIS_BRANDING;
  if (!branding) {
    return;
  }

  document.querySelectorAll('.app-logo img, .offcanvas-brand img').forEach(image => {
    image.src = branding.logoUrl;
    image.alt = `${branding.name} logo`;
  });
  document.querySelectorAll('.app-name').forEach(name => {
    name.textContent = branding.name;
  });
  document.querySelectorAll('.text-logo-name').forEach(name => {
    name.textContent = branding.name;
  });

  const favicon = document.getElementById('tmis-favicon');
  if (favicon) {
    favicon.href = branding.faviconUrl;
  }

  document.title = document.title.replace(/TMIS/g, branding.name);
});
