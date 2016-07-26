package edu.drew.dm;

import au.com.bytecode.opencsv.CSVReader;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import edu.drew.dm.vocabulary.Perm;
import it.sauronsoftware.cron4j.Task;
import it.sauronsoftware.cron4j.TaskExecutionContext;
import org.apache.jena.query.Dataset;
import org.apache.jena.query.Query;
import org.apache.jena.query.QueryExecution;
import org.apache.jena.query.QueryExecutionFactory;
import org.apache.jena.query.ReadWrite;
import org.apache.jena.query.ResultSet;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.tdb.TDBFactory;
import org.apache.jena.tdb.TDBLoader;
import org.apache.jena.tdb.store.GraphTDB;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Stream;
import java.util.zip.GZIPOutputStream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class SemanticStore implements AutoCloseable {

    private static final Logger LOG = Logger.getLogger(SemanticStore.class.getName());

    public static final Set<Property> MULTI_VALUED_PROPERTIES = new HashSet<>();

    static {
        MULTI_VALUED_PROPERTIES.add(RDF.type);
        MULTI_VALUED_PROPERTIES.addAll(Perm.ALL_PROPERTIES);
        MULTI_VALUED_PROPERTIES.add(OpenArchivesTerms.aggregates);
    }

    private final File base;
    private final File images;
    private final Dataset dataset;
    private final File datasetBackups;
    private final Index index;

    public SemanticStore(File base) {
        this.base = directory(base);
        this.images = directory(new File(base, "images"));
        this.dataset = TDBFactory.createDataset(directory(new File(base, "triple-store")).getAbsolutePath());
        this.datasetBackups = directory(new File(base, "ttl-dumps"));
        this.index = new Index(this);
    }

    public Index index() {
        return index;
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
        return read(ds -> {
            LOG.finer(() -> String.join("\n",
                    ds.toString(),
                    "----------------------------------------",
                    query.toString(),
                    "----------------------------------------"
            ));
            try (QueryExecution qe = QueryExecutionFactory.create(query, ds)) {
                return resultHandler.handle(qe.execSelect());
            }
        });
    }

    public Model read(BiConsumer<Model, Model> reader) {
        return read(ds -> {
            final Model source = ds.getDefaultModel();
            final Model target = Models.create();
            reader.accept(source, target);
            return target;
        });
    }
    public Model create(Model created) {
        return write(ds -> {
            ds.getDefaultModel().add(created);
            return created;
        });

    }

    public Model remove(Model removed) {
        return write(ds -> {
            ds.getDefaultModel().remove(removed);
            return removed;
        });
    }

    public Model merge(Model update) {
        final Map<StatementHead, LinkedList<Statement>> statementsByHead = new LinkedHashMap<>();
        update.listStatements().forEachRemaining(stmt -> statementsByHead
                .computeIfAbsent(new StatementHead(stmt), k -> new LinkedList<>())
                .add(stmt)
        );

        return write(ds -> {
            final Model model = ds.getDefaultModel();

            statementsByHead.forEach((head, statements) -> {
                if (MULTI_VALUED_PROPERTIES.contains(head.predicate)) {
                    model.add(statements);
                    return;
                }

                model.removeAll(head.subject, head.predicate, null);
                if (statements.size() > 1) {
                    LOG.warning(statements::toString);
                }
                model.add(statements.getLast());
            });

            return update;
        });
    }

    public SemanticStore withInitialData(List<String> sources) {
        if (dataset.getDefaultModel().isEmpty()) {
            TDBLoader.load((GraphTDB) dataset.getDefaultModel().getGraph(), sources, true);
            Sanitizer.clean(this);
        }
        return this;
    }

    public SemanticStore withUsers(CSVReader csv) throws IOException {
        final User[] users = csv.readAll().stream()
                .skip(1)
                .map(user -> new User(
                        user[0],
                        user[1],
                        user[2],
                        user[3],
                        Boolean.parseBoolean(user[4]),
                        user[5]
                ))
                .toArray(User[]::new);

        final Set<Resource> projects = read((source, target) -> target.add(source.listStatements(null, RDF.type, DCTypes.Collection))).listSubjects().toSet();

        final Model userModel = Models.create();

        for (User user : users) {
            final Resource userResource = userModel.createResource(user.uri())
                    .addProperty(RDF.type, FOAF.Agent)
                    .addProperty(RDFS.label, user.account)
                    .addProperty(FOAF.firstName, user.firstName)
                    .addProperty(FOAF.surname, user.lastName)
                    .addProperty(FOAF.mbox, userModel.createResource(user.mbox()));

            for (Resource project : projects) {
                for (Property permission : Perm.USER_PERMISSIONS) {
                    userResource.addProperty(permission, project);
                }
                if (user.admin) {
                    for (Property permission : Perm.ADMIN_PERMISSIONS) {
                        userResource.addProperty(permission, project);
                    }

                }
            }
        }

        merge(userModel);

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
        try {
            this.index.close();
        } catch (Throwable t) {
            // ignored
        }

        try {
            this.dataset.close();
        } catch (Throwable t) {
            // ignored
        }
    }

    public static File directory(File dir) {
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

    private static class StatementHead {
        private final Resource subject;
        private final Property predicate;

        private StatementHead(Statement stmt) {
            this(stmt.getSubject(), stmt.getPredicate());
        }

        private StatementHead(Resource subject, Property predicate) {
            this.subject = subject;
            this.predicate = predicate;
        }

        @Override
        public boolean equals(Object obj) {
            if (obj instanceof StatementHead) {
                StatementHead other = (StatementHead) obj;
                return subject.equals(other.subject) && predicate.equals(other.predicate);
            }
            return super.equals(obj);
        }

        @Override
        public int hashCode() {
            return Objects.hash(subject, predicate);
        }
    }
}
