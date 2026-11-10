import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../src/js/users/profile.js', import.meta.url), 'utf8');
function setup(sessionId = null, menuName = null, duplicate = false, stores = {}) {
 class E { constructor(){this.children=[];this.events={};this.dataset={};this.attrs={};this.value='';} append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(t,f){this.events[t]=f;}focus(){this.focused=true;} }
 const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new E());return els.get(id);};
 const tabs=['account','security','logs'].map(key=>{const tab=get(`${key}-tab`);tab.dataset.profileTab=key;return tab;});
 const sources=['all','account','resource','association'].map(key=>{const button=get(`source-${key}`);button.dataset.logSource=key;return button;});
 const users=[{id:'U1',firstName:'Ana',lastName:'Reyes',role:'Data Encoder',email:'ana@example.com',status:'Approved',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-02T00:00:00Z'},{id:'OTHER',firstName:'Other'}];
 if (menuName) users[0].middleName = 'Vega';
 if (duplicate) users.push({ ...users[0], id: 'DUPLICATE' });
 vm.runInNewContext(source,{document:{getElementById:get,querySelector:()=>menuName ? {textContent:menuName} : null,querySelectorAll:selector=>selector==='[data-profile-tab]'?tabs:sources,createElement:()=>new E(),addEventListener:(_,fn)=>fn()},window:{addEventListener(){}},sessionStorage:{getItem:()=>sessionId,setItem:(_,id)=>{sessionId=id;}},localStorage:{getItem:key=>JSON.stringify(stores[key] || (key==='tmis-users'?users:[]))},location:{hash:'',search:'?id=OTHER'},history:{replaceState(){}},Intl,Date});
 return {get,tabs};
}
test('no connected account shows no other user details or invented history',()=>{const p=setup();assert.equal(p.get('myProfileName').textContent,'Your account');assert.equal(p.get('myLogBody').children.length,0);assert.equal(p.get('myProfileNotice').hidden,false);});
test('connected account renders its profile and actual timestamps as events',()=>{const p=setup('U1');assert.equal(p.get('myProfileName').textContent,'Ana Reyes');assert.equal(p.get('myProfileStatus').textContent,'Active');assert.equal(p.get('myPersonalDetails').children.length,7);assert.equal(p.get('myLogBody').children.length,2);p.get('myLogSearch').value='registered';p.get('myLogSearch').events.input();assert.equal(p.get('myLogBody').children.length,1);});
test('tabs support selection, keyboard navigation, and panel visibility',()=>{const p=setup();p.tabs[1].events.click();assert.equal(p.get('account-panel').hidden,true);assert.equal(p.get('security-panel').hidden,false);p.tabs[1].events.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(p.get('logs-panel').hidden,false);assert.equal(p.tabs[2].focused,true);assert.equal(p.tabs[2].attrs['aria-selected'],'true');});

test('profile-menu name resolves the matching table record with a middle initial',()=>{const p=setup(null,'Ana V. Reyes');assert.equal(p.get('myProfileName').textContent,'Ana Vega Reyes');assert.equal(p.get('myProfileNotice').hidden,true);});
test('ambiguous profile names do not select a different account',()=>{const p=setup(null,'Ana V. Reyes',true);assert.equal(p.get('myProfileName').textContent,'Your account');assert.match(p.get('myProfileNotice').textContent,/More than one/);});

test('logs include attributed module activity and exclude samples and other actors',()=>{
 const base={category:'profile',title:'Resource person updated',description:'Updated office.',date:'2026-01-03T00:00:00Z',reference:'RP1',actor:'System user'};
 const p=setup('U1',null,false,{'tmis-resource-persons':[{id:'RP1',activityLogs:[{...base,actorId:'U1'},{...base,actorId:'OTHER',title:'Other actor'},{...base,title:'Unattributed sample'},{...base,actorId:'U1',date:'invalid'}]}],'tmis-farmer-associations':[{id:'FA1',activity_logs:[{...base,actor:'Ana Reyes',reference:'FA1',title:'Association updated'}]}]});
 assert.equal(p.get('myLogBody').children.length,4);
 p.get('source-resource').events.click();assert.equal(p.get('myLogBody').children.length,1);
 p.get('myLogCategory').value='status';p.get('myLogCategory').events.change();assert.equal(p.get('myLogBody').children.length,0);
 p.get('myLogCategory').value='';p.get('source-all').events.click();p.get('myLogSearch').value='FA1';p.get('myLogSearch').events.input();assert.equal(p.get('myLogBody').children.length,1);
});
test('own saved account activity is displayed without duplicate update placeholders',()=>{
 const record={id:'U1',firstName:'Ana',lastName:'Reyes',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-02T00:00:00Z',activityLogs:[{category:'profile',title:'User profile updated',description:'Updated phone.',date:'2026-01-02T00:00:00Z',actor:'Ana Reyes',reference:'U1'}]};
 const p=setup('U1',null,false,{'tmis-users':[record]});assert.equal(p.get('myLogBody').children.length,2);
});

test('password controls toggle visibility and cancel clears and collapses the form',()=>{
 const p=setup('U1');
 for(const key of ['new','confirm']) {p.get(`password-${key}`).type='password';p.get(`password-${key}`).value='preview-only';p.get(`toggle-password-${key}`).firstElementChild={className:'bi bi-eye'};}
 p.get('passwordChangeForm').reset=()=>{for(const key of ['new','confirm'])p.get(`password-${key}`).value='';};
 p.get('passwordSection').open=true;
 p.get('toggle-password-new').events.click();assert.equal(p.get('password-new').type,'text');assert.equal(p.get('toggle-password-new').attrs['aria-pressed'],'true');
 p.get('cancelPasswordChange').events.click();assert.equal(p.get('passwordSection').open,false);assert.equal(p.get('password-new').type,'password');assert.equal(p.get('password-new').value,'');
 let prevented=false;p.get('passwordChangeForm').events.submit({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.match(p.get('passwordFormStatus').textContent,/preview mode/);
});

test('password checklist updates each rule and confirmation while typing',()=>{
 const p=setup();const input=p.get('password-new');
 input.value='abc';input.events.input();assert.equal(p.get('password-rule-lower').dataset.met,'true');assert.equal(p.get('password-rule-length').dataset.met,'false');assert.equal(p.get('passwordRequirementSummary').textContent,'1 of 5 requirements met.');
 input.value='Abcdef1 ';input.events.input();assert.equal(p.get('password-rule-special').dataset.met,'false');
 input.value='Abcdef1!';input.events.input();assert.equal(p.get('passwordRequirementSummary').textContent,'5 of 5 requirements met.');
 p.get('password-confirm').value='different';p.get('password-confirm').events.input();assert.equal(p.get('passwordMatchStatus').dataset.match,'false');
 p.get('password-confirm').value='Abcdef1!';p.get('password-confirm').events.input();assert.equal(p.get('passwordMatchStatus').dataset.match,'true');
 input.value='';input.events.input();assert.equal(p.get('passwordRequirementSummary').textContent,'0 of 5 requirements met.');
});
