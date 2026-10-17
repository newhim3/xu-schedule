package com.newhim3.xuschedule;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

public final class ReminderScheduler {
    private ReminderScheduler() {}
    public static final String REMINDERS = "event_reminders_v1";
    public static final String ALARMS = "event_alarms_v1";
    static SharedPreferences preferences(Context c) { return c.getSharedPreferences("native_reminders", Context.MODE_PRIVATE); }
    public static void createChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = c.getSystemService(NotificationManager.class);
        NotificationChannel reminders = new NotificationChannel(REMINDERS, PlannerLanguage.text(c,"日程自动提醒","Scheduled reminders"), NotificationManager.IMPORTANCE_HIGH);
        reminders.setDescription(PlannerLanguage.text(c,"到达日程提醒时间时发出通知","Notifications for scheduled items")); reminders.enableVibration(true);
        manager.createNotificationChannel(reminders);
        NotificationChannel alarms = new NotificationChannel(ALARMS, PlannerLanguage.text(c,"日程闹钟","Planner alarms"), NotificationManager.IMPORTANCE_HIGH);
        alarms.setDescription(PlannerLanguage.text(c,"响铃、稍后提醒和关闭闹钟","Ringing, snooze and dismiss")); alarms.setSound(null, null); alarms.enableVibration(false);
        manager.createNotificationChannel(alarms);
    }
    public static boolean exactAllowed(Context c) {
        return Build.VERSION.SDK_INT < 31 || c.getSystemService(AlarmManager.class).canScheduleExactAlarms();
    }
    public static JSONObject status(Context c) {
        JSONObject result = new JSONObject();
        try {
            result.put("native",true); result.put("notifications",NotificationManagerCompat.from(c).areNotificationsEnabled());
            result.put("exact",exactAllowed(c));
            result.put("fullScreen",Build.VERSION.SDK_INT < 34 || c.getSystemService(NotificationManager.class).canUseFullScreenIntent());
            result.put("scheduled",preferences(c).getInt("scheduled",0));
            result.put("version",c.getPackageManager().getPackageInfo(c.getPackageName(),0).versionName);
        } catch(Exception ignored) {}
        return result;
    }
    public static synchronized void sync(Context c, String json) throws Exception {
        if (json.length() > 2_000_000) throw new IllegalArgumentException("Too many events");
        JSONObject snapshot = new JSONObject(json);
        JSONArray items = snapshot.getJSONArray("items");
        if (items.length() > 10000) throw new IllegalArgumentException("Too many events");
        JSONArray previous = new JSONArray(preferences(c).getString("ids", "[]"));
        AlarmManager manager = c.getSystemService(AlarmManager.class);
        for (int i=0;i<previous.length();i++) {
            String id=previous.getString(i);
            PendingIntent intent=pending(c,id,PendingIntent.FLAG_NO_CREATE);
            if(intent!=null) {manager.cancel(intent);intent.cancel();}
        }
        JSONArray ids=new JSONArray();
        for(int i=0;i<items.length();i++) ids.put(items.getJSONObject(i).optString("id"));
        preferences(c).edit().putString("snapshot",snapshot.toString()).putString("ids",ids.toString()).apply();
        createChannels(c);int count=0;
        for(int i=0;i<items.length();i++) if(schedule(c,items.getJSONObject(i),snapshot.optJSONObject("settings"),System.currentTimeMillis()+1000))count++;
        preferences(c).edit().putInt("scheduled",count).apply();
    }
    public static void restore(Context c) {
        try {sync(c,preferences(c).getString("snapshot","{\"items\":[]}"));} catch(Exception ignored) {}
    }
    static PendingIntent pending(Context c,String id,int flags) {
        Intent intent=new Intent(c,ReminderReceiver.class).setAction("com.newhim3.xuschedule.REMIND");
        intent.setData(Uri.parse("xuschedule://reminder/"+Uri.encode(id)));intent.putExtra("id",id);
        return PendingIntent.getBroadcast(c,0,intent,flags|PendingIntent.FLAG_IMMUTABLE);
    }
    static long offset(String reminder) {
        switch(reminder) {case "5 minutes before":return 300000L;case "15 minutes before":return 900000L;case "30 minutes before":return 1800000L;case "1 day before":return 86400000L;default:return 0;}
    }
    public static long nextTime(JSONObject item,long after) {
        if(item.optBoolean("done")||item.optString("reminder","None").equals("None"))return -1;
        return ReminderTime.next(item.optString("date"),item.optString("time"),item.optBoolean("allDay"),item.optString("repeat","Once"),offset(item.optString("reminder")),after);
    }
    static boolean schedule(Context c,JSONObject item,JSONObject settings,long after) {
        long when=nextTime(item,after);if(when<0)return false;
        AlarmManager manager=c.getSystemService(AlarmManager.class);PendingIntent fire=pending(c,item.optString("id"),PendingIntent.FLAG_UPDATE_CURRENT);
        try {
            boolean alarm=item.optBoolean("alarm")||"Alarm".equals(item.optString("reminderType",settings!=null?settings.optString("reminderType"):"Notification"));
            if(exactAllowed(c)) {
                if(alarm) {PendingIntent show=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);manager.setAlarmClock(new AlarmManager.AlarmClockInfo(when,show),fire);}
                else manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,fire);
            } else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,fire);
            return true;
        }catch(SecurityException e){manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,fire);return true;}
    }
    static JSONObject item(Context c,String id) {
        try {JSONArray list=new JSONObject(preferences(c).getString("snapshot","{\"items\":[]}")).getJSONArray("items");for(int i=0;i<list.length();i++){JSONObject item=list.getJSONObject(i);if(id.equals(item.optString("id")))return item;}}catch(Exception ignored){}return null;
    }
    static JSONObject settings(Context c) {
        try {return new JSONObject(preferences(c).getString("snapshot","{}")).optJSONObject("settings");}catch(Exception ignored){return null;}
    }
    static void next(Context c,JSONObject item) {schedule(c,item,settings(c),System.currentTimeMillis()+2000);}
    static void snooze(Context c,String id) {
        AlarmManager manager=c.getSystemService(AlarmManager.class);PendingIntent fire=pending(c,id,PendingIntent.FLAG_UPDATE_CURRENT);long time=System.currentTimeMillis()+5*60000;
        if(exactAllowed(c))manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,time,fire);else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,time,fire);
    }
}
