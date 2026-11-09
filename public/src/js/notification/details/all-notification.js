import { showToast } from '../toast.js';
import { renderMessage } from '../message-editor.js?v=role-access-message-templates-1';
import { buildNotifications, safeNotificationLink } from './notification-data.js';
function init() {
  const $ = id => document.getElementById(id);
  const types={account:'Account',training:'Training',participants:'Participants',evaluation:'Evaluation',system:'System'};
  const icons={account:'bi-person-check',training:'bi-journal-text',participants:'bi-people',evaluation:'bi-clipboard-check',system:'bi-bell'};
  const adminRoot=new URL('../../',location.href);
  let user=null,notifications=[],state={},view='all',page=1,size='10';
  const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const parse=(text,fallback)=>{try{return JSON.parse(text)||fallback;}catch{return fallback;}};
  const date=value=>{const parsed=value?window.TmisDate.parse(value):null;return !parsed||Number.isNaN(parsed.getTime())?'Date not recorded':new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(parsed);};
  const systemReference=item=>{
    const reference=String(item.reference||'');
    const roleAccessNotice=/role|permission|access profile/i.test(String(item.title||''));
    if(roleAccessNotice)return /^TMIS-[A-Z0-9]{12}$/.test(reference)?reference:'';
    return /^\d+$/.test(reference)?'':reference;
  };
  function day(value){const parsed=window.TmisDate.parse(value);if(!value||Number.isNaN(parsed.getTime()))return '';return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Manila'}).format(parsed);}
  function group(value){const today=day(Date.now()),yesterday=day(Date.now()-86400000),current=day(value);return current===today?'Today':current===yesterday?'Yesterday':'Earlier';}
  const stateKey=()=>`tmis-notification-state:${user?.id}`;
  const itemState=item=>({...item,...state[item.id]});
  const read=item=>!!itemState(item).readAt;
  const archived=item=>!!itemState(item).archivedAt;
  function feedback(message,error=false){$('inboxFeedback').hidden=true;$('inboxFeedback').textContent=message;showToast(message,error?'error':'success');}
  async function save(changes){
    const next={...state};for(const [id,change] of changes)next[id]={...(state[id]||{}),...change};
    try{if(user)await window.TmisStore.setItem(stateKey(),JSON.stringify(next));else throw new Error();state=next;return true;}
    catch{feedback('Notification changes could not be saved to the database. Try again.',true);return false;}
  }
  async function mark(item,unread=false){if(await save([[item.id,{readAt:unread?null:new Date().toISOString()}]])){render();feedback(unread?'Notification marked unread.':'Notification marked as read.');}}
  async function archive(item,restore=false){if(await save([[item.id,{archivedAt:restore?null:new Date().toISOString(),...(!restore?{readAt:itemState(item).readAt||new Date().toISOString()}: {})}]])){render();feedback(restore?'Notification restored to your inbox.':'Notification archived. You can find it in Archived.');}}
  async function markAll(){const unread=notifications.filter(item=>!archived(item)&&!read(item));if(!unread.length)return;if(await save(unread.map(item=>[item.id,{readAt:new Date().toISOString()}]))){render();feedback('All inbox notifications marked as read.');}}
  async function open(item){
    if(!read(item))await mark(item);
    $('inboxDetailsTitle').textContent=item.title;renderMessage($('inboxDetailsMessage'),item.message);$('inboxDetailsType').textContent=`${types[item.type]||'System'} notification`;
    const icon=make('i',`bi ${icons[item.type]||icons.system}`);$('inboxDetailsIcon').replaceChildren(icon);
    $('inboxDetailsBadge').textContent=archived(item)?'Archived':read(item)?'Read':'Unread';
    const reference=systemReference(item);
    const fields=[['Received',date(item.date)],...(item.type==='training'&&item.changedBy?[['Status changed by',item.changedBy],['Their role',item.actorRole||'Not recorded'],['Their office',item.actorOffice||'Not recorded'],['Their region',item.actorRegion||'Not recorded'],['Training office / organization',item.office||'Not recorded'],['Training region',item.region||'Not recorded']]:[]),...(reference?[['Reference',reference]]:[]),['Category',types[item.type]||'System'],['Priority',item.priority==='high'?'Important':'Normal']];
    $('inboxDetailsFields').replaceChildren(...fields.map(([label,value])=>{const row=make('div','');row.append(make('dt','',label),make('dd','',value));return row;}));
    const href=safeNotificationLink(item.href,adminRoot);
    $('inboxDetailsLink').hidden=!href;if(href){$('inboxDetailsLink').href=href;$('inboxDetailsLink').textContent=item.action||'View related page';}else $('inboxDetailsLink').removeAttribute('href');
    $('inboxDetailsDialog').showModal();
  }
  function iconButton(icon,label,handler){const button=make('button','inbox-icon-button');button.type='button';button.title=label;button.setAttribute('aria-label',label);const symbol=make('i',`bi ${icon}`);symbol.setAttribute('aria-hidden','true');button.append(symbol);button.addEventListener('click',handler);return button;}
  function render(){
    const inbox=notifications.filter(item=>!archived(item)),unread=inbox.filter(item=>!read(item)),archiveItems=notifications.filter(archived);
    $('inboxTotal').textContent=inbox.length;$('inboxUnread').textContent=unread.length;$('inboxArchived').textContent=archiveItems.length;
    $('inboxAllTabCount').textContent=inbox.length;$('inboxUnreadTabCount').textContent=unread.length;$('inboxArchivedTabCount').textContent=archiveItems.length;
    $('markAllInboxRead').disabled=!unread.length;
    document.querySelectorAll('[data-inbox-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.inboxView===view)));
    const query=$('inboxSearch').value.trim().toLowerCase(),type=$('inboxType').value;
    const filtered=notifications.filter(item=>(view==='archived'?archived(item):!archived(item)&&(view!=='unread'||!read(item)))&&(!type||item.type===type)&&(!query||[item.title,item.message,item.reference,types[item.type]].join(' ').toLowerCase().includes(query)));
    const pageSize=size==='all'?Math.max(1,filtered.length):Number(size),pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
    const nodes=[];let previousGroup='';
    filtered.slice((page-1)*pageSize,page*pageSize).forEach(item=>{
      const label=group(item.date);if(label!==previousGroup){nodes.push(make('h3','inbox-date-group',label));previousGroup=label;}
      const card=make('article',`inbox-item ${read(item)?'':'is-unread'}`),symbol=make('span',`inbox-item-icon ${item.type}`),icon=make('i',`bi ${icons[item.type]||icons.system}`);icon.setAttribute('aria-hidden','true');symbol.append(icon);
      const body=make('div','inbox-item-body'),button=make('button','inbox-open');button.type='button';button.setAttribute('aria-label',`Open ${read(item)?'read':'unread'} notification: ${item.title}`);
      const top=make('div','inbox-item-top');top.append(make('span','inbox-category',`${types[item.type]||'System'}`));if(item.priority==='high')top.append(make('span','inbox-important','Important'));if(!read(item)){const dot=make('span','inbox-unread-dot');dot.setAttribute('aria-label','Unread');top.append(dot);}
      const title=make('h4','',item.title),message=make('p','',item.message);renderMessage(message,item.summary||item.message.slice(0,240));button.append(top,title,message);button.addEventListener('click',async ()=>await open(item));body.append(button);
      const meta=make('div','inbox-item-meta'),time=make('time','',date(item.date));if(item.date&&!Number.isNaN(Date.parse(item.date)))time.dateTime=item.date;meta.append(time);const reference=systemReference(item);if(reference)meta.append(make('span','inbox-reference',reference));body.append(meta);
      const actions=make('div','inbox-item-actions');if(!archived(item))actions.append(iconButton(read(item)?'bi-envelope':'bi-envelope-open',read(item)?'Mark as unread':'Mark as read',async ()=>await mark(item,read(item))));
      actions.append(iconButton(archived(item)?'bi-arrow-counterclockwise':'bi-archive',archived(item)?'Restore notification':'Archive notification',async ()=>await archive(item,archived(item))));
      card.append(symbol,body,actions);nodes.push(card);
    });
    $('inboxList').replaceChildren(...nodes);$('inboxResultCount').textContent=`${filtered.length} ${filtered.length===1?'notification':'notifications'}`;
    $('inboxEmpty').hidden=filtered.length>0;
    $('inboxEmptyTitle').textContent=query||type?'No matching notifications':view==='unread'?"You're all caught up":view==='archived'?'No archived notifications':'Your inbox is clear';
    $('inboxEmptyText').textContent=query||type?'Try another search or notification type.':view==='unread'?'There are no unread notifications in this inbox.':view==='archived'?'Archived notifications will stay here until you restore them.':'Notifications addressed to your account will appear here.';
    $('inboxPageLabel').textContent=`Page ${page} of ${pages}`;$('inboxPrevious').disabled=page<=1;$('inboxNext').disabled=page>=pages;
  }
  // Refresh this recipient's inbox and format their name the same way as the account navigation.
  function refresh(){
    try{
      user=window.TmisActivity?.actor()||null;
      const users=parse(window.TmisStore.getItem('tmis-users'),[]),feed=parse(window.TmisStore.getItem('tmis-notifications'),[]);
      notifications=buildNotifications(user,users,feed);
      const saved=user?parse(window.TmisStore.getItem(stateKey()),{}):{};
      state=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
      const middle=String(user?.middleName||'').trim().split(/\s+/).filter(Boolean).map(part=>`${part.charAt(0).toUpperCase()}.`).join(' ');
      const navigationName=user?[user.firstName,middle,user.lastName,user.suffix].filter(Boolean).join(' '):'';
      $('inboxIdentity').textContent=user?`Updates for ${navigationName}.`:'Your user-table identity is not connected. Other users\' notifications are not displayed.';
      render();
    }catch{feedback('Notifications could not be loaded from this browser.',true);}
  }
  $('inboxSearch').addEventListener('input',()=>{page=1;render();});$('inboxType').addEventListener('change',()=>{page=1;render();});
  document.querySelectorAll('[data-inbox-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.inboxView;page=1;render();}));
  $('clearInboxFilters').addEventListener('click',()=>{$('inboxSearch').value=$('inboxType').value='';page=1;render();});
  $('markAllInboxRead').addEventListener('click',markAll);$('refreshInbox').addEventListener('click',()=>{feedback('');refresh();});

  $('inboxPageSize').addEventListener('change',event=>{size=event.target.value;page=1;render();});$('inboxPrevious').addEventListener('click',()=>{if(page>1)page--;render();});$('inboxNext').addEventListener('click',()=>{page++;render();});
  window.addEventListener('tmis:activity-ready',refresh);window.addEventListener('storage',event=>{if(!event.key||event.key==='tmis-users'||event.key==='tmis-notifications'||event.key===stateKey())refresh();});
  refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
