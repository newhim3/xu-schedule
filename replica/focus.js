'use strict';
(()=>{
 const t=(zh,en)=>data.settings.language==='en'?en:zh;
 const themes={lake:['雾湖','Misty lake'],dunes:['沙丘','Quiet dunes'],water:['静水','Still water']};
 const cardDensities={compact:['紧凑','Compact'],standard:['适中','Standard'],relaxed:['宽松','Roomy']};
 function goalPath(goal,includeSelf=true){const parts=[],seen=new Set();let current=includeSelf?goal:data.items.find(item=>item.id===goal?.parentId);while(current&&!seen.has(current.id)){seen.add(current.id);parts.unshift(current.title);current=data.items.find(item=>item.id===current.parentId);}return parts.join(' › ');}
 data.settings.daytimeOnly=data.settings.daytimeOnly!==false;
 data.focusSessions=Array.isArray(data.focusSessions)?data.focusSessions:[];
 data.settings.calendarBackground=Object.hasOwn(themes,data.settings.calendarBackground)?data.settings.calendarBackground:'lake';
 dockHTML=()=>`<nav class="dock planner-dock focus-dock" aria-label="${t('主导航','Main navigation')}">${btn(['focus','insights'].includes(ui.tab)?'settings':'view-menu',t('视图与设置','Views and settings'),ui.tab==='todos'?'sort':['focus','insights'].includes(ui.tab)?'settings':'grid','','round')}<div class="switcher">${[['calendar',t('日历','Calendar')],['focus',t('专注','Focus')],['todos',t('任务清单','Tasks')],['insights',t('感悟','Insights')]].map(([tab,label])=>`<button data-action="tab" data-tab="${tab}" class="${ui.tab===tab?'active':''}">${label}</button>`).join('')}</div>${btn('new',t('新建或选择','Create or select'),'plus','','round')}</nav>`;
 function deadlineHTML(item){
  const date=item.deadlineDate??item.date,time=item.deadlineTime??item.time;if(!date)return '';
  const days=Math.round((Date.parse(date+'T12:00:00+08:00')-Date.parse(today()+'T12:00:00+08:00'))/86400000);
  return `<div class="task-deadline"><time>${esc(date)}${time?' '+esc(time):''}</time>${item.showCountdown!==false?`<span class="deadline-countdown ${days<0?'overdue':''}">${days<0?t('逾期 '+(-days)+' 天',(-days)+' days overdue'):days===0?t('今天截止','Due today'):t('剩 '+days+' 天',days+' days left')}</span>`:''}</div>`;
 }
 const goalCard=taskHTML;
 taskHTML=(item,batch=false)=>{
  const template=document.createElement('template');template.innerHTML=goalCard(item,batch);
  if(item.kind==='todo'){
   if(item.showRemarks===false)template.content.querySelector('.goal-note')?.remove();
   if(item.parentId)template.content.querySelector('.task-title')?.insertAdjacentHTML('afterend',`<div class="goal-origin">${esc(goalPath(item,false))}</div>`);
   template.content.querySelector('.task-meta')?.insertAdjacentHTML('beforebegin',deadlineHTML(item));
   const main=template.content.querySelector('.task-main'),details=document.createElement('div');details.className='goal-details';
   for(const selector of ['.goal-origin','.task-meta','.task-deadline']){const field=main.querySelector(selector);if(field)details.append(field);}
   main.querySelector('.task-title').after(details);const note=main.querySelector('.goal-note');if(note)main.append(note);
  }
  return template.innerHTML;
 };
 const taskEditor=editorHTML;
 editorHTML=()=>{
  const html=taskEditor();if(draft.kind!=='todo'){
   if(!draft.taskBlock)return html;return html.replace('<p class="form-error"',alternativeOptionsHTML()+'<p class="form-error"');
  }
  const fields=`<div class="edit-card deadline-editor"><div class="field-caption">${t('截止日期 DDL（可不填）','Deadline (optional)')}</div><div class="time-fields"><label>${t('日期','Date')}<input type="date" data-draft="deadlineDate" aria-label="Deadline date" value="${esc(draft.deadlineDate??draft.date??'')}"></label><label>${t('时间（可不填）','Time (optional)')}<input type="time" data-draft="deadlineTime" aria-label="Deadline time" value="${esc(draft.deadlineTime??draft.time??'')}" ${!(draft.deadlineDate??draft.date)?'disabled':''}></label></div>${rowToggle(t('显示距截止还有几天','Show deadline countdown'),'showCountdown',draft.showCountdown!==false)}${rowToggle(t('在列表显示批注','Show remarks in list'),'showRemarks',draft.showRemarks!==false)}</div>`;
  return html.replace('<p class="form-error"',fields+'<p class="form-error"');
 };
 function planGoals(plan){return [...new Set([plan.goalId,...(plan.chooseAtStart&&Array.isArray(plan.alternativeGoalIds)?plan.alternativeGoalIds:[])])].map(id=>data.items.find(item=>item.kind==='todo'&&!item.done&&item.id===id)).filter(Boolean);}
 function alternativeOptionsHTML(){
  const selected=planGoals(draft),ids=new Set(selected.map(goal=>goal.id)),options=todoPool().filter(goal=>!goal.done&&!ids.has(goal.id));
  return `<div class="edit-card schedule-alternatives">${rowToggle(t('同一时段选择一个任务','Choose one task for this slot'),'chooseAtStart',draft.chooseAtStart)}${draft.chooseAtStart?`<p class="note">${t('开始专注时选择其中一项，只记录实际执行的目标。','Choose when starting; only the performed goal earns time.')}</p><div class="alternative-list">${selected.map(goal=>`<div><span>${esc(goalPath(goal))}</span>${goal.id!==draft.goalId?`<button data-action="alternative-remove" data-id="${esc(goal.id)}" aria-label="${t('移除备选','Remove alternative')}">${icon('close')}</button>`:`<small>${t('首选','Primary')}</small>`}</div>`).join('')}</div><label class="row"><span class="label">${t('添加备选任务','Add an alternative')}</span><select data-draft="alternativeGoalId" aria-label="${t('添加备选任务','Add an alternative')}"><option value="">${t('选择目标','Choose goal')}</option>${options.map(goal=>`<option value="${esc(goal.id)}">${esc(goal.title)}</option>`).join('')}</select></label>`:''}</div>`;
 }
 actions['alternative-remove']=element=>{draft.alternativeGoalIds=(draft.alternativeGoalIds||[]).filter(id=>id!==element.dataset.id);renderOverlay();};
 document.addEventListener('change',event=>{
  const key=event.target.dataset.draft;
  if(key==='alternativeGoalId'&&event.target.value){draft.alternativeGoalIds=[...new Set([...(draft.alternativeGoalIds||[]),event.target.value])];delete draft.alternativeGoalId;renderOverlay();}
  if(key==='chooseAtStart')renderOverlay();
 });
 const editItem=openEditor;
 let scheduleEditorDay=null,scheduleMemoryTimer=null;
 function rememberScheduleEditor(){
  if(panel?.type!=='editor'||draft?.kind!=='event'||scheduleEditorDay!==today())return;
  const copy=JSON.parse(JSON.stringify(draft)),existing=data.items.find(item=>item.id===copy.id);
  delete copy.id;delete copy.focusActual;delete copy.actualStartAt;delete copy.actualEndAt;delete copy.planOriginal;delete copy.focusCoveredBy;
  data.settings.scheduleEditorMemory={savedOn:today(),sourceId:existing?.id||null,draft:copy};persist();
 }
 openEditor=id=>{
  clearTimeout(scheduleMemoryTimer);rememberScheduleEditor();
  editItem(id);
  scheduleEditorDay=today();
  if(draft.kind==='todo'){draft.deadlineDate=draft.deadlineDate??draft.date??'';draft.deadlineTime=draft.deadlineTime??draft.time??'';draft.showCountdown=draft.showCountdown!==false;draft.showRemarks=draft.showRemarks!==false;}
  else if(!data.items.some(item=>item.id===draft.id)){
   const rounded=FocusCore.parts(Math.ceil(Date.now()/300000)*300000);
   if(draft.date===today()&&rounded.date!==today())draft.date=rounded.date;
   draft.time=rounded.time;draft.endTime=rounded.time;draft.endDate=draft.date;
   const cursor=data.settings.scheduleCursor,memory=data.settings.scheduleEditorMemory;
   if(cursor?.savedOn===today()&&cursor.date===draft.date&&/^([01]\d|2[0-3]):[0-5]\d$/.test(cursor.time)){draft.time=cursor.time;draft.endTime=cursor.time;draft.endDate=cursor.date;}
   if(memory?.savedOn===today()&&memory.draft?.kind==='event'&&memory.draft.date===draft.date&&typeof memory.draft.title==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(memory.draft.time)){
    const id=draft.id,copy={...memory.draft};if(memory.sourceId){copy.title='';copy.notes='';copy.done=false;copy.blank=false;}
    actions['editor-kind']({dataset:{kind:copy.taskBlock?'todo':'event'}});Object.assign(draft,copy,{id});
    if(draft.goalId&&!data.items.some(goal=>goal.kind==='todo'&&!goal.done&&goal.id===draft.goalId))draft.goalId='';
    draft.alternativeGoalIds=(draft.alternativeGoalIds||[]).filter(id=>data.items.some(goal=>goal.kind==='todo'&&!goal.done&&goal.id===id));
   }
  }
  const memory=data.settings.scheduleEditorMemory;
  if(id&&memory?.savedOn===today()&&memory.sourceId===id&&memory.draft?.kind==='event'&&typeof memory.draft.title==='string'){
   actions['editor-kind']({dataset:{kind:memory.draft.taskBlock?'todo':'event'}});Object.assign(draft,memory.draft,{id});
  }
  renderOverlay();
 };
 const closeScheduleEditor=closePage;closePage=()=>{clearTimeout(scheduleMemoryTimer);rememberScheduleEditor();closeScheduleEditor();};
 const queueScheduleMemory=event=>{if(panel?.type==='editor'&&draft?.kind==='event'&&(event.target.id==='title'||event.target.dataset.draft)){clearTimeout(scheduleMemoryTimer);scheduleMemoryTimer=setTimeout(rememberScheduleEditor,200);}};
 document.addEventListener('input',queueScheduleMemory);document.addEventListener('change',queueScheduleMemory);
 window.addEventListener('pagehide',rememberScheduleEditor);document.addEventListener('visibilitychange',()=>{if(document.hidden)rememberScheduleEditor();});
 function alignScheduleEnd(event){
  if(!draft||draft.kind!=='event'||!['time','date'].includes(event.target.dataset.draft))return;
  draft.endTime=draft.time;draft.endDate=draft.date;
  for(const key of ['endTime','endDate']){const input=document.querySelector(`[data-draft="${key}"]`);if(input)input.value=draft[key]||'';}
 }
 document.addEventListener('input',alignScheduleEnd);document.addEventListener('change',alignScheduleEnd);
 document.addEventListener('change',event=>{if(event.target.dataset.draft==='deadlineDate'){const field=document.querySelector('[data-draft="deadlineTime"]');if(field){field.disabled=!draft.deadlineDate;if(!draft.deadlineDate){draft.deadlineTime='';field.value='';}}}});
 const saveItem=saveDraft;
 saveDraft=()=>{
  if(draft.kind==='event')for(const key of ['trigger','triggeredBy','scheduleMode','triggerType','triggerLabel','triggerGoalId','triggerMinutes'])delete draft[key];
  if(draft.kind==='event'&&draft.taskBlock&&draft.chooseAtStart&&planGoals(draft).length<2){$('#form-error').textContent=t('请选择首选目标和至少一个备选目标','Choose a primary goal and at least one alternative');return;}
  if(draft.kind==='event'){draft.alternativeGoalIds=draft.chooseAtStart?planGoals(draft).filter(goal=>goal.id!==draft.goalId).map(goal=>goal.id):[];delete draft.alternativeGoalId;}
  const cursor=data.settings.scheduleCursor,memory=data.settings.scheduleEditorMemory;
  const advance=draft.kind==='event'&&GoalCore.durationMinutes(draft)>0;
  if(advance)data.settings.scheduleCursor={savedOn:today(),date:draft.endDate||draft.date,time:draft.endTime};
  if(draft.kind==='event'){clearTimeout(scheduleMemoryTimer);delete data.settings.scheduleEditorMemory;}
  if(draft.kind==='todo'){draft.date=draft.deadlineDate||'';draft.time=draft.deadlineTime||'';draft.endDate=draft.date;draft.endTime=draft.time;}
  if(draft.title.trim())draft.blank=false;saveItem();
  if(panel&&advance)data.settings.scheduleCursor=cursor;
  if(panel&&draft.kind==='event')data.settings.scheduleEditorMemory=memory;
 };actions.save=()=>saveDraft();
 const ordinaryCalendar=calendarHTML;
 calendarHTML=()=>{
  if(ui.tab==='focus')return focusHTML();const html=ordinaryCalendar();
  if(ui.tab!=='calendar'||!['Timetable','Month','Year','Dashboard'].includes(ui.calendarView))return html;
  const template=document.createElement('template');template.innerHTML=html;
  if(ui.calendarView==='Dashboard')template.content.querySelector('.calendar-stage').innerHTML=statisticsHTML();
  else if(ui.calendarView==='Timetable')template.content.querySelector('.calendar-stage').innerHTML=timetableHTML();
  else addCalendarHeat(template.content);return template.innerHTML;
 };
 const statTime=minutes=>{const value=Math.floor(minutes),hours=Math.floor(value/60),rest=value%60;return hours?hours+'h'+(rest?rest+'m':''):value+'m';};
 function selectedStatistics(){return FocusCore.statistics(data.items,data.focusSessions,ui.selected,Date.now());}
 function statisticsHTML(){
  const stats=selectedStatistics(),day=ui.selected,month=day.slice(0,7),days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate(),maxDaily=Math.max(1,...Array.from({length:days},(_,i)=>stats.daily[month+'-'+String(i+1).padStart(2,'0')]||0)),colors=['#8cbfae','#cc94a5','#92aed4','#c4b17c','#aaa1ce'];
  let angle=0;const slices=stats.goals.map((goal,index)=>{const start=angle;angle+=goal.minutes/stats.minutes*360;return colors[index%colors.length]+' '+start+'deg '+angle+'deg';});
  const goalRows=stats.goals.map((goal,index)=>{const item=data.items.find(item=>item.id===goal.goalId);return `<div class="stats-goal-row"><i style="background:${colors[index%colors.length]}"></i><span>${esc(item?goalPath(item):goal.title)}<small>${statTime(goal.minutes)}</small></span><b>${(goal.minutes/stats.minutes*100).toFixed(1)}%</b></div>`;}).join('');
  const metric=(label,value,key)=>`<div><small>${label}</small><strong ${key?`data-stat="${key}"`:''}>${value}</strong></div>`;
  return `<div class="statistics-board"><section class="stats-card"><h2>${t('累计专注','All-time focus')}</h2><div class="stats-metrics">${metric(t('次数','Sessions'),stats.totalCount)}${metric(t('总时长','Total'),statTime(stats.totalMinutes))}${metric(t('有专注日均','Per active day'),statTime(stats.activeDays?stats.totalMinutes/stats.activeDays:0))}</div></section><section class="stats-card"><header><h2>${t('当日专注','Daily focus')}</h2><div class="stats-date-controls"><button data-action="stats-prev" aria-label="${t('前一天','Previous day')}">${icon('back')}</button><input id="stats-date" type="date" aria-label="${t('统计日期','Statistics date')}" value="${day}"><button data-action="stats-next" aria-label="${t('后一天','Next day')}">${icon('next')}</button></div></header><div class="stats-metrics day-metrics">${metric(t('次数','Sessions'),stats.count,'day-count')}${metric(t('实际时长','Actual time'),statTime(stats.minutes),'day-minutes')}</div></section><section class="stats-card"><h2>${t('当日目标时长分布','Time by goal')}</h2>${stats.minutes?`<div class="stats-donut" role="img" aria-label="${t('目标时长占比','Focus share by goal')}" style="background:conic-gradient(${slices.join(',')})"><div><strong>${statTime(stats.minutes)}</strong><small>${t('实际专注','Actual focus')}</small></div></div><div class="stats-goals">${goalRows}</div>`:`<p class="stats-empty">${t('当天暂无专注记录，开始一次专注后会自动统计。','No focus yet. Start a session to see your statistics.')}</p>`}<button class="stats-records-button" data-action="stats-records">${t('查看专注记录','View focus records')}</button></section><section class="stats-card"><h2>${t('当日专注时段','Focus by hour')}</h2><div class="stats-hours" role="img" aria-label="${t('各小时实际专注分钟数','Actual focus minutes per hour')}">${stats.hourly.map((minutes,hour)=>`<span class="stats-hour" title="${hour}:00 · ${statTime(minutes)}"><i style="height:${minutes/60*100}%"></i><small>${hour%6===0?hour:''}</small></span>`).join('')}</div><p class="stats-note">${t('0—23 时 · 暂停不计入时长','00–23h · pauses excluded')}</p></section><section class="stats-card"><h2>${month} · ${t('月度专注趋势','Monthly focus trend')}</h2><div class="stats-trend" role="img" aria-label="${month} ${t('每日专注时长','daily focus')}">${Array.from({length:days},(_,index)=>{const date=month+'-'+String(index+1).padStart(2,'0'),minutes=stats.daily[date]||0;return `<span class="stats-trend-point ${date===day?'selected':''}" title="${date} · ${statTime(minutes)}"><i style="height:${minutes/maxDaily*100}%"></i><small>${index%7===0||index===days-1?index+1:''}</small></span>`;}).join('')}</div><p class="stats-note">${t('按实际专注统计，不含仅安排未执行的计划','Actual focus only; unperformed plans are excluded')}</p></section></div>`;
 }
 actions.dashboard=()=>{menu=null;ui.calendarView='Dashboard';calendarMotion={kind:'day'};render();};
 function moveStatistics(delta){ui.selected=addDays(ui.selected,delta);ui.month=ui.selected.slice(0,7);calendarMotion={kind:'day'};render();}
 actions['stats-prev']=()=>moveStatistics(-1);actions['stats-next']=()=>moveStatistics(1);
 for(const [action,delta] of [['month-prev',-1],['month-next',1]]){const original=actions[action];actions[action]=()=>ui.calendarView==='Dashboard'&&ui.tab==='calendar'?moveStatistics(delta):original();}
 document.addEventListener('change',event=>{if(event.target.id==='stats-date'&&/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)){ui.selected=event.target.value;ui.month=ui.selected.slice(0,7);render();}});
 actions['stats-records']=()=>{const stats=selectedStatistics();showDialog(ui.selected+' · '+t('专注记录','Focus records'),`<div class="stats-record-list">${stats.records.map(record=>{const goal=data.items.find(item=>item.id===record.goalId);return `<div><strong>${esc(goal?goalPath(goal):record.title||t('专注','Focus'))}</strong><small>${FocusCore.parts(record.start).time}–${record.end===FocusCore.stamp(ui.selected,'00:00')+86400000?'24:00':FocusCore.parts(record.end).time} · ${statTime((record.end-record.start)/60000)}</small></div>`;}).join('')||`<p class="note">${t('当天暂无专注记录','No focus records for this day')}</p>`}</div>`,()=>true,t('关闭','Close'));};
 function heatLevel(minutes){return !minutes?0:minutes<60?1:minutes<120?2:minutes<180?3:minutes<240?4:5;}
 function addCalendarHeat(content){
  const totals=FocusCore.dailyActual(data.items,data.focusSessions,Date.now()),year=ui.calendarView==='Year';
  const legend=`<div class="heat-legend"><span>${t('少','Less')}</span><span class="heat-scale" aria-hidden="true">${Array.from({length:6},(_,level)=>`<i data-heat="${level}"></i>`).join('')}</span><span>${t('多','More')}</span><small>${t('实际专注时长 · 不含暂停','Actual focus · pauses excluded')}</small></div>`;
  if(year){
   for(const month of content.querySelectorAll('.mini-month')){
    const key=month.dataset.month;month.classList.add('has-heat');
    for(const number of month.querySelectorAll('.mini-number')){const date=key+'-'+number.textContent.padStart(2,'0'),minutes=totals[date]||0;number.dataset.date=date;number.dataset.heat=heatLevel(minutes);}
   }
  }else for(const cell of content.querySelectorAll('.month-cell')){
   const minutes=totals[cell.dataset.date]||0,button=cell.querySelector('.month-date');cell.dataset.heat=heatLevel(minutes);button.classList.add('has-heat');button.dataset.heat=heatLevel(minutes);
  }
  (content.querySelector('.month-scroll')||content.querySelector('.calendar-stage')).insertAdjacentHTML('beforeend',legend);
 }
 function timetableHTML(){
  const dates=Array.from({length:7},(_,i)=>addDays(weekStart(ui.selected),i)),axis={start:360,end:1380,hourHeight:72,height:1224},y=minute=>(minute-360)*72/60,outside=[];
  const columns=dates.map(date=>{const all=timedSegments(date);outside.push(...all.filter(({start,end})=>end<=axis.start||start>=axis.end).map(({item})=>item));const segments=all.filter(({start,end})=>Math.min(end,axis.end)-Math.max(start,axis.start)>=30),shadowed=segments.some(({item})=>item.focusCoveredBy?.length&&!item.renderRemainder);
   const foreground=segments.filter(({item})=>!item.focusCoveredBy?.length||item.renderRemainder||item.focusActual);let group=[],groupEnd=-1;
   const arrangeGroup=()=>{const ends=[];for(const part of group){let lane=ends.findIndex(end=>end<=part.start);if(lane<0)lane=ends.length;ends[lane]=part.end;part.lane=lane;}for(const part of group){part.lanes=ends.length;const overlaps=group.filter(other=>other!==part&&other.start<part.end&&other.end>part.start);let span=1;while(part.lane+span<part.lanes&&!overlaps.some(other=>other.lane===part.lane+span))span++;part.span=span;}group=[];};
   for(const part of foreground){if(part.start>=groupEnd){arrangeGroup();groupEnd=-1;}group.push(part);groupEnd=Math.max(groupEnd,part.end);}arrangeGroup();
   return `<div class="timetable-day" data-date="${date}">${segments.map(({item,start,end,lane,lanes,span=1})=>{
    const shadow=item.focusCoveredBy?.length&&!item.renderRemainder,actual=item.focusActual,title=item.title||t('空白任务','Blank task'),top=y(Math.max(start,axis.start)),height=y(Math.min(end,axis.end))-top;
    const offset=shadowed?10:0,space=100-offset,left=shadow?0:offset+lane/lanes*space,width=shadow?8:span/lanes*space,showTime=height>=90&&width>45;
    return `<button class="timetable-event  ${shadow?'plan-shadow':''} ${actual?'focus-actual':''} ${item.renderRemainder?'plan-remainder':''} ${item.samePlanOverlay?'same-plan-overlay':''}" data-action="edit" data-id="${esc(item.id)}" aria-label="${esc(title)} ${item.time}–${item.endTime}" style="top:${top}px;height:${height}px;left:${left}%;width:${width}%;--label-lines:${Math.max(1,Math.floor((height-(showTime?34:10))/17))};--event-color:${esc(item.color||'#5ba6a0')}"><strong>${esc(title)}</strong>${showTime?`<small>${esc(item.time)}<br>${esc(item.endTime||'')}</small>`:''}</button>`;
   }).join('')}</div>`;
  }).join('');
  return `${weekdaysHTML()}<div class="week-strip timetable-strip">${dates.map(date=>`<button class="day ${date===today()?'today':''}" data-action="day" data-date="${date}" aria-label="${date}">${dayNumber(date)}</button>`).join('')}</div><div class="timetable-records">${dates.map(date=>`<button data-action="timetable-records" data-date="${date}" aria-label="${date} ${t('完整记录','All records')}">${timedSegments(date).length}${t('条',' items')}${timedSegments(date).some(part=>part.end>360&&part.start<1380&&Math.min(part.end,1380)-Math.max(part.start,360)<30)?`<small>${t('含短安排','Includes short records')}</small>`:''}</button>`).join('')}</div><div class="timetable-scroll"><div class="timetable-canvas" data-start="360" data-end="1380" data-hour-height="72" style="height:${axis.height}px;--axis-hour:${axis.hourHeight}px"><div class="timetable-axis">${Array.from({length:(axis.end-axis.start)/60+1},(_,index)=>{const minute=axis.start+index*60;return `<span style="top:${y(minute)}px">${String(minute/60).padStart(2,'0')}:00</span>`;}).join('')}</div>${columns}</div></div><p class="timetable-caption">${t('06:00–23:00 · 短于30分钟的安排收纳在每日条数中','06:00–23:00 · schedules under 30 min are collected in daily records')}</p>`;
 }
 actions['timetable-records']=element=>{const date=element.dataset.date,records=timedSegments(date);showDialog(date+' · '+t('完整记录','All records'),`<div class="timeline-record-list">${records.map(({item})=>`<button data-action="edit" data-id="${esc(item.id)}"><strong>${esc(item.title||t('空白任务','Blank task'))}</strong><small>${esc(item.time)}–${esc(item.endTime||'')} · ${item.focusActual?t('实际专注','Actual focus'):t('计划安排','Plan')}</small></button>`).join('')||`<p class="note">${t('当天没有记录','No records for this day')}</p>`}</div>`,()=>true,t('关闭','Close'));};
 ui.focusMode='planned';ui.focusGoal=null;ui.focusPlan=null;
 function currentFocus(){return data.focusSessions.filter(session=>session.status!=='finished').sort((a,b)=>b.startedAt-a.startedAt)[0]||null;}
 function timerText(milliseconds){const seconds=Math.floor(Math.max(0,milliseconds)/1000);return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');}
 function plannedItems(){return data.items.filter(item=>item.kind==='event'&&item.taskBlock&&!item.focusActual&&item.date===today()&&data.items.some(goal=>goal.id===item.goalId&&goal.kind==='todo')).sort((a,b)=>(a.time||'').localeCompare(b.time||''));}
 function selectedFocus(){const plan=ui.focusMode==='planned'?data.items.find(item=>item.id===ui.focusPlan):null;const goals=plan?planGoals(plan):[],goal=plan?.chooseAtStart?goals.find(goal=>goal.id===ui.focusPlanGoal):data.items.find(item=>item.kind==='todo'&&item.id===(plan?.goalId||ui.focusGoal));return {plan,goal,ready:!!goal&&(ui.focusMode==='free'||!!plan&&FocusCore.available(plan,Date.now()))};}
 const focusCollapsed=new Set();
 function focusGoalList(){
  const goals=todoPool().filter(goal=>!goal.done),ids=new Set(goals.map(goal=>goal.id));
  function family(goal,seen=new Set()){
   if(seen.has(goal.id))return '';const next=new Set([...seen,goal.id]),children=goals.filter(child=>child.parentId===goal.id),collapsed=focusCollapsed.has(goal.id);
   const template=document.createElement('template');template.innerHTML=taskHTML(goal);const card=template.content.firstElementChild;card.classList.toggle('focus-selected',goal.id===ui.focusGoal);card.querySelector('.task-fold')?.remove();for(const control of card.querySelectorAll('[data-action]')){control.dataset.action='focus-select-goal';control.dataset.id=goal.id;control.setAttribute('aria-pressed',String(goal.id===ui.focusGoal));}
   return `<section class="focus-goal-family" data-parent="${esc(goal.id)}"><div class="focus-family-heading">${card.outerHTML}${children.length?`<button class="family-fold" data-action="focus-tree-fold" data-id="${esc(goal.id)}" aria-expanded="${!collapsed}" aria-label="${t('展开子目标','Expand subgoals')} ${esc(goal.title)}">${icon(collapsed?'next':'down')}</button>`:''}</div>${children.length&&!collapsed?`<div class="focus-goal-children">${children.map(child=>family(child,next)).join('')}</div>`:''}</section>`;
  }
  return goals.filter(goal=>!goal.parentId||!ids.has(goal.parentId)).map(goal=>family(goal)).join('')||`<p class="note">${t('先在任务清单创建一个目标','Create a goal in Tasks first')}</p>`;
 }
 actions['focus-tree-fold']=element=>{const id=element.dataset.id;focusCollapsed.has(id)?focusCollapsed.delete(id):focusCollapsed.add(id);render();};
 function focusHTML(){
  const html=focusBaseHTML(),selected=selectedFocus(),template=document.createElement('template');template.innerHTML=html;const recent=data.focusSessions.filter(session=>session.status==='finished').slice(-5).reverse();template.content.querySelectorAll('.focus-history>div').forEach((row,index)=>{if(recent[index])row.insertAdjacentHTML('beforeend',`<button class="focus-correct" data-action="focus-correct-session" data-id="${esc(recent[index].id)}">${t('修正','Correct')}</button>`);});
  for(const button of template.content.querySelectorAll('.focus-plan')){const plan=data.items.find(item=>item.id===button.dataset.id);if(plan?.chooseAtStart)button.querySelector('strong').insertAdjacentHTML('afterend',`<small>${t('备选任务','Alternatives')} · ${planGoals(plan).length}</small>`);}
  if(!currentFocus()&&selected.plan?.chooseAtStart){
   const list=planGoals(selected.plan).map(goal=>`<button class="choice-option ${goal.id===ui.focusPlanGoal?'is-selected':''}" data-action="focus-plan-goal" data-id="${esc(goal.id)}" aria-pressed="${goal.id===ui.focusPlanGoal}"><span class="choice-copy">${esc(goalPath(goal))}</span><span class="choice-radio">${goal.id===ui.focusPlanGoal?icon('check'):''}</span></button>`).join('');
   template.content.querySelector('.focus-timer').insertAdjacentHTML('afterend',`<section class="focus-slot-options"><h3>${t('这个时段做哪一项？','Which task for this slot?')}</h3>${list}</section>`);
  }
  return template.innerHTML;
 }
 function focusBaseHTML(){
  const active=currentFocus(),selected=selectedFocus(),mode=ui.focusMode,plans=plannedItems();
  const choices=mode==='planned'?plans.map(item=>`<button class="focus-plan ${item.id===ui.focusPlan?'selected':''} ${FocusCore.available(item,Date.now())?'':'locked'}" data-action="focus-select-plan" data-id="${esc(item.id)}" aria-pressed="${item.id===ui.focusPlan}"><span><strong>${esc(item.title)}</strong><span class="goal-origin">${esc(goalPath(data.items.find(goal=>goal.id===item.goalId)))}</span><small>${esc(item.time)}–${esc(item.endTime)} · ${FocusCore.available(item,Date.now())?t('现在可开始','Available now'):Date.now()<FocusCore.range(item)[0]?t('未到开始时间','Not started yet'):t('已过计划时段','Window ended')}</small></span>${icon(item.id===ui.focusPlan?'check':'clock')}</button>`).join('')||`<p class="note">${t('今天还没有关联目标的安排。可去日历新建，或自由选择目标。','No linked plans today. Schedule one or choose freely.')}</p>`:focusGoalList();
  const status=active?({running:t('专注中','Focusing'),paused:t('已暂停 · 不计时','Paused · not counting'),boundary:t('计划时段已结束','Planned period complete')})[active.status]:t('准备开始','Ready');
  const activeGoal=active?data.items.find(item=>item.id===active.goalId):null;
  return `<header class="header"><h1>${t('专注','Focus')}</h1>${btn('settings',t('设置','Settings'),'settings')}</header><section class="focus-timer ${active?.status==='running'?'is-running':''}"><p class="focus-state">${status}</p><h2>${esc(activeGoal?.title||active?.goalTitle||selected.goal?.title||t('选择今天要做的事','Choose what matters now'))}</h2><output class="focus-clock" aria-label="${t('专注时长','Focus duration')}">${timerText(active?FocusCore.elapsed(active,Date.now()):0)}</output>${active?.deadline?`<p class="focus-until">${t('计划结束','Planned end')} ${FocusCore.parts(active.deadline).time}${active.extended?' · '+t('正在续计','Continuing'):''}</p>`:''}<div class="focus-controls">${!active?`<button class="focus-primary" data-action="focus-start" ${!selected.ready?'disabled':''}>${t('开始专注','Start focus')}</button>`:active.status==='running'?`<button data-action="focus-pause">${t('暂停','Pause')}</button><button data-action="focus-finish-options">${t('结束','Finish')}</button>`:active.status==='paused'?`<button class="focus-primary" data-action="focus-resume">${t('继续','Resume')}</button><button data-action="focus-finish-options">${t('结束','Finish')}</button>`:`<button class="focus-primary" data-action="focus-extend">${t('继续专注','Keep focusing')}</button><button data-action="focus-finish-options">${t('完成本次','Finish session')}</button>`}</div>${active?.status==='boundary'?`<p class="note">${t('计划段已经停止计时。若刚才一直在继续做，选择继续专注，将从原结束时间无缝续计。','The planned segment has stopped. If you kept working, continue to count from the scheduled end.')}</p>`:''}<p class="focus-error" role="status"></p></section>${active?`<p class="focus-explanation">${t('当前专注已自动保存。暂停不计时；结束后同步任务清单和日历。先结束本次，再切换目标。','Focus is saved automatically. Pauses do not count. Finish before switching goals.')}</p>`:`<div class="focus-mode"><button data-action="focus-mode" data-mode="planned" class="${mode==='planned'?'active':''}">${t('按今日日历','Today’s plan')}</button><button data-action="focus-mode" data-mode="free" class="${mode==='free'?'active':''}">${t('自由选择目标','Choose a goal')}</button></div><div class="focus-picker">${choices}</div>`}<div class="focus-history"><h3>${t('最近专注','Recent sessions')}</h3>${data.focusSessions.filter(session=>session.status==='finished').slice(-5).reverse().map(session=>`<div><span>${esc(data.items.find(goal=>goal.id===session.goalId)?.title||session.goalTitle)}</span><time>${timerText(FocusCore.elapsed(session,Date.now()))}</time></div>`).join('')||`<p class="note">${t('每次专注，都会留下实际投入记录','Each session leaves a record of real effort')}</p>`}</div>`;
 }
 function commitSession(session,now=Date.now()){
  const previousItems=data.items,previousSessions=data.focusSessions;
  data.focusSessions=data.focusSessions.filter(item=>item.id!==session.id).concat(session);
  const snapshot=JSON.parse(JSON.stringify(session));for(const part of snapshot.segments)if(part.end===null)part.end=now;
  data.items=FocusCore.project(data.items,snapshot);
  if(!persist()){data.items=previousItems;data.focusSessions=previousSessions;return false;}return true;
 }
 actions['focus-mode']=element=>{ui.focusMode=element.dataset.mode==='free'?'free':'planned';render();};
 actions['focus-select-plan']=element=>{ui.focusPlan=element.dataset.id;ui.focusPlanGoal=null;render();};
 actions['focus-plan-goal']=element=>{const plan=data.items.find(item=>item.id===ui.focusPlan);if(plan&&planGoals(plan).some(goal=>goal.id===element.dataset.id)){ui.focusPlanGoal=element.dataset.id;render();}};
 actions['focus-select-goal']=element=>{ui.focusGoal=element.dataset.id;render();};
 actions['focus-start']=()=>{
  const selected=selectedFocus();if(currentFocus()||!selected.ready){toast(t('请在可用时段选择目标','Choose an available goal and time'));return;}
  const session=FocusCore.start({id:uid(),goalId:selected.goal.id,goalTitle:selected.goal.title,color:selected.goal.color,plan:selected.plan},Date.now());
  if(!selected.plan)session.planId=FocusCore.nearbyPlan(data.items,selected.goal.id,Date.now())?.id||null;
  if(commitSession(session)){render();}
 };
 for(const [action,method] of [['focus-pause','pause'],['focus-resume','resume'],['focus-extend','extend'],['focus-finish','finish']])actions[action]=()=>{const active=currentFocus();if(active&&commitSession(FocusCore[method](active,Date.now())))render();};
 function finishFocusDialog(session){
  if(!session)return;const seconds=Math.floor(FocusCore.elapsed(session,Date.now())/1000);
  showDialog(t('确认本次专注时长','Confirm focus duration'),'<p class="note">'+t('忘记结束计时？可按实际情况修正；暂停空隙仍保留，日历和统计同步更新。','Forgot to stop? Correct your actual duration. Pauses, calendar and statistics stay in sync.')+'</p><label class="focus-duration-choice"><input type="radio" name="focus-duration" value="auto" checked>'+t('沿用当前计时','Use recorded duration')+' · '+timerText(seconds*1000)+'</label><label class="focus-duration-choice"><input type="radio" name="focus-duration" value="manual">'+t('手动设置实际时长','Set actual duration')+'</label><div class="focus-duration-inputs">'+[['hours',Math.floor(seconds/3600),t('小时','h')],['minutes',Math.floor(seconds/60)%60,t('分钟','m')],['seconds',seconds%60,t('秒','s')]].map(([key,value,label])=>'<label><input type="number" min="0" max="'+(key==='hours'?9999:59)+'" step="1" id="focus-adjust-'+key+'" value="'+value+'" aria-label="'+label+'">'+label+'</label>').join('')+'</div><p class="focus-adjust-error form-error" role="status"></p>',()=>{
   const current=data.focusSessions.find(item=>item.id===session.id);if(!current)return false;
   let completed;try{if(document.querySelector('[name="focus-duration"]:checked').value==='manual'){const values=['hours','minutes','seconds'].map(key=>Number(document.querySelector('#focus-adjust-'+key).value));if(values.some(value=>!Number.isSafeInteger(value)||value<0)||values[1]>59||values[2]>59)throw Error('Invalid');completed=FocusCore.finishWithDuration(current,(values[0]*3600+values[1]*60+values[2])*1000,Date.now());}else completed=FocusCore.finish(current,Date.now());}
   catch{document.querySelector('.focus-adjust-error').textContent=t('请输入有效时长，且不超过本次已计时长度。','Enter a valid duration no longer than the recorded time.');return false;}
   return commitSession(completed);
  },t('确认结束并保存','Finish and save'));
 }
 actions['focus-finish-options']=()=>finishFocusDialog(currentFocus());
 actions['focus-correct-session']=element=>finishFocusDialog(data.focusSessions.find(session=>session.id===element.dataset.id));
 const createFromFocus=actions.new;actions.new=()=>{if(ui.tab==='focus'){ui.focusMode='free';render();}else createFromFocus();};
 let lastFocusCheckpoint=0;
 function refreshFocus(){
  const active=currentFocus();if(!active)return;
  const now=Date.now(),reconciled=FocusCore.reconcile(active,now),changed=reconciled.status!==active.status;
  if(changed||now-lastFocusCheckpoint>=60000){if(commitSession(reconciled,now)){lastFocusCheckpoint=now;if(changed||ui.tab==='calendar'&&ui.calendarView==='Dashboard'){const top=scrollY;render();scrollTo(0,top);return;}}}
  const clock=document.querySelector('.focus-clock');if(clock)clock.textContent=timerText(FocusCore.elapsed(reconciled,now));
 }
 setInterval(()=>{if(document.hidden)return;refreshFocus();updateClockNeedle();const start=document.querySelector('[data-action="focus-start"]');if(start)start.disabled=!selectedFocus().ready;},1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFocus();});
 const nativeNavigation=actions.tab;actions.tab=element=>{refreshFocus();nativeNavigation(element);};
 let renderingDayTimeline=false;
 const originalSegments=timedSegments;
 timedSegments=date=>{
  const items=data.items;try{data.items=renderingDayTimeline?FocusCore.timelineItems(items):FocusCore.calendarItems(items);return originalSegments(date);}finally{data.items=items;}
 };
 const dayTimeline=weekHTML;
 weekHTML=()=>{
  if(data.settings.dayDisplay==='clock'&&ui.calendarView==='Week')return clockDayHTML();
  const template=document.createElement('template');let visualSegments;
  renderingDayTimeline=true;
  try{template.innerHTML=dayTimeline();visualSegments=timedSegments(ui.selected);}finally{renderingDayTimeline=false;}
  for(const block of template.content.querySelectorAll('.time-block')){
   const source=data.items.find(record=>record.id===block.dataset.id);if(!source)continue;
   const segment=visualSegments.find(part=>part.item.id===source.id&&Math.abs(dayY(Math.max(part.start,dayAxis().start))-parseFloat(block.style.top))<.1),item=segment?.item||source;
   block.dataset.start=segment?.start;block.dataset.end=segment?.end;
   const main=block.querySelector('.time-block-main');
   const linkedGoal=data.items.find(goal=>goal.id===item.goalId);
   if(linkedGoal?.parentId)block.querySelector('strong').textContent=goalPath(linkedGoal);
   if(item.renderRemainder)block.classList.add('plan-remainder');
   if(item.samePlanOverlay)block.classList.add('same-plan-overlay');
   if(item.focusActual){block.classList.add('focus-actual');block.classList.remove('done');block.querySelector('.session-check')?.remove();}
   if(item.focusCoveredBy?.length&&!item.renderRemainder){block.classList.add('plan-shadow');block.querySelector('.session-check')?.remove();}
   const actuals=item.timelineActualRanges||[];
   if(actuals.length){
    block.classList.add('has-actual');
    const from=Math.max(segment.start,dayAxis().start),to=Math.min(segment.end,dayAxis().end);
    block.insertAdjacentHTML('afterbegin','<div class="timeline-execution" aria-hidden="true">'+actuals.map(([start,end])=>{
     const a=FocusCore.parts(start),b=FocusCore.parts(end),lo=a.date<ui.selected?0:minuteOf(a.time),hi=b.date>ui.selected?1440:minuteOf(b.time);
     const top=Math.max(from,lo),bottom=Math.min(to,hi);return bottom>top?'<i style="top:'+((top-from)/(to-from)*100)+'%;height:'+((bottom-top)/(to-from)*100)+'%"></i>':'';
    }).join('')+'</div>');
   }
   if(item.timelineMerged){
    block.classList.add('timeline-merged');block.dataset.sources=item.timelineSources.join(',');
    block.querySelector('.session-check')?.remove();main.dataset.action='timeline-items';main.dataset.ids=item.timelineSources.join(',');
   }
   if(item.blank){block.classList.add('blank-range');block.querySelector('.session-check')?.remove();block.querySelector('strong').textContent=t('空白任务 · 点此编辑','Blank task · tap to edit');block.insertAdjacentHTML('beforeend','<button class="range-handle start" data-action="range-handle" data-resize="start" aria-label="'+t('调整开始时间','Resize start')+'"></button><button class="range-handle end" data-action="range-handle" data-resize="end" aria-label="'+t('调整结束时间','Resize end')+'"></button>');}
  }
  template.content.querySelector('.daily-timeline')?.insertAdjacentHTML('beforebegin','<div class="timeline-toolbar"><button class="day-records-link" data-action="timetable-records" data-date="'+ui.selected+'">'+t('当天记录','Daily records')+'</button><span>'+t('色条：实际专注','Color rail: actual focus')+'</span></div><p class="range-instruction">'+t('长按新建 · 拖动调时 · 15 分钟吸附','Hold to add · drag to resize · 15 min snap')+'</p>');
  return template.innerHTML;
 };
 actions['timeline-items']=element=>{
  const ids=new Set(element.dataset.ids.split(',')),records=data.items.filter(item=>ids.has(item.id));
  showDialog(t('时段详情','Period details'),'<div class="timeline-record-list">'+records.map(item=>'<div class="timeline-source"><button data-action="edit" data-id="'+esc(item.id)+'"><strong>'+esc(item.title)+'</strong><small>'+esc(item.time)+'–'+esc(item.endTime||'')+' · '+(item.focusActual?t('实际专注','Actual focus'):t('计划安排','Planned'))+'</small></button>'+(!item.focusActual?clockDoneButton(item).replace('data-action="finish-session"','data-action="timeline-finish" data-ids="'+esc(element.dataset.ids)+'"'):'')+'</div>').join('')+'</div>',()=>true,t('关闭','Close'));
 };
 actions['timeline-finish']=element=>{actions['finish-session'](element);actions['timeline-items']({dataset:{ids:element.dataset.ids}});};
 function fitTimelineText(){
  for(const block of document.querySelectorAll('#app > .screen .time-block')){
   const main=block.querySelector('.time-block-main'),title=main?.querySelector('strong'),time=main?.querySelector('small');if(!title||!time)continue;
   block.classList.toggle('timeline-micro',block.clientHeight<12);
   if(block.clientHeight<12)continue;
   const horizontal=block.clientHeight<38&&main.clientWidth>150;block.classList.toggle('timeline-inline',horizontal);
   for(const font of [11,10,9,8,7,6]){
    title.style.fontSize=font+'px';time.style.fontSize=Math.max(6,font-2)+'px';
    if(main.scrollHeight<=main.clientHeight+1&&title.scrollHeight<=title.clientHeight+1&&title.scrollWidth<=title.clientWidth+1&&time.scrollWidth<=time.clientWidth+1)break;
   }
   main.querySelector('.time-note')?.classList.toggle('timeline-note-hidden',main.scrollHeight>main.clientHeight+1);
  }
 }
 window.addEventListener('resize',fitTimelineText);window.visualViewport?.addEventListener('resize',fitTimelineText);
 function clockData(){
  const items=data.items;let raw;
  // The clock compares the original plan against actual focus; it must not use
  // the timeline's split remainders or the plan's actual extended end time.
  try{data.items=items.map(item=>!item.focusActual&&item.planOriginal?{...item,...item.planOriginal}:item);raw=originalSegments(ui.selected);}finally{data.items=items;}
  const view=FocusCore.clockPresentation(raw.map(part=>({...part,start:Math.max(0,part.start),end:Math.min(1440,part.end)})),items);
  for(const part of view.segments){const goal=items.find(item=>item.id===part.item.goalId);if(goal)part.item.title=goalPath(goal);}
  return view;
 }
 function clockSegments(){return clockData().segments;}
 function clockFontSize(){const value=Number(data.settings.clockFontSize??10);return Number.isFinite(value)?Math.max(1,Math.min(15,Math.round(value))):10;}
 function applyClockFont(){document.documentElement.style.setProperty('--clock-task-font',clockFontSize()+'px');}
 function clockPoint(minute,radius){const angle=minute/720*Math.PI*2-Math.PI/2;return [200+Math.cos(angle)*radius,200+Math.sin(angle)*radius];}
 function clockInk(color){const hex=/^#[0-9a-f]{6}$/i.test(color)?color:'#5ba6a0',rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#101b22':'#ffffff';}
 let clockRefreshKey='';
 function updateClockNeedle(){const refreshKey=FocusCore.parts(Date.now()).time;if(refreshKey!==clockRefreshKey){clockRefreshKey=refreshKey;if(document.querySelector('.clock-day')&&!panel&&!modal&&!menu&&!ui.clockSelection){render();return;}}const line=document.querySelector('#app > .screen .clock-now');if(!line)return;const parts=FocusCore.parts(Date.now()),minute=minuteOf(parts.time)+new Date().getSeconds()/60,p=FocusCore.spiralPoint(minute,12);line.setAttribute('x2',p.x);line.setAttribute('y2',p.y);const label=document.querySelector('.clock-center');if(label)label.textContent=parts.time;}
 function clockDoneButton(item){return '<button class="session-check '+(item.done?'checked':'')+'" data-action="finish-session" data-id="'+esc(item.id)+'" aria-label="'+t('完成此时段','Complete this period')+'" aria-pressed="'+!!item.done+'" '+(item.focusActual||!item.done&&!GoalCore.canComplete(item)?'disabled':'')+'><span>'+(item.done?icon('check'):'')+'</span></button>';}
 function clockDayHTML(){
  const presentation=clockData(),segments=presentation.segments,layout=FocusCore.clockLayout(segments.filter(part=>part.item.focusActual)),labelSegments=presentation.labels.map(part=>({...part,track:layout.arcs.find(arc=>arc.item.id===part.item.id&&arc.start===part.start)?.track||0})),outside=data.settings.clockLabels!=='inside',dates=Array.from({length:7},(_,i)=>addDays(weekStart(ui.selected),i)),point=(minute,offset)=>FocusCore.spiralPoint(minute,offset),xy=p=>p.x+','+p.y;
  const curve=(start,end,offset)=>{const steps=Math.max(2,Math.ceil((end-start)/4));return Array.from({length:steps+1},(_,i)=>point(start+(end-start)*i/steps,offset));};
  const path=points=>points.map((p,i)=>(i?'L':'M')+xy(p)).join(' ');
  const ribbon=(start,end,track)=>path(curve(start,end,5-track*12))+' '+path(curve(start,end,-5-track*12).reverse()).replace(/^M/,'L')+' Z';
  const tracks=[0].map(track=>'<path class="clock-spiral-track" d="'+path(curve(0,1440,-track*12))+'"/>').join('');
  const plans=segments.filter(part=>!part.item.focusActual).map(({item,start,end})=>{const d=path(curve(start,end,9)),attrs=' data-action="clock-select" data-id="'+esc(item.id)+'" data-start="'+start+'" data-end="'+end+'"';return '<path class="clock-plan-hit"'+attrs+' d="'+d+'"/><path class="clock-sector clock-plan '+(item.done?'is-done':'')+'"'+attrs+' tabindex="0" role="button" aria-label="'+esc(item.title)+' '+t('原计划','Plan')+' '+minuteText(start)+'–'+minuteText(end)+'" d="'+d+'" style="--sector-color:'+esc(item.color)+'"><title>'+esc(item.title)+' · '+t('原计划','Plan')+' '+minuteText(start)+'–'+minuteText(end)+'</title></path>';}).join('');
  const ribbons=plans+layout.arcs.map(({item,start,end,track})=>'<path class="clock-sector is-actual" data-action="clock-select" data-id="'+esc(item.id)+'" data-start="'+start+'" data-end="'+end+'" data-track="'+track+'" tabindex="0" role="button" aria-label="'+esc(item.title)+' '+t('实际专注','Actual focus')+' '+minuteText(start)+'–'+minuteText(end)+'" d="'+ribbon(start+1,end-1,track)+'" style="--sector-color:'+esc(item.color)+'"><title>'+esc(item.title)+' · '+t('实际专注','Actual focus')+' '+minuteText(start)+'–'+minuteText(end)+'</title></path>').join('');
  const accepted=[];
  const innerLabels=outside?'':labelSegments.map(({item,start,end,track})=>{
   if(end-start<30)return '';const p=point((start+end)/2,-track*12),name=item.title||t('空白日程','Untitled'),font=clockFontSize(),lines=name.match(/.{1,7}/gu)||[''],text=name,width=Math.min(7,name.length)*font+10,height=lines.length*(font+2)+6,box={x:p.x-width/2,y:p.y-height/2,w:width,h:height};
   if(accepted.some(a=>box.x<a.x+a.w&&box.x+box.w>a.x&&box.y<a.y+a.h&&box.y+box.h>a.y))return '';accepted.push(box);
   return '<g class="clock-inner-label" data-action="clock-select" data-id="'+esc(item.id)+'" data-start="'+start+'"><rect x="'+box.x+'" y="'+box.y+'" width="'+width+'" height="'+height+'" rx="4" fill="'+esc(item.color||'#5ba6a0')+'"/><text class="clock-sector-label" style="font-size:'+font+'px" data-label-rotation="0" x="'+p.x+'" y="'+(box.y+font+3)+'" text-anchor="middle" fill="'+clockInk(item.color)+'">'+lines.map((line,index)=>'<tspan x="'+p.x+'" dy="'+(index?font+2:0)+'">'+esc(line)+'</tspan>').join('')+'</text></g>';
  }).join('');
  const groups=layout.groups.map(group=>{const p=point((group.start+group.end)/2,-32);return '<g class="clock-cluster" data-action="clock-cluster" data-group="'+group.key+'" tabindex="0" role="button" transform="translate('+xy(p)+')"><circle class="clock-cluster-hit" r="18"/><circle class="clock-cluster-dot" r="11"/><text text-anchor="middle" dominant-baseline="central">'+group.segments.length+'</text></g>';}).join('');
  let callouts='';
  const labelLimit=innerHeight<680?(clockFontSize()>12?2:4):(clockFontSize()>12?4:10),labelPages=Math.max(1,Math.ceil(labelSegments.length/labelLimit)),labelPage=Math.min(ui.clockLabelPage||0,labelPages-1);
  if(outside){
   const zones={top:[],right:[],bottom:[],left:[]};
   const positioned=labelSegments.slice(labelPage*labelLimit,(labelPage+1)*labelLimit).map(segment=>({...segment,p:point((segment.start+segment.end)/2,segment.item.focusActual?-segment.track*12:9)}));
   for(const segment of positioned.sort((a,b)=>(a.item.title||'').length-(b.item.title||'').length)){
    const side=segment.p.x<200?'left':'right';
    if(positioned.length>4&&(segment.item.title||'').length<=6&&zones[side].length<2)zones[side].push(segment);
    else zones[segment.p.y<200?'top':'bottom'].push(segment);
   }
   // Balance long titles across the wide upper and lower margins.
   while(Math.abs(zones.top.length-zones.bottom.length)>2){
    const from=zones.top.length>zones.bottom.length?'top':'bottom',to=from==='top'?'bottom':'top';
    zones[from].sort((a,b)=>Math.abs(a.p.y-200)-Math.abs(b.p.y-200));
    zones[to].push(zones[from].shift());
   }
   callouts=Object.entries(zones).map(([zone,items])=>'<div class="clock-zone clock-zone-'+zone+'">'+items.sort((a,b)=>zone==='top'||zone==='bottom'?a.p.x-b.p.x:a.p.y-b.p.y).map(({item,start,end,p,periodCount})=>{
    const caption=periodCount>1?(item.focusActual?t('实际','Actual'):t('计划','Plan'))+' · '+periodCount+t(' 段',' periods'):minuteText(start)+'–'+minuteText(end);
    return '<button class="clock-callout" data-task-key="'+esc(labelSegments.find(part=>part.item.id===item.id)?.taskKey||item.id)+'" data-action="clock-select" data-id="'+esc(item.id)+'" data-start="'+start+'" data-anchor-x="'+p.x+'" data-anchor-y="'+p.y+'" data-zone="'+zone+'" style="--task-color:'+esc(item.color)+'"><span class="clock-callout-bed"><span class="clock-callout-name">'+esc(item.title||t('空白日程','Untitled'))+'</span><span class="clock-callout-time">'+esc(caption)+'</span></span></button>';
   }).join('')+'</div>').join('');
  }
  const ticks=Array.from({length:144},(_,index)=>{const minute=index*5,a=clockPoint(minute,minute%60===0?164:174),b=clockPoint(minute,179);return '<line class="clock-tick '+(minute%60===0?'hour-tick':'')+'" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/>';}).join('');
  const hours=Array.from({length:12},(_,hour)=>{const p=clockPoint(hour*60,192);return '<text class="clock-hour" x="'+p[0]+'" y="'+p[1]+'" text-anchor="middle" dominant-baseline="central">'+(hour||12)+'</text>';}).join('');
  const nowParts=FocusCore.parts(Date.now()),now=minuteOf(nowParts.time),hand=point(now,12),isToday=ui.selected===nowParts.date;
  const pending=segments.filter(part=>!part.item.done&&!part.item.focusActual).sort((a,b)=>a.start-b.start);
  const automatic=(isToday?pending.find(part=>part.start<=now&&part.end>now)||pending.find(part=>part.start>now):pending[0])||segments.at(-1);
  const explicit=segments.find(part=>part.item.id===ui.clockSelection&&part.start===ui.clockStart),selected=explicit||automatic,chosen=selected?.item;
  const status=chosen?.done?t('已完成','Completed'):explicit?t('已选时段','Selected period'):isToday&&selected?.start<=now&&selected?.end>now?t('现在进行','Now'):isToday&&selected?.start>now?t('接下来','Up next'):t('当日安排','Day schedule');
  const remaining=!explicit&&isToday&&selected&&!chosen.done?(selected.start>now?t(' · '+(selected.start-now)+' 分钟后开始',' · in '+(selected.start-now)+' min'):selected.end>now?t(' · 剩余 '+(selected.end-now)+' 分钟',' · '+(selected.end-now)+' min left'):''):'';
  const selection='<div class="clock-selection" data-task-key="'+esc(selected?.taskKey||chosen?.id||'')+'" style="--task-color:'+esc(chosen?.color||'#79bdb1')+'">'+(chosen?'<div class="clock-selected-copy"><div class="clock-status">'+status+(explicit?'<button data-action="clock-current">'+t('回到当前','Back to now')+'</button>':'')+'</div><strong>'+esc(chosen.title||t('空白日程','Untitled'))+'</strong><small>'+minuteText(selected.start)+'–'+minuteText(selected.end)+remaining+'</small></div><button class="clock-edit" data-action="edit" data-id="'+esc(chosen.id)+'" aria-label="'+t('编辑日程','Edit schedule')+'">'+icon('edit')+'<small>'+t('编辑','Edit')+'</small></button>'+clockDoneButton(chosen):'<p>'+t('当天暂无安排','No schedules today')+'</p>')+'</div>';
  return weekdaysHTML()+'<div class="week-strip clock-week">'+dates.map(date=>'<button class="day '+(date===today()?'today':'')+'" data-action="day" data-date="'+date+'">'+dayNumber(date)+'</button>').join('')+'</div><section class="clock-day" data-labels="'+(outside?'outside':'inside')+'">'+selection+'<div class="clock-face '+(outside?'clock-orbit':'')+'">'+(outside?'<svg class="clock-connectors" aria-hidden="true"></svg>'+callouts:'')+'<svg class="schedule-clock" viewBox="0 0 400 400" role="group" aria-label="'+ui.selected+' '+t('全天螺旋日程钟表','Full-day spiral schedule clock')+'"><circle cx="200" cy="200" r="158" class="clock-bed"/>'+tracks+ribbons+innerLabels+groups+'<g class="clock-scale">'+ticks+hours+'</g>'+(isToday?'<line class="clock-now" x1="200" y1="200" x2="'+hand.x+'" y2="'+hand.y+'"/><circle class="clock-now-dot" cx="200" cy="200" r="2.5"/>':'')+'<text x="200" y="214" class="clock-center" text-anchor="middle">'+(isToday?nowParts.time:ui.selected.slice(5))+'</text><text x="200" y="232" class="clock-subtitle" text-anchor="middle">00:00 → 24:00</text><text x="200" y="246" class="clock-subtitle" text-anchor="middle">'+t('虚线计划 · 色带实际','Dashed plan · solid actual')+'</text></svg></div>'+(outside&&labelPages>1?'<div class="clock-pages"><button data-action="clock-label-page" data-page="'+((labelPage+labelPages-1)%labelPages)+'">'+t('上一组','Previous')+'</button><span>'+t('安排','Schedules')+' '+(labelPage+1)+' / '+labelPages+'</span><button data-action="clock-label-page" data-page="'+((labelPage+1)%labelPages)+'">'+t('下一组','Next')+'</button></div>':'')+'<button class="clock-records-link" data-action="clock-records">'+t('全部安排 · 点击查看或编辑','All schedules · view or edit')+' · '+eventsForDay(ui.selected).length+'</button></section>';

 }
 actions['clock-current']=()=>{ui.clockSelection=null;render();};
 actions['clock-label-page']=element=>{ui.clockLabelPage=Number(element.dataset.page);render();};
 actions['clock-select']=element=>{ui.clockSelection=element.dataset.id;ui.clockStart=Number(element.dataset.start);modal=null;render();};
 function fitClock(){const clock=document.querySelector('#app > .screen .clock-day'),dock=document.querySelector('#app > .screen .dock')||document.querySelector('.dock');if(clock){const top=clock.getBoundingClientRect().top,bottom=dock?.getBoundingClientRect().top||innerHeight-90;clock.style.height=Math.max(120,bottom-top-10)+'px';layoutClockLeaders();}const weekly=document.querySelector('#app > .screen .timetable-scroll');if(weekly){const bottom=dock?.getBoundingClientRect().top||innerHeight-90;weekly.style.height=Math.max(180,bottom-weekly.getBoundingClientRect().top-10)+'px';}}
 function layoutClockLeaders(){
  const board=document.querySelector('.clock-orbit'),svg=board?.querySelector('.schedule-clock'),overlay=board?.querySelector('.clock-connectors');
  if(!svg||!overlay)return;
  const box=board.getBoundingClientRect(),matrix=svg.getScreenCTM();if(!matrix)return;
  overlay.setAttribute('viewBox','0 0 '+box.width+' '+box.height);
  const activeKey=document.querySelector('.clock-selection')?.dataset.taskKey;
  const labels=Array.from(board.querySelectorAll('.clock-callout'));
  for(const label of labels)label.classList.toggle('is-highlighted',label.dataset.taskKey===activeKey);
  overlay.innerHTML=labels.filter(label=>label.dataset.taskKey===activeKey).slice(0,1).map(label=>{
   const anchor=new DOMPoint(Number(label.dataset.anchorX),Number(label.dataset.anchorY)).matrixTransform(matrix),r=label.getBoundingClientRect(),zone=label.dataset.zone;
   const x=anchor.x-box.left,y=anchor.y-box.top;
   const ex=(zone==='left'?r.right:zone==='right'?r.left:r.left+r.width/2)-box.left,ey=(zone==='top'?r.bottom:zone==='bottom'?r.top:r.top+r.height/2)-box.top;
   const elbow=zone==='top'||zone==='bottom'?ex+','+(ey+(zone==='top'?8:-8)):(ex+(zone==='left'?8:-8))+','+ey;
   return '<path d="M'+x+','+y+' L'+elbow+' L'+ex+','+ey+'" stroke="'+label.style.getPropertyValue('--task-color')+'"/><circle cx="'+x+'" cy="'+y+'" r="2" fill="'+label.style.getPropertyValue('--task-color')+'"/>';
  }).join('');
 }
 let compactClock=innerHeight<680;
 function resizeClock(){const compact=innerHeight<680;if(compact!==compactClock&&document.querySelector('.clock-day')&&!panel&&!modal){compactClock=compact;ui.clockLabelPage=0;render();}else fitClock();}
 window.addEventListener('resize',resizeClock);window.visualViewport?.addEventListener('resize',resizeClock);
 actions['clock-cluster']=element=>{
  const group=FocusCore.clockLayout(clockSegments().filter(part=>part.item.focusActual)).groups.find(group=>group.key===Number(element.dataset.group));if(!group)return;
  showDialog(t('密集时段的安排','Schedules in this busy period'),`<p class="note">${minuteText(group.start)}–${minuteText(group.end)} ${t('开始 · 点击查看或编辑','starts · tap to view or edit')}</p><div class="timeline-record-list">${group.segments.map(({item,start,end})=>{const goal=data.items.find(goal=>goal.id===item.goalId);return `<button data-action="edit" data-id="${esc(item.id)}"><strong>${esc(goal?goalPath(goal):item.title||t('空白任务','Blank task'))}</strong><small>${minuteText(start)}–${minuteText(end)} · ${item.focusActual?t('实际专注','Actual focus'):item.renderRemainder?t('未执行计划','Unperformed plan'):t('计划','Plan')}</small></button>`;}).join('')}</div>`,()=>true,t('关闭','Close'));
 };
 actions['clock-records']=()=>showDialog(ui.selected+' · '+t('全部安排','All schedules'),`<div class="timeline-record-list">${eventsForDay(ui.selected).map(item=>`<button data-action="edit" data-id="${esc(item.id)}"><strong>${esc(item.title||t('空白任务','Blank task'))}</strong><small>${item.allDay?t('全天','All day'):esc(item.time)+'–'+esc(item.endTime||'')}${item.chooseAtStart?' · '+t('可选择任务','Alternative tasks'):''}</small></button>`).join('')||`<p class="note">${t('当天没有安排','No schedules today')}</p>`}</div>`,()=>true,t('关闭','Close'));
 document.addEventListener('keydown',event=>{if(event.target.matches?.('.clock-sector,.clock-cluster,.clock-callout,.clock-inner-label')&&['Enter',' '].includes(event.key)){event.preventDefault();actions[event.target.dataset.action](event.target);}});
 let rangePress=null;
 const minuteText=minute=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
 function rangeValue(canvas,y){return FocusCore.snap(dayMinute(y-canvas.getBoundingClientRect().top));}
 function rangeTimes(date,start,end){return {date,time:minuteText(start),endDate:end===1440?addDays(date,1):date,endTime:end===1440?'00:00':minuteText(end)};}
 function cancelRange(){if(!rangePress)return;clearTimeout(rangePress.timer);rangePress.drag?.preview.remove();rangePress.drag?.label.remove();if(rangePress.block)rangePress.block.style.opacity='';rangePress=null;}
 function beginRangeDrag(press,type){
  const item=data.items.find(record=>record.id===press.id);if(!item)return;calendarGesture=null;
  const start=minuteOf(item.time),end=item.endDate>item.date?1440:minuteOf(item.endTime),preview=document.createElement('div'),label=document.createElement('div');
  preview.className='range-preview';Object.assign(preview.style,{top:dayY(start)+'px',height:(end-start)/60*dayAxis().hourHeight+'px'});label.className='range-live-label';
  press.canvas.querySelector('.time-blocks').append(preview,label);press.drag={type,start,end,nextStart:start,nextEnd:end,preview,label};press.block.style.opacity='.3';press.canvas.setPointerCapture?.(press.pointerId);
 }
 actions['range-handle']=()=>{};
 document.addEventListener('pointerdown',event=>{
  if(rangePress&&rangePress.pointerId!==event.pointerId){cancelRange();return;}
  if(!event.isPrimary||event.button!==0||panel||menu||modal||ui.tab!=='calendar'||ui.calendarView!=='Week')return;
  const canvas=event.target.closest('#app > .screen .time-canvas');if(!canvas)return;
  const block=event.target.closest('.time-block'),blank=block?.classList.contains('blank-range'),handle=event.target.closest('[data-resize]');
  if(block&&!blank)return;
  const press={pointerId:event.pointerId,x:event.clientX,y:event.clientY,canvas,block,id:block?.dataset.id,blank,date:ui.selected,long:false};rangePress=press;
  if(handle){event.preventDefault();event.stopPropagation();beginRangeDrag(press,handle.dataset.resize);return;}
  if(blank)event.preventDefault(); // Capture after dragging, so ordinary taps still reach the editor.
  press.timer=setTimeout(()=>{
   if(rangePress!==press)return;press.long=true;calendarGesture=null;suppressCalendarClickUntil=performance.now()+1000;
   if(blank){showDialog(t('删除空白任务？','Delete blank task?'),`<p class="note">${t('删除这个尚未填写的时间段。','Remove this unfilled time range.')}</p>`,()=>{const previous=data.items;data.items=previous.filter(item=>item.id!==press.id);if(!persist()){data.items=previous;return false;}render();return true;},t('删除','Delete'),true);}
   else{
    const start=Math.min(dayAxis().end-60,rangeValue(canvas,press.y)),item={id:uid(),kind:'event',taskBlock:true,blank:true,title:'',...rangeTimes(press.date,start,start+60),calendar:'Default',color:'#879fac',importance:0,done:false,repeat:'Once',reminder:'None',notes:''};
    data.items.push(item);if(persist())render();else data.items.pop();
   }
  },450);
 },true);
 document.addEventListener('pointermove',event=>{
  const press=rangePress;if(!press||event.pointerId!==press.pointerId||press.long)return;
  const distance=Math.hypot(event.clientX-press.x,event.clientY-press.y);
  if(!press.drag&&distance>8){clearTimeout(press.timer);if(press.blank)beginRangeDrag(press,'move');else{cancelRange();return;}}
  if(!press.drag)return;event.preventDefault();event.stopPropagation();const drag=press.drag;
  const minute=rangeValue(press.canvas,event.clientY);
  if(drag.type==='start'){drag.nextStart=Math.max(dayAxis().start,Math.min(drag.end-15,minute));}
  else if(drag.type==='end'){drag.nextEnd=Math.min(dayAxis().end,Math.max(drag.start+15,minute));}
  else{const delta=rangeValue(press.canvas,event.clientY)-rangeValue(press.canvas,press.y);const duration=drag.end-drag.start;drag.nextStart=Math.max(dayAxis().start,Math.min(dayAxis().end-duration,drag.start+delta));drag.nextEnd=drag.nextStart+duration;}
  drag.preview.style.transform=`translateY(${(drag.nextStart-drag.start)/60*dayAxis().hourHeight}px) scaleY(${(drag.nextEnd-drag.nextStart)/(drag.end-drag.start)})`;
  drag.label.style.transform=`translateY(${Math.max(0,dayY(drag.nextStart)-24)}px)`;drag.label.textContent=minuteText(drag.nextStart)+'–'+minuteText(drag.nextEnd);
 },true);
 document.addEventListener('pointerup',event=>{
  const press=rangePress;if(!press||event.pointerId!==press.pointerId)return;
  if(press.drag){event.preventDefault();event.stopPropagation();const item=data.items.find(record=>record.id===press.id),previous={...item};if(item){Object.assign(item,rangeTimes(press.date,press.drag.nextStart,press.drag.nextEnd));if(!persist())Object.assign(item,previous);}suppressCalendarClickUntil=performance.now()+600;cancelRange();render();}
  else{if(press.long)suppressCalendarClickUntil=performance.now()+600;cancelRange();}
 },true);
 document.addEventListener('pointercancel',cancelRange,true);
 document.addEventListener('touchmove',event=>{if(rangePress?.drag){event.preventDefault();event.stopPropagation();}},{capture:true,passive:false});
 document.addEventListener('contextmenu',event=>{if(event.target.closest('.blank-range'))event.preventDefault();});
 const editCalendarItem=actions.edit;actions.edit=element=>{if(element.closest?.('.timeline-record-list'))modal=null;const item=data.items.find(record=>record.id===element.dataset.id);if(item?.focusActual){showDialog(t('实际专注记录','Actual focus'),`<p>${esc(item.title)}</p><p class="note">${esc(item.date)} ${esc(item.time)}–${esc(item.endTime)}<br>${timerText(item.actualEndAt-item.actualStartAt)} · ${t('已计入目标投入；暂停时间已排除','Credited to goal; paused time excluded')}</p>`,()=>true,t('知道了','OK'));}else editCalendarItem(element);};
 const previousSettings=settingsHTML;
 function clockFontSetting(){return `<div class="setting-card clock-font-setting"><div class="row"><label class="label" for="clock-font-size">${t('钟表任务字号','Clock task font size')}<small>${t('1–15 · 同时调整圈内、圈外和顶部任务文字','1–15 · inside, outside and current-task text')}</small></label><output id="clock-font-value" for="clock-font-size">${clockFontSize()}</output></div><div class="clock-font-controls"><button data-action="clock-font-step" data-step="-1" aria-label="${t('减小字号','Smaller text')}">−</button><input id="clock-font-size" type="range" min="1" max="15" step="1" value="${clockFontSize()}" aria-label="${t('钟表任务字号','Clock task font size')}"><button data-action="clock-font-step" data-step="1" aria-label="${t('增大字号','Larger text')}">+</button></div><div class="clock-font-preview">${t('数据结构 › 练习与复习','Data structures › Practice')}<small>10:30–11:30</small></div><div class="clock-font-footer"><span>${t('数值越小，文字越小','Lower values make smaller text')}</span><button data-action="clock-font-reset">${t('恢复默认 10','Reset to 10')}</button></div></div>`;}
 function setClockFont(value){data.settings.clockFontSize=Math.max(1,Math.min(15,Math.round(Number(value)||1)));applyClockFont();persist();const output=document.querySelector('#clock-font-value'),input=document.querySelector('#clock-font-size');if(output)output.value=String(clockFontSize());if(input)input.value=String(clockFontSize());fitClock();}
 actions['clock-font-step']=element=>setClockFont(clockFontSize()+Number(element.dataset.step));
 actions['clock-font-reset']=()=>setClockFont(10);
 document.addEventListener('input',event=>{if(event.target.id==='clock-font-size')setClockFont(event.target.value);});
 document.addEventListener('change',event=>{if(event.target.id==='clock-font-size'){setClockFont(event.target.value);}});
 settingsHTML=()=>{
  let html=previousSettings().replaceAll('1.3.0','1.10.0');if(panel.sub!=='root')return html;html=html.replace('<div class="section-caption">',`<div class="setting-card">${rowToggle(t('液态玻璃材质','Liquid glass'),'liquidGlass',data.settings.liquidGlass!==false,true)}<label class="row"><span class="label">${t('钟表文字标注','Clock labels')}</span><select id="clock-labels"><option value="outside" ${data.settings.clockLabels!=='inside'?'selected':''}>${t('圈外引线','Outside callouts')}</option><option value="inside" ${data.settings.clockLabels==='inside'?'selected':''}>${t('圈内正向','Upright inside')}</option></select></label></div><div class="section-caption">`);
  html=html.replace('<div class="section-caption">',`<div class="setting-card"><label class="row"><span class="label">${t('日视图显示方式','Day view style')}</span><select id="day-display" aria-label="${t('日视图显示方式','Day view style')}"><option value="timeline" ${data.settings.dayDisplay!=='clock'?'selected':''}>${t('时间轴','Timeline')}</option><option value="clock" ${data.settings.dayDisplay==='clock'?'selected':''}>${t('钟表','Clock')}</option></select></label></div><div class="section-caption">`);
  html=html.replace('<div class="section-caption">',clockFontSetting()+'<div class="section-caption">');
  const density=`<div class="setting-card"><label class="row"><span class="label">${t('日视图默认模式','Daytime view')}<small>${t('06:00–23:00 · 总高度不变，每小时空间增加约41%','06:00–23:00 · same canvas, 41% more room per hour')}</small></span><input type="checkbox" class="toggle" data-setting="daytimeOnly" ${data.settings.daytimeOnly!==false?'checked':''}></label></div><div class="setting-card"><label class="row"><span class="label">${t('目标卡片疏密','Goal card density')}<small>${t('调整卡片高度，字号保持不变','Adjust card height without changing text size')}</small></span><select id="card-density" aria-label="${t('目标卡片疏密','Goal card density')}">${Object.entries(cardDensities).map(([key,label])=>`<option value="${key}" ${key===(data.settings.cardDensity||'compact')?'selected':''}>${t(...label)}</option>`).join('')}</select></label></div>`;
  return html.replace('<div class="section-caption">',density+`<div class="background-choices"><div class="field-caption">${t('日历背景 · 日 / 周 / 月通用','Calendar background · all views')}</div><div>${Object.entries(themes).map(([key,label])=>`<button data-action="background-pick" data-theme="${key}" aria-pressed="${data.settings.calendarBackground===key}"><img src="background-${key}.jpg" alt="" loading="lazy"><span>${t(...label)}</span></button>`).join('')}</div><p class="background-credit">${t('自然摄影来自 Unsplash，已随应用离线打包','Nature photography from Unsplash; available offline')}</p></div><div class="section-caption">`).replace(t('月视图玻璃背景','Glass calendar background'),t('日历透明背景','Glass calendar background'));
 };
 document.addEventListener('change',event=>{if(event.target.id==='clock-labels'){data.settings.clockLabels=event.target.value==='inside'?'inside':'outside';persist();render();}if(event.target.dataset.setting==='liquidGlass')render();if(event.target.id==='day-display'){data.settings.dayDisplay=event.target.value==='clock'?'clock':'timeline';persist();render();}if(event.target.dataset.setting==='daytimeOnly')render();if(event.target.id==='card-density'&&Object.hasOwn(cardDensities,event.target.value)){data.settings.cardDensity=event.target.value;persist();render();}});
 actions['background-pick']=element=>{if(Object.hasOwn(themes,element.dataset.theme)){data.settings.calendarBackground=element.dataset.theme;persist();render();}};
 const repaint=render;
 render=function(){applyClockFont();document.documentElement.dataset.material=data.settings.liquidGlass===false?'flat':'glass';document.documentElement.dataset.cardDensity=Object.hasOwn(cardDensities,data.settings.cardDensity)?data.settings.cardDensity:'compact';const oldWeekly=document.querySelector('#app > .screen .timetable-scroll'),weeklyScroll=oldWeekly?.scrollTop;repaint();const weekly=document.querySelector('#app > .screen .timetable-scroll');if(weekly)weekly.scrollTop=weeklyScroll??144;const screen=document.querySelector('#app > .screen');if(screen){screen.dataset.background=data.settings.calendarBackground;if(ui.tab==='todos')screen.classList.add('task-list-screen');}const goal=data.items.find(item=>item.id===(currentFocus()?.goalId||selectedFocus().goal?.id));if(goal?.parentId)document.querySelector('.focus-timer h2')?.insertAdjacentHTML('afterend',`<p class="focus-origin">${esc(goalPath(goal))}</p>`);enhanceChoices();};
 // Native <dialog> supplies focus containment, Escape behavior and top-layer stacking.
 // Every select keeps its original value/change contract; only its presentation changes.
 let choiceState=null;
 const choiceColors=['#8b929d','#7b8dc8','#5ba6a0','#b89b35','#c66f78'];
 function isGoalChoice(select){return ['goalId','parentId','alternativeGoalId'].includes(select.dataset.draft);}
 function choiceLabel(select){const goal=isGoalChoice(select)?data.items.find(item=>item.id===select.value):null;return goal?goalPath(goal):select.selectedOptions[0]?.textContent||'';}
 function enhanceChoices(){
  for(const select of document.querySelectorAll('#overlay select')){
   let trigger=select.nextElementSibling;
   if(!trigger?.classList.contains('choice-trigger')){
    trigger=document.createElement('button');trigger.type='button';trigger.className='choice-trigger';select.insertAdjacentElement('afterend',trigger);select.classList.add('choice-native');select.setAttribute('aria-hidden','true');select.tabIndex=-1;select.parentElement.classList.add('choice-field-host');
    trigger.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openChoice(select,trigger);});
   }
   trigger.dataset.choiceField=select.dataset.draft||(select.hasAttribute('data-planner-language')?'language':select.id||'option');trigger.disabled=select.disabled;trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-label',(select.getAttribute('aria-label')||'')+': '+choiceLabel(select));
   const color=select.dataset.draft==='importance'?choiceColors[Number(select.value)]||choiceColors[0]:null;
   trigger.innerHTML=`${color?`<i class="choice-swatch" style="background:${color}"></i>`:''}<span>${esc(choiceLabel(select))}</span>${icon('down','choice-chevron')}`;
  }
  for(const action of ['subscriptions','voice','courses','jump'])document.querySelectorAll(`#overlay > .menu [data-action="${action}"]`).forEach(element=>element.remove());
 }
 function closeChoice(){
  const state=choiceState;if(!state)return;choiceState=null;
  const animation=playMotion(state.dialog,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(18px)'}],160);
  const finish=()=>{state.dialog.close();state.dialog.remove();};if(animation)animation.finished.catch(()=>{}).finally(finish);else finish();
 }
 function choiceGoalCard(goal,selected){
  const minutes=GoalCore.goalMinutes(data.items,goal.id),estimate=Number(goal.estimatedMinutes)||0,percent=estimate?Math.round(minutes/estimate*100):0;
  return `<button type="button" class="choice-option goal-choice ${selected?'is-selected':''}" data-choice-value="${esc(goal.id)}" aria-pressed="${selected}"><span class="choice-goal-copy"><strong>${esc(goal.title)}</strong>${goal.parentId?`<small class="choice-origin">${esc(goalPath(goal,false))}</small>`:''}<span class="choice-meta">${t('已投入','Invested')} ${(minutes/60).toFixed(2)}h${estimate?' / '+t('预估','estimate')+' '+(estimate/60).toFixed(2)+'h':''}</span>${estimate?`<span class="choice-progress"><i style="transform:scaleX(${Math.min(1,minutes/estimate)})"></i></span>`:''}</span>${estimate?`<span class="choice-percent">${icon('flag')}${percent}%</span>`:''}<span class="choice-radio" aria-hidden="true">${selected?icon('check'):''}</span></button>`;
 }
 function choiceList(state){
  const options=Array.from(state.select.options).filter(option=>!option.disabled),goalField=isGoalChoice(state.select),search=state.query.trim().toLowerCase();
  if(!goalField)return options.map(option=>`<button type="button" class="choice-option ${state.select.dataset.draft==='importance'?'importance-choice':''} ${option.value===state.select.value?'is-selected':''}" data-choice-value="${esc(option.value)}" aria-pressed="${option.value===state.select.value}">${state.select.dataset.draft==='importance'?`<i class="choice-swatch" style="background:${choiceColors[Number(option.value)]}"></i>`:''}<span class="choice-copy">${esc(option.textContent)}</span><span class="choice-radio">${option.value===state.select.value?icon('check'):''}</span></button>`).join('');
  const allowed=new Set(options.map(option=>option.value)),goals=todoPool().filter(goal=>allowed.has(goal.id));
  const empty=options.find(option=>option.value==='');
  if(search)return goals.filter(goal=>goalPath(goal).toLowerCase().includes(search)).map(goal=>choiceGoalCard(goal,goal.id===state.select.value)).join('')||`<p class="note">${t('没有匹配的目标','No matching goals')}</p>`;
  function family(goal,seen=new Set()){
   if(seen.has(goal.id))return '';const visited=new Set([...seen,goal.id]),children=goals.filter(child=>child.parentId===goal.id),expanded=state.expanded.has(goal.id);
   return `<section class="choice-goal-family"><div class="choice-family-row">${choiceGoalCard(goal,goal.id===state.select.value)}${children.length?`<button type="button" class="choice-expand" data-choice-expand="${esc(goal.id)}" aria-expanded="${expanded}" aria-label="${t('展开子目标','Expand subgoals')} ${esc(goal.title)}">${icon(expanded?'down':'next')}</button>`:''}</div>${expanded?`<div class="choice-children">${children.map(child=>family(child,visited)).join('')}</div>`:''}</section>`;
  }
  return `${empty?`<button type="button" class="choice-option create-goal-choice" data-choice-value="" aria-pressed="${state.select.value===''}">${icon('plus')}<span>${esc(empty.textContent)}</span><span class="choice-radio">${state.select.value===''?icon('check'):''}</span></button>`:''}${goals.filter(goal=>!goal.parentId||!allowed.has(goal.parentId)).map(goal=>family(goal)).join('')}`;
 }
 function openChoice(select,trigger){
  if(choiceState)closeChoice();const dialog=document.createElement('dialog');dialog.className='choice-sheet';
  const goalField=isGoalChoice(select),title=select.closest('.row')?.querySelector('.label')?.textContent||select.getAttribute('aria-label')||t('选择','Choose');
  const state={select,trigger,dialog,query:'',expanded:new Set()};let parent=data.items.find(item=>item.id===select.value)?.parentId;while(parent&&!state.expanded.has(parent)){state.expanded.add(parent);parent=data.items.find(item=>item.id===parent)?.parentId;}
  dialog.innerHTML=`<header class="choice-header"><div><small>${t('请选择','Choose')}</small><h2>${esc(title)}</h2></div><button type="button" class="choice-close" aria-label="${t('关闭','Close')}">${icon('close')}</button></header>${goalField?`<label class="choice-search">${icon('search')}<input type="search" placeholder="${t('搜索目标或所属主目标','Search goals or parent goals')}" aria-label="${t('搜索目标','Search goals')}"></label><p class="choice-hint">${t('点目标选中 · 点箭头展开子目标','Tap a goal to select · arrows expand subgoals')}</p>`:''}<div class="choice-list"></div>`;
  choiceState=state;const update=()=>{dialog.querySelector('.choice-list').innerHTML=choiceList(state);};update();document.body.append(dialog);dialog.showModal();
  playMotion(dialog,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],180);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeChoice();});dialog.querySelector('.choice-close').addEventListener('click',closeChoice);
  dialog.querySelector('input')?.addEventListener('input',event=>{state.query=event.target.value;update();});
  dialog.addEventListener('click',event=>{
   if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeChoice();return;}
   const expand=event.target.closest('[data-choice-expand]');if(expand){const id=expand.dataset.choiceExpand;state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);update();return;}
   const option=event.target.closest('[data-choice-value]');if(option){const value=option.dataset.choiceValue;closeChoice();select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));enhanceChoices();}
  });
 }
 const overlayChoices=renderOverlay;renderOverlay=function(){overlayChoices();if(menu==='view'&&ui.tab==='calendar')document.querySelector('#overlay > .menu')?.insertAdjacentHTML('beforeend',menuItem('dashboard',t('数据板','Data board'),'grid','',ui.calendarView==='Dashboard'));enhanceChoices();};
 const renderWithStatistics=render;render=function(){renderWithStatistics();if(ui.tab==='calendar'&&ui.calendarView==='Dashboard'){const title=document.querySelector('#app > .screen .month-title');if(title)title.innerHTML=t('数据板','Data board')+`<small>${ui.selected}</small>`;}const toolbar=document.querySelector('#app > .screen .timeline-toolbar'),todayButton=document.querySelector('#app > .screen .today-button');if(toolbar&&todayButton)toolbar.append(todayButton);fitClock();fitTimelineText();};
 document.addEventListener('keydown',event=>{if(choiceState&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeChoice();}},true);
 const backBeforeChoices=window.handleNativeBack;window.handleNativeBack=()=>{if(choiceState){closeChoice();return true;}return backBeforeChoices();};
 initializeNative();refreshFocus();render();
})();
