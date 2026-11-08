'use strict';
(()=>{
 const tr=(zh,en)=>data.settings.language==='en'?en:zh;
 const layout=matchMedia('(min-width: 740px)');
 const names={Week:['日','Day'],Timetable:['周','Week'],Month:['月','Month'],Year:['年','Year'],Dashboard:['数据','Stats']};
 const range=item=>item.allDay?tr('全天','All day'):[item.time,item.endTime].filter(Boolean).join('–')||tr('未设时间','No time');
 const label=item=>item.title||tr('未命名事项','Untitled');
 function agenda(){
  const records=eventsForDay(ui.selected).slice().sort((a,b)=>(a.allDay?'':a.time||'99').localeCompare(b.allDay?'':b.time||'99'));
  const goals=new Map(data.items.filter(x=>x.kind==='todo').map(x=>[x.id,x]));
  const goalsFor=item=>{const result=[],seen=new Set();let goal=goals.get(item.goalId);while(goal&&!seen.has(goal.id)){seen.add(goal.id);result.unshift(label(goal));goal=goals.get(goal.parentId);}return result.join(' › ');};
  const details=records.map(item=>{const title=label(item),goal=goalsFor(item);return `<button class="tablet-record" data-action="edit" data-id="${esc(item.id)}"><span class="tablet-record-time">${esc(range(item))}</span><span class="tablet-record-copy"><strong>${esc(title)}</strong>${goal&&goal!==title?`<small>${esc(goal)}</small>`:''}${item.location?`<small>${esc(item.location)}</small>`:''}${item.notes?`<small>${esc(item.notes)}</small>`:''}${item.focusActual?`<small>${tr('实际专注','Actual focus')}</small>`:item.done?`<small>${tr('已完成','Done')}</small>`:''}</span></button>`;}).join('');
  return `<aside class="tablet-agenda" aria-label="${tr('当天安排','Daily agenda')}"><header><small>${esc(ui.selected)}</small><h2>${tr('当天安排','Daily agenda')} <span>${records.length}</span></h2></header><div class="tablet-records">${details||`<p>${tr('当天没有安排','No events for this day')}</p>`}</div></aside>`;
 }
 function decorate(){
  const screen=$('#app > .screen');if(!screen||!layout.matches||ui.tab!=='calendar'||ui.batch)return;
  const head=screen.querySelector('.calendar-head');if(!head)return;
  head.insertAdjacentHTML('afterend',`<nav class="tablet-views" aria-label="${tr('日历视图','Calendar views')}">${Object.entries(names).map(([view,title])=>`<button data-action="tablet-view" data-view="${view}" aria-pressed="${ui.calendarView===view}">${tr(...title)}</button>`).join('')}</nav>`);
  screen.insertAdjacentHTML('beforeend',agenda());
 }
 actions['tablet-view']=button=>{const view=button.dataset.view;if(!Object.hasOwn(names,view))return;if(view==='Dashboard'){ui.calendarView=view;menu=null;render();}else switchCalendarLevel(view,button);};
 const previousRender=render;render=function(){previousRender();decorate();};
 layout.addEventListener('change',()=>render());
 decorate();
})();
