const assert=require('node:assert/strict'),F=require('../replica/focus-core.js');
const items=[{id:'math',kind:'todo',title:'计算理论',color:'#b89b35'},{id:'english',kind:'todo',title:'听力练习',color:'#b89b35'}];
const segments=[
 {item:{id:'plan',goalId:'math',title:'计算理论',color:'#b89b35'},start:840,end:960},
 {item:{id:'actual-a',goalId:'math',title:'计算理论',focusActual:true,color:'#b89b35'},start:850,end:880},
 {item:{id:'actual-b',goalId:'math',title:'计算理论',focusActual:true,color:'#b89b35'},start:900,end:930},
 {item:{id:'listen',goalId:'english',title:'听力练习',color:'#b89b35'},start:780,end:830}
];
const before=JSON.stringify({segments,items});
assert.equal(typeof F.clockPresentation,'function','Clock needs task-based colors and one label per task');
const view=F.clockPresentation(segments,items);
const math=view.segments.filter(p=>p.item.goalId==='math'),english=view.segments.find(p=>p.item.goalId==='english');
assert.equal(new Set(math.map(p=>p.item.color)).size,1,'Plan and every actual interval use the same task color');
assert.notEqual(math[0].item.color,english.item.color,'Different goals remain distinguishable even with identical stored colors');
assert.equal(view.labels.length,2,'Repeated intervals share a single task annotation');
assert.equal(view.labels.find(p=>p.item.goalId==='math').item.focusActual,true,'The actual interval owns the annotation, not a second plan label');
assert.equal(view.labels.find(p=>p.item.goalId==='math').periodCount,2,'A unified annotation reports the number of actual periods, not a misleading single range');
assert.equal(JSON.stringify({segments,items}),before,'Presentation never changes source records or colors');
const reordered=F.clockPresentation([...segments].reverse(),items);
assert.equal(reordered.segments.find(p=>p.item.id==='plan').item.color,math[0].item.color,'Color is independent of record order');
const anotherDay=F.clockPresentation([segments[1]],items);
assert.equal(anotherDay.segments[0].item.color,math[0].item.color,'Color remains stable on days without the other records');
console.log('PASS task identity colors, one annotation and immutable source records');
