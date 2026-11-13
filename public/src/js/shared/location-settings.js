/* The server authorizes every mutation and preserves the stored parent hierarchy. */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#locationRegistration');
  if (!form) return;
  let rows = JSON.parse(document.querySelector('#registeredLocations').textContent);
  let regions = JSON.parse(document.querySelector('#registeredRegions').textContent).map(row=>({...row,kind:'region'}));
  const kind=form.elements.kind, region=form.elements.region_id, parent=form.elements.parent_id;
  const button=form.querySelector('[type="submit"]'), cancel=form.querySelector('[data-location-cancel]');
  const importForm=document.querySelector('[data-location-import-form]');
  const importModal=document.querySelector('#locationImportModal');
  const importButton=document.querySelector('[data-location-import-submit]');
  const importClose=document.querySelector('[data-location-import-close]');
  const importFeedback=document.querySelector('#locationImportFeedback');
  let editing=null, saving=false;
  let reloadAfterImport=false;
  const idOf = row => String(row.kind==='region' ? row.region_id : row.id);
  const find = (type,id) => (type==='region'?regions:rows).find(row=>row.kind===type&&idOf(row)===String(id));
  const search=document.querySelector('#registeredLocationSearch'),filterRegion=document.querySelector('#registeredLocationRegion'),filterDistrict=document.querySelector('#registeredLocationDistrict'),filterMunicipality=document.querySelector('#registeredLocationMunicipality'),pageSize=document.querySelector('#registeredLocationPageSize');
  const previous=document.querySelector('[data-location-previous]'),next=document.querySelector('[data-location-next]');
  const deleteModalElement=document.querySelector('#settingsDeleteModal');
  importModal.addEventListener('hidden.bs.modal',()=>{if(reloadAfterImport)window.location.reload();});
  importForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!importForm.reportValidity()||importButton.disabled)return;
    importButton.disabled=true;
    importButton.setAttribute('aria-busy','true');
    importFeedback.hidden=true;
    try {
      const response=await fetch(importForm.action,{method:'POST',credentials:'same-origin',headers:{Accept:'application/json','X-CSRF-TOKEN':importForm.querySelector('[name="_token"]').value},body:new FormData(importForm)});
      const result=await response.json().catch(()=>null);
      if(response.redirected)throw new Error('Your session expired. Sign in again.');
      if(!response.ok||!result)throw new Error(Object.values(result?.errors||{}).flat()[0]||result?.message||'Unable to import the location workbook.');
      importFeedback.className='alert alert-success mt-3 mb-0';
      importFeedback.textContent=result.message;
      importFeedback.setAttribute('role','status');
      importFeedback.hidden=false;
      importButton.hidden=true;
      importClose.textContent='Close and refresh';
      reloadAfterImport=true;
    } catch(error) {
      importFeedback.className='alert alert-danger mt-3 mb-0';
      importFeedback.textContent=error.message||'Unable to import the location workbook.';
      importFeedback.setAttribute('role','alert');
      importFeedback.hidden=false;
      window.TmisToast?.show(importFeedback.textContent,'error');
    } finally {
      importButton.disabled=false;
      importButton.removeAttribute('aria-busy');
    }
  });
  function confirmDelete(recordName) {
    const modal=bootstrap.Modal.getOrCreateInstance(deleteModalElement);
    deleteModalElement.querySelector('[data-settings-delete-record]').textContent='“'+recordName+'” will be permanently removed from the location directory.';
    return new Promise(resolve=>{
      const confirmButton=deleteModalElement.querySelector('[data-settings-delete-confirm]');
      const finish=value=>{confirmButton.removeEventListener('click',onConfirm);deleteModalElement.removeEventListener('hidden.bs.modal',onDismiss);resolve(value);};
      const onConfirm=()=>{finish(true);modal.hide();};
      const onDismiss=()=>finish(false);
      confirmButton.addEventListener('click',onConfirm,{once:true});deleteModalElement.addEventListener('hidden.bs.modal',onDismiss,{once:true});modal.show();
    });
  }
  let page=1,sortField='name',sortDirection='asc';
  function beneath(location,id) {
    let current=location;
    const seen=new Set();
    while(current&&current.kind!=='region'&&!seen.has(current.id)) {
      if(String(current.id)===String(id))return true;
      seen.add(current.id);current=rows.find(row=>String(row.id)===String(current.parent_id));
    }
    return false;
  }
  function filterOptions() {
    const fill=(select,choices,label,idKey='id')=>{
      const selected=select.value;
      select.replaceChildren(new Option(label,''),...choices.map(row=>new Option([row.name,idKey==='id'?rows.find(item=>item.id===row.parent_id)?.name:null].filter(Boolean).join(' - '),String(row[idKey]))));
      if(choices.some(row=>String(row[idKey])===selected))select.value=selected;
    };
    fill(filterRegion,regions,'All regions','region_id');
    const scoped=rows.filter(row=>!filterRegion.value||String(row.region_id)===filterRegion.value);
    fill(filterDistrict,scoped.filter(row=>row.kind==='district'),'All districts');
    fill(filterMunicipality,scoped.filter(row=>row.kind==='municipality'&&(!filterDistrict.value||beneath(row,filterDistrict.value))),'All municipalities / cities');
  }
  for(const control of [filterRegion,filterDistrict])control.addEventListener('change',()=>{filterMunicipality.value='';if(control===filterRegion)filterDistrict.value='';filterOptions();page=1;renderTable();});
  filterMunicipality.addEventListener('change',()=>{page=1;renderTable();});
  search.addEventListener('input',()=>{page=1;renderTable();});pageSize.addEventListener('change',()=>{page=1;renderTable();});
  previous.addEventListener('click',()=>{page--;renderTable();});next.addEventListener('click',()=>{page++;renderTable();});
  document.querySelectorAll('[data-location-sort]').forEach(button=>button.addEventListener('click',()=>{
    const nextField=button.dataset.locationSort;
    sortDirection=sortField===nextField&&sortDirection==='asc'?'desc':'asc';sortField=nextField;page=1;renderTable();
  }));
  function sync() {
    const selectedParent=parent.value, parentKind={district:'province',municipality:'district',barangay:'municipality'}[kind.value];
    const needsRegion=kind.value!=='region';
    kind.disabled=Boolean(editing);
    region.disabled=!needsRegion||Boolean(editing); region.required=needsRegion;
    form.querySelector('[data-location-region]').hidden=!needsRegion;
    parent.disabled=!parentKind||Boolean(editing); parent.required=Boolean(parentKind);
    form.querySelector('[data-location-parent]').hidden=!parentKind;
    form.elements.name.maxLength=kind.value==='region'?64:150;
    const options=rows.filter(row=>row.kind===parentKind&&row.is_active&&String(row.region_id)===region.value);
    parent.replaceChildren(new Option(options.length?'Select a '+parentKind:'No parent locations available',''),...options.map(row=>new Option([row.name,rows.find(item=>item.id===row.parent_id)?.name].filter(Boolean).join(' - '),row.id)));
    if(options.some(row=>String(row.id)===selectedParent))parent.value=selectedParent;
    cancel.hidden=!editing;
    form.querySelector('[data-location-submit-label]').textContent=editing?'Update location':'Create location';
  }
  // Refresh location summaries, linked filters, and the hierarchy table after saved changes.
  function render() {
    const selectedRegion=region.value;
    const activeRegions=regions.filter(row=>row.is_active);
    region.replaceChildren(new Option('Select a region',''),...activeRegions.map(row=>new Option(row.name,String(row.region_id))));
    region.value=selectedRegion;
    filterOptions();renderTable();
    document.querySelector('[data-location-count]').textContent=regions.length+' regions and '+rows.length+' subregion records.';
    document.querySelector('[data-location-stat-total]').textContent=regions.length+rows.length;
    document.querySelector('[data-location-stat-active]').textContent=regions.filter(row=>row.is_active).length+rows.filter(row=>row.is_active).length;
    document.querySelector('[data-location-stat-regions]').textContent=regions.length;
    document.querySelector('[data-location-stat-subregions]').textContent=rows.length;
    sync();window.dispatchEvent(new Event('tmis:data-updated'));window.dispatchEvent(new CustomEvent('tmis:regions-updated',{detail:activeRegions}));
  }
  // Render sortable, filter-aware rows with full hierarchy and state labels instead of bare names.
  function renderTable() {
    const regionName=location=>regions.find(row=>String(row.region_id)===String(location.region_id))?.name||'Inactive region';
    const parentName=location=>rows.find(row=>String(row.id)===String(location.parent_id))?.name||'Top-level region';
    // Trace parent IDs so each directory row carries its complete region-to-leaf path.
    const hierarchyPath=location=>{
      if(location.kind==='region')return 'Top-level region';
      const path=[location.name],seen=new Set();let current=location;
      while(current&&current.kind!=='region'&&!seen.has(current.id)){
        seen.add(current.id);current=rows.find(row=>String(row.id)===String(current.parent_id));
        if(current)path.unshift(current.name);
      }
      path.unshift(regionName(location));
      return path.join(' / ');
    };
    const query=search.value.trim().toLocaleLowerCase('en-PH');
    const all=[...regions,...rows];
    const filtered=all.filter(location=>(!filterRegion.value||String(location.region_id)===filterRegion.value)&&(!filterDistrict.value||beneath(location,filterDistrict.value))&&(!filterMunicipality.value||beneath(location,filterMunicipality.value))&&[location.name,location.kind,parentName(location),hierarchyPath(location),regionName(location),idOf(location)].join(' ').toLocaleLowerCase('en-PH').includes(query));
    const sortValues={id:location=>Number(idOf(location)),kind:location=>location.kind,name:location=>location.name,region:location=>regionName(location),is_active:location=>Boolean(location.is_active),updated_at:location=>location.updated_at||''};
    const sortValue=sortValues[sortField]||sortValues.name;
    filtered.sort((left,right)=>{
      const first=sortValue(left),second=sortValue(right);
      const comparison=typeof first==='number'&&typeof second==='number'?first-second:String(first).localeCompare(String(second),'en-PH',{numeric:true,sensitivity:'base'});
      return sortDirection==='asc'?comparison:-comparison;
    });
    document.querySelectorAll('[data-location-sort]').forEach(control=>{
      const selected=control.dataset.locationSort===sortField;control.closest('th')?.setAttribute('aria-sort',selected?(sortDirection==='asc'?'ascending':'descending'):'none');
      const icon=control.querySelector('i');if(icon)icon.className='bi '+(selected?(sortDirection==='asc'?'bi-sort-up':'bi-sort-down'):'bi-arrow-down-up');
    });
    const size=Number(pageSize.value),pages=Math.max(1,Math.ceil(filtered.length/size));page=Math.max(1,Math.min(page,pages));const start=(page-1)*size;
    const body=document.querySelector('[data-location-rows]');
    body.replaceChildren();
    for(const location of filtered.slice(start,start+size)) {
      const tr=document.createElement('tr');
      const actions=document.createElement('td');
      actions.className='directory-row-actions';
      for(const action of ['edit','delete']) {
        const control=document.createElement('button');control.type='button';
        control.className='btn directory-icon-action '+(action==='edit'?'is-edit':'is-delete');
        control.dataset[action==='edit'?'locationEdit':'locationDelete']=location.kind;
        control.dataset.locationId=idOf(location);control.title=action==='edit'?'Edit '+location.name:'Delete '+location.name;control.setAttribute('aria-label',control.title);
        const icon=document.createElement('i');icon.className='bi '+(action==='edit'?'bi-pencil-square':'bi-trash3');icon.setAttribute('aria-hidden','true');control.append(icon);
        actions.append(control);
      }
      tr.append(actions);
      const idCell=document.createElement('td');idCell.className='directory-id';idCell.textContent=(location.kind==='region'?'REG-':'LOC-')+idOf(location);tr.append(idCell);
      const typeCell=document.createElement('td'),typeBadge=document.createElement('span');typeBadge.className='directory-type-badge directory-type-'+location.kind;typeBadge.textContent=location.kind[0].toUpperCase()+location.kind.slice(1);typeCell.append(typeBadge);tr.append(typeCell);
      const nameCell=document.createElement('td');nameCell.className='directory-primary-cell';const name=document.createElement('strong');name.textContent=location.name;const kind=document.createElement('small');kind.textContent=location.kind==='region'?'Administrative region':'Geographic location';nameCell.append(name,kind);tr.append(nameCell);
      const hierarchyCell=document.createElement('td');hierarchyCell.className='directory-hierarchy';hierarchyCell.textContent=hierarchyPath(location);tr.append(hierarchyCell);
      const regionCell=document.createElement('td');regionCell.textContent=regionName(location);tr.append(regionCell);
      const statusCell=document.createElement('td'),status=document.createElement('span');status.className='directory-status '+(location.is_active?'is-active':'is-inactive');status.textContent=location.is_active?'Active':'Inactive';statusCell.append(status);tr.append(statusCell);
      const updatedCell=document.createElement('td');updatedCell.className='directory-date';
      const updatedValue=location.updated_at;
      updatedCell.textContent=updatedValue?new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeZone:'Asia/Manila'}).format(new Date(updatedValue.endsWith('Z')||/[+-]\d\d:\d\d$/.test(updatedValue)?updatedValue:`${updatedValue.replace(' ','T')}Z`)):'Not recorded';tr.append(updatedCell);
      body.append(tr);
    }
    if(!filtered.length){const tr=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=8;cell.className='directory-empty';cell.textContent=all.length?'No locations match your search or filters.':'No locations registered yet.';tr.append(cell);body.append(tr);}
    document.querySelector('[data-location-summary]').textContent=filtered.length?'Showing '+(start+1)+'-'+Math.min(start+size,filtered.length)+' of '+filtered.length+' matching locations; '+all.length+' total':'Showing 0 of '+all.length+' locations';
    document.querySelector('[data-location-page]').textContent='Page '+page+' of '+pages;
    previous.disabled=page===1;next.disabled=page===pages;
  }
  function resetEdit() {editing=null;form.elements.name.value='';sync();}
  async function request(url,method,data) {
    const response=await fetch(url,{method,credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json','X-CSRF-TOKEN':form.querySelector('[name="_token"]').value},body:JSON.stringify(data||{})});
    const result=await response.json().catch(()=>null);
    if(!response.ok||!result)throw new Error(Object.values(result?.errors||{}).flat()[0]||result?.message||'Unable to save the location. Please try again.');
    return result;
  }
  function busy(value) {saving=value;button.disabled=value;cancel.disabled=value;button.setAttribute('aria-busy',String(value));}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving||!form.reportValidity())return;
    busy(true);
    try {
      const target=editing;
      const result=await request(target?form.action+'/'+target.kind+'/'+idOf(target):form.action,target?'PATCH':'POST',target?{name:form.elements.name.value}:Object.fromEntries(new FormData(form)));
      if(!result.location)throw new Error('The server did not return the saved location.');
      const location=result.location, collection=location.kind==='region'?regions:rows;
      const index=collection.findIndex(row=>row.kind===location.kind&&idOf(row)===idOf(location));
      if(index<0)collection.push(location);else collection[index]=location;
      resetEdit();render();
      if(location.kind==='region')region.value=String(location.region_id);
      window.TmisToast?.show(result.message,'success');
    } catch(error) {window.TmisToast?.show(error.message,'error');}
    finally {busy(false);}
  });
  document.querySelector('#locations').addEventListener('click',async event=>{
    const control=event.target.closest('[data-location-edit],[data-location-delete]');if(!control||saving)return;
    const type=control.dataset.locationEdit||control.dataset.locationDelete;
    const location=find(type,control.dataset.locationId);if(!location)return;
    if(control.dataset.locationEdit) {
      editing=location;kind.value=type;region.value=String(location.region_id);sync();
      if(location.parent_id)parent.value=String(location.parent_id);
      form.elements.name.value=location.name;form.scrollIntoView({block:'start',behavior:'smooth'});form.elements.name.focus();
      window.dispatchEvent(new Event('tmis:data-updated'));return;
    }
    if(!await confirmDelete(location.name))return;
    busy(true);control.disabled=true;
    try {
      const result=await request(form.action+'/'+type+'/'+idOf(location),'DELETE');
      if(type==='region')regions=regions.filter(row=>idOf(row)!==idOf(location));else rows=rows.filter(row=>row.id!==location.id);
      if(editing&&editing.kind===type&&idOf(editing)===idOf(location))resetEdit();
      render();window.TmisToast?.show(result.message,'success');
    } catch(error) {window.TmisToast?.show(error.message,'error');}
    finally {busy(false);control.disabled=false;}
  });
  cancel.addEventListener('click',()=>{resetEdit();window.dispatchEvent(new Event('tmis:data-updated'));});
  kind.addEventListener('change',sync);region.addEventListener('change',sync);render();
});
