import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';

test('browser activity: real registration, user-scoped logs, filters, details and export stay frontend-only',async t=>{
 const root=resolve('.');
 const server=http.createServer((req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+path);
  if(!file.startsWith(root)||!/^\/(app|src|assets)\//.test(path)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 t.after(async()=>{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;const errors=[],apiCalls=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/api/auth/'))apiCalls.push(request.url());});
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.addInitScript(()=>{
  if(!localStorage.getItem('test-seeded')){
   localStorage.setItem('tmis-users',JSON.stringify([{id:'ME',firstName:'Mark Kinnedy',middleName:'Vega',lastName:'Anda',role:'System Administrator',status:'Approved & Accepted',email:'mark@example.com'}]));
   sessionStorage.setItem('tmis-current-user-id','ME');localStorage.setItem('tmis-user-activity',JSON.stringify([{id:'other-event',actorId:'OTHER',actor:'Other user',date:new Date().toISOString(),title:'PRIVATE OTHER USER ACTIVITY',description:'Not yours',module:'users',action:'update',status:'success'}]));
   localStorage.setItem('test-seeded','true');
  }
 });
 await page.goto(`${origin}/app/admin/users/logs.html`);
 await page.waitForFunction(()=>!!window.TmisActivity);
 assert.equal(await page.evaluate(()=>window.TmisActivity.entries().length),0);
 assert.equal(await page.getByText('PRIVATE OTHER USER ACTIVITY').count(),0);
 await page.goto(`${origin}/app/admin/administration/create/register.html`);
 await page.fill('#userFirstName','New');await page.fill('#userLastName','Account');await page.fill('#userDateOfBirth','1990-01-01');await page.fill('#userEmail','new-account@example.com');await page.fill('#userPhone','09171234567');
 await page.click('#userNext');await page.selectOption('#userRole','Data Encoder');await page.selectOption('#userRegion','Region IV-A');await page.selectOption('#userOffice','DA-SAAD');await page.click('#userNext');await page.click('#userSubmit');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tmis-user-activity')||'[]').some(event=>event.action==='create'));
 const stored=await page.evaluate(()=>localStorage.getItem('tmis-user-activity'));assert.equal(stored.includes('new-account@example.com'),false);assert.equal(stored.includes('09171234567'),false);
 await page.goto(`${origin}/app/admin/users/logs.html`);await page.selectOption('#logAction','create');await page.waitForFunction(()=>document.querySelectorAll('#activityLogTableBody tr').length===1);
 assert.match(await page.textContent('#activityLogTableBody'),/User account created/);
 await page.locator('.journal-detail-button').click();await page.locator('#activityDetailsDialog').waitFor({state:'visible'});assert.match(await page.textContent('#activityDetailsFields'),/ME/);assert.equal(await page.textContent('#activityDetailsResult'),'Success');assert.equal(await page.locator('.journal-modal-group').count(),3);await page.locator('#activityDetailsDialog').getByRole('button',{name:'Done',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.click('#exportActivityLogs');const download=await downloadPromise;assert.equal(download.suggestedFilename(),'my-activity-logs.csv');
 const content=readFileSync(await download.path(),'utf8');assert.match(content,/User account created/);assert.equal(content.includes('PRIVATE OTHER USER ACTIVITY'),false);
 const txtDownloadPromise=page.waitForEvent('download');await page.click('#exportActivityLogsTxt');const txtDownload=await txtDownloadPromise;assert.equal(txtDownload.suggestedFilename(),'my-activity-logs.txt');
 const txtContent=readFileSync(await txtDownload.path(),'utf8');assert.match(txtContent,/Activity 1[\s\S]*Title: User account created[\s\S]*System area: Administration/);assert.equal(txtContent.includes('PRIVATE OTHER USER ACTIVITY'),false);
 assert.equal(await page.evaluate(()=>window.TmisActivity.entries().some(entry=>['view','export','filter','refresh'].includes(entry.action))),false);
 const beforeRefresh=await page.evaluate(()=>window.TmisActivity.entries().length);await page.click('#refreshActivityLogs');await page.waitForTimeout(550);assert.equal(await page.evaluate(()=>window.TmisActivity.entries().length),beforeRefresh);
 await page.click('#clearLogFilters');await page.fill('#logSearch','no-such-activity-ever');await page.locator('#journalEmpty').waitFor({state:'visible'});
 assert.deepEqual(apiCalls,[]);assert.deepEqual(errors,[]);
});
