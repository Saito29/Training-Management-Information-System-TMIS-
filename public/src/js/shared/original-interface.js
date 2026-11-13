/* Database adapter for the original UI. Business records never fall back to browser storage. */

(() => {

  if (!window.TMIS_PAGE) return;

  let stores = window.TMIS_PAGE.stores;

  const clone = value => JSON.parse(JSON.stringify(value));

  const stable = value => JSON.stringify(value, (key, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a.localeCompare(b))) : item);

  const requestedId = () => { const query = new URLSearchParams(location.search); return query.get('id') || query.get('faId') || query.get('farmerId') || ''; };

  const farmerNumberFromPath = () => location.pathname.match(/\/participants\/id\/(?:view|edit)-farmer\/(\d+)\/?$/)?.[1] || '';

  const records = key => clone(stores[key] || []);

  const selectedId = () => {
    const number = farmerNumberFromPath();
    const farmerPage = /\/participants\/id\/(?:view|edit)-farmer(?:\/|$)/.test(location.pathname);
    const numberFromQuery = farmerPage && /^\d{8,}$/.test(requestedId()) ? requestedId() : '';
    const farmerNumber = number || numberFromQuery;
    const path = location.pathname.match(/\/training\/id\/(?:view|edit)-training\/(?:[^/]+\/)?([^/]+)\/?$/)
      || location.pathname.match(/\/(?:participants\/id\/(?:view|edit)-fa|participants\/id\/(?:view|edit)-farmer|training\/id\/(?:view|edit)-training|evaluation\/id\/(?:view|edit)-(?:pre-test|post-test|rp-evaluation|training-evaluation))\/([^/]+)\/?$/);
    const pathId = path ? decodeURIComponent(path[1]) : '';
    return farmerNumber ? stores['tmis-farmers']?.find(record => record.farmerNumber === farmerNumber)?.id || farmerNumber : requestedId() || pathId;
  };

  const selected = key => {
    const id = selectedId();
    const number = farmerNumberFromPath() || requestedId();
    return records(key).find(record => record.id === id || (key === 'tmis-farmers' && record.farmerNumber === number));
  };

  async function request(path, data, method = 'POST') {

    const response = await fetch(path, {method, credentials:'same-origin', cache:'no-store', headers:{Accept:'application/json', 'X-TMIS-PAGE':location.pathname+location.search, ...(data instanceof FormData ? {} : {'Content-Type':'application/json'}), 'X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]').content}, ...(method === 'GET' ? {} : {body:data instanceof FormData ? data : JSON.stringify(data)})});

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(Object.values(result.errors || {}).flat()[0] || result.message || 'The server could not save this change.');
      error.status = response.status;
      error.data = result;
      throw error;
    }

    return result;

  }

  function publish(result) {

    if (result.stores) { stores = result.stores; window.TMIS_PAGE = {...window.TMIS_PAGE, ...result}; }

    window.dispatchEvent(new Event('tmis:data-updated'));

  }

  async function refresh() {
    const result = await request('/ui/data', null, 'GET');
    if (!result.stores) throw new Error('The server did not return refreshed records.');
    publish(result);
    return result;
  }

  const sampleMarker = key => /samples?-|sample.*added|samples.*initialized/.test(key);

  const section = key => key.startsWith('tmis:training:') ? key.split(':').at(-1) : null;

  function getItem(key) {

    if (Object.hasOwn(stores,key)) return JSON.stringify(stores[key]);

    if (sampleMarker(key)) return '1';

    if (key === 'tmis-fa-members') return JSON.stringify(records('tmis-farmers'));

    if (section(key)) {

      const training = selected('tmis-trainings');

      if (!training) return null;

      return JSON.stringify(section(key) === 'overview' ? training : section(key) === 'participants' ? (training.participants || []) : training[section(key)] || null);

    }

    if (/^tmis-farmer-.*-interventions$/.test(key)) return JSON.stringify(selected('tmis-farmers')?.interventions || []);

    if (/notification-state:/.test(key)) return '{}';

    if (/^tmis-notification-drafts?:/.test(key)) return null;

    if (/(columns|theme|page-size|table-state|filters|navigation)/.test(key)) return localStorage.getItem(key);

    return null;

  }

  async function setItem(key, serialized) {

    let value = JSON.parse(serialized);

    if (sampleMarker(key)) return;

    if (section(key)) {

      const training = selected('tmis-trainings');

      if (!training) throw new Error('Open a saved training before making changes.');

      if (section(key) === 'participants') {

        const result = await request('/ui/training-enrollment', {id:training.id, participants:value, version:training._version});

        publish(result); return;

      }

      const update = section(key) === 'overview' ? {...training, ...value} : {...training, [section(key)]:value};

      return setItem('tmis-trainings', JSON.stringify(records('tmis-trainings').map(item => item.id === training.id ? update : item)));

    }

    if (/^tmis-farmer-.*-interventions$/.test(key)) {

      const farmer = selected('tmis-farmers');

      if (!farmer) throw new Error('Open a saved participant first.');

      return setItem('tmis-farmers', JSON.stringify(records('tmis-farmers').map(item => item.id === farmer.id ? {...item,interventions:value} : item)));

    }

    if (/^tmis-notification-drafts?:/.test(key)) {
      const result = await request('/ui/draft', {key, value});
      stores[key] = value;
      window.dispatchEvent(new Event('tmis:data-updated'));
      return result;
    }

    if (key.startsWith('tmis-notification-state:')) {

      const upserts = Object.entries(value).map(([id,state]) => ({id,...state}));

      publish(await request('/ui/sync',{key,upserts,deletes:[]})); stores[key]=value; return;

    }

    if (!Object.hasOwn(stores,key)) {

      if (/(columns|theme|page-size|table-state|filters|navigation)/.test(key)) { localStorage.setItem(key,serialized); return; }

      throw new Error('This collection is not available to your account.');

    }

    if (!Array.isArray(value)) throw new Error('Invalid record data.');

    if(key === 'tmis-farmer-associations') {
      for(const record of value) {
        const current=records(key).find(item=>item.id===record.id);
        if(!current || !Array.isArray(record.documents))continue;
        const byId=new Map(record.documents.map(item=>[String(item.id),item]));
        for(const file of current.documents||[]) {
          const next=byId.get(String(file.id));
          if(!next)await documentAction('associations',record.id,file.id,'DELETE');
          else if(next.type!==file.type || next.year!==file.year || next.remarks!==file.remarks)await documentAction('associations',record.id,file.id,'PATCH',{kind:next.type,year:next.year||null,remarks:next.remarks||''});
        }
        record.documents=records(key).find(item=>item.id===record.id)?.documents||[];
      }
    }
    if(key.endsWith('-encoded')) {
      const trainingId=new URLSearchParams(location.search).get('trainingId');
      if(trainingId)value=value.map(item=>({...item,trainingId}));
    }
    const previous = records(key);

    const map = new Map(previous.map(item => [String(item.id),item]));

    const upserts = value.filter(item => !map.has(String(item.id)) || stable(item) !== stable(map.get(String(item.id)))).map(item => ({...item, ...(map.has(String(item.id)) ? {_version:map.get(String(item.id))._version} : {})}));

    const ids = new Set(value.map(item => String(item.id)));

    const deletes = previous.filter(item => !ids.has(String(item.id))).map(item => String(item.id));

    if (!upserts.length && !deletes.length) return;

    const result = await request('/ui/sync',{key,upserts,deletes});
    publish(result);
    return result;

  }

  async function removeItem(key) {

    if (/^tmis-notification-drafts?:/.test(key)) {
      const result = await request('/ui/draft', {key, value:null});
      delete stores[key];
      window.dispatchEvent(new Event('tmis:data-updated'));
      return result;
    }

    throw new Error('Use the record deletion action.');

  }

  async function saveRecord(key,record) {

    const latest = records(key), index = latest.findIndex(item=>item.id===record.id);

    if(index<0) latest.push(record); else latest[index]=record;

    await setItem(key,JSON.stringify(latest));

    return records(key).find(item=>item.id===record.id);

  }

  async function upload(module,id,file,kind,year,remarks='') {

    const data = new FormData(); data.set('file',file); data.set('kind',kind); data.set('year',year); data.set('remarks',remarks);

    const result = await request('/ui/documents/'+module+'/'+encodeURIComponent(id),data); publish(result);

    const key={trainings:'tmis-trainings',associations:'tmis-farmer-associations',participants:'tmis-farmers'}[module];

    const owner=records(key).find(item=>item.id===id);

    return (module==='associations'?owner.documents:owner.attachments).at(-1);

  }

  async function documentAction(module,id,document,method,data) {

    const result=await request('/ui/documents/'+module+'/'+encodeURIComponent(id)+'/'+document,data||{},method); publish(result); return result;

  }

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  const can = permission => Array.isArray(window.TMIS_PAGE.permissions) && window.TMIS_PAGE.permissions.includes(permission);
  window.TmisStore = {escape,getItem,setItem,removeItem,records,selected,request,publish,refresh,selectedId,saveRecord,upload,documentAction,can};

  window.TMIS_SESSION = {source:'database',userId:String(window.TMIS_PAGE.actor.id),user:{...window.TMIS_PAGE.actor,id:String(window.TMIS_PAGE.actor.id)}};

})();

