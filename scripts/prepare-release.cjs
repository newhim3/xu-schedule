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
const meta={versionCode,versionName,sha256:crypto.createHash('sha256').update(fs.readFileSync('release-artifacts/xu-schedule.apk')).digest('hex'),certificateSha256:previous.certificateSha256,releaseNotes:'新增专注栏：按今日日历或自由选择目标，支持暂停、恢复、计划到点结束和继续计时；实际专注覆盖计划时保留淡色原计划，投入时长不重复累计。新增课表周总览，支持日/课表周/月/年双指缩放；长按日历空白处建任务条，拖动手柄按15分钟吸附，点按编辑、长按删除。任务清单支持可选DDL、剩余天数和批注显示开关，缩小字号行高。新增三款离线摄影背景，日周月共用。重做分层目标与重要度等选择面板，子目标显示完整来源；去除订阅、语音、课程表和跳转入口。完整备份包含专注记录和所有关联。',sourceHash:source.digest('hex'),validationRunId,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
fs.writeFileSync(metadataPath,JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify(meta,null,2));
