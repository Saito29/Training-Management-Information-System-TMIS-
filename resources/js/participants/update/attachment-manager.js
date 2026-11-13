document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const attachmentList = $('#attachmentList');
  const emptyState = $('#attachmentEmptyState');
  const queueBody = $('#attachmentQueueBody');
  const queueSummary = $('#attachmentQueueSummary');
  const saveButton = $('#saveStagedAttachments');
  const uploadModalElement = $('#addDocumentModal');
  const editModalElement = $('#editAttachmentModal');
  const viewerModalElement = $('#attachmentViewerModal');
  const attachmentToastElement = $('#attachmentToast');
  const deleteNotice = $('#attachmentDeleteNotice');
  const types = window.TMIS_PAGE?.attachmentTypes?.farmer_profile || ['Profile Form', 'Profile Picture', 'ID', 'Other Files', 'Other', 'Status supporting document'];
  const years = ['2023', '2024', '2025', '2026', '2027', '2028'];
  const attachments = (window.TMIS_PAGE ? window.TmisStore.selected('tmis-farmers')?.attachments || [] : []);
  const stagedFiles = [];
  const uploadModal = bootstrap.Modal.getOrCreateInstance(uploadModalElement);
  const editModal = bootstrap.Modal.getOrCreateInstance(editModalElement);
  const viewerModal = bootstrap.Modal.getOrCreateInstance(viewerModalElement);
  const attachmentToast = bootstrap.Toast.getOrCreateInstance(
    attachmentToastElement
  );
  let activeAttachmentId = null;
  let viewerCollection = attachments;
  let carouselIndex = 0;
  let viewerScale = 1;
  let pendingDelete = null;
  let editAfterViewerClose = false;
  let editBaseline = null;

  const createId = () =>
    window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (character) => {
      const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character];
    });

  const isPdf = (attachment) =>
    /\.pdf$/i.test(attachment.file.name) ||
    (attachment.file.type === 'application/pdf' &&
      !/\.(jpe?g|png)$/i.test(attachment.file.name));

  const isImage = (attachment) =>
    /\.(jpe?g|png)$/i.test(attachment.file.name) ||
    (/^image\/(jpeg|png)$/i.test(attachment.file.type) &&
      !/\.pdf$/i.test(attachment.file.name));

  const setFeedback = (message, isError = false) => {
    const feedback = $('#attachmentFeedback');
    feedback.textContent = message;
    feedback.classList.toggle('text-danger', isError);
    feedback.classList.toggle('text-success', !isError && Boolean(message));
  };

  const notifyAttachment = (title, message, isError = false) => {
    $('#attachmentToastTitle').textContent = title;
    $('#attachmentToastMessage').textContent = message;
    $('#attachmentToastTime').textContent = new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila', 
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
    $('#attachmentToastIcon').className = `bi ${
      isError ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'
    } me-2`;
    attachmentToastElement.classList.toggle('is-error', isError);
    attachmentToast.show();
  };

  const setYearOptions = (select, selected = '') => {
    select.innerHTML = [
      '<option value="">Select a year</option>',
      ...years.map(
        (year) =>
          `<option value="${year}" ${year === String(selected) ? 'selected' : ''}>${year}</option>`
      ),
    ].join('');
  };

  const setTypeOptions = (select, selected = '') => {
    const options = selected && !types.includes(selected) ? [...types, selected] : types;
    select.innerHTML = [
      '<option value="">Select a type</option>',
      ...options.map(
        (type) =>
          `<option value="${escapeHtml(type)}" ${type === selected ? 'selected' : ''}>${escapeHtml(type)}</option>`
      ),
    ].join('');
  };

  const getVisibleAttachmentCount = () => {
    if (window.matchMedia('(max-width: 575.98px)').matches) return 1;
    if (window.matchMedia('(max-width: 767.98px)').matches) return 2;
    if (window.matchMedia('(max-width: 991.98px)').matches) return 3;
    if (window.matchMedia('(max-width: 1199.98px)').matches) return 4;
    return 5;
  };

  const renderAttachments = () => {
    emptyState.hidden = attachments.length > 0;
    if (!attachments.length) {
      attachmentList.querySelector('.attachment-carousel')?.remove();
      return;
    }

    let carousel = attachmentList.querySelector('.attachment-carousel');
    if (!carousel) {
      carousel = document.createElement('div');
      carousel.className = 'attachment-carousel';
      attachmentList.append(carousel);
    }
    const visibleCount = getVisibleAttachmentCount();
    const lastCarouselIndex = Math.max(0, attachments.length - visibleCount);
    if (carouselIndex > lastCarouselIndex) carouselIndex = lastCarouselIndex;
    carouselIndex = Math.max(carouselIndex, 0);
    const visibleAttachments = attachments.slice(
      carouselIndex,
      carouselIndex + visibleCount
    );

    carousel.innerHTML = `
      <button type="button" class="attachment-carousel-nav" data-carousel-step="-1" aria-label="Previous attachments" ${carouselIndex === 0 ? 'disabled' : ''}><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
      <div class="attachment-carousel-track">
        ${visibleAttachments
          .map((attachment, visibleIndex) => {
            const attachmentIndex = carouselIndex + visibleIndex;
            const preview = isImage(attachment)
              ? `<img class="attachment-card-image" src="${escapeHtml(attachment.url)}" alt="" />`
              : '<span class="attachment-card-pdf"><i class="bi bi-file-earmark-pdf-fill" aria-hidden="true"></i><strong>PDF</strong></span>';
            return `
              <article class="attachment-card">
                <button type="button" class="attachment-card-preview" data-open-attachment="${escapeHtml(attachment.id)}" aria-label="View ${escapeHtml(attachment.file.name)}">
                  ${preview}
                  <span class="attachment-card-preview-overlay"><i class="bi bi-arrows-angle-expand" aria-hidden="true"></i>Open preview</span>
                  <span class="attachment-card-preview-type">${isPdf(attachment) ? 'PDF document' : 'Image'}</span>
                </button>
                <div class="attachment-card-info">
                  <span class="attachment-category"><i class="bi bi-tag-fill" aria-hidden="true"></i>${escapeHtml(attachment.type)}</span>
                  <strong class="attachment-card-filename" title="${escapeHtml(attachment.file.name)}">${escapeHtml(attachment.file.name)}</strong>
                  <div class="attachment-card-meta">
                    <span class="attachment-year"><i class="bi bi-calendar3" aria-hidden="true"></i>${escapeHtml(attachment.year)}</span>
                    <span class="attachment-card-count">Attachment ${attachmentIndex + 1} of ${attachments.length}</span>
                  </div>
                  <div class="attachment-card-actions">
                    <button type="button" class="btn attachment-card-edit" data-edit-attachment="${escapeHtml(attachment.id)}" aria-label="Edit ${escapeHtml(attachment.file.name)}"><i class="bi bi-pencil" aria-hidden="true"></i><span>Edit</span></button>
                    <button type="button" class="btn attachment-card-delete" data-delete-attachment="${escapeHtml(attachment.id)}" aria-label="Delete ${escapeHtml(attachment.file.name)}"><i class="bi bi-trash3" aria-hidden="true"></i><span>Delete</span></button>
                  </div>
                </div>
              </article>`;
          })
          .join('')}
      </div>
      <button type="button" class="attachment-carousel-nav" data-carousel-step="1" aria-label="Next attachments" ${carouselIndex >= lastCarouselIndex ? 'disabled' : ''}><i class="bi bi-chevron-right" aria-hidden="true"></i></button>`;
  };

  const rowStatus = (staged) => {
    if (!staged.type && !staged.year) return 'Missing type and year';
    if (!staged.type) return 'Missing type';
    if (!staged.year) return 'Missing year';
    return 'Ready to save';
  };

  const isReadyToSave = (staged) => Boolean(staged.type && staged.year);

  const updateQueueSummary = () => {
    const readyCount = stagedFiles.filter(isReadyToSave).length;
    queueSummary.textContent = `${stagedFiles.length} ${stagedFiles.length === 1 ? 'file' : 'files'} staged · ${readyCount} ready to save`;
    saveButton.disabled = readyCount === 0;
  };

  const renderQueue = () => {
    queueBody.closest('.attachment-queue-table').classList.toggle(
      'is-empty',
      stagedFiles.length === 0
    );
    if (!stagedFiles.length) {
      queueBody.innerHTML =
        '<tr class="attachment-queue-empty"><td colspan="6">No files are waiting to be uploaded.</td></tr>';
    } else {
      queueBody.innerHTML = stagedFiles
        .map((staged) => {
          const status = rowStatus(staged);
          const preview = isImage(staged)
            ? `<img src="${escapeHtml(staged.url)}" alt="" />`
            : '<i class="bi bi-file-earmark-pdf-fill" aria-hidden="true"></i>';
          return `
            <tr data-queue-row="${escapeHtml(staged.id)}">
              <td data-label="Preview"><button type="button" class="attachment-queue-preview" data-queue-preview="${escapeHtml(staged.id)}" aria-label="Preview ${escapeHtml(staged.file.name)}">${preview}<span>${escapeHtml(staged.file.name)}</span></button></td>
              <td data-label="Type"><label class="visually-hidden" for="queueType-${escapeHtml(staged.id)}">Type for ${escapeHtml(staged.file.name)}</label><select class="form-select form-select-sm" id="queueType-${escapeHtml(staged.id)}" data-queue-field="type"><option value="">Select a type</option>${types.map((type) => `<option value="${escapeHtml(type)}" ${staged.type === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></td>
              <td data-label="Year"><label class="visually-hidden" for="queueYear-${escapeHtml(staged.id)}">Year for ${escapeHtml(staged.file.name)}</label><select class="form-select form-select-sm" id="queueYear-${escapeHtml(staged.id)}" data-queue-field="year"><option value="">Select a year</option>${years.map((year) => `<option value="${year}" ${staged.year === year ? 'selected' : ''}>${year}</option>`).join('')}</select></td>
              <td data-label="Remarks"><label class="visually-hidden" for="queueRemarks-${escapeHtml(staged.id)}">Remarks for ${escapeHtml(staged.file.name)}</label><textarea class="form-control form-control-sm" id="queueRemarks-${escapeHtml(staged.id)}" data-queue-field="remarks" maxlength="500" rows="1" placeholder="Optional">${escapeHtml(staged.remarks)}</textarea></td>
              <td data-label="Status"><span class="attachment-queue-status ${status === 'Ready to save' ? 'is-ready' : 'is-incomplete'}">${escapeHtml(status)}</span></td>
              <td data-label="Action"><button type="button" class="btn attachment-queue-cancel" data-remove-queued="${escapeHtml(staged.id)}" title="Cancel this upload" aria-label="Cancel upload of ${escapeHtml(staged.file.name)}"><i class="bi bi-trash3" aria-hidden="true"></i><span>Cancel upload</span></button></td>
            </tr>`;
        })
        .join('');
    }
    updateQueueSummary();
  };

  const updateQueueRow = (row) => {
    const id = row.dataset.queueRow;
    const staged = stagedFiles.find((file) => file.id === id);
    if (!staged) return;
    row.querySelectorAll('[data-queue-field]').forEach((field) => {
      staged[field.dataset.queueField] = field.value;
    });
    const status = row.querySelector('.attachment-queue-status');
    status.textContent = rowStatus(staged);
    status.classList.toggle('is-ready', status.textContent === 'Ready to save');
    status.classList.toggle('is-incomplete', status.textContent !== 'Ready to save');
    updateQueueSummary();
    setFeedback('');
  };

  const openViewer = (attachment, collection = attachments) => {
    viewerCollection = collection;
    activeAttachmentId = attachment.id;
    viewerScale = 1;
    renderViewer();
    viewerModal.show();
  };

  const renderViewer = () => {
    const index = viewerCollection.findIndex(
      (attachment) => attachment.id === activeAttachmentId
    );
    if (index < 0) return;
    const attachment = viewerCollection[index];
    viewerScale = 1;
    const image = $('#attachmentViewerImage');
    const pdf = $('#attachmentViewerPdf');
    $('#attachmentViewerTitle').textContent = attachment.file.name;
    $('#attachmentViewerMeta').textContent =
      `Attachment ${index + 1} of ${viewerCollection.length} · ${attachment.year || 'Year not set'} · ${attachment.type || 'Type not set'}`;
    $('#viewerDownload').dataset.url = attachment.url;
    $('#viewerDownload').dataset.filename = attachment.file.name;
    $('#viewerOpenNewTab').dataset.url = attachment.url;
    image.hidden = !isImage(attachment);
    pdf.hidden = !isPdf(attachment);
    image.removeAttribute('src');
    pdf.removeAttribute('src');
    if (isImage(attachment)) {
      image.src = attachment.url;
      image.alt = attachment.file.name;
    } else if (isPdf(attachment)) {
      pdf.src = attachment.url;
    }
    $('#attachmentViewerStage').scrollTo(0, 0);
    image.style.transform = 'scale(1)';
    pdf.style.transform = 'scale(1)';
    const isSavedAttachment = attachments.includes(attachment);
    $('#viewerEdit').hidden = !isSavedAttachment;
    $('#viewerDelete').hidden = !isSavedAttachment;
    $('#viewerPrevious').disabled = viewerCollection.length < 2;
    $('#viewerNext').disabled = viewerCollection.length < 2;
  };

  const openEdit = (id) => {
    const attachment = attachments.find((item) => item.id === id);
    if (!attachment) return;
    activeAttachmentId = id;
    setTypeOptions($('#editAttachmentType'), attachment.type);
    setYearOptions($('#editAttachmentYear'), attachment.year);
    $('#editAttachmentRemarks').value = attachment.remarks || '';
    editBaseline = {
      type: attachment.type,
      year: attachment.year,
      remarks: (attachment.remarks || '').trim(),
    };
    updateEditFormState();
    editModal.show();
  };

  const updateEditFormState = () => {
    const saveEditButton = $('#saveAttachmentChanges');
    if (!editBaseline) {
      saveEditButton.disabled = true;
      return;
    }
    const current = {
      type: $('#editAttachmentType').value,
      year: $('#editAttachmentYear').value,
      remarks: $('#editAttachmentRemarks').value.trim(),
    };
    const hasChanges =
      current.type !== editBaseline.type ||
      current.year !== editBaseline.year ||
      current.remarks !== editBaseline.remarks;
    saveEditButton.disabled = !hasChanges;
    $('#editAttachmentChangeText').textContent = hasChanges
      ? 'You have unsaved changes.'
      : 'No changes to save.';
    $('#editAttachmentChangeHint').classList.toggle('is-dirty', hasChanges);
  };

  const cancelPendingDelete = () => {
    if (!pendingDelete) return;
    window.clearInterval(pendingDelete.timer);
    pendingDelete = null;
    deleteNotice.hidden = true;
    setFeedback('Attachment deletion canceled.');
  };

  const scheduleDelete = (id) => {
    if (pendingDelete) cancelPendingDelete();
    const attachment = attachments.find((item) => item.id === id);
    if (!attachment) return;
    let secondsRemaining = 10;
    $('#attachmentDeleteMessage').textContent = `${attachment.file.name} will be deleted in`;
    $('#attachmentDeleteCountdown').textContent = String(secondsRemaining);
    deleteNotice.hidden = false;
    pendingDelete = {
      id,
      timer: window.setInterval(async () => {
        secondsRemaining -= 1;
        $('#attachmentDeleteCountdown').textContent = String(secondsRemaining);
        if (secondsRemaining <= 0) {
          window.clearInterval(pendingDelete.timer);
          try {await window.TmisStore.documentAction('participants',window.TmisStore.selectedId(),id,'DELETE');}
          catch(error){pendingDelete=null;deleteNotice.hidden=true;setFeedback(error.message,true);return;}
          const removeIndex = attachments.findIndex((item) => item.id === id);
          if (removeIndex >= 0) {
            const [removed] = attachments.splice(removeIndex, 1);
            URL.revokeObjectURL(removed.url);
            renderAttachments();
          }
          pendingDelete = null;
          deleteNotice.hidden = true;
          setFeedback('Attachment deleted.');
        }
      }, 1000),
    };
  };

  attachmentList.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open-attachment]');
    const editButton = event.target.closest('[data-edit-attachment]');
    const deleteButton = event.target.closest('[data-delete-attachment]');
    const stepButton = event.target.closest('[data-carousel-step]');
    if (openButton) {
      const attachment = attachments.find(
        (item) => item.id === openButton.dataset.openAttachment
      );
      if (attachment) openViewer(attachment);
    } else if (editButton) {
      openEdit(editButton.dataset.editAttachment);
    } else if (deleteButton) {
      scheduleDelete(deleteButton.dataset.deleteAttachment);
    } else if (stepButton && attachments.length > getVisibleAttachmentCount()) {
      carouselIndex = Math.min(
        Math.max(carouselIndex + Number(stepButton.dataset.carouselStep), 0),
        attachments.length - getVisibleAttachmentCount()
      );
      renderAttachments();
    }
  });

  $('#addAttachmentForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#attachmentFiles');
    const files = Array.from(input.files || []);
    if (!files.length) {
      const message = 'Choose at least one image or PDF file to stage.';
      $('#uploadAttachmentFeedback').textContent = message;
      notifyAttachment('Unable to stage files', message, true);
      return;
    }
    const unsupported = files.find(
      (file) =>
        !/^image\/(jpeg|png)$/i.test(file.type) &&
        file.type !== 'application/pdf' &&
        !/\.(jpe?g|png|pdf)$/i.test(file.name)
    );
    if (unsupported) {
      const message = `${unsupported.name} is not a supported image or PDF.`;
      $('#uploadAttachmentFeedback').textContent = message;
      notifyAttachment('Unsupported file', message, true);
      return;
    }
    $('#uploadAttachmentFeedback').textContent = '';
    const newStagedFiles = [];
    try {
      files.forEach((file) => {
        newStagedFiles.push({
          id: createId(),
          file,
          url: URL.createObjectURL(file),
          type: '',
          year: '',
          remarks: '',
        });
      });
      stagedFiles.push(...newStagedFiles);
      renderQueue();
    } catch (error) {
      const stagedIds = new Set(newStagedFiles.map((staged) => staged.id));
      for (let index = stagedFiles.length - 1; index >= 0; index -= 1) {
        if (stagedIds.has(stagedFiles[index].id)) stagedFiles.splice(index, 1);
      }
      newStagedFiles.forEach((staged) => URL.revokeObjectURL(staged.url));
      console.error('Unable to stage attachment files.', error);
      const message = 'An error occurred while staging files. Please try again.';
      $('#uploadAttachmentFeedback').textContent = message;
      notifyAttachment('Unable to stage files', message, true);
      return;
    }
    input.value = '';
    const message = `${files.length} ${files.length === 1 ? 'file was' : 'files were'} added to the upload queue. Add a type and year for each file.`;
    setFeedback(message);
    notifyAttachment('Files staged', message);
    uploadModal.hide();
    window.setTimeout(() => {
      $('#attachmentQueueSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
      queueBody.querySelector('[data-queue-field="type"]')?.focus({ preventScroll: true });
    }, 250);
  });

  queueBody.addEventListener('input', (event) => {
    const row = event.target.closest('[data-queue-row]');
    if (row && event.target.matches('[data-queue-field]')) updateQueueRow(row);
  });
  queueBody.addEventListener('change', (event) => {
    const row = event.target.closest('[data-queue-row]');
    if (row && event.target.matches('[data-queue-field]')) updateQueueRow(row);
  });
  queueBody.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-queued]');
    const previewButton = event.target.closest('[data-queue-preview]');
    if (removeButton) {
      const index = stagedFiles.findIndex(
        (file) => file.id === removeButton.dataset.removeQueued
      );
      if (index >= 0) {
        const [removed] = stagedFiles.splice(index, 1);
        URL.revokeObjectURL(removed.url);
        renderQueue();
        setFeedback('File removed from the upload queue.');
      }
    } else if (previewButton) {
      const attachment = stagedFiles.find(
        (file) => file.id === previewButton.dataset.queuePreview
      );
      if (attachment) openViewer(attachment, stagedFiles);
    }
  });

  saveButton.addEventListener('click', async () => {
    const readyFiles = stagedFiles.filter(isReadyToSave);
    if (!readyFiles.length) {
      setFeedback('Choose a type and year for at least one queued file before saving.', true);
      return;
    }
    try {
      attachments.push(
        ...readyFiles.map((staged) => ({
          ...staged,
          remarks: staged.remarks.trim(),
        }))
      );
      const readyIds = new Set(readyFiles.map((staged) => staged.id));
      for (let index = stagedFiles.length - 1; index >= 0; index -= 1) {
        if (readyIds.has(stagedFiles[index].id)) stagedFiles.splice(index, 1);
      }
      carouselIndex = Math.max(
        0,
        attachments.length - getVisibleAttachmentCount()
      );
      renderQueue();
      renderAttachments();
      const remainingCount = stagedFiles.length;
      const message = remainingCount
        ? `${readyFiles.length} ${readyFiles.length === 1 ? 'attachment was' : 'attachments were'} saved. ${remainingCount} incomplete ${remainingCount === 1 ? 'file remains' : 'files remain'} in the queue.`
        : `${readyFiles.length} ${readyFiles.length === 1 ? 'attachment was' : 'attachments were'} saved to the document library.`;
      setFeedback(message);
      notifyAttachment('Attachments saved', message);
    } catch (error) {
      console.error('Unable to save staged attachments.', error);
      const message = 'An error occurred while saving attachments. Please try again.';
      setFeedback(message, true);
      notifyAttachment('Unable to save attachments', message, true);
    }
  });

  $('#editAttachmentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const attachment = attachments.find((item) => item.id === activeAttachmentId);
    if (!attachment || !editBaseline) return;
    const nextValues = {
      type: $('#editAttachmentType').value,
      year: $('#editAttachmentYear').value,
      remarks: $('#editAttachmentRemarks').value.trim(),
    };
    const hasChanges =
      nextValues.type !== editBaseline.type ||
      nextValues.year !== editBaseline.year ||
      nextValues.remarks !== editBaseline.remarks;
    if (!hasChanges) {
      updateEditFormState();
      return;
    }
    if(window.TMIS_PAGE)await window.TmisStore.documentAction('participants',window.TmisStore.selectedId(),attachment.id,'PATCH',{kind:nextValues.type,year:nextValues.year||null,remarks:nextValues.remarks||''});
    attachment.type = nextValues.type;
    attachment.year = nextValues.year;
    attachment.remarks = nextValues.remarks;
    const editedIndex = attachments.indexOf(attachment);
    const visibleCount = getVisibleAttachmentCount();
    if (editedIndex < carouselIndex) carouselIndex = editedIndex;
    if (editedIndex >= carouselIndex + visibleCount) {
      carouselIndex = editedIndex - visibleCount + 1;
    }
    renderAttachments();
    editModal.hide();
    setFeedback('Attachment details saved.');
  });
  $('#editAttachmentForm').addEventListener('input', updateEditFormState);
  $('#editAttachmentForm').addEventListener('change', updateEditFormState);

  $('#cancelAttachmentDelete').addEventListener('click', cancelPendingDelete);
  viewerModalElement.addEventListener('click', (event) => {
    const id = activeAttachmentId;
    if (event.target.closest('#viewerPrevious') && viewerCollection.length > 1) {
      const index = viewerCollection.findIndex((item) => item.id === id);
      activeAttachmentId =
        viewerCollection[(index - 1 + viewerCollection.length) % viewerCollection.length].id;
      renderViewer();
    } else if (event.target.closest('#viewerNext') && viewerCollection.length > 1) {
      const index = viewerCollection.findIndex((item) => item.id === id);
      activeAttachmentId = viewerCollection[(index + 1) % viewerCollection.length].id;
      renderViewer();
    } else if (event.target.closest('#viewerZoomIn')) {
      viewerScale = Math.min(viewerScale + 0.25, 4);
      $('#attachmentViewerImage').style.transform = `scale(${viewerScale})`;
      $('#attachmentViewerPdf').style.transform = `scale(${viewerScale})`;
    } else if (event.target.closest('#viewerZoomOut')) {
      viewerScale = Math.max(viewerScale - 0.25, 0.5);
      $('#attachmentViewerImage').style.transform = `scale(${viewerScale})`;
      $('#attachmentViewerPdf').style.transform = `scale(${viewerScale})`;
    } else if (event.target.closest('#viewerReset')) {
      viewerScale = 1;
      $('#attachmentViewerStage').scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      $('#attachmentViewerImage').style.transform = 'scale(1)';
      $('#attachmentViewerPdf').style.transform = 'scale(1)';
    } else if (event.target.closest('#viewerDownload')) {
      const button = event.target.closest('#viewerDownload');
      const link = document.createElement('a');
      link.href = button.dataset.url;
      link.download = button.dataset.filename;
      document.body.append(link);
      link.click();
      link.remove();
    } else if (event.target.closest('#viewerOpenNewTab')) {
      window.open(
        event.target.closest('#viewerOpenNewTab').dataset.url,
        '_blank',
        'noopener,noreferrer'
      );
    } else if (event.target.closest('#viewerEdit')) {
      editAfterViewerClose = true;
      viewerModal.hide();
    } else if (event.target.closest('#viewerDelete')) {
      viewerModal.hide();
      scheduleDelete(id);
    }
  });
  viewerModalElement.addEventListener('hidden.bs.modal', () => {
    $('#attachmentViewerImage').removeAttribute('src');
    $('#attachmentViewerPdf').removeAttribute('src');
    if (editAfterViewerClose) {
      editAfterViewerClose = false;
      openEdit(activeAttachmentId);
    }
  });

  $('#addDocumentModal').addEventListener('hidden.bs.modal', () => {
    $('#addAttachmentForm').reset();
  });
  $('#attachmentFiles').addEventListener('change', () => {
    $('#uploadAttachmentFeedback').textContent = '';
    setFeedback('');
  });
  setYearOptions($('#editAttachmentYear'));
  renderQueue();
  renderAttachments();
  let attachmentResizeTimer;
  window.addEventListener('resize', () => {
    window.clearTimeout(attachmentResizeTimer);
    attachmentResizeTimer = window.setTimeout(renderAttachments, 100);
  });
});