/* Read models for the existing training tabs; unlinked assessments remain standalone. */
(() => {
  if(!window.TmisStore)return;
  const store=window.TmisStore, training=()=>store.selected('tmis-trainings');
  const farmers=()=>store.records('tmis-farmers');
  const results=kind=>store.records('tmis-'+kind+'-encoded').filter(item=>item.status==='complete' && training() && Number(item.trainingDatabaseId)===Number(training()._db_id));
  const normalize=value=>String(value??'').trim().toLocaleLowerCase();
  function participantsForEncoding(selectedTraining,kind,includeResultId='') {
    if(!selectedTraining)return farmers();
    const associationIds=new Set((selectedTraining.associationIds||[]).map(String));
    const enrolledIds=new Set((selectedTraining.participants||[]).map(String));
    const linkedResults=store.records('tmis-'+kind+'-encoded');
    const trainingRegionId=String(selectedTraining.region_id||'');
    const trainingRegion=normalize(selectedTraining.region);
    const trainingProvince=normalize(selectedTraining.province);
    const trainingMunicipality=normalize(selectedTraining.municipality);
    const selectedDatabaseId=String(selectedTraining._db_id||'');
    const selectedUiId=String(selectedTraining.id||'');
    const belongsToTraining=result=>{
      const resultDatabaseId=String(result.trainingDatabaseId||'');
      if(selectedDatabaseId&&resultDatabaseId)return resultDatabaseId===selectedDatabaseId;
      return Boolean(selectedUiId)&&String(result.trainingId||'')===selectedUiId;
    };
    const locationMatches=farmer=>{
      const offices=farmer.beneficiaryOffices||[];
      const regionMatches=trainingRegionId
        ? String(farmer.region_id||'')===trainingRegionId||offices.some(office=>String(office.region_id||'')===trainingRegionId)
        : !trainingRegion||normalize(farmer.region)===trainingRegion||offices.some(office=>normalize(office.region)===trainingRegion);
      return regionMatches
        && (!trainingProvince||normalize(farmer.province)===trainingProvince)
        && (!trainingMunicipality||normalize(farmer.municipality)===trainingMunicipality);
    };

    return farmers().filter(farmer=>{
      const farmerId=String(farmer.id||'');
      const memberIds=new Set([
        farmer.association_id,
        farmer.association_db_id,
        ...(farmer.associationMemberships||[]).flatMap(membership=>[membership.id,membership.databaseId]),
      ].filter(value=>value!==undefined&&value!==null).map(String));
      const isEligible=Boolean(farmer.is_active)&&(enrolledIds.has(farmerId)
        ||[...associationIds].some(id=>memberIds.has(id))
        ||locationMatches(farmer));
      if(!isEligible)return false;

      return !linkedResults.some(result=>
        result.status==='complete'
        && String(result.id)!==String(includeResultId)
        && String(result.farmerId||'')===farmerId
        && belongsToTraining(result)
      );
    });
  }
  const questionnaires=kind=>store.records('tmis-'+kind+'-questionnaires');
  const farmer=result=>farmers().find(item=>item.id===result.farmerId);
  const comments=items=>items.filter(item=>item.comments).map(item=>({farmer:farmer(item)?.name||item.farmerName||'Participant',rating:item.ratings?.length?item.ratings.reduce((sum,rating)=>sum+Number(rating.rating),0)/item.ratings.length:0,text:item.comments}));
  function questions(kind,items=results(kind)) {
    const ids=[...new Set(items.map(item=>item.questionnaireId))];
    let counter=0;
    return ids.flatMap(id=>{
      const definition=questionnaires(kind).find(item=>item.id===id);
      return (definition?.questions||[]).map((question,index)=>({id:++counter,prompt:typeof question==='string'?question:question.text,responses:items.filter(item=>item.questionnaireId===id && item.ratings?.[index]).map(item=>({participant:farmer(item)?.name||item.farmerName||'Participant',farmer:farmer(item)?.name||item.farmerName||'Participant',association:farmer(item)?.association||'',answeredAt:item.date,rating:Number(item.ratings[index].rating)}))}));
    });
  }
  function assessment(kind){return (training()?.[kind.replace('-','')]||[]).map(id=>{const definition=questionnaires(kind).find(item=>item.id===id),items=results(kind).filter(item=>item.questionnaireId===id);return {id,name:definition?.trainingQuestionnaire||id,itemCount:Number(definition?.totalItems)||null,averageCorrect:items.length?items.reduce((sum,item)=>sum+Number(item.score),0)/items.length:null};});}
  function scores(kind,id){return results(kind).filter(item=>item.questionnaireId===id).map(item=>({id:item.farmerId,name:farmer(item)?.name||item.farmerName||'Participant',association:farmer(item)?.association||'',answeredAt:item.date,score:Number(item.score)}));}
  function resources(){return (training()?.trainers||[]).map(resource=>{const items=results('rp-evaluation').filter(item=>item.resourcePersonId===resource.id);return {...resource,initials:resource.name.split(' ').map(part=>part[0]).slice(0,2).join(''),questions:questions('rp-evaluation',items),comments:comments(items)};});}
  window.TmisTrainingData={results,questions,comments:()=>comments(results('training-evaluation')),resources,assessment,scores,participantCount:()=>training()?.participants?.length||0,participantsForEncoding};
})();

