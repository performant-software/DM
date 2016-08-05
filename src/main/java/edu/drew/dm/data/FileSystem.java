package edu.drew.dm.data;

import java.io.File;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class FileSystem {

    private final File baseDirectory;

    public FileSystem(File baseDirectory) {
        this.baseDirectory = baseDirectory;
    }

    public File images() {
        return directory("images");
    }

    public File triples() {
        return directory("triple-store");
    }

    public File tripleDumps() {
        return directory("ttl-dumps");
    }

    public File directory(String name) {
        final File dir = new File(baseDirectory, name);
        if (!dir.isDirectory() && !dir.mkdirs()) {
            throw new IllegalArgumentException(dir.toString());
        }
        return dir;
    }

}
