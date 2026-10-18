const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const allowed=new Set(JSON.parse(fs.readFileSync('replica/web-assets.json','utf8')));
 const server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);if(!allowed.has(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join('replica',name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-18T04:00:00Z'));await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{data.items=[{id:'a',kind:'todo',title:'学习',date:'',calendar:'Default'}];data.focusSessions=[['short','2026-10-03','09:00','10:00'],['long','2026-10-05','09:00','12:09']].map(([id,date,start,end])=>FocusCore.finish(FocusCore.start({id,goalId:'a'},FocusCore.stamp(date,start)),FocusCore.stamp(date,end)));ui.tab='calendar';ui.month='2026-10';ui.year=2026;ui.calendarView='Month';persist();render();});
  const cell=date=>page.locator(`#app > .screen .month-cell[data-date="${date}"]`);
  assert.equal(await page.locator('.heat-duration').count(),0,'Heat is color only: do not add time figures to the original month');
  assert(await cell('2026-10-05').getAttribute('data-heat')>await cell('2026-10-03').getAttribute('data-heat'),'Longer focus has a deeper heat level');
  assert.equal(await cell('2026-10-18').locator('.is-today').count(),1,'Keep the original today indicator');
  assert.equal(await cell('2026-10-03').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','Keep the original unboxed month layout, heat is on the date only');
  await page.evaluate(()=>{data.items.push({id:'planned',kind:'event',title:'原来的任务仍然显示',date:'2026-10-03',time:'09:00',endTime:'10:00',calendar:'Default',color:'#5ba6a0'});render();});
  assert.equal(await cell('2026-10-03').locator('.month-event').count(),1,'Preserve original month task strips');
  assert.equal(await page.locator('#app > .screen .heat-legend').count(),1);
  fs.mkdirSync('reference-analysis',{recursive:true});await page.screenshot({path:'reference-analysis/v1.5-month-heatmap.png'});
  await page.evaluate(()=>switchCalendarLevel('Year'));await page.locator('.calendar-outgoing').waitFor({state:'detached'});
  assert.equal(await page.locator('#app > .screen .mini-month').count(),12);
  assert.equal(await page.locator('.mini-month[data-month="2026-10"] [data-date="2026-10-05"]').getAttribute('data-heat'),'4');
  assert.equal(await page.locator('.heat-month-total').count(),0,'Year keeps the original layout without duration figures');
  await page.screenshot({path:'reference-analysis/v1.5-year-heatmap.png'});
  await page.locator('.mini-month[data-month="2026-10"]').click();await page.locator('.calendar-outgoing').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>ui.calendarView),'Month');
  for(const width of [320,375,393,480]){await page.setViewportSize({width,height:852});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));assert((await cell('2026-10-18').boundingBox()).height>=44,'Calendar day remains touchable');}
  await page.setViewportSize({width:393,height:852});await page.locator('.month-date[data-date="2026-10-18"]').click();await page.locator('.calendar-outgoing').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>ui.calendarView),'Week','Heatmap dates retain daily timeline drill-down');
  assert.deepEqual(errors,[]);console.log('PASS color-only monthly/yearly heat overlays, original unboxed layout/task strips, today, drill-down and mobile sizes');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
