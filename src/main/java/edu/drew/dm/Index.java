package edu.drew.dm;

import edu.drew.dm.vocabulary.Content;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;
import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.analysis.en.EnglishAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.FieldType;
import org.apache.lucene.document.StringField;
import org.apache.lucene.index.Fields;
import org.apache.lucene.index.IndexOptions;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.index.MultiFields;
import org.apache.lucene.index.MultiTerms;
import org.apache.lucene.index.PostingsEnum;
import org.apache.lucene.index.Term;
import org.apache.lucene.index.Terms;
import org.apache.lucene.index.TermsEnum;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.BooleanClause;
import org.apache.lucene.search.BooleanQuery;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.SearcherFactory;
import org.apache.lucene.search.SearcherManager;
import org.apache.lucene.search.TermQuery;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.search.highlight.Highlighter;
import org.apache.lucene.search.highlight.InvalidTokenOffsetsException;
import org.apache.lucene.search.highlight.QueryScorer;
import org.apache.lucene.search.highlight.SimpleHTMLFormatter;
import org.apache.lucene.search.highlight.TextFragment;
import org.apache.lucene.search.highlight.TokenSources;
import org.apache.lucene.search.spell.Dictionary;
import org.apache.lucene.search.spell.LuceneDictionary;
import org.apache.lucene.search.spell.SpellChecker;
import org.apache.lucene.search.suggest.InputIterator;
import org.apache.lucene.search.suggest.SortedInputIterator;
import org.apache.lucene.search.suggest.analyzing.AnalyzingInfixSuggester;
import org.apache.lucene.search.suggest.analyzing.FuzzySuggester;
import org.apache.lucene.store.FSDirectory;
import org.apache.lucene.store.RAMDirectory;
import org.apache.lucene.util.BytesRef;
import org.jsoup.Jsoup;

