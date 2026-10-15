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
const meta={versionCode,versionName,sha256:crypto.createHash('sha256').update(fs.readFileSync('release-artifacts/xu-schedule.apk')).digest('hex'),certificateSha256:previous.certificateSha256,releaseNotes:'修复动效未实际播放：保留底部导航并平滑滑动选中背景；加强页面切换、弹窗进出、勾选绘制和任务完成反馈；支持减少动态效果。',sourceHash:source.digest('hex'),validationRunId,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
fs.writeFileSync(metadataPath,JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify(meta,null,2));
