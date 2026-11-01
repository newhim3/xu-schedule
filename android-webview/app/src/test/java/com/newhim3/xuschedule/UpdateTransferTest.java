package com.newhim3.xuschedule;
import java.io.*;
import java.util.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class UpdateTransferTest {
    @Test public void reportsRealBytesAndWritesExactly() throws Exception {
        byte[] source=new byte[25000];new Random(1).nextBytes(source);ByteArrayOutputStream output=new ByteArrayOutputStream();List<Long> progress=new ArrayList<>();
        assertEquals(source.length,UpdateTransfer.copy(new ByteArrayInputStream(source),output,source.length,new UpdateTransfer.Listener(){public void progress(long done,long total){assertEquals(source.length,total);progress.add(done);}public boolean cancelled(){return false;}}));
        assertArrayEquals(source,output.toByteArray());assertEquals(Long.valueOf(0),progress.get(0));assertEquals(Long.valueOf(source.length),progress.get(progress.size()-1));for(int i=1;i<progress.size();i++)assertTrue(progress.get(i)>=progress.get(i-1));
    }
    @Test public void supportsUnknownLength() throws Exception { assertEquals(3,UpdateTransfer.copy(new ByteArrayInputStream(new byte[3]),new ByteArrayOutputStream(),-1,new UpdateTransfer.Listener(){public void progress(long done,long total){assertEquals(-1,total);}public boolean cancelled(){return false;}})); }
    @Test(expected=IOException.class) public void detectsTruncatedDownload() throws Exception { UpdateTransfer.copy(new ByteArrayInputStream(new byte[2]),new ByteArrayOutputStream(),20,new UpdateTransfer.Listener(){public void progress(long done,long total){}public boolean cancelled(){return false;}}); }
    @Test(expected=IOException.class) public void honoursCancellation() throws Exception { UpdateTransfer.copy(new ByteArrayInputStream(new byte[20000]),new ByteArrayOutputStream(),20000,new UpdateTransfer.Listener(){long done;public void progress(long done,long total){this.done=done;}public boolean cancelled(){return done>0;}}); }
}
