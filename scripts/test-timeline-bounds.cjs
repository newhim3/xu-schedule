const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const allowed=new Set(JSON.parse(fs.readFileSync('replica/web-assets.json','utf8')));
 const server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);if(!allowed.has(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join('replica',name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-22T14:59:00Z'));await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{data.items=Array.from({length:24},(_,i)=>{const minute=16*60+i*16,time=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');return {id:'short-'+i,title:'完成第二次作业并核对边界情况',kind:'event',date:'2026-10-22',endDate:'2026-10-22',time:time(minute),endTime:time(minute+4),color:'#b89b35',calendar:'Default'};});ui.tab='calendar';ui.selected='2026-10-22';ui.month='2026-10';ui.calendarView='Timetable';render();});
  const diagnostics=await page.evaluate(()=>{const canvas=document.querySelector('.timetable-canvas'),height=parseFloat(canvas.style.height);return [...document.querySelectorAll('.timetable-event')].map(el=>({id:el.dataset.id,top:parseFloat(el.style.top),height:parseFloat(el.style.height),canvas:height}));});
  console.log('Timeline bounds probe:',JSON.stringify(diagnostics.filter(x=>x.top+x.height>x.canvas).slice(0,3)));
  assert(diagnostics.every(x=>x.top>=0&&x.top+x.height<=x.canvas+.1),'Dense short tasks must not be pushed beyond the timeline');
  const axis=await page.locator('.timetable-axis>span').allTextContents();assert.equal(axis[0],'06:00','Timetable shares the default daytime start');assert.equal(axis.at(-1),'23:00');
  assert.equal(await page.locator('.timetable-event').count(),0,'Short records are collected instead of becoming crumbs');
  await page.locator('.timetable-scroll').evaluate(el=>el.scrollTop=dayY(960));fs.mkdirSync('reference-analysis',{recursive:true});await page.screenshot({path:'reference-analysis/v1.6-timetable-bounds.png'});
  await page.locator('[data-action="timetable-records"][data-date="2026-10-22"]').click();assert.equal(await page.locator('.timeline-record-list [data-action="edit"]').count(),24,'Tiny bars have a readable, complete record list');await page.locator('[data-action="modal-confirm"]').click();
  await page.evaluate(()=>{data.items.push({id:'edge',kind:'event',title:'跨过末端',date:'2026-10-22',endDate:'2026-10-22',time:'22:20',endTime:'23:30',calendar:'Default'},{id:'early',kind:'event',title:'清晨任务',date:'2026-10-22',time:'05:00',endTime:'05:30',calendar:'Default'});render();});
  const edge=page.locator('.timetable-event[data-id="edge"]');assert(await edge.evaluate(el=>parseFloat(el.style.top)+parseFloat(el.style.height)<=1224.1),'Clip at 23:00');await page.locator('[data-action="timetable-records"][data-date="2026-10-22"]').click();assert((await page.locator('.timeline-record-list').textContent()).includes('清晨任务'),'Outside tasks remain accessible in the day list');await page.locator('[data-action="modal-confirm"]').click();
  await page.evaluate(()=>{data.settings.daytimeOnly=false;render();});assert.equal((await page.locator('.timetable-axis>span').allTextContents())[0],'06:00','Timetable excludes overnight independently of day display settings');
  await page.evaluate(()=>{data.settings.daytimeOnly=true;ui.calendarView='Week';data.items=Array.from({length:25},(_,i)=>({id:'f'+i,kind:'event',title:'末端专注',date:'2026-10-22',endDate:'2026-10-22',time:'22:50',endTime:'22:51',actualStartAt:FocusCore.stamp('2026-10-22','22:50')+i*1000,actualEndAt:FocusCore.stamp('2026-10-22','22:50')+(i+1)*1000,focusActual:true,done:true,calendar:'Default'}));render();});
  assert(await page.locator('.focus-actual').evaluateAll(els=>els.every(el=>parseFloat(el.style.top)+parseFloat(el.style.height)<=dayAxis().height+.1)),'Daily focus labels also stay bounded');
  for(const width of [320,393,480]){await page.setViewportSize({width,height:852});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));}
  assert.deepEqual(errors,[]);console.log('PASS dense short timelines, real-time positioning, bounded daily labels, 06–23 timetable, clipping, readable record list and full-day toggle');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
