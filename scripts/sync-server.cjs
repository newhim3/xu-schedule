'use strict';
const http=require('node:http'),https=require('node:https'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const GoalCore=require('../replica/planner.js');
const {createAuth}=require('./sync-auth.cjs'),{createGitHubStore}=require('./sync-github.cjs');
const assets=new Set(require('../replica/web-assets.json'));
const root=path.resolve(__dirname,'../replica'),limit=5_000_000;
function createServer({accounts,secret,file,tls,store}){
 const auth=createAuth(accounts,secret),attempts=new Map();let writes=Promise.resolve(),logins=0;
 const accountFile=id=>file+'.'+id;
 const read=async id=>{if(store)return store.read(id);try{return JSON.parse(await fs.readFile(accountFile(id),'utf8'));}catch(e){if(e.code==='ENOENT')return {revision:'empty',snapshot:null};throw e;}};
 const readBody=async(req,max)=>{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw new RangeError('Body too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks));};
 const handler=async(req,res)=>{
  const route=new URL(req.url,'http://localhost').pathname;
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   if(route!=='/api/sync'&&route!=='/api/sync/login'){
    const name=route==='/'?'index.html':route.slice(1);
    if(req.method!=='GET'||!assets.has(name))return send(404,{error:'not_found'});
    const ext=path.extname(name),mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'}[ext];
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(await fs.readFile(path.join(root,name)));return;
   }
   res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, PUT, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, If-Match');
   if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
   if(route.endsWith('/login')){
    if(req.method!=='POST')return send(405,{error:'method'});
    const now=Date.now(),ip=req.socket.remoteAddress||'unknown';for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
    const attempt=attempts.get(ip)||{count:0,until:now+60000};if(attempt.count>=10||attempts.size>=1024||logins>=4)return send(429,{error:'try_later'});
    attempt.count++;attempts.set(ip,attempt);let credentials;try{credentials=await readBody(req,2048);}catch{return send(400,{error:'invalid_credentials'});}
    if(logins>=4)return send(429,{error:'try_later'});
    logins++;try{const session=await auth.login(credentials?.username,credentials?.password);return session?send(200,session):send(401,{error:'unauthorized'});}finally{logins--;}
   }
   const id=auth.authorize(req.headers.authorization);if(!id)return send(401,{error:'unauthorized'});
   if(req.method==='GET')return send(200,await read(id));
   if(req.method!=='PUT')return send(405,{error:'method'});
   let snapshot;
   try{const body=await readBody(req,limit);GoalCore.mergeBackup({items:[],settings:{}},body);if(body.version!==3||!Array.isArray(body.insights)||!Array.isArray(body.focusSessions)||body.focusSessions.some(s=>s.status!=='finished')||!Array.isArray(body.courses))throw Error();snapshot={version:3,items:body.items,insights:body.insights,focusSessions:body.focusSessions,courses:body.courses};}catch(e){return send(e instanceof RangeError?413:400,{error:'invalid_snapshot'});}
   const save=async()=>{
    const current=await read(id);if(req.headers['if-match']!==current.revision)return send(409,{error:'revision_changed'});
    if(store){const next=await store.write(id,current.revision,snapshot);return next?send(200,next):send(409,{error:'revision_changed'});}
    const next={revision:crypto.randomUUID(),snapshot},target=accountFile(id),temp=target+'.'+next.revision+'.tmp';
    await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(temp,JSON.stringify(next),{mode:0o600,flag:'wx'});await fs.rename(temp,target);send(200,next);
   };
   const job=writes.then(save);writes=job.catch(()=>{});await job;
  }catch{if(!res.headersSent)send(500,{error:'storage_error'});else res.end();}
 };
 return tls?https.createServer(tls,handler):http.createServer(handler);
}
if(require.main===module)(async()=>{
 const host=process.env.XU_SYNC_BIND||'127.0.0.1',port=Number(process.env.XU_SYNC_PORT||8766),cert=process.env.XU_SYNC_CERT,key=process.env.XU_SYNC_KEY;
 if(!!cert!==!!key)throw Error('Set both XU_SYNC_CERT and XU_SYNC_KEY');
 const tls=cert?{cert:await fs.readFile(cert),key:await fs.readFile(key)}:null;
 if(!tls&&!['127.0.0.1','::1','localhost'].includes(host))throw Error('Use TLS or a trusted HTTPS reverse proxy for access from other devices');
 const secret=Buffer.from(process.env.XU_SYNC_SECRET||'','base64url'),accounts=JSON.parse(process.env.XU_SYNC_ACCOUNTS||'{}');
 const repo=process.env.XU_SYNC_GITHUB_REPO,store=repo?createGitHubStore({repo,token:process.env.XU_SYNC_GITHUB_TOKEN,secret}):null;
 if(store)await store.verifyPrivate();
 const server=createServer({accounts,secret,store,file:path.resolve(process.env.XU_SYNC_FILE||'release/private-sync/schedule.json'),tls});
 server.listen(port,host,()=>console.log(`Xu Schedule: ${tls?'https':'http'}://${host}:${port}`));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={createServer};
