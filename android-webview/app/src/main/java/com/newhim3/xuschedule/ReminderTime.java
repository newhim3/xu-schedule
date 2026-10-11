package com.newhim3.xuschedule;
import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

/** Computes one anchored recurrence in Beijing time; no platform dependency. */
public final class ReminderTime {
 private ReminderTime() {}
 public static long next(String date,String time,boolean allDay,String repeat,long offset,long after) {
  if(date==null||!date.matches("\\d{4}-\\d{2}-\\d{2}"))return -1;
  if(allDay||time==null||time.isEmpty())time="08:00";
  if(!time.matches("\\d{2}:\\d{2}"))return -1;
  SimpleDateFormat format=new SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.US);format.setLenient(false);format.setTimeZone(TimeZone.getTimeZone("Asia/Shanghai"));
  ParsePosition pos=new ParsePosition(0);java.util.Date parsed=format.parse(date+" "+time,pos);if(parsed==null||pos.getIndex()!=16)return -1;
  Calendar anchor=Calendar.getInstance(format.getTimeZone());anchor.setTime(parsed);
  long trigger=anchor.getTimeInMillis()-offset;if(trigger>=after)return trigger;
  int field,step=1;
  switch(repeat==null?"Once":repeat){case "Every day":field=Calendar.DATE;break;case "Every week":field=Calendar.DATE;step=7;break;case "Every month":field=Calendar.MONTH;break;case "Every year":field=Calendar.YEAR;break;default:return -1;}
  for(int i=1;i<100000;i++){Calendar candidate=(Calendar)anchor.clone();candidate.add(field,i*step);trigger=candidate.getTimeInMillis()-offset;if(trigger>=after)return trigger;}
  return -1;
 }
}
