import test from 'node:test';
import assert from 'node:assert/strict';
import { describeChanges, findActor, safeFields, collectionFor, mutationAction } from '../src/js/shared/activity-core.js';

test('actor resolution prefers a stable ID and rejects ambiguous names',()=>{
 const users=[{id:'U1',firstName:'Mark Kinnedy',middleName:'Vega',lastName:'Anda'}];
 assert.equal(findActor(users,null,'Mark Kinnedy V. Anda').id,'U1');
 assert.equal(findActor([...users,{...users[0],id:'U2'}],null,'Mark Kinnedy V. Anda'),null);
 assert.equal(findActor(users,'MISSING','Mark Kinnedy V. Anda'),null);
});
test('saved create, update, status and delete actions contain metadata, not field values',()=>{
 const before=[{id:'U1',firstName:'Ana',status:'Pending approval',email:'private@example.com'}];
 let changes=describeChanges('tmis-users','[]',JSON.stringify(before));assert.equal(changes[0].action,'create');
 changes=describeChanges('tmis-users',JSON.stringify(before),JSON.stringify([{...before[0],status:'Inactive',phone:'09171234567'}]));
 assert.equal(changes[0].action,'status');assert.deepEqual(changes[0].fields,['status','phone']);assert.equal(JSON.stringify(changes).includes('09171234567'),false);assert.equal(JSON.stringify(changes).includes('private@example.com'),false);
 assert.equal(describeChanges('tmis-users',JSON.stringify(before),'[]')[0].action,'delete');
});
test('secret fields and timestamp-only updates are excluded',()=>{
 assert.deepEqual(safeFields(['password','secret','token','recoveryCodes','activityLogs','updatedAt','phone']),['phone']);
 assert.deepEqual(describeChanges('tmis-users','[{"id":"U1","updatedAt":"old"}]','[{"id":"U1","updatedAt":"new"}]'),[]);
 assert.deepEqual(describeChanges('tmis-users','[{"id":"U1","password":"old"}]','[{"id":"U1","password":"new"}]'),[]);
 assert.equal(collectionFor('tmis-user-activity'),null);assert.equal(collectionFor('tmis-theme-preference'),null);
 assert.equal(collectionFor('tmis:training:TRN-1:overview').module,'training');
});

test('only create, edit/update and delete changes are accepted',()=>{
 assert.equal(mutationAction('create'),'create');assert.equal(mutationAction('delete'),'delete');
 for(const action of ['update','edit','status','approve','reject','restore'])assert.equal(mutationAction(action),'update');
 for(const action of ['view','filter','refresh','export','login',undefined])assert.equal(mutationAction(action),null);
});
