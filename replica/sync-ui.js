'use strict';
(()=>{
 const configKey='xu-sync-account-v1',bindingKey='xu-sync-binding-v1',tr=(zh,en)=>data.settings.language==='en'?en:zh;
 const clean=()=>JSON.parse(JSON.stringify(ScheduleSync.snapshot(data)));
 let config=null,working=false,loggingIn=false,pending=null,status='';
 try{config=JSON.parse(localStorage.getItem(configKey));}catch{}
 const db=new Promise((resolve,reject)=>{const req=indexedDB.open('xu-schedule-sync',1);req.onupgradeneeded=()=>req.result.createObjectStore('baselines');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.catch(()=>{});
 async function baseline(key,value){const database=await db;return new Promise((resolve,reject)=>{const tx=database.transaction('baselines',value===undefined?'readonly':'readwrite'),store=tx.objectStore('baselines'),req=value===undefined?store.get(key):store.put(value,key);tx.oncomplete=()=>resolve(req.result);tx.onabort=tx.onerror=()=>reject(tx.error);});}
 function endpoint(text){const u=new URL(text);if((u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))||u.username||u.password||u.hash||u.search)throw Error();u.pathname=u.pathname.replace(/\/$/,'').replace(/\/api\/sync$/,'')+'/api/sync';return u.href;}
 const busy=()=>data.focusSessions?.some(s=>s.status!=='finished');
 function report(message,manual){status=message;if(manual)toast(message);}
 async function call(settings,method,body,revision){
  const headers={Authorization:'Bearer '+settings.token};if(body){headers['Content-Type']='application/json';headers['If-Match']=revision;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(settings.url,{method,headers,body:body?JSON.stringify(body):undefined,credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});if(response.status===409)return null;if(response.status===401)throw Error('auth');if(!response.ok)throw Error('network');const record=await response.json();if(typeof record.revision!=='string'||!(record.snapshot===null||record.snapshot?.version===3))throw Error('network');return record;}finally{clearTimeout(timer);}
 }
 const validate=snapshot=>GoalCore.mergeBackup({items:[],settings:{}},snapshot);
 function conflictDialog(){
  if(!pending)return;
  const show=record=>{
   if(record===undefined)return tr('已删除','Deleted');
   if(Array.isArray(record))return record.map(item=>item.title||item.name||item.id).filter(Boolean).join('\n')||tr('空列表','Empty list');
   return [record.title||record.goalTitle,[record.date,record.time,record.endTime&&'– '+record.endTime].filter(Boolean).join(' '),record.done&&tr('已完成','Done'),record.notes,record.location].filter(Boolean).join('\n')||tr('记录已修改','Record edited');
  };
  showDialog(tr('两端都改了同一条记录','Both devices changed the same record'),`<div class="timeline-record-list">${pending.conflicts.map(c=>`<details><summary>${esc(c.local?.title||c.remote?.title||c.key)}</summary><p>${tr('本机','This device')}</p><pre class="sync-conflict">${esc(show(c.local))}</pre><p>${tr('另一端','Other device')}</p><pre class="sync-conflict">${esc(show(c.remote))}</pre></details>`).join('')}</div><p class="note">${tr('选择只影响发生冲突的记录，其他记录照常合并。','Your choice applies only to conflicts. Other records are merged normally.')}</p><div class="permission-actions"><button data-action="sync-resolve" data-side="local">${tr('保留本机修改','Keep this device')}</button><button data-action="sync-resolve" data-side="remote">${tr('保留另一端修改','Keep other device')}</button></div>`,()=>true,tr('稍后处理','Later'));
 }
 async function sync(manual=false,choice=null){
  if(!config||working||(!manual&&(document.hidden||panel||modal||pending)))return;
  if(busy()){if(manual)report(tr('结束本机专注后再同步','Finish the current focus session before syncing'),true);return;}
  const settings=config;working=true;
  try{
   for(let retry=0;retry<3;retry++){
    const key=settings.url+'#'+settings.accountId;
    const base=await baseline(key),remote=await call(settings,'GET');if(config!==settings)return;
    if(remote.snapshot)validate(remote.snapshot);else if(base)throw Error('empty');
    const original=clean(),local=!base&&!localStorage.getItem(STORE)&&remote.snapshot?{version:3,items:[],insights:[],focusSessions:[],courses:[]}:original;
    const prefer=choice&&pending?.revision===remote.revision&&ScheduleSync.equal(pending.local,local)?choice:null;
    const merged=remote.snapshot?ScheduleSync.merge(base,local,remote.snapshot,prefer):{result:local,conflicts:[]};
    if(merged.conflicts.length&&!prefer){pending={conflicts:merged.conflicts,revision:remote.revision,local};report(tr('有同步冲突，点「立即同步」查看','Sync conflict; choose Sync now to review'),!manual);if(manual)conflictDialog();return;}
    if(busy()||config!==settings)return;
    validate(merged.result);
    const saved=ScheduleSync.equal(remote.snapshot,merged.result)?remote:await call(settings,'PUT',merged.result,remote.revision);if(!saved)continue;
    if(config!==settings)return;
    const live=clean(),combined=ScheduleSync.merge(original,live,saved.snapshot,'local').result;
    if(!ScheduleSync.equal(live,combined)){
     const previous=data,active=(data.focusSessions||[]).filter(s=>s.status!=='finished');
     const normalized=GoalCore.mergeBackup({...data,items:[],insights:[],focusSessions:active},combined);
     data=normalized;if(!persist()){data=previous;throw Error('storage');}render();
    }
    await baseline(key,saved.snapshot);pending=null;report(tr('同步完成','Synced'),manual);return;
   }
   throw Error('concurrent');
  }catch(e){report(e.message==='auth'?tr('请重新登录同步账号','Sign in to sync again'):e.message==='empty'?tr('服务器记录已重置，本机记录已保留','Server was reset; local data kept'):tr('同步未完成，本机记录已保留','Sync did not finish; local data kept'),manual);}
  finally{working=false;}
 }
 async function signIn(url,username,password){
  if(loggingIn)return;loggingIn=true;
  try{
   const response=await fetch(url+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password}),credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error(response.status===401?'auth':response.status===429?'rate':'network');
   const {token,accountId}=await response.json();if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(accountId))throw Error('network');
   const scope=url+'#'+accountId,binding=localStorage.getItem(bindingKey);if(binding&&binding!==scope)throw Error('binding');
   const next={url,username,token,accountId};localStorage.setItem(bindingKey,scope);localStorage.setItem(configKey,JSON.stringify(next));config=next;pending=null;renderOverlay();await sync(true);
  }catch(e){report(e.message==='auth'?tr('用户名或密码不正确','Incorrect username or password'):e.message==='rate'?tr('尝试过多，请稍后重试','Too many attempts; try again later'):e.message==='binding'?tr('本机记录已绑定其他同步账号，未合并数据','Local records are bound to another account; no data merged'):tr('登录未完成，请检查服务器地址','Login failed; check server address'),true);}
  finally{loggingIn=false;}
 }
 actions['device-sync']=()=>{
  const address=config?.url||$('meta[name="xu-sync-server"]')?.content||(/^https?:$/.test(location.protocol)?location.origin:'');
  showDialog(tr('登录同步账号','Sign in to sync'),`<label>${tr('用户名','Username')}<input id="sync-user" autocomplete="username" value="${esc(config?.username||'')}"></label><label>${tr('密码','Password')}<input id="sync-password" type="password" autocomplete="current-password"></label><details ${address?'':'open'}><summary>${tr('同步服务地址','Sync server address')}</summary><label>HTTPS<input id="sync-address" inputmode="url" value="${esc(address)}"></label></details><p class="note">${esc(status||tr('手机和平板登录同一个账号即可同步。','Sign in with the same account on phone and tablet.'))}</p>`,()=>{try{const url=endpoint($('#sync-address').value.trim()),username=$('#sync-user').value.trim().toLowerCase(),password=$('#sync-password').value;if(!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username)||password.length<8||password.length>128)throw Error();setTimeout(()=>signIn(url,username,password),0);return true;}catch{toast(tr('请检查用户名、密码和 HTTPS 地址','Check username, password and HTTPS address'));return false;}},tr('登录并同步','Sign in and sync'));
 };
 actions['device-sync-now']=()=>{if(config)sync(true);else actions['device-sync']();};
 actions['sync-resolve']=el=>{modal=null;renderOverlay();sync(true,el.dataset.side);};
 actions['device-sync-off']=()=>{localStorage.removeItem(configKey);config=null;pending=null;status='';renderOverlay();toast(tr('已停止同步，本机记录保留','Sync disconnected; local records kept'));};
 const panelBeforeSync=panelHTML;panelHTML=()=>{const html=panelBeforeSync();if(panel.type!=='sync')return html;const body=`<div class="setting-card">${rowAction(tr('同步账号','Sync account'),'device-sync',config?esc(config.username):tr('未登录','Signed out'))}${rowAction(tr('立即同步','Sync now'),'device-sync-now')}${config?rowAction(tr('退出登录','Sign out'),'device-sync-off'):''}</div>`;return html.replace(tr('当前为应用内同步，不连接云端账号。','This version synchronizes within the app, not through a cloud account.'),tr('本地备份与多端同步可独立使用。','Local backups and device sync can be used independently.')).replace('</section>',body+'</section>');};
 setInterval(()=>sync(),45000);window.addEventListener('online',()=>sync());document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
})();
