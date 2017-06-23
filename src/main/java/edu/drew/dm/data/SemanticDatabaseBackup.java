package edu.drew.dm.data;

import edu.drew.dm.Logging;
import it.sauronsoftware.cron4j.Task;
import it.sauronsoftware.cron4j.TaskExecutionContext;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPOutputStream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class SemanticDatabaseBackup extends Task {

    private static final Logger LOG = Logging.inClass(SemanticDatabaseBackup.class);

    private final SemanticDatabase db;
    private final File dumps;

    public SemanticDatabaseBackup(FileSystem fs, SemanticDatabase db) {
        this.db = db;
        this.dumps = fs.tripleDumps();
    }

    @Override
    public void execute(TaskExecutionContext context) throws RuntimeException {
        try {
            final String timestamp = LocalDateTime.now().withNano(0).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            try (OutputStream stream = new GZIPOutputStream(new BufferedOutputStream(new FileOutputStream(new File(dumps, timestamp + ".ttl.gz"))))) {
                db.writeTo(stream);
            }
        } catch (IOException e) {
            LOG.log(Level.WARNING, e, () -> "Error while dumping dataset");
        }
    }

}
