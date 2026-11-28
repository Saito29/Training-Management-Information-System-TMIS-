import { showToast } from './toast.js';
import { renderMessage, setupMessageEditor } from './message-editor.js';
import { NOTIFICATION_TYPES, RELATED_PAGES, activeRecipients, resolveRecipients, composeNotifications } from './notification-data.js';
function init(){
 const $=id=>document.getElementById(id),form=$('notificationComposeForm');
 if(!form)return;
 setupMessageEditor($('notificationMessage'));
 let users=[],selected=new Set(),draftId=null,loadedFor=null,pending=null,busy=false,recipientPage=1;
 const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 const currentActor=()=>window.TmisActivity?.actor()||null;
 const draftKey=user=>`tmis-notification-draft:${user.id}`;
 const name=user=>[user.firstName,user.middleName,user.lastName,user.suffix].filter(Boolean).join(' ')||'Unnamed user';
 const readUsers=()=>{const data=JSON.parse(window.TmisStore.getItem('tmis-users')||'[]');if(!Array.isArray(data))throw new Error('User-table data could not be read.');return data;};
 function feedback(message,type='success'){if(type===true)type='error';$('composeFeedback').textContent=message;$('composeFeedback').hidden=true;$('composeFeedback').dataset.type=type;showToast(message,type);}
 function showRecipientLoadError(error){
  const row=make('tr','compose-recipient-error-row'),cell=make('td','', 'Recipient accounts could not be loaded. Check your connection and try again.');cell.colSpan=8;row.append(cell);$('notificationRecipientList').replaceChildren(row);if($('recipientListStatus'))$('recipientListStatus').hidden=true;
  $('recipientResultRange').textContent='Recipient list unavailable';if($('notificationRecipientsEmptyText'))$('notificationRecipientsEmptyText').textContent='Recipient loading failed. Retry to load the user list.';if($('retryNotificationRecipients'))$('retryNotificationRecipients').hidden=false;if($('notificationRecipientsEmpty'))$('notificationRecipientsEmpty').hidden=false;$('notificationAudienceSummary').textContent='Recipient list unavailable.';$('notificationPreviewRecipients').textContent='Unavailable';feedback(error?.message||'Recipient accounts could not be loaded.', 'error');
 }
 function data(){return {summary:$('notificationSummary').value.trim(),title:$('notificationTitle').value.trim(),message:$('notificationMessage').value.trim(),type:$('notificationType').value,priority:$('notificationPriority').value,reference:$('notificationReference').value.trim(),relatedPage:$('notificationRelatedPage').value,audience:form.querySelector('input[name="notificationAudience"]:checked')?.value||'users',role:$('notificationRole').value,recipientIds:[...selected]};}
 function preview(){
  const item=data(),recipients=resolveRecipients(item,users,currentActor()?.id),target=RELATED_PAGES[item.relatedPage]||RELATED_PAGES[''];
  $('notificationTitleCount').textContent=`${$('notificationTitle').value.length} / 100`;$('notificationMessageCount').textContent=`${$('notificationMessage').value.length} / 10,000`;
  $('notificationPreviewTitle').textContent=item.title||'Your notification title';renderMessage($('notificationPreviewMessage'),item.summary||item.message.slice(0,240)||'Your summary will appear here as you type.');
  $('notificationPreviewType').textContent=NOTIFICATION_TYPES[item.type]||'System';$('notificationPreviewPriority').hidden=!['high','critical'].includes(item.priority);$('notificationPreviewPriority').textContent=item.priority==='critical'?'Critical':'Important';$('notificationPreviewPriority').dataset.priority=item.priority;
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
  const item=data(),query=$('notificationRecipientSearch').value.trim().toLowerCase();
  return activeRecipients(users).filter(user=>(item.audience!=='role'||!item.role||user.role===item.role)&&(!$('notificationRecipientRoleFilter').value||user.role===$('notificationRecipientRoleFilter').value)&&(!$('notificationRegionFilter').value||user.region===$('notificationRegionFilter').value)&&(!$('notificationOfficeFilter').value||user.office===$('notificationOfficeFilter').value)&&(!query||[user.id,user.status,name(user),user.role,user.email,user.region,user.office].join(' ').toLowerCase().includes(query)));
 }
 function manualRecipients(){
  if(data().audience==='users')return;selected=new Set(resolveRecipients(data(),users,currentActor()?.id).map(user=>user.id));form.querySelector('input[name="notificationAudience"][value="users"]').checked=true;
 }
 function setRecipientSelected(userId,checked){
  const actorId=currentActor()?.id,user=users.find(item=>String(item.id)===String(userId));
  if(!user||String(user.id)===String(actorId))return;
  manualRecipients();
  if(checked)selected.add(user.id);else selected.delete(user.id);
  audience();dirty();
  [...$('notificationRecipientList').querySelectorAll('input[type="checkbox"]')].find(input=>String(input.value)===String(user.id))?.focus();
 }
 function renderRecipients(){
  const item=data(),actorId=currentActor()?.id,eligible=activeRecipients(users),included=new Set(resolveRecipients(item,users,actorId).map(user=>user.id));
  fillFilter('notificationRecipientRoleFilter',eligible.map(user=>user.role),'All roles');fillFilter('notificationRegionFilter',eligible.map(user=>user.region),'All regions');fillFilter('notificationOfficeFilter',eligible.filter(user=>!$('notificationRegionFilter').value||user.region===$('notificationRegionFilter').value).map(user=>user.office),'All offices');
  $('recipientSelectedCount').textContent=included.size+' selected';$('clearRecipientSelection').disabled=!included.size;
  $('resetRecipientFilters').disabled=!['notificationRecipientSearch','notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter'].some(id=>$(id).value);
  const shown=matchingRecipients(),size=$('recipientRowsPerPage').value,limit=size==='all'?Math.max(1,shown.length):Number(size),pages=Math.max(1,Math.ceil(shown.length/limit));recipientPage=Math.max(1,Math.min(recipientPage,pages));const offset=(recipientPage-1)*limit;
  $('notificationRecipientList').replaceChildren(...shown.slice(offset,offset+limit).map(user=>{
   const isSender=String(user.id)===String(actorId),isSelected=included.has(user.id),row=make('tr',`${isSelected?'is-selected ':''}${isSender?'is-sender-account':'is-recipient-selectable'}`.trim()),cell=make('td',''),checkbox=make('input','');row.dataset.recipientId=String(user.id);row.tabIndex=isSender?-1:0;row.setAttribute('aria-selected',String(isSelected));row.setAttribute('aria-label',isSender?`${name(user)} cannot receive its own notification`:`Toggle ${name(user)} as a recipient`);checkbox.type='checkbox';checkbox.value=user.id;checkbox.checked=isSelected;checkbox.disabled=isSender;checkbox.title=isSender?'Your account cannot receive its own notification':'';checkbox.setAttribute('aria-label',isSender?'Your account cannot be selected as a recipient':`Select ${name(user)}`);
   checkbox.addEventListener('change',()=>setRecipientSelected(user.id,checkbox.checked));cell.append(checkbox);row.append(cell);
   for(const [index,value] of [user.id,user.status,name(user),user.role,user.email,user.region,user.office].entries()){const cell=make('td','');if(index===1)cell.append(make('span','compose-status-badge',value||'Not recorded'));else if(index===2&&isSender){cell.append(make('strong','',value||'Unnamed user'),make('small','compose-current-account-note','Current account; not a recipient'));}else cell.textContent=value||'Not recorded';row.append(cell);}return row;
  }));
  const selectable=shown.filter(user=>String(user.id)!==String(actorId)),count=selectable.filter(user=>included.has(user.id)).length,header=$('selectAllRecipientRows');header.checked=selectable.length>0&&count===selectable.length;header.indeterminate=count>0&&count<selectable.length;header.disabled=!selectable.length;if($('recipientListStatus'))$('recipientListStatus').hidden=true;
  if($('notificationRecipientsEmptyText'))$('notificationRecipientsEmptyText').textContent='No matching users. Try another search or reset your filters.';if($('retryNotificationRecipients'))$('retryNotificationRecipients').hidden=true;if($('notificationRecipientsEmpty'))$('notificationRecipientsEmpty').hidden=shown.length>0;$('recipientPrevious').disabled=recipientPage===1;$('recipientNext').disabled=recipientPage===pages;
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
     $('notificationType').value=Object.hasOwn(NOTIFICATION_TYPES,item.type)?item.type:'system';$('notificationPriority').value=['high','critical'].includes(item.priority)?item.priority:'normal';
     $('notificationReference').value=String(item.reference||'').slice(0,80);$('notificationRelatedPage').value=Object.hasOwn(RELATED_PAGES,item.relatedPage)?item.relatedPage:'';
     const radio=form.querySelector(`input[name="notificationAudience"][value="${['users','role','all'].includes(item.audience)?item.audience:'users'}"]`);radio.checked=true;
     $('notificationRole').value=String(item.role||'');selected=new Set(Array.isArray(item.recipientIds)?item.recipientIds.filter(id=>typeof id==='string'):[]);
     $('notificationDraftStatus').textContent='Draft restored from your account';
    }
   }
   renderRecipients();audience();
  }catch(error){showRecipientLoadError(error);}
 }
 const refreshRecipientsButton=$('refreshRecipientTable');
 if(refreshRecipientsButton)refreshRecipientsButton.addEventListener('click',async()=>{
  refreshRecipientsButton.disabled=true;
  try{await window.TmisStore.refresh();users=readUsers();recipientPage=1;renderRecipients();audience();feedback('Recipient accounts refreshed.');}
  catch(error){showRecipientLoadError(error);}
  finally{refreshRecipientsButton.disabled=false;}
 });
 $('retryNotificationRecipients')?.addEventListener('click',load);
 async function reset(clearDraft=false){
  const actor=currentActor();
  if(clearDraft && actor)await window.TmisStore.removeItem(draftKey(actor));
  form.reset();recipientPage=1;selected.clear();draftId=null;$('notificationRecipientSearch').value='';$('notificationDraftStatus').textContent='No draft saved';renderRecipients();audience();
 }
 form.addEventListener('input',event=>{if(event.target.id==='notificationRecipientSearch')return;dirty();});
 form.addEventListener('change',event=>{if(event.target.name==='notificationAudience'||event.target.id==='notificationRole'){recipientPage=1;audience();}dirty();});
 $('resetRecipientFilters').addEventListener('click',()=>{for(const id of ['notificationRecipientSearch','notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter'])$(id).value='';recipientPage=1;renderRecipients();$('notificationRecipientSearch').focus();});
 $('retryNotificationRecipients').addEventListener('click',load);
 $('clearRecipientSelection').addEventListener('click',()=>{manualRecipients();selected.clear();audience();dirty();feedback('Recipient selection cleared.');});
 const resetRecipientPage=()=>{recipientPage=1;renderRecipients();};
 $('notificationRecipientSearch').addEventListener('input',resetRecipientPage);
 for(const id of ['notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter','recipientRowsPerPage'])$(id).addEventListener('change',resetRecipientPage);
 $('recipientPrevious').addEventListener('click',()=>{recipientPage--;renderRecipients();});$('recipientNext').addEventListener('click',()=>{recipientPage++;renderRecipients();});
 $('notificationRecipientList').addEventListener('click',event=>{if(event.target.closest('input,button,a,label,select,textarea'))return;const row=event.target.closest('tr[data-recipient-id]');if(!row||row.classList.contains('is-sender-account'))return;const checkbox=row.querySelector('input[type="checkbox"]');if(checkbox)setRecipientSelected(row.dataset.recipientId,!checkbox.checked);});
 $('notificationRecipientList').addEventListener('keydown',event=>{const row=event.target.closest('tr[data-recipient-id]');if(!row||row.classList.contains('is-sender-account')||!['Enter',' '].includes(event.key))return;event.preventDefault();const checkbox=row.querySelector('input[type="checkbox"]');if(checkbox)setRecipientSelected(row.dataset.recipientId,!checkbox.checked);});
 $('selectAllRecipientRows').addEventListener('change',event=>{const matches=matchingRecipients(),actorId=currentActor()?.id,checked=event.target.checked;manualRecipients();for(const user of matches){if(String(user.id)===String(actorId))continue;checked?selected.add(user.id):selected.delete(user.id);}audience();dirty();});
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
   if(!resolveRecipients(item,users,currentActor()?.id).length){feedback('Select at least one eligible active recipient. Your own account is not a recipient.','warning');return;}
   const composed=composeNotifications(item,users,actor);
   pending={actorId:actor.id,data:item,recipientIds:composed.map(entry=>entry.recipientId)};
   $('confirmNotificationDescription').textContent=`Create this ${item.priority==='critical'?'critical ':item.priority==='high'?'important ':''}notification for ${composed.length} eligible active ${composed.length===1?'recipient':'recipients'}?`;
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
   const saveResult=await window.TmisStore.setItem('tmis-notifications',JSON.stringify([...existing,...items]));
   window.dispatchEvent(new Event('tmis:notifications-updated'));
   // The inbox write has completed; draft cleanup must not misreport a successful create.
   try{await window.TmisStore.removeItem(draftKey(actor));}catch(cleanupError){console.error('The notification was created, but its saved draft could not be removed.',cleanupError);}
   const batchId=items[0].batchId,notificationType=pending.data.type;await reset(false);$('notificationDraftStatus').textContent='Notification saved';
   $('confirmNotificationDialog').close();
   window.TmisActivity?.record({action:'create',module:'users',title:'Notification created',description:`A notification was saved for ${items.length} recipients.`,reference:batchId});
   if(saveResult?.emailDelivery?.disabled){feedback('Notification created in the TMIS inbox. Email delivery is turned off in System Settings.','info');}
   else if((saveResult?.emailDelivery?.disabledTypes||[]).includes(notificationType)){feedback('Notification created in the TMIS inbox. Email delivery is turned off for this notification type in System Settings.','info');}
   else if(Number(saveResult?.emailDelivery?.failed||0)>0){feedback('Notification created, but one or more emails could not be delivered.','warning');}
   else{feedback('Notification created successfully.','success');}
  }catch(error){$('confirmNotificationDialog').close();feedback(error.message||'The notification could not be created.',true);}
  finally{busy=false;$('confirmNotificationCreate').disabled=false;}
 });
 window.addEventListener('tmis:activity-ready',load);
 window.addEventListener('storage',event=>{if(!event.key||event.key==='tmis-users')load();});
 load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