import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.logging.Logger;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Index implements AutoCloseable {

    private final FSDirectory spellcheckerIndex;
    private final FSDirectory suggesterIndex;
    private final SpellChecker spellChecker;
    private final AnalyzingInfixSuggester suggester;

    public static class Hit {

        public final String uri;
        public final String title;
        public final String text;

        public final String titleHighlighted;
        public final String textHighlighted;

        public Hit(String uri, String title, String text, String titleHighlighted, String textHighlighted) {
            this.uri = uri;
            this.title = title;
            this.text = text;
            this.titleHighlighted = titleHighlighted;
            this.textHighlighted = textHighlighted;
        }
    }

    private static final Logger LOG = Logger.getLogger(Index.class.getName());

    private final SemanticStore store;

    private final Analyzer analyzer = new EnglishAnalyzer();

    private final FSDirectory textIndex;
    private final SearcherManager searcherManager;

    public Index(SemanticStore store) {
        try {
            this.store = store;
            this.textIndex = indexDirectory("text");
            this.spellcheckerIndex = indexDirectory("spellchecker");
            this.suggesterIndex = indexDirectory("suggester");

            this.searcherManager = new SearcherManager(textIndex, new SearcherFactory());
            this.spellChecker = new SpellChecker(spellcheckerIndex);
            this.suggester = new AnalyzingInfixSuggester(suggesterIndex, analyzer);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public void build() {
        try {
            try (IndexWriter indexWriter = writer(textIndex)) {
                indexWriter.deleteAll();
                store.read((source, target) -> source.listResourcesWithProperty(RDF.type, DCTypes.Text)
                        .filterKeep(r -> r.hasProperty(RDFS.label))
                        .filterKeep(r -> r.hasProperty(Content.chars))
                        .forEachRemaining(r -> index(indexWriter, r)));

            }

            searcherManager.maybeRefresh();

            spellChecker.clearIndex();

            IndexSearcher searcher = searcherManager.acquire();
            try {
                final IndexReader indexReader = searcher.getIndexReader();
                final ProjectScopedDictionary dictionary = new ProjectScopedDictionary(indexReader);

                spellChecker.indexDictionary(dictionary, writerConfig(), false);
                suggester.build(dictionary);
            } finally {
                searcherManager.release(searcher);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public void search(String projectUri, String queryStr, int limit, Consumer<Hit> hits) throws ParseException, IOException, InvalidTokenOffsetsException {
        final QueryParser queryParser = new QueryParser("text", analyzer);
        queryParser.setAllowLeadingWildcard(true);

        final Query query = new BooleanQuery.Builder()
                .add(queryParser.parse(queryStr), BooleanClause.Occur.MUST)
                .add(new TermQuery(new Term("project", projectUri)), BooleanClause.Occur.MUST)
                .build();

        LOG.fine(() -> String.format("? %s [%s @ %s]", query, queryStr, projectUri));

        final IndexSearcher indexSearcher = searcherManager.acquire();

        final Highlighter highlighter = new Highlighter(
                new SimpleHTMLFormatter(
                        "<span class=\"sc-SearchResultItem-match-highlight\">",
                        "</span>"
                ),
                new QueryScorer(query)
        );

        try {
            final TopDocs topDocs = indexSearcher.search(query, limit);
            for (ScoreDoc scoreDoc : topDocs.scoreDocs) {
                final Document indexEntry = indexSearcher.doc(scoreDoc.doc);
                final Fields termVectors = indexSearcher.getIndexReader().getTermVectors(scoreDoc.doc);

                final String text = indexEntry.get("text");
                final String title = indexEntry.get("title");

                hits.accept(new Hit(
                        indexEntry.get("uri"),
                        title,
                        text,
                        highlighted(highlighter, termVectors, "title", title),
                        highlighted(highlighter, termVectors, "text", text)

                ));
            }
        } finally {
            searcherManager.release(indexSearcher);
        }
    }

    public Optional<String> checkSpelling(String word) throws IOException {
        return Stream.of(spellChecker.suggestSimilar(word, 5)).findFirst();
    }

    public String[] suggest(String project, String word, int limit) throws IOException {
        return suggester.lookup(word, Collections.singleton(new BytesRef(project)), false, limit).stream().map(r -> r.key.toString()).toArray(String[]::new);
    }

    public String highlighted(Highlighter highlighter, Fields termVectors, String field, String value) throws IOException, InvalidTokenOffsetsException {
        final TokenStream tokenStream = TokenSources.getTermVectorTokenStreamOrNull(
                field,
                termVectors,
                highlighter.getMaxDocCharsToAnalyze() - 1
        );

        if (tokenStream == null) {
            return "";
        }

        return Stream.of(highlighter.getBestTextFragments(tokenStream, value, true, MAX_HIGHLIGHTED_FRAGMENTS))
                .filter(f -> f != null).filter(f -> f.getScore() > 0)
                .map(TextFragment::toString)
                .collect(Collectors.joining(" [...] "));
    }

    public void index(IndexWriter indexWriter, Resource resource) {
        try {
            final String title = resource.getRequiredProperty(RDFS.label).getObject()
                    .asLiteral().getString()
                    .replaceAll("\\s+", " ").trim();

            LOG.fine(() -> String.format("+ '%s'", title));

            final String htmlText = resource.getRequiredProperty(Content.chars).getObject()
                    .asLiteral().getString();

            final String plainText = Jsoup.parse(htmlText).body().text();

            final String uri = resource.getURI();
            final Set<String> projects = resource.getModel()
                    .listSubjectsWithProperty(OpenArchivesTerms.aggregates, resource)
                    .mapWith(Resource::getURI).toSet();

            for (String project : projects) {
                final Document indexEntry = new Document();
                indexEntry.add(new StringField("uri", uri, Field.Store.YES));
                indexEntry.add(new StringField("project", project, Field.Store.YES));
                indexEntry.add(new Field("title", title, TEXT_FIELD_TYPE));
                indexEntry.add(new Field("text", plainText, TEXT_FIELD_TYPE));
                indexEntry.add(new Field("all", String.join("\n", title, plainText), TEXT_FIELD_TYPE));

                indexWriter.addDocument(indexEntry);

            }

        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void close() {
        for (FSDirectory index : new FSDirectory[]{suggesterIndex, spellcheckerIndex, textIndex}) {
            try {
                index.close();
            } catch (IOException e) {
                // ignored
            }
        }
    }

    protected IndexWriter writer(FSDirectory directory) throws IOException {
        return new IndexWriter(directory, writerConfig());
    }

    protected IndexWriterConfig writerConfig() {
        return new IndexWriterConfig(analyzer)
                .setOpenMode(IndexWriterConfig.OpenMode.CREATE_OR_APPEND);
    }

    protected FSDirectory indexDirectory(String name) throws IOException {
        final FSDirectory indexDirectory = FSDirectory.open(SemanticStore.directory(new File(store.getBase(), name + "-index")).toPath());

        try (IndexWriter writer = writer(indexDirectory)) {
            writer.commit();
        }

        return indexDirectory;
    }

    public static String escapeQuery(String query) {
        return RESERVED_QUERY_CHARS.matcher(query).replaceAll("\\\\$0");
    }

    private static final Pattern WHITESPACE = Pattern.compile("\\s");
    private static final Pattern RESERVED_QUERY_CHARS = Pattern.compile("[" + Pattern.quote("+-&|!(){}[]^\"~*?:\\/") + "]");

    private static final int MAX_HIGHLIGHTED_FRAGMENTS = 10;

    private static final FieldType TEXT_FIELD_TYPE = new FieldType();

    static {
        TEXT_FIELD_TYPE.setIndexOptions(IndexOptions.DOCS_AND_FREQS_AND_POSITIONS_AND_OFFSETS);
        TEXT_FIELD_TYPE.setTokenized(true);
        TEXT_FIELD_TYPE.setStored(true);
        TEXT_FIELD_TYPE.setStoreTermVectors(true);
        TEXT_FIELD_TYPE.setStoreTermVectorOffsets(true);
        TEXT_FIELD_TYPE.setStoreTermVectorPositions(true);
        TEXT_FIELD_TYPE.freeze();
    }

    private static class ProjectScopedDictionary implements Dictionary {

        private final IndexReader indexReader;

        public ProjectScopedDictionary(IndexReader indexReader) throws IOException {
            this.indexReader = indexReader;
        }

        @Override
        public InputIterator getEntryIterator() throws IOException {
            final TermsEnum terms = MultiFields.getTerms(this.indexReader, "all").iterator();
            return new InputIterator() {
                @Override
                public long weight() {
                    try {
                        return terms.docFreq();
                    } catch (IOException e) {
                        throw new UncheckedIOException(e);
                    }
                }

                @Override
                public BytesRef payload() {
                    return null;
                }

                @Override
                public boolean hasPayloads() {
                    return false;
                }

                @Override
                public Set<BytesRef> contexts() {
                    final Set<BytesRef> contexts = new HashSet<>();
                    try {
                        final PostingsEnum postings = terms.postings(null);
                        int docId;
                        while ((docId = postings.nextDoc()) != PostingsEnum.NO_MORE_DOCS) {
                            contexts.add(new BytesRef(indexReader.document(docId).get("project")));
                        }
                        return contexts;
                    } catch (IOException e) {
                        throw new UncheckedIOException(e);
                    }
                }

                @Override
                public boolean hasContexts() {
                    return true;
                }

                @Override
                public BytesRef next() throws IOException {
                    return terms.next();
                }
            };
        }
    }
}
