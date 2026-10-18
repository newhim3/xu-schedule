const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../replica'),server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);if(!/^[a-z0-9.-]+$/.test(name)||!fs.existsSync(path.join(root,name))){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('[data-tab="calendar"]').click();await page.locator('.motion-scene').waitFor({state:'detached',timeout:1500});await page.locator('#app > .screen [data-action="more"]').click();
  for(const action of ['subscriptions','voice','courses','jump'])assert.equal(await page.locator(`.menu [data-action="${action}"]`).count(),0,'Removed menu entry: '+action);
  await page.locator('[data-action="close-menu"]').click();
  await page.evaluate(()=>{data.items=[{id:'math',kind:'todo',title:'离散数学',date:'',calendar:'Default',color:'#5ba6a0',estimatedMinutes:600},{id:'english',kind:'todo',title:'英语',date:'',calendar:'Default',color:'#7b8dc8'},{id:'math-work',parentId:'math',kind:'todo',title:'写作业',date:'',calendar:'Default',color:'#5ba6a0'},{id:'english-work',parentId:'english',kind:'todo',title:'写作业',date:'',calendar:'Default',color:'#7b8dc8'}];persist();render();});
  await page.locator('[data-action="new"]').click();await page.waitForTimeout(280);
  assert.equal(await page.locator('[data-choice-field="goalId"]').count(),1,'Goal field uses the new choice surface');await page.locator('[data-choice-field="goalId"]').click();
  assert.equal(await page.locator('dialog.choice-sheet[open]').count(),1);assert.equal(await page.locator('[data-choice-value="math-work"]').count(),0,'Subgoals are not mixed into the root list');
  await page.locator('[data-choice-expand="math"]').click();const mathWork=page.locator('[data-choice-value="math-work"]');assert((await mathWork.textContent()).includes('离散数学'),'Subgoal displays its parent origin');fs.mkdirSync('reference-analysis',{recursive:true});await page.screenshot({path:'reference-analysis/v1.4-goal-picker.png'});await mathWork.click();
  assert.equal(await page.locator('[data-draft="goalId"]').inputValue(),'math-work');assert((await page.locator('[data-choice-field="goalId"]').textContent()).includes('离散数学'));
  await page.locator('[data-choice-field="importance"]').click();assert.equal(await page.locator('.importance-choice').count(),5);await page.waitForTimeout(220);await page.screenshot({path:'reference-analysis/v1.4-importance.png'});await page.locator('[data-choice-value="4"]').click();assert.equal(await page.locator('[data-draft="importance"]').inputValue(),'4');
  await page.locator('[data-choice-field="reminder"]').click();await page.locator('[data-choice-value="None"]').click();assert.equal(await page.locator('[data-draft="reminder"]').inputValue(),'None','Other selection fields use the same styled panel');
  await page.locator('[data-choice-field="importance"]').click();await page.keyboard.press('Escape');await page.waitForTimeout(220);assert.equal(await page.locator('#title').count(),1,'Escape dismisses the picker without discarding the editor');
  await page.locator('[data-choice-field="importance"]').click();assert.equal(await page.evaluate(()=>window.handleNativeBack()),true);await page.waitForTimeout(220);assert.equal(await page.locator('dialog.choice-sheet[open]').count(),0);assert.equal(await page.locator('#title').count(),1,'Android back only dismisses the picker');
  await page.locator('[data-action="close-panel"]').click();await page.waitForTimeout(280);await page.locator('[data-tab="focus"]').click();await page.waitForTimeout(280);await page.locator('[data-action="focus-mode"][data-mode="free"]').click();
  assert.equal(await page.locator('.focus-picker > .focus-goal-family').count(),2,'Focus chooser groups by root rather than flattening goals');assert((await page.locator('.focus-goal-family[data-parent="math"]').textContent()).includes('离散数学'));
  await page.locator('[data-action="focus-select-goal"][data-id="math-work"]').first().click();assert((await page.locator('.focus-timer').textContent()).includes('离散数学'),'Selected focus subgoal still shows its source');
  fs.mkdirSync('reference-analysis',{recursive:true});await page.screenshot({path:'reference-analysis/v1.4-focus-chooser.png'});
  assert.deepEqual(errors,[]);console.log('PASS removed menu entries, nested goal choice, explicit parent origin, styled importance and grouped focus chooser');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
