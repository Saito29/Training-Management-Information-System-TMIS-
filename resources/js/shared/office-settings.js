/* Office creation uses the same authorized database endpoint and shared toast as other settings. */
document.addEventListener('DOMContentLoaded',()=>{
  const form=document.querySelector('#officeRegistration');if(!form)return;
  const region=form.elements.region_id,button=form.querySelector('[type="submit"]');
  let saving=false, page=1, editing=null, sortField='name', sortDirection='asc';
  const cancel=form.querySelector('[data-office-cancel]');
  function resetEdit(){editing=null;region.disabled=false;cancel.hidden=true;form.querySelector('[data-office-save-label]').textContent='Create office';form.elements.name.value='';form.elements.details.value='';}
  const offices=JSON.parse(document.querySelector('#registeredOfficesData').textContent);
  const search=document.querySelector('#registeredOfficeSearch'),filter=document.querySelector('#officeFilterRegion'),size=document.querySelector('#officePageSize');
  const previous=document.querySelector('[data-office-previous]'),next=document.querySelector('[data-office-next]');
  const deleteModalElement=document.querySelector('#settingsDeleteModal');
  function confirmDelete(recordName) {
    const modal=bootstrap.Modal.getOrCreateInstance(deleteModalElement);
    deleteModalElement.querySelector('[data-settings-delete-record]').textContent='“'+recordName+'” will be permanently removed from the office directory.';
    return new Promise(resolve=>{
      const confirmButton=deleteModalElement.querySelector('[data-settings-delete-confirm]');
      const finish=value=>{confirmButton.removeEventListener('click',onConfirm);deleteModalElement.removeEventListener('hidden.bs.modal',onDismiss);resolve(value);};
      const onConfirm=()=>{finish(true);modal.hide();};
      const onDismiss=()=>finish(false);
      confirmButton.addEventListener('click',onConfirm,{once:true});deleteModalElement.addEventListener('hidden.bs.modal',onDismiss,{once:true});modal.show();
    });
  }
  const regionName=id=>offices.find(office=>String(office.region_id)===String(id))?.region_name||[...region.options].find(option=>option.value===String(id))?.textContent||'Inactive region';
  // Render sortable office records and their account/training coverage summaries.
  function render() {
    const query=search.value.trim().toLocaleLowerCase('en-PH');
    const filtered=offices.filter(office=>(!filter.value||String(office.region_id)===filter.value)&&[office.org_id,office.name,regionName(office.region_id),office.details||''].join(' ').toLocaleLowerCase('en-PH').includes(query));
    const sortValues={org_id:office=>Number(office.org_id),name:office=>office.name,region:office=>regionName(office.region_id),account_count:office=>Number(office.account_count||0),training_count:office=>Number(office.training_count||0),updated_at:office=>office.updated_at||''};
    const sortValue=sortValues[sortField]||sortValues.name;
    filtered.sort((left,right)=>{
      const first=sortValue(left),second=sortValue(right);
      const comparison=typeof first==='number'&&typeof second==='number'?first-second:String(first).localeCompare(String(second),'en-PH',{numeric:true,sensitivity:'base'});
      return sortDirection==='asc'?comparison:-comparison;
    });
    document.querySelectorAll('[data-office-sort]').forEach(control=>{
      const selected=control.dataset.officeSort===sortField;control.closest('th')?.setAttribute('aria-sort',selected?(sortDirection==='asc'?'ascending':'descending'):'none');
      const icon=control.querySelector('i');if(icon)icon.className='bi '+(selected?(sortDirection==='asc'?'bi-sort-up':'bi-sort-down'):'bi-arrow-down-up');
    });
    document.querySelector('[data-office-stat-total]').textContent=offices.length;
    document.querySelector('[data-office-stat-regions]').textContent=new Set(offices.map(office=>String(office.region_id))).size;
    document.querySelector('[data-office-stat-accounts]').textContent=offices.reduce((total,office)=>total+Number(office.account_count||0),0);
    document.querySelector('[data-office-stat-trainings]').textContent=offices.reduce((total,office)=>total+Number(office.training_count||0),0);
    const count=Number(size.value),pages=Math.max(1,Math.ceil(filtered.length/count));
    page=Math.max(1,Math.min(page,pages));
    const start=(page-1)*count,body=document.querySelector('[data-office-rows]');body.replaceChildren();
    for(const office of filtered.slice(start,start+count)) {
      const row=document.createElement('tr');
      const actions=document.createElement('td');actions.className='directory-row-actions';
      for(const action of ['edit','delete']){const control=document.createElement('button');control.type='button';control.className='btn directory-icon-action '+(action==='edit'?'is-edit':'is-delete');control.dataset.officeAction=action;control.dataset.officeId=office.org_id;control.title=action==='edit'?'Edit '+office.name:'Delete '+office.name;control.setAttribute('aria-label',control.title);const icon=document.createElement('i');icon.className='bi '+(action==='edit'?'bi-pencil-square':'bi-trash3');icon.setAttribute('aria-hidden','true');control.append(icon);actions.append(control);}row.append(actions);
      const id=document.createElement('td');id.className='directory-id';id.textContent='#'+office.org_id;row.append(id);
      const name=document.createElement('td');name.className='directory-primary-cell';const nameText=document.createElement('strong');nameText.textContent=office.name;const sub=document.createElement('small');sub.textContent='Regional office';name.append(nameText,sub);row.append(name);
      const regionCell=document.createElement('td');regionCell.textContent=regionName(office.region_id);row.append(regionCell);
      const accounts=document.createElement('td');accounts.append(makeCount(office.account_count,'account'));row.append(accounts);
      const trainings=document.createElement('td');trainings.append(makeCount(office.training_count,'training'));row.append(trainings);
      const details=document.createElement('td');details.className='directory-details-cell';details.textContent=office.details||'No details provided';row.append(details);
      const updated=document.createElement('td');updated.className='directory-date';updated.textContent=office.updated_at?formatDirectoryDate(office.updated_at):'Not recorded';row.append(updated);
      const status=document.createElement('td');const badge=document.createElement('span');badge.className='directory-status '+(office.is_active?'is-active':'is-inactive');badge.textContent=office.is_active?'Active':'Inactive';status.append(badge);row.append(status);
      body.append(row);
    }
    if(!filtered.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=9;cell.className='directory-empty';cell.textContent=offices.length?'No offices match your search or region filter.':'No offices registered yet.';row.append(cell);body.append(row);}
    document.querySelector('[data-office-summary]').textContent=filtered.length?'Showing '+(start+1)+'-'+Math.min(start+count,filtered.length)+' of '+filtered.length+' matching offices; '+offices.length+' total':'Showing 0 of '+offices.length+' offices';
    document.querySelector('[data-office-page]').textContent='Page '+page+' of '+pages;
    previous.disabled=page===1;next.disabled=page===pages;
  }
  // Format UTC database timestamps in the interface's fixed Philippine timezone.
  function formatDirectoryDate(value){const normalized=value.endsWith('Z')||/[+-]\d\d:\d\d$/.test(value)?value:`${value.replace(' ','T')}Z`;return new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeZone:'Asia/Manila'}).format(new Date(normalized));}
  // Keep count columns visually consistent while retaining a text label for screen readers.
  function makeCount(value,label){const badge=document.createElement('span');badge.className='directory-count-badge';badge.textContent=Number(value||0).toLocaleString('en-PH');badge.setAttribute('aria-label',`${badge.textContent} ${label}${Number(value||0)===1?'':'s'}`);return badge;}
  for(const [control,event]of [[search,'input'],[filter,'change'],[size,'change']])control.addEventListener(event,()=>{page=1;render();});
  previous.addEventListener('click',()=>{page--;render();});next.addEventListener('click',()=>{page++;render();});
  document.querySelectorAll('[data-office-sort]').forEach(control=>control.addEventListener('click',()=>{const nextField=control.dataset.officeSort;sortDirection=sortField===nextField&&sortDirection==='asc'?'desc':'asc';sortField=nextField;page=1;render();}));
  render();
  window.addEventListener('tmis:regions-updated',event=>{
    const selected=region.value;
    region.replaceChildren(new Option('Select a region',''),...event.detail.map(row=>new Option(row.name,String(row.region_id))));
    region.value=selected;
    const selectedFilter=filter.value;filter.replaceChildren(new Option('All regions',''),...event.detail.map(row=>new Option(row.name,String(row.region_id))));filter.value=selectedFilter;render();
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving||!form.reportValidity())return;
    saving=true;button.disabled=true;button.setAttribute('aria-busy','true');
    try {
      const result=await window.TmisStore.request(editing?form.action+'/'+editing.org_id:form.action,editing?Object.fromEntries(new FormData(form)):new FormData(form),editing?'PATCH':'POST');
      if(!result.office)throw new Error('The server did not return the saved office.');
      const index=offices.findIndex(office=>office.org_id===result.office.org_id);
      if(index<0){result.office.account_count=0;result.office.training_count=0;result.office.region_name=regionName(result.office.region_id);offices.push(result.office);}
      else{result.office.account_count=offices[index].account_count;result.office.training_count=offices[index].training_count;result.office.region_name=offices[index].region_name;result.office.region_is_active=offices[index].region_is_active;offices[index]=result.office;}
      resetEdit();
      // Reveal the saved office even when previous search criteria would hide it.
      search.value='';filter.value=String(result.office.region_id);page=Math.ceil(offices.filter(office=>String(office.region_id)===filter.value).length/Number(size.value))||1;
      render();
      form.elements.name.value='';form.elements.details.value='';
      if(window.TMIS_PAGE?.offices){const list=window.TMIS_PAGE.offices;const index=list.findIndex(office=>office.org_id===result.office.org_id);if(index<0)list.push(result.office);else list[index]=result.office;}
      window.TmisToast?.show(result.message,'success');
    } catch(error){window.TmisToast?.show(error.message||'Unable to create the office.','error');}
    finally {saving=false;button.disabled=false;button.removeAttribute('aria-busy');}
  });
  cancel.addEventListener('click',()=>{resetEdit();window.dispatchEvent(new Event('tmis:data-updated'));});
  document.querySelector('[data-office-rows]').addEventListener('click',async event=>{
    const control=event.target.closest('[data-office-action]');if(!control||saving)return;
    const office=offices.find(row=>String(row.org_id)===control.dataset.officeId);if(!office)return;
    if(control.dataset.officeAction==='edit'){
      editing=office;region.value=String(office.region_id);region.disabled=true;form.elements.name.value=office.name;form.elements.details.value=office.details||'';cancel.hidden=false;form.querySelector('[data-office-save-label]').textContent='Update office';form.scrollIntoView({block:'start',behavior:'smooth'});form.elements.name.focus();window.dispatchEvent(new Event('tmis:data-updated'));return;
    }
    if(!await confirmDelete(office.name))return;
    saving=true;control.disabled=true;
    try{const result=await window.TmisStore.request(form.action+'/'+office.org_id,{},'DELETE');offices.splice(offices.indexOf(office),1);if(editing?.org_id===office.org_id)resetEdit();render();window.TmisToast?.show(result.message,'success');}
    catch(error){window.TmisToast?.show(error.message,'error');}
    finally{saving=false;control.disabled=false;}
  });

});
