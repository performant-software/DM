package edu.drew.dm.data;

import edu.drew.dm.rdf.Models;
import edu.drew.dm.rdf.OpenArchivesTerms;
import edu.drew.dm.rdf.Perm;
import edu.drew.dm.util.IO;
import org.apache.jena.query.Dataset;
import org.apache.jena.query.ReadWrite;
import org.apache.jena.rdf.listeners.StatementListener;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.apache.jena.tdb.TDBFactory;
import org.apache.jena.util.iterator.ExtendedIterator;
import org.apache.jena.vocabulary.RDF;

import java.io.OutputStream;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static edu.drew.dm.rdf.Models.n3;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class SemanticDatabase implements AutoCloseable {

    public interface Transaction<T> {

        T execute(Model model);

    }

    private static final Logger LOG = Logger.getLogger(SemanticDatabase.class.getName());

    private static final Set<Property> MULTI_VALUED_PROPERTIES = new HashSet<>();

    static {
        MULTI_VALUED_PROPERTIES.add(RDF.type);
        MULTI_VALUED_PROPERTIES.addAll(Perm.ALL_PROPERTIES);
        MULTI_VALUED_PROPERTIES.add(OpenArchivesTerms.aggregates);
    }

    private final Dataset dataset;

    private final AtomicLong writes = new AtomicLong();

    private final List<TransactionLogListener> transactionLogListeners = new ArrayList<>();

    public SemanticDatabase(FileSystem fs) {
        this.dataset = TDBFactory.createDataset(fs.triples().getPath());
        if (LOG.isLoggable(Level.FINEST)) {
            addTransactionLogListener(txLog -> LOG.finest(String.join("\n",
                    String.join(" - ", "RDF/IO", txLog.duration().toString()),
                    Stream.concat(
                            Models.n3Data(Models.n3(Models.create().add(txLog.removed)))
                                    .map(l -> String.join(" ", "-", "|", l)),
                            Models.n3Data(Models.n3(Models.create().add(txLog.added)))
                                    .map(l -> String.join(" ", "+", "|", l))
                    ).collect(Collectors.joining("\n")).trim())
            ));
        }
    }

    public boolean isEmpty() {
        return dataset.getDefaultModel().isEmpty();
    }

    public Dataset dataset() {
        return dataset;
    }

    public long writes() {
        return writes.longValue();
    }

    public void addTransactionLogListener(TransactionLogListener listener) {
        transactionLogListeners.add(listener);
    }

    public <T> T read(Transaction<T> tx) {
        return transaction(ReadWrite.READ, tx);
    }

    public <T> T write(Transaction<T> tx) {
       return transaction(ReadWrite.WRITE, tx);
    }

    public <T> T transaction(ReadWrite rw, Transaction<T> tx) {
        dataset.begin(rw);

        final TransactionLog transactionLog = new TransactionLog();
        final Model model = dataset.getDefaultModel();

        try {
            model.register(transactionLog);
            final T result = tx.execute(model);
            dataset.commit();
            if (rw == ReadWrite.WRITE) {
                writes.incrementAndGet();
                if (!transactionLog.isEmpty()) {
                    transactionLog.ended();
                    transactionLogListeners.forEach(l -> l.transactionLogged(transactionLog));
                }
            }
            return result;
        } finally {
            if (model != null) {
                model.unregister(transactionLog);
            }
            dataset.end();
        }
    }

    public Model read(BiConsumer<Model, Model> reader) {
        return read(source -> {
            final Model target = Models.create();
            reader.accept(source, target);
            return target;
        });
    }

    public Model remove(Model removed) {
        return write(model -> {
            model.remove(removed);
            return removed;
        });
    }

    public Model merge(Model update) {
        return write(model -> merge(model, update));
    }

    public static Model merge(Model target, Model update) {
        final Map<StatementHead, LinkedList<Statement>> statementsByHead = new LinkedHashMap<>();
        update.listStatements().forEachRemaining(stmt -> statementsByHead
                .computeIfAbsent(new StatementHead(stmt), k -> new LinkedList<>())
                .add(stmt)
        );

        statementsByHead.forEach((head, statements) -> {
            if (MULTI_VALUED_PROPERTIES.contains(head.predicate)) {
                target.add(statements);
                return;
            }

            target.removeAll(head.subject, head.predicate, null);
            if (statements.size() > 1) {
                LOG.warning(statements::toString);
            }
            target.add(statements.getLast());
        });

        return update;
    }

    public static void traverse(Function<Resource, ExtendedIterator<Resource>> traversal, Resource start, Consumer<Resource> consumer) {
        final Queue<Resource> frontier = new LinkedList<>(Collections.singleton(start));
        final Set<Resource> visited = new HashSet<>();
        while (!frontier.isEmpty()) {
            final Resource resource = frontier.remove();
            consumer.accept(resource);
            visited.add(resource);
            traversal.apply(resource).filterDrop(visited::contains).forEachRemaining(frontier::add);
        }
    }

    public static Model traverse(Function<Resource, ExtendedIterator<Resource>> traversal, Resource start, Model target) {
        traverse(traversal, start, resource -> target.add(resource.listProperties()));
        return target;
    }

    public SemanticDatabase writeTo(OutputStream to) {
        return read(source -> {
            RDFDataMgr.write(to, source, Lang.NQUADS);
            return this;
        });
    }

    @Override
    public String toString() {
        return dataset.toString();
    }

    @Override
    public void close() {
        try {
            this.dataset.close();
        } catch (Throwable t) {
            // ignored
        }
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

    public static class TransactionLog extends StatementListener {

        public final long started = System.currentTimeMillis();
        public long ended;

        public final List<Statement> added = new ArrayList<>();
        public final List<Statement> removed = new ArrayList<>();

        @Override
        public void addedStatement(Statement s) {
            added.add(s);
        }

        @Override
        public void removedStatement(Statement s) {
            removed.add(s);
        }

        public void ended() {
            this.ended = System.currentTimeMillis();
        }

        public Duration duration() {
            return Duration.ofMillis(ended - started);
        }

        public boolean isEmpty() {
            return added.isEmpty() && removed.isEmpty();
        }

        @Override
        public String toString() {
            return String.format("<+ %d, - %d>", added.size(), removed.size());
        }
    }

    public interface TransactionLogListener {

        void transactionLogged(TransactionLog txLog);

    }
}
