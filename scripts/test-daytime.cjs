const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const allowed=new Set(JSON.parse(fs.readFileSync('replica/web-assets.json','utf8')));
 const server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);if(!allowed.has(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join('replica',name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-18T04:00:00Z'));await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{
   data.items=[['early','清晨安排','05:00','05:45'],['cross','跨入有效时段','05:30','06:30'],['main','数据结构完成作业并核对边界条件','10:00','11:30'],['overlap','阅读练习与整理笔记','10:30','11:00'],['night','晚间安排','23:10','23:45']].map(([id,title,time,endTime])=>({id,title,time,endTime,kind:'event',date:'2026-10-18',endDate:'2026-10-18',calendar:'Default',color:'#b89b35',notes:'保留批注和精确起止时间',done:false}));
   ui.selected='2026-10-18';ui.month='2026-10';ui.tab='calendar';render();
  });
  const canvas=page.locator('#app > .screen .time-canvas');
  assert.equal(await canvas.evaluate(e=>parseFloat(e.style.height)),1056,'Keep original full-day canvas length');
  assert.deepEqual(await page.locator('#app > .screen .time-tick>span').allTextContents(),Array.from({length:18},(_,i)=>String(i+6).padStart(2,'0')+':00'));
  const geometry=await page.evaluate(()=>({hour:dayAxis().hourHeight,start:dayY(360),end:dayY(1380),inverse:dayMinute(dayY(735))}));
  assert(Math.abs(geometry.hour-44*24/17)<.001);assert.equal(geometry.start,0);assert.equal(geometry.end,1056);assert.equal(geometry.inverse,735);
  assert.equal(await page.locator('.time-block[data-id="early"]').count(),0);assert.equal(await page.locator('.time-block[data-id="night"]').count(),0);
  assert((await page.locator('.outside-hours').textContent()).includes('清晨安排'));assert((await page.locator('.outside-hours').textContent()).includes('晚间安排'));
  assert.equal(await page.locator('.time-block[data-id="cross"]').evaluate(e=>parseFloat(e.style.top)),0,'Clip crossing event to 06:00');
  const block=page.locator('.time-block[data-id="main"]');assert(Math.abs(await block.evaluate(e=>parseFloat(e.style.height))-geometry.hour*1.5)<.001);
  await page.locator('.daily-timeline').evaluate(e=>e.scrollTop=4*Number(e.dataset.hourHeight));
  for(const width of [320,375,393,480]){
   await page.setViewportSize({width,height:852});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
   assert(await block.locator('strong').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)<=11));
   const main=await block.locator('.time-block-main').boundingBox(),check=await block.locator('.session-check').boundingBox();assert(main.width>60);assert(main.x+main.width<=check.x+1,'Text and completion button never overlap');
  }
  await page.setViewportSize({width:393,height:852});fs.mkdirSync('reference-analysis',{recursive:true});await page.screenshot({path:'reference-analysis/v1.5.1-daytime.png'});
  await page.evaluate(()=>openPanel('settings'));await page.locator('[data-setting="daytimeOnly"]').uncheck();
  assert.equal(await page.locator('.time-tick').count(),25);assert.equal(await canvas.evaluate(e=>parseFloat(e.style.height)),1056);
  assert.equal(await page.locator('.time-block[data-id="early"]').count(),1,'Full day can restore early and late events');
  await page.locator('[data-setting="daytimeOnly"]').check();await page.locator('[data-action="close-panel"]').click();await page.locator('#overlay .page').waitFor({state:'detached'});
  await page.reload();assert.equal(await page.evaluate(()=>data.settings.daytimeOnly),true,'Setting survives restart');
  await page.evaluate(()=>{ui.tab='calendar';ui.selected='2026-10-18';render();document.querySelector('.daily-timeline').scrollTop=dayY(840);});
  const point=await page.locator('.time-blocks').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width*.8,y:r.y+dayY(960)+3};});
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForTimeout(560);await page.mouse.up();
  const blank=page.locator('.blank-range');await blank.waitFor();assert.equal(await page.evaluate(()=>data.items.find(x=>x.blank).time),'16:00','Long press uses expanded axis');
  const handle=await blank.locator('[data-resize="end"]').boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2+geometry.hour,{steps:8});await page.mouse.up();
  assert.equal(await page.evaluate(()=>data.items.find(x=>x.blank).endTime),'18:00','One expanded hour drag equals one hour');
  await page.evaluate(()=>{ui.calendarView='Timetable';render();document.querySelector('.timetable-scroll').scrollTop=9*44;});
  const weekCards=page.locator('.timetable-day[data-date="2026-10-18"] .timetable-event');
  const rects=await weekCards.evaluateAll(elements=>elements.map(e=>({id:e.dataset.id,top:parseFloat(e.style.top),height:parseFloat(e.style.height),width:e.getBoundingClientRect().width,day:e.parentElement.getBoundingClientRect().width})));
  for(const rect of rects){assert(rect.width>8,'Overlapping records keep a visible time lane');assert(rect.top>=0&&rect.top+rect.height<=1056+.1,'No enlarged weekly label may escape the real axis');}
  assert(await page.locator('.timetable-event[data-id="main"]').evaluate(e=>Math.abs(parseFloat(e.style.top)-dayY(600))<.1),'Weekly task starts exactly at its real time');assert.equal(await page.locator('[data-action="timetable-records"]').count(),7,'Every date offers a readable complete record list');
  await page.screenshot({path:'reference-analysis/v1.5.1-timetable.png'});
  const backup=await page.evaluate(()=>GoalCore.mergeBackup({items:[],settings:{}},{version:3,items:data.items,settings:data.settings}).settings);assert.equal(backup.daytimeOnly,true);
  await page.evaluate(()=>{ui.calendarView='Month';render();});await page.screenshot({path:'reference-analysis/v1.5.1-month.png'});
  assert(await page.locator('.month-event-label').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)<=9));
  console.log('PASS 06–23 default, fixed canvas, clipping and outside schedules, toggle persistence, backup, 320–480px typography, no button overlap, long press and resize mapping');
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
