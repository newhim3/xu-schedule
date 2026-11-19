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
    {...common,id:'long',time:'11:00',endTime:'12:00'},{...common,id:'preset',date:'',taskBlock:true,preset:true,time:'00:00',endTime:'00:30'}];
   render();
  });
  const day=page.locator('.chain-day-column[data-chain-date="2026-11-19"]');
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
  await page.setViewportSize({width:1180,height:820});
  await page.evaluate(()=>{ui.calendarView='Timetable';render();});
  const side=await page.locator('.calendar-workspace-side').boundingBox(),grid=await page.locator('.chain-week').boundingBox();
  assert(side.x>=grid.x+grid.width,'Tablet presets in right independent column');
  await page.locator('.chain-block[data-id="long"]').click();
  const editor=await page.locator('#overlay .page').boundingBox();
  assert(editor.width<800&&editor.height<820,'Tablet edit opens in a window');
  assert.deepEqual(errors,[]);
  console.log('PASS chained week geometry, today anchor, hierarchy, all view presets, touch and tablet');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
