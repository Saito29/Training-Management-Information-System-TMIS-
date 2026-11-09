/* The server authorizes every mutation and preserves the stored parent hierarchy. */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#locationRegistration');
  if (!form) return;
  let rows = JSON.parse(document.querySelector('#registeredLocations').textContent);
  let regions = [...form.elements.region_id.options].filter(option => option.value).map(option => ({region_id:Number(option.value), name:option.textContent, kind:'region'}));
  const kind=form.elements.kind, region=form.elements.region_id, parent=form.elements.parent_id;
  const button=form.querySelector('[type="submit"]'), cancel=form.querySelector('[data-location-cancel]');
  let editing=null, saving=false;
  const idOf = row => String(row.kind==='region' ? row.region_id : row.id);
  const find = (type,id) => (type==='region'?regions:rows).find(row=>row.kind===type&&idOf(row)===String(id));
  const search=document.querySelector('#registeredLocationSearch'),filterRegion=document.querySelector('#registeredLocationRegion'),filterDistrict=document.querySelector('#registeredLocationDistrict'),filterMunicipality=document.querySelector('#registeredLocationMunicipality'),pageSize=document.querySelector('#registeredLocationPageSize');
  const previous=document.querySelector('[data-location-previous]'),next=document.querySelector('[data-location-next]');
  let page=1;
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
  function render() {
    const selectedRegion=region.value;
    region.replaceChildren(new Option('Select a region',''),...regions.map(row=>new Option(row.name,String(row.region_id))));
    region.value=selectedRegion;
    filterOptions();renderTable();
    document.querySelector('[data-location-count]').textContent=regions.length+' active regions and '+rows.length+' geographic records.';
    sync();window.dispatchEvent(new Event('tmis:data-updated'));window.dispatchEvent(new CustomEvent('tmis:regions-updated',{detail:regions}));
  }
  function renderTable() {
    const regionName=location=>regions.find(row=>String(row.region_id)===String(location.region_id))?.name||'Inactive region';
    const parentName=location=>rows.find(row=>String(row.id)===String(location.parent_id))?.name||'Region';
    const query=search.value.trim().toLocaleLowerCase('en-PH');
    const all=[...regions,...rows];
    const filtered=all.filter(location=>(!filterRegion.value||String(location.region_id)===filterRegion.value)&&(!filterDistrict.value||beneath(location,filterDistrict.value))&&(!filterMunicipality.value||beneath(location,filterMunicipality.value))&&[location.name,location.kind,parentName(location),regionName(location)].join(' ').toLocaleLowerCase('en-PH').includes(query));
    const size=Number(pageSize.value),pages=Math.max(1,Math.ceil(filtered.length/size));page=Math.max(1,Math.min(page,pages));const start=(page-1)*size;
    const body=document.querySelector('[data-location-rows]');
    body.replaceChildren();
    for(const location of filtered.slice(start,start+size)) {
      const tr=document.createElement('tr');
      const parentName=rows.find(row=>String(row.id)===String(location.parent_id))?.name||'Region';
      const regionName=regions.find(row=>String(row.region_id)===String(location.region_id))?.name||'Inactive region';
      for(const value of [location.name,location.kind[0].toUpperCase()+location.kind.slice(1),location.kind==='region'?'-':parentName,regionName]) {
        const cell=document.createElement('td');cell.textContent=value;tr.append(cell);
      }
      const actions=document.createElement('td');
      for(const action of ['edit','delete']) {
        const control=document.createElement('button');control.type='button';
        control.className='btn btn-sm me-1 btn-outline-'+(action==='edit'?'primary':'danger');
        control.dataset[action==='edit'?'locationEdit':'locationDelete']=location.kind;
        control.dataset.locationId=idOf(location);control.textContent=action==='edit'?'Edit':'Delete';
        actions.append(control);
      }
      tr.append(actions);body.append(tr);
    }
    if(!filtered.length){const tr=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=5;cell.className='text-center py-4';cell.textContent=all.length?'No locations match your search or filters.':'No locations registered yet.';tr.append(cell);body.append(tr);}
    document.querySelector('[data-location-summary]').textContent=filtered.length?'Showing '+(start+1)+'-'+Math.min(start+size,filtered.length)+' of '+filtered.length+' locations'+(filtered.length!==all.length?' ('+all.length+' total)':''):'Showing 0 of '+all.length+' locations';
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
    if(!confirm('Delete "'+location.name+'"? This cannot be undone.'))return;
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
