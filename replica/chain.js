'use strict';
(() => {
  const tr = (zh, en) => data.settings.language === 'en' ? en : zh;
  const active = () => data.settings.chainLayout === true;
  const title = item => item?.title || tr('未命名', 'Untitled');
  const am = 6 * 60;
  const pm = 23 * 60;
  const historyKey = 'calendar-chain-history';
  let history = [];
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey));
    if (Array.isArray(saved)) history = saved;
  } catch {}
  let placing = '';
  let weekAnchor = null;
  const dayLabel = date => date ? date.slice(5).replace('-', '/') : tr('待排程', 'Unscheduled');
  const timeLabel = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const action = (name, label, glyph, extra = '') => btn(name, label, glyph, extra, 'chain-circle');
  const goalFor = id => data.items.find(item => item.kind === 'todo' && item.id === id);
  const eventFor = id => data.items.find(item => item.kind === 'event' && item.id === id && !item.focusActual);
  const pending = () => data.items.filter(item => item.kind === 'event' && item.taskBlock && !item.date && !item.done);
  const tone = item => {
    const color = (goalFor(item.goalId) || item).color || '';
    if (!/^#[0-9a-f]{6}$/i.test(color)) return '#08795e';
    const [red, green, blue] = color.slice(1).match(/../g).map(value => parseInt(value, 16));
    if (red >= green && green > blue * 1.22 && green > red * .68) return '#976000';
    if (red > green * 1.15) return '#b93654';
    if (blue > green || blue > red * 1.23 && blue > green * .93) return '#365aa3';
    return '#08795e';
  };
  const slots = date => timedSegments(date).filter(({item}) => item.kind === 'event');
  const legend = (fixed = true) => `<div class="chain-legend"><span><i class="chain-solid"></i>${tr('已完成','Completed')}</span><span><i></i>${tr('已排日程','Scheduled')}</span>${fixed ? `<span><i class="chain-fixed"></i>${tr('固定事件','Fixed event')}</span>` : `<span><i class="chain-empty"></i>${tr('待排程','Unscheduled')}</span>`}</div>`;
  const header = (label, controls = '') => `<header class="chain-header"><h1>${label}</h1><div>${controls}${action('settings',tr('设置','Settings'),'settings')}</div></header>`;

  function schedule() {
    const start = weekAnchor || today();
    const dates = Array.from({length: 14}, (_, index) => addDays(start, index-7));
    const last = history.find(entry => !entry.undone);
    const items = dates.map(date => eventsForDay(date).filter(item => item.kind === 'event'));
    const records = [...new Map(items.slice(7).flat().map(item => [item.id, item])).values()];
    const columns = dates.map(date => {
      const segments = slots(date).filter(segment => segment.end > am && segment.start < pm);
      const boxes = [];
      let cluster = [], laneEnds = [], clusterEnd = -1;
      const finishCluster = () => {
        for (const box of cluster) box.lanes = laneEnds.length;
        cluster = []; laneEnds = []; clusterEnd = -1;
      };
      for (const segment of segments) {
        const top = (Math.max(am,segment.start)-am)*70/60;
        const height = Math.min(1190-top, Math.max(14,(Math.min(pm,segment.end)-Math.max(am,segment.start))*70/60-2));
        if (top >= clusterEnd) finishCluster();
        let lane = laneEnds.findIndex(end => end <= top);
        if (lane < 0) lane = laneEnds.length;
        laneEnds[lane] = top+height+2;
        clusterEnd = Math.max(clusterEnd, laneEnds[lane]);
        const box = {...segment, top, height, lane};
        boxes.push(box);
        cluster.push(box);
      }
      finishCluster();
      return `<div class="chain-day-column" data-chain-date="${date}">
        <button class="chain-grid-target" aria-label="${date} ${tr('安排时段','Schedule a block')}" data-action="chain-cell" data-date="${date}"></button>
        ${boxes.map(({item,start,end,top,height,lane,lanes}) => {
          const goal=goalFor(item.goalId);
          let root=goal;
          const seen=new Set();
          while(root?.parentId && !seen.has(root.id) && goalFor(root.parentId)){seen.add(root.id);root=goalFor(root.parentId);}
          const heading=title(root||item);
          const details=[...new Set([goal&&goal!==root?title(goal):'',title(item)].filter(text=>text&&text!==heading))].join(' · ');
          const done=item.focusActual||item.done;
          const description=[heading,details,timeLabel(start)+'–'+timeLabel(end)].filter(Boolean).join(' · ');
          return `<button class="chain-block ${!item.taskBlock&&!item.focusActual?'is-fixed':''} ${done?'is-done':''}" style="--tone:${tone(item)};top:${top}px;height:${height}px;left:${lane/lanes*100}%;width:calc(${100/lanes}% - 2px)" data-action="chain-block" data-id="${esc(item.id)}" ${!done?'draggable="true"':''} aria-label="${esc(description)}" title="${esc(description)}"><span class="chain-block-copy"><strong>${esc(heading)}</strong>${details?`<small>${esc(details)}</small>`:''}</span></button>`;
        }).join('')}
      </div>`;
    }).join('');
    const notes = items.slice(7).flatMap((entries,index) => {
      const visible = new Set(slots(dates[index+7]).filter(({start,end})=>end>am&&start<pm).map(({item})=>item.id));
      return entries.filter(item=>!visible.has(item.id)).map(item=>`<button data-action="edit" data-id="${esc(item.id)}">${dayLabel(dates[index+7])} · ${esc(title(item))}</button>`);
    });
    const now = FocusCore.parts(Date.now());
    const elapsed = minuteOf(now.time);
    return `<header class="chain-header chain-schedule-header"><h1>${tr('日程表','Schedule')}</h1>
      <div class="chain-weekbar">${action('chain-week',tr('上一周','Previous week'),'back','data-step="-7"')}<strong>${dayLabel(start)} – ${dayLabel(dates.at(-1))}</strong>${action('chain-week',tr('下一周','Next week'),'next','data-step="7"')}</div>
      ${action('chain-history',tr('改动记录','Change history'),'history')}</header>
      ${last ? `<div class="chain-feedback"><span>${esc(summary(last))}</span><button data-action="chain-undo" data-id="${last.id}">${tr('撤销','Undo')}</button></div>` : `<p class="chain-count">${tr('本周','This week')} <b>${records.length}</b> · ${tr('已完成','Completed')} <b>${records.filter(item=>item.focusActual||item.done).length}</b></p>`}
      <section class="chain-card chain-week"><div class="chain-week-scroll" data-anchor="${start}"><div class="chain-dates"><button class="chain-today" data-action="chain-today" aria-label="${tr('回到今天','Back to today')}">${tr('今','Now')}</button>${dates.map((date,index)=>`<div><small>${tr('周'+'日一二三四五六'[parseDate(date).getDay()],['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseDate(date).getDay()])}</small><b class="${today()===date?'is-current':''}">${Number(date.slice(8))}</b></div>`).join('')}</div>
      <div class="chain-grid"><div class="chain-hours">${Array.from({length:9},(_,index)=>`<span style="top:${index * 120/(pm-am)*100}%">${index*2+6}</span>`).join('')}</div>${columns}
      ${dates.includes(now.date)&&elapsed>=am&&elapsed<pm ? `<span class="chain-now" style="--day:${dates.indexOf(now.date)};--top:${(elapsed-am)/(pm-am)*100}%"></span>` : ''}</div></div>${legend()}${notes.length ? `<div class="chain-extra">${notes.join('')}</div>` : ''}</section>
      `;
  }

  function presets() {
    return `<section class="chain-card chain-queue calendar-presets"><header><h2>${tr('预设任务块','Task presets')}</h2><button data-action="chain-add-block">${tr('＋ 设置','＋ Configure')}</button></header>
      <div class="chain-pending">${pending().map(item=>`<div class="preset-entry"><button class="preset-chip" style="--tone:${tone(item)}" data-action="chain-place" data-id="${esc(item.id)}" aria-pressed="${placing===item.id}"><b>${esc(title(item))}</b><small>${(minuteOf(item.endTime)??60)-(minuteOf(item.time)??0)} ${tr('分钟','min')}</small></button>${item.preset?`<button class="preset-remove" data-action="preset-remove" data-id="${esc(item.id)}" aria-label="${tr('移除预设','Remove preset')}">×</button>`:''}</div>`).join('')}</div>
      <p>${placing?tr('点击日期或时间放置','Tap a date or time to place'):tr('长按任务块，拖到日期或时间','Hold and drag a preset onto a date or time')}</p></section>`;
  }

  function goals() {
    const all = data.items.filter(item=>item.kind==='todo');
    const blocks = data.items.filter(item=>item.kind==='event'&&(item.taskBlock||item.focusActual));
    const children = new Map();
    for(const item of all) {
      const key = item.parentId || '';
      if(!children.has(key)) children.set(key, []);
      children.get(key).push(item);
    }
    function branch(item, parents = new Set()) {
      if(parents.has(item.id)) return '';
      const next = new Set([...parents,item.id]);
      const related = blocks.filter(block=>block.goalId===item.id);
      const descendants = children.get(item.id)||[];
      return `<div class="chain-step" style="--tone:${tone(item)}"><div class="chain-step-row">
        <button data-action="complete" data-id="${esc(item.id)}" class="chain-step-check" aria-pressed="${!!item.done}" aria-label="${esc(tr('完成','Complete')+' '+title(item))}">${item.done?icon('check'):''}</button>
        <button class="chain-step-title" data-action="edit" data-id="${esc(item.id)}"><b>${esc(title(item))}</b>${item.notes?`<small>${esc(item.notes)}</small>`:''}</button>
        <div class="chain-block-dots">${related.slice(0,6).map(block=>`<button data-action="${block.date?'chain-block':'chain-place'}" data-id="${esc(block.id)}" class="${block.done||block.focusActual?'chain-solid':block.date?'':'chain-empty'}" aria-label="${esc(title(block)+' · '+dayLabel(block.date))}"></button>`).join('')}${related.length>6?`<small>+${related.length-6}</small>`:''}</div>
        <button class="chain-step-add" data-action="chain-add-block" data-id="${esc(item.id)}" aria-label="${tr('添加专注块','Add focus block')}">+</button></div>
        ${descendants.map(child=>branch(child,next)).join('')}</div>`;
    }
    return `${header(tr('目标','Goals'),action('new',tr('新建目标','New goal'),'plus'))}${legend(false)}
      ${all.filter(item=>!item.parentId||!goalFor(item.parentId)).map(item=>`<section class="chain-card chain-goal">${branch(item)}<button class="chain-add-step" data-action="chain-add-step" data-id="${esc(item.id)}">${tr('＋ 加一步','＋ Add step')}</button></section>`).join('') || `<section class="chain-card chain-queue"><p>${tr('创建目标，再把专注块排进日程。','Create a goal and schedule focus blocks.')}</p></section>`}`;
  }

  function summary(entry) {
    const verb = entry.after ? (entry.before ? tr('调整了','Updated') : tr('添加了','Added')) : tr('删除了','Deleted');
    return `${verb} ${title(entry.after || entry.before)}`;
  }
  function storeHistory() {
    try { localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 60))); } catch {}
  }
  function log(before, after) {
    const item=after||before;
    if (item?.kind !== 'event' || item.focusActual || JSON.stringify(before) === JSON.stringify(after)) return;
    history = [{id: uid(), at:Date.now(), before, after}, ...history].slice(0,60);
    storeHistory();
  }
  const location = item => item?.date ? `${dayLabel(item.date)} ${item.time||''}${item.endTime?'–'+item.endTime:''}` : tr('待排程','Unscheduled');
  function historyHTML() {
    let previousDate='';
    const entries=history.map(entry=>{
      const {date,time}=FocusCore.parts(entry.at);
      const heading=previousDate===date?'':`<h2 class="chain-record-date">${date===today()?tr('今天','Today'):date===addDays(today(),-1)?tr('昨天','Yesterday'):dayLabel(date)}</h2>`;
      previousDate=date;
      return `${heading}<article class="chain-card chain-history-entry"><div><span class="chain-avatar">${tr('你','You')}</span><strong>${esc(summary(entry))}</strong><time>${time}</time>${entry.undone?`<small>${tr('已撤销','Undone')}</small>`:`<button data-action="chain-undo" data-id="${entry.id}">${tr('撤销','Undo')}</button>`}</div><p>${entry.before?esc(location(entry.before)):''}${entry.before&&entry.after?' → ':''}${entry.after?esc(location(entry.after)):''}</p></article>`;
    });
    return `<section class="page chain-history-page"><header class="chain-header">${action('close-panel',tr('返回','Back'),'back')}<h1>${tr('改动记录','Change history')}</h1></header>
      ${entries.length ? entries.join('') : `<div class="chain-card chain-queue"><p>${tr('添加、移动或删除日程后，改动会出现在这里。','Schedule changes will appear here.')}</p></div>`}</section>`;
  }
  actions['chain-history'] = () => openPanel('chain-history');
  actions['chain-undo'] = button => {
    const entry = history.find(record=>record.id===button.dataset.id&&!record.undone);
    if(!entry)return;
    const id=(entry.after||entry.before).id;
    const current=data.items.find(item=>item.id===id)||null;
    if(JSON.stringify(entry.after)!==JSON.stringify(current) || data.focusSessions.some(session=>session.planId===id)) {
      toast(tr('这条安排已有后续修改或专注记录','This block has later changes or focus records'));
      return;
    }
    const previous = data.items;
    data.items = [...previous.filter(item=>item.id!==id), ...(entry.before?[entry.before]:[])];
    if(!persist()) { data.items=previous; return; }
    entry.undone = true;
    storeHistory();
    render();
  };

  function writeRecord(before, after) {
    const previous = data.items;
    data.items = before ? previous.map(item=>item.id===before.id?after:item) : [...previous,after];
    if(!persist()) { data.items=previous;return false; }
    log(before,after);
    placing = '';
    render();
    return true;
  }
  function place(id,date,minutes) {
    const item = eventFor(id);
    if(!item || item.done || data.focusSessions.some(session=>session.planId===id)) return;
    const before = item.planOriginal || item;
    const duration = (item.date ? GoalCore.durationMinutes(before) : minuteOf(item.endTime) - minuteOf(item.time)) || 60;
    const finish = minutes+duration;
    const {preset,...fields}=item;
    writeRecord(preset?null:item,{...fields,id:preset?uid():item.id,date,time:timeLabel(minutes),endDate:addDays(date,Math.floor(finish/1440)),endTime:timeLabel(finish%1440),allDay:false});
  }
  actions['chain-add-block'] = button => {
    const available = data.items.filter(item=>item.kind==='todo'&&!item.done);
    if(!available.length) {toast(tr('先创建一个目标','Create a goal first'));return;}
    const reusable=!!button.closest?.('.calendar-presets');
    showDialog(tr('添加专注块','Add focus block'), `<label>${tr('目标','Goal')}<select id="chain-goal">${available.map(item=>`<option value="${esc(item.id)}" ${item.id===button.dataset.id?'selected':''}>${esc(title(goalFor(item.parentId) || item)+(item.parentId&&goalFor(item.parentId)?' › '+title(item):''))}</option>`).join('')}</select></label><label>${tr('时长（分钟）','Duration (minutes)')}<input id="chain-duration" type="number" min="15" max="480" step="5" value="60"></label>`, () => {
      const goal = goalFor($('#chain-goal').value), minutes = Number($('#chain-duration').value);
      if(!goal || !Number.isInteger(minutes) || minutes<15 || minutes>480) {toast(tr('时长请输入 15–480 分钟','Enter 15–480 minutes'));return false;}
      const block={id:uid(),kind:'event',taskBlock:true,preset:reusable,goalId:goal.id,title:goal.title,color:goal.color||'#5ba6a0',calendar:'Default',date:'',endDate:'',time:'00:00',endTime:timeLabel(minutes),repeat:'Once',reminder:'None'};
      if(!writeRecord(null,block))return false;
      if(ui.tab==='focus')actions['chain-place']({dataset:{id:block.id}});
      return true;
    },tr('添加','Add'));
  };
  actions['chain-add-step'] = button => {
    openEditor();
    draft.parentId=button.dataset.id;
    renderOverlay();
  };
  actions['chain-place'] = button => {
    modal=null;
    placing = placing===button.dataset.id?'':button.dataset.id;
    ui.tab = 'calendar';
    render();
  };
  function minutesAt(column, y) {
    const bounds = column.getBoundingClientRect();
    return Math.min(pm-15,Math.max(am,Math.floor(((y-bounds.top)/bounds.height*(pm-am)+am)/15)*15));
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('.chain-grid-target');
    if(target) target.dataset.minute = event.detail ? minutesAt(target.parentElement,event.clientY) : 9*60;
  },true);
  actions['chain-cell'] = button => {
    const {date,minute} = button.dataset;
    if(placing) { place(placing,date,Number(minute));return; }
    const previous = ui.selected;
    ui.selected = date;
    openEditor();
    Object.assign(draft,{date,endDate:date,time:timeLabel(Number(minute)),endTime:timeLabel(Math.min(1439,Number(minute)+60))});
    ui.selected=previous;
    renderOverlay();
  };
  actions['chain-block'] = button => {
    const item = data.items.find(record=>record.id===button.dataset.id);
    if(!item)return;
    if(item.focusActual || matchMedia('(min-width:740px)').matches) { actions.edit(button);return; }
    if(item.done || data.focusSessions.some(session=>session.planId===item.id)) {actions.edit(button);return;}
    showDialog(title(item),`<p class="note">${esc(location(item))}</p><div class="chain-dialog-actions"><button data-action="chain-edit" data-id="${esc(item.id)}">${tr('编辑详情','Edit details')}</button><button data-action="chain-place" data-id="${esc(item.id)}">${tr('移动到其他时段','Move to another time')}</button></div>`,()=>true,tr('关闭','Close'));
  };
  actions['chain-edit'] = button => actions.edit(button);
  let dragged = '';
  document.addEventListener('dragstart', event => {
    const block = event.target.closest('.chain-block[draggable],.chain-pending button');
    if(!block)return;
    dragged=block.dataset.id;
    event.dataTransfer.setData('text/plain',dragged);
    event.dataTransfer.effectAllowed='move';
  });
  document.addEventListener('dragend',()=>{dragged='';});
  document.addEventListener('dragover',event=>{if(dragged&&event.target.closest('.chain-day-column'))event.preventDefault();});
  document.addEventListener('drop',event=>{
    const column=event.target.closest('.chain-day-column');
    if(!dragged||!column)return;
    event.preventDefault();
    place(dragged,column.dataset.chainDate,minutesAt(column,event.clientY));
    dragged='';
  });
  actions['chain-week'] = button => {
    weekAnchor=addDays(weekAnchor||today(),Number(button.dataset.step));
    ui.selected=weekAnchor;
    ui.month=ui.selected.slice(0,7);
    render();
  };
  actions['chain-today'] = () => {
    ui.tab='calendar';
    if(ui.calendarView==='Dashboard')ui.calendarView='Week';
    weekAnchor=null;
    const scroller=$('.chain-week-scroll');if(scroller)scroller.dataset.anchor='';
    ui.selected=today();
    ui.month=ui.selected.slice(0,7);
    render();
  };
  actions['chain-stats'] = () => {
    ui.tab='calendar';
    actions.dashboard();
  };
  const previousSave = actions.save;
  actions.save = () => {
    const id=draft?.id, before=eventFor(id);
    previousSave();
    if(active()&&!panel) { log(before||null,eventFor(id)||null);render(); }
  };
  const previousDelete=deleteIds;
  deleteIds=ids=>{
    const removed=active()?ids.map(eventFor).filter(Boolean):[];
    previousDelete(ids);
    for(const item of removed)if(!eventFor(item.id))log(item,null);
  };
  const previousSettings = settingsHTML;
  settingsHTML = () => {
    const html=previousSettings();
    if(panel.sub!=='root') return html;
    return html.replace(/(<\/div>)(?=<div class="setting-card"|<div class="section-caption")/, `$1<div class="setting-card">${rowToggle(tr('启用新版排程','Use new schedule layout'),'chainLayout',active(),true,tr('仅替换课表周视图，保留日、月、年视图','Replace weekly timetable only'))}</div>`);
  };
  const previousPanel = panelHTML;
  panelHTML = () => panel.type==='chain-history'?historyHTML():previousPanel();
  actions['preset-remove'] = button => {
    const item=eventFor(button.dataset.id);
    if(!item?.preset)return;
    const previous=data.items;
    data.items=previous.filter(record=>record.id!==item.id);
    if(!persist())data.items=previous;
    if(placing===item.id)placing='';
    render();
  };

  function targetAt(x,y) {
    const element=document.elementFromPoint(x,y);
    if(!element?.closest('#app > .screen'))return null;
    const column=element.closest('.chain-day-column');
    if(column)return {node:column,date:column.dataset.chainDate,minute:minutesAt(column,y)};
    const week=element.closest('.timetable-day');
    if(week){
      const axis=week.closest('.timetable-canvas').dataset;
      return {node:week,date:week.dataset.date,minute:Number(axis.start)+(y-week.getBoundingClientRect().top)/Number(axis.hourHeight)*60};
    }
    const canvas=element.closest('.time-canvas');
    if(canvas)return {node:canvas,date:ui.selected,minute:dayMinute(y-canvas.getBoundingClientRect().top)};
    const clock=element.closest('.schedule-clock');
    if(clock){
      const rect=clock.getBoundingClientRect(),angle=Math.atan2(x-rect.left-rect.width/2,rect.top+rect.height/2-y);
      return {node:clock,date:ui.selected,minute:(angle/(2*Math.PI)*1440+1440)%1440};
    }
    const date=element.closest('[data-drop-date], [data-date], [data-month]');
    if(date)return {node:date,date:date.dataset.dropDate||date.dataset.date||date.dataset.month+'-01',minute:540};
    const calendar=element.closest('.calendar-stage,.tablet-agenda');
    return calendar?{node:calendar,date:ui.selected,minute:540}:null;
  }
  function dropPreset(id,target){
    if(target && Number.isFinite(target.minute))place(id,target.date,Math.max(0,Math.min(1425,Math.floor(target.minute/15)*15)));
  }

  let press=null, ignoreClickUntil=0;
  function updateDrag(current){
    if(press!==current)return;
    const scroller=document.elementFromPoint(current.x,current.y)?.closest('.chain-week-scroll,.daily-timeline,.timetable-scroll,.month-scroll');
    if(scroller){
      const rect=scroller.getBoundingClientRect();
      if(current.y<rect.top+26)scroller.scrollTop-=7;
      if(current.y>rect.bottom-26)scroller.scrollTop+=7;
      if(current.x<rect.left+26)scroller.scrollLeft-=7;
      if(current.x>rect.right-26)scroller.scrollLeft+=7;
    }
    const target=targetAt(current.x,current.y);
    if(current.target?.node!==target?.node){
      current.target?.node.classList.remove('preset-drop-highlight');
      target?.node.classList.add('preset-drop-highlight');
    }
    current.target=target;
    current.ghost.style.transform=`translate(${current.x+10}px,${current.y-34}px)`;
    current.frame=requestAnimationFrame(()=>updateDrag(current));
  }
  function finishDrag(event,commit){
    if(!press || press.pointer!==event.pointerId)return;
    const current=press;
    press=null;
    clearTimeout(current.timer);
    cancelAnimationFrame(current.frame);
    current.target?.node.classList.remove('preset-drop-highlight');
    if(!current.ghost)return;
    current.ghost.remove();
    ignoreClickUntil=performance.now()+350;
    if(commit)dropPreset(current.id,targetAt(event.clientX,event.clientY));
  }
  document.addEventListener('pointerdown',event=>{
    const chip=event.target.closest('.preset-chip');
    if(!chip||!event.isPrimary||event.button!==0)return;
    const current={pointer:event.pointerId,id:chip.dataset.id,x:event.clientX,y:event.clientY};
    press=current;
    chip.setPointerCapture(event.pointerId);
    current.timer=setTimeout(()=>{
      current.ghost=document.createElement('div');
      current.ghost.className='preset-drag-ghost';
      current.ghost.textContent=title(eventFor(current.id));
      document.body.append(current.ghost);
      updateDrag(current);
    },350);
  });
  document.addEventListener('pointermove',event=>{if(press?.pointer===event.pointerId){press.x=event.clientX;press.y=event.clientY;}});
  document.addEventListener('pointerup',event=>finishDrag(event,true));
  for(const type of ['pointercancel','lostpointercapture'])document.addEventListener(type,event=>finishDrag(event,false));
  document.addEventListener('contextmenu',event=>{if(event.target.closest('.preset-chip'))event.preventDefault();});
  document.addEventListener('click',event=>{
    if(event.target.closest('.preset-chip')&&performance.now()<ignoreClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
    if(!placing||event.target.closest('.chain-grid-target')||!event.target.closest('.calendar-stage,.tablet-agenda')||event.target.closest('.calendar-presets'))return;
    const target=targetAt(event.clientX,event.clientY);
    if(target){event.preventDefault();event.stopImmediatePropagation();dropPreset(placing,target);}
  },true);

  function fitBlocks(scroller){
    for(const block of scroller.querySelectorAll('.chain-block')){
      const copy=block.firstElementChild,heading=copy.querySelector('strong'),detail=copy.querySelector('small');
      if(!block.clientHeight)continue;
      let low=.1,high=matchMedia('(min-width:740px)').matches?14:12;
      const apply=size=>{heading.style.fontSize=size+'px';if(detail)detail.style.fontSize=size*.78+'px';};
      for(let step=0;step<9;step++){
        const size=(low+high)/2;apply(size);
        if(copy.scrollHeight<=block.clientHeight-2 && copy.scrollWidth<=block.clientWidth-2)low=size;
        else high=size;
      }
      apply(low);
    }
  }
  const weekResize=new ResizeObserver(entries=>{const surface=entries[0]?.target;if(surface?.isConnected)fitBlocks(surface);});
  const previousRender=render;
  render=()=>{
    const old=$('#app > .screen .chain-week-scroll');
    const anchor=old?.dataset.anchor,left=old?.scrollLeft,top=old?.scrollTop;
    if(!old)weekAnchor=null;
    weekResize.disconnect();
    previousRender();
    const screen=$('#app > .screen');
    if(!screen||ui.batch||ui.tab!=='calendar')return;
    const tablet=matchMedia('(min-width:740px)').matches;
    let sidebar=screen.querySelector('.tablet-agenda');
    if(active()&&ui.calendarView==='Timetable'){
      const views=screen.querySelector('.tablet-views');
      screen.innerHTML=schedule();
      screen.classList.add('chain-screen');
      if(tablet&&views)screen.querySelector('.chain-header').after(views);
      if(tablet&&sidebar)screen.append(sidebar);
      const scroller=screen.querySelector('.chain-week-scroll');
      if(anchor===scroller.dataset.anchor){scroller.scrollLeft=left;scroller.scrollTop=top;}
      else{
        const todayColumn=scroller.querySelector(`[data-chain-date="${scroller.dataset.anchor}"]`);
        scroller.scrollLeft=todayColumn.offsetLeft-scroller.querySelector('.chain-hours').offsetWidth;
        scroller.scrollTop=140;
      }
      fitBlocks(scroller);
      weekResize.observe(scroller);
    }
    if(tablet){
      if(!sidebar){sidebar=document.createElement('aside');sidebar.className='tablet-agenda';screen.append(sidebar);}
      sidebar.classList.add('calendar-workspace-side');
      sidebar.insertAdjacentHTML('afterbegin',presets());
    }else screen.insertAdjacentHTML('beforeend',presets());
  };
  const workspaceOverlay=renderOverlay;
  renderOverlay=()=>{
    workspaceOverlay();
    $('#overlay > .page:not(.navigation-outgoing)')?.classList.toggle('tablet-event-editor',panel?.type==='editor'&&draft?.kind==='event');
  };
  document.addEventListener('change', event=>{
    if(event.target.dataset.setting==='chainLayout') { placing=''; render(); }
  });
  paths.history='M3 11a9 9 0 1 1 2.5 7M3 5v6h6M12 7v5l3 2';
  render();
})();
