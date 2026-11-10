import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotifications, previewNotifications, safeNotificationLink } from '../src/js/notification/details/notification-data.js';
test('notifications are recipient-scoped and approvals are limited to administrators',()=>{
 const user={id:'ME',role:'System Administrator'},users=[user,{id:'PENDING',status:'Pending approval',firstName:'New',lastName:'User',createdAt:'2026-10-26T00:00:00Z'}];
 const supplied=[{id:'mine',recipientId:'ME',title:'Mine'},{id:'other',recipientId:'OTHER',title:'Private'}];
 const list=buildNotifications(user,users,supplied);assert.equal(list.length,2);assert.ok(list.some(item=>item.id==='approval:PENDING'));assert.equal(list.some(item=>item.id==='other'),false);
 assert.equal(buildNotifications({...user,role:'Data Encoder'},users,supplied).length,1);assert.deepEqual(buildNotifications(null,users,supplied),[]);
});
test('related links stay in the same project admin area',()=>{
 const root='http://localhost/TMIS/app/admin/';assert.equal(safeNotificationLink('training/details/all-status.html',root),root+'training/details/all-status.html');
 for(const href of ['javascript:alert(1)','https://other.example/app/admin/test.html','../../../private.html','data:text/html,hi','http://user:pass@localhost/TMIS/app/admin/test.html'])assert.equal(safeNotificationLink(href,root),null);
});
test('layout previews are separate and own account updates use recorded dates',()=>{
 assert.equal(previewNotifications(Date.parse('2026-10-26T00:00:00Z')).length,4);
 const user={id:'ME',status:'Approved & Accepted',createdAt:'2026-10-01',updatedAt:'2026-10-26'};const list=buildNotifications(user);assert.equal(list.length,1);assert.equal(list[0].date,'2026-10-26');
});
