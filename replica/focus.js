'use strict';
(()=>{
 const t=(zh,en)=>data.settings.language==='en'?en:zh;
 const themes={lake:['雾湖','Misty lake'],dunes:['沙丘','Quiet dunes'],water:['静水','Still water']};
 function goalPath(goal,includeSelf=true){const parts=[],seen=new Set();let current=includeSelf?goal:data.items.find(item=>item.id===goal?.parentId);while(current&&!seen.has(current.id)){seen.add(current.id);parts.unshift(current.title);current=data.items.find(item=>item.id===current.parentId);}return parts.join(' › ');}
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
  }
  return template.innerHTML;
 };
 const taskEditor=editorHTML;
 editorHTML=()=>{
  const html=taskEditor();if(draft.kind!=='todo')return html;
  const fields=`<div class="edit-card deadline-editor"><div class="field-caption">${t('截止日期 DDL（可不填）','Deadline (optional)')}</div><div class="time-fields"><label>${t('日期','Date')}<input type="date" data-draft="deadlineDate" aria-label="Deadline date" value="${esc(draft.deadlineDate??draft.date??'')}"></label><label>${t('时间（可不填）','Time (optional)')}<input type="time" data-draft="deadlineTime" aria-label="Deadline time" value="${esc(draft.deadlineTime??draft.time??'')}" ${!(draft.deadlineDate??draft.date)?'disabled':''}></label></div>${rowToggle(t('显示距截止还有几天','Show deadline countdown'),'showCountdown',draft.showCountdown!==false)}${rowToggle(t('在列表显示批注','Show remarks in list'),'showRemarks',draft.showRemarks!==false)}</div>`;
  return html.replace('<p class="form-error"',fields+'<p class="form-error"');
 };
 const editItem=openEditor;
 openEditor=id=>{editItem(id);if(draft.kind==='todo'){draft.deadlineDate=draft.deadlineDate??draft.date??'';draft.deadlineTime=draft.deadlineTime??draft.time??'';draft.showCountdown=draft.showCountdown!==false;draft.showRemarks=draft.showRemarks!==false;renderOverlay();}};
 document.addEventListener('change',event=>{if(event.target.dataset.draft==='deadlineDate'){const field=document.querySelector('[data-draft="deadlineTime"]');if(field){field.disabled=!draft.deadlineDate;if(!draft.deadlineDate){draft.deadlineTime='';field.value='';}}}});
 const saveItem=saveDraft;
 saveDraft=()=>{if(draft.kind==='todo'){draft.date=draft.deadlineDate||'';draft.time=draft.deadlineTime||'';draft.endDate=draft.date;draft.endTime=draft.time;}if(draft.title.trim())draft.blank=false;saveItem();};actions.save=()=>saveDraft();
 const ordinaryCalendar=calendarHTML;
 calendarHTML=()=>{
  if(ui.tab==='focus')return focusHTML();const html=ordinaryCalendar();
  if(ui.tab!=='calendar'||ui.calendarView!=='Timetable')return html;
  const template=document.createElement('template');template.innerHTML=html;template.content.querySelector('.calendar-stage').innerHTML=timetableHTML();return template.innerHTML;
 };
 function timetableHTML(){
  const dates=Array.from({length:7},(_,i)=>addDays(weekStart(ui.selected),i));
  return `${weekdaysHTML()}<div class="week-strip timetable-strip">${dates.map(date=>`<button class="day ${date===today()?'today':''}" data-action="day" data-date="${date}" aria-label="${date}">${dayNumber(date)}</button>`).join('')}</div><div class="timetable-scroll"><div class="timetable-canvas" style="height:${24*HOUR_HEIGHT}px"><div class="timetable-axis">${Array.from({length:25},(_,hour)=>`<span style="top:${hour*HOUR_HEIGHT}px">${String(hour).padStart(2,'0')}:00</span>`).join('')}</div>${dates.map(date=>{
   const segments=timedSegments(date),hasShadow=segments.some(({item})=>item.focusCoveredBy?.length);
   return `<div class="timetable-day" data-date="${date}">${segments.map(({item,start,end,lane,lanes})=>{const shadow=item.focusCoveredBy?.length,actual=item.focusActual,left=shadow?0:actual&&hasShadow?33:lane/lanes*100,width=shadow?30:actual&&hasShadow?67:100/lanes;
    return `<button class="timetable-event ${shadow?'plan-shadow':''} ${actual?'focus-actual':''}" data-action="edit" data-id="${esc(item.id)}" aria-label="${esc(item.title||t('空白任务','Blank task'))} ${item.time}–${item.endTime}" style="top:${start/60*HOUR_HEIGHT}px;height:${Math.max(15,(end-start)/60*HOUR_HEIGHT)}px;left:${left}%;width:calc(${width}% - 2px);--event-color:${esc(item.color||'#5ba6a0')}"><strong>${esc(item.title||t('空白任务','Blank task'))}</strong><small>${esc(item.time)}</small></button>`;
   }).join('')}</div>`;
  }).join('')}</div></div><p class="timetable-caption">${t('一周总览 · 点击日期进入当天时间轴','Week overview · tap a date for its daily timeline')}</p>`;
 }
 ui.focusMode='planned';ui.focusGoal=null;ui.focusPlan=null;
 function currentFocus(){return data.focusSessions.filter(session=>session.status!=='finished').sort((a,b)=>b.startedAt-a.startedAt)[0]||null;}
 function timerText(milliseconds){const seconds=Math.floor(Math.max(0,milliseconds)/1000);return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');}
 function plannedItems(){return data.items.filter(item=>item.kind==='event'&&item.taskBlock&&!item.focusActual&&item.date===today()&&data.items.some(goal=>goal.id===item.goalId&&goal.kind==='todo')).sort((a,b)=>(a.time||'').localeCompare(b.time||''));}
 function selectedFocus(){const plan=ui.focusMode==='planned'?data.items.find(item=>item.id===ui.focusPlan):null;const goal=data.items.find(item=>item.kind==='todo'&&item.id===(plan?.goalId||ui.focusGoal));return {plan,goal,ready:!!goal&&(ui.focusMode==='free'||!!plan&&FocusCore.available(plan,Date.now()))};}
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
  const active=currentFocus(),selected=selectedFocus(),mode=ui.focusMode,plans=plannedItems();
  const choices=mode==='planned'?plans.map(item=>`<button class="focus-plan ${item.id===ui.focusPlan?'selected':''} ${FocusCore.available(item,Date.now())?'':'locked'}" data-action="focus-select-plan" data-id="${esc(item.id)}" aria-pressed="${item.id===ui.focusPlan}"><span><strong>${esc(item.title)}</strong><span class="goal-origin">${esc(goalPath(data.items.find(goal=>goal.id===item.goalId)))}</span><small>${esc(item.time)}–${esc(item.endTime)} · ${FocusCore.available(item,Date.now())?t('现在可开始','Available now'):Date.now()<FocusCore.range(item)[0]?t('未到开始时间','Not started yet'):t('已过计划时段','Window ended')}</small></span>${icon(item.id===ui.focusPlan?'check':'clock')}</button>`).join('')||`<p class="note">${t('今天还没有关联目标的安排。可去日历新建，或自由选择目标。','No linked plans today. Schedule one or choose freely.')}</p>`:focusGoalList();
  const status=active?({running:t('专注中','Focusing'),paused:t('已暂停 · 不计时','Paused · not counting'),boundary:t('计划时段已结束','Planned period complete')})[active.status]:t('准备开始','Ready');
  const activeGoal=active?data.items.find(item=>item.id===active.goalId):null;
  return `<header class="header"><h1>${t('专注','Focus')}</h1>${btn('settings',t('设置','Settings'),'settings')}</header><section class="focus-timer ${active?.status==='running'?'is-running':''}"><p class="focus-state">${status}</p><h2>${esc(activeGoal?.title||active?.goalTitle||selected.goal?.title||t('选择今天要做的事','Choose what matters now'))}</h2><output class="focus-clock" aria-label="${t('专注时长','Focus duration')}">${timerText(active?FocusCore.elapsed(active,Date.now()):0)}</output>${active?.deadline?`<p class="focus-until">${t('计划结束','Planned end')} ${FocusCore.parts(active.deadline).time}${active.extended?' · '+t('正在续计','Continuing'):''}</p>`:''}<div class="focus-controls">${!active?`<button class="focus-primary" data-action="focus-start" ${!selected.ready?'disabled':''}>${t('开始专注','Start focus')}</button>`:active.status==='running'?`<button data-action="focus-pause">${t('暂停','Pause')}</button><button data-action="focus-finish">${t('结束','Finish')}</button>`:active.status==='paused'?`<button class="focus-primary" data-action="focus-resume">${t('继续','Resume')}</button><button data-action="focus-finish">${t('结束','Finish')}</button>`:`<button class="focus-primary" data-action="focus-extend">${t('继续专注','Keep focusing')}</button><button data-action="focus-finish">${t('完成本次','Finish session')}</button>`}</div>${active?.status==='boundary'?`<p class="note">${t('计划段已经停止计时。若刚才一直在继续做，选择继续专注，将从原结束时间无缝续计。','The planned segment has stopped. If you kept working, continue to count from the scheduled end.')}</p>`:''}<p class="focus-error" role="status"></p></section>${active?`<p class="focus-explanation">${t('当前专注已自动保存。暂停不计时；结束后同步任务清单和日历。先结束本次，再切换目标。','Focus is saved automatically. Pauses do not count. Finish before switching goals.')}</p>`:`<div class="focus-mode"><button data-action="focus-mode" data-mode="planned" class="${mode==='planned'?'active':''}">${t('按今日日历','Today’s plan')}</button><button data-action="focus-mode" data-mode="free" class="${mode==='free'?'active':''}">${t('自由选择目标','Choose a goal')}</button></div><div class="focus-picker">${choices}</div>`}<div class="focus-history"><h3>${t('最近专注','Recent sessions')}</h3>${data.focusSessions.filter(session=>session.status==='finished').slice(-5).reverse().map(session=>`<div><span>${esc(data.items.find(goal=>goal.id===session.goalId)?.title||session.goalTitle)}</span><time>${timerText(FocusCore.elapsed(session,Date.now()))}</time></div>`).join('')||`<p class="note">${t('每次专注，都会留下实际投入记录','Each session leaves a record of real effort')}</p>`}</div>`;
 }
 function commitSession(session,now=Date.now()){
  const previousItems=data.items,previousSessions=data.focusSessions;
  data.focusSessions=data.focusSessions.filter(item=>item.id!==session.id).concat(session);
  const snapshot=JSON.parse(JSON.stringify(session));for(const part of snapshot.segments)if(part.end===null)part.end=now;
  data.items=FocusCore.project(data.items,snapshot);
  if(!persist()){data.items=previousItems;data.focusSessions=previousSessions;return false;}return true;
 }
 actions['focus-mode']=element=>{ui.focusMode=element.dataset.mode==='free'?'free':'planned';render();};
 actions['focus-select-plan']=element=>{ui.focusPlan=element.dataset.id;render();};
 actions['focus-select-goal']=element=>{ui.focusGoal=element.dataset.id;render();};
 actions['focus-start']=()=>{
  const selected=selectedFocus();if(currentFocus()||!selected.ready){toast(t('请在可用时段选择目标','Choose an available goal and time'));return;}
  const session=FocusCore.start({id:uid(),goalId:selected.goal.id,goalTitle:selected.goal.title,color:selected.goal.color,plan:selected.plan},Date.now());
  if(commitSession(session)){render();}
 };
 for(const [action,method] of [['focus-pause','pause'],['focus-resume','resume'],['focus-extend','extend'],['focus-finish','finish']])actions[action]=()=>{const active=currentFocus();if(active&&commitSession(FocusCore[method](active,Date.now())))render();};
 const createFromFocus=actions.new;actions.new=()=>{if(ui.tab==='focus'){ui.focusMode='free';render();}else createFromFocus();};
 let lastFocusCheckpoint=0;
 function refreshFocus(){
  const active=currentFocus();if(!active)return;
  const now=Date.now(),reconciled=FocusCore.reconcile(active,now),changed=reconciled.status!==active.status;
  if(changed||now-lastFocusCheckpoint>=60000){if(commitSession(reconciled,now)){lastFocusCheckpoint=now;if(changed){render();return;}}}
  const clock=document.querySelector('.focus-clock');if(clock)clock.textContent=timerText(FocusCore.elapsed(reconciled,now));
 }
 setInterval(()=>{if(document.hidden)return;refreshFocus();const start=document.querySelector('[data-action="focus-start"]');if(start)start.disabled=!selectedFocus().ready;},1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFocus();});
 const nativeNavigation=actions.tab;actions.tab=element=>{refreshFocus();nativeNavigation(element);};
 const originalSegments=timedSegments;
 timedSegments=date=>{
  const items=data.items;try{data.items=items.map(item=>item.focusCoveredBy?.length&&item.planOriginal?{...item,...item.planOriginal}:item);return originalSegments(date);}finally{data.items=items;}
 };
 const dayTimeline=weekHTML;
 weekHTML=()=>{
  const template=document.createElement('template');template.innerHTML=dayTimeline();
  for(const block of template.content.querySelectorAll('.time-block')){
   const item=data.items.find(record=>record.id===block.dataset.id);if(!item)continue;
   const linkedGoal=data.items.find(goal=>goal.id===item.goalId);if(linkedGoal?.parentId)block.querySelector('strong').textContent=goalPath(linkedGoal);
   if(item.focusActual){block.classList.add('focus-actual');block.querySelector('.session-check')?.remove();block.style.zIndex='3';}
   if(item.focusCoveredBy?.length){block.classList.add('plan-shadow');block.style.left='0';block.style.width='30%';block.style.zIndex='1';block.querySelector('.session-check')?.remove();block.querySelector('.time-block-main')?.insertAdjacentHTML('afterbegin',`<span class="coverage-caption">${t('原计划','Original plan')}</span>`);}
   if(item.blank){block.classList.add('blank-range');block.querySelector('.session-check')?.remove();block.querySelector('strong').textContent=t('空白任务 · 点此编辑','Blank task · tap to edit');block.insertAdjacentHTML('beforeend',`<button class="range-handle start" data-action="range-handle" data-resize="start" aria-label="${t('调整开始时间','Resize start')}"></button><button class="range-handle end" data-action="range-handle" data-resize="end" aria-label="${t('调整结束时间','Resize end')}"></button>`);}
  }
  const shadows=template.content.querySelectorAll('.plan-shadow');
  let labelBottom=-1;
  for(const block of template.content.querySelectorAll('.focus-actual')){
   const trueTop=parseFloat(block.style.top),trueHeight=parseFloat(block.style.height),labelHeight=Math.max(34,trueHeight),labelTop=Math.max(trueTop,labelBottom+3);labelBottom=labelTop+labelHeight;
   if(shadows.length){block.style.left='33%';block.style.width='calc(67% - 4px)';block.classList.add('covers-plan');}else{block.style.left='6px';block.style.width='calc(100% - 10px)';}
   if(trueHeight<34||labelTop!==trueTop){block.classList.add('focus-callout');block.style.top=labelTop+'px';block.style.height=labelHeight+'px';const rail=document.createElement('i');rail.className='focus-duration-rail';Object.assign(rail.style,{top:trueTop+'px',height:Math.max(2,trueHeight)+'px',left:shadows.length?'30.5%':'0',background:block.style.getPropertyValue('--event-color')||'#b3cbd0'});template.content.querySelector('.time-blocks').append(rail);}
   block.querySelector('.time-block-main')?.insertAdjacentHTML('afterbegin',`<span class="coverage-caption">${t('实际专注','Actual focus')}</span>`);
  }
  template.content.querySelector('.daily-timeline')?.insertAdjacentHTML('beforebegin',`<p class="range-instruction">${t('长按空白处新建 · 拖动上下手柄调时 · 15 分钟吸附','Hold empty space to create · drag handles · snaps to 15 min')}</p>`);
  return template.innerHTML;
 };
 let rangePress=null;
 const minuteText=minute=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
 function rangeValue(canvas,y){return FocusCore.snap((y-canvas.getBoundingClientRect().top)/HOUR_HEIGHT*60);}
 function rangeTimes(date,start,end){return {date,time:minuteText(start),endDate:end===1440?addDays(date,1):date,endTime:end===1440?'00:00':minuteText(end)};}
 function cancelRange(){if(!rangePress)return;clearTimeout(rangePress.timer);rangePress.drag?.preview.remove();rangePress.drag?.label.remove();if(rangePress.block)rangePress.block.style.opacity='';rangePress=null;}
 function beginRangeDrag(press,type){
  const item=data.items.find(record=>record.id===press.id);if(!item)return;calendarGesture=null;
  const start=minuteOf(item.time),end=item.endDate>item.date?1440:minuteOf(item.endTime),preview=document.createElement('div'),label=document.createElement('div');
  preview.className='range-preview';Object.assign(preview.style,{top:start/60*HOUR_HEIGHT+'px',height:(end-start)/60*HOUR_HEIGHT+'px'});label.className='range-live-label';
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
    const start=Math.min(1380,rangeValue(canvas,press.y)),item={id:uid(),kind:'event',taskBlock:true,blank:true,title:'',...rangeTimes(press.date,start,start+60),calendar:'Default',color:'#879fac',importance:0,done:false,repeat:'Once',reminder:'None',notes:''};
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
  if(drag.type==='start'){drag.nextStart=Math.min(drag.end-15,minute);}
  else if(drag.type==='end'){drag.nextEnd=Math.max(drag.start+15,minute);}
  else{const delta=FocusCore.snap(Math.max(0,(event.clientY-press.canvas.getBoundingClientRect().top)/HOUR_HEIGHT*60))-FocusCore.snap((press.y-press.canvas.getBoundingClientRect().top)/HOUR_HEIGHT*60);const duration=drag.end-drag.start;drag.nextStart=Math.max(0,Math.min(1440-duration,drag.start+delta));drag.nextEnd=drag.nextStart+duration;}
  drag.preview.style.transform=`translateY(${(drag.nextStart-drag.start)/60*HOUR_HEIGHT}px) scaleY(${(drag.nextEnd-drag.nextStart)/(drag.end-drag.start)})`;
  drag.label.style.transform=`translateY(${Math.max(0,drag.nextStart/60*HOUR_HEIGHT-24)}px)`;drag.label.textContent=minuteText(drag.nextStart)+'–'+minuteText(drag.nextEnd);
 },true);
 document.addEventListener('pointerup',event=>{
  const press=rangePress;if(!press||event.pointerId!==press.pointerId)return;
  if(press.drag){event.preventDefault();event.stopPropagation();const item=data.items.find(record=>record.id===press.id),previous={...item};if(item){Object.assign(item,rangeTimes(press.date,press.drag.nextStart,press.drag.nextEnd));if(!persist())Object.assign(item,previous);}suppressCalendarClickUntil=performance.now()+600;cancelRange();render();}
  else{if(press.long)suppressCalendarClickUntil=performance.now()+600;cancelRange();}
 },true);
 document.addEventListener('pointercancel',cancelRange,true);
 document.addEventListener('touchmove',event=>{if(rangePress?.drag){event.preventDefault();event.stopPropagation();}},{capture:true,passive:false});
 document.addEventListener('contextmenu',event=>{if(event.target.closest('.blank-range'))event.preventDefault();});
 const editCalendarItem=actions.edit;actions.edit=element=>{const item=data.items.find(record=>record.id===element.dataset.id);if(item?.focusActual){showDialog(t('实际专注记录','Actual focus'),`<p>${esc(item.title)}</p><p class="note">${esc(item.date)} ${esc(item.time)}–${esc(item.endTime)}<br>${timerText(item.actualEndAt-item.actualStartAt)} · ${t('已计入目标投入；暂停时间已排除','Credited to goal; paused time excluded')}</p>`,()=>true,t('知道了','OK'));}else editCalendarItem(element);};
 const previousSettings=settingsHTML;
 settingsHTML=()=>{
  const html=previousSettings().replaceAll('1.3.0','1.4.0');if(panel.sub!=='root')return html;
  return html.replace('<div class="section-caption">',`<div class="background-choices"><div class="field-caption">${t('日历背景 · 日 / 周 / 月通用','Calendar background · all views')}</div><div>${Object.entries(themes).map(([key,label])=>`<button data-action="background-pick" data-theme="${key}" aria-pressed="${data.settings.calendarBackground===key}"><img src="background-${key}.jpg" alt="" loading="lazy"><span>${t(...label)}</span></button>`).join('')}</div><p class="background-credit">${t('自然摄影来自 Unsplash，已随应用离线打包','Nature photography from Unsplash; available offline')}</p></div><div class="section-caption">`).replace(t('月视图玻璃背景','Glass calendar background'),t('日历透明背景','Glass calendar background'));
 };
 actions['background-pick']=element=>{if(Object.hasOwn(themes,element.dataset.theme)){data.settings.calendarBackground=element.dataset.theme;persist();render();}};
 const repaint=render;
 render=function(){const oldWeekly=document.querySelector('#app > .screen .timetable-scroll'),weeklyScroll=oldWeekly?.scrollTop;repaint();const weekly=document.querySelector('#app > .screen .timetable-scroll');if(weekly)weekly.scrollTop=weeklyScroll??8*HOUR_HEIGHT;const screen=document.querySelector('#app > .screen');if(screen){screen.dataset.background=data.settings.calendarBackground;if(ui.tab==='todos')screen.classList.add('task-list-screen');}const goal=data.items.find(item=>item.id===(currentFocus()?.goalId||selectedFocus().goal?.id));if(goal?.parentId)document.querySelector('.focus-timer h2')?.insertAdjacentHTML('afterend',`<p class="focus-origin">${esc(goalPath(goal))}</p>`);enhanceChoices();};
 // Native <dialog> supplies focus containment, Escape behavior and top-layer stacking.
 // Every select keeps its original value/change contract; only its presentation changes.
 let choiceState=null;
 const choiceColors=['#8b929d','#7b8dc8','#5ba6a0','#b89b35','#c66f78'];
 function choiceLabel(select){const goal=['goalId','parentId'].includes(select.dataset.draft)?data.items.find(item=>item.id===select.value):null;return goal?goalPath(goal):select.selectedOptions[0]?.textContent||'';}
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
  const options=Array.from(state.select.options).filter(option=>!option.disabled),goalField=['goalId','parentId'].includes(state.select.dataset.draft),search=state.query.trim().toLowerCase();
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
  const goalField=['goalId','parentId'].includes(select.dataset.draft),title=select.closest('.row')?.querySelector('.label')?.textContent||select.getAttribute('aria-label')||t('选择','Choose');
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
 const overlayChoices=renderOverlay;renderOverlay=function(){overlayChoices();enhanceChoices();};
 const backBeforeChoices=window.handleNativeBack;window.handleNativeBack=()=>{if(choiceState){closeChoice();return true;}return backBeforeChoices();};
 initializeNative();refreshFocus();render();
})();
