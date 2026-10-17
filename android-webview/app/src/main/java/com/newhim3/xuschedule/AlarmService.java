package com.newhim3.xuschedule;

import android.app.Service;
import android.app.PendingIntent;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.Vibrator;
import android.os.VibrationEffect;
import androidx.core.app.NotificationCompat;

public class AlarmService extends Service {
 static final int NOTIFICATION=34000;
 static final String STOP="com.newhim3.xuschedule.STOP_ALARM", SNOOZE="com.newhim3.xuschedule.SNOOZE_ALARM";
 private Ringtone ringtone;private Vibrator vibrator;private PowerManager.WakeLock wakeLock;
 private final Handler handler=new Handler(Looper.getMainLooper());private String currentId;
 private PendingIntent action(String action,String id){return PendingIntent.getService(this,0,new Intent(this,AlarmService.class).setAction(action).putExtra("id",id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 @Override public int onStartCommand(Intent intent,int flags,int startId) {
    if(intent==null){stopSelf();return START_NOT_STICKY;}
    String id=intent.getStringExtra("id");
    if(STOP.equals(intent.getAction())||SNOOZE.equals(intent.getAction())) {
        if(currentId!=null&&!currentId.equals(id))return START_NOT_STICKY;
        if(SNOOZE.equals(intent.getAction()))ReminderScheduler.snooze(this,id);
        stopSelf();return START_NOT_STICKY;
    }
    stopSound();currentId=id;ReminderScheduler.createChannels(this);
    Intent activity=new Intent(this,AlarmActivity.class).putExtra("id",id).putExtra("title",intent.getStringExtra("title")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent open=PendingIntent.getActivity(this,0,activity,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    NotificationCompat.Builder notice=new NotificationCompat.Builder(this,ReminderScheduler.ALARMS).setSmallIcon(R.drawable.ic_launcher).setContentTitle(intent.getStringExtra("title")).setContentText(PlannerLanguage.text(this,"闹钟正在响铃 · 稍后5分钟或关闭","Alarm ringing · snooze or dismiss")).setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX).setOngoing(true).setContentIntent(open).addAction(0,PlannerLanguage.text(this,"稍后5分钟","Snooze 5 min"),action(SNOOZE,id)).addAction(0,PlannerLanguage.text(this,"关闭","Dismiss"),action(STOP,id));
    if(Build.VERSION.SDK_INT<34||getSystemService(NotificationManager.class).canUseFullScreenIntent())notice.setFullScreenIntent(open,true);
    startForeground(NOTIFICATION,notice.build());
    PowerManager power=getSystemService(PowerManager.class);wakeLock=power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"XuSchedule:alarm");wakeLock.acquire(125000);
    try {ringtone=RingtoneManager.getRingtone(this,RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));if(ringtone!=null){ringtone.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());if(Build.VERSION.SDK_INT>=28)ringtone.setLooping(true);ringtone.play();}}catch(Exception ignored){}
    vibrator=getSystemService(Vibrator.class);if(vibrator!=null){long[] pattern={0,600,450};if(Build.VERSION.SDK_INT>=26)vibrator.vibrate(VibrationEffect.createWaveform(pattern,0));else vibrator.vibrate(pattern,0);}
    handler.removeCallbacksAndMessages(null);handler.postDelayed(this::stopSelf,120000);
    return START_NOT_STICKY;
 }
 private void stopSound(){if(ringtone!=null){ringtone.stop();ringtone=null;}if(vibrator!=null){vibrator.cancel();vibrator=null;}if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();wakeLock=null;}
 @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);stopSound();stopForeground(true);sendBroadcast(new Intent("com.newhim3.xuschedule.ALARM_STOPPED").setPackage(getPackageName()));super.onDestroy();}
 @Override public IBinder onBind(Intent i){return null;}
}
