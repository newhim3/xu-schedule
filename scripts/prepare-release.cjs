// Generate release metadata from the verified APK and the current source tree.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const metadataPath='release-artifacts/version.json';
const previous=JSON.parse(fs.readFileSync(metadataPath,'utf8'));
const gradle=fs.readFileSync('android-webview/app/build.gradle','utf8');
const versionCode=Number(gradle.match(/versionCode (\d+)/)[1]);
const versionName=gradle.match(/versionName "([^"]+)"/)[1];
const validationRunId=Number(process.argv[2]);
if(!Number.isSafeInteger(validationRunId)||validationRunId<1)throw Error('Provide successful validation run ID');
const paths=['app/build.gradle','build.gradle','settings.gradle','gradle.properties','app/src/main/AndroidManifest.xml'].map(p=>'android-webview/'+p);
function walk(dir,extension){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())walk(p,extension);else if(p.endsWith(extension))paths.push(p);}}
walk('android-webview/app/src/main/java','.java');walk('android-webview/app/src/main/res','.xml');
const webAssets=JSON.parse(fs.readFileSync('replica/web-assets.json','utf8'));
if(!Array.isArray(webAssets)||!webAssets.every(name=>/^[a-z0-9][a-z0-9.-]*$/.test(name)))throw Error('Invalid asset registry');
paths.push(...webAssets.map(p=>'replica/'+p));
const source=crypto.createHash('sha256');
for(const p of paths.sort()){source.update(p);source.update('\0');source.update(p.endsWith('.jpg')?fs.readFileSync(p):fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'));source.update('\0');}
const meta={versionCode,versionName,sha256:crypto.createHash('sha256').update(fs.readFileSync('release-artifacts/xu-schedule.apk')).digest('hex'),certificateSha256:previous.certificateSha256,releaseNotes:fs.readFileSync('release-notes.md','utf8').trim(),sourceHash:source.digest('hex'),validationRunId,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
fs.writeFileSync(metadataPath,JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify(meta,null,2));
