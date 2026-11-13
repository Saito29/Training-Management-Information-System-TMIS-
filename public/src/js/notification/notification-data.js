export const NOTIFICATION_TYPES = { account:'Account', training:'Training', participants:'Participants', evaluation:'Evaluation', system:'System' };
export const RELATED_PAGES = {
  '': { href:'',label:'No related page' },
  profile:{href:'users/profile',label:'My profile'},
  approvals:{href:'administration/update/for-approval',label:'User approval queue'},
  users:{href:'administration/details/all-status',label:'User account list'},
  training:{href:'training/details/all-status',label:'Training list'},
  participants:{href:'participants/details/all-with-status',label:'Participant list'},
  questionnaires:{href:'evaluation/details/list-questionnaire',label:'Questionnaires'},
};
export function activeRecipients(users, excludedUserId = null) {
  if(!Array.isArray(users))return [];
  return [...new Map(users.filter(user=>user?.id
    && (excludedUserId === null || String(user.id) !== String(excludedUserId))
    && /^(active|approved|accepted|approved\s*&\s*accepted)$/i.test(String(user.status||'').trim())).map(user=>[user.id,user])).values()];
}
export function resolveRecipients(data, users, actor = null) {
  const actorId=typeof actor==='object'&&actor!==null?actor.id:actor;
  const eligible=activeRecipients(users,actorId);
  if(data.audience==='all')return eligible;
  if(data.audience==='role')return eligible.filter(user=>user.role===data.role);
  if(data.audience==='users')return eligible.filter(user=>data.recipientIds?.includes(user.id));
  return [];
}
export function countAvailableRecipients(data, users, actor = null) {
  const actorId=typeof actor==='object'&&actor!==null?actor.id:actor;
  const included=new Set(resolveRecipients(data,users,actor).map(user=>user.id));
  return activeRecipients(users,actorId).filter(user=>!included.has(user.id)).length;
}
export function composeNotifications(data, users, actor, {now=()=>new Date().toISOString(),id=()=>crypto.randomUUID()}={}) {
  if(!actor?.id)throw new Error('Your user-table identity is not connected. Open your profile first.');
  const title=String(data.title||'').trim(),message=String(data.message||'').trim();
  if(!title || title.length>100)throw new Error('Enter a notification title of 1 to 100 characters.');
  if(!message || message.length>10000)throw new Error('Enter full details of 1 to 10,000 characters.');
  const summary=String(data.summary||'').trim();
  if(summary.length>240)throw new Error('Keep the short summary within 240 characters.');
  if(!Object.hasOwn(NOTIFICATION_TYPES,data.type))throw new Error('Select a valid notification type.');
  if(!['normal','high'].includes(data.priority))throw new Error('Select a valid priority.');
  if(!Object.hasOwn(RELATED_PAGES,data.relatedPage||''))throw new Error('Select a related page from the list.');
  const recipients=resolveRecipients(data,users,actor);if(!recipients.length)throw new Error('Select at least one active recipient.');
  const batchId=id(),createdAt=now(),target=RELATED_PAGES[data.relatedPage||''];
  return recipients.map(user=>({id:id(),batchId,recipientId:user.id,creatorId:actor.id,type:data.type,title,summary:summary||message.slice(0,240),message,priority:data.priority,reference:String(data.reference||'').trim().slice(0,80),createdAt,href:target.href,action:target.href?`Open ${target.label.toLowerCase()}`:'',readAt:null,archivedAt:null}));
}
