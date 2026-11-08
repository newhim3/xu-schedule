'use strict';
const crypto=require('node:crypto'),{promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt),namePattern=/^[a-z0-9][a-z0-9_.-]{2,31}$/;
const equal=(a,b)=>a.length===b.length&&crypto.timingSafeEqual(a,b);
const hashPassword=async password=>{
 if(typeof password!=='string'||password.length<8||password.length>128)throw Error('Password must have 8–128 characters');
 const salt=crypto.randomBytes(16);return salt.toString('hex')+':'+(await scrypt(password,salt,32)).toString('hex');
};
function createAuth(accounts,secret){
 const entries=Object.entries(accounts||{});
 if(!entries.length||!Buffer.isBuffer(secret)||secret.length!==32||entries.some(([name,hash])=>!namePattern.test(name)||!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(hash)))throw Error('Configure XU_SYNC_ACCOUNTS and XU_SYNC_SECRET');
 const users=new Map(entries),key=Buffer.from(crypto.hkdfSync('sha256',secret,Buffer.alloc(0),'xu-sync-session-v1',32));
 const sign=value=>crypto.createHmac('sha256',key).update(value).digest();
 const accountId=name=>crypto.createHmac('sha256',key).update('account:'+name).digest('hex');
 return {
  async login(username,password){
   if(typeof username!=='string'||typeof password!=='string'||password.length>128||!namePattern.test(username))return null;
   const verifier=users.get(username),[salt,digest]=(verifier||'0'.repeat(32)+':'+ '0'.repeat(64)).split(':');
   const actual=await scrypt(password,Buffer.from(salt,'hex'),32);
   if(!verifier||!equal(actual,Buffer.from(digest,'hex')))return null;
   const payload=Buffer.from(JSON.stringify({username,expiry:Date.now()+30*86400000,version:verifier.slice(-16)})).toString('base64url');
   return {username,accountId:accountId(username),token:payload+'.'+sign(payload).toString('base64url')};
  },
  authorize(header){
   const match=/^Bearer ([A-Za-z0-9_-]{1,512})\.([A-Za-z0-9_-]{43})$/.exec(header||'');if(!match||!equal(sign(match[1]),Buffer.from(match[2],'base64url')))return null;
   try{const session=JSON.parse(Buffer.from(match[1],'base64url'));const verifier=users.get(session.username);return verifier&&Number.isFinite(session.expiry)&&session.expiry>Date.now()&&verifier.endsWith(session.version)?accountId(session.username):null;}catch{return null;}
  }
 };
}
if(require.main===module)(async()=>{const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks));if(!namePattern.test(input.username))throw Error('Use 3–32 lowercase letters, numbers or ._-');console.log(JSON.stringify({[input.username]:await hashPassword(input.password)}));})().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={createAuth,hashPassword};
