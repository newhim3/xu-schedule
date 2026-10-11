package com.newhim3.xuschedule;
import android.app.Activity;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Build;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import androidx.core.content.ContextCompat;

public class AlarmActivity extends Activity {
 private String id;private TextView titleView;
 private final BroadcastReceiver stopped=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){finish();}};
 @Override public void onCreate(Bundle state){super.onCreate(state);
  if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true);}else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED|WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
  getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);id=getIntent().getStringExtra("id");
  LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setGravity(Gravity.CENTER);box.setPadding(36,40,36,40);box.setBackgroundColor(Color.rgb(25,25,25));
  TextView heading=new TextView(this);heading.setText("日程闹钟");heading.setTextSize(18);heading.setTextColor(Color.rgb(190,160,65));heading.setGravity(Gravity.CENTER);box.addView(heading);
  TextView title=new TextView(this);titleView=title;title.setText(getIntent().getStringExtra("title"));title.setTextSize(28);title.setTextColor(Color.WHITE);title.setGravity(Gravity.CENTER);title.setPadding(0,35,0,65);box.addView(title);
  Button snooze=new Button(this);snooze.setText("稍后提醒 · 5分钟");snooze.setOnClickListener(v->stop(AlarmService.SNOOZE));box.addView(snooze,new LinearLayout.LayoutParams(-1,64));
  Button dismiss=new Button(this);dismiss.setText("关闭闹钟");dismiss.setOnClickListener(v->stop(AlarmService.STOP));box.addView(dismiss,new LinearLayout.LayoutParams(-1,64));setContentView(box);
  ContextCompat.registerReceiver(this,stopped,new IntentFilter("com.newhim3.xuschedule.ALARM_STOPPED"),ContextCompat.RECEIVER_NOT_EXPORTED);
 }
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);id=intent.getStringExtra("id");if(titleView!=null)titleView.setText(intent.getStringExtra("title"));}
 private void stop(String action){startService(new Intent(this,AlarmService.class).setAction(action).putExtra("id",id));finish();}
 @Override protected void onDestroy(){unregisterReceiver(stopped);super.onDestroy();}
 @Override public void onBackPressed(){stop(AlarmService.STOP);}
}
