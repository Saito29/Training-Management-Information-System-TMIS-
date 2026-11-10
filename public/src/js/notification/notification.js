import { showToast } from './toast.js';
import { renderMessage, setupMessageEditor } from './message-editor.js';
import { NOTIFICATION_TYPES, RELATED_PAGES, activeRecipients, resolveRecipients, composeNotifications } from './notification-data.js';
function init(){
 const $=id=>document.getElementById(id),form=$('notificationComposeForm');
 setupMessageEditor($('notificationMessage'));
 let users=[],selected=new Set(),draftId=null,loadedFor=null,pending=null,busy=false,recipientPage=1;
 const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 const currentActor=()=>window.TmisActivity?.actor()||null;
 const draftKey=user=>`tmis-notification-draft:${user.id}`;
 const name=user=>[user.firstName,user.middleName,user.lastName,user.suffix].filter(Boolean).join(' ')||'Unnamed user';
 const readUsers=()=>{const data=JSON.parse(window.TmisStore.getItem('tmis-users')||'[]');if(!Array.isArray(data))throw new Error('User-table data could not be read.');return data;};
 function feedback(message,type='success'){if(type===true)type='error';$('composeFeedback').textContent=message;$('composeFeedback').hidden=true;$('composeFeedback').dataset.type=type;showToast(message,type);}
 function data(){return {summary:$('notificationSummary').value.trim(),title:$('notificationTitle').value.trim(),message:$('notificationMessage').value.trim(),type:$('notificationType').value,priority:$('notificationPriority').value,reference:$('notificationReference').value.trim(),relatedPage:$('notificationRelatedPage').value,audience:form.querySelector('input[name="notificationAudience"]:checked')?.value||'users',role:$('notificationRole').value,recipientIds:[...selected]};}
 function preview(){
  const item=data(),recipients=resolveRecipients(item,users),target=RELATED_PAGES[item.relatedPage]||RELATED_PAGES[''];
  $('notificationTitleCount').textContent=`${$('notificationTitle').value.length} / 100`;$('notificationMessageCount').textContent=`${$('notificationMessage').value.length} / 10,000`;
  $('notificationPreviewTitle').textContent=item.title||'Your notification title';renderMessage($('notificationPreviewMessage'),item.summary||item.message.slice(0,240)||'Your summary will appear here as you type.');
  $('notificationPreviewType').textContent=NOTIFICATION_TYPES[item.type]||'System';$('notificationPreviewPriority').hidden=item.priority!=='high';
  $('notificationPreviewIcon').className=`bi ${{system:'bi-bell',account:'bi-person-check',training:'bi-journal-text',participants:'bi-people',evaluation:'bi-clipboard-check'}[item.type]||'bi-bell'}`;
  $('notificationPreviewReference').hidden=!item.reference;$('notificationPreviewReference').textContent=item.reference;
  $('notificationPreviewAction').hidden=!target.href;$('notificationPreviewAction').textContent=target.href?`Open ${target.label.toLowerCase()}`:'';
  $('notificationPreviewRecipients').textContent=`${recipients.length} ${recipients.length===1?'user':'users'}`;
  $('notificationAudienceSummary').textContent=recipients.length?`${recipients.length} active ${recipients.length===1?'recipient':'recipients'} selected${item.audience==='role'?` for ${item.role}`:''}.`:'No active recipients selected.';
 }
 $('previewNotificationModal').addEventListener('click',()=>{const item=data();window.dispatchEvent(new CustomEvent('tmis:notification-preview',{detail:{title:item.title||'Notification preview',summary:item.summary||item.message.slice(0,240),message:item.message,type:NOTIFICATION_TYPES[item.type],time:'Draft preview',reference:item.reference,priority:item.priority}}));});
 function dirty(){ $('notificationDraftStatus').textContent='Unsaved changes';preview(); }
 function fillFilter(id,values,label){
  const field=$(id),previous=field.value;field.replaceChildren(new Option(label,''),...Array.from(new Set(values.filter(Boolean))).sort().map(value=>new Option(value,value)));if([...field.options].some(option=>option.value===previous))field.value=previous;
 }
 function matchingRecipients(){
  const item=data(),eligible=item.audience==='role'?resolveRecipients(item,users):activeRecipients(users),query=$('notificationRecipientSearch').value.trim().toLowerCase();
  return eligible.filter(user=>(!$('notificationRecipientRoleFilter').value||user.role===$('notificationRecipientRoleFilter').value)&&(!$('notificationRegionFilter').value||user.region===$('notificationRegionFilter').value)&&(!$('notificationOfficeFilter').value||user.office===$('notificationOfficeFilter').value)&&(!query||[user.id,user.status,name(user),user.role,user.email,user.region,user.office].join(' ').toLowerCase().includes(query)));
 }
 function manualRecipients(){
  if(data().audience==='users')return;selected=new Set(resolveRecipients(data(),users).map(user=>user.id));form.querySelector('input[name="notificationAudience"][value="users"]').checked=true;
 }
 function renderRecipients(){
  const item=data(),eligible=item.audience==='role'?resolveRecipients(item,users):activeRecipients(users),included=new Set(resolveRecipients(item,users).map(user=>user.id));
  fillFilter('notificationRecipientRoleFilter',eligible.map(user=>user.role),'All roles');fillFilter('notificationRegionFilter',eligible.map(user=>user.region),'All regions');fillFilter('notificationOfficeFilter',eligible.filter(user=>!$('notificationRegionFilter').value||user.region===$('notificationRegionFilter').value).map(user=>user.office),'All offices');
  $('recipientSelectedCount').textContent=included.size+' selected';$('clearRecipientSelection').disabled=!included.size;
  $('resetRecipientFilters').disabled=!['notificationRecipientSearch','notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter'].some(id=>$(id).value);
  const shown=matchingRecipients(),size=$('recipientRowsPerPage').value,limit=size==='all'?Math.max(1,shown.length):Number(size),pages=Math.max(1,Math.ceil(shown.length/limit));recipientPage=Math.max(1,Math.min(recipientPage,pages));const offset=(recipientPage-1)*limit;
  $('notificationRecipientList').replaceChildren(...shown.slice(offset,offset+limit).map(user=>{
   const row=make('tr',included.has(user.id)?'is-selected':''),cell=make('td',''),checkbox=make('input','');checkbox.type='checkbox';checkbox.value=user.id;checkbox.checked=included.has(user.id);checkbox.setAttribute('aria-label',`Select ${name(user)}`);
   checkbox.addEventListener('change',()=>{manualRecipients();checkbox.checked?selected.add(user.id):selected.delete(user.id);audience();dirty();const next=[...$('notificationRecipientList').querySelectorAll('input')].find(input=>input.value===user.id);next?.focus();});cell.append(checkbox);row.append(cell);
   for(const [index,value] of [user.id,user.status,name(user),user.role,user.email,user.region,user.office].entries()){const cell=make('td','');if(index===1)cell.append(make('span','compose-status-badge',value||'Not recorded'));else cell.textContent=value||'Not recorded';row.append(cell);}return row;
  }));
  const count=shown.filter(user=>included.has(user.id)).length,header=$('selectAllRecipientRows');header.checked=shown.length>0&&count===shown.length;header.indeterminate=count>0&&count<shown.length;header.disabled=!shown.length;
  $('notificationRecipientsEmpty').hidden=shown.length>0;$('recipientPrevious').disabled=recipientPage===1;$('recipientNext').disabled=recipientPage===pages;
  $('recipientResultRange').textContent=`${shown.length?offset+1:0}\u2013${Math.min(offset+limit,shown.length)} of ${shown.length} users`;$('recipientPageNumber').textContent=`Page ${recipientPage} of ${pages}`;
 }
 function audience(){
  const mode=data().audience;$('notificationRoleField').hidden=mode!=='role';$('notificationRole').disabled=mode!=='role';$('notificationRole').required=mode==='role';$('notificationUserPicker').hidden=false;renderRecipients();preview();
 }
 function load(){
  try{
   users=readUsers();const actor=currentActor();
   if(actor && loadedFor!==actor.id){
    loadedFor=actor.id;
    const raw=window.TmisStore.getItem(draftKey(actor)),draft=raw?JSON.parse(raw):null;
    if(draft?.actorId===actor.id && draft.data){
     const item=draft.data;draftId=draft.id||null;
     $('notificationTitle').value=String(item.title||'').slice(0,100);$('notificationMessage').value=String(item.message||'').slice(0,10000);$('notificationSummary').value=String(item.summary||'').slice(0,240);
     $('notificationType').value=Object.hasOwn(NOTIFICATION_TYPES,item.type)?item.type:'system';$('notificationPriority').value=item.priority==='high'?'high':'normal';
     $('notificationReference').value=String(item.reference||'').slice(0,80);$('notificationRelatedPage').value=Object.hasOwn(RELATED_PAGES,item.relatedPage)?item.relatedPage:'';
     const radio=form.querySelector(`input[name="notificationAudience"][value="${['users','role','all'].includes(item.audience)?item.audience:'users'}"]`);radio.checked=true;
     $('notificationRole').value=String(item.role||'');selected=new Set(Array.isArray(item.recipientIds)?item.recipientIds.filter(id=>typeof id==='string'):[]);
     $('notificationDraftStatus').textContent='Draft restored from your account';
    }
   }
   renderRecipients();audience();
  }catch{feedback('User data or your saved draft could not be loaded. Refresh and try again.',true);}
 }
 async function reset(clearDraft=false){
  const actor=currentActor();
  if(clearDraft && actor)await window.TmisStore.removeItem(draftKey(actor));
  form.reset();recipientPage=1;selected.clear();draftId=null;$('notificationRecipientSearch').value='';$('notificationDraftStatus').textContent='No draft saved';renderRecipients();audience();
 }
 form.addEventListener('input',event=>{if(event.target.id==='notificationRecipientSearch')return;dirty();});
 form.addEventListener('change',event=>{if(event.target.name==='notificationAudience'||event.target.id==='notificationRole'){recipientPage=1;audience();}dirty();});
 $('resetRecipientFilters').addEventListener('click',()=>{for(const id of ['notificationRecipientSearch','notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter'])$(id).value='';recipientPage=1;renderRecipients();$('notificationRecipientSearch').focus();});
 $('clearRecipientSelection').addEventListener('click',()=>{manualRecipients();selected.clear();audience();dirty();feedback('Recipient selection cleared.');});
 const resetRecipientPage=()=>{recipientPage=1;renderRecipients();};
 $('notificationRecipientSearch').addEventListener('input',resetRecipientPage);
 for(const id of ['notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter','recipientRowsPerPage'])$(id).addEventListener('change',resetRecipientPage);
 $('recipientPrevious').addEventListener('click',()=>{recipientPage--;renderRecipients();});$('recipientNext').addEventListener('click',()=>{recipientPage++;renderRecipients();});
 $('selectAllRecipientRows').addEventListener('change',event=>{const matches=matchingRecipients(),checked=event.target.checked;manualRecipients();for(const user of matches)checked?selected.add(user.id):selected.delete(user.id);audience();dirty();});
 async function samples(remove=false){
  if(window.TMIS_PAGE){feedback('Recipient selection uses registered accounts from the database.',true);return;}
  try{const current=readUsers(),records=Array.from({length:60},(_,i)=>({id:'SAMPLE-MAIL-'+String(i+1).padStart(3,'0'),firstName:['Ana','Carlos','Maria','Jose','Liza','Paolo','Rosa','Miguel','Elena','Daniel'][i%10],lastName:['Reyes','Santos','Cruz','Garcia','Ramos','Mendoza'][Math.floor(i/10)],status:i%2?'Active':'Approved & Accepted',role:['Data Encoder','Program Administrator','Program Head','System Administrator'][Math.floor(i/5)%4],email:'sample.user'+(i+1)+'@example.com',region:['Region I','Region II','Region III','Region IV-A','Region V'][i%5],office:['Regional Office','Provincial Office','Municipal Office'][Math.floor(i/5)%3],isNotificationSample:true}));
  const next=remove?current.filter(user=>!user.isNotificationSample):[...current,...records.filter(user=>!current.some(existing=>existing.id===user.id))];await window.TmisStore.setItem('tmis-users',JSON.stringify(next));if(remove)for(const user of current)if(user.isNotificationSample)selected.delete(user.id);recipientPage=1;for(const id of ['notificationRecipientSearch','notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter'])$(id).value='';load();window.dispatchEvent(new StorageEvent('storage',{key:'tmis-users'}));feedback(remove?'Sample users removed.':'60 sample users are available in this browser.');}catch{feedback('Sample users could not be updated. Check browser storage.',true);}
 }
 $('loadSampleRecipients').addEventListener('click',async ()=>await samples());$('removeSampleRecipients').addEventListener('click',async ()=>await samples(true));
 $('saveNotificationDraft').addEventListener('click',async ()=>{
  try{
   const actor=currentActor();if(!actor)throw new Error('Connect your user-table profile before saving a draft.');
   const item=data();if(!item.title&&!item.message){feedback('Enter a title or message before saving a draft.','warning');return;}
   const existed=!!window.TmisStore.getItem(draftKey(actor));draftId ||= crypto.randomUUID();
   await window.TmisStore.setItem(draftKey(actor),JSON.stringify({id:draftId,actorId:actor.id,savedAt:new Date().toISOString(),data:item}));
   $('notificationDraftStatus').textContent='Draft saved to the database';feedback('Your notification draft was saved to the database.');
   window.TmisActivity?.record({action:existed?'update':'create',module:'users',title:existed?'Notification draft updated':'Notification draft created',description:'An account notification draft was saved.',reference:draftId});
  }catch(error){feedback(error.message||'The draft could not be saved.',true);}
 });
 $('resetNotificationForm').addEventListener('click',async ()=>{
  if(!window.confirm('Clear this form and its saved draft?'))return;
  try{await reset(true);feedback('The form and saved draft were cleared.');}catch{feedback('The saved draft could not be cleared.',true);}
 });
 form.addEventListener('invalid',()=>{if(!form.dataset.validationToast){form.dataset.validationToast='true';feedback('Complete the required fields before creating a notification.','warning');setTimeout(()=>delete form.dataset.validationToast,0);}},true);
 form.addEventListener('submit',event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;
  try{
   users=readUsers();const actor=currentActor(),item=data();
   if(!resolveRecipients(item,users).length){feedback('Select at least one active recipient.','warning');return;}
   const composed=composeNotifications(item,users,actor);
   pending={actorId:actor.id,data:item,recipientIds:composed.map(entry=>entry.recipientId)};
   $('confirmNotificationDescription').textContent=`Create this ${item.priority==='high'?'important ':''}notification for ${composed.length} active ${composed.length===1?'recipient':'recipients'}?`;
   const entries=[['Title',item.title],['Type',NOTIFICATION_TYPES[item.type]],['Audience',item.audience==='all'?'All active users':item.audience==='role'?item.role:'Selected users'],['Delivery','User inbox']];
   $('confirmNotificationDetails').replaceChildren(...entries.map(([label,value])=>{const row=make('div','');row.append(make('dt','',label),make('dd','',value));return row;}));
   $('confirmNotificationDialog').showModal();
  }catch(error){feedback(error.message||'Review the notification details.',true);}
 });
 $('confirmNotificationDialog').addEventListener('close',()=>{pending=null;});
 $('confirmNotificationCreate').addEventListener('click',async ()=>{
  if(!pending||busy)return;busy=true;$('confirmNotificationCreate').disabled=true;
  try{
   const actor=currentActor();if(!actor||actor.id!==pending.actorId)throw new Error('The current account changed. Review the recipients and try again.');
   const latestUsers=readUsers(),items=composeNotifications(pending.data,latestUsers,actor);
   if(JSON.stringify(items.map(item=>item.recipientId).sort())!==JSON.stringify([...pending.recipientIds].sort()))throw new Error('The active recipient list changed. Review your selection and confirm again.');
   const existing=JSON.parse(window.TmisStore.getItem('tmis-notifications')||'[]');if(!Array.isArray(existing))throw new Error('The notification inbox data could not be read.');
   await window.TmisStore.setItem('tmis-notifications',JSON.stringify([...existing,...items]));
   window.dispatchEvent(new Event('tmis:notifications-updated'));
   // The inbox write has completed; draft cleanup must not misreport a successful create.
   let draftCleared=true;try{await window.TmisStore.removeItem(draftKey(actor));}catch{draftCleared=false;}
   const batchId=items[0].batchId;await reset(false);$('notificationDraftStatus').textContent='Notification saved';
   $('confirmNotificationDialog').close();feedback(`Created ${items.length} user inbox ${items.length===1?'notification':'notifications'}. No email or push was sent.${draftCleared?'':' The old draft could not be cleared.'}`,draftCleared?'success':'warning');
   window.TmisActivity?.record({action:'create',module:'users',title:'Notification created',description:`A notification was saved for ${items.length} recipients.`,reference:batchId});
  }catch(error){$('confirmNotificationDialog').close();feedback(error.message||'The notification could not be created.',true);}
  finally{busy=false;$('confirmNotificationCreate').disabled=false;}
 });
 window.addEventListener('tmis:activity-ready',load);
 window.addEventListener('storage',event=>{if(!event.key||event.key==='tmis-users')load();});
 load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
