package com.newhim3.xuschedule;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

final class UpdateTransfer {
    interface Listener { void progress(long downloaded, long total); boolean cancelled(); }
    static long copy(InputStream input, OutputStream output, long total, Listener listener) throws IOException {
        long downloaded=0;byte[] buffer=new byte[8192];int count;
        listener.progress(0,total);
        while(true){
            if(listener.cancelled())throw new IOException("Cancelled");
            count=input.read(buffer);if(count==-1)break;
            downloaded+=count;if(downloaded>200L*1024*1024)throw new IOException("Update too large");
            output.write(buffer,0,count);listener.progress(downloaded,total);
        }
        if(listener.cancelled())throw new IOException("Cancelled");
        if(total>0&&downloaded!=total)throw new IOException("Incomplete update");
        return downloaded;
    }
}
