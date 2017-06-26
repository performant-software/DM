package edu.drew.dm.data;

import org.apache.lucene.search.suggest.Lookup;
import org.apache.lucene.search.suggest.analyzing.AnalyzingInfixSuggester;
import org.apache.lucene.store.FSDirectory;
import org.apache.lucene.util.BytesRef;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class TextIndexSuggester implements AutoCloseable {

    private final FSDirectory directory;
    private final AnalyzingInfixSuggester suggester;

    public TextIndexSuggester(Index index) {
        try {

            this.directory = index.directory("suggester");
            this.suggester = new AnalyzingInfixSuggester(directory, Index.ANALYZER);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public List<String> suggest(String project, String prefix, int limit) throws IOException {
        final List<Lookup.LookupResult> result = suggester.lookup(
                prefix,
                Collections.singleton(new BytesRef(project)),
                false,
                limit
        );
        final List<String> suggestions = new ArrayList<>(result.size());
        result.forEach(r -> suggestions.add(r.key.toString()));
        return suggestions;
    }

    public void build(TextIndex.ProjectScopedDictionary dictionary) {
        try {
            suggester.build(dictionary);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void close() throws IOException {
        suggester.close();
        directory.close();
    }
}
