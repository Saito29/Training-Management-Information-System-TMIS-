import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';

test('frontend browser: expand devices, cancel, single/bulk sign-out, and reset without backend calls',async t=>{
 const root=resolve('.');
 const server=http.createServer((req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root)||!/^\/(app|src|assets)\//.test(path)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;t.after(async()=>{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage();const origin=`http://127.0.0.1:${server.address().port}`;
 const errors=[],apiCalls=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/api/auth/'))apiCalls.push(request.url());});
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.goto(`${origin}/app/admin/users/profile.html`);await page.click('#security-tab');await page.locator('#deviceSessionsSection summary').click();
 await page.waitForFunction(()=>document.querySelectorAll('.self-device-card').length===3);
 assert.equal(await page.locator('.self-device-current').count(),1);
 await page.getByRole('button',{name:'Sign out Sample mobile device',exact:true}).click();await page.locator('#deviceSessionDialog').waitFor({state:'visible'});
 await page.locator('#deviceSessionDialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('.self-device-card').count(),3);
 await page.getByRole('button',{name:'Sign out Sample mobile device',exact:true}).click();await page.click('#confirmDeviceSessionRevoke');
 await page.waitForFunction(()=>document.querySelectorAll('.self-device-card').length===2);assert.match(await page.textContent('#deviceSessionFeedback'),/No real sessions/);
 await page.click('#revokeOtherDeviceSessions');await page.click('#confirmDeviceSessionRevoke');await page.waitForFunction(()=>document.querySelectorAll('.self-device-card').length===1);
 assert.equal(await page.locator('#revokeOtherDeviceSessions').isDisabled(),true);assert.equal(await page.locator('.self-device-current').count(),1);
 await page.click('#resetDevicePreview');await page.waitForFunction(()=>document.querySelectorAll('.self-device-card').length===3);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Sign out Sample mobile device',exact:true}).click();
 assert.ok((await page.locator('#deviceSessionDialog').boundingBox()).width<=390);
 assert.deepEqual(apiCalls,[]);assert.deepEqual(errors,[]);
});
