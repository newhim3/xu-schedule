const assert=require('node:assert/strict'),F=require('../replica/focus-core.js');
const segments=Array.from({length:12},(_,i)=>({item:{id:'overlap-'+i},start:600+i,end:660+i})).concat(Array.from({length:20},(_,i)=>({item:{id:'short-'+i},start:720+i*2,end:721+i*2})));
assert.equal(typeof F.clockLayout,'function','Dense clock needs capped readable tracks and grouped overflow');
const layout=F.clockLayout(segments);
assert(layout.arcs.length<=3,'Simultaneous long schedules never become dozens of narrow slices');
assert(layout.arcs.every(arc=>arc.track>=0&&arc.track<3));
assert(layout.groups.length>0,'Short and excess schedules are collected into readable markers');
const ids=[...layout.arcs,...layout.groups.flatMap(group=>group.segments)].map(part=>part.item.id);
assert.deepEqual(ids.sort(),segments.map(part=>part.item.id).sort(),'Every schedule remains accessible exactly once');
for(const track of [0,1,2]){const arcs=layout.arcs.filter(arc=>arc.track===track).sort((a,b)=>a.start-b.start);for(let i=1;i<arcs.length;i++)assert(arcs[i].start>=arcs[i-1].end+4,'Arc neighbors keep a visible gap');}
console.log('PASS bounded clock tracks, visible separation and lossless dense-task groups');
