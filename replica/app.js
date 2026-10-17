'use strict';
const $ = s=>document.querySelector(s);
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={plus:'M12 4v16M4 12h16',more:'M12 5h.01M12 12h.01M12 19h.01',back:'M15 5l-7 7 7 7',next:'M9 5l7 7-7 7',down:'M6 9l6 6 6-6',check:'M5 12l4 4L19 6',list:'M5 5h14v5H5zM5 14h14v5H5z',timeline:'M4 4v16M8 5h12v5H8zM8 14h12v5H8z',grid:'M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16',calendar:'M5 5h14v15H5zM8 3v4M16 3v4M5 10h14',sort:'M4 5h12M4 11h9M4 17h7M18 10v10M15 17l3 3 3-3',flag:'M5 21V4M5 4c5-4 8 4 14 0v10c-6 4-9-4-14 0',clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2',bell:'M5 17c2-2 2-4 2-8a5 5 0 0 1 10 0c0 4 0 6 2 8H5M10 21h4',trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',search:'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16M16 16l6 6',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',mic:'M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0V4M5 10v2a7 7 0 0 0 14 0v-2M12 19v4M8 23h8',download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',edit:'M15 3l6 6M4 20l4-1L21 6l-3-3L5 16l-1 4',location:'M12 22s8-8 8-14a8 8 0 0 0-16 0c0 6 8 14 8 14M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6',close:'M5 5l14 14M19 5L5 19',repeat:'M3 8h15l-4-4M21 16H6l4 4M18 8l3 3M6 16l-3-3',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2'};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.calendar}"/></svg>`;
const btn=(action,label,ico,extra='',cls='icon-button')=>`<button class="${cls}" data-action="${action}" aria-label="${esc(label)}" ${extra}>${ico?icon(ico):(cls.startsWith('check')?'':esc(label))}</button>`;
const dateString=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(x=>p.find(y=>y.type===x).value).join('-')};
const parseDate=s=>new Date(s+'T12:00:00');
const addDays=(s,n)=>{const d=parseDate(s);d.setDate(d.getDate()+n);return dateString(d)};
const uid=()=>globalThis.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const STORE='calendar-video-replica-v1';
const defaultSettings={weekStart:0,showCompleted:false,grouped:true,sortPriority:false,fixedTimezone:false,meeting:true,weather:false,holidays:true,international:false,subscriptions:true,recommendations:false,personalized:false,weekEvents:true,reminder:'15 minutes before',reminderType:'Notification',sound:'Cozy',defaultType:'Default',categories:['Default','Birthday','Anniversary','Countdown','learning','Course schedule']};
const seed=()=>({version:1,settings:{...defaultSettings},items:[{id:'sample-word',kind:'todo',title:'记得签到 中午记得背单词 很重要',date:'2026-05-16',time:'19:09',priority:true,color:'#b89b35',repeat:'Every week',reminder:'15 minutes before',calendar:'learning',done:false},{id:'sample-contest',kind:'todo',title:'大学生数学竞赛',date:'',time:'',priority:false,color:'#b89b35',repeat:'Once',reminder:'None',calendar:'Default',done:false},{id:'sample-signup',kind:'event',title:'志愿报名！！',date:today(),time:'21:28',endDate:today(),endTime:'22:28',color:'#b89b35',calendar:'Default',category:'Standard event',repeat:'Once',reminder:'15 minutes before',done:false},{id:'sample-birthday',kind:'event',title:'爷爷 · 生日',date:addDays(today(),7),time:'',allDay:true,endDate:addDays(today(),7),color:'#5ba6a0',calendar:'Birthday',category:'Birthday',repeat:'Every year',reminder:'1 day before',done:false}],subscriptions:{holidays:true,birthdays:true,weather:false,history:false},courses:[]});
let data;try{data=JSON.parse(localStorage.getItem(STORE))||seed();if(!Array.isArray(data.items))throw Error();data.settings={...defaultSettings,...data.settings};data.subscriptions={...seed().subscriptions,...data.subscriptions};data.courses=data.courses||[]}catch{data=seed()}
let ui={tab:'todos',filter:'All',calendarView:'Timeline',selected:today(),month:today().slice(0,7),expanded:false,collapsed:new Set(),batch:false,selectedIds:new Set()};
let panel=null,menu=null,modal=null,draft=null,voice=null,toastTimer;
function persist(){try{localStorage.setItem(STORE,JSON.stringify(data));queueNativeSync();return true}catch{toast('无法保存：浏览器存储空间不足');return false}}
function toast(message){const e=$('#toast');e.textContent=message;e.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('visible'),2800)}
function taskHTML(item,batch=false){const meta=[item.date?`${Number(item.date.slice(5,7))}/${Number(item.date.slice(8))}${item.time?', '+item.time:''}`:'',item.repeat&&item.repeat!=='Once'?item.repeat:'',item.allDay?'All day':''].filter(Boolean).join(' · ');return `<article class="task ${item.done?'done':''} ${item.kind==='event'?'event':''} ${ui.selectedIds.has(item.id)?'selected':''}" style="--task-color:${esc(item.color||'#b89b35')}"><button class="task-main" data-action="${batch?'select':'edit'}" data-id="${esc(item.id)}"><div class="task-title">${esc(item.title)}</div>${meta?`<div class="task-meta">${icon(item.repeat&&item.repeat!=='Once'?'repeat':'clock')}${esc(meta)}</div>`:''}</button>${item.priority?`<span class="flag small-icon">${icon('flag')}</span>`:''}${btn(batch?'select':'complete',batch?'Select '+item.title:'Complete '+item.title,null,`data-id="${esc(item.id)}" aria-pressed="${batch?ui.selectedIds.has(item.id):item.done}"`,`check ${batch?'batch-check':''} ${(batch?ui.selectedIds.has(item.id):item.done)?'checked':''}`).replace('</button>',`<span>${(batch?ui.selectedIds.has(item.id):item.done)?icon('check'):''}</span></button>`)}</article>`}
const included=item=>data.settings.categories.includes(item.calendar||'Default');
function filteredTodos(){return data.items.filter(x=>x.kind==='todo'&&included(x)&&(data.settings.showCompleted||!x.done)).filter(x=>{switch(ui.filter){case'In progress':return !x.done;case'Overdue':return !x.done&&x.date&&x.date<today();case'Today':return x.date===today();case'Next 7 days':return x.date>=today()&&x.date<=addDays(today(),6);case'High priority':return x.priority;default:return true}}).sort((a,b)=>data.settings.sortPriority?(Number(b.priority)-Number(a.priority)):0)}
function groupHTML(label,items){if(!items.length)return '';return `<section class="group"><button class="group-heading ${ui.collapsed.has(label)?'closed':''}" data-action="collapse" data-label="${label}" aria-expanded="${!ui.collapsed.has(label)}"><span>${label}</span><span class="count">${items.length}</span>${icon('down')}</button>${ui.collapsed.has(label)?'':items.map(x=>taskHTML(x,ui.batch)).join('')}</section>`}
function todosHTML(){const items=filteredTodos();if(!data.settings.grouped)return items.map(x=>taskHTML(x,ui.batch)).join('')||emptyHTML();const groups={Overdue:[],Today:[],Upcoming:[],Unscheduled:[],Done:[]};items.forEach(x=>groups[x.done?'Done':!x.date?'Unscheduled':x.date<today()?'Overdue':x.date===today()?'Today':'Upcoming'].push(x));return Object.entries(groups).map(([k,v])=>groupHTML(k,v)).join('')||emptyHTML()}
function emptyHTML(){return `<div class="empty">${icon('calendar')}<div>No to-dos. Create one to get started.</div><button data-action="new">＋ New to-do</button></div>`}
function dockHTML(){return `<nav class="dock" aria-label="Main navigation">${btn('view-menu',ui.tab==='todos'?'To-do options':'Calendar views',ui.tab==='todos'?'sort':ui.calendarView==='Timeline'?'timeline':ui.calendarView==='Overview'?'grid':'list','','round')}<div class="switcher"><button class="${ui.tab==='calendar'?'active':''}" data-action="tab" data-tab="calendar">Calendar</button><button class="${ui.tab==='todos'?'active':''}" data-action="tab" data-tab="todos">To-dos</button></div>${btn('new','New event or to-do','plus','','round')}</nav>`}
function batchFooter(){return `<nav class="batch-footer">${[['batch-priority','Priority','flag'],['batch-reminder','Reminder','bell'],['batch-delete','Delete','trash']].map(([a,t,i])=>`<button data-action="${a}" ${!ui.selectedIds.size?'disabled':''}>${icon(i)}${t}</button>`).join('')}</nav>`}
let lastRenderTab=ui.tab;
const motionReduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionEase='cubic-bezier(0.23, 1, 0.32, 1)';
function playMotion(element,frames,duration=280){
 if(!element||motionReduced()||!element.animate)return null;
 return element.animate(frames,{duration,easing:motionEase});
}
const surfaceAnimations=new WeakMap();
const retiringSurfaces=new WeakMap();
function settleSurface(element,target,duration=280){
 if(!element)return null;
 retiringSurfaces.delete(element);
 const current=getComputedStyle(element);
 const from={transform:current.transform,opacity:current.opacity};
 surfaceAnimations.get(element)?.cancel();
 Object.assign(element.style,target);
 if(motionReduced()||!element.animate)return null;
 const animation=element.animate([from,target],{duration,easing:'cubic-bezier(.32,.72,0,1)'});
 surfaceAnimations.set(element,animation);
 animation.finished.catch(()=>{}).finally(()=>{if(surfaceAnimations.get(element)===animation)surfaceAnimations.delete(element);});
 return animation;
}
function retireSurface(element,target,duration=260){
 const animation=settleSurface(element,target,duration);
 const token={};retiringSurfaces.set(element,token);
 const cleanup=()=>{if(retiringSurfaces.get(element)===token){element.remove();retiringSurfaces.delete(element);}};
 if(animation)animation.finished.catch(()=>{}).finally(cleanup);else cleanup();
}
function render(){
const oldDock=$('#app .dock');
const oldScreen=$('#app > .screen');
const oldScreenRect=oldScreen?.getBoundingClientRect();
const oldScreenOpacity=oldScreen?getComputedStyle(oldScreen).opacity:'1';
const oldPositions=new Map([...document.querySelectorAll('#app .task')].map(e=>[e.querySelector('[data-id]')?.dataset.id,e.getBoundingClientRect()]));
const chipScroll=$('.chips')?.scrollLeft||0;
const wasTab=lastRenderTab;lastRenderTab=ui.tab;
const items=filteredTodos();
const todoHeader=ui.batch?`<header class="header"><button class="text-button" data-action="batch-cancel">Cancel</button><h1 style="text-align:center;font-size:17px">${ui.selectedIds.size?ui.selectedIds.size+' selected':'Select to-dos'}</h1><button class="text-button" data-action="select-all">${ui.selectedIds.size===items.length&&items.length?'Deselect all':'Select all'}</button></header>`:`<header class="header"><h1>To-dos <small>${data.items.filter(x=>x.kind==='todo'&&!x.done&&included(x)).length}</small></h1>${btn('more','More options','more')}</header>`;
$('#app').innerHTML=`<main class="screen">${ui.batch||ui.tab==='todos'?todoHeader+(ui.batch?'':todoFiltersHTML())+todosHTML():calendarHTML()}</main>${ui.batch?batchFooter():dockHTML()}`;
renderOverlay();if($('.chips'))$('.chips').scrollLeft=chipScroll;
if(oldDock&&!ui.batch){
 const nextDock=$('#app .dock');
 const nextControl=nextDock.querySelector('.round');
 const oldControl=oldDock.querySelector('.round');
 oldControl.innerHTML=nextControl.innerHTML;oldControl.setAttribute('aria-label',nextControl.getAttribute('aria-label'));
 nextDock.replaceWith(oldDock);oldDock.getBoundingClientRect();
 oldDock.querySelectorAll('[data-tab]').forEach(button=>button.classList.toggle('active',button.dataset.tab===ui.tab));
 oldDock.classList.toggle('calendar-selected',ui.tab==='calendar');
}else if($('#app .dock'))$('#app .dock').classList.toggle('calendar-selected',ui.tab==='calendar');
if(!motionReduced()){
const entering=wasTab!==ui.tab;
if(entering&&oldScreen){
 const direction=ui.tab==='calendar'?-1:1;
 const outgoing=document.createElement('div');outgoing.className='motion-scene';outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');
 Object.assign(outgoing.style,{left:oldScreenRect.left+'px',width:oldScreenRect.width+'px'});
 oldScreen.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
 Object.assign(oldScreen.style,{position:'absolute',top:oldScreenRect.top+'px',width:'100%',transform:'none',opacity:oldScreenOpacity});
 oldScreen.getAnimations().forEach(animation=>animation.cancel());
 outgoing.append(oldScreen);$('#app').append(outgoing);
 retireSurface(outgoing,{transform:`translateX(${-direction*16}px)`,opacity:'0'},220);
 const screen=$('#app > .screen');Object.assign(screen.style,{transform:`translateX(${direction*10}px)`,opacity:'.35'});
 settleSurface(screen,{transform:'none',opacity:'1'},200);
}
for(const el of document.querySelectorAll('#app .task')){const old=oldPositions.get(el.querySelector('[data-id]')?.dataset.id),now=el.getBoundingClientRect();const delta=old?old.top-now.top:8;if(!entering&&(Math.abs(delta)>1||!old))el.animate([{transform:'translateY('+delta+'px)',opacity:old?1:0},{transform:'translateY(0)',opacity:1}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});}
}
if(ui.tab==='calendar'&&ui.calendarView==='Timeline'){const e=$('.timeline');if(e)e.scrollTop=67*9.7}}
function lunarLabel(date){try{const p=new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{day:'numeric',timeZone:'Asia/Shanghai'}).formatToParts(parseDate(date));const n=Number(p.find(x=>x.type==='day')?.value);const names=['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];return names[n-1]||''}catch{return ''}}
function calendarGrid(full=ui.expanded||ui.calendarView==='Overview'){const first=ui.month+'-01',start=data.settings.weekStart;let dates=[];if(full){const d=parseDate(first);let offset=(d.getDay()-start+7)%7;const total=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();for(let i=0;i<offset;i++)dates.push(null);for(let i=1;i<=total;i++)dates.push(ui.month+'-'+String(i).padStart(2,'0'))}else{const selected=parseDate(ui.selected);const begin=addDays(ui.selected,-((selected.getDay()-start+7)%7));for(let i=0;i<7;i++)dates.push(addDays(begin,i))}return `<div class="weekdays">${Array.from({length:7},(_,i)=>['S','M','T','W','T','F','S'][(i+start)%7]).map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid ${full?'expanded':''}" id="calendar-grid">${dates.map(d=>d?`<button class="day ${d===ui.selected?'active':''} ${d===today()?'today':''}" data-action="day" data-date="${d}" aria-label="${d}" aria-pressed="${d===ui.selected}"><span class="number">${Number(d.slice(8))}</span><span class="lunar">${lunarLabel(d)}</span><span class="dot" style="opacity:${data.items.some(x=>x.date===d&&included(x))?1:.55}"></span></button>`:'<span></span>').join('')}</div>`}
function eventsForDay(date){return data.items.filter(x=>x.date===date&&included(x)&&(!x.done||data.settings.showCompleted))}
function calendarHTML(){const m=parseDate(ui.month+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'});let body='';const items=eventsForDay(ui.selected);if(ui.calendarView==='Timeline'){const times=Array.from({length:19},(_,i)=>`<div class="hour">${String(i+6).padStart(2,'0')}:00</div>`).join('');body=`${items.filter(x=>x.allDay).map(x=>taskHTML(x)).join('')}<div class="timeline">${times}${items.filter(x=>x.time&&!x.allDay).map(x=>{const [h,m]=x.time.split(':').map(Number);return `<div class="time-event" style="top:${Math.max(0,(h-6+m/60)*67)}px">${taskHTML(x)}</div>`}).join('')}</div>`}else if(ui.calendarView==='Week view'){const begin=addDays(ui.selected,-((parseDate(ui.selected).getDay()-data.settings.weekStart+7)%7));body=`<div class="week-timeline"><div class="week-times">${Array.from({length:13},(_,i)=>`<span>${i+8}:00</span>`).join('')}</div>${Array.from({length:7},(_,i)=>{const d=addDays(begin,i);return `<div class="week-column">${eventsForDay(d).map(x=>`<button data-action="edit" data-id="${x.id}" class="week-event" style="top:${x.time?Math.min(725,Math.max(0,(Number(x.time.slice(0,2))-8)*65)):0}px">${esc(x.title)}<br>${esc(x.time||'All day')}</button>`).join('')}</div>`}).join('')}</div>`}else if(ui.calendarView==='Events view'){const list=data.items.filter(x=>x.date&&included(x)&&(!x.done||data.settings.showCompleted)).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));body=list.map((x,i)=>`${i===0||list[i-1].date!==x.date?`<div class="agenda-date">${parseDate(x.date).toLocaleDateString('en-US',{month:'long',day:'numeric',weekday:'long',year:'numeric'})}</div>`:''}${taskHTML(x)}`).join('')}else{body=`<div class="agenda-date">${parseDate(ui.selected).toLocaleDateString('en-US',{month:'long',day:'numeric',weekday:'long'})}</div>${items.map(x=>taskHTML(x)).join('')||'<div class="overview-note">No events on this day</div>'}`}
return `<header class="header calendar-head"><div class="month-controls">${btn('month-prev','Previous month','back','','icon-button prev-month')}<button class="month-title" data-action="expand-calendar">${m}<small>${ui.expanded?'':'Week '+weekNumber(ui.selected)}</small></button>${btn('month-next','Next month','next','','icon-button next-month')}</div>${btn('more','More options','more')}</header>${calendarGrid()}${ui.calendarView!=='Events view'?'<button class="calendar-collapse" data-action="expand-calendar" aria-label="Expand or collapse month"><span></span></button>':''}${body}`}
function weekNumber(s){const d=parseDate(s),first=new Date(d.getFullYear(),0,1);return Math.ceil(((d-first)/86400000+first.getDay()+1)/7)}
const menuItem=(action,label,ico,extra='',active=false)=>`<button data-action="${action}" ${extra} class="${active?'active':''}">${ico?icon(ico):''}<span>${label}</span>${active?icon('check','menu-check'):''}</button>`;
let previousPanelKey='';
function renderOverlay(){const oldPageScroll=$('.page')?.scrollTop||0;const panelKey=panel?panel.type+':'+panel.sub:'';const panelChanged=panelKey!==previousPanelKey;previousPanelKey=panelKey;let html='';if(panel)html=panelHTML();if(menu){html+='<div class="backdrop" data-action="close-menu"></div><div class="menu '+(menu==='more'?'top':'bottom')+'" role="menu">';if(menu==='more')html+=[['search','Search events'],['courses','Course schedule'],['jump','Jump to'],['voice','Add event with voice'],['subscriptions','Subscriptions'],['sync','Sync and import events'],['settings','Settings']].map(([a,t])=>menuItem(a,t)).join('');else if(ui.tab==='todos')html+=menuItem('show-completed',data.settings.showCompleted?'Hide completed':'Show completed','eye')+menuItem('group',data.settings.grouped?'Ungroup':'Group','clock')+menuItem('sort',data.settings.sortPriority?'Clear sorting':'Sort by priority','flag')+menuItem('batch','Batch edit','edit');else html+=['List','Timeline','Overview','Week view','Events view'].map((x,i)=>menuItem('calendar-view',x,['list','timeline','grid','calendar','calendar'][i],`data-view="${x}"`,ui.calendarView===x)).join('');html+='</div>'}if(modal)html+=`<div class="dialog-shade"><section class="dialog" role="dialog" aria-modal="true" aria-label="${esc(modal.title)}"><h2>${esc(modal.title)}</h2>${modal.body}<div class="actions"><button data-action="modal-cancel">Cancel</button><button data-action="modal-confirm" class="${modal.danger?'danger':''}">${modal.confirm||'OK'}</button></div></section></div>`;$('#overlay').innerHTML=html;
const page=$('.page');if(page&&!panelChanged){page.classList.add('no-enter');page.scrollTop=oldPageScroll;}
if(panel?.type==='editor')bindEditor();}
function openPanel(type,sub='root'){menu=null;panel={type,sub};modal=null;renderOverlay();if(type==='search')$('#search-input').focus()}
function pageHeader(title,back='close-panel',right=''){return `<div class="page-header">${btn(back,'Back','back','','text-button')}<h2>${esc(title)}</h2>${right||'<span style="width:24px"></span>'}</div>`}
function panelHTML(){let content='';switch(panel.type){case'editor':content=editorHTML();break;case'search':content=`<div class="searchbar"><label>${icon('search')}<input id="search-input" type="search" placeholder="Search events" aria-label="Search events"></label><button class="text-button" data-action="close-panel">Cancel</button></div><div id="search-results">${searchHTML('')}</div>`;break;case'settings':content=settingsHTML();break;case'subscriptions':content=subscriptionsHTML();break;case'sync':content=pageHeader('Sync and import events')+`<div class="setting-card">${rowAction('Export backup','backup-export','Save a JSON copy')}${rowAction('Import backup','backup-import','Add events from a JSON file')}</div><p class="note">所有日程保存在此设备的浏览器中。导出备份可转移到另一台手机；当前版本未连接云端账号。</p>`;break;case'courses':content=courseHTML();break;case'voice':content=pageHeader('Add event with voice')+`<div class="record-card">${icon('mic')}<p id="voice-result">说出你的日程或待办事项</p><button class="text-button" data-action="start-voice">Start recording</button></div><p class="note">语音输入由浏览器提供，需要麦克风权限和 HTTPS 或本机访问。也可以直接手动输入。</p><button class="text-button full-width" data-action="new">Type instead</button>`;break}return `<section class="page" aria-label="${esc(panel.type)}">${content}</section>`}
function searchHTML(q){const list=data.items.filter(x=>included(x)&&[x.title,x.notes,x.location].join(' ').toLowerCase().includes(q.toLowerCase()));return list.map(x=>taskHTML(x)).join('')||'<p class="note">No matching events</p>'}
function openEditor(id){const found=data.items.find(x=>x.id===id);draft=found?{...found}:{id:uid(),kind:ui.tab==='todos'?'todo':'event',title:'',date:ui.tab==='calendar'?ui.selected:'',time:ui.tab==='calendar'?'08:30':'',endDate:ui.selected,endTime:'09:30',color:'#b89b35',priority:false,repeat:'Once',reminder:data.settings.reminder,calendar:data.settings.defaultType,category:'Standard event',allDay:false,notes:'',location:'',done:false};openPanel('editor');setTimeout(()=>$('#title')?.focus({preventScroll:true}),180)}
const options=(values,selected)=>values.map(x=>`<option ${x===selected?'selected':''} value="${esc(x)}">${esc(x)}</option>`).join('');
function rowSelect(label,key,values,value){return `<label class="row"><span class="label">${label}</span><select data-draft="${key}" aria-label="${label}">${options(values,value)}</select>${icon('down','chevron')}</label>`}
function rowToggle(label,key,value,setting=false,description=''){return `<label class="row"><span class="label">${label}${description?`<small>${description}</small>`:''}</span><input class="toggle" type="checkbox" ${value?'checked':''} ${setting?'data-setting':'data-draft'}="${key}" aria-label="${label}"></label>`}
function editorHTML(){return `<div class="page-header"><button class="text-button" data-action="close-panel">Cancel</button><h2>${data.items.some(x=>x.id===draft.id)?'Edit':'New'}</h2><button class="text-button" id="save-event" data-action="save" ${!draft.title.trim()?'disabled':''}>Done</button></div><div class="editor-tabs"><button data-action="editor-kind" data-kind="event" class="${draft.kind==='event'?'active':''}">Events</button><button data-action="editor-kind" data-kind="todo" class="${draft.kind==='todo'?'active':''}">To-dos</button></div><div class="edit-card ${draft.kind==='todo'?'gold':''}" style="${draft.kind==='todo'?'--gold:'+esc(draft.color):''}"><textarea id="title" placeholder="${draft.kind==='todo'?'New to-do':'Title'}" aria-label="Title">${esc(draft.title)}</textarea>${draft.kind==='todo'?`<div class="todo-tools"><button class="pill" data-action="todo-date">${icon('calendar')} ${draft.date?esc(draft.date===today()?'today':draft.date)+(draft.time?' '+esc(draft.time):''):'Set date'}</button>${draft.date?btn('clear-date','Remove date','close','','icon-button'):''}<div class="inline-actions">${btn('priority','High priority','flag','aria-pressed="'+draft.priority+'"','icon-button '+(draft.priority?'priority-on':''))}<button class="icon-button" data-action="color" aria-label="Color"><span class="color-dot" style="background:${esc(draft.color)}"></span></button></div></div>`:rowSelect('Category','category',['Standard event','Birthday','Anniversary','Countdown'],draft.category)}</div><p class="form-error" id="form-error"></p>${draft.kind==='event'?`<div class="edit-card">${rowToggle('All day','allDay',draft.allDay)}<div class="time-fields"><label>Start${!draft.allDay?`<input type="time" aria-label="Start time" data-draft="time" value="${esc(draft.time)}">`:''}<input type="date" aria-label="Start date" data-draft="date" value="${esc(draft.date)}"></label><label>End${!draft.allDay?`<input type="time" aria-label="End time" data-draft="endTime" value="${esc(draft.endTime)}">`:''}<input type="date" aria-label="End date" data-draft="endDate" value="${esc(draft.endDate)}"></label></div><div class="row"><span class="label">Time zone</span><span class="value">GMT+08:00 Beijing</span></div></div>`:''}<div class="more-label">More settings</div><div class="edit-card">${rowSelect('Repeat','repeat',['Once','Every day','Every week','Every month','Every year'],draft.repeat)}${rowSelect('Reminder','reminder',['None','At time of event','5 minutes before','15 minutes before','30 minutes before','1 day before'],draft.reminder)}${rowToggle('Alarm · 闹钟','alarm',draft.alarm)}</div><div class="edit-card"><label class="row"><span class="label">Location</span><input type="text" aria-label="Location" data-draft="location" value="${esc(draft.location)}" placeholder="Optional">${icon('location')}</label>${rowSelect('Calendar type','calendar',['Default','Birthday','Anniversary','Countdown','learning','Course schedule'],draft.calendar)}<textarea style="font-size:14px;min-height:65px;margin-top:12px" data-draft="notes" aria-label="Remarks" placeholder="Remarks">${esc(draft.notes)}</textarea></div>${data.items.some(x=>x.id===draft.id)?'<button class="danger-button full-width" data-action="delete-item">Delete event</button>':''}`}
function bindEditor(){$('#title').addEventListener('input',e=>{draft.title=e.target.value;$('#save-event').disabled=!draft.title.trim()})}
function saveDraft(){draft.title=draft.title.trim();if(!draft.title)return;let error='';if(draft.kind==='event'){if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||!/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate))error='请选择开始和结束日期';else if(!draft.allDay&&(!draft.time||!draft.endTime))error='请选择开始和结束时间';else if((draft.endDate+(draft.allDay?'':draft.endTime))<(draft.date+(draft.allDay?'':draft.time)))error='结束时间不能早于开始时间'}if(error){$('#form-error').textContent=error;return}const item={...draft};const pos=data.items.findIndex(x=>x.id===item.id);if(pos>=0)data.items[pos]=item;else data.items.push(item);if(!data.settings.categories.includes(item.calendar))data.settings.categories.push(item.calendar);if(!persist())return;panel=null;render();toast('Saved')}
function rowAction(label,action,value='',extra=''){return `<button class="row" data-action="${action}" ${extra}><span class="label">${label}</span>${value?`<span class="value">${esc(value)}</span>`:''}${icon('next','chevron')}</button>`}
function settingsHTML(){const s=data.settings;const sub=panel.sub;if(sub==='root')return pageHeader('Settings')+`<div class="setting-card">${rowAction('Calendar type','setting-page','My calendar','data-sub="calendar-types"')}</div><div class="section-caption">View</div><div class="setting-card">${rowAction('Default event type','setting-picker',s.defaultType,'data-key="defaultType"')}${rowAction('Filter','setting-page','','data-sub="filter"')}${rowAction('Week starts on','setting-picker',s.weekStart===0?'Sunday':'Monday','data-key="weekStart"')}${rowToggle('Fixed time zone','fixedTimezone',s.fixedTimezone,true,'Display your event date and time based on your selected time zone.')}${rowAction('Displayed items','setting-page','','data-sub="display"')}${rowAction('Delete expired events','cleanup-expired')}${rowAction('Delete duplicate events','cleanup-duplicates')}</div><div class="section-caption">Reminder</div><div class="setting-card">${rowAction('Content and news','setting-page','','data-sub="news"')}${rowAction('闹钟和自动提醒','setting-page',s.reminderType,'data-sub="reminder-type"')}${rowAction('Default reminder time','setting-picker',s.reminder,'data-key="reminder"')}${rowToggle('Meeting reminders','meeting',s.meeting,true,'Reminders for imported meeting events.')}</div><div class="section-caption">Other</div><div class="setting-card"><div class="row"><span class="label">Version<small>Android / Web · 1.1.0</small></span></div>${rowAction('Privacy','setting-page','','data-sub="privacy"')}${rowAction('About Calendar','setting-page','','data-sub="about"')}${rowAction('Backup and restore','sync')}${rowAction('检查更新','check-update',nativeStatus.native?'v'+(nativeStatus.version||'1.1.0'):'Android app')}</div>`;
let body='';let title='';if(sub==='calendar-types'){title='Calendar type';body='<div class="setting-card"><div class="row"><span style="background:#6c61d9;border-radius:7px;padding:5px">'+icon('calendar')+'</span><span class="label">My calendar</span></div></div><p class="note">本机日历。可用 Default、Birthday、learning 等分类整理事件。</p>'}if(sub==='filter'){title='Filter';body=`<div class="section-caption">My calendar</div><div class="setting-card">${['Default','Birthday','Anniversary','Countdown','learning','Course schedule'].map((x,i)=>`<label class="row"><span class="label">${x}</span><input type="checkbox" data-category="${x}" aria-label="${x}" ${s.categories.includes(x)?'checked':''} style="accent-color:${['#6f9dd9','#61c3b5','#8abd60','#d1b358','#cd8954','#78a65c'][i]};width:18px;height:18px"></label>`).join('')}</div><button class="text-button full-width" data-action="filter-all">Select all</button>`}if(sub==='display'){title='Displayed items';body=`<div class="setting-card">${[['Holidays and workdays','holidays'],['Show international holidays','international'],['Subscriptions and service reminders','subscriptions'],['Subscription recommendations','recommendations'],['Weather','weather'],['Week and Events views','weekEvents'],['Personalized services','personalized']].map(([t,k])=>rowToggle(t,k,s[k],true)).join('')}</div><p class="note">天气和在线服务需要后续连接数据源。当前开关仅保存显示偏好。</p>`}if(sub==='news'){title='Content and news';body=`<div class="setting-card">${rowToggle('Subscription recommendations','recommendations',s.recommendations,true)}${rowToggle('Personalized services','personalized',s.personalized,true)}</div>`}if(sub==='reminder-type'){title='Reminder type';body=`<div class="record-card"><div style="display:flex;justify-content:space-around;font-size:40px"><span>▣</span><span>◷</span></div><div class="editor-tabs" style="margin:20px 0 0">${['Notification','Alarm'].map(x=>`<button data-action="reminder-type" data-value="${x}" class="${s.reminderType===x?'active':''}">${x}</button>`).join('')}</div></div><div class="setting-card" style="margin-top:18px">${rowAction('Notification sound','setting-picker',s.sound,'data-key="sound"')}</div>${reminderPermissionsHTML()}`}if(sub==='privacy'){title='Privacy';body='<div class="setting-card"><div class="row">Your events stay on this device.</div></div><p class="note">日程存储于当前浏览器，没有账号登录，也不会上传事件。清除浏览器数据将删除本机记录，请先导出备份。语音输入使用浏览器提供的识别服务。</p>'}if(sub==='about'){title='About Calendar';body='<div class="record-card">'+icon('calendar')+'<h2>Calendar</h2><p>把每一天，安排得清楚一点。</p></div><p class="note">根据提供的视频制作的手机端交互初版。首次打开的事项为示例，可编辑或删除。</p><p class="install-hint">手机浏览器访问后可以添加到主屏幕。完整离线安装需要 HTTPS。网页版暂不提供系统闹钟、后台推送或云同步。</p>'}return pageHeader(title,'settings-root')+body}
function subscriptionsHTML(){const entries=[['holidays','📆','节假日','节日与调休提醒'],['birthdays','🎂','重要纪念日','生日和纪念日'],['history','📚','历史上的今天','历史事件与知识'],['weather','🌤','天气','每日天气信息']];return pageHeader('Subscriptions')+`<div class="setting-card">${entries.map(([k,ico,t,description])=>`<div class="subscription"><span class="sub-icon">${ico}</span><span class="sub-copy">${t}<small>${description}</small></span><button data-action="subscribe" data-key="${k}">${data.subscriptions[k]?'Unsubscribe':'Subscribe'}</button></div>`).join('')}</div><p class="note">这是本机订阅偏好演示，初版尚未获取在线内容。</p>`}
function courseHTML(){return pageHeader('Course schedule','close-panel',btn('add-course','Add course','plus','','text-button'))+`<div class="course-grid"><span class="cell heading">No.</span>${['Monday','Tuesday','Wednesday','Thursday','Friday'].map(x=>`<span class="cell heading">${x}</span>`).join('')}${Array.from({length:10},(_,row)=>`<span class="cell">${row+1}</span>${Array.from({length:5},(_,col)=>{const courses=data.courses.filter(c=>c.day===col&&c.slot===row);return `<div class="cell">${courses.map(c=>`<button class="course" data-action="edit-course" data-id="${c.id}">${esc(c.title)}<br>${esc(c.room)}</button>`).join('')}</div>`}).join('')}`).join('')}</div>`}
function showDialog(title,body,fn,confirm='OK',danger=false){menu=null;modal={title,body,fn,confirm,danger};renderOverlay();setTimeout(()=>$('.dialog input')?.focus(),20)}
function dateDialog(){showDialog('Set date and time',`<label>Date<input id="dialog-date" type="date" value="${draft.date||today()}" aria-label="Date"></label><label>Time<input id="dialog-time" type="time" value="${draft.time||'08:30'}" aria-label="Time"></label>`,()=>{const date=$('#dialog-date').value;if(!date){toast('请选择日期');return false}draft.date=date;draft.time=$('#dialog-time').value;return true})}
function deleteIds(ids){data.items=data.items.filter(x=>!ids.includes(x.id));persist();ui.selectedIds.clear();ui.batch=false;panel=null;render();toast('Deleted')}
function chooseSetting(key){const values={defaultType:['Default','Birthday','Anniversary','Countdown','learning','Course schedule'],weekStart:['Sunday','Monday'],reminder:['None','At time of event','5 minutes before','15 minutes before','30 minutes before','1 day before'],sound:['Cozy','Chime','Bell','Silent']}[key];showDialog({defaultType:'Default event type',weekStart:'Week starts on',reminder:'Default reminder time',sound:'Notification sound'}[key],`<select id="setting-value" aria-label="Setting value">${options(values,key==='weekStart'?(data.settings.weekStart===0?'Sunday':'Monday'):data.settings[key])}</select>`,()=>{data.settings[key]=key==='weekStart'?($('#setting-value').value==='Sunday'?0:1):$('#setting-value').value;persist();return true})}
function exportBackup(){if(window.AndroidBridge?.exportBackup){AndroidBridge.exportBackup(JSON.stringify(data,null,2));return}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='calendar-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exported')}
function courseDialog(id){const c=data.courses.find(x=>x.id===id)||{id:uid(),title:'',room:'',day:0,slot:0};showDialog(id?'Edit course':'Add course',`<label>Course<input id="course-title" value="${esc(c.title)}" aria-label="Course title" maxlength="100"></label><label>Room<input id="course-room" value="${esc(c.room)}" aria-label="Classroom"></label><label>Day<select id="course-day">${['Monday','Tuesday','Wednesday','Thursday','Friday'].map((x,i)=>`<option value="${i}" ${c.day===i?'selected':''}>${x}</option>`).join('')}</select></label><label>Period<select id="course-slot">${Array.from({length:10},(_,i)=>`<option value="${i}" ${c.slot===i?'selected':''}>${i+1}</option>`).join('')}</select></label>${id?`<button class="danger-button" data-action="delete-course" data-id="${id}">Delete course</button>`:''}`,()=>{const title=$('#course-title').value.trim();if(!title){toast('请输入课程名称');return false}const item={...c,title,room:$('#course-room').value.trim(),day:Number($('#course-day').value),slot:Number($('#course-slot').value)};const pos=data.courses.findIndex(x=>x.id===c.id);if(pos<0)data.courses.push(item);else data.courses[pos]=item;persist();return true})}
function startVoice(){const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){$('#voice-result').textContent='此浏览器不支持语音识别，请使用手动输入。';return}try{voice=new Speech();voice.lang='zh-CN';voice.interimResults=false;voice.onresult=e=>{const text=e.results[0][0].transcript;openEditor();draft.title=text;renderOverlay();toast('语音已转成文字，请确认日期和时间')};voice.onerror=e=>{$('#voice-result')&&($('#voice-result').textContent='语音识别不可用：'+e.error+'。请检查权限或手动输入。')};voice.start();$('#voice-result').textContent='Listening…'}catch{toast('无法启动麦克风，请使用手动输入')}}
function shiftMonth(delta){const d=parseDate(ui.month+'-01');d.setMonth(d.getMonth()+delta);ui.month=dateString(d).slice(0,7);ui.selected=ui.month+'-'+String(Math.min(Number(ui.selected.slice(8)),new Date(d.getFullYear(),d.getMonth()+1,0).getDate())).padStart(2,'0');render()}
const actions={
'more':()=>{menu=menu==='more'?null:'more';renderOverlay()},'view-menu':()=>{menu=menu==='view'?null:'view';renderOverlay()},'close-menu':()=>{menu=null;renderOverlay()},'tab':e=>{ui.tab=e.dataset.tab;ui.batch=false;menu=null;render()},'filter':e=>{ui.filter=e.dataset.filter;render();$(`[data-filter="${ui.filter}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'})},'collapse':e=>{const label=e.dataset.label;ui.collapsed.has(label)?ui.collapsed.delete(label):ui.collapsed.add(label);render()},'complete':e=>{const x=data.items.find(x=>x.id===e.dataset.id);if(!x)return;x.done=!x.done;persist();render();toast(x.done?'Completed':'Marked as in progress')},'edit':e=>openEditor(e.dataset.id),'new':()=>openEditor(),'close-panel':()=>{if(voice){try{voice.abort()}catch{}voice=null}closePage()},'save':saveDraft,'editor-kind':e=>{draft.kind=e.dataset.kind;if(draft.kind==='event'&&!draft.date){draft.date=ui.selected;draft.endDate=ui.selected;draft.time='08:30';draft.endTime='09:30'}renderOverlay()},'todo-date':dateDialog,'clear-date':()=>{draft.date='';draft.time='';renderOverlay()},'priority':()=>{draft.priority=!draft.priority;renderOverlay()},'color':()=>showDialog('Color',`<div class="color-choices">${['#b89b35','#c66f78','#5ba6a0','#7b8dc8'].map(x=>`<button style="background:${x}" class="${draft.color===x?'active':''}" data-action="pick-color" data-color="${x}" aria-label="${x}"></button>`).join('')}</div>`,()=>true),'pick-color':e=>{draft.color=e.dataset.color;modal=null;renderOverlay()},'delete-item':()=>showDialog('Delete this event?','<p class="note">此操作会删除这条日程。</p>',()=>{const id=draft.id;deleteIds([id]);return true},'Delete',true),'search':()=>openPanel('search'),'courses':()=>openPanel('courses'),'voice':()=>openPanel('voice'),'start-voice':startVoice,'subscriptions':()=>openPanel('subscriptions'),'sync':()=>openPanel('sync'),'settings':()=>openPanel('settings'),'settings-root':()=>{panel.sub='root';renderOverlay()},'setting-page':e=>{panel.sub=e.dataset.sub;renderOverlay()},'setting-picker':e=>chooseSetting(e.dataset.key),'filter-all':()=>{data.settings.categories=[...defaultSettings.categories];persist();renderOverlay()},'reminder-type':e=>{data.settings.reminderType=e.dataset.value;persist();renderOverlay();if(e.dataset.value==='Alarm'&&!nativeStatus.exact)toast('请开启精确闹钟权限以准时响铃')},'subscribe':e=>{data.subscriptions[e.dataset.key]=!data.subscriptions[e.dataset.key];persist();renderOverlay()},'show-completed':()=>{data.settings.showCompleted=!data.settings.showCompleted;persist();menu=null;render()},'group':()=>{data.settings.grouped=!data.settings.grouped;persist();menu=null;render()},'sort':()=>{data.settings.sortPriority=!data.settings.sortPriority;persist();menu=null;render()},'batch':()=>{ui.batch=true;ui.selectedIds.clear();menu=null;render()},'batch-cancel':()=>{ui.batch=false;ui.selectedIds.clear();render()},'select':e=>{const id=e.dataset.id;ui.selectedIds.has(id)?ui.selectedIds.delete(id):ui.selectedIds.add(id);render()},'select-all':()=>{const ids=filteredTodos().map(x=>x.id);ui.selectedIds=ui.selectedIds.size===ids.length?new Set():new Set(ids);render()},'batch-priority':()=>{data.items.filter(x=>ui.selectedIds.has(x.id)).forEach(x=>x.priority=true);persist();render();toast('Priority updated')},'batch-reminder':()=>showDialog('Reminder',`<select id="batch-reminder">${options(['None','At time of event','15 minutes before','1 day before'],'15 minutes before')}</select>`,()=>{const value=$('#batch-reminder').value;data.items.filter(x=>ui.selectedIds.has(x.id)).forEach(x=>x.reminder=value);persist();render();toast('Reminder preference saved');return true}),'batch-delete':()=>showDialog('Delete '+ui.selectedIds.size+' to-dos?','<p class="note">所选待办将被删除。</p>',()=>{deleteIds([...ui.selectedIds]);return true},'Delete',true),'calendar-view':e=>{ui.calendarView=e.dataset.view;ui.expanded=e.dataset.view==='List'||e.dataset.view==='Overview';menu=null;render()},'day':e=>{ui.selected=e.dataset.date;ui.month=ui.selected.slice(0,7);render()},'expand-calendar':()=>{ui.expanded=!ui.expanded;render()},'month-prev':()=>shiftMonth(-1),'month-next':()=>shiftMonth(1),'jump':()=>showDialog('Jump to',`<input id="jump-date" type="date" value="${ui.selected}" aria-label="Jump to date">`,()=>{const d=$('#jump-date').value;if(!d)return false;ui.selected=d;ui.month=d.slice(0,7);ui.tab='calendar';render();return true}),'modal-cancel':()=>{modal=null;renderOverlay()},'modal-confirm':()=>{const current=modal;if(!current)return;if(current.fn()!==false){modal=null;render()}},'backup-export':exportBackup,'backup-import':()=>{if(window.AndroidBridge?.importBackup)AndroidBridge.importBackup();else $('#import-file').click()},'add-course':()=>courseDialog(),'edit-course':e=>courseDialog(e.dataset.id),'delete-course':e=>{data.courses=data.courses.filter(x=>x.id!==e.dataset.id);persist();modal=null;renderOverlay()},'cleanup-expired':()=>showDialog('Delete expired events?','<p class="note">只删除已完成且早于今天的事项。</p>',()=>{const count=data.items.filter(x=>x.done&&x.date&&x.date<today()).length;data.items=data.items.filter(x=>!(x.done&&x.date&&x.date<today()));persist();toast('Removed '+count+' events');return true},'Delete',true),'cleanup-duplicates':()=>showDialog('Delete duplicate events?','<p class="note">标题、类型、日期、时间及分类完全相同的记录保留一条。</p>',()=>{const seen=new Set();let removed=0;data.items=data.items.filter(x=>{const key=JSON.stringify([x.title,x.kind,x.date,x.time,x.calendar]);if(seen.has(key)){removed++;return false}seen.add(key);return true});persist();toast('Removed '+removed+' duplicates');return true},'Delete',true)
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)actions[b.dataset.action]?.(b)});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.draft&&draft){draft[el.dataset.draft]=el.type==='checkbox'?el.checked:el.value;if(el.dataset.draft==='date'&&draft.endDate<draft.date)draft.endDate=draft.date;if(el.dataset.draft==='allDay'||el.dataset.draft==='date')renderOverlay()}if(el.dataset.setting){data.settings[el.dataset.setting]=el.checked;persist()}if(el.dataset.category){const categories=new Set(data.settings.categories);el.checked?categories.add(el.dataset.category):categories.delete(el.dataset.category);data.settings.categories=[...categories];persist()}});
document.addEventListener('input',e=>{if(e.target.id==='search-input')$('#search-results').innerHTML=searchHTML(e.target.value);if(e.target.dataset.draft&&draft)draft[e.target.dataset.draft]=e.target.value});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal)modal=null;else if(menu)menu=null;else panel=null;render()}});
async function importBackupFile(file){if(!file)return;try{if(file.size>5*1024*1024)throw Error('too large');const incoming=JSON.parse(await file.text());if(!Array.isArray(incoming.items)||incoming.items.length>10000)throw Error('invalid');const colorPattern=/^#[0-9a-f]{6}$/i;const valid=incoming.items.every(x=>x&&typeof x.title==='string'&&x.title.length<=1000&&['todo','event'].includes(x.kind)&&typeof x.date==='string'&&(!x.date||/^\d{4}-\d{2}-\d{2}$/.test(x.date))&&(!x.color||colorPattern.test(x.color)));if(!valid)throw Error('invalid');const byId=new Map(data.items.map(x=>[x.id,x]));for(const x of incoming.items){const item={id:typeof x.id==='string'?x.id:uid(),kind:x.kind,title:x.title,date:x.date,time:typeof x.time==='string'&&/^\d{2}:\d{2}$/.test(x.time)?x.time:'',endDate:typeof x.endDate==='string'?x.endDate:x.date,endTime:typeof x.endTime==='string'?x.endTime:'',color:x.color||'#b89b35',calendar:defaultSettings.categories.includes(x.calendar)?x.calendar:'Default',category:typeof x.category==='string'?x.category:'Standard event',repeat:['Once','Every day','Every week','Every month','Every year'].includes(x.repeat)?x.repeat:'Once',reminder:typeof x.reminder==='string'?x.reminder:'None',allDay:!!x.allDay,alarm:!!x.alarm,priority:!!x.priority,done:!!x.done,notes:typeof x.notes==='string'?x.notes:'',location:typeof x.location==='string'?x.location:''};byId.set(item.id,item)}data.items=[...byId.values()];persist();render();toast('Imported '+incoming.items.length+' events')}catch{toast('备份格式不正确，请选择此应用导出的 JSON 文件')}finally{$('#import-file').value=''}}
$('#import-file').addEventListener('change',e=>importBackupFile(e.target.files[0]));
window.importNativeBackup=text=>importBackupFile(new File([text],'backup.json',{type:'application/json'}));
document.addEventListener('touchstart',onCalendarTouchStart,{passive:false});
document.addEventListener('touchmove',onCalendarTouchMove,{passive:false});
document.addEventListener('touchend',onCalendarTouchEnd,{passive:false});
document.addEventListener('touchcancel',()=>{calendarGesture=null;const stage=$('.calendar-stage');if(stage)settleSurface(stage,{transform:'none',opacity:'1'},180);},{passive:true});
if(!window.AndroidBridge&&'serviceWorker' in navigator&&(location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname)))navigator.serviceWorker.register('./sw.js').catch(()=>{});


let nativeStatus={native:false,notifications:false,exact:false,fullScreen:false,scheduled:0};
let nativeSyncTimer;
function initializeNative(){if(window.AndroidBridge?.reminderStatus){try{nativeStatus=JSON.parse(AndroidBridge.reminderStatus())}catch{}queueNativeSync()}}
function queueNativeSync(){if(!window.AndroidBridge?.syncReminders)return;clearTimeout(nativeSyncTimer);nativeSyncTimer=setTimeout(()=>{try{AndroidBridge.syncReminders(JSON.stringify({items:data.items,settings:data.settings}))}catch{toast('系统提醒未同步，请重新打开应用')}},200)}
window.onNativeReminderStatus=status=>{nativeStatus=status;if(panel?.type==='settings'&&panel.sub==='reminder-type'){const section=$('#native-reminder-status');if(section)section.outerHTML=reminderPermissionsHTML()}};
window.handleNativeBack=()=>{if(modal){modal=null;renderOverlay();return true}if(menu){menu=null;renderOverlay();return true}if(panel){if(panel.type==='settings'&&panel.sub!=='root'){panel.sub='root';renderOverlay()}else closePage();return true}if(ui.batch){ui.batch=false;render();return true}return false};
function closePage(){modal=null;panel=null;renderOverlay();}
function reminderPermissionsHTML(){const n=nativeStatus;const ready=n.native&&n.notifications&&n.exact;return `<section id="native-reminder-status"><div class="permission-note ${ready?'ready':''}"><strong>${n.native?(ready?'提醒已就绪':'需要开启系统权限'):'请安装 Android 手机版'}</strong>${n.native?`自动提醒：${n.notifications?'已开启':'未开启'} · 精确闹钟：${n.exact?'已开启':'未开启'}<br>全屏闹钟：${n.fullScreen?'已允许':'未允许，可通过通知打开闹钟'}<br>已安排 ${n.scheduled||0} 个提醒`:'网页版保存闹钟和提醒设置，后台通知和锁屏响铃由 Android 手机版提供。'}</div>${n.native?`<div class="permission-actions"><button data-action="native-permission" data-permission="notifications">通知权限</button><button data-action="native-permission" data-permission="exact">精确闹钟权限</button><button data-action="native-permission" data-permission="fullscreen">全屏闹钟权限</button></div><div class="test-actions"><button data-action="test-notification" ${!n.notifications?'disabled':''}>测试自动提醒</button><button data-action="test-alarm" ${!n.notifications?'disabled':''}>测试闹钟</button></div>`:''}<p class="note">在事项中设置提醒提前时间，或打开“Alarm · 闹钟”。通知会在设定时间触发；闹钟支持响铃、关闭和稍后5分钟。全天事项默认在北京时间08:00提醒。开启精确闹钟后可准时调度，未开启时系统可能延后。手机关机、系统强行停止应用或厂商省电限制可能影响提醒。</p></section>`}
actions['native-permission']=e=>{if(window.AndroidBridge)AndroidBridge.requestReminderPermission(e.dataset.permission)};
actions['test-notification']=()=>{if(window.AndroidBridge)AndroidBridge.testReminder(false);else toast('请安装 Android 手机版')};
actions['test-alarm']=()=>{if(window.AndroidBridge)AndroidBridge.testReminder(true);else toast('请安装 Android 手机版')};
actions['check-update']=()=>{if(window.AndroidBridge?.checkForUpdate)AndroidBridge.checkForUpdate();else toast('自动更新功能在 Android 手机版中提供')};

// Preserve overlay surfaces so edits do not restart their entrance animation.
const renderOverlayContent=renderOverlay;
const navigationHistory=new Map();
renderOverlay=function(){
 const oldPage=$('#overlay > .page:not(.navigation-outgoing)'),oldKey=previousPanelKey;
 const oldPageScroll=oldPage?.scrollTop||0;
 const oldDimmer=$('#navigation-dimmer');
 const newKey=panel?panel.type+':'+panel.sub:'';
 // Only two live surfaces at a time, including during rapid navigation.
 document.querySelectorAll('.navigation-outgoing').forEach(el=>{surfaceAnimations.get(el)?.cancel();el.remove();});
 const leaving=[...document.querySelectorAll('#overlay > .menu:not(.motion-exit), #overlay > .backdrop:not(.motion-exit), #overlay > .dialog-shade:not(.motion-exit)')];
 renderOverlayContent();
 let nextPage=$('.page');
 if(oldPage&&nextPage&&oldKey===previousPanelKey){
  oldPage.replaceChildren(...nextPage.childNodes);nextPage.replaceWith(oldPage);
  nextPage=oldPage;nextPage.scrollTop=oldPageScroll;
  if(panel?.type==='editor')bindEditor();
 }else if(oldPage||nextPage){
  const goingBack=!!nextPage&&navigationHistory.has(newKey);
  const isEditor=(panel?.type==='editor')||(!nextPage&&oldKey.startsWith('editor:'));
  const rest='translateX(-50%) translateY(0)';
  const covered='translateX(-74%)';
  const offscreen=isEditor?'translateX(-50%) translateY(100%)':'translateX(50%)';
  if(oldPage){
   if(nextPage&&!goingBack)navigationHistory.set(oldKey,{node:oldPage,scroll:oldPageScroll});
   if(goingBack)navigationHistory.delete(oldKey);
   oldPage.classList.add('navigation-outgoing');oldPage.inert=true;oldPage.setAttribute('aria-hidden','true');
   oldPage.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
   $('#overlay').append(oldPage);oldPage.scrollTop=oldPageScroll;
   Object.assign(oldPage.style,{zIndex:goingBack||!nextPage?'27':'25',animation:'none'});
   retireSurface(oldPage,{transform:goingBack||!nextPage?offscreen:covered,opacity:'1'},280);
  }
  if(nextPage){
   const cached=goingBack?navigationHistory.get(newKey):null;
   if(cached){
    cached.node.replaceChildren(...nextPage.childNodes);nextPage.replaceWith(cached.node);nextPage=cached.node;
    nextPage.classList.remove('navigation-outgoing');nextPage.inert=false;nextPage.removeAttribute('aria-hidden');
    nextPage.scrollTop=cached.scroll;
   }
   Object.assign(nextPage.style,{animation:'none',zIndex:goingBack?'25':'27',transform:goingBack?covered:offscreen,opacity:'1'});
   settleSurface(nextPage,{transform:rest,opacity:'1'},280);
  }else navigationHistory.clear();
 }
 const screen=$('#app > .screen');
 const dimmer=oldDimmer||document.createElement('div');dimmer.id='navigation-dimmer';dimmer.className='navigation-dimmer';dimmer.setAttribute('aria-hidden','true');
 $('#overlay').prepend(dimmer);
 if(panel){
  settleSurface(dimmer,{opacity:panel.type==='editor'?'.36':'.16',transform:'none'});
  settleSurface(screen,{transform:panel.type==='editor'?'translateY(8px) scale(.985)':'translateX(-12px)',opacity:'.85'});
 }else{
  retireSurface(dimmer,{opacity:'0',transform:'none'});
  settleSurface(screen,{transform:'none',opacity:'1'});
 }
 for(const old of leaving){
  const selector=old.classList.contains('dialog-shade')?'.dialog-shade':old.classList.contains('menu')?'.menu':'.backdrop';
  if($('#overlay '+selector)||motionReduced())continue;
  old.inert=true;old.setAttribute('aria-hidden','true');old.style.pointerEvents='none';old.classList.add('motion-exit');
  old.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  $('#overlay').append(old);
  const surface=old.querySelector('.dialog')||old;
  const transform=surface.classList.contains('dialog')?'translateY(48px)':surface.classList.contains('menu')?'scale(.96)':'none';
  const animation=playMotion(surface,[{opacity:1,transform:'none'},{opacity:0,transform}],200);
  if(animation)animation.finished.catch(()=>{}).finally(()=>old.remove());else old.remove();
 }
};
const completeImmediately=actions.complete;
const completing=new Set();
actions.complete=button=>{
 const id=button.dataset.id;if(completing.has(id))return;
 const task=button.closest('.task');
 if(motionReduced()||!task){completeImmediately(button);return;}
 completing.add(id);
 const checked=button.classList.toggle('checked');button.setAttribute('aria-pressed',String(checked));
 button.querySelector('span').innerHTML=checked?icon('check'):'';
 task.classList.toggle('done',checked);
 playMotion(button.querySelector('span'),[{transform:'scale(.85)'},{transform:'scale(1.12)',offset:.6},{transform:'scale(1)'}],200);
 const animation=playMotion(task,[{opacity:1,transform:'translateX(0)'},{opacity:.2,transform:'translateX(28px)'}],240);
 const finish=()=>{completeImmediately(button);completing.delete(id);};
 if(animation)animation.finished.catch(()=>{}).finally(finish);else finish();
};
const filterImmediately=actions.filter;
actions.filter=button=>{filterImmediately(button);playMotion($('#app .screen'),[{opacity:.4},{opacity:1}],160);};
const settingsContent=settingsHTML;
settingsHTML=()=>settingsContent().replaceAll('1.1.0','1.2.1');

// Calendar levels share the same dates and event model, with today independent of selection.
ui.calendarView='Week';ui.year=Number(ui.month.slice(0,4));
const HOUR_HEIGHT=44;
const calendarLevels=['Week','Month','Year'];
let calendarMotion=null,calendarGesture=null,suppressCalendarClickUntil=0;
function weekStart(date){return addDays(date,-((parseDate(date).getDay()-data.settings.weekStart+7)%7));}
function monthDates(month){
 const first=month+'-01',offset=(parseDate(first).getDay()-data.settings.weekStart+7)%7;
 return Array.from({length:42},(_,i)=>addDays(first,i-offset));
}
function itemLastDate(item){return item.endDate&&item.endDate>=item.date?item.endDate:item.date;}
eventsForDay=(date,includeCompleted=data.settings.showCompleted)=>data.items.filter(item=>item.date&&included(item)&&(!item.done||includeCompleted)&&item.date<=date&&itemLastDate(item)>=date);
function dayNumber(date,mini=false){return `<span class="${mini?'mini-number':'number'} ${date===today()?'is-today':''}">${Number(date.slice(8))}</span>`;}
function weekdaysHTML(){return `<div class="weekdays">${Array.from({length:7},(_,i)=>`<span>${['日','一','二','三','四','五','六'][(i+data.settings.weekStart)%7]}</span>`).join('')}</div>`;}
function miniMonthHTML(month){
 const first=month+'-01',offset=(parseDate(first).getDay()-data.settings.weekStart+7)%7;
 const total=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 return `<button class="mini-month" data-action="open-month" data-month="${month}" aria-label="${month}"><strong>${Number(month.slice(5))}月</strong><span class="mini-weekdays">${Array.from({length:7},(_,i)=>`<span>${['日','一','二','三','四','五','六'][(i+data.settings.weekStart)%7]}</span>`).join('')}</span><span class="mini-grid">${'<span></span>'.repeat(offset)}${Array.from({length:total},(_,i)=>dayNumber(month+'-'+String(i+1).padStart(2,'0'),true)).join('')}</span></button>`;
}
function monthHTML(){
 const next=parseDate(ui.month+'-01');next.setMonth(next.getMonth()+1);
 return `${weekdaysHTML()}<div class="month-scroll" aria-label="连续月份日程">${[ui.month,dateString(next).slice(0,7)].map(month=>{
  const dates=monthDates(month),last=dates.findLastIndex(date=>date.startsWith(month));
  return `<section class="month-block" data-month="${month}"><h2 class="month-section-title">${Number(month.slice(5))}月${month.slice(0,4)!==ui.month.slice(0,4)?' · '+month.slice(0,4):''}</h2><div class="month-grid" role="grid" aria-label="${month} 整月日程">${dates.slice(0,Math.ceil((last+1)/7)*7).map(date=>{
   if(!date.startsWith(month))return '<span class="month-gap" aria-hidden="true"></span>';
   const items=eventsForDay(date,true),overflow=items.length-2;
   return `<div class="month-cell" role="gridcell" data-action="day" data-date="${date}"><button class="month-date" data-action="day" data-date="${date}" aria-label="${date}">${dayNumber(date)}</button><div class="month-items">${items.slice(0,2).map(item=>`<button class="month-event ${item.done?'done':''}" data-action="edit" data-id="${esc(item.id)}" style="--event-color:${esc(item.color||'#b89b35')}" aria-label="${esc(item.title)}" title="${esc(item.title)}"><span class="month-event-label">${esc(item.title)}</span>${item.kind==='todo'?`<span class="month-status">${item.done?icon('check'):''}</span>`:''}</button>`).join('')}${overflow>0?`<button class="month-more" data-action="day" data-date="${date}">+${overflow} 项</button>`:''}</div></div>`;
  }).join('')}</div></section>`;
 }).join('')}</div>`;
}
function minuteOf(time){if(!/^\d{2}:\d{2}$/.test(time||''))return null;return Number(time.slice(0,2))*60+Number(time.slice(3));}
function timedSegments(date){
 const segments=eventsForDay(date).filter(item=>!item.allDay&&minuteOf(item.time)!==null).map(item=>{
  const start=item.date<date?0:minuteOf(item.time);
  const end=itemLastDate(item)>date?1440:minuteOf(item.endTime);
  return {item,start,end:Math.min(1440,Math.max(start+1,end===null?start+(item.kind==='todo'?30:60):end))};
 }).sort((a,b)=>a.start-b.start||a.end-b.end);
 let cluster=[],clusterEnd=-1;
 function layout(){
  const ends=[];for(const segment of cluster){let lane=ends.findIndex(end=>end<=segment.start);if(lane<0)lane=ends.length;ends[lane]=segment.end;segment.lane=lane;}
  cluster.forEach(segment=>segment.lanes=ends.length);cluster=[];
 }
 for(const segment of segments){if(segment.start>=clusterEnd){layout();clusterEnd=-1;}cluster.push(segment);clusterEnd=Math.max(clusterEnd,segment.end);}layout();
 return segments;
}
function weekHTML(){
 const dates=Array.from({length:7},(_,i)=>addDays(weekStart(ui.selected),i));
 const allDay=eventsForDay(ui.selected).filter(item=>item.allDay||minuteOf(item.time)===null);
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const now=Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);
 return `${weekdaysHTML()}<div class="week-strip" id="calendar-grid">${dates.map(date=>`<button class="day ${date===ui.selected?'selected':''} ${date===today()?'today':''}" data-action="day" data-date="${date}" aria-label="${date}" aria-pressed="${date===ui.selected}">${dayNumber(date)}<span class="lunar">${lunarLabel(date)}</span>${eventsForDay(date).length?'<span class="dot"></span>':'<span class="no-dot"></span>'}</button>`).join('')}</div>${allDay.length?`<div class="all-day-items"><span>全天</span><div>${allDay.map(item=>`<button data-action="edit" data-id="${esc(item.id)}">${esc(item.title)}</button>`).join('')}</div></div>`:''}<div class="daily-timeline" aria-label="${ui.selected} 时间轴"><div class="time-canvas" style="height:${24*HOUR_HEIGHT}px">${Array.from({length:25},(_,hour)=>`<div class="time-tick" style="top:${hour*HOUR_HEIGHT}px"><span>${String(hour).padStart(2,'0')}:00</span><i></i></div>`).join('')}<div class="time-blocks">${timedSegments(ui.selected).map(({item,start,end,lane,lanes})=>`<button class="time-block ${(end-start)<35?'short':''}" data-action="edit" data-id="${esc(item.id)}" style="top:${start/60*HOUR_HEIGHT}px;height:${(end-start)/60*HOUR_HEIGHT}px;left:${lane/lanes*100}%;width:calc(${100/lanes}% - 4px);--event-color:${esc(item.color||'#b89b35')}" aria-label="${esc(item.title)} ${item.time}–${item.endTime||''}"><strong>${esc(item.title)}</strong><small>${item.date<ui.selected?'00:00':esc(item.time)}–${end===1440?'24:00':String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0')}</small>${item.location?`<span>${esc(item.location)}</span>`:''}</button>`).join('')}</div>${ui.selected===today()?`<div class="now-line" style="top:${now/60*HOUR_HEIGHT}px"><span>${String(Math.floor(now/60)).padStart(2,'0')}:${String(now%60).padStart(2,'0')}</span></div>`:''}</div></div>`;
}
calendarHTML=()=>{
 const title=ui.calendarView==='Year'?`${ui.year}年`:`${Number(ui.month.slice(0,4))}年 ${Number(ui.month.slice(5))}月`;
 const body=ui.calendarView==='Year'?`<div class="year-grid">${Array.from({length:12},(_,i)=>miniMonthHTML(ui.year+'-'+String(i+1).padStart(2,'0'))).join('')}</div>`:ui.calendarView==='Month'?monthHTML():weekHTML();
 return `<header class="header calendar-head"><div class="month-controls">${btn('month-prev',ui.calendarView==='Week'?'上一周':ui.calendarView==='Year'?'上一年':'上个月','back','','icon-button prev-month')}<button class="month-title" data-action="calendar-level">${title}<small>${ui.calendarView==='Week'?'第 '+weekNumber(ui.selected)+' 周':ui.calendarView==='Month'?'月视图':'年视图'}</small></button>${btn('month-next',ui.calendarView==='Week'?'下一周':ui.calendarView==='Year'?'下一年':'下个月','next','','icon-button next-month')}</div>${btn('more','More options','more')}</header><div class="calendar-viewport"><section class="calendar-stage" data-level="${ui.calendarView}">${body}</section></div><button class="today-button round" data-action="go-today" aria-label="回到今天">${icon('calendar')}<span>${Number(today().slice(8))}</span></button>`;
};
function switchCalendarLevel(level,origin){
 const current=calendarLevels.indexOf(ui.calendarView),next=calendarLevels.indexOf(level);if(next<0)return;if(next===current){menu=null;renderOverlay();return;}
 calendarMotion={kind:next>current?'zoom-out':'zoom-in',origin};ui.calendarView=level;ui.year=Number(ui.month.slice(0,4));menu=null;render();
}
function shiftCalendarPeriod(delta){
 calendarMotion={kind:'slide',direction:delta};
 if(ui.calendarView==='Week'){ui.selected=addDays(ui.selected,delta*7);ui.month=ui.selected.slice(0,7);}
 else if(ui.calendarView==='Year'){ui.year+=delta;ui.month=ui.year+ui.month.slice(4);}
 else{const date=parseDate(ui.month+'-01');date.setMonth(date.getMonth()+delta);ui.month=dateString(date).slice(0,7);}
 render();
}
actions['month-prev']=()=>shiftCalendarPeriod(-1);
actions['month-next']=()=>shiftCalendarPeriod(1);
shiftMonth=shiftCalendarPeriod;
actions['calendar-view']=element=>switchCalendarLevel(({Timeline:'Week','Week view':'Week',Overview:'Month',List:'Month','Events view':'Month'})[element.dataset.view]||element.dataset.view);
actions['calendar-level']=()=>switchCalendarLevel(calendarLevels[Math.min(2,calendarLevels.indexOf(ui.calendarView)+1)]);
actions['expand-calendar']=actions['calendar-level'];
actions['open-month']=element=>{ui.month=element.dataset.month;switchCalendarLevel('Month');};
actions['day']=element=>{
 const date=element.dataset.date;if(!date)return;
 ui.selected=date;ui.month=date.slice(0,7);
 if(ui.calendarView==='Month')switchCalendarLevel('Week');else{calendarMotion={kind:'day'};render();}
};
actions['go-today']=()=>{ui.selected=today();ui.month=today().slice(0,7);ui.year=Number(ui.month.slice(0,4));calendarMotion={kind:'day'};render();};
const overlayWithCalendarMenu=renderOverlay;
renderOverlay=function(){
 overlayWithCalendarMenu();
 if(menu==='view'&&ui.tab==='todos')$('#overlay > .menu [data-action="show-completed"]')?.remove();
 if(menu==='view'&&ui.tab==='calendar'){
  const surface=$('#overlay > .menu');if(surface)surface.innerHTML=calendarLevels.map((level,i)=>menuItem('calendar-view',['周视图','月视图','年视图'][i],['timeline','grid','calendar'][i],`data-view="${level}"`,ui.calendarView===level)).join('');
 }
};
const renderPlannerContent=render;
render=function(){
 const oldStage=$('#app > .screen .calendar-stage');
 const oldTimeline=oldStage?.querySelector('.daily-timeline'),oldScroll=oldTimeline?.scrollTop;
 const oldMonths=oldStage?.querySelector('.month-scroll'),oldMonthScroll=oldMonths?.scrollTop,oldMonth=oldStage?.querySelector('.month-block')?.dataset.month;
 const motion=calendarMotion;calendarMotion=null;
 renderPlannerContent();
 const stage=$('#app > .screen .calendar-stage');if(!stage)return;
 const timeline=stage.querySelector('.daily-timeline');
 if(timeline)timeline.scrollTop=oldScroll!==undefined?oldScroll:8*HOUR_HEIGHT;
 const months=stage.querySelector('.month-scroll');if(months)months.scrollTop=oldMonth===ui.month?oldMonthScroll||0:0;
 if(!oldStage||!motion||motionReduced())return;
 const outgoing=document.createElement('div');outgoing.className='calendar-outgoing';outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');
 oldStage.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));outgoing.append(oldStage);stage.parentNode.append(outgoing);
 if(oldTimeline)oldTimeline.scrollTop=oldScroll;
 if(oldMonths)oldMonths.scrollTop=oldMonthScroll;
 if(motion.origin){const rect=stage.getBoundingClientRect();stage.style.transformOrigin=outgoing.style.transformOrigin=`${motion.origin.x-rect.left}px ${motion.origin.y-rect.top}px`;}
 const zoom=motion.kind.startsWith('zoom');
 const incoming=zoom?(motion.kind==='zoom-out'?'scale(1.08)':'scale(.9)'):motion.kind==='slide'?`translateX(${(motion.direction||1)*18}%)`:'none';
 const leaving=zoom?(motion.kind==='zoom-out'?'scale(.88)':'scale(1.08)'):motion.kind==='slide'?`translateX(${-(motion.direction||1)*18}%)`:'none';
 Object.assign(stage.style,{transform:incoming,opacity:'.25'});
 settleSurface(stage,{transform:'none',opacity:'1'},240);
 retireSurface(outgoing,{transform:leaving,opacity:'0'},220);
};
function onCalendarTouchStart(event){
 if(panel||menu||modal||ui.tab!=='calendar'||!event.target.closest('.calendar-stage'))return;
 if(event.touches.length===2){
  const [a,b]=event.touches;event.preventDefault();
  calendarGesture={pinch:true,distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),origin:{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2},used:false};
 }else if(event.touches.length===1)calendarGesture={pinch:false,x:event.touches[0].clientX,y:event.touches[0].clientY,dx:0,dy:0};
}
function onCalendarTouchMove(event){
 const gesture=calendarGesture;if(!gesture)return;
 if(gesture.pinch){
  if(event.touches.length!==2)return;event.preventDefault();if(gesture.used)return;
  const [a,b]=event.touches,ratio=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/gesture.distance;
  if(ratio<.78||ratio>1.28){const index=calendarLevels.indexOf(ui.calendarView),next=Math.max(0,Math.min(2,index+(ratio<1?1:-1)));gesture.used=true;suppressCalendarClickUntil=performance.now()+400;switchCalendarLevel(calendarLevels[next],gesture.origin);}
 }else if(event.touches.length===1){
  gesture.dx=event.touches[0].clientX-gesture.x;gesture.dy=event.touches[0].clientY-gesture.y;
  if(Math.abs(gesture.dx)>14&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.3){event.preventDefault();const stage=$('.calendar-stage');if(stage){stage.style.transform=`translateX(${Math.max(-60,Math.min(60,gesture.dx*.4))}px)`;}}
 }
}
function onCalendarTouchEnd(event){
 const gesture=calendarGesture;if(!gesture)return;
 if(gesture.pinch){if(event.touches.length===0)calendarGesture=null;return;}
 calendarGesture=null;
 if(Math.abs(gesture.dx)>48&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.3){suppressCalendarClickUntil=performance.now()+400;shiftCalendarPeriod(gesture.dx<0?1:-1);}
 else{const stage=$('.calendar-stage');if(stage)settleSurface(stage,{transform:'none',opacity:'1'},180);}
}
document.addEventListener('pointerdown',()=>{suppressCalendarClickUntil=0;},true);
document.addEventListener('click',event=>{if(performance.now()<suppressCalendarClickUntil&&event.target.closest('.calendar-stage')){event.preventDefault();event.stopImmediatePropagation();}},true);

// Flat persisted records retain compatibility with reminders and backups; parentId adds hierarchy.
const foldedTasks=new Set();
let draftChildren=[];
function descendantsOf(id){const result=new Set(),pending=[id];while(pending.length){const parent=pending.pop();for(const item of data.items){if(item.parentId===parent&&!result.has(item.id)&&item.id!==id){result.add(item.id);pending.push(item.id);}}}return result;}
function normalizeHierarchy(){
 const byId=new Map(data.items.map(item=>[item.id,item]));
 for(const item of data.items){
  if(item.kind!=='todo'){delete item.parentId;continue;}
  if(typeof item.parentId!=='string'||!byId.has(item.parentId)||byId.get(item.parentId).kind!=='todo'||item.parentId===item.id)item.parentId=null;
 }
 for(const item of data.items){const seen=new Set([item.id]);let parent=byId.get(item.parentId);while(parent){if(seen.has(parent.id)){item.parentId=null;break;}seen.add(parent.id);parent=byId.get(parent.parentId);}}
}
normalizeHierarchy();
function todoPool(){return data.items.filter(item=>item.kind==='todo'&&included(item)).sort((a,b)=>data.settings.sortPriority?Number(b.priority)-Number(a.priority):0);}
filteredTodos=()=>todoPool().filter(item=>ui.filter==='Completed'?item.done:ui.filter==='Pending'?!item.done:true);
function todoFiltersHTML(){return `<nav class="todo-filters" aria-label="任务状态筛选">${[['All','All'],['Pending','未完成'],['Completed','已完成']].map(([value,label])=>`<button data-action="todo-filter" data-todo-filter="${value}" aria-pressed="${ui.filter===value}" class="${ui.filter===value?'active':''}">${label}</button>`).join('')}</nav>`;}
actions['todo-filter']=element=>{ui.filter=element.dataset.todoFilter;ui.collapsed.clear();render();};
taskHTML=(item,batch=false)=>{
 const children=data.items.filter(child=>child.parentId===item.id),parent=data.items.find(parent=>parent.id===item.parentId);
 const meta=[item.done?'已完成':'',item.date?`${Number(item.date.slice(5,7))}/${Number(item.date.slice(8))}${item.time?' '+item.time:''}`:'',children.length?`${children.filter(child=>child.done).length}/${children.length} 子任务`:''].filter(Boolean).join(' · ');
 const done=batch?ui.selectedIds.has(item.id):item.done;
 return `<article class="task ${item.done?'done':''} ${item.kind==='event'?'event':''} ${ui.selectedIds.has(item.id)?'selected':''}" data-task-id="${esc(item.id)}" style="--task-color:${esc(item.color||'#b89b35')}">${children.length&&!batch?`<button class="task-fold ${foldedTasks.has(item.id)?'folded':''}" data-action="task-collapse" data-id="${esc(item.id)}" aria-label="展开或收起 ${esc(item.title)}" aria-expanded="${!foldedTasks.has(item.id)}">${icon('down')}</button>`:''}<button class="check ${batch?'batch-check':''} ${done?'checked':''}" data-action="${batch?'select':'complete'}" data-id="${esc(item.id)}" aria-label="${batch?'Select ':'Complete '}${esc(item.title)}" aria-pressed="${!!done}"><span>${done?icon('check'):''}</span></button><button class="task-main" data-action="${batch?'select':'edit'}" data-id="${esc(item.id)}"><div class="task-title">${esc(item.title)}</div>${meta?`<div class="task-meta">${esc(meta)}</div>`:''}</button><div class="task-labels">${item.priority?`<span class="flag small-icon">${icon('flag')}</span>`:''}<span class="task-calendar-tag">${esc(item.calendar||'Default')}</span>${parent?`<span class="task-parent-tag">${esc(parent.title)}</span>`:''}</div></article>`;
};
function todoTreeHTML(item,depth=0,visible=filteredTodos()){
 const children=visible.filter(child=>child.parentId===item.id);
 return `<div class="task-tree" data-tree-id="${esc(item.id)}" style="--depth:${Math.min(depth,3)}">${taskHTML(item,ui.batch)}${!foldedTasks.has(item.id)&&children.length?`<div class="task-children">${children.map(child=>todoTreeHTML(child,depth+1,visible)).join('')}</div>`:''}</div>`;
}
todosHTML=()=>{
 const pool=todoPool(),byId=new Map(pool.map(item=>[item.id,item])),ids=new Set(filteredTodos().map(item=>item.id));
 for(const id of [...ids]){let parent=byId.get(byId.get(id)?.parentId);while(parent&&!ids.has(parent.id)){ids.add(parent.id);parent=byId.get(parent.parentId);}}
 const visible=pool.filter(item=>ids.has(item.id));
 const roots=visible.filter(item=>!item.parentId||!ids.has(item.parentId));
 if(!roots.length)return emptyHTML();
 if(!data.settings.grouped)return roots.map(item=>todoTreeHTML(item,0,visible)).join('');
 const groups={Overdue:[],Today:[],Upcoming:[],Unscheduled:[],Done:[]};
 roots.forEach(item=>groups[item.done?'Done':!item.date?'Unscheduled':item.date<today()?'Overdue':item.date===today()?'Today':'Upcoming'].push(item));
 return Object.entries(groups).filter(([,items])=>items.length).map(([label,items])=>`<section class="group"><button class="group-heading ${ui.collapsed.has(label)?'closed':''}" data-action="collapse" data-label="${label}" aria-expanded="${!ui.collapsed.has(label)}"><span>${label}</span><span class="count">${items.length}</span>${icon('down')}</button>${ui.collapsed.has(label)?'':items.map(item=>todoTreeHTML(item,0,visible)).join('')}</section>`).join('');
};
actions['task-collapse']=element=>{const id=element.dataset.id;foldedTasks.has(id)?foldedTasks.delete(id):foldedTasks.add(id);render();};
const openFlatEditor=openEditor;
openEditor=id=>{
 draftChildren=id?data.items.filter(item=>item.kind==='todo'&&item.parentId===id).map(item=>({...item})):[];
 openFlatEditor(id);draft.parentId=draft.parentId||null;
};
const flatEditorHTML=editorHTML;
editorHTML=()=>{
 let html=flatEditorHTML();if(draft.kind!=='todo')return html;
 const excluded=descendantsOf(draft.id);excluded.add(draft.id);
 const parents=data.items.filter(item=>item.kind==='todo'&&!excluded.has(item.id));
 const parentControl=`<div class="edit-card"><label class="row"><span class="label">所属大任务</span><select data-draft="parentId" aria-label="所属大任务"><option value="">独立任务</option>${parents.map(item=>`<option value="${esc(item.id)}" ${draft.parentId===item.id?'selected':''}>${esc(item.title)}</option>`).join('')}</select>${icon('down','chevron')}</label></div>`;
 const subtaskSection=`<div class="subtask-editor edit-card"><div class="subtask-heading"><strong>子任务</strong><span>${draftChildren.filter(item=>item.done).length}/${draftChildren.length}</span></div>${draftChildren.map(item=>`<div class="subtask-edit-row"><input class="subtask-check" type="checkbox" data-child-done="${esc(item.id)}" ${item.done?'checked':''} aria-label="完成子任务 ${esc(item.title)}"><input type="text" data-child-title="${esc(item.id)}" value="${esc(item.title)}" placeholder="子任务名称" aria-label="子任务名称"><button class="child-date" data-action="child-date" data-id="${esc(item.id)}" aria-label="子任务时间">${item.date?esc(item.date.slice(5)):'日期'}</button><button class="icon-button" data-action="child-remove" data-id="${esc(item.id)}" aria-label="移除子任务">${icon('close')}</button></div>`).join('')}<button class="text-button add-subtask" data-action="child-add">${icon('plus')} 添加子任务</button></div>`;
 html=html.replace('<div class="more-label">More settings</div>',parentControl+subtaskSection+'<div class="more-label">More settings</div>');
 return html;
};
actions['child-add']=()=>{draftChildren.push({id:uid(),kind:'todo',title:'',date:'',time:'',parentId:draft.id,calendar:draft.calendar,color:draft.color,done:false,reminder:'None',repeat:'Once'});renderOverlay();const fields=document.querySelectorAll('[data-child-title]');fields[fields.length-1]?.focus({preventScroll:true});};
actions['child-remove']=element=>{draftChildren=draftChildren.filter(item=>item.id!==element.dataset.id);renderOverlay();};
actions['child-date']=element=>{
 const child=draftChildren.find(item=>item.id===element.dataset.id);if(!child)return;
 showDialog('子任务时间',`<label>日期<input id="child-date" type="date" value="${esc(child.date||today())}"></label><label>时间<input id="child-time" type="time" value="${esc(child.time||'08:30')}"></label>`,()=>{child.date=$('#child-date').value;child.time=$('#child-time').value;return true;});
};
document.addEventListener('input',event=>{const id=event.target.dataset.childTitle;if(id){const child=draftChildren.find(item=>item.id===id);if(child)child.title=event.target.value;}});
document.addEventListener('change',event=>{const id=event.target.dataset.childDone;if(id){const child=draftChildren.find(item=>item.id===id);if(child)child.done=event.target.checked;}});
const saveFlatDraft=saveDraft;
saveDraft=()=>{
 if(draft.kind!=='todo'){saveFlatDraft();return;}
 if(!draft.title.trim())return;
 const invalidParent=draft.parentId&&(draft.parentId===draft.id||descendantsOf(draft.id).has(draft.parentId));
 if(invalidParent){$('#form-error').textContent='不能将任务放到自己或自己的子任务下';return;}
 const previous=data.items;
 const existingChildren=new Set(data.items.filter(item=>item.parentId===draft.id).map(item=>item.id));
 const kept=new Set(draftChildren.filter(item=>item.title.trim()).map(item=>item.id));
 const removed=new Set();for(const id of existingChildren){if(!kept.has(id)){removed.add(id);descendantsOf(id).forEach(childId=>removed.add(childId));}}
 data.items=data.items.filter(item=>!existingChildren.has(item.id)&&!removed.has(item.id));
 for(const child of draftChildren){if(child.title.trim())data.items.push({...child,title:child.title.trim(),parentId:draft.id,calendar:child.calendar||draft.calendar});}
 const previousFilter=ui.filter;ui.filter='All';draft.parentId=draft.parentId||null;saveFlatDraft();
 if(panel){data.items=previous;ui.filter=previousFilter;}
};
actions.save=()=>saveDraft();
actions.complete=element=>{const item=data.items.find(item=>item.id===element.dataset.id);if(item){const children=descendantsOf(item.id);for(const child of data.items){if(children.has(child.id))child.done=!item.done;}}completeImmediately(element);};
const deleteFlatIds=deleteIds;
deleteIds=ids=>{const all=new Set(ids);ids.forEach(id=>descendantsOf(id).forEach(child=>all.add(child)));deleteFlatIds([...all]);};
// Preserve parent relations in imported backups after the existing field validation.
const importFlatBackup=importBackupFile;
importBackupFile=async file=>{
 if(!file||file.size>5*1024*1024){await importFlatBackup(file);return;}
 let incoming;try{incoming=JSON.parse(await file.text());}catch{await importFlatBackup(file);return;}
 const safe=Array.isArray(incoming.items)&&incoming.items.length<=10000&&incoming.items.every(item=>item&&typeof item.title==='string'&&item.title.length<=1000&&['todo','event'].includes(item.kind)&&typeof item.date==='string'&&(!item.date||/^\d{4}-\d{2}-\d{2}$/.test(item.date))&&(!item.color||/^#[0-9a-f]{6}$/i.test(item.color)));
 if(!safe){await importFlatBackup(file);return;}
 const beforeIds=new Set(data.items.map(item=>item.id));
 await importFlatBackup(file);
 if(Array.isArray(incoming.items)){
  const records=new Map(incoming.items.filter(item=>item&&typeof item.id==='string').map(item=>[item.id,item]));
  for(const item of data.items){const record=records.get(item.id);if(record&&(!beforeIds.has(item.id)||item.title===record.title))item.parentId=typeof record.parentId==='string'?record.parentId:null;}
  normalizeHierarchy();persist();render();
 }
};
initializeNative();
render();
