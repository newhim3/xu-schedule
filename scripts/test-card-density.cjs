const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const allowed=new Set(JSON.parse(fs.readFileSync('replica/web-assets.json','utf8')));
 const server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);if(!allowed.has(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join('replica',name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-18T04:00:00Z'));await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{data.items=[{id:'parent',kind:'todo',title:'数据结构',estimatedMinutes:6000,date:'',calendar:'Default'},{id:'child',parentId:'parent',kind:'todo',title:'完成第二次作业的重构',estimatedMinutes:600,deadlineDate:'2026-10-20',deadlineTime:'18:00',date:'2026-10-20',time:'18:00',showCountdown:true,notes:'核对边界情况并补充测试',calendar:'Default'}];ui.tab='todos';persist();render();});
  const child=page.locator('#app > .screen .goal-card[data-task-id="child"]');
  assert.equal(await child.locator('.goal-details').count(),1,'Goal metadata shares horizontal space rather than stacking one row per field');
  assert((await child.boundingBox()).height<=94,'Default compact goal has a smaller card height with all optional fields');
  assert((await child.locator('.task-main').boundingBox()).width>(await child.boundingBox()).width*.68,'Use horizontal card width for text');
  assert((await child.textContent()).includes('数据结构'));assert((await child.textContent()).includes('2026-10-20 18:00'));assert((await child.textContent()).includes('剩 2 天'));assert((await child.textContent()).includes('核对边界'));
  const compactHeight=(await child.boundingBox()).height;
  await page.locator('[data-tab="focus"]').click();await page.locator('.motion-scene').waitFor({state:'detached'});await page.locator('[data-action="settings"]').first().click();
  await page.locator('[data-choice-field="card-density"]').click();await page.locator('dialog [data-choice-value="relaxed"]').click();
  assert.equal(await page.evaluate(()=>data.settings.cardDensity),'relaxed','Density is user adjustable');
  await page.locator('[data-action="close-panel"]').click();await page.locator('[data-tab="todos"]').click();await page.locator('.motion-scene').waitFor({state:'detached'});
  assert((await child.boundingBox()).height>compactHeight+8,'Density changes the box height, not just its font');
  await page.reload();assert.equal(await page.locator('html').getAttribute('data-card-density'),'relaxed','Density survives restart');
  await page.evaluate(()=>{data.settings.cardDensity='compact';persist();render();});
  for(const width of [320,375,393,480]){await page.setViewportSize({width,height:852});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));assert((await child.locator('.task-main').boundingBox()).width>170,'No narrow vertical title column at '+width);}
  await page.setViewportSize({width:393,height:852});fs.mkdirSync('reference-analysis',{recursive:true});await page.screenshot({path:'reference-analysis/v1.5-compact-goals.png'});
  const settings=await page.evaluate(()=>GoalCore.mergeBackup({items:[],settings:{}},{version:3,items:data.items,settings:data.settings}).settings);assert.equal(settings.cardDensity,'compact','Complete backup retains density');
  assert.deepEqual(errors,[]);console.log('PASS compact horizontal goal cards, metadata/source/deadline preserved, adjustable height, persistence, backup, mobile widths');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
