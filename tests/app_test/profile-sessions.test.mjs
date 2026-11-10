import test from 'node:test';
import assert from 'node:assert/strict';
import { describeBrowser, createPreviewSessionProvider, createSessionApiProvider, validateSessions } from '../src/js/users/profile-sessions.js';

test('browser labels distinguish Edge from Chrome and mobile from desktop',()=>{
 assert.equal(describeBrowser('Mozilla Windows Chrome/130 Edg/130').browser,'Microsoft Edge');
 assert.equal(describeBrowser('Mozilla iPhone Safari/600').deviceType,'mobile');
 assert.equal(describeBrowser('Mozilla Macintosh Safari/600').platform,'macOS');
});
test('preview list supports single and bulk sign-out while preserving this browser',async()=>{
 const provider=createPreviewSessionProvider({delay:0,userAgent:'Windows Chrome/130',now:()=>Date.parse('2026-10-26T01:00:00Z')});
 let sessions=await provider.list();assert.equal(sessions.length,3);assert.equal(sessions.filter(s=>s.isCurrent).length,1);
 await assert.rejects(()=>provider.revoke('preview-current'),/kept open/);
 await provider.revoke('preview-phone');assert.equal((await provider.list()).length,2);
 await provider.revokeOthers();sessions=await provider.list();assert.equal(sessions.length,1);assert.equal(sessions[0].isCurrent,true);
 provider.reset();assert.equal((await provider.list()).length,3);
});
test('preview responses are copied and malformed server inventories are rejected',async()=>{
 const provider=createPreviewSessionProvider({delay:0});const list=await provider.list();list[0].isCurrent=false;assert.equal((await provider.list())[0].isCurrent,true);
 assert.throws(()=>validateSessions(null));
 assert.throws(()=>validateSessions([{id:'one',isCurrent:true},{id:'one',isCurrent:false}]));
 assert.throws(()=>validateSessions([{id:'one',isCurrent:true},{id:'two',isCurrent:true}]));
});
test('future API adapter sends only the specified session reference and no user identity',async()=>{
 const calls=[];const provider=createSessionApiProvider(async(...args)=>{calls.push(args);return {sessions:[{id:'one',isCurrent:true}]};});
 assert.equal(calls.length,0);assert.equal(provider.mode,'live');
 await provider.list();await provider.revoke('opaque-reference');await provider.revokeOthers();
 assert.deepEqual(calls,[['sessions'],['sessions/revoke',{id:'opaque-reference'}],['sessions/revoke-others',{}]]);
});
test('adapter preserves service errors rather than claiming a successful sign-out',async()=>{
 const provider=createSessionApiProvider(async()=>{throw new Error('Sign in again.');});await assert.rejects(()=>provider.revoke('one'),/Sign in again/);
});
