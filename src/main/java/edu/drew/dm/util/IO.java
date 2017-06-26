package edu.drew.dm.util;

import java.io.File;
import java.io.FilterInputStream;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.regex.Pattern;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class IO {

    public static Path directory(Path dir) {
        return directory(dir.toFile()).toPath();
    }

    public static File directory(File dir) {
        if (!dir.isDirectory() && !dir.mkdirs()) {
            throw new IllegalArgumentException(dir.toString());
        }
        return dir;
    }

    public static <I extends InputStream, O extends OutputStream> O copy(I in, O out) throws IOException {
        final byte[] buf = new byte[8192];
        int len;
        while ((len = in.read(buf)) != -1) {
            out.write(buf, 0, len);
        }
        return out;
    }

    public static void delete(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            Files.walk(path)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        } else {
            Files.delete(path);
        }
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

}
