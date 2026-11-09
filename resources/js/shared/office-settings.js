/* Office creation uses the same authorized database endpoint and shared toast as other settings. */
document.addEventListener('DOMContentLoaded',()=>{
  const form=document.querySelector('#officeRegistration');if(!form)return;
  const region=form.elements.region_id,button=form.querySelector('[type="submit"]');
  let saving=false, page=1, editing=null;
  const cancel=form.querySelector('[data-office-cancel]');
  function resetEdit(){editing=null;region.disabled=false;cancel.hidden=true;form.querySelector('[data-office-save-label]').textContent='Create office';form.elements.name.value='';form.elements.details.value='';}
  const offices=JSON.parse(document.querySelector('#registeredOfficesData').textContent);
  const search=document.querySelector('#registeredOfficeSearch'),filter=document.querySelector('#officeFilterRegion'),size=document.querySelector('#officePageSize');
  const previous=document.querySelector('[data-office-previous]'),next=document.querySelector('[data-office-next]');
  const regionName=id=>[...region.options].find(option=>option.value===String(id))?.textContent||'Inactive region';
  function render() {
    const query=search.value.trim().toLocaleLowerCase('en-PH');
    const filtered=offices.filter(office=>(!filter.value||String(office.region_id)===filter.value)&&[office.name,regionName(office.region_id),office.details||''].join(' ').toLocaleLowerCase('en-PH').includes(query));
    const count=Number(size.value),pages=Math.max(1,Math.ceil(filtered.length/count));
    page=Math.max(1,Math.min(page,pages));
    const start=(page-1)*count,body=document.querySelector('[data-office-rows]');body.replaceChildren();
    for(const office of filtered.slice(start,start+count)) {
      const row=document.createElement('tr');
      for(const value of [office.name,regionName(office.region_id),office.details||'-']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
      const actions=document.createElement('td');
      for(const action of ['edit','delete']){const control=document.createElement('button');control.type='button';control.className='btn btn-sm me-1 btn-outline-'+(action==='edit'?'primary':'danger');control.dataset.officeAction=action;control.dataset.officeId=office.org_id;control.textContent=action==='edit'?'Edit':'Delete';actions.append(control);}row.append(actions);
      body.append(row);
    }
    if(!filtered.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=4;cell.className='text-center py-4';cell.textContent=offices.length?'No offices match your search or region filter.':'No offices registered yet.';row.append(cell);body.append(row);}
    document.querySelector('[data-office-summary]').textContent=filtered.length?'Showing '+(start+1)+'-'+Math.min(start+count,filtered.length)+' of '+filtered.length+' offices'+(filtered.length!==offices.length?' ('+offices.length+' total)':''):'Showing 0 of '+offices.length+' offices';
    document.querySelector('[data-office-page]').textContent='Page '+page+' of '+pages;
    previous.disabled=page===1;next.disabled=page===pages;
  }
  for(const [control,event]of [[search,'input'],[filter,'change'],[size,'change']])control.addEventListener(event,()=>{page=1;render();});
  previous.addEventListener('click',()=>{page--;render();});next.addEventListener('click',()=>{page++;render();});
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
      const index=offices.findIndex(office=>office.org_id===result.office.org_id);if(index<0)offices.push(result.office);else offices[index]=result.office;
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
    if(!confirm('Delete "'+office.name+'"? This cannot be undone.'))return;
    saving=true;control.disabled=true;
    try{const result=await window.TmisStore.request(form.action+'/'+office.org_id,{},'DELETE');offices.splice(offices.indexOf(office),1);if(editing?.org_id===office.org_id)resetEdit();render();window.TmisToast?.show(result.message,'success');}
    catch(error){window.TmisToast?.show(error.message,'error');}
    finally{saving=false;control.disabled=false;}
  });

});
