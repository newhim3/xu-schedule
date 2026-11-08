'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),{createGitHubStore}=require('./sync-github.cjs');
(async()=>{
 const files=new Map(),id='a'.repeat(64),other='b'.repeat(64),secret=Buffer.alloc(32,11);let privateRepo=true;
 const request=async(url,{method,body})=>{
  assert(url.startsWith('https://api.github.com/repos/owner/private-sync'));
  const resource=new URL(url).pathname.split('/').slice(4).join('/');
  if(!resource)return Response.json({private:privateRepo});
  if(method==='GET')return files.has(resource)?Response.json(files.get(resource)):Response.json({}, {status:404});
  const payload=JSON.parse(body),previous=files.get(resource);
  if(previous?.sha!==payload.sha)return Response.json({}, {status:409});
  const sha=crypto.createHash('sha1').update(payload.content).digest('hex');files.set(resource,{sha,content:payload.content});return Response.json({content:{sha}});
 };
 const store=createGitHubStore({repo:'owner/private-sync',token:'fake-server-token',secret,request});
 const snapshot={version:3,items:[{id:'a',title:'Private meeting'}],insights:[],focusSessions:[],courses:[]};
 assert.equal((await store.read(id)).revision,'empty');
 const first=await store.write(id,'empty',snapshot);
 assert.deepEqual((await store.read(id)).snapshot,snapshot);
 assert.equal((await store.read(other)).snapshot,null);
 assert(!Buffer.from([...files.values()][0].content,'base64').includes(Buffer.from('Private meeting')));
 assert.equal(await store.write(id,'empty',snapshot),null);
 await store.write(id,first.revision,{...snapshot,items:[]});assert.equal((await store.read(id)).snapshot.items.length,0);
 await assert.rejects(createGitHubStore({repo:'owner/private-sync',token:'fake-server-token',secret:Buffer.alloc(32,22),request}).read(id));
 privateRepo=false;await assert.rejects(store.write(id,(await store.read(id)).revision,snapshot),/not private/);
 console.log('PASS encrypted GitHub storage, account isolation, conditional writes, wrong-key rejection and private repository check');
})().catch(e=>{console.error(e);process.exitCode=1;});
