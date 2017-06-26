package edu.drew.dm.data;

import com.typesafe.config.Config;
import edu.drew.dm.util.IO;

import java.io.File;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class FileSystem {

    private final File baseDirectory;

    public FileSystem(Config config) {
        this(new File(config.getString("data.dir")));
    }
    
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
        return IO.directory(new File(baseDirectory, name));
    }
}
