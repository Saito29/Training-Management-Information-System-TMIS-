document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('highlights-panel');
  if (!panel) return;

  const highlights = (window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings')?.bullets?.[0]||[] : [
    'Participants actively engaged during the hands-on demonstration.',
    'Pre-test and post-test results showed improvement in GAP knowledge.',
    'Participants valued the clear explanations and practical examples.',
    'Farmers expressed interest in more advanced GAP topics.',
  ]);
  const waysForward = (window.TMIS_PAGE ? window.TmisStore.selected('tmis-trainings')?.bullets?.[1]||[] : [
    'Conduct follow-up training on advanced GAP practices.',
    'Provide supplementary materials and simple reference guides.',
    'Monitor how participants apply the lessons in their farms.',
    'Organize a site visit to model farms for further learning.',
  ]);
  const list = items => items.map(item => `<li>${window.TmisStore.escape(item)}</li>`).join('');
  panel.innerHTML = `<div class="training-highlights-layout"><section class="training-highlight-hero training-card" aria-labelledby="trainingMomentsTitle"><header class="training-highlight-header"><div class="training-highlight-heading"><span class="training-highlight-heading-icon"><i class="bi bi-images" aria-hidden="true"></i></span><div><span class="training-highlight-eyebrow">Training recap</span><h2 id="trainingMomentsTitle">Highlights &amp; Ways Forward</h2><p>Moments and lessons from Good Agricultural Practices training.</p></div></div><span class="training-highlight-image-note">Saved highlights</span></header><div id="trainingHighlightCarousel" class="carousel slide training-highlight-carousel" role="region" aria-roledescription="carousel" aria-label="Training highlights"><div class="carousel-inner"><article class="carousel-item active"><img src="../../../../assets/img/ricefield_with_farmer.png" alt="Farmer working in a rice field" class="training-highlight-image"><div class="training-highlight-overlay"><span class="training-highlight-chip"><i class="bi bi-lightbulb-fill" aria-hidden="true"></i> Key highlight</span><div class="training-highlight-copy"><span class="training-highlight-slide-number">01 / 02</span><h3>Learning through hands-on practice</h3><p>Participants explored GAP concepts through demonstrations and practical discussion.</p></div></div></article><article class="carousel-item"><img src="../../../../assets/img/ricefield_with_farmer-Picsart-AiImageEnhancer.png" alt="Farmer in a cultivated field" class="training-highlight-image"><div class="training-highlight-overlay"><span class="training-highlight-chip"><i class="bi bi-arrow-up-right" aria-hidden="true"></i> Way forward</span><div class="training-highlight-copy"><span class="training-highlight-slide-number">02 / 02</span><h3>Bring the lessons back to the farm</h3><p>Follow-up guidance and field visits can help farmers apply what they learned.</p></div></div></article></div><div class="carousel-indicators training-highlight-indicators"><button type="button" data-bs-target="#trainingHighlightCarousel" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Show training highlight 1"></button><button type="button" data-bs-target="#trainingHighlightCarousel" data-bs-slide-to="1" aria-label="Show training highlight 2"></button></div><button class="carousel-control-prev training-highlight-control" type="button" data-bs-target="#trainingHighlightCarousel" data-bs-slide="prev" aria-label="Previous highlight"><span class="carousel-control-prev-icon" aria-hidden="true"></span></button><button class="carousel-control-next training-highlight-control" type="button" data-bs-target="#trainingHighlightCarousel" data-bs-slide="next" aria-label="Next highlight"><span class="carousel-control-next-icon" aria-hidden="true"></span></button></div></section><div class="training-highlight-details"><section class="training-highlight-accordion training-card"><h3><button class="training-highlight-toggle" type="button" data-bs-toggle="collapse" data-bs-target="#trainingKeyHighlights" aria-expanded="true" aria-controls="trainingKeyHighlights"><span class="training-highlight-toggle-icon"><i class="bi bi-stars" aria-hidden="true"></i></span><span><strong>Key Highlights</strong><small>What stood out during the training</small></span><span class="training-highlight-count">${highlights.length} points</span><i class="bi bi-chevron-down training-highlight-chevron" aria-hidden="true"></i></button></h3><div id="trainingKeyHighlights" class="collapse show"><div class="training-highlight-accordion-body"><ul>${list(highlights)}</ul></div></div></section><section class="training-highlight-accordion training-card"><h3><button class="training-highlight-toggle collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#trainingWaysForward" aria-expanded="false" aria-controls="trainingWaysForward"><span class="training-highlight-toggle-icon"><i class="bi bi-signpost-split" aria-hidden="true"></i></span><span><strong>Ways Forward</strong><small>Recommended next steps for participants</small></span><span class="training-highlight-count">${waysForward.length} points</span><i class="bi bi-chevron-down training-highlight-chevron" aria-hidden="true"></i></button></h3><div id="trainingWaysForward" class="collapse"><div class="training-highlight-accordion-body"><ul>${list(waysForward)}</ul></div></div></section></div></div>`;
  if (!window.TMIS_PAGE && window.indexedDB) {
    try {
      const request = indexedDB.open('tmis-training-highlights', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('slides')) request.result.createObjectStore('slides');
      };
      request.onsuccess = () => {
        const db = request.result;
        const saved = db.transaction('slides', 'readonly').objectStore('slides').get('edit-training-bullets');
        saved.onsuccess = () => {
          if (!Array.isArray(saved.result) || saved.result.length !== 2) return;
          [panel.querySelector('#trainingKeyHighlights'), panel.querySelector('#trainingWaysForward')].forEach((section, index) => {
            const items = saved.result[index];
            if (!Array.isArray(items)) return;
            section.querySelector('ul').replaceChildren(...items.map(item => { const li = document.createElement('li'); li.textContent = item; return li; }));
            section.closest('.training-highlight-accordion').querySelector('.training-highlight-count').textContent = `${items.length} ${items.length === 1 ? 'point' : 'points'}`;
          });
        };
        saved.transaction.oncomplete = () => db.close();
      };
    } catch { /* Sample bullets remain visible when storage is unavailable. */ }
  }
  const quotes = [
    'The hands-on demonstration helped us understand how to apply GAP practices on our farms.',
    'Simple guides and follow-up visits will help us put the lessons into practice.',
  ];
  const slides = [...panel.querySelectorAll('.training-highlight-carousel .carousel-item')];
  slides.forEach((slide, index) => {
    const quote = document.createElement('blockquote');
    quote.className = 'training-highlight-quote';
    quote.textContent = `“${quotes[index]}”`;
    slide.querySelector('.training-highlight-copy p').after(quote);
  });
  if(window.TMIS_PAGE){
    const training=window.TmisStore.selected('tmis-trainings');
    slides.forEach((slide,index)=>{
      const item=training?.highlights?.[index]||{};
      const image=slide.querySelector('img');if(item.image)image.src=item.image;else image.removeAttribute('src');
      slide.querySelector('h3').textContent=item.heading||'No saved highlight';
      slide.querySelector('.training-highlight-copy p').textContent=item.description||'';
      slide.querySelector('.training-highlight-quote').textContent=item.quote||'';
      for(const[selector,field]of [['h3','headingSize'],['.training-highlight-copy p','bodySize'],['.training-highlight-quote','quoteSize']])if(item[field])slide.querySelector(selector).style.fontSize=item[field]+'px';
      const footer=document.createElement('div');footer.className='training-highlight-branding';
      const title=document.createElement('strong');title.textContent=item.trainingTitle||training?.title||'';
      const office=document.createElement('span');office.textContent=item.officeName||training?.office||'';footer.append(title,office);slide.querySelector('.training-highlight-overlay').append(footer);
    });
    panel.querySelector('.training-highlight-header p').textContent=training?.title||'Training recap';
  }
  const actions = document.createElement('div');
  actions.className = 'training-highlight-header-actions';
  actions.innerHTML = '<span class="training-highlight-image-note">Saved highlights</span><button class="training-highlight-export" type="button"><i class="bi bi-download" aria-hidden="true"></i> Export image</button>';
  panel.querySelector('.training-highlight-image-note').replaceWith(actions);
  const modalElement = document.createElement('div');
  modalElement.className = 'modal fade training-export-modal';
  modalElement.id = 'trainingHighlightExportModal';
  modalElement.tabIndex = -1;
  modalElement.setAttribute('aria-labelledby', 'trainingExportTitle');
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-xl"><div class="modal-content"><form id="trainingExportForm"><div class="modal-header"><div><span class="training-export-eyebrow">Create image</span><h2 class="modal-title" id="trainingExportTitle">Export training highlight</h2><p>Choose a canvas size for the photo and quote.</p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body training-export-layout"><div class="training-export-preview-area"><div class="training-export-preview" id="trainingExportPreview"><img id="trainingExportPreviewImage" alt=""><div class="training-export-preview-overlay"><span id="trainingExportPreviewLabel"></span><div><h3 id="trainingExportPreviewTitle"></h3><blockquote id="trainingExportPreviewQuote"></blockquote></div></div></div><span class="training-export-preview-caption">Preview of the exported image</span></div><div class="training-export-settings"><div class="training-export-section"><label class="training-export-label" for="trainingExportName">File name</label><div class="training-export-name"><input id="trainingExportName" class="form-control" type="text" maxlength="80" required><span>.png</span></div></div><fieldset class="training-export-section"><legend class="training-export-label">Aspect ratio</legend><div class="training-export-ratios" role="group" aria-label="Aspect ratio"><button type="button" data-export-ratio="16:9" aria-pressed="true" class="is-active"><i class="bi bi-aspect-ratio" aria-hidden="true"></i>16:9 <small>Landscape</small></button><button type="button" data-export-ratio="1:1" aria-pressed="false"><i class="bi bi-square" aria-hidden="true"></i>1:1 <small>Square</small></button><button type="button" data-export-ratio="4:5" aria-pressed="false"><i class="bi bi-phone" aria-hidden="true"></i>4:5 <small>Portrait</small></button><button type="button" data-export-ratio="9:16" aria-pressed="false"><i class="bi bi-phone" aria-hidden="true"></i>9:16 <small>Story</small></button></div></fieldset><div class="training-export-section"><label class="training-export-label" for="trainingExportPreset">Pixel size</label><select id="trainingExportPreset" class="form-select"><option value="1080">Standard · 1080 px longest edge</option><option value="1920" selected>High quality · 1920 px longest edge</option><option value="2400">Extra large · 2400 px longest edge</option><option value="custom">Custom dimensions</option></select><div class="training-export-dimensions"><label>Width <span>px</span><input id="trainingExportWidth" class="form-control" type="number" min="320" max="4096" step="1" value="1920" required></label><span class="training-export-dimension-lock" title="Aspect ratio is maintained"><i class="bi bi-link-45deg" aria-hidden="true"></i></span><label>Height <span>px</span><input id="trainingExportHeight" class="form-control" type="number" min="320" max="4096" step="1" value="1080" required></label></div><p>Editing either dimension keeps the selected aspect ratio.</p></div><div class="training-export-format"><i class="bi bi-filetype-png" aria-hidden="true"></i><span><strong>PNG image</strong><small>High-quality image with photo and quote</small></span></div></div></div><div class="modal-footer"><span id="trainingExportStatus" role="status" aria-live="polite"></span><button type="button" class="btn training-export-cancel" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn training-export-confirm"><i class="bi bi-download" aria-hidden="true"></i> Export PNG</button></div></form></div></div>`;
  modalElement.querySelector('.training-export-preview-overlay > div').insertAdjacentHTML('beforeend', '<small id="trainingExportPreviewFooter">Good Agricultural Practices (GAP) • Training recap</small>');
  modalElement.querySelector('#trainingExportPreviewTitle').insertAdjacentHTML('afterend', '<p id="trainingExportPreviewDescription"></p>');
  document.body.append(modalElement);
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  const $ = selector => modalElement.querySelector(selector);
  const widthInput = $('#trainingExportWidth');
  const heightInput = $('#trainingExportHeight');
  const preset = $('#trainingExportPreset');
  const preview = $('#trainingExportPreview');
  const status = $('#trainingExportStatus');
  const confirm = $('.training-export-confirm');
  const visibility = document.createElement('fieldset');
  visibility.className = 'training-export-section training-export-visibility';
  visibility.innerHTML = `<legend class="training-export-label">Include in export</legend><p>Choose which elements appear in the preview and PNG.</p><div class="training-export-visibility-grid">${[['image','Picture'],['label','Slide label'],['heading','Slide heading'],['body','Body content'],['quote','Quote'],['title','Training title'],['brand','Office name or logo']].map(([key, label]) => `<label><input type="checkbox" data-export-part="${key}" checked><span>${label}</span></label>`).join('')}</div>`;
  modalElement.querySelector('.training-export-ratios').closest('fieldset').after(visibility);
  const include = key => visibility.querySelector(`[data-export-part="${key}"]`).checked;
  let activeIndex = 0;
  let ratio = [16, 9];
  function updatePreview() {
    preview.style.aspectRatio = `${ratio[0]} / ${ratio[1]}`;
    preview.style.maxWidth = `${Math.round(420 * ratio[0] / ratio[1])}px`;
    $('#trainingExportPreviewImage').src = slides[activeIndex].querySelector('img').src;
    $('#trainingExportPreviewImage').hidden = !include('image');
    $('#trainingExportPreviewLabel').textContent = activeIndex === 0 ? 'KEY HIGHLIGHT' : 'WAY FORWARD';
    $('#trainingExportPreviewTitle').textContent = slides[activeIndex].querySelector('h3').textContent;
    $('#trainingExportPreviewDescription').textContent = slides[activeIndex].querySelector('.training-highlight-copy p').textContent;
    const slideHeadingSize = Number.parseInt(slides[activeIndex].querySelector('h3').style.fontSize, 10);
    const slideBodySize = Number.parseInt(slides[activeIndex].querySelector('.training-highlight-copy p').style.fontSize, 10);
    const slideQuoteSize = Number.parseInt(slides[activeIndex].querySelector('.training-highlight-quote').style.fontSize, 10);
    $('#trainingExportPreviewTitle').style.fontSize = slideHeadingSize ? `${Math.round(slideHeadingSize * .72)}px` : '';
    $('#trainingExportPreviewDescription').style.fontSize = slideBodySize ? `${slideBodySize}px` : '';
    $('#trainingExportPreviewQuote').style.fontSize = slideQuoteSize ? `${Math.round(slideQuoteSize * .85)}px` : '';
    const currentSlide = slides[activeIndex];
    $('#trainingExportPreviewQuote').textContent = currentSlide.querySelector('.training-highlight-quote')?.textContent || '';
    const branding = currentSlide.querySelector('.training-highlight-branding');
    const previewFooter = $('#trainingExportPreviewFooter');
    if (branding) {
      previewFooter.replaceChildren(branding.cloneNode(true));
    } else previewFooter.textContent = 'Good Agricultural Practices (GAP) - Training recap';
    visibility.querySelector('[data-export-part="brand"]').disabled = !branding;
    if (branding) {
      branding.querySelector('strong') && (previewFooter.querySelector('strong').hidden = !include('title'));
      branding.querySelector('span') && (previewFooter.querySelector('span').hidden = !include('brand'));
      previewFooter.hidden = !include('title') && !include('brand');
    } else previewFooter.hidden = !include('title');
    for (const [key, selector] of Object.entries({label:'#trainingExportPreviewLabel', heading:'#trainingExportPreviewTitle', body:'#trainingExportPreviewDescription', quote:'#trainingExportPreviewQuote'})) $(selector).hidden = !include(key);
  }
  function setLongEdge(edge) {
    const minimum = Math.ceil(320 * Math.max(...ratio) / Math.min(...ratio));
    edge = Math.max(minimum, Math.min(4096, edge));
    const landscape = ratio[0] >= ratio[1];
    widthInput.value = landscape ? edge : Math.round(edge * ratio[0] / ratio[1]);
    heightInput.value = landscape ? Math.round(edge * ratio[1] / ratio[0]) : edge;
    updatePreview();
  }
  function syncDimension(changed) {
    const field = changed === 'width' ? widthInput : heightInput;
    const value = Number(field.value);
    if (!Number.isInteger(value) || value < 320 || value > 4096) return;
    if (changed === 'width') {
      const width = Math.max(Math.ceil(320 * ratio[0] / ratio[1]), Math.min(value, Math.floor(4096 * ratio[0] / ratio[1])));
      widthInput.value = width;
      heightInput.value = Math.round(width * ratio[1] / ratio[0]);
    } else {
      const height = Math.max(Math.ceil(320 * ratio[1] / ratio[0]), Math.min(value, Math.floor(4096 * ratio[1] / ratio[0])));
      heightInput.value = height;
      widthInput.value = Math.round(height * ratio[0] / ratio[1]);
    }
    preset.value = 'custom';
  }
  actions.querySelector('button').addEventListener('click', () => {
    activeIndex = slides.indexOf(panel.querySelector('.training-highlight-carousel .carousel-item.active'));
    if (activeIndex < 0) return;
    $('#trainingExportName').value = `training-highlight-${activeIndex + 1}`;
    status.textContent = '';
    updatePreview();
    modal.show();
  });
  $('.training-export-ratios').addEventListener('click', event => {
    const button = event.target.closest('[data-export-ratio]');
    if (!button) return;
    ratio = button.dataset.exportRatio.split(':').map(Number);
    modalElement.querySelectorAll('[data-export-ratio]').forEach(option => {
      const selected = option === button;
      option.classList.toggle('is-active', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    setLongEdge(preset.value === 'custom' ? Math.max(Number(widthInput.value), Number(heightInput.value)) : Number(preset.value));
  });
  visibility.addEventListener('change', updatePreview);
  preset.addEventListener('change', () => { if (preset.value !== 'custom') setLongEdge(Number(preset.value)); });
  widthInput.addEventListener('change', () => syncDimension('width'));
  heightInput.addEventListener('change', () => syncDimension('height'));
  const wrap = (context, value, x, y, maxWidth, lineHeight) => {
    let line = '';
    for (const word of value.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > maxWidth && line) { context.fillText(line, x, y); y += lineHeight; line = word; }
      else line = next;
    }
    if (line) context.fillText(line, x, y);
    return y;
  };
  $('#trainingExportForm').addEventListener('submit', async event => {
    event.preventDefault();
    const width = Number(widthInput.value);
    const height = Number(heightInput.value);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 320 || width > 4096 || height > 4096) {
      status.textContent = 'Choose dimensions between 320 and 4096 pixels.';
      return;
    }
    const source = slides[activeIndex].querySelector('img');
    confirm.disabled = true;
    status.textContent = 'Preparing PNG…';
    try {
      if (include('image') && source.decode) await source.decode();
      if (include('image') && (!source.naturalWidth || !source.naturalHeight)) throw new Error('Image is unavailable.');
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image export is unavailable.');
      if (include('image')) {
        const scale = Math.max(width / source.naturalWidth, height / source.naturalHeight);
        const cropWidth = width / scale;
        const cropHeight = height / scale;
        context.drawImage(source, (source.naturalWidth - cropWidth) / 2, (source.naturalHeight - cropHeight) / 2, cropWidth, cropHeight, 0, 0, width, height);
      } else {
        context.fillStyle = '#173b24';
        context.fillRect(0, 0, width, height);
      }
      const shade = context.createLinearGradient(0, 0, 0, height);
      shade.addColorStop(0, 'rgba(4, 31, 17, .48)');
      shade.addColorStop(.4, 'rgba(4, 31, 17, .52)');
      shade.addColorStop(1, 'rgba(4, 31, 17, .94)');
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);
      const textScale = Math.min(width / 1600, height / 900);
      const x = Math.round(width * .07);
      context.textAlign = 'left';
      const availableWidth = width - 2 * x;
      // Use the export palette directly so page/theme CSS cannot darken canvas text.
      const textColors = { accent: '#c8f2d0', title: '#ffffff', quote: '#f4fff5' };
      context.shadowColor = 'rgba(0, 0, 0, .72)';
      context.shadowBlur = Math.max(5, Math.round(12 * textScale));
      context.shadowOffsetY = Math.max(2, Math.round(3 * textScale));
      context.fillStyle = textColors.accent;
      const labelFont = Math.max(18, Math.round(27 * textScale));
      context.font = `700 ${labelFont}px Inter, Arial, sans-serif`;
      if (include('label')) context.fillText(activeIndex === 0 ? 'KEY HIGHLIGHT' : 'WAY FORWARD', x, Math.round(height * .1));
      context.fillStyle = textColors.title;
      const headingSize = Number.parseInt(slides[activeIndex].querySelector('h3').style.fontSize, 10) || 38;
      const headingFont = Math.max(18, Math.round(64 * textScale * headingSize / 38));
      context.font = `700 ${headingFont}px Inter, Arial, sans-serif`;
      const headingX = x, headingY = Math.round(height * .57);
      const titleBottom = include('heading') ? wrap(context, slides[activeIndex].querySelector('h3').textContent, headingX, headingY, availableWidth, Math.max(44, Math.round(76 * textScale))) : headingY;
      context.fillStyle = textColors.quote;
      const bodySize = Number.parseInt(slides[activeIndex].querySelector('.training-highlight-copy p').style.fontSize, 10) || 14;
      const bodyFont = Math.max(12, Math.round(29 * textScale * bodySize / 14));
      context.font = `400 ${bodyFont}px Inter, Arial, sans-serif`;
      const bodyX = x, bodyY = titleBottom + Math.max(34, Math.round(52 * textScale));
      const descriptionBottom = include('body') ? wrap(context, slides[activeIndex].querySelector('.training-highlight-copy p').textContent, bodyX, bodyY, availableWidth, Math.max(30, Math.round(40 * textScale))) : bodyY;
      const quoteSize = Number.parseInt(slides[activeIndex].querySelector('.training-highlight-quote').style.fontSize, 10) || 20;
      const quoteFont = Math.max(14, Math.round(39 * textScale * quoteSize / 20));
      context.font = `500 ${quoteFont}px Inter, Arial, sans-serif`;
      const quoteX = x, quoteY = descriptionBottom + Math.max(36, Math.round(56 * textScale));
      if (include('quote')) wrap(context, slides[activeIndex].querySelector('.training-highlight-quote')?.textContent || '', quoteX, quoteY, availableWidth, Math.max(36, Math.round(52 * textScale)));
      context.fillStyle = textColors.accent;
      context.font = `500 ${Math.max(17, Math.round(25 * textScale))}px Inter, Arial, sans-serif`;
      const branding = slides[activeIndex].querySelector('.training-highlight-branding');
      const footerTitle = branding?.querySelector('strong');
      const footerSize = footerTitle ? Number.parseInt(footerTitle.style.fontSize, 10) || 18 : 18;
      const footerFont = Math.max(17, Math.round(footerSize * textScale * 1.4));
      context.font = `${footerTitle?.style.fontStyle || 'normal'} ${footerTitle?.style.fontWeight || '500'} ${footerFont}px Inter, Arial, sans-serif`;
      if (include('title')) context.fillText(footerTitle?.textContent || 'Good Agricultural Practices (GAP) - Training recap', x, Math.round(height * .94), availableWidth);
      const footerLogo = branding?.querySelector('img');
      if (include('brand') && footerLogo) {
        if (footerLogo.decode) await footerLogo.decode();
        const logoWidth = Math.round((Number.parseInt(footerLogo.style.width, 10) || 80) * width / 600);
        const logoHeight = logoWidth * footerLogo.naturalHeight / footerLogo.naturalWidth;
        context.drawImage(footerLogo, width - x - logoWidth, height * .94 - logoHeight, logoWidth, logoHeight);
      } else if (include('brand') && branding?.querySelector('span')?.textContent) {
        const officeSize = Number.parseInt(branding.querySelector('span').style.fontSize, 10) || 14;
        const officeFont = Math.max(14, Math.round(officeSize * textScale * 1.4));
        context.font = `500 ${officeFont}px Inter, Arial, sans-serif`;
        context.textAlign = 'right';
        context.fillText(branding.querySelector('span').textContent, width - x, Math.round(height * .94), width * .25);
        context.textAlign = 'left';
      }
      context.shadowColor = 'transparent';
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Image export failed.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const name = $('#trainingExportName').value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || `training-highlight-${activeIndex + 1}`;
      link.download = `${name}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = `Downloaded ${width} × ${height} PNG.`;
    } catch (error) {
      status.textContent = error.message || 'Unable to export the image.';
    } finally { confirm.disabled = false; }
  });
});
