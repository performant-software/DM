package edu.drew.dm.data;

import edu.drew.dm.Configuration;
import edu.drew.dm.rdf.Content;
import edu.drew.dm.rdf.Exif;
import edu.drew.dm.rdf.Models;
import edu.drew.dm.rdf.OpenAnnotation;
import edu.drew.dm.rdf.SharedCanvas;
import edu.drew.dm.rdf.TypeBasedTraversal;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.util.iterator.ExtendedIterator;
import org.apache.jena.vocabulary.DC;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.FieldType;
import org.apache.lucene.document.StoredField;
import org.apache.lucene.document.StringField;
import org.apache.lucene.index.Fields;
import org.apache.lucene.index.IndexOptions;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.MultiFields;
import org.apache.lucene.index.PostingsEnum;
import org.apache.lucene.index.TermsEnum;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.SearcherFactory;
import org.apache.lucene.search.SearcherManager;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.search.highlight.Highlighter;
import org.apache.lucene.search.highlight.InvalidTokenOffsetsException;
import org.apache.lucene.search.highlight.QueryScorer;
import org.apache.lucene.search.highlight.SimpleHTMLFormatter;
import org.apache.lucene.search.highlight.TextFragment;
import org.apache.lucene.search.highlight.TokenSources;
import org.apache.lucene.search.spell.Dictionary;
import org.apache.lucene.search.suggest.InputIterator;
import org.apache.lucene.store.FSDirectory;
import org.apache.lucene.util.BytesRef;
import org.jsoup.Jsoup;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class TextIndex implements AutoCloseable {

    private static final Logger LOG = Configuration.logger(TextIndex.class);
    
    private final FSDirectory textIndex;
    private final SearcherManager searcherManager;
    private final SemanticDatabase db;
    private final Index index;

    public TextIndex(Index index) {
        try {
            this.index = index;
            this.db = index.db;

            this.textIndex = index.directory("text");
            this.searcherManager = new SearcherManager(textIndex, new SearcherFactory());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void close() {
        try {
            searcherManager.close();
            textIndex.close();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }


    public List<TextSearch.Hit> query(Query query, int limit) {
        final List<TextSearch.Hit> hits = new ArrayList<>(limit);
        try {
            final IndexSearcher indexSearcher = searcherManager.acquire();
            try {
                final Highlighter highlighter = new Highlighter(
                        new SimpleHTMLFormatter(
                                "<span class=\"sc-SearchResultItem-match-highlight\">",
                                "</span>"
                        ),
                        new QueryScorer(query)
                );

                final TopDocs topDocs = indexSearcher.search(query, limit);
                for (ScoreDoc scoreDoc : topDocs.scoreDocs) {
                    final Document indexEntry = indexSearcher.doc(scoreDoc.doc);
                    final Fields termVectors = indexSearcher.getIndexReader().getTermVectors(scoreDoc.doc);

                    final String text = indexEntry.get("text");
                    final String title = indexEntry.get("title");

                    hits.add(new TextSearch.Hit(
                            indexEntry.get("uri"),
                            title,
                            text,
                            indexEntry.get("image"),
                            Optional.ofNullable(indexEntry.getField("imageWidth")).map(f -> f.numericValue().intValue()).orElse(null),
                            Optional.ofNullable(indexEntry.getField("imageHeight")).map(f -> f.numericValue().intValue()).orElse(null),
                            highlighted(highlighter, termVectors, "title", title),
                            highlighted(highlighter, termVectors, "text", text)

                    ));
                }
            } finally {
                searcherManager.release(indexSearcher);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } catch (InvalidTokenOffsetsException e) {
            LOG.log(Level.WARNING, e, query::toString);
        }
        return hits;
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
    
    private static final int MAX_HIGHLIGHTED_FRAGMENTS = 10;

    void withDictionary(Consumer<ProjectScopedDictionary> dictionaryConsumer) {
        try {
            IndexSearcher searcher = searcherManager.acquire();
            try {
                final IndexReader indexReader = searcher.getIndexReader();
                final ProjectScopedDictionary dictionary = new ProjectScopedDictionary(indexReader);

                dictionaryConsumer.accept(dictionary);
            } finally {
                searcherManager.release(searcher);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    boolean needsRebuild(SemanticDatabase.TransactionLog txLog) {
        final Model model = Models.create().add(txLog.added).add(txLog.removed);

        return model.listStatements(null, DC.title, (RDFNode) null)
                .andThen(model.listStatements(null, Content.chars, (RDFNode) null))
                .hasNext();
    }


    void build() {
        try {
            try (IndexWriter indexWriter = index.writer(textIndex)) {
                indexWriter.deleteAll();
                db.read((source, target) -> {
                    final Set<Resource> projects = source
                            .listSubjectsWithProperty(RDF.type, DCTypes.Collection)
                            .toSet();

                    for (Resource project : projects) {
                        TypeBasedTraversal.ofProject(project).forEach(resource -> {
                            indexText(indexWriter, project, resource);
                            indexCanvas(indexWriter, project, resource);
                        });
                    }
                });
            }
            searcherManager.maybeRefreshBlocking();
        } catch (Throwable t) {
            LOG.log(Level.SEVERE, t, t::getMessage);
        }
    }

    public void indexText(IndexWriter indexWriter, Resource project, Resource text) {
        if (!text.hasProperty(RDF.type, DCTypes.Text) || !text.hasProperty(DC.title) || !text.hasProperty(Content.chars)) {
            return;
        }
        try {
            final String title = title(text);

            final String htmlText = text.getRequiredProperty(Content.chars).getObject()
                    .asLiteral().getString();

            final String plainText = Jsoup.parse(htmlText).body().text();

            final Document indexEntry = new Document();
            indexEntry.add(new StringField("uri", text.getURI(), Field.Store.YES));
            indexEntry.add(new StringField("project", project.getURI(), Field.Store.YES));
            indexEntry.add(new Field("title", title, TEXT_FIELD_TYPE));
            indexEntry.add(new Field("text", plainText, TEXT_FIELD_TYPE));
            indexEntry.add(new Field("all", String.join("\n", title, plainText), TEXT_FIELD_TYPE));

            indexWriter.addDocument(indexEntry);

        } catch (Throwable t) {
            LOG.log(Level.WARNING, t, t::getMessage);
        }
    }

    public void indexCanvas(IndexWriter indexWriter, Resource project, Resource canvas) {
        if (!canvas.hasProperty(RDF.type, SharedCanvas.Canvas) || !canvas.hasProperty(DC.title)) {
            return;
        }
        try {
            final String title = title(canvas);

            final ExtendedIterator<Resource> images = canvas.getModel()
                    .listResourcesWithProperty(OpenAnnotation.hasTarget, canvas)
                    .mapWith(r -> r.getPropertyResourceValue(OpenAnnotation.hasBody))
                    .filterKeep(r -> r.hasProperty(RDF.type, DCTypes.Image));

            if (!images.hasNext()) {
                return;
            }

            final String image = images.next().getURI();

            final Document indexEntry = new Document();
            indexEntry.add(new StringField("uri", canvas.getURI(), Field.Store.YES));
            indexEntry.add(new StringField("project", project.getURI(), Field.Store.YES));
            indexEntry.add(new Field("title", title, TEXT_FIELD_TYPE));
            indexEntry.add(new StringField("image", image, Field.Store.YES));
            indexEntry.add(new StoredField("imageWidth", canvas.getRequiredProperty(Exif.width).getInt()));
            indexEntry.add(new StoredField("imageHeight", canvas.getRequiredProperty(Exif.height).getInt()));
            indexEntry.add(new Field("all", title, TEXT_FIELD_TYPE));

            indexWriter.addDocument(indexEntry);
        } catch (Throwable t) {
            LOG.log(Level.WARNING, t, t::getMessage);
        }
    }

    private static String title(Resource labelled) {
        return labelled.getRequiredProperty(DC.title).getString()
                .replaceAll("\\s+", " ").trim();
    }

    static final FieldType TEXT_FIELD_TYPE = new FieldType();

    static {
        TEXT_FIELD_TYPE.setIndexOptions(IndexOptions.DOCS_AND_FREQS_AND_POSITIONS_AND_OFFSETS);
        TEXT_FIELD_TYPE.setTokenized(true);
        TEXT_FIELD_TYPE.setStored(true);
        TEXT_FIELD_TYPE.setStoreTermVectors(true);
        TEXT_FIELD_TYPE.setStoreTermVectorOffsets(true);
        TEXT_FIELD_TYPE.setStoreTermVectorPositions(true);
        TEXT_FIELD_TYPE.freeze();
    }

    static class ProjectScopedDictionary implements Dictionary {

        private final IndexReader indexReader;

        private final Map<Integer, BytesRef> projects = new HashMap<>();

        ProjectScopedDictionary(IndexReader indexReader) throws IOException {
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
                            BytesRef project = ProjectScopedDictionary.this.projects.get(docId);
                            if (project == null) {
                                projects.put(docId, project = new BytesRef(indexReader.document(docId).get("project")));
                            }
                            contexts.add(project);
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
