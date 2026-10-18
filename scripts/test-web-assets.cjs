const fs=require('node:fs'),assert=require('node:assert/strict');
const assets=JSON.parse(fs.readFileSync('replica/web-assets.json','utf8'));
assert.equal(new Set(assets).size,assets.length);
for(const name of assets){assert(/^[a-z0-9][a-z0-9.-]*$/.test(name));assert(fs.existsSync('replica/'+name),'Missing APK asset '+name);}
const html=fs.readFileSync('replica/index.html','utf8'),css=fs.readFileSync('replica/style.css','utf8');
for(const match of (html+css).matchAll(/(?:src="|url\()([a-z0-9.-]+\.(?:js|jpg|svg))/g))assert(assets.includes(match[1]),'Unpackaged UI resource '+match[1]);
const native=fs.readFileSync('android-webview/app/src/main/java/com/newhim3/xuschedule/MainActivity.java','utf8');
for(const name of assets)assert(native.includes('"'+name+'"'),'Native asset handler must allow '+name);
assert(fs.readFileSync('android-webview/app/build.gradle','utf8').includes('web-assets.json'),'Gradle uses the canonical asset registry');
console.log('PASS canonical APK asset registry covers scripts, backgrounds and native handler');
