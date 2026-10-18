package com.newhim3.xuschedule;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.os.Build;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.JavascriptInterface;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.Manifest;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import android.content.ActivityNotFoundException;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private final ExecutorService reminderExecutor = Executors.newSingleThreadExecutor();
    private String pendingExport;
    private static final String APP_ORIGIN = "https://appassets.androidplatform.net";
    private static final String UPDATE_MANIFEST = "https://raw.githubusercontent.com/newhim3/xu-schedule/main/update.json";
    private WebView webView;
    private File pendingApk;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private String text(String chinese, String english) { return PlannerLanguage.text(this, chinese, english); }

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FrameLayout root = new FrameLayout(this);
        root.setFitsSystemWindows(true);
        root.setBackgroundColor(Color.rgb(25, 25, 25));
        ReminderScheduler.createChannels(this);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        ProgressBar progress = new ProgressBar(this);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(72, 72);
        progressParams.gravity = android.view.Gravity.CENTER;
        root.addView(progress, progressParams);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setBackgroundColor(Color.rgb(25,25,25));
        webView.addJavascriptInterface(new NativeBridge(), "AndroidBridge");
        settings.setAllowContentAccess(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) { progress.setVisibility(View.GONE); updatePermissionStatus(); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !APP_ORIGIN.equals(request.getUrl().getScheme()+"://"+request.getUrl().getHost());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                if(!"https".equals(uri.getScheme())||!"appassets.androidplatform.net".equals(uri.getHost()))return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));
                String path=uri.getPath();
                if(path==null||!path.startsWith("/assets/"))return null;
                String file=path.substring(8);
                if(!java.util.Arrays.asList("index.html","style.css","app.js","focus-core.js","planner.js","focus.js","background-lake.jpg","background-dunes.jpg","background-water.jpg","icon.svg","manifest.webmanifest","sw.js","web-assets.json").contains(file))return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));
                try {String mime=file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":file.endsWith(".svg")?"image/svg+xml":file.endsWith(".jpg")?"image/jpeg":file.endsWith(".json")?"application/json":file.endsWith(".webmanifest")?"application/manifest+json":"text/html";return new WebResourceResponse(mime,file.endsWith(".jpg")?null:"UTF-8",getAssets().open(file));}catch(Exception e){return null;}
            }
        });
        webView.loadUrl(APP_ORIGIN+"/assets/index.html");
        checkForUpdate();
    }

    private void checkForUpdate() { checkForUpdate(false); }

    private void checkForUpdate(boolean manual) {
        executor.execute(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(UPDATE_MANIFEST).openConnection();
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                InputStream input = connection.getInputStream();
                ByteArrayOutputStream json = new ByteArrayOutputStream();
                byte[] buffer = new byte[1024]; int read;
                while ((read = input.read(buffer)) != -1) {if(json.size()+read>1000000)throw new java.io.IOException("Manifest too large");json.write(buffer,0,read);}
                input.close(); connection.disconnect();
                JSONObject manifest = new JSONObject(json.toString("UTF-8"));
                int latest = manifest.getInt("versionCode");
                int installed = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
                if (latest > installed) runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    new AlertDialog.Builder(this).setTitle(text("发现新版本 ", "New version ") + manifest.optString("versionName"))
                        .setMessage(text(manifest.optString("releaseNotes", "更新将保留现有日程数据。"), manifest.optString("releaseNotesEn", "Update available. Your existing planner data will be kept.")))
                        .setNegativeButton(text("稍后", "Later"), null)
                        .setPositiveButton(text("下载更新", "Download update"), (dialog, which) -> downloadAndInstall(manifest.optString("apkUrl"), manifest.optString("sha256")))
                        .show();
                });
                else if(manual)runOnUiThread(()->Toast.makeText(this,text("已是最新版本", "You're up to date"),Toast.LENGTH_SHORT).show());
            } catch (Exception ignored) { if(manual)runOnUiThread(()->Toast.makeText(this,text("暂时无法检查更新，请检查网络", "Cannot check for updates. Check your connection."),Toast.LENGTH_SHORT).show()); }
        });
    }

    private void downloadAndInstall(String apkUrl, String expectedHash) {
        if (apkUrl == null || !apkUrl.startsWith("https://github.com/newhim3/xu-schedule/releases/download/")) return;
        Toast.makeText(this, text("发现新版本，正在下载…", "Downloading update…"), Toast.LENGTH_LONG).show();
        executor.execute(() -> {
            try {
                File dir = new File(getCacheDir(), "updates"); dir.mkdirs();
                File apk = new File(dir, "xu-schedule-update.apk");
                HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();
                connection.setConnectTimeout(10000); connection.setReadTimeout(30000);
                InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(apk);
                byte[] buffer = new byte[8192]; int read;
                while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
                output.close(); input.close(); connection.disconnect();
                if(expectedHash != null && !expectedHash.isEmpty()) {
                    java.security.MessageDigest digest=java.security.MessageDigest.getInstance("SHA-256");
                    try(java.io.FileInputStream hashInput=new java.io.FileInputStream(apk)){while((read=hashInput.read(buffer))!=-1)digest.update(buffer,0,read);}
                    StringBuilder actual=new StringBuilder();for(byte b:digest.digest())actual.append(String.format(java.util.Locale.US,"%02x",b&255));
                    if(!actual.toString().equalsIgnoreCase(expectedHash)){apk.delete();throw new SecurityException("Update hash mismatch");}
                }
                PackageInfo candidate = getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(), PackageManager.GET_SIGNATURES);
                PackageInfo current = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_SIGNATURES);
                if (candidate == null || !getPackageName().equals(candidate.packageName)
                        || candidate.versionCode <= current.versionCode
                        || candidate.signatures == null || current.signatures == null
                        || !java.util.Arrays.equals(candidate.signatures, current.signatures)) {
                    apk.delete();
                    throw new SecurityException("Invalid update package");
                }
                runOnUiThread(() -> { if (!isFinishing() && !isDestroyed()) installApk(apk); });
            } catch (Exception e) { runOnUiThread(() -> Toast.makeText(this, text("新版本下载失败，请稍后重试", "Download failed. Please try again."), Toast.LENGTH_SHORT).show()); }
        });
    }

    private void installApk(File apk) {
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            pendingApk = apk;
            Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
            startActivity(settingsIntent);
            Toast.makeText(this, text("允许安装更新后返回应用，将继续安装", "Allow updates, then return here to continue installation."), Toast.LENGTH_LONG).show();
            return;
        }
        Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try { startActivity(intent); }
        catch (android.content.ActivityNotFoundException e) {
            Toast.makeText(this, text("无法打开系统安装器", "Cannot open the system installer"), Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onResume() {
        super.onResume();
        ReminderScheduler.restore(this);
        updatePermissionStatus();
        if (pendingApk != null && (Build.VERSION.SDK_INT < 26 || getPackageManager().canRequestPackageInstalls())) {
            File apk = pendingApk;
            pendingApk = null;
            installApk(apk);
        }
    }

    @Override protected void onDestroy() { executor.shutdownNow(); reminderExecutor.shutdownNow(); if (webView != null) webView.destroy(); super.onDestroy(); }
    @Override public void onBackPressed() { if(webView!=null)webView.evaluateJavascript("window.handleNativeBack && window.handleNativeBack()",result->{if(!"true".equals(result))MainActivity.super.onBackPressed();});else super.onBackPressed(); }
    private void updatePermissionStatus() {
        if(webView!=null&&!isDestroyed())webView.evaluateJavascript("window.onNativeReminderStatus && window.onNativeReminderStatus("+ReminderScheduler.status(this).toString()+")",null);
    }
    private void openPermissionSettings(String type) {
        try {
            if("notifications".equals(type)) {
                if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},41);
                else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));
            } else if("exact".equals(type)&&Build.VERSION.SDK_INT>=31)startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));
            else if("fullscreen".equals(type)&&Build.VERSION.SDK_INT>=34)startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:"+getPackageName())));
        }catch(ActivityNotFoundException ignored){Toast.makeText(this,text("请在系统设置中开启权限", "Enable permissions in system settings"),Toast.LENGTH_LONG).show();}
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);ReminderScheduler.restore(this);updatePermissionStatus();}
    final class NativeBridge {
        @JavascriptInterface public void setLanguage(String language){
            String value="en".equals(language)?"en":"zh";
            android.content.SharedPreferences preferences=getSharedPreferences("planner_ui",MODE_PRIVATE);
            if(!value.equals(preferences.getString("language","zh"))){preferences.edit().putString("language",value).apply();runOnUiThread(()->ReminderScheduler.createChannels(MainActivity.this));}
        }
        @JavascriptInterface public String reminderStatus(){return ReminderScheduler.status(MainActivity.this).toString();}
        @JavascriptInterface public void syncReminders(String snapshot){reminderExecutor.execute(()->{try{ReminderScheduler.sync(MainActivity.this,snapshot);runOnUiThread(()->updatePermissionStatus());}catch(Exception e){runOnUiThread(()->Toast.makeText(MainActivity.this,text("提醒同步失败，请检查事项时间", "Reminder sync failed. Check scheduled times."),Toast.LENGTH_LONG).show());}});}
        @JavascriptInterface public void requestReminderPermission(String type){runOnUiThread(()->openPermissionSettings(type));}
        @JavascriptInterface public void checkForUpdate(){runOnUiThread(()->MainActivity.this.checkForUpdate(true));}
        @JavascriptInterface public void testReminder(boolean alarm){runOnUiThread(()->{
            ReminderScheduler.createChannels(MainActivity.this);
            if(alarm){Intent intent=new Intent(MainActivity.this,AlarmService.class).putExtra("id","test-alarm").putExtra("title",text("闹钟测试 · 关闭或稍后提醒", "Alarm test · dismiss or snooze"));androidx.core.content.ContextCompat.startForegroundService(MainActivity.this,intent);}
            else{JSONObject test=new JSONObject();try{test.put("title",text("自动提醒测试", "Test notification"));test.put("date",text("现在", "Now"));}catch(Exception ignored){}ReminderReceiver.notify(MainActivity.this,test,"test-notification");}
        });}
        @JavascriptInterface public void exportBackup(String json){if(json.length()>5_000_000)return;pendingExport=json;runOnUiThread(()->{Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"calendar-backup.json");startActivityForResult(intent,51);});}
        @JavascriptInterface public void importBackup(){runOnUiThread(()->startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE),52));}
    }
    @Override protected void onActivityResult(int request,int result,Intent intent){super.onActivityResult(request,result,intent);if(result!=RESULT_OK||intent==null||intent.getData()==null)return;
        if(request==51&&pendingExport!=null){final String json=pendingExport;pendingExport=null;executor.execute(()->{try(java.io.OutputStream out=getContentResolver().openOutputStream(intent.getData())){out.write(json.getBytes(StandardCharsets.UTF_8));runOnUiThread(()->Toast.makeText(this,text("备份已保存", "Backup saved"),Toast.LENGTH_SHORT).show());}catch(Exception e){runOnUiThread(()->Toast.makeText(this,text("备份保存失败", "Could not save backup"),Toast.LENGTH_SHORT).show());}});}
        if(request==52)executor.execute(()->{try(InputStream in=getContentResolver().openInputStream(intent.getData())){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int count;while((count=in.read(buffer))!=-1){if(out.size()+count>5_000_000)throw new java.io.IOException("Too large");out.write(buffer,0,count);}String json=out.toString("UTF-8");runOnUiThread(()->webView.evaluateJavascript("window.importNativeBackup && window.importNativeBackup("+JSONObject.quote(json)+")",null));}catch(Exception e){runOnUiThread(()->Toast.makeText(this,text("无法读取备份文件", "Could not read backup"),Toast.LENGTH_SHORT).show());}});
    }

}
