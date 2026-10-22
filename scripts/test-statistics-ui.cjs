const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const allowed=new Set(JSON.parse(fs.readFileSync('replica/web-assets.json','utf8')));
 const server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);if(!allowed.has(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join('replica',name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-22T04:00:00Z'));await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{ui.tab='calendar';ui.selected='2026-10-22';ui.month='2026-10';render();});await page.locator('[data-action="view-menu"]').click();
  const menu=await page.locator('#overlay .menu button').allTextContents();assert(menu.at(-1).includes('数据板')&&menu.at(-2).includes('年视图'),'Data board follows Year in lower-left view menu');
  await page.locator('[data-action="dashboard"]').click();await page.locator('.calendar-outgoing').waitFor({state:'detached'});
  assert.equal(await page.locator('.statistics-board').count(),1);assert.equal(await page.locator('[data-stat="day-minutes"]').textContent(),'0m');assert.equal(await page.locator('.stats-empty').count(),1,'No fabricated statistics on an empty day');
  assert.equal(await page.evaluate(()=>{calendarGesture=null;onCalendarTouchStart({target:document.querySelector('.statistics-board'),touches:[{clientX:40,clientY:200}]});return calendarGesture;}),null,'Scrolling or touching charts must not start calendar swipe/pinch navigation');
  await page.evaluate(()=>{data.items=[{id:'p',kind:'todo',title:'数据结构',color:'#80b8a6',calendar:'Default'},{id:'c',kind:'todo',parentId:'p',title:'写作业',color:'#cb8da0',calendar:'Default'}];data.focusSessions=[['one','p','09:00','10:00'],['two','c','10:30','11:00']].map(([id,goalId,start,end])=>FocusCore.finish(FocusCore.start({id,goalId},FocusCore.stamp('2026-10-22',start)),FocusCore.stamp('2026-10-22',end)));persist();render();});
  assert.equal(await page.locator('[data-stat="day-minutes"]').textContent(),'1h30m');assert.equal(await page.locator('[data-stat="day-count"]').textContent(),'2');assert.equal(await page.locator('.stats-goal-row').count(),2);assert((await page.locator('.stats-goals').textContent()).includes('数据结构 › 写作业'),'Subgoal attribution includes its origin');
  assert.equal(await page.locator('.stats-hour').count(),24);assert.equal(await page.locator('.stats-trend-point').count(),31);assert.equal(await page.locator('.stats-donut').count(),1);
  await page.evaluate(()=>{data.items.find(item=>item.id==='p').title='Today';render();});assert((await page.locator('.stats-goal-row>span').allTextContents()).some(text=>text.startsWith('Today1h')),'Interface translation must not rewrite a user goal title');await page.evaluate(()=>{data.items.find(item=>item.id==='p').title='数据结构';render();});
  await page.locator('[data-action="stats-records"]').click();assert.equal(await page.locator('.stats-record-list>div').count(),2);await page.locator('[data-action="modal-confirm"]').click();
  await page.locator('[data-action="stats-prev"]').click();await page.locator('.calendar-outgoing').waitFor({state:'detached'});assert.equal(await page.locator('[data-stat="day-minutes"]').textContent(),'0m');
  await page.locator('#stats-date').fill('2026-10-22');assert.equal(await page.locator('[data-stat="day-minutes"]').textContent(),'1h30m');
  for(const width of [320,375,393,480]){await page.setViewportSize({width,height:852});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));}
  await page.setViewportSize({width:393,height:852});fs.mkdirSync('reference-analysis',{recursive:true});await page.screenshot({path:'reference-analysis/v1.6-statistics.png',fullPage:true});
  await page.evaluate(()=>{data.focusSessions.push(FocusCore.start({id:'live',goalId:'p'},FocusCore.stamp('2026-10-22','11:50')));});await page.clock.setFixedTime(new Date('2026-10-22T04:05:00Z'));await page.waitForTimeout(1200);assert.equal(await page.locator('[data-stat="day-minutes"]').textContent(),'1h45m','Open data board refreshes an ongoing focus without navigation');
  await page.locator('[data-action="view-menu"]').click();await page.locator('[data-view="Year"]').click();await page.locator('.calendar-outgoing').waitFor({state:'detached'});assert.equal(await page.locator('.mini-month').count(),12,'Existing calendar levels remain intact');
  assert.deepEqual(errors,[]);console.log('PASS data-board menu position, true day/cumulative/goal/hourly/month statistics, empty state, origin, record detail, date navigation and mobile widths');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
