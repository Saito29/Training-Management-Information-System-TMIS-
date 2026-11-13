import { showToast } from './toast.js';
import { renderMessage, setupMessageEditor } from './message-editor.js';
import { NOTIFICATION_TYPES, RELATED_PAGES, activeRecipients, resolveRecipients, countAvailableRecipients, composeNotifications } from './notification-data.js?v=recipient-row-selection-2';
function init(){
 const $=id=>document.getElementById(id),form=$('notificationComposeForm');
 if(!form)return;
 setupMessageEditor($('notificationMessage'));
 let users=[],selected=new Set(),draftId=null,loadedFor=null,pending=null,busy=false,recipientPage=1;
 const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 $('notificationDeliveryLabel').textContent=window.TMIS_PAGE?'Email and TMIS inbox':'Browser preview only; no email';
 $('notificationDeliveryHelp').textContent=window.TMIS_PAGE?'This saves an in-app notification and emails each selected user. Recipient addresses stay private.':'This creates local browser inbox items only; no email or push is sent in this preview.';
 const currentActor=()=>window.TmisActivity?.actor()||null;
 const draftKey=user=>`tmis-notification-draft:${user.id}`;
 const draftCollectionKey=user=>`tmis-notification-drafts:${user.id}`;
 const name=user=>[user.firstName,user.middleName,user.lastName,user.suffix].filter(Boolean).join(' ')||'Unnamed user';
 const readUsers=()=>{const data=JSON.parse(window.TmisStore.getItem('tmis-users')||'[]');if(!Array.isArray(data))throw new Error('User-table data could not be read.');return data;};
 function feedback(message,type='success'){if(type===true)type='error';$('composeFeedback').textContent=message;$('composeFeedback').hidden=false;$('composeFeedback').dataset.type=type;showToast(message,type);}
 function draftsFeedback(message,type='success'){const field=$('notificationDraftsFeedback');field.textContent=message;field.hidden=false;field.dataset.type=type;showToast(message,type);}
 function savedDrafts(actor){
  const raw=window.TmisStore.getItem(draftCollectionKey(actor)),drafts=raw?JSON.parse(raw):[];
  if(!Array.isArray(drafts))throw new Error('Saved drafts could not be read.');
  const valid=drafts.filter(draft=>draft&&typeof draft.id==='string'&&String(draft.actorId)===String(actor.id)&&draft.data&&typeof draft.data==='object');
  const legacyRaw=window.TmisStore.getItem(draftKey(actor));
  if(legacyRaw){
   const legacy=JSON.parse(legacyRaw);
   if(legacy&&typeof legacy.id==='string'&&String(legacy.actorId)===String(actor.id)&&legacy.data&&typeof legacy.data==='object'&&!valid.some(draft=>draft.id===legacy.id))valid.push(legacy);
  }
  return valid.sort((first,second)=>Date.parse(second.savedAt||'')-Date.parse(first.savedAt||''));
 }
 async function saveDraftCollection(actor,drafts){
  await window.TmisStore.setItem(draftCollectionKey(actor),JSON.stringify(drafts));
  if(window.TmisStore.getItem(draftKey(actor)))await window.TmisStore.removeItem(draftKey(actor));
 }
 async function removeDraft(actor,id){
  if(!id)return;
  const next=savedDrafts(actor).filter(draft=>draft.id!==id);
  if(next.length)await saveDraftCollection(actor,next);
  else{
   await window.TmisStore.removeItem(draftCollectionKey(actor));
   if(window.TmisStore.getItem(draftKey(actor)))await window.TmisStore.removeItem(draftKey(actor));
  }
 }
 function formatDraftDate(value){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'Date not recorded':new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short'}).format(date);
 }
 function restoreDraft(draft){
  const actor=currentActor(),item=draft.data;
  draftId=draft.id;
  $('notificationTitle').value=String(item.title||'').slice(0,100);$('notificationMessage').value=String(item.message||'').slice(0,10000);$('notificationSummary').value=String(item.summary||'').slice(0,240);
  $('notificationType').value=Object.hasOwn(NOTIFICATION_TYPES,item.type)?item.type:'system';$('notificationPriority').value=item.priority==='high'?'high':'normal';
  $('notificationReference').value=String(item.reference||'').slice(0,80);$('notificationRelatedPage').value=Object.hasOwn(RELATED_PAGES,item.relatedPage)?item.relatedPage:'';
  const radio=form.querySelector(`input[name="notificationAudience"][value="${['users','role','all'].includes(item.audience)?item.audience:'users'}"]`);
  if(radio)radio.checked=true;
  $('notificationRole').value=String(item.role||'');
  const eligibleIds=new Set(activeRecipients(users,actor?.id).map(user=>user.id));
  selected=new Set(Array.isArray(item.recipientIds)?item.recipientIds.filter(id=>typeof id==='string'&&eligibleIds.has(id)):[]);
  $('notificationDraftStatus').textContent='Draft restored from your account';
  renderRecipients();audience();
 }
 function renderDrafts(){
  const list=$('notificationDraftList'),empty=$('notificationDraftsEmpty'),count=$('notificationDraftCount'),actor=currentActor();
  if(!actor){list.replaceChildren();empty.hidden=false;count.textContent='0';return;}
  const drafts=savedDrafts(actor),activeUser=currentActor();
  count.textContent=String(drafts.length);
  list.replaceChildren(...drafts.map(draft=>{
   const card=make('article','notification-draft-card'),copy=make('div','notification-draft-copy'),actions=make('div','notification-draft-actions');
   copy.append(make('span','notification-draft-type',NOTIFICATION_TYPES[draft.data.type]||'System'));
   copy.append(make('h3','',String(draft.data.title||'Untitled draft')));
   copy.append(make('p','',String(draft.data.summary||draft.data.message||'No message preview').slice(0,220)));
   copy.append(make('small','',`${formatDraftDate(draft.savedAt)} · ${resolveRecipients(draft.data,users,activeUser).length} eligible recipients`));
   const open=make('button','btn compose-secondary','Open draft');open.type='button';open.addEventListener('click',()=>{restoreDraft(draft);$('mail-tab').click();});
   const remove=make('button','btn compose-danger','Delete');remove.type='button';remove.addEventListener('click',()=>confirmDraftDeletion(draft,activeUser));
   actions.append(open,remove);card.append(copy,actions);return card;
  }));
  empty.hidden=drafts.length>0;
 }
 function confirmDraftDeletion(draft,actor){
  const dialog=$('deleteNotificationDraftDialog');
  dialog.dataset.draftId=draft.id;dialog.dataset.actorId=String(actor.id);
  $('deleteNotificationDraftTitle').textContent=String(draft.data.title||'Untitled draft');
  $('deleteNotificationDraftType').textContent=NOTIFICATION_TYPES[draft.data.type]||'System';
  $('deleteNotificationDraftSavedAt').textContent=formatDraftDate(draft.savedAt);
  $('deleteNotificationDraftRecipients').textContent=String(resolveRecipients(draft.data,users,actor).length);
  $('deleteNotificationDraftSummary').textContent=String(draft.data.summary||draft.data.message||'No message preview').slice(0,300);
  $('deleteNotificationDraftError').hidden=true;
  dialog.showModal();
 }
 function data(){return {summary:$('notificationSummary').value.trim(),title:$('notificationTitle').value.trim(),message:$('notificationMessage').value.trim(),type:$('notificationType').value,priority:$('notificationPriority').value,reference:$('notificationReference').value.trim(),relatedPage:$('notificationRelatedPage').value,audience:form.querySelector('input[name="notificationAudience"]:checked')?.value||'users',role:$('notificationRole').value,recipientIds:[...selected]};}
 function preview(){
  const item=data(),recipients=resolveRecipients(item,users,currentActor()),target=RELATED_PAGES[item.relatedPage]||RELATED_PAGES[''];
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
  const item=data(),actor=currentActor(),eligible=item.audience==='role'?resolveRecipients(item,users,actor):activeRecipients(users,actor?.id),query=$('notificationRecipientSearch').value.trim().toLowerCase();
  return eligible.filter(user=>(!$('notificationRecipientRoleFilter').value||user.role===$('notificationRecipientRoleFilter').value)&&(!$('notificationRegionFilter').value||user.region===$('notificationRegionFilter').value)&&(!$('notificationOfficeFilter').value||user.office===$('notificationOfficeFilter').value)&&(!query||[user.id,user.status,name(user),user.role,user.email,user.region,user.office].join(' ').toLowerCase().includes(query)));
 }
 function manualRecipients(){
  if(data().audience==='users')return;selected=new Set(resolveRecipients(data(),users,currentActor()).map(user=>user.id));form.querySelector('input[name="notificationAudience"][value="users"]').checked=true;
 }
 function renderRecipients(){
  const item=data(),actor=currentActor(),eligible=item.audience==='role'?resolveRecipients(item,users,actor):activeRecipients(users,actor?.id),included=new Set(resolveRecipients(item,users,actor).map(user=>user.id));
  fillFilter('notificationRecipientRoleFilter',eligible.map(user=>user.role),'All roles');fillFilter('notificationRegionFilter',eligible.map(user=>user.region),'All regions');fillFilter('notificationOfficeFilter',eligible.filter(user=>!$('notificationRegionFilter').value||user.region===$('notificationRegionFilter').value).map(user=>user.office),'All offices');
  $('recipientSelectedCount').textContent=included.size+' selected';$('clearRecipientSelection').disabled=!included.size;
  $('resetRecipientFilters').disabled=!['notificationRecipientSearch','notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter'].some(id=>$(id).value);
  const shown=matchingRecipients(),size=$('recipientRowsPerPage').value,limit=size==='all'?Math.max(1,shown.length):Number(size),pages=Math.max(1,Math.ceil(shown.length/limit));recipientPage=Math.max(1,Math.min(recipientPage,pages));const offset=(recipientPage-1)*limit;
  $('notificationRecipientList').replaceChildren(...shown.slice(offset,offset+limit).map(user=>{
   const row=make('tr',included.has(user.id)?'is-selected':''),cell=make('td',''),checkbox=make('input','');checkbox.type='checkbox';checkbox.value=user.id;checkbox.checked=included.has(user.id);checkbox.setAttribute('aria-label',`Select ${name(user)}`);
   const updateSelection=(checked,focusCheckbox)=>{manualRecipients();checked?selected.add(user.id):selected.delete(user.id);audience();dirty();if(focusCheckbox){const next=[...$('notificationRecipientList').querySelectorAll('input')].find(input=>input.value===user.id);next?.focus();}};
   checkbox.addEventListener('change',()=>updateSelection(checkbox.checked,true));
   row.addEventListener('click',event=>{if(event.target instanceof Element&&event.target.closest('input,button,a,label'))return;updateSelection(!checkbox.checked,false);});
   row.classList.add('recipient-row-selectable');cell.append(checkbox);row.append(cell);
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
    const draft=savedDrafts(actor)[0];
    if(draft)restoreDraft(draft);
   }
   renderRecipients();audience();renderDrafts();
  }catch{feedback('User data or your saved draft could not be loaded. Refresh and try again.',true);}
 }
 async function reset(clearDraft=false){
  const actor=currentActor();
  if(clearDraft && actor)await removeDraft(actor,draftId);
  form.reset();recipientPage=1;selected.clear();draftId=null;$('notificationRecipientSearch').value='';$('notificationDraftStatus').textContent='No draft saved';renderRecipients();audience();
 }
 form.addEventListener('input',event=>{if(event.target.id==='notificationRecipientSearch')return;dirty();});
 form.addEventListener('change',event=>{if(event.target.name==='notificationAudience'||event.target.id==='notificationRole'){recipientPage=1;audience();}dirty();});
 $('resetRecipientFilters').addEventListener('click',()=>{for(const id of ['notificationRecipientSearch','notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter'])$(id).value='';recipientPage=1;renderRecipients();$('notificationRecipientSearch').focus();});
 $('refreshRecipientTable').addEventListener('click',async event=>{
  const button=event.currentTarget;button.disabled=true;
  try{
   if(window.TMIS_PAGE)await window.TmisStore.refresh();
   users=readUsers();
   const actor=currentActor(),eligibleIds=new Set(activeRecipients(users,actor?.id).map(user=>user.id));
   selected=new Set([...selected].filter(id=>eligibleIds.has(id)));
   renderRecipients();audience();
   renderDrafts();
   const available=countAvailableRecipients(data(),users,actor);
   feedback(`Recipient list refreshed. ${available} ${available===1?'account is':'accounts are'} available.`);
  }catch(error){feedback(error.message||'The recipient list could not be refreshed.',true);}
  finally{button.disabled=false;}
 });
 $('refreshNotificationDrafts').addEventListener('click',async event=>{
  const button=event.currentTarget;button.disabled=true;
  try{
   if(window.TMIS_PAGE)await window.TmisStore.refresh();
   users=readUsers();renderDrafts();draftsFeedback('Saved drafts refreshed from the database.');
  }catch(error){draftsFeedback(error.message||'Saved drafts could not be refreshed.','error');}
  finally{button.disabled=false;}
 });
 $('confirmDeleteNotificationDraft').addEventListener('click',async event=>{
  const button=event.currentTarget,dialog=$('deleteNotificationDraftDialog'),actor=currentActor();
  button.disabled=true;
  try{
   if(!actor||String(actor.id)!==dialog.dataset.actorId)throw new Error('The current account changed. Refresh drafts and try again.');
   const id=dialog.dataset.draftId;
   if(!savedDrafts(actor).some(draft=>draft.id===id))throw new Error('This draft no longer exists. Refresh the list and try again.');
   await removeDraft(actor,id);
   if(draftId===id){draftId=null;$('notificationDraftStatus').textContent='No draft saved';}
   renderDrafts();dialog.close();draftsFeedback('The notification draft was deleted.');
  }catch(error){const field=$('deleteNotificationDraftError');field.textContent=error.message||'The draft could not be deleted.';field.hidden=false;}
  finally{button.disabled=false;}
 });
 $('deleteNotificationDraftDialog').querySelectorAll('[data-close-draft-delete]').forEach(button=>button.addEventListener('click',()=> $('deleteNotificationDraftDialog').close()));
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
 $('loadSampleRecipients')?.addEventListener('click',async ()=>await samples());$('removeSampleRecipients')?.addEventListener('click',async ()=>await samples(true));
 $('saveNotificationDraft').addEventListener('click',async ()=>{
  try{
   const actor=currentActor();if(!actor)throw new Error('Connect your user-table profile before saving a draft.');
   const item=data();if(!item.title&&!item.message){feedback('Enter a title or message before saving a draft.','warning');return;}
   const drafts=savedDrafts(actor),existed=drafts.some(draft=>draft.id===draftId);draftId ||= crypto.randomUUID();
   const saved={id:draftId,actorId:actor.id,savedAt:new Date().toISOString(),data:item};
   await saveDraftCollection(actor,[saved,...drafts.filter(draft=>draft.id!==draftId)]);
   $('notificationDraftStatus').textContent='Draft saved to the database';renderDrafts();feedback('Your notification draft was saved to the database.');
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
   if(!resolveRecipients(item,users,actor).length){feedback('Select at least one active recipient other than yourself.','warning');return;}
   const composed=composeNotifications(item,users,actor);
   if(composed.length>100){feedback('Send notifications to no more than 100 users at a time.','warning');return;}
   pending={actorId:actor.id,data:item,recipientIds:composed.map(entry=>entry.recipientId)};
   $('confirmNotificationDescription').textContent=`Create this ${item.priority==='high'?'important ':''}notification for ${composed.length} active ${composed.length===1?'recipient':'recipients'}?`;
   const delivery=window.TMIS_PAGE?'Email and TMIS inbox':'Browser preview only; no email';
   const entries=[['Title',item.title],['Type',NOTIFICATION_TYPES[item.type]],['Audience',item.audience==='all'?'All active users':item.audience==='role'?item.role:'Selected users'],['Delivery',delivery]];
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
   let draftCleared=true;try{await removeDraft(actor,draftId);}catch{draftCleared=false;}
   const batchId=items[0].batchId;await reset(false);$('notificationDraftStatus').textContent='Notification saved';
   $('confirmNotificationDialog').close();
   let deliveryMessage=' No email or push was sent in this browser preview.',deliveryWarning=false;
   if(window.TMIS_PAGE){
    const delivery=saveResult?.emailDelivery;
    if(!delivery){deliveryMessage=' Email delivery results were not returned by the server; check notification logs.';deliveryWarning=true;}
    else{deliveryMessage=` Email accepted for delivery to ${delivery.accepted} recipient${delivery.accepted===1?'':'s'}; ${delivery.failed} failed.`;deliveryWarning=delivery.failed>0;}
   }
   feedback(`Created ${items.length} TMIS inbox ${items.length===1?'notification':'notifications'}.${deliveryMessage}${draftCleared?'':' The old draft could not be cleared.'}`,deliveryWarning||!draftCleared?'warning':'success');
   window.TmisActivity?.record({action:'create',module:'users',title:'Notification created',description:`A notification was saved for ${items.length} recipients.`,reference:batchId});
  }catch(error){$('confirmNotificationDialog').close();feedback(error.message||'The notification could not be created.',true);}
  finally{busy=false;$('confirmNotificationCreate').disabled=false;}
 });
 window.addEventListener('tmis:activity-ready',load);
 window.addEventListener('tmis:data-updated',()=>{try{users=readUsers();renderDrafts();}catch(error){draftsFeedback(error.message||'Saved drafts could not be refreshed.','error');}});
 window.addEventListener('storage',event=>{if(!event.key||event.key==='tmis-users')load();});
 load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
