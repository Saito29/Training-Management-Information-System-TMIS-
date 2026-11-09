document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('highlights-panel');
  if (!panel) return;
  const slides = [...panel.querySelectorAll('.training-highlight-carousel .carousel-item')];
  if (!slides.length) return;
  const initial = slides.map(slide => ({
    image: slide.querySelector('img').getAttribute('src'),
    heading: slide.querySelector('h3').textContent.trim(),
    description: slide.querySelector('.training-highlight-copy p').textContent.trim(),
    quote: slide.querySelector('.training-highlight-quote').textContent.trim().replace(/^[“"]|[”"]$/g, ''),
    trainingTitle: 'Good Agricultural Practices (GAP) · Training recap',
    titleSize: 18,
    headingSize: 38,
    bodySize: 14,
    quoteSize: 20,
    bold: false,
    italic: false,
    branding: 'office',
    officeName: 'Agricultural Training Division (ATD)',
    officeSize: 14,
    logoSize: 80,
    imageBlob: null,
    logoBlob: null
  }));
  const state = initial.map((item,index) => ({...item,...(window.TmisStore?.selected('tmis-trainings')?.highlights?.[index]||{})}));
  const urls = slides.map(() => ({image:null, logo:null}));
  let selected = 0;
  let draftImage = null;
  let draftLogo = null;
  let previewImageUrl = null;
  let previewLogoUrl = null;

  const actions = panel.querySelector('.training-highlight-header-actions');
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'training-highlight-export training-highlight-edit';
  editButton.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i> Edit highlight';
  actions.prepend(editButton);

  const modalElement = document.createElement('div');
  modalElement.className = 'modal fade training-export-modal training-highlight-edit-modal';
  modalElement.tabIndex = -1;
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable"><div class="modal-content"><form id="highlightEditForm"><div class="modal-header"><div><span class="training-export-eyebrow">Edit training recap</span><h2 class="modal-title">Edit highlight / way forward</h2><p>Adjust the picture and copy while watching the preview.</p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body training-export-layout"><div class="training-export-preview-area"><div class="training-export-preview" id="highlightEditPreview"><img id="highlightEditPreviewImage" alt="Highlight preview"><div class="training-export-preview-overlay"><span id="highlightEditPreviewLabel"></span><div class="highlight-edit-preview-copy"><h3 id="highlightEditPreviewHeading"></h3><p id="highlightEditPreviewDescription"></p><blockquote id="highlightEditPreviewQuote"></blockquote></div><div class="highlight-edit-preview-footer"><strong id="highlightEditPreviewTrainingTitle"></strong><span id="highlightEditPreviewBrand"></span></div></div></div><span class="training-export-preview-caption">Live preview of this slide</span></div><div class="training-export-settings"><div class="training-export-section"><label class="training-export-label" for="highlightEditSlide">Slide</label><select id="highlightEditSlide" class="form-select"><option value="0">Key highlight</option><option value="1">Way forward</option></select></div><div class="training-export-section"><label class="training-export-label" for="highlightEditImage">Picture</label><input id="highlightEditImage" class="form-control" type="file" accept="image/png,image/jpeg"><p>Choose a JPG or PNG to replace the slide picture.</p></div><div class="training-export-section"><label class="training-export-label" for="highlightEditHeading">Slide heading</label><input id="highlightEditHeading" class="form-control" maxlength="100" required></div><div class="training-export-section"><label class="training-export-label" for="highlightEditDescription">Body content</label><textarea id="highlightEditDescription" class="form-control" rows="2" maxlength="300" required></textarea></div><div class="training-export-section"><label class="training-export-label" for="highlightEditQuote">Quote</label><textarea id="highlightEditQuote" class="form-control" rows="3" maxlength="300" placeholder="Enter a quote"></textarea></div><div class="training-export-section"><label class="training-export-label" for="highlightEditTrainingTitle">Training title</label><input id="highlightEditTrainingTitle" class="form-control" maxlength="120" required><div class="highlight-edit-title-controls"><label>Size <input id="highlightEditTitleSize" class="form-control" type="number" min="12" max="36" step="1" value="18" required> px</label><label><input id="highlightEditBold" type="checkbox"> Bold</label><label><input id="highlightEditItalic" type="checkbox"> Italic</label></div></div><fieldset class="training-export-section highlight-edit-branding"><legend class="training-export-label">Footer branding</legend><label><input type="radio" name="highlightBranding" value="office" checked> Office name</label><label><input type="radio" name="highlightBranding" value="logo"> Logo</label><div id="highlightEditOfficeFields"><label class="training-export-label" for="highlightEditOfficeName">Office name</label><input id="highlightEditOfficeName" class="form-control" maxlength="100"></div><div id="highlightEditLogoFields" hidden><label class="training-export-label" for="highlightEditLogo">Logo image</label><input id="highlightEditLogo" class="form-control" type="file" accept="image/png,image/jpeg"><p>PNG or JPG. The logo appears at the bottom of the slide.</p></div></fieldset></div></div><div class="modal-footer"><span id="highlightEditStatus" role="status" aria-live="polite"></span><button type="button" class="btn training-export-cancel" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn training-export-confirm"><i class="bi bi-check2"></i> Save changes</button></div></form></div></div>`;
  modalElement.querySelector('.modal-dialog').className = 'modal-dialog modal-fullscreen';
  document.body.append(modalElement);
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  const $ = selector => modalElement.querySelector(selector);
  const form = $('#highlightEditForm');
  $('#highlightEditHeading').required = false;
  $('#highlightEditDescription').required = false;
  $('#highlightEditHeading').closest('.training-export-section').querySelector('.training-export-label').textContent = 'Slide heading (optional)';
  $('#highlightEditDescription').closest('.training-export-section').querySelector('.training-export-label').textContent = 'Body content (optional)';
  for (const [field, label, min, max, value] of [
    ['highlightEditHeading', 'Heading font size', 16, 64, 38],
    ['highlightEditDescription', 'Body font size', 10, 30, 14],
    ['highlightEditQuote', 'Quote font size', 12, 40, 20]
  ]) {
    document.getElementById(field).closest('.training-export-section').insertAdjacentHTML('beforeend', `<label class="highlight-edit-size-label" for="${field}Size">${label} <input id="${field}Size" class="form-control" type="number" min="${min}" max="${max}" step="1" value="${value}" required> px</label>`);
  }
  const bulletFields = document.createElement('div');
  bulletFields.className = 'training-export-section highlight-edit-bullets';
  bulletFields.innerHTML = '<label class="training-export-label" for="highlightEditKeyBullets">Key Highlights bullets</label><textarea id="highlightEditKeyBullets" class="form-control" rows="5" placeholder="One bullet per line"></textarea><label class="training-export-label" for="highlightEditForwardBullets">Ways Forward bullets</label><textarea id="highlightEditForwardBullets" class="form-control" rows="5" placeholder="One bullet per line"></textarea><p>Enter one point per line. Blank lines are ignored.</p>';
  modalElement.querySelector('.training-export-settings').append(bulletFields);
  const dashboardChoice = document.createElement('fieldset');
  dashboardChoice.className = 'training-export-section highlight-dashboard-choice';
  dashboardChoice.innerHTML = '<legend class="training-export-label">Dashboard carousel</legend><p>Choose a slide to show, or hide the training slide from the dashboard.</p><div class="highlight-dashboard-options"><label><input type="radio" name="highlightDashboardSlide" value="0" checked> Show Key Highlights</label><label><input type="radio" name="highlightDashboardSlide" value="1"> Show Ways Forward</label><label><input type="radio" name="highlightDashboardSlide" value="-1"> Hide from dashboard</label></div>';
  bulletFields.after(dashboardChoice);
  const bulletPreview = document.createElement('div');
  bulletPreview.className = 'highlight-edit-bullet-preview';
  bulletPreview.innerHTML = '<div><strong>Key Highlights</strong><ul id="highlightEditKeyPreview"></ul></div><div><strong>Ways Forward</strong><ul id="highlightEditForwardPreview"></ul></div>';
  modalElement.querySelector('.training-export-preview-area').append(bulletPreview);
  const bulletItems = selector => $(selector).value.split(/\r?\n/).map(line => line.trim().replace(/^[•*-]\s*/, '')).filter(Boolean);
  const renderBullets = (target, items) => {
    target.replaceChildren(...items.map(item => { const li = document.createElement('li'); li.textContent = item; return li; }));
  };
  const bulletLists = [panel.querySelector('#trainingKeyHighlights ul'), panel.querySelector('#trainingWaysForward ul')];
  const bulletCounts = [panel.querySelector('#trainingKeyHighlights').closest('.training-highlight-accordion').querySelector('.training-highlight-count'), panel.querySelector('#trainingWaysForward').closest('.training-highlight-accordion').querySelector('.training-highlight-count')];
  function applyBullets(groups) {
    groups.forEach((items, index) => {
      renderBullets(bulletLists[index], items);
      bulletCounts[index].textContent = `${items.length} ${items.length === 1 ? 'point' : 'points'}`;
    });
  }
  $('#highlightEditLogoFields').insertAdjacentHTML('beforeend', '<label class="highlight-edit-size-label" for="highlightEditLogoSize">Logo width <input id="highlightEditLogoSize" class="form-control" type="number" min="30" max="180" step="1" value="80" required> px</label>');
  $('#highlightEditOfficeFields').insertAdjacentHTML('beforeend', '<label class="highlight-edit-size-label" for="highlightEditOfficeSize">Office font size <input id="highlightEditOfficeSize" class="form-control" type="number" min="10" max="32" step="1" value="14" required> px</label>');
  const size = (selector, fallback) => {
    const field = $(selector);
    const value = Number(field.value);
    return Number.isInteger(value) && value >= Number(field.min) && value <= Number(field.max) ? value : fallback;
  };

  function imageUrl(item, index, key) {
    if (urls[index][key]) URL.revokeObjectURL(urls[index][key]);
    urls[index][key] = item[key + 'Blob'] ? URL.createObjectURL(item[key + 'Blob']) : null;
    return urls[index][key] || (key === 'image' ? item.image : '');
  }
  function applySlide(index) {
    const item = state[index];
    const slide = slides[index];
    slide.querySelector('img').src = imageUrl(item, index, 'image');
    slide.querySelector('h3').textContent = item.heading || '';
    slide.querySelector('h3').style.fontSize = `${item.headingSize || 38}px`;
    slide.querySelector('.training-highlight-copy p').textContent = item.description || '';
    slide.querySelector('.training-highlight-copy p').style.fontSize = `${item.bodySize || 14}px`;
    slide.querySelector('.training-highlight-quote').textContent = item.quote ? `“${item.quote}”` : '';
    slide.querySelector('.training-highlight-overlay').classList.remove('is-custom-positioned');
    slide.querySelector('.training-highlight-quote').style.fontSize = `${item.quoteSize || 20}px`;
    delete slide.dataset.highlightLayout;
    let footer = slide.querySelector('.training-highlight-branding');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'training-highlight-branding';
      slide.querySelector('.training-highlight-overlay').append(footer);
    }
    footer.innerHTML = `<strong></strong><span></span>`;
    const title = footer.querySelector('strong');
    title.textContent = item.trainingTitle;
    title.style.fontSize = `${item.titleSize}px`;
    title.style.fontWeight = item.bold ? '700' : '400';
    title.style.fontStyle = item.italic ? 'italic' : 'normal';
    const brand = footer.querySelector('span');
    brand.style.fontSize = `${item.officeSize || 14}px`;
    if (item.branding === 'logo' && (item.logoBlob || item.logo)) {
      const logo = document.createElement('img');
      logo.src = imageUrl(item, index, 'logo');
      logo.alt = 'Office logo';
      logo.style.width = `${item.logoSize || 80}px`;
      brand.append(logo);
    } else {
      brand.textContent = item.officeName;
    }
  }
  function fillForm(index) {
    selected = index;
    draftImage = null;
    draftLogo = null;
    if (previewImageUrl) URL.revokeObjectURL(previewImageUrl);
    if (previewLogoUrl) URL.revokeObjectURL(previewLogoUrl);
    previewImageUrl = previewLogoUrl = null;
    const item = state[index];
    $('#highlightEditSlide').value = String(index);
    $('#highlightEditImage').value = '';
    $('#highlightEditLogo').value = '';
    $('#highlightEditHeading').value = item.heading;
    $('#highlightEditDescription').value = item.description;
    $('#highlightEditQuote').value = item.quote;
    $('#highlightEditHeadingSize').value = item.headingSize || 38;
    $('#highlightEditDescriptionSize').value = item.bodySize || 14;
    $('#highlightEditQuoteSize').value = item.quoteSize || 20;
    $('#highlightEditKeyBullets').value = [...bulletLists[0].children].map(li => li.textContent).join('\n');
    $('#highlightEditForwardBullets').value = [...bulletLists[1].children].map(li => li.textContent).join('\n');
    $('#highlightEditTrainingTitle').value = item.trainingTitle;
    $('#highlightEditTitleSize').value = item.titleSize;
    $('#highlightEditBold').checked = item.bold;
    $('#highlightEditItalic').checked = item.italic;
    form.querySelector(`[name="highlightBranding"][value="${item.branding}"]`).checked = true;
    $('#highlightEditOfficeName').value = item.officeName;
    $('#highlightEditOfficeSize').value = item.officeSize || 14;
    $('#highlightEditLogoSize').value = item.logoSize || 80;
    $('#highlightEditStatus').textContent = '';
    updatePreview();
  }
  function updatePreview() {
    const item = state[selected];
    const branding = form.querySelector('[name="highlightBranding"]:checked').value;
    $('#highlightEditPreviewImage').src = previewImageUrl || urls[selected].image || item.image;
    $('#highlightEditPreviewLabel').textContent = selected === 0 ? 'KEY HIGHLIGHT' : 'WAY FORWARD';
    $('#highlightEditPreviewHeading').textContent = $('#highlightEditHeading').value;
    $('#highlightEditPreviewHeading').style.fontSize = `${size('#highlightEditHeadingSize', 38)}px`;
    $('#highlightEditPreviewDescription').textContent = $('#highlightEditDescription').value;
    $('#highlightEditPreviewDescription').style.fontSize = `${size('#highlightEditDescriptionSize', 14)}px`;
    $('#highlightEditPreviewQuote').textContent = $('#highlightEditQuote').value ? `“${$('#highlightEditQuote').value}”` : '';
    const title = $('#highlightEditPreviewTrainingTitle');
    $('#highlightEditPreviewQuote').style.fontSize = `${size('#highlightEditQuoteSize', 20)}px`;
    renderBullets($('#highlightEditKeyPreview'), bulletItems('#highlightEditKeyBullets'));
    renderBullets($('#highlightEditForwardPreview'), bulletItems('#highlightEditForwardBullets'));
    bulletPreview.children[0].hidden = selected !== 0;
    bulletPreview.children[1].hidden = selected !== 1;
    title.textContent = $('#highlightEditTrainingTitle').value;
    title.style.fontSize = `${size('#highlightEditTitleSize', 18)}px`;
    title.style.fontWeight = $('#highlightEditBold').checked ? '700' : '400';
    title.style.fontStyle = $('#highlightEditItalic').checked ? 'italic' : 'normal';
    $('#highlightEditOfficeFields').hidden = branding !== 'office';
    $('#highlightEditLogoFields').hidden = branding !== 'logo';
    $('#highlightEditOfficeName').required = branding === 'office';
    const brand = $('#highlightEditPreviewBrand');
    brand.innerHTML = '';
    brand.style.fontSize = `${size('#highlightEditOfficeSize', 14)}px`;
    if (branding === 'logo' && (previewLogoUrl || urls[selected].logo)) {
      const logo = document.createElement('img');
      logo.src = previewLogoUrl || urls[selected].logo;
      logo.alt = 'Office logo preview';
      logo.style.width = `${size('#highlightEditLogoSize', 80)}px`;
      brand.append(logo);
    } else if (branding === 'logo') {
      brand.textContent = 'Choose a logo image';
    } else brand.textContent = $('#highlightEditOfficeName').value;
  }

  editButton.addEventListener('click', () => {
    const active = slides.findIndex(slide => slide.classList.contains('active'));
    fillForm(active < 0 ? 0 : active);
    modal.show();
  });
  $('#highlightEditSlide').addEventListener('change', event => {
    const bullets = [$('#highlightEditKeyBullets').value, $('#highlightEditForwardBullets').value];
    fillForm(Number(event.target.value));
    $('#highlightEditKeyBullets').value = bullets[0];
    $('#highlightEditForwardBullets').value = bullets[1];
    updatePreview();
  });
  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);
  $('#highlightEditImage').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!['image/png','image/jpeg'].includes(file.type)) { $('#highlightEditStatus').textContent = 'Choose a PNG or JPG picture.'; return; }
    if (previewImageUrl) URL.revokeObjectURL(previewImageUrl);
    draftImage = file;
    previewImageUrl = URL.createObjectURL(file);
    updatePreview();
  });
  $('#highlightEditLogo').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!['image/png','image/jpeg'].includes(file.type)) { $('#highlightEditStatus').textContent = 'Choose a PNG or JPG logo.'; return; }
    if (previewLogoUrl) URL.revokeObjectURL(previewLogoUrl);
    draftLogo = file;
    previewLogoUrl = URL.createObjectURL(file);
    updatePreview();
  });
  modalElement.addEventListener('hidden.bs.modal', () => {
    if (previewImageUrl) URL.revokeObjectURL(previewImageUrl);
    if (previewLogoUrl) URL.revokeObjectURL(previewLogoUrl);
    previewImageUrl = previewLogoUrl = null;
  });

  const dbPromise = new Promise(resolve => {
    if (window.TMIS_PAGE || !window.indexedDB) { resolve(null); return; }
    try {
      const request = indexedDB.open('tmis-training-highlights', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('slides');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  async function saveSlide(index, item) {
    if(window.TMIS_PAGE){
      const data=new FormData();data.set('slide',index);data.set('content',JSON.stringify(item));
      if(item.imageBlob instanceof Blob)data.set('image',item.imageBlob,'highlight.jpg');
      if(item.logoBlob instanceof Blob)data.set('logo',item.logoBlob,'logo.jpg');
      try {window.TmisStore.publish(await window.TmisStore.request('/ui/highlights/'+encodeURIComponent(window.TmisStore.selectedId()),data));return true;}
      catch(error){$('#highlightEditStatus').textContent=error.message;return false;}
    }
    const db = await dbPromise;
    if (!db) return false;
    return new Promise(resolve => {
      const tx = db.transaction('slides', 'readwrite');
      tx.objectStore('slides').put(item, `edit-training-${index}`);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }
  async function saveBullets(groups) {
    if(window.TMIS_PAGE){try{const training=window.TmisStore.selected('tmis-trainings');await window.TmisStore.saveRecord('tmis-trainings',{...training,bullets:groups});return true;}catch(error){$('#highlightEditStatus').textContent=error.message;return false;}}
    const db = await dbPromise;
    if (!db) return false;
    return new Promise(resolve => {
      const tx = db.transaction('slides', 'readwrite');
      tx.objectStore('slides').put(groups, 'edit-training-bullets');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }
  async function saveDashboardChoice(index) {
    if(window.TMIS_PAGE){try{const training=window.TmisStore.selected('tmis-trainings');await window.TmisStore.saveRecord('tmis-trainings',{...training,dashboardSlide:index});return true;}catch(error){$('#highlightEditStatus').textContent=error.message;return false;}}
    const db = await dbPromise;
    if (!db) return false;
    return new Promise(resolve => {
      const tx = db.transaction('slides', 'readwrite');
      tx.objectStore('slides').put(index, 'edit-training-dashboard-slide');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const branding = form.querySelector('[name="highlightBranding"]:checked').value;
    if (branding === 'logo' && !draftLogo && !state[selected].logoBlob) {
      $('#highlightEditStatus').textContent = 'Choose a logo image or select Office name.';
      return;
    }
    const item = {...state[selected], heading:$('#highlightEditHeading').value.trim(), description:$('#highlightEditDescription').value.trim(), quote:$('#highlightEditQuote').value.trim(), trainingTitle:$('#highlightEditTrainingTitle').value.trim(), titleSize:size('#highlightEditTitleSize', 18), bold:$('#highlightEditBold').checked, italic:$('#highlightEditItalic').checked, branding, officeName:$('#highlightEditOfficeName').value.trim(), officeSize:size('#highlightEditOfficeSize', 14), logoSize:size('#highlightEditLogoSize', 80)};
    item.headingSize = size('#highlightEditHeadingSize', 38);
    item.bodySize = size('#highlightEditDescriptionSize', 14);
    item.quoteSize = size('#highlightEditQuoteSize', 20);
    const bullets = [bulletItems('#highlightEditKeyBullets'), bulletItems('#highlightEditForwardBullets')];
    if (draftImage) item.imageBlob = draftImage;
    if (draftLogo) item.logoBlob = draftLogo;
    delete item.layout;
    state[selected] = item;
    applySlide(selected);
    applyBullets(bullets);
    const dashboardIndex = Number(form.querySelector('[name="highlightDashboardSlide"]:checked').value);
    const slideSaved=await saveSlide(selected,item);const bulletsSaved=slideSaved&&await saveBullets(bullets);const dashboardSaved=bulletsSaved&&await saveDashboardChoice(dashboardIndex);
    const saved = slideSaved && bulletsSaved && dashboardSaved;
    if(saved){$('#highlightEditStatus').textContent='Saved to the database.';modal.hide();}
  });
  dbPromise.then(db => {
    if (!db) return;
    const choiceRequest = db.transaction('slides', 'readonly').objectStore('slides').get('edit-training-dashboard-slide');
    choiceRequest.onsuccess = () => {
      const choice = Number(choiceRequest.result);
      if (choice === -1 || choice === 0 || choice === 1) form.querySelector(`[name="highlightDashboardSlide"][value="${choice}"]`).checked = true;
    };
    const bulletRequest = db.transaction('slides', 'readonly').objectStore('slides').get('edit-training-bullets');
    bulletRequest.onsuccess = () => {
      if (Array.isArray(bulletRequest.result) && bulletRequest.result.length === 2) applyBullets(bulletRequest.result);
    };
    slides.forEach((_, index) => {
      const request = db.transaction('slides', 'readonly').objectStore('slides').get(`edit-training-${index}`);
      request.onsuccess = () => { if (request.result) { state[index] = request.result; applySlide(index); } };
    });
  });
});
