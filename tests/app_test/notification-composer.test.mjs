import test from 'node:test';
import assert from 'node:assert/strict';
import { activeRecipients,resolveRecipients,composeNotifications } from '../src/js/notification/notification-data.js';
const users=[{id:'ME',status:'Approved & Accepted',role:'System Administrator'},{id:'ENC',status:'Active',role:'Data Encoder'},{id:'PENDING',status:'Pending approval',role:'Data Encoder'},{id:'OFF',status:'Inactive',role:'Data Encoder'}];
const form={title:'Training update',message:'Review the revised schedule.',type:'training',priority:'high',audience:'users',recipientIds:['ME','PENDING'],relatedPage:'training',reference:'TRN1'};
test('recipient modes exclude pending and inactive accounts',()=>{
 assert.equal(activeRecipients(users).length,2);assert.deepEqual(resolveRecipients(form,users).map(user=>user.id),['ME']);
 assert.deepEqual(resolveRecipients({...form,audience:'role',role:'Data Encoder'},users).map(user=>user.id),['ENC']);
 assert.equal(resolveRecipients({...form,audience:'all'},users).length,2);
});
test('creation uses inbox-compatible recipient records and an internal related page',()=>{
 let count=0;const result=composeNotifications(form,users,users[0],{now:()=> '2026-10-26T00:00:00Z',id:()=>`id-${++count}`});
 assert.equal(result.length,1);assert.equal(result[0].recipientId,'ME');assert.equal(result[0].creatorId,'ME');assert.equal(result[0].priority,'high');assert.equal(result[0].href,'training/details/all-status.html');assert.equal(result[0].readAt,null);
});
test('invalid messages, missing actors, recipients and arbitrary links are rejected',()=>{
 assert.throws(()=>composeNotifications(form,users,null));assert.throws(()=>composeNotifications({...form,title:'   '},users,users[0]));assert.throws(()=>composeNotifications({...form,recipientIds:[]},users,users[0]));assert.throws(()=>composeNotifications({...form,relatedPage:'https://other.example'},users,users[0]));
});
