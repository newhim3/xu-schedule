'use strict';
// Wall-clock intervals survive suspension, navigation and process restarts.
const FocusCore={
 stamp(date,time){return Date.parse(date+'T'+time+':00+08:00');},
 parts(stamp){const value=new Date(stamp+28800000).toISOString();return {date:value.slice(0,10),time:value.slice(11,16)};},
 range(item){return item.focusActual?[item.actualStartAt,item.actualEndAt]:[this.stamp(item.date,item.time),this.stamp(item.endDate||item.date,item.endTime)];},
 available(plan,now){const [start,end]=this.range(plan);return !plan.done&&!plan.focusActual&&Number.isFinite(start)&&now>=start&&now<end;},
 start({id,goalId,goalTitle='',color='#5ba6a0',plan=null},now){
  if(plan&&!this.available(plan,now))throw Error('Outside planned window');
  return {id,goalId,goalTitle,color,planId:plan?.id||null,deadline:plan?this.range(plan)[1]:null,startedAt:now,status:'running',extended:false,segments:[{start:now,end:null}]};
 },
 elapsed(session,now){return session.segments.reduce((sum,part)=>sum+Math.max(0,(part.end??(session.deadline&&!session.extended?Math.min(now,session.deadline):now))-part.start),0);},
 reconcile(session,now){
  const copy=JSON.parse(JSON.stringify(session));
  if(!['finished','boundary'].includes(copy.status)&&copy.deadline&&!copy.extended&&now>=copy.deadline){
   copy.wasRunning=copy.status==='running';for(const segment of copy.segments)if(segment.end===null)segment.end=Math.max(segment.start,copy.deadline);copy.status='boundary';
  }
  return copy;
 },
 pause(session,now){const copy=this.reconcile(session,now);if(copy.status==='running'){copy.segments.at(-1).end=now;copy.status='paused';}return copy;},
 resume(session,now){const copy=this.reconcile(session,now);if(copy.status==='paused'){copy.segments.push({start:now,end:null});copy.status='running';}return copy;},
 extend(session,now){const copy=this.reconcile(session,now);if(copy.status==='boundary'){copy.extended=true;copy.status='running';copy.segments.push({start:copy.wasRunning?copy.deadline:now,end:null});}return copy;},
 finish(session,now){const copy=this.reconcile(session,now);for(const segment of copy.segments)if(segment.end===null)segment.end=now;copy.status='finished';copy.finishedAt=now;return copy;},
 snap(minutes){return Math.max(0,Math.min(1440,Math.round(minutes/15)*15));},
 nearbyPlan(items,goalId,now){
  const candidates=items.filter(item=>item.kind==='event'&&item.taskBlock&&!item.focusActual&&!item.done&&(item.goalId===goalId||item.chooseAtStart&&item.alternativeGoalIds?.includes(goalId))).map(item=>{const [start,end]=this.range(item.planOriginal||item);return {item,start,end,distance:Math.max(start-now,now-end,0)};}).filter(entry=>Number.isFinite(entry.distance)&&entry.distance<=15*60000);
  candidates.sort((a,b)=>a.distance-b.distance||Math.abs(a.start-now)-Math.abs(b.start-now));return candidates[0]?.item||null;
 },
 calendarItems(items){
  const actuals=items.filter(item=>item.focusActual),matched=new Set(),result=[];
  for(const item of items){
   if(item.focusActual)continue;
   if(item.kind!=='event'||item.allDay){result.push(item);continue;}
   const original=item.planOriginal||item,[start,end]=this.range(original);
   const same=actuals.filter(actual=>(actual.sourcePlanId===item.id&&(actual.goalId===item.goalId||item.chooseAtStart&&item.alternativeGoalIds?.includes(actual.goalId))||item.goalId&&actual.goalId===item.goalId)&&actual.actualStartAt<end&&actual.actualEndAt>start);
   if(!same.length){result.push(item.planOriginal?{...item,...original}:item);continue;}
   same.forEach(actual=>matched.add(actual.id));let remaining=[[start,end]];
   for(const actual of same)remaining=remaining.flatMap(([a,b])=>actual.actualStartAt>=b||actual.actualEndAt<=a?[[a,b]]:[[a,Math.min(b,actual.actualStartAt)],[Math.max(a,actual.actualEndAt),b]].filter(([x,y])=>y>x));
   for(const [a,b] of remaining){const from=this.parts(a),to=this.parts(b);result.push({...item,date:from.date,time:from.time,endDate:to.date,endTime:to.time,renderRemainder:true});}
  }
  for(const item of actuals){const linked=items.find(plan=>plan.id===item.sourcePlanId);result.push({...item,samePlanOverlay:matched.has(item.id)||!!linked&&(linked.goalId===item.goalId||linked.chooseAtStart&&linked.alternativeGoalIds?.includes(item.goalId))});}
  return result;
 },
 validTrigger(rule){return !!rule&&['manual','goal','focus'].includes(rule.type)&&['armed','fired'].includes(rule.state)&&Number.isInteger(rule.minutes)&&rule.minutes>0&&rule.minutes<=1440&&(rule.type==='manual'?typeof rule.label==='string'&&!!rule.label.trim()&&rule.label.length<=200:typeof rule.goalId==='string'&&rule.goalId.length>0&&rule.goalId.length<=200);},
 clockLayout(segments){
  const ends=[-Infinity,-Infinity,-Infinity],arcs=[],groups=new Map();
  for(const segment of [...segments].sort((a,b)=>a.start-b.start||b.end-a.end)){
   const track=ends.findIndex(end=>segment.start>=end+4);
   if(segment.end-segment.start>=12&&track>=0){arcs.push({...segment,track});ends[track]=segment.end;}
   else{const key=Math.floor(segment.start/120),group=groups.get(key)||{key,start:key*120,end:(key+1)*120,segments:[]};group.segments.push(segment);groups.set(key,group);}
  }
  return {arcs,groups:[...groups.values()]};
 },
 activateTriggers(items,sessions,previous,enabled,now,manualId=null){
  if(!enabled)return items;
  const generated=[],previousGoals=new Map((previous?.items||[]).map(item=>[item.id,item])),previousSessions=new Map((previous?.focusSessions||[]).map(session=>[session.id,session]));
  const result=items.map(item=>{
   const rule=item.trigger;if(!this.validTrigger(rule)||rule.state!=='armed')return item;
   const fires=rule.type==='manual'?item.id===manualId:!!previous&&(rule.type==='goal'?items.some(goal=>goal.id===rule.goalId&&goal.kind==='todo'&&goal.done&&previousGoals.has(goal.id)&&!previousGoals.get(goal.id).done):sessions.some(session=>session.goalId===rule.goalId&&session.status==='finished'&&previousSessions.has(session.id)&&previousSessions.get(session.id).status!=='finished'));
   if(!fires)return item;
   const start=this.parts(now),end=this.parts(this.stamp(start.date,start.time)+rule.minutes*60000),plan={...item,id:'trigger-'+item.id+'-'+now,date:start.date,time:start.time,endDate:end.date,endTime:end.time,done:false,triggeredBy:item.id};
   delete plan.trigger;generated.push(plan);return {...item,trigger:{...rule,state:'fired',firedAt:now}};
  });
  return result.concat(generated);
 },
 project(items,session){
  const result=items.filter(item=>item.focusId!==session.id).map(item=>({...item}));
  const goal=result.find(item=>item.id===session.goalId);
  const closed=session.segments.filter(part=>Number.isFinite(part.end)&&part.end>part.start);
  closed.forEach((part,index)=>{
   const start=this.parts(part.start),end=this.parts(part.end);
   result.push({id:'focus-'+session.id+'-'+index,kind:'event',taskBlock:true,focusActual:true,focusId:session.id,goalId:session.goalId,sourcePlanId:session.planId,title:goal?.title||session.goalTitle||'专注',color:goal?.color||session.color,calendar:goal?.calendar||'Default',date:start.date,time:start.time,endDate:end.date,endTime:end.time,actualStartAt:part.start,actualEndAt:part.end,done:true,reminder:'None',notes:''});
  });
  for(const item of result){
   if(item.kind!=='event'||item.focusActual||item.allDay)continue;
   const original=item.planOriginal||{date:item.date,time:item.time,endDate:item.endDate||item.date,endTime:item.endTime};
   const [start,end]=this.range(original);
   const overlaps=closed.some(part=>part.start<end&&part.end>start);
   if(overlaps){item.planOriginal=original;item.focusCoveredBy=[...new Set([...(item.focusCoveredBy||[]),session.id])];}
   if(item.id===session.planId&&closed.length){item.planOriginal=original;const actualEnd=closed.at(-1).end;const endParts=this.parts(actualEnd);item.endDate=endParts.date;item.endTime=endParts.time;item.actualStartAt=closed[0].start;item.actualEndAt=actualEnd;}
  }
  return result;
 },
 creditMinutes(items,ids,now){
  const actual=items.filter(item=>item.focusActual&&item.done&&Number.isFinite(item.actualStartAt)&&Number.isFinite(item.actualEndAt)&&item.actualEndAt<=now);
  let total=actual.filter(item=>ids.has(item.goalId)).reduce((sum,item)=>sum+Math.max(0,item.actualEndAt-item.actualStartAt),0);
  for(const item of items){
   if(item.focusActual||!item.taskBlock||!item.done||!ids.has(item.goalId))continue;
   const [start,end]=this.range(item);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end>now)continue;
   const covered=actual.map(other=>[Math.max(start,other.actualStartAt),Math.min(end,other.actualEndAt)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
   let excluded=0,cursor=start;for(const [a,b] of covered){excluded+=Math.max(0,b-Math.max(cursor,a));cursor=Math.max(cursor,b);}
   total+=end-start-excluded;
  }
  return total/60000;
 },
 dailyActual(items,sessions,now){
  const intervals=[],known=new Set();
  const add=(start,end)=>{end=Math.min(end,now);if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)intervals.push([start,end]);};
  for(const session of sessions){
   if(!this.validate(session))continue;known.add(session.id);
   const snapshot=this.reconcile(session,now);
   for(const part of snapshot.segments)add(part.start,part.end??now);
  }
  for(const item of items)if(item.focusActual&&!known.has(item.focusId))add(item.actualStartAt,item.actualEndAt);
  intervals.sort((a,b)=>a[0]-b[0]);const merged=[];
  for(const [start,end] of intervals){const previous=merged.at(-1);if(previous&&start<=previous[1])previous[1]=Math.max(previous[1],end);else merged.push([start,end]);}
  const totals={};
  for(const [start,end] of merged){let cursor=start;while(cursor<end){const date=this.parts(cursor).date,stop=Math.min(end,this.stamp(date,'00:00')+86400000);totals[date]=(totals[date]||0)+(stop-cursor)/60000;cursor=stop;}}
  return totals;
 },
 statistics(items,sessions,date,now){
  const raw=[],known=new Set(),byId=new Map(items.map(item=>[item.id,item])),dayStart=this.stamp(date,'00:00'),dayEnd=dayStart+86400000;
  const add=(start,end,goalId,sessionId,title,color)=>{end=Math.min(end,now);if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)raw.push({start,end,goalId:goalId||'',sessionId,title,color});};
  for(const session of sessions){if(!this.validate(session))continue;known.add(session.id);const snapshot=this.reconcile(session,now);for(const part of snapshot.segments)add(part.start,part.end??now,session.goalId,session.id,session.goalTitle,session.color);}
  for(const item of items)if(item.focusActual&&!known.has(item.focusId))add(item.actualStartAt,item.actualEndAt,item.goalId,item.focusId||item.id,item.title,item.color);
  const events=raw.flatMap((part,index)=>[{time:part.start,index,open:true},{time:part.end,index,open:false}]).sort((a,b)=>a.time-b.time),active=new Map(),canonical=[];
  let cursor=0;while(cursor<events.length){const time=events[cursor].time;while(cursor<events.length&&events[cursor].time===time){const event=events[cursor++];if(event.open)active.set(event.index,raw[event.index]);else active.delete(event.index);}
   const end=events[cursor]?.time;if(!active.size||!Number.isFinite(end)||end<=time)continue;
   let owner;for(const part of active.values())if(!owner||part.start>=owner.start)owner=part;
   canonical.push({...owner,start:time,end});
  }
  const daily={},hourly=Array(24).fill(0),goals=new Map();let totalMinutes=0;
  for(const part of canonical){let start=part.start;totalMinutes+=(part.end-start)/60000;
   while(start<part.end){const key=this.parts(start).date,stop=Math.min(part.end,this.stamp(key,'00:00')+86400000);daily[key]=(daily[key]||0)+(stop-start)/60000;start=stop;}
   start=Math.max(dayStart,part.start);const end=Math.min(dayEnd,part.end);if(end<=start)continue;
   const goal=byId.get(part.goalId),entry=goals.get(part.goalId)||{goalId:part.goalId,title:goal?.title||part.title||'专注',color:goal?.color||part.color||'#80b8a6',minutes:0};entry.minutes+=(end-start)/60000;goals.set(part.goalId,entry);
   while(start<end){const hour=Math.floor((start-dayStart)/3600000),stop=Math.min(end,dayStart+(hour+1)*3600000);hourly[hour]+=(stop-start)/60000;start=stop;}
  }
  const records=raw.filter(part=>part.start<dayEnd&&part.end>dayStart).map(part=>({...part,start:Math.max(dayStart,part.start),end:Math.min(dayEnd,part.end)})).sort((a,b)=>a.start-b.start);
  return {minutes:daily[date]||0,count:new Set(records.map(part=>part.sessionId)).size,totalMinutes,totalCount:new Set(raw.map(part=>part.sessionId)).size,activeDays:Object.keys(daily).length,daily,hourly,goals:[...goals.values()].sort((a,b)=>b.minutes-a.minutes),records};
 },
 validate(session){
  const stamp=value=>Number.isSafeInteger(value)&&value>=0&&value<=253402300799999;
  if(!session||typeof session.id!=='string'||!session.id.length||session.id.length>200||typeof session.goalId!=='string'||!session.goalId.length||session.goalId.length>200||!['running','paused','boundary','finished'].includes(session.status)||!stamp(session.startedAt)||!Array.isArray(session.segments)||!session.segments.length||session.segments.length>10000||session.deadline!=null&&(!stamp(session.deadline)||session.deadline<=session.startedAt)||session.status==='boundary'&&session.deadline==null||![undefined,true,false].includes(session.extended))return false;
  let previousEnd=session.startedAt,open=0;
  for(let index=0;index<session.segments.length;index++){
   const part=session.segments[index];if(!part||!stamp(part.start)||part.start<previousEnd)return false;
   if(part.end===null){if(index!==session.segments.length-1)return false;open++;}
   else{if(!stamp(part.end)||part.end<part.start)return false;previousEnd=part.end;}
  }
  return session.status==='running'?open===1:open===0;
 }
};
if(typeof module!=='undefined'&&module.exports)module.exports=FocusCore;
