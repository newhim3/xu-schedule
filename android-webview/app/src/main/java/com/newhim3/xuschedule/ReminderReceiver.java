package com.newhim3.xuschedule;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONObject;

public class ReminderReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent) {
    String action=intent.getAction();
    if(!"com.newhim3.xuschedule.REMIND".equals(action)) {ReminderScheduler.restore(context);return;}
    String id=intent.getStringExtra("id");JSONObject item=ReminderScheduler.item(context,id);
    if(item==null && "test-alarm".equals(id)) {
        item=new JSONObject();try{item.put("title","闹钟测试 · 关闭或稍后提醒");item.put("alarm",true);}catch(Exception ignored){}
    }
    if(item==null||item.optBoolean("done"))return;
    ReminderScheduler.next(context,item);
    JSONObject settings=ReminderScheduler.settings(context);
    boolean alarm=item.optBoolean("alarm")||"Alarm".equals(item.optString("reminderType",settings!=null?settings.optString("reminderType"):"Notification"));
    ReminderScheduler.createChannels(context);
    if(alarm) {
        Intent ring=new Intent(context,AlarmService.class).putExtra("id",id).putExtra("title",item.optString("title"));
        try {ContextCompat.startForegroundService(context,ring);}catch(Exception e){notify(context,item,id);}
    } else notify(context,item,id);
 }
 static void notify(Context context,JSONObject item,String id) {
    PendingIntent open=PendingIntent.getActivity(context,id.hashCode(),new Intent(context,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    NotificationCompat.Builder builder=new NotificationCompat.Builder(context,ReminderScheduler.REMINDERS).setSmallIcon(R.drawable.ic_launcher).setContentTitle(item.optString("title","日程提醒")).setContentText("日程时间："+item.optString("date")+" "+item.optString("time")).setPriority(NotificationCompat.PRIORITY_HIGH).setContentIntent(open).setAutoCancel(true).setCategory(NotificationCompat.CATEGORY_REMINDER);
    try {NotificationManagerCompat.from(context).notify(id.hashCode(),builder.build());}catch(SecurityException ignored){}
 }
}
