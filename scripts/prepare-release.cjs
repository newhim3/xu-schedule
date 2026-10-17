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
paths.push(...['index.html','style.css','app.js','icon.svg','manifest.webmanifest','sw.js'].map(p=>'replica/'+p));
const source=crypto.createHash('sha256');
for(const p of paths.sort()){source.update(p);source.update('\0');source.update(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'));source.update('\0');}
const meta={versionCode,versionName,sha256:crypto.createHash('sha256').update(fs.readFileSync('release-artifacts/xu-schedule.apk')).digest('hex'),certificateSha256:previous.certificateSha256,releaseNotes:'新增年/月/周视图及双指缩放，切月和页面衔接动画；月视图直接展示整月任务，点击日期进入周视图；压缩时间轴，事项按起止时间跨时段显示并为重叠事项分列；待办新增可折叠父子任务及同屏编辑，移除无用筛选；修复周滑动跳月及今日高亮跟随问题，保留指针选时与应用内更新。',sourceHash:source.digest('hex'),validationRunId,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
fs.writeFileSync(metadataPath,JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify(meta,null,2));
