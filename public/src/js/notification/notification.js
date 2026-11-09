import { showToast } from './toast.js';
import { renderMessage, setupMessageEditor } from './message-editor.js';
import { NOTIFICATION_TYPES, RELATED_PAGES, activeRecipients, resolveRecipients, composeNotifications } from './notification-data.js';
function init(){
 const $=id=>document.getElementById(id),form=$('notificationComposeForm');
 setupMessageEditor($('notificationMessage'));
	let users=[],selected=new Set(),draftId=null,loadedFor=null,pending=null,busy=false,recipientPage=1,pendingDeleteDraft=null;
 const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 const currentActor=()=>window.TmisActivity?.actor()||null;
 const draftKey=user=>`tmis-notification-draft:${user.id}`;
 const draftsKey=user=>`tmis-notification-drafts:${user.id}`;
 const name=user=>[user.firstName,user.middleName,user.lastName,user.suffix].filter(Boolean).join(' ')||'Unnamed user';
 // Read real registered accounts and discard stale demo rows from old browser sessions.
 const readUsers=()=>{const data=JSON.parse(window.TmisStore.getItem('tmis-users')||'[]');if(!Array.isArray(data))throw new Error('User-table data could not be read.');return data.filter(user=>user&&!user.isNotificationSample);};
 function feedback(message,type='success'){if(type===true)type='error';$('composeFeedback').textContent=message;$('composeFeedback').hidden=true;$('composeFeedback').dataset.type=type;showToast(message,type);}
 // Announce draft-list operations separately from changes made in the Mail form.
 function draftFeedback(message,error=false){$('notificationDraftsFeedback').textContent=message;$('notificationDraftsFeedback').hidden=false;$('notificationDraftsFeedback').dataset.type=error?'error':'success';}
 function data(){return {summary:$('notificationSummary').value.trim(),title:$('notificationTitle').value.trim(),message:$('notificationMessage').value.trim(),type:$('notificationType').value,priority:$('notificationPriority').value,reference:$('notificationReference').value.trim(),relatedPage:$('notificationRelatedPage').value,audience:form.querySelector('input[name="notificationAudience"]:checked')?.value||'users',role:$('notificationRole').value,recipientIds:[...selected]};}
 // Store multiple administrator drafts independently so saving a new message never overwrites an older one.
 function savedDrafts(actor=currentActor()){
  if(!actor?.id)return [];
  const drafts=JSON.parse(window.TmisStore.getItem(draftsKey(actor))||'[]');
  return Array.isArray(drafts)?drafts.filter(item=>item&&typeof item.id==='string'&&item.actorId===actor.id&&item.data):[];
 }
 // Refresh the saved-draft directory without changing the open message form.
 function renderSavedDrafts(){
  const actor=currentActor(),drafts=savedDrafts(actor).sort((a,b)=>Date.parse(b.savedAt||0)-Date.parse(a.savedAt||0));
  $('notificationDraftCount').textContent=String(drafts.length);
  $('notificationDraftsEmpty').hidden=drafts.length>0;
  $('notificationDraftList').replaceChildren(...drafts.map(draft=>{
   const card=make('article','notification-draft-card'),copy=make('div','notification-draft-copy');
   copy.append(make('span','notification-draft-type',NOTIFICATION_TYPES[draft.data.type]||'System'),make('h3','',draft.data.title||'Untitled draft'),make('p','',draft.data.summary||draft.data.message||'No message entered.'),make('small','',`${dateLabel(draft.savedAt)} · ${resolveRecipients(draft.data,users).length} eligible recipients`));
   const actions=make('div','notification-draft-actions'),edit=make('button','btn compose-secondary','Edit & send'),remove=make('button','btn compose-danger','Delete');
   edit.type=remove.type='button';edit.dataset.draftId=remove.dataset.draftId=draft.id;edit.addEventListener('click',()=>restoreDraft(draft));
   // Open a themed review dialog so an accidental click cannot immediately remove a saved message.
   remove.addEventListener('click',()=>{
    pendingDeleteDraft={actorId:actor.id,id:draft.id};
    $('deleteNotificationDraftTitle').textContent=draft.data.title||'Untitled draft';
    $('deleteNotificationDraftType').textContent=NOTIFICATION_TYPES[draft.data.type]||'System';
    $('deleteNotificationDraftSavedAt').textContent=dateLabel(draft.savedAt);
    $('deleteNotificationDraftRecipients').textContent=String(resolveRecipients(draft.data,users).length);
    $('deleteNotificationDraftSummary').textContent=draft.data.summary||draft.data.message||'No message entered.';
    $('deleteNotificationDraftError').hidden=true;
    $('confirmDeleteNotificationDraft').disabled=false;
    $('deleteNotificationDraftDialog').showModal();
   });
   actions.append(edit,remove);card.append(copy,actions);return card;
  }));
 }
 // Display saved-draft timestamps in the same Philippine timezone used across TMIS.
 const dateLabel=value=>{const parsed=value?window.TmisDate.parse(value):null;return !parsed||Number.isNaN(parsed.getTime())?'Date not recorded':new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(parsed);};
 // Restore a saved message into Mail so the administrator can edit it before publishing.
 function restoreDraft(draft){
  const item=draft.data;draftId=draft.id;loadedFor=currentActor()?.id||null;
  $('notificationTitle').value=String(item.title||'').slice(0,100);$('notificationMessage').value=String(item.message||'').slice(0,10000);$('notificationSummary').value=String(item.summary||'').slice(0,240);
  $('notificationType').value=Object.hasOwn(NOTIFICATION_TYPES,item.type)?item.type:'system';$('notificationPriority').value=item.priority==='high'?'high':'normal';
  $('notificationReference').value=String(item.reference||'').slice(0,80);$('notificationRelatedPage').value=Object.hasOwn(RELATED_PAGES,item.relatedPage)?item.relatedPage:'';
  form.querySelector(`input[name="notificationAudience"][value="${['users','role','all'].includes(item.audience)?item.audience:'users'}"]`).checked=true;
  $('notificationRole').value=String(item.role||'');selected=new Set(Array.isArray(item.recipientIds)?item.recipientIds.filter(id=>typeof id==='string'):[]);
  $('notificationDraftStatus').textContent='Editing a saved draft';audience();dirty();document.querySelector('[data-profile-tab="mail"]')?.click();
 }
 // Update both the active composer draft and the saved-draft list after deleting or publishing a draft.
 async function deleteSavedDraft(actor,id){
  const remaining=savedDrafts(actor).filter(item=>item.id!==id);
  await window.TmisStore.setItem(draftsKey(actor),JSON.stringify(remaining));
  if(draftId===id){draftId=null;await window.TmisStore.removeItem(draftKey(actor));}
 }
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
 // Filter the complete registered account list, including ineligible rows for administrator review.
 function matchingRecipients(){
  const item=data(),eligible=item.audience==='role'?users.filter(user=>user.role===item.role):users,query=$('notificationRecipientSearch').value.trim().toLowerCase();
  return eligible.filter(user=>(!$('notificationRecipientRoleFilter').value||user.role===$('notificationRecipientRoleFilter').value)&&(!$('notificationRegionFilter').value||user.region===$('notificationRegionFilter').value)&&(!$('notificationOfficeFilter').value||user.office===$('notificationOfficeFilter').value)&&(!query||[user.id,user.status,name(user),user.role,user.email,user.region,user.office].join(' ').toLowerCase().includes(query)));
 }
 // Recipient rows stay visible for review while inactive accounts remain unselectable.
 const canReceiveNotification=user=>activeRecipients([user]).length>0;
 function manualRecipients(){
  if(data().audience==='users')return;selected=new Set(resolveRecipients(data(),users).map(user=>user.id));form.querySelector('input[name="notificationAudience"][value="users"]').checked=true;
 }
 // Render the detailed recipient directory and disable selection for accounts that cannot receive notices.
 function renderRecipients(){
  const item=data(),eligible=item.audience==='role'?users.filter(user=>user.role===item.role):users,included=new Set(resolveRecipients(item,users).map(user=>user.id));
  fillFilter('notificationRecipientRoleFilter',eligible.map(user=>user.role),'All roles');fillFilter('notificationRegionFilter',eligible.map(user=>user.region),'All regions');fillFilter('notificationOfficeFilter',eligible.filter(user=>!$('notificationRegionFilter').value||user.region===$('notificationRegionFilter').value).map(user=>user.office),'All offices');
  $('recipientSelectedCount').textContent=included.size+' selected';$('clearRecipientSelection').disabled=!included.size;
  $('resetRecipientFilters').disabled=!['notificationRecipientSearch','notificationRecipientRoleFilter','notificationRegionFilter','notificationOfficeFilter'].some(id=>$(id).value);
  const shown=matchingRecipients(),size=$('recipientRowsPerPage').value,limit=size==='all'?Math.max(1,shown.length):Number(size),pages=Math.max(1,Math.ceil(shown.length/limit));recipientPage=Math.max(1,Math.min(recipientPage,pages));const offset=(recipientPage-1)*limit;
  $('notificationRecipientList').replaceChildren(...shown.slice(offset,offset+limit).map(user=>{
   const selectable=canReceiveNotification(user),row=make('tr',`${included.has(user.id)?'is-selected':''}${selectable?'':' is-unavailable'}`),cell=make('td',''),checkbox=make('input','');checkbox.type='checkbox';checkbox.value=user.id;checkbox.checked=included.has(user.id);checkbox.disabled=!selectable;checkbox.title=selectable?'Select this active account':'This account is not active and cannot receive notifications';checkbox.setAttribute('aria-label',`Select ${name(user)}`);
   checkbox.addEventListener('change',()=>{manualRecipients();checkbox.checked?selected.add(user.id):selected.delete(user.id);audience();dirty();const next=[...$('notificationRecipientList').querySelectorAll('input')].find(input=>input.value===user.id);next?.focus();});cell.append(checkbox);row.append(cell);
   const attachments=make('td','compose-recipient-attachments');attachments.append(make('span',user.hasProfilePicture?'compose-attachment-state is-present':'compose-attachment-state is-missing',user.hasProfilePicture?'Profile photo':'No photo'));row.append(attachments);
   const id=String(user.id),accountId=/^\d+$/.test(id)?`USR-${id.padStart(5,'0')}`:id;row.append(make('td','compose-recipient-id',accountId));
   row.append(make('td','compose-recipient-year',String(user.createdAt||'').match(/^\d{4}/)?.[0]||'—'));
   const member=make('td','compose-recipient-member');member.append(make('strong','',name(user)),make('small','',[user.role||'Role not assigned',user.status||'Status not recorded',user.email||'Email not recorded'].join(' · ')));row.append(member);
   row.append(make('td','compose-recipient-location',user.region||'Region not assigned'));
   row.append(make('td','compose-recipient-office',user.office||'Office not assigned'));
   return row;
  }));
  const selectableShown=shown.filter(canReceiveNotification),count=selectableShown.filter(user=>included.has(user.id)).length,header=$('selectAllRecipientRows');header.checked=selectableShown.length>0&&count===selectableShown.length;header.indeterminate=count>0&&count<selectableShown.length;header.disabled=!selectableShown.length;
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
     if(!savedDrafts(actor).some(saved=>saved.id===draft.id)){
      window.TmisStore.setItem(draftsKey(actor),JSON.stringify([{...draft,id:draft.id||crypto.randomUUID()},...savedDrafts(actor)])).then(renderSavedDrafts).catch(()=>draftFeedback('The previous draft could not be copied into the Drafts tab.',true));
     }
    }
   }
   renderRecipients();audience();renderSavedDrafts();
  }catch{feedback('User data or your saved draft could not be loaded. Refresh and try again.',true);}
 }
 async function reset(clearDraft=false){
  const actor=currentActor();
  if(clearDraft&&actor){if(draftId)await deleteSavedDraft(actor,draftId);else await window.TmisStore.removeItem(draftKey(actor));}
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
 $('selectAllRecipientRows').addEventListener('change',event=>{const matches=matchingRecipients().filter(canReceiveNotification),checked=event.target.checked;manualRecipients();for(const user of matches)checked?selected.add(user.id):selected.delete(user.id);audience();dirty();});
 $('refreshNotificationDrafts').addEventListener('click',()=>{try{renderSavedDrafts();draftFeedback('Saved drafts refreshed.');}catch(error){draftFeedback(error.message||'Saved drafts could not be loaded.',true);}});
 // Delete only after an administrator confirms the selected draft in the details dialog.
 $('confirmDeleteNotificationDraft').addEventListener('click',async event=>{
  const button=event.currentTarget,actor=currentActor(),draft=pendingDeleteDraft;
  if(!draft||!actor?.id||actor.id!==draft.actorId)return;
  button.disabled=true;
  try{
   await deleteSavedDraft(actor,draft.id);
   pendingDeleteDraft=null;
   $('deleteNotificationDraftDialog').close();
   renderSavedDrafts();
   draftFeedback('Draft permanently deleted.');
  }catch(error){
   $('deleteNotificationDraftError').textContent=error.message||'The draft could not be deleted. Try again.';
   $('deleteNotificationDraftError').hidden=false;
   button.disabled=false;
  }
 });
 document.querySelectorAll('[data-close-draft-delete]').forEach(button=>button.addEventListener('click',()=>$('deleteNotificationDraftDialog').close()));
 $('deleteNotificationDraftDialog').addEventListener('close',()=>{pendingDeleteDraft=null;});
 document.querySelector('[data-profile-tab="notification-drafts"]')?.addEventListener('click',()=>{try{renderSavedDrafts();}catch(error){draftFeedback(error.message||'Saved drafts could not be loaded.',true);}});
 // Refresh only the recipient table from the authenticated account source.
 $('refreshRecipientTable').addEventListener('click',async event=>{
  const button=event.currentTarget;
  button.disabled=true;
  try{
   const response=await fetch('/ui/data',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-TMIS-PAGE':'app/admin/notification/notification'}});
   if(!response.ok)throw new Error('The account list could not be refreshed.');
   const payload=await response.json(),freshUsers=payload?.stores?.['tmis-users'];
   if(!Array.isArray(freshUsers))throw new Error('The account list response was incomplete.');
   users=freshUsers.filter(user=>user&&!user.isNotificationSample);
   selected=new Set([...selected].filter(id=>users.some(user=>user.id===id)));
   recipientPage=1;renderRecipients();preview();feedback('Recipient table refreshed.');
  }catch(error){feedback(error.message||'The account list could not be refreshed.',true);}
  finally{button.disabled=false;}
 });
 $('saveNotificationDraft').addEventListener('click',async ()=>{
  try{
   const actor=currentActor();if(!actor)throw new Error('Connect your user-table profile before saving a draft.');
   const item=data();if(!item.title&&!item.message){feedback('Enter a title or message before saving a draft.','warning');return;}
   const existingDraft=savedDrafts(actor).some(draft=>draft.id===draftId)||!!window.TmisStore.getItem(draftKey(actor));draftId ||= crypto.randomUUID();
   const draft={id:draftId,actorId:actor.id,savedAt:new Date().toISOString(),data:item};
   const drafts=savedDrafts(actor).filter(saved=>saved.id!==draft.id);drafts.unshift(draft);
   await window.TmisStore.setItem(draftsKey(actor),JSON.stringify(drafts));
   await window.TmisStore.setItem(draftKey(actor),JSON.stringify(draft));
   $('notificationDraftStatus').textContent='Draft saved to TMIS';renderSavedDrafts();feedback('Your notification draft was saved to TMIS.');
   window.TmisActivity?.record({action:existingDraft?'update':'create',module:'users',title:existingDraft?'Notification draft updated':'Notification draft created',description:'A system administrator saved a notification draft for later editing.',reference:draftId});
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
   const actor=currentActor(),item=data();
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
   const latestUsers=users,items=composeNotifications(pending.data,latestUsers,actor);
   if(JSON.stringify(items.map(item=>item.recipientId).sort())!==JSON.stringify([...pending.recipientIds].sort()))throw new Error('The active recipient list changed. Review your selection and confirm again.');
   const existing=JSON.parse(window.TmisStore.getItem('tmis-notifications')||'[]');if(!Array.isArray(existing))throw new Error('The notification inbox data could not be read.');
   await window.TmisStore.setItem('tmis-notifications',JSON.stringify([...existing,...items]));
   window.dispatchEvent(new Event('tmis:notifications-updated'));
   // The inbox write has completed; draft cleanup must not misreport a successful create.
   let draftCleared=true;try{if(draftId)await deleteSavedDraft(actor,draftId);else await window.TmisStore.removeItem(draftKey(actor));}catch{draftCleared=false;}
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
