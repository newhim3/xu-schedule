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
const meta={versionCode,versionName,sha256:crypto.createHash('sha256').update(fs.readFileSync('release-artifacts/xu-schedule.apk')).digest('hex'),certificateSha256:previous.certificateSha256,releaseNotes:'日视图默认有效时段改为06:00–23:00，保留原24小时画布总高度，每小时显示空间增加约41%；可在设置关闭并恢复全天。时段外与跨时段安排保留可点击提示；当前时间线、长按新建、15分钟吸附及拖动调时同步使用新比例。日、周、月视图缩小字体、拓宽可用空间；日程文字与勾选按钮分列，避免互相遮挡。保留专注、目标、热度、备份及自动更新。',sourceHash:source.digest('hex'),validationRunId,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
fs.writeFileSync(metadataPath,JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify(meta,null,2));
