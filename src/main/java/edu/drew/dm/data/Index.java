package edu.drew.dm.data;

import edu.drew.dm.Logging;
import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.en.EnglishAnalyzer;
import org.apache.lucene.document.FieldType;
import org.apache.lucene.index.IndexOptions;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.SearcherManager;
import org.apache.lucene.store.FSDirectory;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Logger;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Index implements AutoCloseable, SemanticDatabase.TransactionLogListener {

    private static final Logger LOG = Logging.inClass(Index.class);

    final TextIndex textIndex;
    final TextIndexSuggester textIndexSuggester;

    public static final Analyzer ANALYZER = new EnglishAnalyzer();

    final FileSystem fs;
    final SemanticDatabase db;

    private final AtomicBoolean needsRebuild = new AtomicBoolean(true);

    public Index(FileSystem fs, SemanticDatabase db) {
        this.fs = fs;
        this.db = db;

        this.textIndex = new TextIndex(this);
        this.textIndexSuggester = new TextIndexSuggester(this);

        db.addTransactionLogListener(this);
    }

    @Override
    public void transactionLogged(SemanticDatabase.TransactionLog txLog) {
        needsRebuild.compareAndSet(false, textIndex.needsRebuild(txLog));
    }

    public void rebuild() {
        if (needsRebuild.compareAndSet(true, false)) {
            final long start = System.currentTimeMillis();

            textIndex.build();
            textIndex.withDictionary(textIndexSuggester::build);

            LOG.info(() -> String.format(
                    "Rebuild text index in %s",
                    Duration.ofMillis(System.currentTimeMillis() - start)
            ));
        }
    }

    @Override
    public void close() throws IOException {
        textIndexSuggester.close();
        textIndex.close();
    }

    FSDirectory directory(String name) throws IOException {
        final FSDirectory indexDirectory = FSDirectory.open(fs.directory(String.join("-", name, "index")).toPath());

        try (IndexWriter writer = writer(indexDirectory)) {
            writer.commit();
        }

        return indexDirectory;
    }

    IndexWriter writer(FSDirectory directory) throws IOException {
        return new IndexWriter(directory, new IndexWriterConfig(ANALYZER)
                .setOpenMode(IndexWriterConfig.OpenMode.CREATE_OR_APPEND));
    }
}
