document.addEventListener('DOMContentLoaded', () => {
  const region = document.querySelector('select[name="region"]');
  const office = document.querySelector('select[name="office"], select[name="implementing_office"]');
  if (!region || !office) return;

  const registration = window.TMIS_PAGE?.registration;
  const regions = Array.isArray(registration?.regions) ? registration.regions : [];
  const offices = Array.isArray(registration?.offices) ? registration.offices : [];

  function optionFor(options, value, idKey, nameKey) {
    const requested = String(value ?? '').trim();
    if (!requested) return null;

    return options.find((option) =>
      String(option[idKey]) === requested
      || String(option[nameKey] ?? '').trim().toLowerCase() === requested.toLowerCase(),
    ) || null;
  }

  function replaceOptions(select, options, placeholder) {
    select.replaceChildren(new Option(placeholder, ''));
    for (const option of options) {
      select.add(new Option(option.name, String(option.id)));
    }
    select.value = '';
  }

  const normalizedRegions = regions.map((item) => ({
    id: item.region_id,
    name: item.name,
  }));
  const normalizedOffices = offices.map((item) => ({
    id: item.org_id,
    regionId: item.region_id,
    name: item.name,
  }));

  replaceOptions(region, normalizedRegions, normalizedRegions.length ? 'Select region' : 'No regions available in your registration scope');

  function syncOffice(preferredOffice = '') {
    const availableOffices = normalizedOffices.filter((item) => String(item.regionId) === region.value);
    replaceOptions(office, availableOffices, availableOffices.length ? 'Select office' : 'No offices available in your registration scope');
    const selectedOffice = optionFor(availableOffices, preferredOffice, 'id', 'name');
    if (selectedOffice) {
      office.value = String(selectedOffice.id);
    }
    office.disabled = availableOffices.length === 0;
  }

  function setLocation(regionValue, officeValue) {
    const selectedRegion = optionFor(normalizedRegions, regionValue, 'id', 'name');
    region.value = selectedRegion ? String(selectedRegion.id) : '';
    syncOffice(officeValue);
  }

  region.addEventListener('change', () => syncOffice());
  window.syncQuestionnaireOffice = syncOffice;
  window.setQuestionnaireLocation = setLocation;

  setLocation(registration?.regionId, registration?.officeId);

  if (!regions.length || !offices.length) {
    console.error('Questionnaire registration choices are unavailable for this account.');
  }
});
