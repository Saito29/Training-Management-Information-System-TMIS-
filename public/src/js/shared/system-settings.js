/* UI state only. Existing CSRF-protected settings endpoints remain authoritative. */
document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('.settings-page');if(!root)return;
  const tabs=[...root.querySelectorAll('[data-bs-toggle="pill"]')];
  const activate=key=>{const tab=tabs.find(item=>item.dataset.bsTarget==='#'+key);if(tab&&window.bootstrap)bootstrap.Tab.getOrCreateInstance(tab).show();};
  let saved;try{saved=sessionStorage.getItem('tmis-system-settings-tab');}catch{}
  activate(location.hash.slice(1)||saved);
  for(const tab of tabs)tab.addEventListener('shown.bs.tab',()=>{const key=tab.dataset.bsTarget.slice(1);history.replaceState(null,'','#'+key);try{sessionStorage.setItem('tmis-system-settings-tab',key);}catch{}});
  window.addEventListener('hashchange',()=>activate(location.hash.slice(1)));
  const regions=[...root.querySelectorAll('[name="region_ids[]"]')],offices=[...root.querySelectorAll('[name="office_ids[]"]')];
  const regionSearch=root.querySelector('[data-region-search]'),officeSearch=root.querySelector('[data-office-search]');
  function filter(){
    const selected=new Set(regions.filter(item=>item.checked).map(item=>item.value));
    for(const input of regions)input.closest('label').hidden=!input.closest('label').textContent.toLowerCase().includes(regionSearch.value.trim().toLowerCase());
    for(const input of offices){const row=input.closest('label'),allowed=!selected.size||selected.has(row.dataset.officeRegion);input.disabled=!allowed;if(!allowed)input.checked=false;row.hidden=!allowed||!row.textContent.toLowerCase().includes(officeSearch.value.trim().toLowerCase());}
    root.querySelector('[data-region-count]').textContent=selected.size?selected.size+' selected':'All regions';
    const officeCount=offices.filter(item=>item.checked).length;root.querySelector('[data-office-count]').textContent=officeCount?officeCount+' selected':'All offices';
    root.querySelector('[data-region-empty]').hidden=regions.some(item=>!item.closest('label').hidden);
    root.querySelector('[data-office-empty]').hidden=offices.some(item=>!item.closest('label').hidden);
  }
  for(const input of [...regions,...offices])input.addEventListener('change',filter);
  regionSearch.addEventListener('input',filter);officeSearch.addEventListener('input',filter);
  root.querySelector('[data-clear-regions]').addEventListener('click',()=>{regions.forEach(item=>item.checked=false);regionSearch.value='';filter();});
  root.querySelector('[data-clear-offices]').addEventListener('click',()=>{offices.forEach(item=>item.checked=false);officeSearch.value='';filter();});
  const maintenance=root.querySelector('#maintenanceEnabled'),until=root.querySelector('#maintenanceUntil');
  const availability=()=>{until.disabled=!maintenance.checked;};maintenance.addEventListener('change',availability);availability();filter();
});
