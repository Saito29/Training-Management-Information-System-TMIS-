// Browser activity metadata only. Never include field values, passwords or tokens.
export const ACTIVITY_KEY = 'tmis-user-activity';
export const COLLECTIONS = {
  'tmis-users': { module: 'administration', label: 'User account' },
  'tmis-resource-persons': { module: 'training', label: 'Resource person' },
  'tmis-farmer-associations': { module: 'participants', label: 'Farmer association' },
  'tmis-pre-test-questionnaires': { module: 'evaluation', label: 'Pre-test questionnaire' },
  'tmis-post-test-questionnaires': { module: 'evaluation', label: 'Post-test questionnaire' },
  'tmis-training-evaluation-questionnaires': { module: 'evaluation', label: 'Training evaluation questionnaire' },
  'tmis-rp-evaluation-questionnaires': { module: 'evaluation', label: 'Resource-person questionnaire' },
  'tmis-pre-test-encoded': { module: 'evaluation', label: 'Pre-test answers' },
  'tmis-post-test-encoded': { module: 'evaluation', label: 'Post-test answers' },
  'tmis-training-evaluation-encoded': { module: 'evaluation', label: 'Training evaluation answers' },
  'tmis-rp-evaluation-encoded': { module: 'evaluation', label: 'Resource-person evaluation answers' },
};
export const normalizeName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function findActor(users, id, name) {
  if (!Array.isArray(users)) return null;
  if (id) return users.find(user => user?.id === id) || null;
  const target = normalizeName(name); if (!target) return null;
  const matches = users.filter(user => {
    if (!user?.id || !user.firstName || !user.lastName) return false;
    const middle = String(user.middleName || '').trim();
    return [middle, middle.split(/\s+/).filter(Boolean).map(part => part.charAt(0)).join(' ')].some(part => normalizeName([user.firstName, part, user.lastName, user.suffix].filter(Boolean).join(' ')) === target);
  });
  return matches.length === 1 ? matches[0] : null;
}
const secretField = /password|secret|token|recovery|credential|cookie|base64|blob|image|photo|filecontent|dataurl/i;
const metadata = new Set(['activityLogs','activity_logs','updatedAt','updated_at','lastModified','decidedAt']);
export const safeFields = fields => fields.filter(field => !secretField.test(field) && !metadata.has(field)).slice(0, 30);
export function collectionFor(key) {
  if (COLLECTIONS[key]) return COLLECTIONS[key];
  if (/^tmis:training:[A-Za-z0-9_-]+:(overview|participants|highlights|attachments)$/.test(key)) return { module: 'training', label: 'Training record' };
  if (/^tmis-farmer-\d+-(interventions|trainings|attachments)$/.test(key)) return { module: 'participants', label: 'Farmer record' };
  return null;
}
function parse(value) { try { return JSON.parse(value ?? 'null'); } catch { return null; } }
export function describeChanges(key, beforeText, afterText) {
  const config = collectionFor(key); if (!config || beforeText === afterText) return [];
  const before = parse(beforeText), after = parse(afterText);
  const rows = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : value && typeof value === 'object' ? [value] : [];
  const identity = row => String(row.id ?? row.user_id ?? row.farmer_id ?? row.fa_id ?? /^tmis:training:([^:]+):/.exec(key)?.[1] ?? 'record');
  const oldRows = new Map(rows(before).map(row => [identity(row), row]));
  const newRows = new Map(rows(after).map(row => [identity(row), row]));
  const changes = [];
  for (const [id, row] of newRows) {
    const previous = oldRows.get(id);
    if (!previous) { changes.push({ action: 'create', title: `${config.label} created`, description: 'A record was saved in this browser.', reference: id, module: config.module, fields: [] }); continue; }
    const fields = safeFields([...new Set([...Object.keys(previous), ...Object.keys(row)])]).filter(field => JSON.stringify(previous[field]) !== JSON.stringify(row[field]));
    if (!fields.length) continue;
    const statusChange = fields.some(field => ['status','record_status','account_status'].includes(field));
    changes.push({ action: statusChange ? 'status' : 'update', title: `${config.label} ${statusChange ? 'status updated' : 'updated'}`, description: `Updated ${fields.map(field => field.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').toLowerCase()).join(', ')}.`, fields, reference: id, module: config.module });
  }
  for (const id of oldRows.keys()) if (!newRows.has(id)) changes.push({ action: 'delete', title: `${config.label} deleted`, description: 'The saved record was removed from this browser.', reference: id, module: config.module, fields: [] });
  // Some older collections contain primitive IDs rather than record objects.
  if (!changes.length && JSON.stringify(before) !== JSON.stringify(after) && (Array.isArray(before) || Array.isArray(after)) && !oldRows.size && !newRows.size) changes.push({ action: 'update', title: `${config.label} updated`, description: 'The saved record list changed.', reference: '', module: config.module, fields: [] });
  return changes;
}
export const actorName = user => [user.firstName,user.middleName,user.lastName,user.suffix].filter(Boolean).join(' ') || 'User';

// Keep the journal focused on completed record changes. Legacy state changes
// and edits are presented as updates; navigation and exports are excluded.
export function mutationAction(action) {
  if (action === 'create' || action === 'delete') return action;
  return ['update','edit','status','approve','reject','restore','attachment'].includes(action) ? 'update' : null;
}
