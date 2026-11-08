'use strict';
const ScheduleSync = (() => {
 const collections=['items','insights','focusSessions'];
 const snapshot=data=>({version:3,items:data.items,insights:data.insights||[],focusSessions:(data.focusSessions||[]).filter(x=>x.status==='finished'),courses:data.courses||[]});
 const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
 const equal=(a,b)=>canonical(a)===canonical(b);
 function merge(base,local,remote,prefer){
  const conflicts=[],result={version:3};
  const pick=(before,a,b,key)=>{
   if(equal(a,b)||equal(before,b))return a;
   if(equal(before,a))return b;
   conflicts.push({key,local:a,remote:b});return prefer==='remote'?b:a;
  };
  for(const key of collections){
   const [previous,left,right]=[base,local,remote].map(s=>new Map((s?.[key]||[]).map(x=>[x.id,x])));
   result[key]=[...new Set([...previous.keys(),...left.keys(),...right.keys()])].sort().map(id=>pick(previous.get(id),left.get(id),right.get(id),key+':'+id)).filter(x=>x!==undefined);
  }
  result.courses=pick(base?.courses||[],local.courses||[],remote.courses||[],'courses');
  return {result,conflicts};
 }
 return {snapshot,merge,equal};
})();
if(typeof module!=='undefined')module.exports=ScheduleSync;
