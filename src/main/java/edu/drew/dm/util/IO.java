package edu.drew.dm.util;

import java.io.FilterInputStream;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.regex.Pattern;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class IO {

    public static <I extends InputStream, O extends OutputStream> O copy(I in, O out) throws IOException {
        final byte[] buf = new byte[8192];
        int len;
        while ((len = in.read(buf)) != -1) {
            out.write(buf, 0, len);
        }
        return out;
    }

    public static class NonClosingInputStream extends FilterInputStream {

        public NonClosingInputStream(InputStream in) {
            super(in);
        }

        @Override
        public void close() throws IOException {
            // no-op
        }
    }

    public static class NonClosingOutputStream extends FilterOutputStream {

        public NonClosingOutputStream(OutputStream out) {
            super(out);
        }

        @Override
        public void close() throws IOException {
            // no-op
        }
    }

    public static final Pattern LINE_ENDING = Pattern.compile("[\n\r]+");
}
