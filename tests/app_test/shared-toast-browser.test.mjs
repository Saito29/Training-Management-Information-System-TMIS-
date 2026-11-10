import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { chromium } from 'playwright-core';

test('every source page loads valid shared toast assets', () => {
 const files = directory => readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(join(directory,item.name)):[join(directory,item.name)]);
 const pages=[...files('app').filter(file=>file.endsWith('.html')),'index.html'];
 for(const page of pages){
  const html=readFileSync(page,'utf8');if(!html.trim())continue;
  for(const [kind,expected] of [['script','src/js/shared/toast.js'],['style','src/css/shared/toast.css']]){
   const paths=[...html.matchAll(kind==='script'?/<script[^>]+src="([^"]+)"/g:/<link[^>]+href="([^"]+)"/g)].map(match=>match[1]);
   assert.ok(paths.some(path=>resolve(dirname(page),path)===resolve(expected)),`${page} includes ${kind}`);
  }
 }
});

test('shared toasts: statuses, pause, three-second exit, legacy events and Undo actions', async t => {
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});t.after(()=>browser.close());
 const page=await browser.newPage();await page.clock.install();await page.clock.pauseAt(new Date());
 await page.setContent('<!doctype html><html><head></head><body style="min-height:900px"></body></html>');
 await page.addStyleTag({content:readFileSync('src/css/shared/toast.css','utf8')});
 await page.addScriptTag({content:readFileSync('src/js/shared/toast.js','utf8')});
 await page.mouse.move(0,0);
 await page.evaluate(()=>{for(const type of ['success','warning','error'])window.TmisToast.show('<script>unsafe</script>',type);});
 assert.equal(await page.locator('.compose-toast').count(),3);
 assert.equal(await page.locator('.compose-toast[role=alert]').count(),1);
 assert.equal(await page.locator('.compose-toast script').count(),0);
 await page.clock.runFor(2999);assert.equal(await page.locator('.is-leaving').count(),0);
 await page.clock.runFor(2);assert.equal(await page.locator('.is-leaving').count(),3);
 await page.clock.runFor(250);assert.equal(await page.locator('.compose-toast').count(),0);
 await page.evaluate(()=>window.TmisToast.show('Pause check'));
 await page.locator('.compose-toast').hover();await page.clock.runFor(4000);
 assert.equal(await page.locator('.compose-toast').count(),1);
 await page.mouse.move(0,0);await page.clock.runFor(3300);assert.equal(await page.locator('.compose-toast').count(),0);
 await page.evaluate(()=>{
  const toast=document.createElement('div');toast.id='legacyToast';toast.className='toast review-toast';
  toast.innerHTML='<div class="toast-header"><i class="bi bi-exclamation-triangle-fill"></i><strong>Warning</strong><button data-bs-dismiss="toast">Close</button></div><div class="toast-body">Legacy message</div>';
  document.body.append(toast);window.lifecycle=[];
  toast.addEventListener('shown.bs.toast',()=>window.lifecycle.push('shown'));
  toast.addEventListener('hidden.bs.toast',()=>window.lifecycle.push('hidden'));
  const event=new Event('show.bs.toast',{bubbles:true,cancelable:true});toast.dispatchEvent(event);window.showPrevented=event.defaultPrevented;
 });
 assert.equal(await page.evaluate(()=>window.showPrevented),true);
 assert.equal(await page.locator('#legacyToast').getAttribute('data-toast-kind'),'warning');
 await page.clock.runFor(3300);assert.equal(await page.locator('#legacyToast').isVisible(),false);
 await page.evaluate(()=>{const toast=document.getElementById('legacyToast');toast.querySelector('i').className='bi bi-check-circle-fill';toast.dispatchEvent(new Event('show.bs.toast',{bubbles:true,cancelable:true}));});
 assert.equal(await page.locator('#legacyToast').getAttribute('data-toast-kind'),'success');
 await page.locator('#legacyToast button').click();await page.clock.runFor(300);
 assert.deepEqual(await page.evaluate(()=>window.lifecycle),['shown','hidden','shown','hidden']);
 await page.evaluate(()=>{
  const toast=document.createElement('div');toast.id='rpUndoToast';toast.className='toast';toast.innerHTML='<div class="toast-body"><button id="undoTest">Undo</button></div>';document.body.append(toast);
  document.getElementById('undoTest').addEventListener('click',()=>window.undoClicked=true);
  toast.dispatchEvent(new Event('show.bs.toast',{bubbles:true,cancelable:true}));
 });
 await page.clock.runFor(6000);assert.equal(await page.locator('#rpUndoToast').isVisible(),true);
 await page.click('#undoTest');assert.equal(await page.evaluate(()=>window.undoClicked),true);
 await page.evaluate(()=>document.getElementById('rpUndoToast').dispatchEvent(new Event('hide.bs.toast',{bubbles:true,cancelable:true})));
 await page.clock.runFor(300);assert.equal(await page.locator('#rpUndoToast').isVisible(),false);
 await page.mouse.move(0,0);
 await page.addScriptTag({content:readFileSync('src/js/evaluation/create/questionnaire-toast.js','utf8')});
 await page.evaluate(()=>window.showQuestionnaireToast('Questionnaire saved','success'));
 assert.equal(await page.locator('.compose-toast p').textContent(),'Questionnaire saved');
 await page.clock.runFor(3300);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.TmisToast.show('Mobile check'));
 const box=await page.locator('.compose-toast').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);
});
