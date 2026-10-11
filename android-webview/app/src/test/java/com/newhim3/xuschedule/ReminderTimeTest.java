package com.newhim3.xuschedule;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.Instant;
public class ReminderTimeTest {
 private long t(String s){return Instant.parse(s).toEpochMilli();}
 @Test public void onceHonorsBeijingTimezoneAndReminderOffset(){assertEquals(t("2026-10-11T00:15:00Z"),ReminderTime.next("2026-10-11","08:30",false,"Once",900000,t("2026-10-10T00:00:00Z")));}
 @Test public void pastOnceNeverFiresOnStartup(){assertEquals(-1,ReminderTime.next("2026-10-10","08:30",false,"Once",0,t("2026-10-11T00:00:00Z")));}
 @Test public void dailyUsesNextReminderAfterNow(){assertEquals(t("2026-10-12T00:15:00Z"),ReminderTime.next("2026-10-01","08:30",false,"Every day",900000,t("2026-10-11T00:20:00Z")));}
 @Test public void weeklyKeepsOriginalWeekday(){assertEquals(t("2026-10-17T11:09:00Z"),ReminderTime.next("2026-05-16","19:09",false,"Every week",0,t("2026-10-11T00:00:00Z")));}
 @Test public void monthlyDoesNotDriftAfterShortMonth(){assertEquals(t("2026-03-31T00:30:00Z"),ReminderTime.next("2026-01-31","08:30",false,"Every month",0,t("2026-03-01T00:00:00Z")));}
 @Test public void leapBirthdayReturnsToLeapDay(){assertEquals(t("2028-02-29T00:30:00Z"),ReminderTime.next("2024-02-29","08:30",false,"Every year",0,t("2027-03-01T00:00:00Z")));}
 @Test public void allDayDefaultsToEightAM(){assertEquals(t("2026-10-11T00:00:00Z"),ReminderTime.next("2026-10-11","19:00",true,"Once",0,t("2026-10-10T00:00:00Z")));}
 @Test public void impossibleDatesAreRejected(){assertEquals(-1,ReminderTime.next("2026-02-30","08:30",false,"Once",0,0));assertEquals(-1,ReminderTime.next("2026-10-11","25:00",false,"Once",0,0));}
}
