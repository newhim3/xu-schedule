const assert=require('node:assert/strict');
const core=require('../replica/planner.js');
const now=Date.parse('2026-10-18T12:00:00+08:00');
const items=[{id:'parent',kind:'todo'},{id:'child',kind:'todo',parentId:'parent'},
 {id:'a',kind:'event',taskBlock:true,goalId:'child',date:'2026-10-18',time:'08:00',endDate:'2026-10-18',endTime:'09:30',done:true},
 {id:'b',kind:'event',taskBlock:true,goalId:'parent',date:'2026-10-18',time:'10:00',endDate:'2026-10-18',endTime:'10:30',done:true},
 {id:'future',kind:'event',taskBlock:true,goalId:'child',date:'2026-10-18',time:'13:00',endDate:'2026-10-18',endTime:'14:00',done:true},
 {id:'unchecked',kind:'event',taskBlock:true,goalId:'child',date:'2026-10-18',time:'10:30',endDate:'2026-10-18',endTime:'11:00',done:false}];
assert.equal(typeof core.goalMinutes,'function','Goal time accounting must exist');
assert.equal(core.goalMinutes(items,'child',now),90,'Only completed, ended sessions credit a child goal');
assert.equal(core.goalMinutes(items,'parent',now),120,'Parent includes descendants exactly once');
assert.equal(core.goalMinutes(items,'parent',now),120,'Repeated rendering never double counts');
assert.equal(core.canComplete(items[4],now),false,'Cannot complete before end');
assert.equal(core.canComplete(items[2],Date.parse('2026-10-18T09:30:00+08:00')),true,'End instant unlocks completion');
items[2].done=false;assert.equal(core.goalMinutes(items,'parent',now),30,'Undo removes credited time');
const night={date:'2026-10-17',time:'23:00',endDate:'2026-10-18',endTime:'01:30'};
assert.equal(core.durationMinutes(night),150,'Cross-midnight duration is exact');
assert.equal(core.durationMinutes({...night,endDate:'2026-10-17'}),0,'Invalid interval never credits negative time');
assert.equal(typeof core.mergeBackup,'function','Full planner backup merge must exist');
const backup={version:2,items:[{id:'g',kind:'todo',title:'目标',date:'',parentId:null,importance:3,estimatedMinutes:600,notes:'批注',color:'#5ba6a0',calendar:'自定义'},
 {id:'s',kind:'event',title:'安排',date:'2026-10-18',time:'08:00',endDate:'2026-10-18',endTime:'09:00',goalId:'g',taskBlock:true,done:true,color:'#5ba6a0'}],
 insights:[{id:'i',title:'感悟',notes:'记录',validationDates:[now-1000,now],pinned:true,createdAt:now,updatedAt:now}],settings:{language:'en',glassCalendar:true,categories:['自定义'],weekStart:1}};
const current={items:[{id:'old',kind:'todo',title:'旧任务',date:''}],settings:{categories:['Default']},insights:[]};
const merged=core.mergeBackup(current,backup);
assert.equal(merged.items.length,3,'Import merges without discarding old tasks');assert.equal(core.goalMinutes(merged.items,'g',now),60);
assert.equal(merged.items.find(x=>x.id==='g').estimatedMinutes,600);assert.equal(merged.items.find(x=>x.id==='s').goalId,'g');
assert.equal(merged.insights[0].validationDates.length,2);assert(merged.settings.categories.includes('自定义'));assert.equal(merged.settings.language,'en');
const before=JSON.stringify(current);assert.throws(()=>core.mergeBackup(current,{...backup,items:[{id:'x',kind:'event',title:'bad',date:'2026-10-18',time:'99:00'}]}),'Bad times are rejected atomically');assert.equal(JSON.stringify(current),before);
assert.throws(()=>core.mergeBackup(current,{...backup,insights:[{id:'x',title:'bad',validationDates:'wrong'}]}));
assert.equal(core.mergeBackup(current,{items:[{id:'legacy',kind:'todo',title:'旧版备份',date:'',priority:true}]}).items.find(x=>x.id==='legacy').importance,4,'Old backups migrate without data loss');
console.log('PASS: ended-only accounting, child roll-up, idempotency, undo and cross-midnight time');
