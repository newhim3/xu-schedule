package com.newhim3.xuschedule;

final class UpdatePolicy {
    static String filePrefix(int version, String hash) {
        if (version <= 0 || hash == null || !hash.matches("[a-fA-F0-9]{64}")) throw new IllegalArgumentException("Invalid update metadata");
        return "xu-schedule-v" + version + "-" + hash.substring(0, 12).toLowerCase(java.util.Locale.US) + "-";
    }

    static void requireCandidate(int expectedCode, String expectedName, int actualCode, String actualName, int installedCode) {
        if (expectedCode != actualCode || expectedName == null || !expectedName.equals(actualName) || actualCode <= installedCode) {
            throw new SecurityException("Downloaded version does not match requested update");
        }
    }

    static boolean installed(int expectedCode, int installedCode) {
        return expectedCode > 0 && installedCode >= expectedCode;
    }
}
