const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8765/');await page.evaluate(()=>localStorage.clear());await page.reload();
await page.waitForTimeout(280);await page.screenshot({path:'reference-analysis/replica-todos.png'});
const click=action=>page.locator(`[data-action="${action}"]`).first().click();
await click('new');await page.getByRole('textbox',{name:'Title',exact:true}).fill('手机端验证待办');await click('todo-date');await page.locator('#dialog-date').fill('2026-10-11');await click('modal-confirm');await click('priority');await click('save');
if(!(await page.locator('.task-title').allTextContents()).includes('手机端验证待办'))throw Error('Todo not saved');
await page.reload();if(!(await page.locator('.task-title').allTextContents()).includes('手机端验证待办'))throw Error('Persistence failed');
await page.locator('[data-action="complete"][aria-label="Complete 手机端验证待办"]').click();
await click('view-menu');await click('show-completed');if(await page.locator('.task.done').count()!==1)throw Error('Completed filter');
await page.locator('[data-action="tab"][data-tab="calendar"]').click();await page.waitForTimeout(280);await page.screenshot({path:'reference-analysis/replica-timeline.png'});
for(const name of ['List','Overview','Week view','Events view','Timeline']){await click('view-menu');await page.locator(`[data-view="${name}"]`).click();if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+name)}
await click('new');await page.getByRole('textbox',{name:'Title',exact:true}).fill('测试日程');await page.getByLabel('End date',{exact:true}).fill('2026-10-10');await click('save');if(!await page.locator('#form-error').textContent())throw Error('Missing range validation');await page.getByLabel('End date',{exact:true}).fill('2026-10-11');await page.waitForTimeout(280);await page.screenshot({path:'reference-analysis/replica-editor.png'});await click('save');
await click('more');await click('search');await page.getByRole('searchbox').fill('测试日程');if(await page.locator('#search-results .task').count()!==1)throw Error('Search failed');await click('close-panel');
await click('more');await click('settings');await page.waitForTimeout(280);await page.screenshot({path:'reference-analysis/replica-settings.png'});await page.locator('[data-sub="filter"]').click();await page.getByLabel('learning',{exact:true}).uncheck();await click('settings-root');await click('close-panel');
await page.locator('[data-action="tab"][data-tab="todos"]').click();if((await page.locator('.task-title').allTextContents()).some(x=>x.startsWith('记得')))throw Error('Category filtering failed');
await click('more');await click('settings');await page.locator('[data-sub="filter"]').click();await click('filter-all');await click('settings-root');await click('close-panel');
await click('view-menu');await click('batch');await page.locator('.task-title').filter({hasText:'手机端验证待办'}).click();await click('batch-delete');await click('modal-confirm');if((await page.locator('.task-title').allTextContents()).includes('手机端验证待办'))throw Error('Batch deletion failed');
await click('more');await click('courses');await click('add-course');await page.getByLabel('Course title').fill('高等数学');await page.getByLabel('Classroom').fill('A301');await click('modal-confirm');if(await page.locator('.course').count()!==1)throw Error('Course add failed');await click('close-panel');
await click('more');await click('sync');const [download]=await Promise.all([page.waitForEvent('download'),click('backup-export')]);await download.saveAs('reference-analysis/test-backup.json');if(!JSON.parse(fs.readFileSync('reference-analysis/test-backup.json','utf8')).items.length)throw Error('Backup failed');await click('close-panel');
for(const width of [320,375,432,480]){await page.setViewportSize({width,height:852});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow '+width)}
await page.evaluate(()=>localStorage.clear());await page.reload();
if(errors.length)throw Error(errors.join('\n'));console.log('PASS: create, date validation, completion, persistence, search, category filter, batch deletion, five calendar views, course CRUD, backup export, mobile widths 320–480; no JS errors');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

