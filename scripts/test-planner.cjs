const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const allowed=new Set(['index.html','app.js','planner.js','style.css','sw.js','icon.svg','manifest.webmanifest']);
 const server=http.createServer((req,res)=>{const file=req.url==='/'?'index.html':req.url.slice(1);if(!allowed.has(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,'../replica',file)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-10-17T07:00:00Z'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const click=action=>page.locator(`[data-action="${action}"]`).first().click();
  assert.equal(await page.locator('[data-todo-filter]').count(),3,'Only All, pending and completed filters remain');
  await click('new');await page.locator('#title').fill('论文准备');
  await click('child-add');await page.locator('[data-child-title]').fill('整理提纲');
  await click('child-add');await page.locator('[data-child-title]').nth(1).fill('完成初稿');
  await click('save');await page.waitForTimeout(320);
  assert.equal(await page.locator('.task-children .task').count(),2,'Parent owns two nested tasks');
  let parentId=await page.evaluate(()=>data.items.find(item=>item.title==='论文准备').id);
  assert.equal(await page.evaluate(id=>data.items.filter(item=>item.parentId===id).length,parentId),2);
  await page.reload();assert.equal(await page.locator('.task-children .task').count(),2,'Hierarchy persists');
  await page.locator(`[data-action="edit"][data-id="${parentId}"]`).click();
  assert.equal(await page.locator('[data-child-title]').count(),2,'Children editable with parent');
  await page.locator('[data-child-title]').first().fill('整理提纲和资料');
  fs.mkdirSync(path.join(__dirname,'../reference-analysis'),{recursive:true});
  await page.waitForTimeout(320);
  await page.screenshot({path:'reference-analysis/v1.2-parent-editor.png'});
  await click('save');await page.waitForTimeout(320);
  assert(await page.locator('.task-children').textContent().then(text=>text.includes('整理提纲和资料')));
  await page.screenshot({path:'reference-analysis/v1.2-todos.png'});
  await page.evaluate(()=>{
   data.items.push({id:'two-hour',kind:'event',title:'项目讨论',date:'2026-10-17',time:'08:30',endDate:'2026-10-17',endTime:'10:30',calendar:'Default',color:'#5ba6a0',done:false},
    {id:'overlap',kind:'event',title:'讨论中间事项',date:'2026-10-17',time:'09:00',endDate:'2026-10-17',endTime:'09:30',calendar:'Default',color:'#c66f78',done:false},
    {id:'next-day',kind:'event',title:'第二天事项',date:'2026-10-18',time:'13:00',endDate:'2026-10-18',endTime:'15:00',calendar:'Default',color:'#7b8dc8',done:false},
    {id:'night',kind:'event',title:'跨午夜事项',date:'2026-10-17',time:'23:00',endDate:'2026-10-18',endTime:'01:00',calendar:'Default',color:'#b89b35',done:false});persist();render();
  });
  await page.locator('[data-tab="calendar"]').click();await page.waitForTimeout(300);
  assert.equal(await page.locator('.calendar-stage').getAttribute('data-level'),'Week');
  assert.equal(await page.locator('.day.today').getAttribute('data-date'),'2026-10-17');
  const block=page.locator('.time-block[data-id="two-hour"]');
  assert.equal(await block.evaluate(element=>parseFloat(element.style.height)),88,'Duration spans exactly two compact hours');
  assert.equal(await block.evaluate(element=>parseFloat(element.style.top)),374,'Start time maps to timeline');
  assert((await block.getAttribute('style')).includes('50%'),'Overlapping events get separate lanes');
  await page.screenshot({path:'reference-analysis/v1.2-week.png'});
  const cdp=await page.context().newCDPSession(page);
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});
  async function swipe(){await touch('touchStart',[[290,150]]);await touch('touchMove',[[100,150]]);await touch('touchEnd',[]);await page.waitForTimeout(300);}
  await swipe();
  assert.equal(await page.evaluate(()=>ui.selected),'2026-10-24','Week swipe advances seven days, not one month');
  assert.equal(await page.locator('.day.today').count(),0,'Today highlight never moves to a different date');
  assert.equal(await page.locator('.calendar-outgoing').count(),0,'Swipe cleans old month/week surfaces');
  await click('month-prev');await page.waitForTimeout(280);
  async function pinch(){await touch('touchStart',[[80,300],[310,300]]);await touch('touchMove',[[145,300],[245,300]]);await touch('touchEnd',[]);await page.waitForTimeout(300);}
  await pinch();assert.equal(await page.locator('.calendar-stage').getAttribute('data-level'),'Month','Pinch week → month');
  assert.equal(await page.locator('.month-block[data-month="2026-10"] .month-cell').count(),31,'Month contains its actual dates without boxed adjacent-month cells');
  assert(await page.locator('.month-event-label').allTextContents().then(t=>t.includes('项目讨论')&&t.includes('第二天事项')),'Month shows tasks on multiple dates together');
  await page.screenshot({path:'reference-analysis/v1.2-month.png'});
  await click('month-next');assert(await page.locator('.calendar-outgoing').count()>0,'Month arrows actually animate');await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>ui.month),'2026-11');
  await pinch();assert.equal(await page.locator('.calendar-stage').getAttribute('data-level'),'Year','Pinch month → year');
  assert.equal(await page.locator('.mini-month').count(),12);
  await page.screenshot({path:'reference-analysis/v1.2-year.png'});
  await page.locator('[data-month="2026-10"]').click();await page.waitForTimeout(300);
  assert.equal(await page.locator('.calendar-stage').getAttribute('data-level'),'Month');
  await page.locator('.month-date[data-date="2026-10-18"]').click();await page.waitForTimeout(300);
  assert.equal(await page.locator('.calendar-stage').getAttribute('data-level'),'Week','Month date drills into its week');
  assert.equal(await page.locator('.daily-timeline').getAttribute('aria-label'),'2026-10-18 时间轴');
  assert.equal(await page.locator('.time-block[data-id="night"]').evaluate(element=>parseFloat(element.style.height)),44,'Cross-midnight event clips to correct daily interval');
  await click('view-menu');assert.equal(await page.locator('.menu [data-action="calendar-view"]').count(),3);
  await page.locator('[data-view="Year"]').click();await page.waitForTimeout(280);
  await click('month-next');await page.waitForTimeout(280);assert.equal(await page.evaluate(()=>ui.year),2027);
  await page.locator('[data-month="2027-01"]').click();await page.waitForTimeout(280);await click('month-prev');await page.waitForTimeout(280);assert.equal(await page.evaluate(()=>ui.month),'2026-12','Year boundary navigation');
  await page.evaluate(async()=>{const snapshot=JSON.stringify(data);await importBackupFile(new File([snapshot],'backup.json'));});
  assert.equal(await page.evaluate(id=>data.items.filter(item=>item.parentId===id).length,parentId),2,'Backup round-trip preserves hierarchy');
  await page.locator('[data-tab="todos"]').click();await page.waitForTimeout(250);
  await page.evaluate(()=>{data.settings.showCompleted=true;render();});
  await page.locator(`[data-action="complete"][data-id="${parentId}"]`).click();await page.waitForTimeout(350);
  assert(await page.evaluate(id=>data.items.filter(item=>item.id===id||item.parentId===id).every(item=>item.done),parentId),'Completing parent completes its children');
  await page.locator(`[data-action="complete"][data-id="${parentId}"]`).click();await page.waitForTimeout(350);
  assert(await page.evaluate(id=>data.items.filter(item=>item.id===id||item.parentId===id).every(item=>!item.done),parentId),'Reopening parent reopens its children');
  await page.evaluate(()=>{const saved=data.items.map(item=>({...item}));data.items.push({id:'cascade-root',kind:'todo',title:'root',date:''},{id:'cascade-child',kind:'todo',title:'child',date:'',parentId:'cascade-root'},{id:'cascade-leaf',kind:'todo',title:'leaf',date:'',parentId:'cascade-child'});deleteIds(['cascade-root']);if(data.items.some(item=>item.id.startsWith('cascade-')))throw Error('Cascade delete failed');data.items=saved;persist();render();});
  for(const width of [320,375,393,480]){await page.setViewportSize({width,height:852});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'No mobile horizontal overflow at '+width);}
  assert.deepEqual(errors,[]);
  console.log('PASS: parent/child create/edit/persistence/backup, removed filters, compact duration layout, overlap lanes, overnight clipping, weekly swipes/today highlight, real pinch week-month-year, year/month drills, month animation, year boundaries, 320–480px layout; no JS errors');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
