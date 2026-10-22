'use strict';
const plannerFocus=typeof FocusCore!=='undefined'?FocusCore:typeof require==='function'?require('./focus-core.js'):null;
// Goal-driven planner extension. Pure helpers are also exercised directly in Node.
const GoalCore={
 interval(item){
  const stamp=(date,time)=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'')?Date.parse(date+'T'+time+':00+08:00'):NaN;
  const start=stamp(item.date,item.allDay?'00:00':item.time);
  let end=stamp(item.endDate||item.date,item.allDay?'00:00':item.endTime);
  if(item.allDay)end+=86400000;
  return [start,end];
 },
 durationMinutes(item){const [start,end]=this.interval(item);return Number.isFinite(start)&&Number.isFinite(end)&&end>start?(end-start)/60000:0;},
 canComplete(item,now=Date.now()){const [start,end]=this.interval(item);return Number.isFinite(start)&&Number.isFinite(end)&&end>start&&now>=end;},
 goalMinutes(items,id,now=Date.now()){
  const ids=new Set([id]);let changed=true;
  while(changed){changed=false;for(const goal of items){if(goal.kind==='todo'&&ids.has(goal.parentId)&&!ids.has(goal.id)){ids.add(goal.id);changed=true;}}}
  if(plannerFocus&&items.some(item=>item.focusActual))return plannerFocus.creditMinutes(items,ids,now);
  return items.reduce((sum,item)=>sum+(item.taskBlock&&ids.has(item.goalId)&&item.done&&this.canComplete(item,now)?this.durationMinutes(item):0),0);
 },
 mergeBackup(current,incoming){
  const fail=()=>{throw Error('Invalid planner backup');};
  if(!incoming||!Array.isArray(incoming.items)||incoming.items.length>10000||(incoming.version&&incoming.version>3))fail();
  const validDate=value=>typeof value==='string'&&(!value||/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value);
  const validTime=value=>value===undefined||value===''||typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const safeId=value=>typeof value==='string'&&value.length>0&&value.length<=200;
  const ids=new Set(),records=[];
  for(const source of incoming.items){
   if(!source||!safeId(source.id)||ids.has(source.id)||!['todo','event'].includes(source.kind)||typeof source.title!=='string'||source.title.length>1000||!validDate(source.date)||source.endDate!==undefined&&!validDate(source.endDate)||!validTime(source.time)||!validTime(source.endTime)||source.color&&!/^#[0-9a-f]{6}$/i.test(source.color)||source.notes!==undefined&&(typeof source.notes!=='string'||source.notes.length>20000)||source.importance!==undefined&&(!Number.isInteger(source.importance)||source.importance<0||source.importance>4)||source.estimatedMinutes!=null&&(!Number.isFinite(source.estimatedMinutes)||source.estimatedMinutes<=0||source.estimatedMinutes>6000000)||source.goalId!=null&&!safeId(source.goalId)||source.parentId!=null&&!safeId(source.parentId))fail();
   ids.add(source.id);const item=JSON.parse(JSON.stringify(source));item.importance=Number.isInteger(item.importance)?item.importance:item.priority?4:0;item.calendar=typeof item.calendar==='string'&&item.calendar.length<=100?item.calendar:'Default';item.time=item.time||'';item.done=!!item.done;records.push(item);
  }
  const insights=incoming.insights===undefined?[]:incoming.insights;if(!Array.isArray(insights)||insights.length>10000)fail();
  const insightIds=new Set();
  for(const item of insights){
   if(!item||!safeId(item.id)||insightIds.has(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>1000||typeof(item.notes||'')!=='string'||(item.notes||'').length>20000||!Array.isArray(item.validationDates)||item.validationDates.length>100000||!item.validationDates.every(value=>Number.isSafeInteger(value)&&value>=0)||!Number.isSafeInteger(item.createdAt)||!Number.isSafeInteger(item.updatedAt))fail();insightIds.add(item.id);
  }
  if(incoming.settings!==undefined&&(!incoming.settings||typeof incoming.settings!=='object'||Array.isArray(incoming.settings)))fail();
  const settings={...(current.settings||{}),...(incoming.settings||{})};
  if(settings.categories!==undefined&&(!Array.isArray(settings.categories)||settings.categories.length>1000||!settings.categories.every(x=>typeof x==='string'&&x.length<=100)))fail();
  if(settings.weekStart!==undefined&&![0,1].includes(settings.weekStart))fail();
  const byId=new Map((current.items||[]).map(item=>[item.id,item]));for(const item of records)byId.set(item.id,item);
  settings.categories=[...new Set([...(current.settings?.categories||[]),...(settings.categories||[]),...records.map(item=>item.calendar)])];
  settings.language=settings.language==='en'?'en':'zh';settings.glassCalendar=settings.glassCalendar!==false;
  const byInsight=new Map((current.insights||[]).map(item=>[item.id,item]));for(const item of insights)byInsight.set(item.id,JSON.parse(JSON.stringify(item)));
  const focusSessions=incoming.focusSessions||[];if(!Array.isArray(focusSessions)||focusSessions.length>10000||focusSessions.some(session=>!plannerFocus?.validate(session)))fail();
  const byFocus=new Map((current.focusSessions||[]).map(session=>[session.id,session]));for(const session of focusSessions)byFocus.set(session.id,JSON.parse(JSON.stringify(session)));
  for(const item of records){if(item.deadlineDate!==undefined&&!validDate(item.deadlineDate)||!validTime(item.deadlineTime)||item.focusActual&&(!Number.isFinite(item.actualStartAt)||!Number.isFinite(item.actualEndAt)||item.actualEndAt<=item.actualStartAt))fail();}
  return {...JSON.parse(JSON.stringify(current)),version:3,items:[...byId.values()],insights:[...byInsight.values()],focusSessions:[...byFocus.values()],settings,
   courses:Array.isArray(incoming.courses)?JSON.parse(JSON.stringify(incoming.courses)):(current.courses||[]),subscriptions:{...(current.subscriptions||{}),...(incoming.subscriptions||{})}};
 }
};
if(typeof module!=='undefined'&&module.exports)module.exports=GoalCore;
if(typeof document!=='undefined'){
 data.version=3;data.insights=Array.isArray(data.insights)?data.insights:[];
 data.settings.language=['zh','en'].includes(data.settings.language)?data.settings.language:'zh';
 data.settings.glassCalendar=data.settings.glassCalendar!==false;
 const tr=(zh,en)=>data.settings.language==='en'?en:zh;
 const importanceNames=()=>[tr('待设置','Not set'),tr('不紧急不重要','Neither urgent nor important'),tr('不紧急重要','Important, not urgent'),tr('紧急不重要','Urgent, not important'),tr('紧急重要','Urgent and important')];
 const importanceColors=['#8b929d','#7b8dc8','#5ba6a0','#b89b35','#c66f78'];
 const hours=minutes=>new Intl.NumberFormat(data.settings.language==='en'?'en-US':'zh-CN',{maximumFractionDigits:2}).format(minutes/60);
 for(const item of data.items)if(item.kind==='todo'&&!Number.isInteger(item.importance))item.importance=item.priority?4:0;
 todoPool=()=>data.items.filter(item=>item.kind==='todo'&&included(item)).sort((a,b)=>(b.importance??(b.priority?4:0))-(a.importance??(a.priority?4:0)));
 actions['batch-priority']=()=>{for(const item of data.items)if(ui.selectedIds.has(item.id)){item.importance=4;item.priority=true;}persist();render();toast(tr('重要度已更新','Importance updated'));};
 let plannerEditorMode='goal';
 const legacyOpenEditor=openEditor,legacyEditorHTML=editorHTML,legacySaveGoal=saveDraft;
 openEditor=id=>{
  const item=data.items.find(x=>x.id===id);
  plannerEditorMode=item?(item.kind==='todo'?'goal':item.taskBlock?'session':'event'):(ui.tab==='calendar'?'session':'goal');
  legacyOpenEditor(id);
  draft.importance=Number.isInteger(draft.importance)?draft.importance:draft.priority?4:0;
  draft.estimateHours=draft.estimatedMinutes?draft.estimatedMinutes/60:'';
  if(plannerEditorMode==='session'){draft.kind='event';draft.taskBlock=true;draft.allDay=false;}
  renderOverlay();
 };
 const editorHead=()=>`<div class="page-header"><button class="text-button" data-action="close-panel">${tr('取消','Cancel')}</button><h2>${tr(data.items.some(x=>x.id===draft.id)?'编辑':'新建',data.items.some(x=>x.id===draft.id)?'Edit':'New')}</h2><button class="text-button" id="save-event" data-action="save" ${!draft.title.trim()?'disabled':''}>${tr('完成','Done')}</button></div>`;
 const editorTabs=()=>`<div class="editor-tabs"><button data-action="editor-kind" data-kind="event" class="${plannerEditorMode==='event'?'active':''}">${tr('日程','Event')}</button><button data-action="editor-kind" data-kind="todo" class="${plannerEditorMode!=='event'?'active':''}">${plannerEditorMode==='goal'?tr('目标','Goal'):tr('任务','Task')}</button></div>`;
 const importanceField=()=>`<label class="row"><span class="label">${tr('重要度','Importance')}</span><select data-draft="importance" aria-label="${tr('重要度','Importance')}">${importanceNames().map((name,i)=>`<option value="${i}" ${Number(draft.importance)===i?'selected':''}>${name}</option>`).join('')}</select>${icon('down','chevron')}</label>`;
 const titleField=()=>`<div class="edit-card gold"><textarea id="title" aria-label="Title" placeholder="${tr(plannerEditorMode==='goal'?'目标名称':'任务名称',plannerEditorMode==='goal'?'Goal title':'Task title')}">${esc(draft.title)}</textarea><div class="todo-tools"><button class="icon-button" data-action="color" aria-label="${tr('颜色','Color')}"><span class="color-dot" style="background:${esc(draft.color)}"></span></button></div></div>`;
 const notesField=()=>`<div class="edit-card"><label class="field-caption">${tr('批注','Notes')}</label><textarea class="planner-notes" data-draft="notes" aria-label="Remarks" placeholder="${tr('补充说明，会显示在目标或任务标题下方','Shown below the goal or task title')}">${esc(draft.notes||'')}</textarea></div>`;
 editorHTML=()=>{
  if(plannerEditorMode!=='goal')return scheduleEditorHTML();
  const original=legacyEditorHTML(),start=original.indexOf('<div class="edit-card"><label class="row"><span class="label">所属大任务</span>'),end=original.indexOf('<div class="more-label">More settings</div>');
  const family=start>=0&&end>start?original.slice(start,end):'';
  return editorHead()+editorTabs()+titleField()+`<p class="form-error" id="form-error"></p><div class="edit-card">${importanceField()}<label class="row"><span class="label">${tr('预估投入（小时，可不填）','Estimated hours (optional)')}</span><input type="number" min="0" max="100000" step="0.25" inputmode="decimal" data-draft="estimateHours" aria-label="Estimated hours" value="${esc(draft.estimateHours??'')}" placeholder="${tr('不预估','No estimate')}"></label>${rowSelect('Repeat','repeat',['Once','Every day','Every week','Every month','Every year'],draft.repeat)}</div>`+notesField()+family+(data.items.some(x=>x.id===draft.id)?`<button class="danger-button full-width" data-action="delete-item">${tr('删除目标','Delete goal')}</button>`:'');
 };
 function scheduleEditorHTML(){
  const goals=data.items.filter(x=>x.kind==='todo');
  return editorHead()+editorTabs()+`<div class="edit-card schedule-dates"><div class="time-fields"><label>${tr('开始','Start')}<input type="date" aria-label="Start date" data-draft="date" value="${esc(draft.date||ui.selected)}"><input type="time" aria-label="Start time" data-draft="time" value="${esc(draft.time||'08:30')}"></label><label>${tr('结束','End')}<input type="date" aria-label="End date" data-draft="endDate" value="${esc(draft.endDate||draft.date||ui.selected)}"><input type="time" aria-label="End time" data-draft="endTime" value="${esc(draft.endTime||'09:30')}"></label></div></div>${plannerEditorMode==='session'?`<div class="edit-card"><label class="row"><span class="label">${tr('执行哪个目标','Goal to work on')}</span><select data-draft="goalId" aria-label="Goal"><option value="">${tr('新建一个目标','Create a new goal')}</option>${goals.map(goal=>`<option value="${esc(goal.id)}" ${draft.goalId===goal.id?'selected':''}>${goal.parentId?'↳ ':''}${esc(goal.title)}</option>`).join('')}</select>${icon('down','chevron')}</label><p class="note">${tr('选择已有目标或子目标；留空则用任务名称创建目标。','Select a goal or subgoal, or create one with this task title.')}</p></div>`:''}`+titleField()+`<p class="form-error" id="form-error"></p><div class="edit-card">${importanceField()}${rowSelect('Reminder','reminder',['None','At time of event','5 minutes before','15 minutes before','30 minutes before','1 day before'],draft.reminder)}${rowToggle('Alarm · 闹钟','alarm',draft.alarm)}</div>`+notesField()+(data.items.some(x=>x.id===draft.id)?`<button class="danger-button full-width" data-action="delete-item">${tr('删除任务安排','Delete scheduled item')}</button>`:'');
 }
 actions['editor-kind']=element=>{
  plannerEditorMode=element.dataset.kind==='event'?'event':ui.tab==='calendar'?'session':'goal';
  draft.kind=plannerEditorMode==='goal'?'todo':'event';draft.taskBlock=plannerEditorMode==='session';
  if(draft.kind==='event'){draft.date=draft.date||ui.selected;draft.endDate=draft.endDate||draft.date;draft.time=draft.time||'08:30';draft.endTime=draft.endTime||'09:30';draft.allDay=false;}
  renderOverlay();
 };
 document.addEventListener('change',event=>{
  if(event.target.dataset.draft==='goalId'&&draft){const goal=data.items.find(x=>x.id===event.target.value);if(goal){draft.title=goal.title;draft.color=goal.color;draft.importance=goal.importance||0;renderOverlay();}}
 });
 saveDraft=()=>{
  const estimate=Number(draft.estimateHours);
  if(plannerEditorMode==='goal'&&draft.estimateHours!==''&&(!Number.isFinite(estimate)||estimate<=0||estimate>100000)){$('#form-error').textContent=tr('预估时长须大于 0，也可以留空','Enter a positive estimate or leave it blank');return;}
  draft.importance=Math.max(0,Math.min(4,Number(draft.importance)||0));draft.priority=draft.importance>0;
  draft.estimatedMinutes=plannerEditorMode==='goal'&&draft.estimateHours!==''?Math.round(estimate*60):null;
  if(plannerEditorMode==='goal'){const input=draft.estimateHours;delete draft.estimateHours;legacySaveGoal();if(panel)draft.estimateHours=input;return;}
  delete draft.estimateHours;
  if(!draft.title.trim()){return;}
  if(!GoalCore.durationMinutes(draft)){$('#form-error').textContent=tr('结束时间必须晚于开始时间','End must be after start');return;}
  const previous=data.items.map(x=>({...x}));
  draft.kind='event';draft.taskBlock=plannerEditorMode==='session';
  if(draft.taskBlock&&!data.items.some(x=>x.kind==='todo'&&x.id===draft.goalId)){
   const goal={id:uid(),kind:'todo',title:draft.title.trim(),date:'',time:'',calendar:draft.calendar||'Default',color:draft.color,importance:draft.importance,priority:draft.priority,parentId:null,done:false,notes:draft.notes||'',repeat:'Once',reminder:'None'};
   data.items.push(goal);draft.goalId=goal.id;
  }
  if(!draft.taskBlock)delete draft.goalId;
  if(draft.done&&!GoalCore.canComplete(draft)){draft.done=false;delete draft.completedAt;}
  legacySaveGoal();if(panel)data.items=previous;
 };
 actions.save=()=>saveDraft();
 const classicTaskHTML=taskHTML;
 taskHTML=(item,batch=false)=>{
  if(item.kind!=='todo')return classicTaskHTML(item,batch);
  const children=data.items.filter(x=>x.kind==='todo'&&x.parentId===item.id),minutes=GoalCore.goalMinutes(data.items,item.id),estimated=Number(item.estimatedMinutes)||0,percent=estimated?Math.round(minutes/estimated*100):0;
  const checked=batch?ui.selectedIds.has(item.id):item.done;
  return `<article class="task goal-card ${item.done?'done':''}" data-task-id="${esc(item.id)}" style="--task-color:${esc(importanceColors[item.importance]||item.color||importanceColors[0])}"><div class="goal-card-row">${children.length&&!batch?`<button class="task-fold ${foldedTasks.has(item.id)?'folded':''}" data-action="task-collapse" data-id="${esc(item.id)}" aria-label="${tr('展开或收起','Expand or collapse')} ${esc(item.title)}">${icon('down')}</button>`:''}<button class="check ${checked?'checked':''}" data-action="${batch?'select':'complete'}" data-id="${esc(item.id)}" aria-label="${tr('完成目标','Complete goal')} ${esc(item.title)}" aria-pressed="${!!checked}"><span>${checked?icon('check'):''}</span></button><button class="task-main" data-action="${batch?'select':'edit'}" data-id="${esc(item.id)}"><div class="task-title">${esc(item.title)}</div>${item.notes?`<div class="goal-note">${esc(item.notes)}</div>`:''}<div class="task-meta">${item.done?tr('已完成 · ','Completed · '):''}${tr('已投入','Invested')} ${hours(minutes)}h${estimated?' / '+tr('预估','estimate')+' '+hours(estimated)+'h':''}${children.length?' · '+children.filter(x=>x.done).length+'/'+children.length+' '+tr('子目标','subgoals'):''}</div></button>${estimated?`<span class="goal-percent">${percent}%</span>`:''}</div>${estimated?`<div class="goal-progress" role="progressbar" aria-label="${tr('目标投入进度','Goal time progress')}" aria-valuenow="${Math.min(100,percent)}" aria-valuemin="0" aria-valuemax="100"><span style="transform:scaleX(${Math.min(1,minutes/estimated)})"></span></div>`:''}</article>`;
 };
 paths.insight='M9 18h6M10 22h4M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3';
 let insightDraft=null;
 dockHTML=()=>`<nav class="dock planner-dock" aria-label="Main navigation">${btn(ui.tab==='insights'?'settings':'view-menu',tr('视图与设置','Views and settings'),ui.tab==='insights'?'settings':ui.tab==='todos'?'sort':ui.calendarView==='Week'?'timeline':ui.calendarView==='Month'?'grid':'calendar','','round')}<div class="switcher">${[['calendar',tr('日历','Calendar')],['todos',tr('目标','Goals')],['insights',tr('感悟','Insights')]].map(([tab,label])=>`<button data-action="tab" data-tab="${tab}" class="${ui.tab===tab?'active':''}">${label}</button>`).join('')}</div>${btn('new',tr('新建','Create'),'plus','','round')}</nav>`;
 function insightAge(stamp){
  if(!stamp)return tr('尚未验证','Not validated yet');const days=Math.max(0,Math.floor((Date.now()-stamp)/86400000));
  return days===0?tr('今天','today'):days===1?tr('昨天','yesterday'):tr(days+' 天前',days+' days ago');
 }
 function insightsHTML(){
  const sorted=[...data.insights].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(data.settings.insightSort==='recent'?(b.validationDates.at(-1)||b.updatedAt)-(a.validationDates.at(-1)||a.updatedAt):b.validationDates.length-a.validationDates.length)||b.updatedAt-a.updatedAt);
  return `<header class="header"><h1>${tr('感悟','Insights')} <small>${data.insights.length}</small></h1>${btn('settings',tr('设置','Settings'),'settings')}</header><div class="insight-list-heading"><span>${tr('我的感悟','My insights')}</span><button data-action="insight-sort">${data.settings.insightSort==='recent'?tr('按最近验证排序','Most recently validated'):tr('按验证次数排序','Most validations')}</button></div>${sorted.length?sorted.map(item=>`<article class="insight-card ${item.pinned?'pinned':''}" data-insight-id="${esc(item.id)}"><button class="insight-main" data-action="insight-edit" data-id="${esc(item.id)}"><strong class="insight-title">${esc(item.title)}</strong>${item.notes?`<span class="insight-notes">${esc(item.notes)}</span>`:''}<small>${tr('已验证','Validated')} <b class="insight-count">${item.validationDates.length}</b> ${tr('次 · 最近验证','times · Last')} ${insightAge(item.validationDates.at(-1))}</small></button><div class="insight-actions"><button data-action="insight-pin" data-id="${esc(item.id)}" aria-pressed="${!!item.pinned}">${tr(item.pinned?'取消置顶':'置顶',item.pinned?'Unpin':'Pin')}</button><button data-action="insight-validate" data-id="${esc(item.id)}">${tr('验证 +1','Validate +1')}</button></div></article>`).join(''):`<div class="empty">${icon('insight')}<p>${tr('把值得反复验证的想法记在这里','Keep ideas worth testing again')}</p><button data-action="new">${tr('＋ 写一条感悟','＋ Add an insight')}</button></div>`}`;
 }
 const calendarOrInsights=calendarHTML;calendarHTML=()=>ui.tab==='insights'?insightsHTML():calendarOrInsights();
 const ordinaryPanelHTML=panelHTML;
 panelHTML=()=>{
  if(panel.type!=='insight')return ordinaryPanelHTML();
  return `<section class="page insight-editor" aria-label="insight"><div class="page-header"><button class="text-button" data-action="close-panel">${tr('取消','Cancel')}</button><h2>${tr('感悟','Insight')}</h2><button class="text-button" data-action="insight-save">${tr('保存','Save')}</button></div><div class="edit-card"><label class="field-caption">${tr('一句值得记住的话','An idea to remember')}</label><textarea class="insight-title-input" data-insight-field="title" aria-label="${tr('感悟内容','Insight')}" placeholder="${tr('写下你的发现','What did you discover?')}">${esc(insightDraft.title)}</textarea></div><div class="edit-card"><label class="field-caption">${tr('补充记录（可选）','Notes (optional)')}</label><textarea class="planner-notes" data-insight-field="notes">${esc(insightDraft.notes||'')}</textarea></div><p class="form-error" id="insight-error"></p>${data.insights.some(x=>x.id===insightDraft.id)?`<button class="danger-button full-width" data-action="insight-delete">${tr('删除这条感悟','Delete insight')}</button>`:''}</section>`;
 };
 const createItem=actions.new;actions.new=()=>{if(ui.tab==='insights'){actions['insight-edit']({dataset:{}});return;}createItem();};
 actions['insight-edit']=element=>{
  const found=data.insights.find(x=>x.id===element.dataset.id);insightDraft=found?{...found,validationDates:[...found.validationDates]}:{id:uid(),title:'',notes:'',createdAt:Date.now(),updatedAt:Date.now(),pinned:false,validationDates:[]};
  openPanel('insight',insightDraft.id);
 };
 document.addEventListener('input',event=>{if(insightDraft&&event.target.dataset.insightField)insightDraft[event.target.dataset.insightField]=event.target.value;});
 actions['insight-save']=()=>{
  if(!insightDraft.title.trim()||insightDraft.title.length>1000||insightDraft.notes.length>20000){$('#insight-error').textContent=tr('请填写感悟（标题最多1000字）','Enter an insight (up to 1000 characters)');return;}
  const previous=data.insights;const saved={...insightDraft,title:insightDraft.title.trim(),updatedAt:Date.now()};data.insights=previous.filter(x=>x.id!==saved.id).concat(saved);
  if(!persist()){data.insights=previous;return;}panel=null;render();toast(tr('感悟已保存','Insight saved'));
 };
 actions['insight-validate']=element=>{
  const item=data.insights.find(x=>x.id===element.dataset.id);if(!item)return;item.validationDates.push(Date.now());item.updatedAt=Date.now();if(!persist()){item.validationDates.pop();return;}render();
  playMotion(document.querySelector(`[data-insight-id="${CSS.escape(item.id)}"] .insight-count`),[{opacity:.5,transform:'scale(.97)'},{opacity:1,transform:'none'}],160);
 };
 actions['insight-pin']=element=>{const item=data.insights.find(x=>x.id===element.dataset.id);if(item){item.pinned=!item.pinned;persist();render();}};
 actions['insight-sort']=()=>{data.settings.insightSort=data.settings.insightSort==='recent'?'count':'recent';persist();render();};
 actions['insight-delete']=()=>showDialog(tr('删除感悟？','Delete insight?'),`<p class="note">${tr('这条感悟及其验证记录会被删除。','This removes the insight and its validation history.')}</p>`,()=>{data.insights=data.insights.filter(x=>x.id!==insightDraft.id);persist();panel=null;render();return true;},tr('删除','Delete'),true);
 const legacySettings=settingsHTML;
 settingsHTML=()=>{
  if(panel.sub!=='root')return legacySettings();
  return pageHeader(tr('设置','Settings'))+`<div class="section-caption">${tr('显示与语言','Appearance and language')}</div><div class="setting-card"><label class="row"><span class="label">${tr('语言','Language')}</span><select data-planner-language aria-label="Language"><option value="zh" ${data.settings.language==='zh'?'selected':''}>中文</option><option value="en" ${data.settings.language==='en'?'selected':''}>English</option></select>${icon('down','chevron')}</label>${rowToggle(tr('月视图玻璃背景','Glass calendar background'),'glassCalendar',data.settings.glassCalendar,true)}${rowAction(tr('每周起始日','Week starts on'),'setting-picker',tr(data.settings.weekStart===0?'星期日':'星期一',data.settings.weekStart===0?'Sunday':'Monday'),'data-key="weekStart"')}</div><div class="section-caption">${tr('数据与提醒','Data and reminders')}</div><div class="setting-card">${rowAction(tr('完整备份与恢复','Full backup and restore'),'sync')}${rowAction(tr('闹钟与通知权限','Alarms and notifications'),'setting-page','','data-sub="reminder-type"')}${rowAction(tr('检查更新','Check for updates'),'check-update','v'+(nativeStatus.version||'1.3.0'))}</div><div class="setting-card"><div class="row"><span class="label">${tr('版本','Version')}</span><span class="value">1.3.0</span></div></div><p class="note">${tr('目标、日历和感悟在应用内即时联动。数据保存在本机，建议定期导出完整备份。','Goals, calendar and insights update together. Data stays on this device; export backups regularly.')}</p>`;
 };
 const previousPlannerPanel=panelHTML;
 panelHTML=()=>panel.type==='sync'?`<section class="page" aria-label="sync">${pageHeader(tr('备份与恢复','Backup and restore'))}<div class="setting-card">${rowAction(tr('导出完整备份','Export full backup'),'backup-export',tr('保存 JSON 文件','Save JSON file'))}${rowAction(tr('导入并合并备份','Import and merge backup'),'backup-import',tr('不清空本机数据','Keep existing data'))}</div><p class="note">${tr('备份包括目标与子目标、预估时长、日历安排、完成状态与投入时长关联、批注、感悟的验证和置顶记录，以及语言和背景设置。','Includes goals and subgoals, estimates, scheduled tasks, completion and time links, notes, insights with validation and pins, language and appearance.')}</p><p class="note">${tr('当前为应用内同步，不连接云端账号。','This version synchronizes within the app, not through a cloud account.')}</p></section>`:previousPlannerPanel();
 reminderPermissionsHTML=()=>{
  const n=nativeStatus,ready=n.native&&n.notifications&&n.exact;
  return `<section id="native-reminder-status"><div class="permission-note ${ready?'ready':''}"><strong>${n.native?tr(ready?'提醒已就绪':'需要开启系统权限',ready?'Reminders ready':'System permissions required'):tr('请安装 Android 手机版','Install the Android app')}</strong>${tr('自动提醒','Notifications')}: ${n.notifications?tr('已开启','Enabled'):tr('未开启','Off')}<br>${tr('精确闹钟','Exact alarms')}: ${n.exact?tr('已开启','Enabled'):tr('未开启','Off')}<br>${tr('全屏闹钟','Full-screen alarms')}: ${n.fullScreen?tr('已允许','Allowed'):tr('未允许','Not allowed')}<br>${tr('已安排','Scheduled')}: ${n.scheduled||0}</div>${n.native?`<div class="permission-actions">${[['notifications',tr('通知权限','Notifications')],['exact',tr('精确闹钟权限','Exact alarms')],['fullscreen',tr('全屏闹钟权限','Full-screen alarms')]].map(([key,label])=>`<button data-action="native-permission" data-permission="${key}">${label}</button>`).join('')}</div><div class="test-actions"><button data-action="test-notification" ${!n.notifications?'disabled':''}>${tr('测试通知','Test notification')}</button><button data-action="test-alarm" ${!n.notifications?'disabled':''}>${tr('测试闹钟','Test alarm')}</button></div>`:''}<p class="note">${tr('在日历安排里设置提醒提前量或开启闹钟。系统省电、强行停止应用或关机可能影响提醒。','Set a reminder offset or alarm on a scheduled task. Power saving, force-stopping or turning off the device may affect reminders.')}</p></section>`;
 };
 document.addEventListener('change',event=>{
  if(event.target.matches('[data-planner-language]')){data.settings.language=event.target.value==='en'?'en':'zh';persist();navigationHistory.clear();render();}
  if(event.target.dataset.setting==='glassCalendar')render();
 });
 todoFiltersHTML=()=>`<nav class="todo-filters" aria-label="${tr('目标状态筛选','Goal status filter')}">${[['All',tr('全部','All')],['Pending',tr('未完成','Pending')],['Completed',tr('已完成','Completed')]].map(([value,label])=>`<button data-action="todo-filter" data-todo-filter="${value}" aria-pressed="${ui.filter===value}" class="${ui.filter===value?'active':''}">${label}</button>`).join('')}</nav>`;
 // Translate fixed interface copy, never titles, notes, or user-entered option labels.
 const copyPairs=[
  ['To-dos','任务清单','Tasks'],['Events','日程','Events'],['New to-do','新建目标','New goal'],['No to-dos. Create one to get started.','还没有目标，先创建一个吧。','No goals yet. Create one to get started.'],['＋ New to-do','＋ 新建目标','＋ New goal'],
  ['Overdue','已逾期'],['Today','今天'],['Upcoming','即将到来'],['Unscheduled','未安排'],['Done','已完成','Completed'],['Cancel','取消'],['Save','保存'],['Saved','已保存'],['Completed','已完成'],['Marked as in progress','已设为未完成','Marked as pending'],['Color','颜色'],['Reminder preference saved','提醒偏好已保存'],['Edit','编辑'],['New','新建'],['Title','标题'],['Remarks','批注','Notes'],['More settings','更多设置'],['Start','开始'],['End','结束'],['All day','全天'],['Optional','可选'],
  ['More options','更多选项'],['Search events','搜索目标与日程','Search goals and events'],['Course schedule','课程表'],['Jump to','跳转日期'],['Add event with voice','语音输入'],['Subscriptions','订阅'],['Sync and import events','备份与恢复','Backup and restore'],['Settings','设置'],['Back','返回'],['Calendar views','日历视图'],['To-do options','目标选项','Goal options'],['New event or to-do','新建目标或任务','New goal or task'],
  ['Repeat','重复'],['Once','单次'],['Every day','每天'],['Every week','每周'],['Every month','每月'],['Every year','每年'],['Reminder','提醒'],['None','无'],['At time of event','开始时'],['5 minutes before','提前5分钟'],['15 minutes before','提前15分钟'],['30 minutes before','提前30分钟'],['1 day before','提前1天'],['Alarm · 闹钟','闹钟','Alarm'],['闹钟和自动提醒','闹钟与通知','Alarms and notifications'],['Notification','通知'],['Alarm','闹钟'],['Sound','声音'],['Cozy','轻柔'],
  ['所属大任务','所属大目标','Parent goal'],['独立任务','独立目标','Independent goal'],['子任务','子目标','Subgoals'],['添加子任务','添加子目标','Add subgoal'],['子任务名称','子目标名称','Subgoal title'],['移除子任务','移除子目标','Remove subgoal'],['子任务时间','子目标时间','Subgoal date and time'],['日期','日期','Date'],['时间','时间','Time'],['子任务时间','子目标时间','Subgoal time'],
  ['Hide completed','隐藏已完成'],['Show completed','显示已完成'],['Group','分组'],['Ungroup','取消分组'],['Sort by priority','按重要度排序','Sort by importance'],['Clear sorting','清除排序'],['Batch edit','批量编辑'],['Select all','全选'],['Deselect all','取消全选'],['Priority','重要度','Importance'],['High priority','高重要度','High importance'],['Delete','删除'],['Delete event','删除安排'],['Delete this event?','删除这条记录？','Delete this item?'],['此操作会删除这条日程。','此操作会删除这条记录。','This item will be removed.'],['No matching events','没有匹配的目标或安排','No matching goals or events'],
  ['周视图','周视图','Week'],['月视图','月视图','Month'],['年视图','年视图','Year'],['回到今天','回到今天','Today'],['全天','全天','All day'],['上一周','上一周','Previous week'],['下一周','下一周','Next week'],['上个月','上个月','Previous month'],['下个月','下个月','Next month'],['上一年','上一年','Previous year'],['下一年','下一年','Next year'],
  ['My calendar','我的日历'],['Filter','筛选'],['Calendar type','日历类型'],['Displayed items','显示项目'],['View','显示'],['Other','其他'],['Default','默认'],['Birthday','生日'],['Anniversary','纪念日'],['Countdown','倒计时'],['learning','学习','Learning'],['Sunday','星期日'],['Monday','星期一'],['Week starts on','每周起始日'],['OK','确定']
  ,['Start recording','开始录音'],['Type instead','手动输入'],['说出你的日程或待办事项','说出你的日程或任务','Say your event or task'],['Listening…','正在聆听…'],['Jump to date','跳转日期'],['Start date','开始日期'],['End date','结束日期'],['Start time','开始时间'],['End time','结束时间'],['Estimated hours','预估小时'],['Language','语言'],['Goal','目标'],['Sort by importance','按重要度排序'],['Clear sorting','按重要度排序','Sort by importance'],['请安装 Android 手机版','请安装 Android 手机版','Install the Android app'],['自动更新功能在 Android 手机版中提供','自动更新功能在 Android 手机版中提供','Updates are available in the Android app'],['所选待办将被删除。','所选目标将被删除。','Selected goals will be removed.']
  ,['日视图','日视图','Day'],['课表周视图','课表周视图','Week timetable']
 ];
 function fixedCopy(text){
  const cleaned=text.trim();if(!cleaned)return text;
  for(const [source,zh,en=source] of copyPairs)if(cleaned===source||cleaned===zh)return text.replace(cleaned,tr(zh,en));
  const count=cleaned.match(/^(\d+) selected$/);if(count)return tr('已选择 '+count[1]+' 项',cleaned);
  const remove=cleaned.match(/^Delete (\d+) to-dos\?$/);if(remove)return tr('删除 '+remove[1]+' 个目标？','Delete '+remove[1]+' goals?');
  return text;
 }
 const plannerToast=toast;toast=message=>plannerToast(fixedCopy(message));
 actions.sort=()=>{data.settings.sortPriority=true;persist();menu=null;render();};
 function applyPlannerLocale(){
  const language=data.settings.language;document.documentElement.lang=language==='en'?'en':'zh-CN';document.documentElement.classList.toggle('locale-en',language==='en');
  for(const scope of [$('#app'),$('#overlay')]){
   const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let node;
   while((node=walker.nextNode())){const parent=node.parentElement;if(parent?.closest('.task-title,.goal-note,.goal-origin,.focus-origin,.insight-title,.insight-notes,.time-note,.time-block strong,.timetable-event strong,.stats-goal-row>span,.stats-record-list strong,.timeline-record-list strong,.month-event-label,input,textarea,select[data-draft="goalId"],select[data-draft="parentId"] option:not([value=""])'))continue;node.nodeValue=fixedCopy(node.nodeValue);}
   for(const element of scope.querySelectorAll('[aria-label],[placeholder],[title]'))for(const attr of ['aria-label','placeholder','title']){const value=element.getAttribute(attr);if(value&&!(element.matches('[data-action="edit"],.month-event,.time-block-main')))element.setAttribute(attr,fixedCopy(value));}
  }
  for(const element of document.querySelectorAll('.dock [data-tab]'))element.textContent=({calendar:tr('日历','Calendar'),focus:tr('专注','Focus'),todos:tr('任务清单','Tasks'),insights:tr('感悟','Insights')})[element.dataset.tab];
  const control=$('.dock .round');if(control)control.dataset.action=['insights','focus'].includes(ui.tab)?'settings':'view-menu';
  const header=$('.calendar-head .month-title');if(header){const month=ui.month+'-01',title=ui.calendarView==='Year'?tr(ui.year+'年',String(ui.year)):new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{month:'long',year:'numeric'}).format(parseDate(month));header.innerHTML=esc(title)+`<small>${['Week','Timetable'].includes(ui.calendarView)?tr((ui.calendarView==='Timetable'?'课表 · ':'日视图 · ')+'第 '+weekNumber(ui.selected)+' 周',(ui.calendarView==='Timetable'?'Week overview · ':'Day · ')+weekNumber(ui.selected)):tr(ui.calendarView==='Month'?'月视图':'年视图',ui.calendarView==='Month'?'Month':'Year')}</small>`;}
  if(language==='en'){
   for(const weekdays of document.querySelectorAll('.mini-weekdays'))Array.from(weekdays.children).forEach((day,i)=>day.textContent=['S','M','T','W','T','F','S'][(i+data.settings.weekStart)%7]);
   for(const heading of document.querySelectorAll('.mini-month>strong')){const month=heading.parentElement.dataset.month;heading.textContent=new Intl.DateTimeFormat('en-US',{month:'short'}).format(parseDate(month+'-01'));}
   for(const heading of document.querySelectorAll('.month-section-title')){const month=heading.parentElement.dataset.month;heading.textContent=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(parseDate(month+'-01'));}
  }
  $('#app > .screen')?.classList.toggle('calendar-glass',ui.tab==='calendar'&&data.settings.glassCalendar);
  if(window.AndroidBridge?.setLanguage)AndroidBridge.setLanguage(language);
 }
 weekdaysHTML=()=>`<div class="weekdays">${Array.from({length:7},(_,i)=>`<span>${(data.settings.language==='en'?['S','M','T','W','T','F','S']:['日','一','二','三','四','五','六'])[(i+data.settings.weekStart)%7]}</span>`).join('')}</div>`;
 const plannerRender=render,plannerOverlay=renderOverlay;
 renderOverlay=function(){plannerOverlay();applyPlannerLocale();};
 render=function(){plannerRender();applyPlannerLocale();};
 const openMonthLayout=monthHTML;
 monthHTML=()=>{
  const template=document.createElement('template');template.innerHTML=openMonthLayout();
  for(const cell of template.content.querySelectorAll('.month-cell')){
   const items=eventsForDay(cell.dataset.date).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||(b.importance||0)-(a.importance||0));
   cell.classList.toggle('dense-day',items.length>5);
   cell.querySelector('.month-items').innerHTML=items.map(item=>{
    const time=item.allDay?tr('全天','All day'):item.time?(item.time+(item.endTime?'–'+item.endTime:'')):'';
    const color=item.importance>0?importanceColors[item.importance]:item.color||importanceColors[0];
    return `<button class="month-event ${item.done?'done':''}" data-action="edit" data-id="${esc(item.id)}" style="--event-color:${esc(color)}" aria-label="${esc(item.title)} ${esc(time)}"><span class="month-event-label">${esc(item.title)}</span>${time?`<time>${esc(time)}</time>`:''}</button>`;
   }).join('');
  }
  return template.innerHTML;
 };
 const timeAxisHTML=weekHTML;
 weekHTML=()=>{
  const template=document.createElement('template');template.innerHTML=timeAxisHTML();
  for(const block of template.content.querySelectorAll('.time-block')){
   const item=data.items.find(x=>x.id===block.dataset.id);if(!item)continue;
   const article=document.createElement('article');article.className=block.className+(item.done?' done':'');article.dataset.id=item.id;article.style.cssText=block.style.cssText;
   if(item.importance>0)article.style.setProperty('--event-color',importanceColors[item.importance]);
   article.innerHTML=`<button class="time-block-main" data-action="edit" data-id="${esc(item.id)}" aria-label="${esc(item.title)}">${block.querySelector('strong').outerHTML}${block.querySelector('small')?.outerHTML||''}${item.notes?`<span class="time-note">${esc(item.notes)}</span>`:''}</button>${item.kind==='event'?`<button class="session-check ${item.done?'checked':''}" data-action="finish-session" data-id="${esc(item.id)}" aria-label="${tr('完成任务','Complete task')} ${esc(item.title)}" aria-pressed="${!!item.done}" ${!item.done&&!GoalCore.canComplete(item)?'disabled':''} title="${tr('结束时间过后才能勾选；勾选后累计目标时长','Available after end time; credits goal time when checked')}"><span>${item.done?icon('check'):''}</span></button>`:''}`;
   block.replaceWith(article);
  }
  return template.innerHTML;
 };
 actions['finish-session']=element=>{
  const item=data.items.find(x=>x.id===element.dataset.id);if(!item||item.kind!=='event')return;
  if(!item.done&&!GoalCore.canComplete(item)){toast(tr('任务结束后才能勾选','Wait until the task ends'));return;}
  const previous={done:item.done,completedAt:item.completedAt};item.done=!item.done;
  if(item.done)item.completedAt=new Date().toISOString();else delete item.completedAt;
  if(!persist()){Object.assign(item,previous);return;}render();
  toast(item.done?tr('已完成，投入时长已同步','Completed; goal time updated'):tr('已撤销，投入时长已更新','Reopened; goal time updated'));
 };
 function refreshSessionGates(){
  if(document.hidden)return;
  for(const element of document.querySelectorAll('[data-action="finish-session"]')){const item=data.items.find(x=>x.id===element.dataset.id);if(item)element.disabled=!item.done&&!GoalCore.canComplete(item);}
 }
 setInterval(refreshSessionGates,1000);document.addEventListener('visibilitychange',refreshSessionGates);
 // Completed sessions remain visible so their credited time can be reviewed or undone.
 const calendarItemsForDay=eventsForDay;eventsForDay=date=>calendarItemsForDay(date,true);
 exportBackup=()=>{
  const json=JSON.stringify({...data,version:3,exportedAt:new Date().toISOString()},null,2);
  if(new Blob([json]).size>5000000){toast(tr('备份超过5MB，请先减少过长的批注','Backup exceeds 5 MB; shorten very long notes first'));return;}
  if(window.AndroidBridge?.exportBackup){AndroidBridge.exportBackup(json);return;}
  const link=document.createElement('a'),url=URL.createObjectURL(new Blob([json],{type:'application/json'}));link.href=url;link.download='xu-schedule-backup-'+today()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 actions['backup-export']=()=>exportBackup();
 importBackupFile=async file=>{
  if(!file)return;
  try{
   if(file.size>5000000)throw Error('Too large');const incoming=JSON.parse(await file.text());const merged=GoalCore.mergeBackup(data,incoming),previous=data;data=merged;normalizeHierarchy();
   if(!persist()){data=previous;return;}render();toast(tr('已合并恢复目标、日历、感悟和设置','Goals, calendar, insights and settings merged'));
  }catch{toast(tr('备份格式不正确，原数据未改变','Invalid backup; existing data was not changed'));}
  finally{$('#import-file').value='';}
 };
 // focus.js installs the final navigation and initializes the application.
}
