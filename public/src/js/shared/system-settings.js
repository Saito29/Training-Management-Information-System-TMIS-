/* UI state only. Existing CSRF-protected settings endpoints remain authoritative. */
document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('.settings-page');if(!root)return;
  const tabs=[...root.querySelectorAll('[data-bs-toggle="pill"]')];
  const activateHash=()=>{const tab=tabs.find(item=>item.dataset.bsTarget==='#'+location.hash.slice(1));if(tab&&window.bootstrap)bootstrap.Tab.getOrCreateInstance(tab).show();};
  activateHash();window.addEventListener('hashchange',activateHash);
  const pageAccessToggles=[...root.querySelectorAll('[data-page-access-toggle]')];
  for(const toggle of pageAccessToggles){
    const options=toggle.closest('.settings-permission-group').querySelectorAll('[data-page-access-option]');
    const updatePageOptions=()=>options.forEach(option=>{option.disabled=!toggle.checked;});
    toggle.addEventListener('change',updatePageOptions);updatePageOptions();
  }
  // Apply a category-wide switch to grants or blocks in only that permission group.
  for(const group of root.querySelectorAll('.settings-permission-group')){
    const selectAll=group.querySelector('[data-permission-select-all]');
    const permissions=[...group.querySelectorAll('input[type="checkbox"]')].filter(input=>input!==selectAll);
    if(!selectAll||permissions.length===0)continue;
    const pageAccess=group.querySelector('[data-page-access-toggle]');
    const refreshSelectAll=()=>{
      const selectedCount=permissions.filter(input=>input.checked).length;
      selectAll.checked=selectedCount===permissions.length;
      selectAll.indeterminate=selectedCount>0&&selectedCount<permissions.length;
    };
    selectAll.addEventListener('change',()=>{
      // Preserve the requested state before the page-access event refreshes this switch's indeterminate state.
      const shouldSelect=selectAll.checked;
      if(pageAccess){
        pageAccess.checked=shouldSelect;
        pageAccess.dispatchEvent(new Event('change',{bubbles:true}));
      }
      permissions.forEach(input=>{input.checked=shouldSelect;});
      refreshSelectAll();
    });
    permissions.forEach(input=>input.addEventListener('change',refreshSelectAll));
    refreshSelectAll();
  }
  const selectAll=root.querySelector('[data-super-admin-select-all]'),rowChecks=[...root.querySelectorAll('[data-super-admin-row]')];
  selectAll?.addEventListener('change',()=>rowChecks.forEach(input=>{input.checked=selectAll.checked;}));
  rowChecks.forEach(input=>input.addEventListener('change',()=>{if(selectAll){selectAll.checked=rowChecks.length>0&&rowChecks.every(row=>row.checked);selectAll.indeterminate=rowChecks.some(row=>row.checked)&&!selectAll.checked;}}));
  root.querySelectorAll('[data-super-admin-revoke]').forEach(button=>button.addEventListener('click',event=>{if(!confirm('Remove elevated Super Admin access from the selected account(s)? This does not delete their accounts.'))event.preventDefault();}));
  const regions=[...root.querySelectorAll('[name="region_ids[]"]')],offices=[...root.querySelectorAll('[name="office_ids[]"]')];
  const regionSearch=root.querySelector('[data-region-search]'),officeSearch=root.querySelector('[data-office-search]');
  const selectAllRegions=root.querySelector('[data-select-all-regions]'),selectAllOffices=root.querySelector('[data-select-all-offices]');
  function syncSelectAll(control,items){const selected=items.filter(item=>item.checked).length;control.textContent=selected===items.length&&items.length?'Clear all':'Select all';control.setAttribute('aria-pressed',String(items.length>0&&selected===items.length));}
  function filter(){
    const selected=new Set(regions.filter(item=>item.checked).map(item=>item.value));
    for(const input of regions)input.closest('label').hidden=!input.closest('label').textContent.toLowerCase().includes(regionSearch.value.trim().toLowerCase());
    const relatedOffices=offices.filter(input=>!selected.size||selected.has(input.closest('label').dataset.officeRegion));
    for(const input of offices){const row=input.closest('label'),allowed=relatedOffices.includes(input);input.disabled=!allowed;if(!allowed)input.checked=false;row.hidden=!allowed||!row.textContent.toLowerCase().includes(officeSearch.value.trim().toLowerCase());}
    root.querySelector('[data-office-scope-label]').textContent=selected.size?'Showing offices related to the selected regions':'Select regions to narrow this list';
    root.querySelector('[data-region-count]').textContent=selected.size?selected.size+' selected':'All regions';
    const officeCount=relatedOffices.filter(item=>item.checked).length;root.querySelector('[data-office-count]').textContent=officeCount?officeCount+' selected':selected.size?'All offices in selected regions':'All offices';
    syncSelectAll(selectAllRegions,regions);syncSelectAll(selectAllOffices,relatedOffices);
    root.querySelector('[data-region-empty]').hidden=regions.some(item=>!item.closest('label').hidden);
    root.querySelector('[data-office-empty]').hidden=offices.some(item=>!item.closest('label').hidden);
  }
  for(const input of [...regions,...offices])input.addEventListener('change',filter);
  regionSearch.addEventListener('input',filter);officeSearch.addEventListener('input',filter);
  selectAllRegions.addEventListener('click',()=>{const clear=regions.length>0&&regions.every(item=>item.checked);regions.forEach(item=>{item.checked=!clear;});filter();});
  selectAllOffices.addEventListener('click',()=>{const selected=new Set(regions.filter(item=>item.checked).map(item=>item.value)),related=offices.filter(item=>!selected.size||selected.has(item.closest('label').dataset.officeRegion)),clear=related.length>0&&related.every(item=>item.checked);related.forEach(item=>{item.checked=!clear;});filter();});
  root.querySelector('[data-clear-regions]').addEventListener('click',()=>{regions.forEach(item=>item.checked=false);regionSearch.value='';filter();});
  root.querySelector('[data-clear-offices]').addEventListener('click',()=>{offices.forEach(item=>item.checked=false);officeSearch.value='';filter();});
  root.querySelector('[data-refresh-office-scope]').addEventListener('click',()=>{officeSearch.value='';filter();root.querySelector('[data-office-list]').scrollTop=0;});
  const maintenance=root.querySelector('#maintenanceEnabled'),until=root.querySelector('#maintenanceUntil');
  const availability=()=>{until.disabled=!maintenance.checked;};maintenance.addEventListener('change',availability);availability();filter();

  // Keep destructive restore confirmation separate from the file-selection step.
  const restoreForm=root.querySelector('[data-database-restore]');
  const restoreModalElement=root.querySelector('#databaseRestoreConfirm');
  const restoreAcknowledgement=root.querySelector('#confirmRestore');
  const restoreConfirmButton=root.querySelector('[data-confirm-database-restore]');
  const restoreFile=root.querySelector('#backupSql');
  if(restoreForm&&restoreModalElement&&restoreAcknowledgement&&restoreConfirmButton&&window.bootstrap){
    const restoreModal=bootstrap.Modal.getOrCreateInstance(restoreModalElement);
    restoreForm.addEventListener('submit',event=>{
      if(restoreForm.dataset.restoreConfirmed==='true')return;
      event.preventDefault();
      restoreAcknowledgement.checked=false;
      restoreConfirmButton.disabled=true;
      restoreModal.show();
    });
    restoreAcknowledgement.addEventListener('change',()=>{restoreConfirmButton.disabled=!restoreAcknowledgement.checked;});
    restoreConfirmButton.addEventListener('click',()=>{
      if(!restoreAcknowledgement.checked)return;
      restoreForm.dataset.restoreConfirmed='true';
      restoreModal.hide();
      restoreForm.requestSubmit();
    });
    restoreModalElement.addEventListener('hidden.bs.modal',()=>{
      if(restoreForm.dataset.restoreConfirmed!=='true')restoreForm.querySelector('#backupSql').focus();
    });
    restoreFile.addEventListener('change',()=>{
      const selectedFile=restoreFile.files?.[0];
      const status=root.querySelector('[data-backup-selected-file]');
      status.textContent=selectedFile?`${selectedFile.name} · ${(selectedFile.size/1024/1024).toFixed(2)} MB`:'No backup selected';
      restoreForm.dataset.restoreConfirmed='false';
    });
  }

  // Show selected SQL filenames before the user submits an import.
  const legacyFile=root.querySelector('#legacySql');
  if(legacyFile){
    legacyFile.addEventListener('change',()=>{
      const selectedFile=legacyFile.files?.[0];
      root.querySelector('[data-legacy-selected-file]').textContent=selectedFile?`${selectedFile.name} · ${(selectedFile.size/1024/1024).toFixed(2)} MB`:'No export selected';
    });
  }

  // Preview branding uploads so administrators can confirm each replacement before saving.
  root.querySelectorAll('[data-branding-file]').forEach(input=>{
    const preview=root.querySelector(`[data-branding-preview="${input.id}"]`);
    if(preview){preview.dataset.savedImageUrl=preview.src;}
    input.addEventListener('change',()=>{
      const selectedFile=input.files?.[0];
      const status=root.querySelector(`[data-branding-selected-file="${input.id}"]`);
      if(!status)return;
      const assetLabel={systemLogo:'logo',systemFavicon:'favicon',dashboardImage:'dashboard picture'}[input.id]??'image';
      status.textContent=selectedFile?`${selectedFile.name} · ${(selectedFile.size/1024/1024).toFixed(2)} MB`:`No ${assetLabel} selected. The current file will be kept.`;
      if(!preview)return;
      if(input.dataset.previewObjectUrl)URL.revokeObjectURL(input.dataset.previewObjectUrl);
      if(selectedFile){
        input.dataset.previewObjectUrl=URL.createObjectURL(selectedFile);
        preview.src=input.dataset.previewObjectUrl;
      }else{
        delete input.dataset.previewObjectUrl;
        preview.src=preview.dataset.savedImageUrl??preview.src;
      }
    });
  });
});
