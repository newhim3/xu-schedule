'use strict';
const crypto=require('node:crypto'),zlib=require('node:zlib');
function createGitHubStore({repo,token,secret,request=fetch}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||!token||!Buffer.isBuffer(secret)||secret.length!==32)throw Error('Configure private GitHub sync repository, token and secret');
 const endpoint='https://api.github.com/repos/'+repo;
 const key=Buffer.from(crypto.hkdfSync('sha256',secret,Buffer.alloc(0),'xu-sync-github-aes-v1',32));
 const api=(suffix,method='GET',body)=>request(endpoint+suffix,{method,redirect:'error',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined});
 const verifyPrivate=async()=>{const r=await api('');if(!r.ok||(await r.json()).private!==true)throw Error('Sync storage repository is not private or accessible');};
 const objectPath=id=>{if(!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid account ID');return '/contents/records/'+id+'.enc';};
 const encode=(snapshot,id)=>{const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(id));const bytes=Buffer.concat([cipher.update(zlib.gzipSync(JSON.stringify(snapshot))),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64');};
 const decode=(content,id)=>{const bytes=Buffer.from(content,'base64'),cipher=crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));cipher.setAAD(Buffer.from(id));cipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(zlib.gunzipSync(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]),{maxOutputLength:5_000_000}));};
 return {verifyPrivate,
  async read(id){
   const response=await api(objectPath(id));if(response.status===404)return {revision:'empty',snapshot:null};if(!response.ok)throw Error('GitHub read failed');
   const file=await response.json();if(!/^[a-f0-9]{40}$/.test(file.sha))throw Error('Invalid GitHub file');
   let content=file.content;if(!content){const blob=await api('/git/blobs/'+file.sha);if(!blob.ok)throw Error('GitHub blob read failed');content=(await blob.json()).content;}
   return {revision:file.sha,snapshot:decode(content,id)};
  },
  async write(id,revision,snapshot){
   await verifyPrivate();
   const response=await api(objectPath(id),'PUT',{message:'Update encrypted planner snapshot',content:encode(snapshot,id),...(revision==='empty'?{}:{sha:revision})});
   if(response.status===409||response.status===422){const current=await this.read(id);if(current.revision!==revision)return null;}
   if(!response.ok)throw Error('GitHub write failed');return {revision:(await response.json()).content.sha,snapshot};
  }
 };
}
module.exports={createGitHubStore};
