package com.newhim3.xuschedule;
import org.junit.Test;
import static org.junit.Assert.*;

public class UpdatePolicyTest {
    private final String hash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    @Test public void differentVersionsCannotReuseOldFileIdentity() {
        assertNotEquals(UpdatePolicy.filePrefix(20, hash), UpdatePolicy.filePrefix(21, hash));
        assertNotEquals(UpdatePolicy.filePrefix(21, hash), UpdatePolicy.filePrefix(21, "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"));
    }
    @Test(expected=SecurityException.class) public void rejectsOlderPackageEvenIfItsVersionIsNewerThanInstalled() {
        UpdatePolicy.requireCandidate(21, "1.10.2", 20, "1.10.1", 19);
    }
    @Test(expected=SecurityException.class) public void rejectsAlreadyInstalledPackage() {
        UpdatePolicy.requireCandidate(21, "1.10.2", 21, "1.10.2", 21);
    }
    @Test(expected=SecurityException.class) public void rejectsWrongVersionName() {
        UpdatePolicy.requireCandidate(21, "1.10.2", 21, "1.10.1", 20);
    }
    @Test public void onlySystemVersionCanConfirmCompletion() {
        assertFalse(UpdatePolicy.installed(21, 20));
        assertTrue(UpdatePolicy.installed(21, 21));
        assertTrue(UpdatePolicy.installed(21, 22));
        UpdatePolicy.requireCandidate(21, "1.10.2", 21, "1.10.2", 20);
    }
}
