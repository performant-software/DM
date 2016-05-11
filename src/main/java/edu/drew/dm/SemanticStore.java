package edu.drew.dm;

import it.sauronsoftware.cron4j.Task;
import it.sauronsoftware.cron4j.TaskExecutionContext;
import org.apache.jena.query.Dataset;
import org.apache.jena.query.Query;
import org.apache.jena.query.QueryExecution;
import org.apache.jena.query.QueryExecutionFactory;
import org.apache.jena.query.ReadWrite;
import org.apache.jena.query.ResultSet;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.apache.jena.tdb.TDBFactory;
import org.apache.jena.tdb.TDBLoader;
import org.apache.jena.tdb.store.GraphTDB;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPOutputStream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class SemanticStore implements AutoCloseable {

    private static final Logger LOG = Logger.getLogger(SemanticStore.class.getName());

    private final File base;
    private final File images;
    private final Dataset dataset;
    private final File datasetBackups;

    public SemanticStore(File base) {
        this.base = directory(base);
        this.images = directory(new File(base, "images"));
        this.dataset = TDBFactory.createDataset(directory(new File(base, "triple-store")).getAbsolutePath());
        this.datasetBackups = directory(new File(base, "ttl-dumps"));
    }

    public File getBase() {
        return base;
    }

    public File getImages() {
        return images;
    }

    public Dataset getDataset() {
        return dataset;
    }

    public <T> T read(DatasetTransaction<T> tx) {
        return transaction(ReadWrite.READ, tx);
    }

    public <T> T write(DatasetTransaction<T> tx) {
       return transaction(ReadWrite.WRITE, tx);
    }

    public <T> T transaction(ReadWrite rw, DatasetTransaction<T> tx) {
        dataset.begin(rw);
        try {
            final T result = tx.execute(dataset);
            dataset.commit();
            return result;
        } finally {
            dataset.end();
        }
    }

    public <T> T query(Query query, QueryResultHandler<T> resultHandler) {
        return read(dataset -> {
            LOG.fine(() -> String.join("\n",
                    dataset.toString(),
                    "----------------------------------------",
                    query.toString(),
                    "----------------------------------------"
            ));
            try (QueryExecution qe = QueryExecutionFactory.create(query, dataset)) {
                return resultHandler.handle(qe.execSelect());
            }
        });
    }

    public SemanticStore withInitialData(List<String> sources) {
        if (dataset.getDefaultModel().isEmpty()) {
            TDBLoader.load((GraphTDB) dataset.getDefaultModel().getGraph(), sources, true);
        }
        return this;
    }

    public Task datasetDumpTask() {
        return new Task() {
            @Override
            public void execute(TaskExecutionContext context) throws RuntimeException {
                try {
                    final String timestamp = LocalDateTime.now().withNano(0).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    writeDataset(new File(datasetBackups, timestamp + ".ttl.gz"));
                } catch (IOException e) {
                    LOG.log(Level.WARNING, e, () -> "Error while dumping dataset");
                }
            }
        };
    }

    public SemanticStore writeDataset(File file) throws IOException {
        try (OutputStream stream = new GZIPOutputStream(new BufferedOutputStream(new FileOutputStream(file)))) {
            return writeDataset(stream);
        }
    }

    public SemanticStore writeDataset(OutputStream to) {
        return write(dataset -> {
            RDFDataMgr.write(to, dataset, Lang.NQUADS);
            return this;
        });
    }

    @Override
    public String toString() {
        return base.toString();
    }

    @Override
    public void close() {
        this.dataset.close();
    }

    private static File directory(File dir) {
        if (!dir.isDirectory() && !dir.mkdirs()) {
            throw new IllegalArgumentException(dir.toString());
        }
        return dir;
    }

    public interface DatasetTransaction<T> {

        T execute(Dataset dataset);

    }

    public interface QueryResultHandler<T> {
        T handle(ResultSet resultSet);
    }
}
