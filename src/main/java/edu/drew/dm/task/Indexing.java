package edu.drew.dm.task;

import edu.drew.dm.Logging;
import edu.drew.dm.data.Index;
import edu.drew.dm.data.SemanticDatabase;
import it.sauronsoftware.cron4j.Task;
import it.sauronsoftware.cron4j.TaskExecutionContext;

import java.util.logging.Logger;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Indexing extends Task {

    private static final Logger LOG = Logging.inClass(Indexing.class);
    private final SemanticDatabase db;
    private final Index index;

    private long databaseWrites;

    public Indexing(SemanticDatabase db, Index index) {
        this.db = db;
        this.index = index;

        databaseWrites = db.writes();
    }

    @Override
    public void execute(TaskExecutionContext context) throws RuntimeException {
        if (databaseWrites < (databaseWrites = db.writes())) {
            LOG.fine(() -> String.format("Build index after %d database writes", databaseWrites));
            index.build();
        }
    }
}
