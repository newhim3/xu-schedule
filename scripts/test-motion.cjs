const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const allowed=new Set(['index.html','app.js','planner.js','focus-core.js','focus.js','style.css','sw.js','icon.svg','manifest.webmanifest','background-lake.jpg','background-dunes.jpg','background-water.jpg']);
 const server=http.createServer((req,res)=>{
  const name=req.url==='/'?'index.html':req.url.slice(1);
  if(!allowed.has(name)){res.writeHead(404).end();return;}
  const type=name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/html';
  res.setHeader('Content-Type',type+'; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,'../replica',name)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(()=>{window.originalDock=document.querySelector('.dock');window.originalSwitcher=document.querySelector('.switcher');});
  await page.locator('[data-tab="calendar"]').click();
  assert(await page.evaluate(()=>originalDock===document.querySelector('.dock')&&originalSwitcher===document.querySelector('.switcher')),'Navigation must survive render');
  assert(await page.evaluate(()=>document.querySelector('.screen').getAnimations().length>0),'Tab content must animate');
  assert.equal(await page.locator('.motion-scene').count(),1,'Outgoing tab must remain visible during transition');
  assert(await page.evaluate(()=>document.querySelector('.switcher').getAnimations({subtree:true}).length>0),'Segment indicator must actually animate');
  await page.locator('.motion-scene').waitFor({state:'detached',timeout:1500});
  assert.equal(await page.locator('.motion-scene').count(),0,'Old tab layer must be released after animation finishes');
  for(let cycle=0;cycle<12;cycle++){
   await page.locator(`[data-tab="${cycle%2?'calendar':'todos'}"]`).click();
   await page.locator('.motion-scene').waitFor({state:'detached',timeout:1500});
  }
  await page.locator('[data-action="more"]').click();
  await page.locator('[data-action="settings"]').click();
  await page.waitForTimeout(320);
  await page.evaluate(()=>{window.settingsSurface=document.querySelector('.page');settingsSurface.scrollTop=120;window.settingsScroll=settingsSurface.scrollTop;document.querySelector('[data-sub="reminder-type"]').click();});
  assert(await page.evaluate(()=>settingsScroll>0),'Exercise a genuinely scrolled settings page');
  assert.equal(await page.locator('.page.navigation-outgoing').count(),1,'Parent page must remain behind pushed page');
  assert(await page.evaluate(()=>document.querySelector('.page:not(.navigation-outgoing)').getAnimations().length>0),'Child must slide over its retained parent');
  await page.waitForTimeout(90);
  fs.mkdirSync(path.join(__dirname,'../reference-analysis'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'../reference-analysis/navigation-push-mid.png')});
  await page.evaluate(()=>document.querySelector('[data-action="settings-root"]').click());
  assert(await page.evaluate(()=>document.querySelector('.page:not(.navigation-outgoing)')===settingsSurface),'Back must reuse parent surface even when interrupted');
  await page.waitForTimeout(320);
  assert(await page.evaluate(()=>document.querySelector('.page').scrollTop===settingsScroll),'Back must preserve scroll position');
  assert.equal(await page.locator('.navigation-outgoing').count(),0,'Interrupted transitions must not leave ghosts');
  await page.evaluate(()=>document.querySelector('[data-action="close-panel"]').click());
  await page.waitForTimeout(320);
  for(let i=0;i<4;i++){
   await page.evaluate(()=>{document.querySelector('[data-action="new"]').click();document.querySelector('.page:not(.navigation-outgoing) [data-action="close-panel"]').click();document.querySelector('[data-action="new"]').click();});
   await page.waitForTimeout(320);
   assert.equal(await page.locator('.page').count(),1,'Close/reopen must not delete newly opened page');
   await page.locator('[data-action="close-panel"]').click();await page.waitForTimeout(320);
  }
  await page.locator('[data-action="new"]').click();
  assert(await page.evaluate(()=>document.querySelector('.page').getAnimations().some(a=>a.playState==='running')),'Editor entrance');
  await page.waitForTimeout(320);
  await page.locator('[data-action="editor-kind"][data-kind="todo"]').click();
  await page.locator('[data-action="color"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-action="modal-cancel"]').click();
  assert(await page.locator('.dialog-shade.motion-exit').count()===1,'Dialog must remain mounted during exit');
  await page.waitForTimeout(300);
  assert(await page.locator('.dialog-shade').count()===0,'Exit must clean up');
  await page.locator('[data-action="close-panel"]').click();
  await page.waitForTimeout(260);
  await page.locator('[data-tab="todos"]').click();
  await page.waitForTimeout(320);
  await page.locator('[data-action="complete"][data-id="sample-contest"]').click();
  assert(await page.locator('.task.done [data-id="sample-contest"]').count()>0,'Completion must be visible immediately');
  await page.waitForTimeout(350);
  assert(await page.locator('.task.done [data-action="complete"][data-id="sample-contest"]').count()===1,'Completed task must remain grey in All');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-tab="calendar"]').click();
  assert(await page.evaluate(()=>document.querySelector('.screen').getAnimations().length===0),'Reduced motion must disable spatial animation');
  assert.deepEqual(errors,[]);
  console.log('PASS: paired tab surfaces, persistent navigation, parent/child stack, interrupted back, scroll restoration, rapid close/reopen, editor entrance, dialog exit cleanup, visible completion, reduced motion, no JS errors');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
