package com.newhim3.xuschedule;

import android.content.Context;

/** Fixed interface copy only; user-entered titles and notes are never translated. */
final class PlannerLanguage {
    private PlannerLanguage() {}
    static String text(Context context, String chinese, String english) {
        return "en".equals(context.getSharedPreferences("planner_ui", Context.MODE_PRIVATE)
                .getString("language", "zh")) ? english : chinese;
    }
}
