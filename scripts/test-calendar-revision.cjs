const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../replica'),allowed=new Set(JSON.parse(fs.readFileSync(path.join(root,'web-assets.json'),'utf8')));
 const server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);if(!allowed.has(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css':name.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.clock.setFixedTime(new Date('2026-10-29T01:18:00Z'));await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{data.items=[{id:'math',kind:'todo',title:'数学目标',date:'',color:'#5ba6a0'}];ui.tab='calendar';ui.selected='2026-10-29';render();openEditor();});
  assert.equal(await page.locator('[data-draft="goalId"]').count(),0,'New calendar reminders must not default to goal scheduling');
  await page.locator('#title').fill('取快递提醒');await page.locator('[data-draft="time"]').fill('10:00');await page.locator('[data-draft="endTime"]').fill('10:30');await page.locator('[data-action="save"]').click();
  assert.deepEqual(await page.evaluate(()=>data.items.filter(item=>item.kind==='todo').map(item=>item.title)),['数学目标'],'Saving a reminder must not silently create a goal');
  await page.evaluate(()=>openEditor());await page.locator('[data-action="editor-kind"][data-kind="todo"]').click();
  await page.locator('#title').fill('未关联任务');await page.locator('[data-draft="time"]').fill('11:00');await page.locator('[data-draft="endTime"]').fill('11:30');await page.locator('[data-action="save"]').click();
  assert(await page.locator('#form-error').textContent(),'A task schedule explicitly requires an existing goal');
  await page.locator('[data-draft="goalId"]').selectOption('math');await page.locator('[data-action="save"]').click();
  await page.evaluate(()=>{ui.tab='focus';ui.focusMode='free';render();});assert(!(await page.locator('.focus-picker').textContent()).includes('取快递提醒'));
  console.log('PASS reminders and goal scheduling stay separate');
  await page.evaluate(()=>{ui.tab='calendar';ui.calendarView='Week';data.settings.dayDisplay='clock';data.items.push({id:'morning',kind:'event',title:'上午读书',date:ui.selected,time:'09:00',endTime:'10:00',color:'#5ba6a0'},{id:'afternoon',kind:'event',title:'下午散步',date:ui.selected,time:'15:00',endTime:'16:00',color:'#b89b35'});render();});
  assert.deepEqual(await page.locator('.clock-hour').allTextContents(),['12','1','2','3','4','5','6','7','8','9','10','11'],'Clock follows an ordinary twelve-hour dial');
  const nine=await page.locator('.clock-hour').filter({hasText:/^9$/}).evaluate(el=>({x:+el.getAttribute('x'),y:+el.getAttribute('y')}));assert(nine.x<30&&Math.abs(nine.y-200)<1,'Nine is at the left of the dial');
  assert.equal(await page.locator('.clock-now').getAttribute('x1'),'200','Current-time needle originates at the center');
  const before=await page.locator('.clock-now').getAttribute('x2');await page.clock.setFixedTime(new Date('2026-10-29T01:30:00Z'));await page.waitForTimeout(1100);assert.notEqual(await page.locator('.clock-now').getAttribute('x2'),before,'Needle updates while the clock stays open');
  assert((await page.locator('.clock-legend').textContent()).includes('上午读书'),'Colored legend exposes schedule names');assert(await page.locator('.clock-sector-label').count()>0,'Dial includes short schedule labels');
  await page.locator('.clock-sector[data-id="morning"]').click();assert.equal(await page.locator('#title').inputValue(),'上午读书','A single real click edits a schedule');await page.evaluate(()=>{panel=null;render();});
  await page.locator('[data-action="clock-period"][data-period="1"]').click();assert.equal(await page.locator('.clock-sector[data-id="afternoon"]').count(),1,'Afternoon shows 15:00 at three on the same normal dial');
  await page.locator('[data-action="view-menu"]').click();assert.equal(await page.locator('[data-action="clock-view"]').count(),0,'Clock is a day presentation setting, not an extra calendar view');await page.evaluate(()=>{menu=null;actions.settings();});
  assert.equal(await page.locator('#day-display').inputValue(),'clock');assert.equal(await page.locator('[data-setting="eventTriggers"]').count(),0,'Removed experiment has no settings entry');
  for(const [width,height] of [[320,568],[393,852],[480,740]]){await page.setViewportSize({width,height});await page.evaluate(()=>{panel=null;ui.tab='calendar';ui.calendarView='Week';render();});await page.waitForTimeout(100);assert(await page.locator('.schedule-clock').evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.dock').getBoundingClientRect().top),'The entire dial fits above the dock');}
  fs.mkdirSync('reference-analysis',{recursive:true});await page.setViewportSize({width:393,height:852});await page.screenshot({path:'reference-analysis/v1.7.1-clock.png'});
  console.log('PASS normal dial, live needle, labels, direct editing, day setting and mobile fit');
  await page.evaluate(()=>{ui.calendarView='Month';ui.month='2026-10';ui.year=2026;data.focusSessions=[FocusCore.finish(FocusCore.start({id:'heat',goalId:'math'},FocusCore.stamp('2026-10-25','09:00')),FocusCore.stamp('2026-10-25','11:00'))];render();});
  const date=page.locator('.month-date[data-date="2026-10-25"] .number');assert.equal(await date.evaluate(el=>getComputedStyle(el).backgroundImage),'none','Heat uses a uniform preset cell, never a glowing gradient');assert.notEqual(await date.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.evaluate(()=>{ui.calendarView='Year';render();});const heat=page.locator('.mini-month[data-month="2026-10"] [data-date="2026-10-25"]');assert.equal(await heat.evaluate(el=>getComputedStyle(el).backgroundImage),'none');assert.notEqual(await heat.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.screenshot({path:'reference-analysis/v1.7.1-year.png'});
  await page.evaluate(()=>{ui.calendarView='Timetable';const base=FocusCore.stamp(ui.selected,'09:00');data.items=[{id:'shadow',kind:'event',title:'旧计划',date:ui.selected,time:'09:00',endTime:'12:00',focusCoveredBy:['s'],color:'#b89b35'},...Array.from({length:6},(_,i)=>({id:'real-'+i,kind:'event',title:'复习课本练习',date:ui.selected,time:FocusCore.parts(base+i*1800000).time,endTime:FocusCore.parts(base+(i+1)*1800000).time,focusActual:true,actualStartAt:base+i*1800000,actualEndAt:base+(i+1)*1800000,color:'#5ba6a0'}))];render();});
  assert(await page.locator('.timetable-event.focus-actual').evaluateAll(nodes=>nodes.every(el=>parseFloat(el.style.width)>75)),'A long faded original plan must not squeeze sequential actual records into narrow lanes');
  assert(await page.locator('.timetable-event.focus-actual strong').first().isVisible(),'Half-hour actual tasks have readable titles, not empty boxes');
  assert(await page.locator('.timetable-event').evaluateAll(nodes=>nodes.every(el=>{const box=el.getBoundingClientRect(),parent=el.parentElement.getBoundingClientRect();return box.left>=parent.left&&box.right<=parent.right+.5;})),'No task crosses into the neighboring date column');
  await page.screenshot({path:'reference-analysis/v1.7.1-timetable.png'});
  await page.evaluate(()=>{data.items=[['a','08:00','09:00'],['b','08:30','11:00'],['c','09:00','12:00'],['d','09:30','10:00']].map(([id,time,endTime])=>({id,kind:'event',title:id,date:ui.selected,time,endTime,color:'#5ba6a0'}));render();});
  assert(await page.locator('.timetable-day[data-date="2026-10-29"] .timetable-event').evaluateAll(nodes=>nodes.every((node,i)=>nodes.every((other,j)=>{if(j<=i)return true;const a=node.getBoundingClientRect(),b=other.getBoundingClientRect();return a.bottom<=b.top+.5||b.bottom<=a.top+.5||a.right<=b.left+.5||b.right<=a.left+.5;}))),'Chained overlapping records never cover each other when overlap count changes');
  await page.evaluate(()=>{data.settings.eventTriggers=true;data.items.push({id:'retired',kind:'event',title:'旧实验规则',date:'',trigger:{type:'goal',goalId:'math',minutes:25,state:'armed'}});persist();data.items.push({id:'math',kind:'todo',title:'数学',date:'',done:true});persist();});assert.equal(await page.evaluate(()=>data.items.filter(item=>item.triggeredBy==='retired').length),0,'Old rules never execute after feature removal');
  assert.deepEqual(errors,[]);console.log('PASS uniform heat cells, readable timetable geometry and retired trigger rules');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
