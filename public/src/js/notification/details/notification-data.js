function notificationReference(reference, id) {
  const existingReference = String(reference || '').trim();
  if (existingReference && !/^\d+$/.test(existingReference)) return existingReference;

  const value = String(id || existingReference);
  let firstHash = 2166136261;
  let secondHash = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charCodeAt(index);
    firstHash = Math.imul(firstHash ^ character, 0x01000193) >>> 0;
    secondHash = Math.imul(secondHash ^ character, 0x01000193) >>> 0;
  }
  const suffix = `${firstHash.toString(36)}${secondHash.toString(36)}`.toUpperCase().padStart(12, '0').slice(0, 12);

  return `TMIS-${suffix}`;
}

export function buildNotifications(user, users = [], supplied = []) {
  if (!user?.id) return [];
  const result = Array.isArray(supplied) ? supplied.filter(item => item && String(item.recipientId || item.userId) === String(user.id) && item.id).map(item => ({ ...item, type: ['account','training','participants','evaluation','system'].includes(item.type) ? item.type : 'system', title: String(item.title || 'System notification'), message: String(item.message || item.description || ''), reference: notificationReference(item.reference, item.id), date: item.createdAt || item.date || null, href: String(item.href || ''), action: String(item.action || 'View related page') })) : [];
  if (user.role === 'System Administrator' && Array.isArray(users)) users.filter(record => record?.id && ['Pending approval','For Review'].includes(record.status) && record.id !== user.id).forEach(record => {
    const name = [record.firstName,record.lastName].filter(Boolean).join(' ') || 'A user';
    result.push({ id:`approval:${record.id}`, type:'account', title:'User account awaiting approval', message:`${name} registered${record.role ? ` as ${record.role}` : ''}. Review the registration before granting access.`, reference:notificationReference(record.id, `approval:${record.id}`), date:record.createdAt || null, href:'administration/update/for-approval', action:'Review user accounts' });
  });
  if (['Pending approval','For Review'].includes(user.status)) result.push({ id:`account-pending:${user.id}`, type:'account', title:'Your account is awaiting approval', message:'Your registration is waiting for an administrator to review the requested access.', reference:notificationReference(user.id, `account-pending:${user.id}`), date:user.createdAt || null, href:'users/profile', action:'View your profile' });
  if (user.decidedAt) result.push({ id:`account-decision:${user.id}:${user.decidedAt}`, type:'account', title:'Your account access was reviewed', message:`Your account status is ${user.status || 'updated'}. Check your profile for details.`, reference:notificationReference(user.id, `account-decision:${user.id}:${user.decidedAt}`), date:user.decidedAt, href:'users/profile', action:'View your profile' });
  else if (user.updatedAt && user.updatedAt !== user.createdAt) result.push({ id:`account-updated:${user.id}:${user.updatedAt}`, type:'account', title:'Your account details were updated', message:'Your registration or account details changed. Review your profile to check the latest information.', reference:notificationReference(user.id, `account-updated:${user.id}:${user.updatedAt}`), date:user.updatedAt, href:'users/profile', action:'View your profile' });
  return [...new Map(result.map(item => [String(item.id), { ...item,id:String(item.id) }])).values()].sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));
}
export function safeNotificationLink(href, adminRoot) {
  if (!href) return null;
  try { const root=new URL(adminRoot),link=new URL(href,root);return link.origin===root.origin && link.pathname.startsWith(root.pathname) && !link.username && !link.password && /\/[a-z0-9-]+(?:\.html)?$/i.test(link.pathname) ? link.href : null; } catch { return null; }
}
