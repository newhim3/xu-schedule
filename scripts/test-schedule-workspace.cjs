const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const assets=new Set(require('../replica/web-assets.json'));
(async()=>{
 const server=http.createServer((req,res)=>{
  const name=req.url==='/'?'index.html':req.url.slice(1);
  if(!assets.has(name)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html; charset=utf-8');
  res.end(fs.readFileSync('replica/'+name));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge'});
  const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce',hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-19T02:30:00Z'));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{
   data.settings.chainLayout=true;ui.tab='calendar';ui.calendarView='Timetable';ui.selected=today();
   const common={kind:'event',date:today(),calendar:'Default',goalId:'child',title:'数据结构作业的详细小目标以及本次需要核对的全部边界'};
   data.items=[{kind:'todo',id:'parent',title:'数据结构'},{kind:'todo',id:'child',parentId:'parent',title:common.title},
    {...common,id:'short',time:'11:00',endTime:'11:01'},{...common,id:'next',time:'11:01',endTime:'11:45'},
    {...common,id:'long',taskBlock:true,time:'11:00',endTime:'12:00'},{...common,id:'preset',date:'',taskBlock:true,preset:true,time:'00:00',endTime:'00:30'}];
   render();
  });
  page.setDefaultTimeout(6500);
  const day=page.locator('.chain-day-column[data-chain-date="2026-11-19"]');
  assert((await page.locator('.chain-grid').boundingBox()).height<=600,'Compact whole-day week scale');
  const scheduled=day.locator('.chain-block:has([data-id="long"][data-action="chain-block"])');
  const color=locator=>locator.evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.equal(await color(scheduled),await color(page.locator('.chain-week .chain-legend i').nth(1)));
  const overlaps=await day.locator('.chain-block').evaluateAll(cards=>cards.some((a,i)=>cards.slice(i+1).some(b=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.min(x.right,y.right)-Math.max(x.left,y.left)>.25&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>.25;})));
  assert.equal(overlaps,false,'Short and simultaneous blocks must never overlap');
  const offset=await day.evaluate(el=>el.getBoundingClientRect().left-el.closest('.chain-week-scroll').getBoundingClientRect().left);
  assert(offset>=0&&offset<=30,'Today starts immediately after the time axis, got '+offset);
  assert.equal(await day.locator('[data-id="long"] strong').textContent(),'数据结构');
  assert(await day.locator('[data-id="long"] small').textContent().then(s=>s.includes('详细小目标')));
  for(const view of ['Week','Timetable','Month','Year','Dashboard']){
   await page.evaluate(view=>{ui.calendarView=view;render();},view);
   assert(await page.locator('.preset-chip[data-id="preset"]').isVisible(),view+' has presets');
  }
  await page.evaluate(()=>{ui.calendarView='Month';render();});
  const chip=await page.locator('.preset-chip[data-id="preset"]').boundingBox();
  const target=await page.locator('.month-date[data-date="2026-11-19"]').boundingBox();
  const session=await page.context().newCDPSession(page);
  const touch=(type,box)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:box?[{x:box.x+box.width/2,y:box.y+box.height/2}]:[]});
  await touch('touchStart',chip);await page.waitForTimeout(450);await touch('touchMove',target);await touch('touchEnd');
  assert(await page.evaluate(()=>data.items.some(item=>item.date==='2026-11-19'&&item.taskBlock&&item.time==='09:00')&&data.items.some(item=>item.id==='preset'&&!item.date)),'Touch drop creates a record and retains reusable preset');
  await page.clock.setFixedTime(new Date('2026-11-19T06:30:00Z'));
  await page.evaluate(()=>{ui.calendarView='Week';data.settings.dayDisplay='timeline';data.items=data.items.filter(item=>!['short','next'].includes(item.id));render();});
  const source=page.locator('.time-block[data-id="long"] .time-block-main');
  await source.scrollIntoViewIfNeeded();
  const origin=await source.boundingBox();
  const move=await page.locator('.time-canvas').evaluate(el=>({x:el.getBoundingClientRect().left+52,y:el.getBoundingClientRect().top+dayY(728),width:0,height:0}));
  await touch('touchStart',origin);await page.waitForTimeout(445);await touch('touchMove',move);
  await page.locator('.schedule-drop-line').waitFor();
  await touch('touchEnd');
  assert.equal(await page.evaluate(()=>data.items.find(item=>item.id==='long').time),'12:15');
  assert.equal(await page.evaluate(()=>data.items.find(item=>item.id==='long').endTime),'13:15');
  await page.evaluate(()=>{ui.calendarView='Month';render();});
  const monthBlock=page.locator('.month-event[data-id="long"]');
  await monthBlock.scrollIntoViewIfNeeded();
  const tomorrow=page.locator('.month-date[data-date="2026-11-20"]');
  await touch('touchStart',await monthBlock.boundingBox());await page.waitForTimeout(420);
  await touch('touchMove',await tomorrow.boundingBox());await touch('touchEnd');
  assert.equal(await page.evaluate(()=>data.items.find(item=>item.id==='long').date),'2026-11-20');
  assert.equal(await page.evaluate(()=>data.items.find(item=>item.id==='long').time),'12:15','Month moves the date while preserving the time');
  await page.evaluate(()=>{const item=data.items.find(item=>item.id==='long');item.date=item.endDate=today();});
  await page.setViewportSize({width:1180,height:820});
  await page.evaluate(()=>{ui.calendarView='Timetable';render();});
  const side=await page.locator('.calendar-workspace-side').boundingBox(),grid=await page.locator('.chain-week').boundingBox();
  assert(side.x>=grid.x+grid.width,'Tablet presets in right independent column');
  const checkbox=day.locator('[data-id="long"][role="checkbox"]');
  await checkbox.click();
  assert.equal(await checkbox.getAttribute('aria-checked'),'true');
  assert.equal(await color(scheduled),await color(page.locator('.chain-week .chain-legend i').first()));
  await checkbox.click();
  await day.locator('[data-id="long"][data-action="chain-block"]').click();
  const editor=await page.locator('#overlay .page').boundingBox();
  assert(editor.width<800&&editor.height<820,'Tablet edit opens in a window');
  assert.deepEqual(errors,[]);
  console.log('PASS compact color-matched weekly blocks, checkbox and undo, explicit touch drag with quarter-hour snapping, month moves, today anchor, presets and tablet window');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