(() => {
  if (!window.TmisStore) return;
  const store=window.TmisStore;
  const dashboard=window.TMIS_PAGE.dashboard;
  if(!dashboard)return;
  const year=dashboard.currentYear;
  const trainings=store.records('tmis-trainings').filter(item=>String(item.status||'').trim().toLowerCase()!=='inactive'&&String(item.startDate||item.start_date||'').slice(0,4)===String(year));
  const farmers=store.records('tmis-farmers').filter(item=>item.status==='Active');
  const associations=store.records('tmis-farmer-associations').filter(item=>item.status==='Active');
  const {ageSex,sexes,groups}=dashboard;
  const money=value=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(value);
  const aggregate=field=>dashboard[{district:'allocatedBudgetByDistrict',province:'allocatedBudgetByProvince',municipality:'municipalityAllocation'}[field]];
  const trainingDisplayId=item=>dashboard.trainingDisplayIds?.[item.id]||item.id;
  const ageGroup=farmer=>{if(!farmer.birthDate)return 'Not recorded';const birth=new Date(farmer.birthDate+'T00:00:00');const today=new Date(dashboard.today+'T00:00:00');if(Number.isNaN(+birth)||birth>today)return 'Not recorded';let age=year-birth.getFullYear();if(today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate()))age--;return age<15?'Below 15':dashboard.ageLabels[age<=30?0:age<60?1:2];};
  function reports(original){
    const copy=structuredClone(original);
    copy.activities.title='Active Capacity-Building Activities';
    copy.activities.exportName='Active-Capacity-Building-Activities';
    copy.activities.description='Active capacity-building activities for '+year+' with schedule, location, enrollment and status details.';
    copy.activities.headers=['Training ID','Training','Type','District','Province','Municipality','Schedule','Farmers','Budget','Status'];
    copy.activities.rows=trainings.map(item=>[trainingDisplayId(item),item.title,item.type||'',item.district||'',item.province||'',item.municipality||'',[item.startDate,item.endDate].filter(Boolean).join(' - '),item.participants?.length||0,money(Number(item.budget)||0),item.status]);
    copy.upcoming.title='Upcoming Capacity-Building Activities';
    copy.upcoming.exportName='Upcoming-Capacity-Building-Activities';
    copy.upcoming.description='Capacity-building activities scheduled today through the next three days.';
    copy.upcoming.headers=['Training ID','Training','Type','District','Province','Municipality','Start Date','End Date','Venue','Participants','Status'];
    const formatDate=value=>{if(!value)return '';const date=new Date(String(value).slice(0,10)+'T00:00:00+08:00');return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Manila'});};
    copy.upcoming.rows=dashboard.upcoming.map(item=>[trainingDisplayId(item),item.title,item.type||'',item.district||'',item.province||'',item.municipality||'',formatDate(item.startDate),formatDate(item.endDate||item.startDate),item.venue||'',item.target_participants??item.participants?.length??0,item.status||'']);
    copy.participants.title='Active Farmers';
    copy.participants.exportName='Active-Farmers';
    copy.participants.description='Active farmer profiles with demographic, association and registration details.';
    copy.participants.headers=['Farmer Number','Full Name','Sex','Age Group','Region','Office','District','Province','Municipality','Barangay','Association','Registered','Status'];
    copy.participants.rows=farmers.map(item=>[item.farmerNumber||item.id,item.name,item.sex||'',ageGroup(item),item.region||'',item.office||'',item.district||'',item.province||'',item.municipality||'',item.barangay||'',item.organization||'',item.registrationDate||item.registration_date||item.registered||item.createdAt||'',item.status]);
    copy.fca.title='Active Farmer Associations';
    copy.fca.exportName='Active-Farmer-Associations';
    copy.fca.description='Active association records with location, membership and status details.';
    copy.fca.headers=['Association ID','Association','Organization Type','Region','Office','District','Province','Municipality','Members','Status'];
    copy.fca.rows=associations.map(item=>[item.id,item.association_name,item.organization_type||item.organizationType||'',item.region||'',item.office||'',item.district||'',item.province||'',item.municipality||'',item.members?.length||0,item.status]);
    copy.budget.headers=['District','Province',String(dashboard.currentYear)+' allocated',String(dashboard.previousYear)+' allocated','Approved trainings'];
    copy.budget.rows=aggregate('district').map(item=>[item.district,item.province,money(item.current),money(item.previous),item.activities]);
    copy.provinceBudget.headers=['Province',String(dashboard.currentYear)+' allocated',String(dashboard.previousYear)+' allocated','Approved trainings'];
    copy.provinceBudget.rows=aggregate('province').map(item=>[item.province,money(item.current),money(item.previous),item.activities]);
    copy.municipalityBudget.headers=['Municipality','Province',String(dashboard.currentYear)+' allocated',String(dashboard.previousYear)+' allocated','Approved trainings'];
    copy.municipalityBudget.rows=aggregate('municipality').map(item=>[item.municipality,item.province,money(item.current),money(item.previous),item.activities]);
    copy.ageSex.rows=ageSex[0].data.map((value,index)=>[dashboard.ageLabels[index],value,ageSex[1].data[index],value+ageSex[1].data[index],farmers.length?((value+ageSex[1].data[index])*100/farmers.length).toFixed(1)+'%':'0%']);
    copy.sex.headers=['Sex','Active farmers','Share of active farmers'];
    copy.sex.rows=sexes.map((value,index)=>[['Male','Female'][index],value,farmers.length?(value*100/farmers.length).toFixed(1)+'%':'0%']);
    copy.groups.headers=['Beneficiary Group','Active Farmers','Share of Active Farmers'];
    copy.groups.rows=groups.map((value,index)=>[dashboard.groupLabels[index],value,farmers.length?(value*100/farmers.length).toFixed(1)+'%':'0%']);
    for(const report of Object.values(copy))report.total=report.rows.length+' records';
    return copy;
  }
  window.TmisDashboard={...dashboard,reports};
  function setSelect(control,value){if(!control)return;if(control.tagName!=='SELECT'){control.value=value??'';return;}const normalize=text=>String(text??'').replace(/\s*\(.*\)/,'').trim().toLowerCase();let option=[...control.options].find(option=>option.value===String(value)||normalize(option.textContent)===normalize(value));if(!option&&value){option=new Option(String(value),String(value));control.add(option);}control.value=option?.value||'';}
  function renderBeneficiaryOffices(assignments){
    const offices=Array.isArray(assignments)?assignments:[];
    document.querySelectorAll('[data-beneficiary-offices]').forEach(container=>{
      container.replaceChildren();
      for(const assignment of offices){
        const card=document.createElement('article');card.className='farmer-beneficiary-office-item';
        const icon=document.createElement('span');icon.className='farmer-beneficiary-office-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<i class="bi bi-building"></i>';
        const details=document.createElement('div');details.className='farmer-beneficiary-office-details';
        for(const[label,value]of [['Region',assignment.region],['Office',assignment.office]]){
          const field=document.createElement('div');field.className='farmer-beneficiary-office-field';
          const fieldLabel=document.createElement('span');fieldLabel.className='farmer-beneficiary-office-label';fieldLabel.textContent=label;
          const fieldValue=document.createElement('strong');fieldValue.className='farmer-beneficiary-office-value';fieldValue.textContent=value||'Not recorded';
          field.append(fieldLabel,fieldValue);details.append(field);
        }
        const badge=document.createElement('span');badge.className='farmer-beneficiary-office-badge';badge.textContent=assignment.isPrimary?'Primary office':'Additional office';
        details.append(badge);card.append(icon,details);container.append(card);
      }
      const panel=container.closest('.farmer-beneficiary-office-panel');
      const count=panel?.querySelector('[data-beneficiary-office-count]');
      if(count)count.textContent=offices.length+' '+(offices.length===1?'office':'offices');
      const empty=panel?.querySelector('[data-beneficiary-office-empty]');
      if(empty)empty.hidden=offices.length>0;
    });
  }
  function formatFarmerDate(value){
    if(!value)return '';
    if(window.TmisDate?.format)return window.TmisDate.format(value,{dateStyle:'long'});
    const date=new Date(`${String(value).slice(0,10)}T00:00:00`);
    return Number.isNaN(date.getTime())?'Date not recorded':new Intl.DateTimeFormat('en-PH',{dateStyle:'long',timeZone:'Asia/Manila'}).format(date);
  }
  function renderAssociationMemberships(memberships){
    const records=Array.isArray(memberships)?memberships:[];
    document.querySelectorAll('[data-association-memberships]').forEach(container=>{
      container.replaceChildren();
      for(const membership of records){
        const card=document.createElement('article');card.className='farmer-association-membership-item';
        const heading=document.createElement('header');heading.className='farmer-association-membership-heading';
        const name=document.createElement('h6');name.textContent=membership.name||'Association not recorded';
        heading.append(name);
        if(membership.isPrimary){
          const primary=document.createElement('span');primary.className='farmer-association-membership-primary';primary.textContent='Primary';
          heading.append(primary);
        }
        const details=document.createElement('div');details.className='farmer-association-membership-details';
        const fields=[
          ['Association ID',membership.id],
          ['Position / Role',membership.role],
          ['Organization Type',membership.organizationType],
          ['Region',membership.region],
          ['Office',membership.office],
          ['Location',membership.location],
          ['Registration Date',formatFarmerDate(membership.registrationDate)],
          ['Year Covered',membership.yearCovered],
          ['Association Status',membership.status],
          ['Member Since',formatFarmerDate(membership.memberSince)],
        ];
        for(const[label,value]of fields){
          const field=document.createElement('div');field.className='farmer-association-membership-field';
          const fieldLabel=document.createElement('span');fieldLabel.className='farmer-association-membership-label';fieldLabel.textContent=label;
          const fieldValue=document.createElement('strong');fieldValue.className='farmer-association-membership-value';fieldValue.textContent=value||'Not recorded';
          field.append(fieldLabel,fieldValue);details.append(field);
        }
        card.append(heading,details);container.append(card);
      }
      const card=container.closest('.association-overview-card, .farmer-association-membership-card');
      const count=card?.querySelector('[data-association-membership-count]');
      if(count)count.textContent=records.length+' '+(records.length===1?'association':'associations');
      const empty=container.parentElement?.querySelector('[data-association-membership-empty]');
      if(empty)empty.hidden=records.length>0;
      card?.classList.toggle('has-no-association',records.length===0);
    });
  }
  function bind(){
    const path=location.pathname;
    if(!window.TMIS_PAGE.administrator)document.querySelectorAll('a[href]').forEach(link=>{if(new URL(link.href,location.href).pathname==='/system/settings')link.remove();});
    if(window.TMIS_PAGE.administrator)document.querySelectorAll('a[href$="/app/admin/users/logs"]').forEach(link=>{
      if(link.parentElement.querySelector('a[href="/system/settings"]'))return;
      const settings=link.cloneNode(true);settings.href='/system/settings';settings.classList.remove('active-page','active');settings.removeAttribute('aria-current');
      const label=settings.querySelector('span');if(label)label.textContent='System settings';
      const icon=settings.querySelector('i');if(icon)icon.className='bi bi-gear';link.after(settings);
    });
    window.dispatchEvent(new Event('tmis:navigation-updated'));
    const training=store.selected('tmis-trainings');
    const farmer=store.selected('tmis-farmers');
    if(path.includes('/training/id/')&&training){
      const editForm=document.getElementById('editTrainingForm');
      if(editForm){
        for(const name of ['region','district','province','municipality','barangay']){const field=editForm.elements.namedItem(name+'_id');setSelect(field,training[name]);field?.dispatchEvent(new Event('change',{bubbles:true}));}
      }
      const heading=document.querySelector('.training-title-row h2');if(heading)heading.textContent=training.title;
      const description=document.querySelector('.training-description p');if(description)description.textContent=training.description||'';
      const facts={'Training ID':training.id,'Training Type':training.type,'Date Conducted':training.startDate,'Municipality / Location':[training.barangay,training.municipality].filter(Boolean).join(', '),'Organizer / Office':training.office,'Resource Person(s)':(training.trainers||[]).map(item=>item.name).join('; '),'No. of Participants':training.participants?.length||0,'Purpose':training.description||''};
      document.querySelectorAll('.training-facts span').forEach(span=>{const label=[...span.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent).join('').trim();const value=span.querySelector('strong');if(value&&Object.hasOwn(facts,label))value.textContent=facts[label]??'';});
      const status=document.querySelector('.training-title-row >span:last-child');if(status)status.textContent=training.status;
      const total=document.querySelector('.training-stats .stat-card strong');if(total)total.textContent=training.participants?.length||0;
      document.querySelectorAll('a[href$="/training/id/edit-training"]').forEach(link=>{link.search='?id='+encodeURIComponent(training.id);});
      const members=store.records('tmis-farmers').filter(item=>training.participants?.includes(item.id));
      const sexes=['Male','Female'].map(sex=>members.filter(item=>item.sex===sex).length);
      const share=value=>members.length?(value*100/members.length).toFixed(1):'0.0';
      const summary=document.querySelector('.training-stats .stat-card small');if(summary)summary.textContent=sexes.map((value,index)=>value+' '+['Male','Female'][index]+' ('+share(value)+'%)').join('  ');
      document.querySelectorAll('.gender-legend p small').forEach((item,index)=>item.textContent=sexes[index]+' ('+share(sexes[index])+'%)');
      document.querySelector('[data-gender-chart]')?.setAttribute('aria-label',sexes[0]+' male and '+sexes[1]+' female participants');
      const highlightLists=[...document.querySelectorAll('#overview-panel .training-bottom-grid ul')];
      for(const[index,list]of highlightLists.entries())list.replaceChildren(...(training.bullets?.[index]||[]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
      const resourceCards=[...document.querySelectorAll('#overview-panel .person-row')];
      for(const[index,card]of resourceCards.entries()){const resource=training.trainers?.[index];if(!resource){card.hidden=true;continue;}const name=card.querySelector('strong');if(name)name.textContent=resource.name;const avatar=card.querySelector('.avatar');if(avatar)avatar.textContent=resource.name.split(' ').map(part=>part[0]).slice(0,2).join('');const score=card.querySelector('b');if(score)score.textContent='No results';}

    }
    if(path.includes('/participants/id/')&&farmer){
      const fields={first_name:farmer.firstName,middle_name:farmer.middleName,last_name:farmer.lastName,extension:farmer.suffix,dob:farmer.birthDate,registration_date:farmer.registrationDate,gender:farmer.sex,civil_status:farmer.civil_status,tupad:farmer.tupad,solo_parent:farmer.soloParent,nationality:farmer.nationality,place_of_birth:farmer.placeOfBirth||farmer.place_of_birth,four_ps:farmer.fourPs,pwd:farmer.pwd,senior_citizen:farmer.seniorCitizen,indigenous_group:farmer.indigenousGroup,tribe_name:farmer.tribeName,dietary_restriction:farmer.dietaryRestriction,allergies_on:farmer.allergies_on,region:farmer.region,district:farmer.district,province:farmer.province,municipality:farmer.municipality,barangay:farmer.barangay,postal_code:farmer.postal_code,mobile_no:farmer.phone,email:farmer.email,street_purok_sitio:farmer.street_purok_sitio_name,house_building_number:farmer.house_building_number,tel_number:farmer.telephone};
      const form=document.getElementById('editFarmerPersonalForm');if(form)for(const[name,value]of Object.entries(fields)){const control=form.elements.namedItem(name);setSelect(control,value);if(control?.tagName==='SELECT')control.dispatchEvent(new Event('change',{bubbles:true}));}
      const associationSelect=form?.elements.namedItem('association_id');
      if(associationSelect){
        const memberships=farmer.associationMemberships||[];
        const primaryMembership=memberships.find(membership=>membership.isPrimary);
        const primaryId=String(primaryMembership?.id||farmer.association_id||'');
        const options=new Map(memberships.map(membership=>[
          String(membership.id),
          `${membership.name||membership.id} · ${membership.office||'Office not recorded'} · ${membership.region||'Region not recorded'}`,
        ]));
        for(const item of store.records('tmis-farmer-associations')){
          options.set(String(item.id),`${item.association_name||item.name||item.id} · ${item.office||'Office not recorded'} · ${item.region||'Region not recorded'}`);
        }
        const noAssociation=new Option('No association','',primaryId==='',primaryId==='');
        associationSelect.replaceChildren(noAssociation,...[...options].map(([id,name])=>new Option(name,id,id===primaryId,id===primaryId)));
        setSelect(associationSelect,primaryId);
      }
      const associationRole=form?.elements.namedItem('associate_role');if(associationRole){associationRole.value=farmer.role||'';associationRole.defaultValue=farmer.role||'';}
      const profileUpdatedLog=(farmer.activityLogs||[]).find(item=>item.title==='Farmer Profile Updated');
      const updatedDate=profileUpdatedLog?.date?window.TmisDate.format(profileUpdatedLog.date,{dateStyle:'long'}):'No record updated';
      const details={'Farmer ID':farmer.farmerNumber||farmer.id,'Full Name':farmer.name,'First Name':farmer.firstName,'Middle Name':farmer.middleName,'Last Name':farmer.lastName,'Extension':farmer.suffix,'Mobile Number':farmer.phone,'Telephone Number':farmer.telephone,'Email Address':farmer.email,'Address':[farmer.house_building_number,farmer.street_purok_sitio_name,farmer.barangay,farmer.municipality,farmer.district,farmer.province,farmer.region,farmer.postal_code].filter(Boolean).join(', '),'Region':farmer.region,'District':farmer.district,'Province':farmer.province,'Municipality':farmer.municipality,'Barangay':farmer.barangay,'Street / Purok':farmer.street_purok_sitio_name,'House / Building No.':farmer.house_building_number,'Postal Code':farmer.postal_code,'Sex':farmer.sex,'Gender':farmer.sex,'Date of Birth':farmer.birthDate,'Year Covered':farmer.yearCovered,'Nationality':farmer.nationality,'Civil Status':farmer.civil_status||farmer.csv,'Place of Birth':farmer.placeOfBirth,'Farmer Association':farmer.organization,'Position / Role':farmer.role,'4Ps Beneficiary':farmer.fourPs,'4Ps':farmer.fourPs,'TUPAD':farmer.tupad,'Solo Parent':farmer.soloParent,'Person With Disability':farmer.pwd,'Indigenous Group':farmer.indigenousGroup,'Tribe Name':farmer.tribeName,'Dietary Restrictions':farmer.dietaryRestriction,'Allergies':farmer.allergies_on,'Senior Citizen':farmer.seniorCitizen,'Profile Updated':updatedDate};
      const updatedDateDisplay=document.querySelector('#displayUpdatedDate');if(updatedDateDisplay)updatedDateDisplay.textContent=updatedDate;
      const association=store.records('tmis-farmer-associations').find(item=>String(item.id)===String(farmer.association_id));
      const associationLocation=[association?.barangay,association?.municipality,association?.district,association?.province].filter(Boolean).join(', ');
      Object.assign(details,{'Association ID':farmer.associationNumber||association?.id,'Association Name':farmer.organization||association?.association_name,'Organization Type':association?.organization_type,'Association Region':association?.region,'Association Office':association?.office,'Association Short Name':association?.short_name,'Association Location':associationLocation,'Location':associationLocation,'Association Registration Date':association?.registration_date,'Association Year Covered':association?.year_covered,'Position / Role':farmer.role,'Date Updated':updatedDate,'Status':farmer.status});
      const publicFarmerId=farmer.farmerNumber||farmer.id;
      const yearCoveredDisplay=document.querySelector('#farmerYearCovered');if(yearCoveredDisplay)yearCoveredDisplay.textContent=farmer.yearCovered||'Not recorded';
      const farmerId=document.querySelector('#displayFarmerId');if(farmerId)farmerId.textContent=publicFarmerId;
      const mobileFarmerId=document.querySelector('#mobileFarmerId');if(mobileFarmerId)mobileFarmerId.textContent=publicFarmerId;
      const interventionReference=document.querySelector('#interventionFarmerReference');if(interventionReference){const icon=interventionReference.querySelector('i');interventionReference.replaceChildren(...(icon?[icon]:[]),document.createTextNode(` Intervention records for Farmer ID ${publicFarmerId}`));}
      const statusPill=document.querySelector('.farmer-status-pill');if(statusPill){statusPill.classList.toggle('active-status',farmer.status==='Active');statusPill.textContent=farmer.status||'Active';}
      const registrationDisplay=document.querySelector('#displayRegistrationDate');if(registrationDisplay)registrationDisplay.textContent=formatFarmerDate(farmer.registrationDate)||'Not recorded';
      const hasAssociation=Boolean(farmer.association_id||farmer.associationMemberships?.length);
      const associationCard=document.querySelector('.association-overview-card');
      if(associationCard){associationCard.classList.toggle('has-no-association',!hasAssociation);const title=associationCard.querySelector('.title-card');if(title&&!hasAssociation)title.textContent='Beneficiary Offices';}
      document.querySelectorAll('.overview-status').forEach(item=>item.textContent=farmer.status||'Active');
      document.querySelectorAll('a[href$="/participants/id/edit-farmer"],a[href$="/participants/id/view-farmer"]').forEach(link=>{const action=link.href.endsWith('/edit-farmer')?'edit':'view';link.href=`/app/admin/participants/id/${action}-farmer/${encodeURIComponent(publicFarmerId)}`;});
      renderBeneficiaryOffices(farmer.beneficiaryOffices);
      renderAssociationMemberships(farmer.associationMemberships);
      const trainingTrack=document.querySelector('#overviewTrainingTrack');
      const trainingCarousel=document.querySelector('#overviewTrainingCarousel');
      const trainingEmpty=document.querySelector('#overviewTrainingEmpty');
      const trainingControls=document.querySelector('#overviewTrainingControls');
      if(trainingTrack&&trainingCarousel&&trainingEmpty&&trainingControls){
        const template=trainingTrack.querySelector('.training-preview-card')?.cloneNode(true);
        const attendedTrainings=store.records('tmis-trainings').filter(item=>(item.participants||[]).includes(farmer.id));
        const formatTrainingDate=value=>{if(!value)return '';const parsed=new Date(`${String(value).slice(0,10)}T00:00:00`);return Number.isNaN(parsed.getTime())?'':new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeZone:'Asia/Manila'}).format(parsed);};
        trainingTrack.replaceChildren();
        if(template&&attendedTrainings.length){
          trainingTrack.hidden=false;
          for(const training of attendedTrainings){
            const card=template.cloneNode(true);card.hidden=false;card.dataset.trainingId=training.id;
            const titleLink=card.querySelector('.training-title-link');if(titleLink){titleLink.textContent=training.title||training.name||'Training';const target=new URL(titleLink.href,location.href);target.search='';target.searchParams.set('trainingId',training.id);titleLink.href=target.href;}
            const type=card.querySelector('.training-type');if(type)type.textContent=training.type||training.training_type||'Training';
            const dates=card.querySelectorAll('.training-preview-main small');
            if(dates[0])dates[0].textContent=[formatTrainingDate(training.startDate||training.start_date),formatTrainingDate(training.endDate||training.end_date)].filter(Boolean).join(' – ')||'Dates not recorded';
            if(dates[1])dates[1].textContent=training.venue||training.venue_location||[training.barangay,training.municipality,training.province].filter(Boolean).join(', ')||training.office||'Location not recorded';
            const status=card.querySelector('.training-status');if(status){status.className='training-status';status.textContent='Participation recorded';}
            card.querySelectorAll('.training-preview-scores strong').forEach(value=>{value.textContent='No results';});
            trainingTrack.append(card);
          }
          trainingCarousel.hidden=false;trainingEmpty.hidden=true;trainingControls.hidden=false;
        }else{
          trainingTrack.hidden=true;trainingCarousel.hidden=false;trainingEmpty.hidden=false;trainingControls.hidden=true;
        }
        window.dispatchEvent(new Event('tmis:farmer-training-history-updated'));
      }
      document.querySelectorAll('.farmer-detail').forEach(item=>{const label=item.querySelector('.farmer-detail-label')?.textContent.trim(),value=item.querySelector('strong');if(value&&Object.hasOwn(details,label))value.textContent=details[label]||'Not recorded';});
    }
    if(path.includes('/administration/id/')){
      const account=store.records('tmis-users').find(item=>item.id===store.selectedId());
      const role=document.querySelector('select[name="role"]');
      if(role){role.replaceChildren(new Option('Select a role',''),...(window.TMIS_PAGE.roles||[]).map(name=>new Option(name,name)));if(account)role.value=account.role;}
      const region=document.querySelector('select[name="region"]');
      if(region){region.replaceChildren(new Option('Select a region',''),...window.TMIS_PAGE.regions.map(item=>new Option(item.name,item.name)));if(account)region.value=account.region;}
    }
    for(const form of document.forms){
      const region=form.querySelector('select[name="region"],select[name="region_id"]');
      const office=form.querySelector('select[name="implementing_office"],select[name="implementingOffice"],select[name="office"]');
      if(!office||path.includes('rp-register')||path.includes('edit-rp'))continue;
      const registration=window.TMIS_PAGE.registration||{};
      const fill=()=>{const value=office.value,label=office.selectedOptions[0]?.textContent;const selected=region?.selectedOptions[0]?.textContent.replace(/\s*\(.*\)/,'').trim();const area=(registration.regions||[]).find(item=>String(item.region_id)===region?.value||item.name===selected);const options=(registration.offices||[]).filter(item=>!area||String(item.region_id)===String(area.region_id));office.replaceChildren(new Option(options.length?'Select an office':'No offices available',''),...options.map(item=>new Option(item.name,item.name)));if(options.some(item=>item.name===value||item.name===label))office.value=options.find(item=>item.name===value||item.name===label).name;};
      fill();region?.addEventListener('change',fill);
    }
    if(path.includes('/dashboard/')){
      for(const[key,count]of [['activities',dashboard.trainingCount],['participants',farmers.length],['fca',associations.length]]){const button=document.querySelector('[data-report-key="'+key+'"]');const card=button?.closest('.card-header-wrapper');const value=card?.querySelector('.card-header-context');if(value)value.textContent=count;}
      const upcoming=dashboard.upcoming;
      const wrapper=document.querySelector('.card-upcoming-training .card-body .row'),template=wrapper?.querySelector('.card-wrapper')?.cloneNode(true);
      if(wrapper&&template){wrapper.replaceChildren(...(upcoming.length?upcoming:[null]).map(item=>{const card=template.cloneNode(true),date=item?new Date(item.startDate+'T00:00:00'):null;card.querySelector('.card-month').textContent=date?date.toLocaleDateString('en-PH',{month:'short'}):'';card.querySelector('.card-date-text').textContent=date?String(date.getDate()).padStart(2,'0'):'';const title=card.querySelector('.card-text-title');title.textContent=item?.title||'No upcoming trainings';title.href=item?'/app/admin/training/id/view-training/'+encodeURIComponent(item.id):'#';card.querySelector('.card-range-date').textContent=item?[item.startDate,item.endDate].map(value=>new Date(value+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})).join(' - '):'No upcoming date';card.querySelector('.card-location-text').textContent=item?.venue||'';card.querySelector('.slot-number').textContent=item?.target_participants||'0';return card;}));}
      const date=document.querySelector('.app-left-content-date');if(date)date.textContent=dashboard.humanDate;const day=document.querySelector('.app-left-content-day');if(day)day.textContent=dashboard.weekday;const title=document.querySelector('.app-left-main-content-title');if(title)title.textContent=upcoming[0]?.title||'No upcoming training';
    }
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,0));
})();
