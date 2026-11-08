'use strict';
const assert=require('node:assert/strict'),os=require('node:os'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('./sync-server.cjs');
const {hashPassword}=require('./sync-auth.cjs');
const {merge}=require('../replica/sync-core.js'),FocusCore=require('../replica/focus-core.js');
const date='2026-11-08',at=t=>FocusCore.stamp(date,t),event=(id,title,time='09:00')=>({id,kind:'event',title,date,endDate:date,time,endTime:'10:00',calendar:'Default',color:'#5ba6a0',notes:'在详情侧栏完整展示的记录'});
const password='test-password-only',directory=fs.mkdtempSync(path.join(os.tmpdir(),'xu-sync-test-')),file=path.join(directory,'snapshot.json');
const base={version:3,items:[event('a','Original')],insights:[],focusSessions:[],courses:[]};
assert.equal(merge(base,{...base,items:[]},base).result.items.length,0);
assert.equal(merge(base,{...base,items:[]},{...base,items:[event('a','Edited')]}).conflicts.length,1);
assert.equal(merge(base,{...base,items:[event('a','Left')]},{...base,items:[event('a','Right')]},'remote').result.items[0].title,'Right');

(async()=>{
 const hash=await hashPassword(password),server=createServer({accounts:{owner:hash,other:hash},secret:Buffer.alloc(32,13),file});let browser;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,api=origin+'/api/sync';
 try{
  assert.equal((await fetch(api)).status,401);
  const login=(username,password)=>fetch(api+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal((await login('owner','wrong-password')).status,401);
  const session=await (await login('owner',password)).json(),auth={Authorization:'Bearer '+session.token};
  assert.equal((await fetch(api,{headers:{Authorization:'Bearer '+session.token+'x'}})).status,401);
  assert.equal((await fetch(api,{method:'PUT',headers:{...auth,'If-Match':'wrong'},body:JSON.stringify(base)})).status,409);
  assert.equal((await fetch(origin+'/../.release-signing/password.xml')).status,404);
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});
  const mobile=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),tablet=await browser.newPage({viewport:{width:1180,height:820},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const errors=[];for(const page of [mobile,tablet]){page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-08T03:00:00Z'));await page.goto(origin);}
  const focus=FocusCore.finish(FocusCore.start({id:'focus-1',goalId:'goal',goalTitle:'数学'},at('09:00')),at('09:30'));
  const imported={version:3,items:[{id:'goal',kind:'todo',title:'数学',date:'',calendar:'Default'},event('event','整理数据结构错题并核对长期计划'),event('delete','等待删除','08:00')],insights:[{id:'insight',title:'先动笔再优化',createdAt:at('10:00'),updatedAt:at('10:00'),validationDates:[at('10:00')]}],focusSessions:[focus]};
  await mobile.locator('#import-file').setInputFiles({name:'phone-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
  await mobile.waitForFunction(()=>data.items.some(x=>x.id==='event'));
  async function configure(page){await page.evaluate(()=>{$('#toast').textContent='';actions['device-sync']();});await page.waitForFunction(()=>document.activeElement?.id==='sync-user');await page.locator('#sync-user').fill('owner');await page.locator('#sync-password').fill(password);await page.locator('[data-action="modal-confirm"]').click();await page.waitForFunction(()=>!!$('#toast').textContent||!!document.querySelector('[data-action="sync-resolve"]'));assert.equal(await page.locator('#toast').textContent(),'同步完成',JSON.stringify(await page.locator('.sync-conflict').allTextContents()));assert.equal(await page.evaluate(value=>Object.values(localStorage).some(x=>x.includes(value)),password),false);}
  async function sync(page){await page.evaluate(()=>{$('#toast').classList.remove('visible');$('#toast').textContent='';actions['device-sync-now']();});await page.waitForFunction(()=>$('#toast').textContent==='同步完成'||!!document.querySelector('[data-action="sync-resolve"]'));}
  await configure(mobile);await configure(tablet);
  const second=await (await login('other',password)).json();assert.equal((await (await fetch(api,{headers:{Authorization:'Bearer '+second.token}})).json()).snapshot,null);
  assert(await tablet.evaluate(()=>data.focusSessions.some(x=>x.id==='focus-1')&&data.insights.some(x=>x.id==='insight')));
  await tablet.evaluate(()=>{ui.tab='calendar';ui.selected='2026-11-08';ui.month='2026-11';ui.calendarView='Month';render();});
  await tablet.locator('.tablet-agenda .tablet-record[data-id="event"]').waitFor();
  const layout=await tablet.evaluate(()=>{const a=$('.calendar-viewport').getBoundingClientRect(),b=$('.tablet-agenda').getBoundingClientRect();return {calendarWidth:a.width,sideWidth:b.width,aligned:b.left>=a.right&&Math.abs(a.top-b.top)<2,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert(layout.calendarWidth>600&&layout.sideWidth>=235&&layout.aligned&&!layout.overflow,JSON.stringify(layout));
  assert.equal(await mobile.locator('.tablet-agenda').count(),0);
  await tablet.evaluate(()=>$('#toast').classList.remove('visible'));await tablet.waitForFunction(()=>!document.querySelector('#app .screen[inert]'));fs.mkdirSync('reference-analysis',{recursive:true});await tablet.screenshot({path:'reference-analysis/harmony-tablet-landscape.png',animations:'disabled'});
  await tablet.setViewportSize({width:800,height:1100});assert(await tablet.locator('.tablet-agenda').isVisible());
  await tablet.screenshot({path:'reference-analysis/harmony-tablet-portrait.png'});
  await tablet.locator('.tablet-record[data-id="event"]').click();assert.equal(await tablet.locator('#title').inputValue(),'整理数据结构错题并核对长期计划');
  await tablet.evaluate(()=>{panel=null;render();data.items.find(x=>x.id==='event').title='平板新增细节';persist();});
  await mobile.evaluate(()=>{data.items=data.items.filter(x=>x.id!=='delete');persist();});
  await sync(tablet);await sync(mobile);await sync(tablet);
  for(const page of [mobile,tablet])assert(await page.evaluate(()=>data.items.some(x=>x.title==='平板新增细节')&&!data.items.some(x=>x.id==='delete')));
  await mobile.evaluate(()=>{data.items.find(x=>x.id==='event').title='手机修改';persist();});await tablet.evaluate(()=>{data.items.find(x=>x.id==='event').title='平板修改';persist();});
  await sync(mobile);await sync(tablet);assert.equal(await tablet.locator('[data-action="sync-resolve"]').count(),2);
  assert((await tablet.locator('.sync-conflict').allTextContents()).join('').includes('手机修改'));
  await tablet.locator('[data-action="sync-resolve"][data-side="local"]').click();await tablet.waitForFunction(()=>$('#toast').textContent==='同步完成');await sync(mobile);
  assert(await mobile.evaluate(()=>data.items.some(x=>x.title==='平板修改')));
  assert.deepEqual(errors,[]);
  console.log('PASS backup migration, tablet split view/editing, two-client pairing, updates/deletions, conflict review and authenticated revision checks');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));for(const name of fs.readdirSync(directory))fs.unlinkSync(path.join(directory,name));fs.rmdirSync(directory);}
})().catch(e=>{console.error(e);process.exitCode=1;});
