package edu.drew.dm.data;

import edu.drew.dm.Configuration;
import org.apache.lucene.index.Term;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.BooleanClause;
import org.apache.lucene.search.BooleanQuery;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.TermQuery;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.logging.Logger;
import java.util.regex.Pattern;

public class TextSearch {

    public static final TextSearch EMPTY = new TextSearch(new Hit[0], null);

    private static final Logger LOG = Configuration.logger(TextSearch.class);

    public static TextSearch execute(Index index, String project, String query, int limit) {
        try {
            final String escaped = escapeQuery(query);
            final String luceneQuery = String.format("title:\"%s\"^10 OR text:\"%s\"", escaped, escaped);

            final Query indexQuery = new BooleanQuery.Builder()
                    .add(new QueryParser("text", Index.ANALYZER).parse(luceneQuery), BooleanClause.Occur.MUST)
                    .add(new TermQuery(new Term("project", project)), BooleanClause.Occur.MUST)
                    .build();

            LOG.finer(() -> String.format("? %s [%s @ %s]", indexQuery, query, project));
            
            final List<TextSearch.Hit> hits = index.textIndex.query(indexQuery, limit);

            String suggestion = null;
            if (hits.size() == 0 && !WHITESPACE.matcher(query).find()) {
                suggestion = TextIndexSuggestion.lookup(index, project, query, 10)
                        .stream()
                        .findFirst().orElse(null);
            }

            Collections.sort(hits, Comparator.comparing(
                    (TextSearch.Hit hit) -> hit.image == null ? 1 : 0
            ));

            return new TextSearch(hits.toArray(new TextSearch.Hit[hits.size()]), suggestion);
        } catch (ParseException e) {
            return TextSearch.EMPTY;
        }
    }

    public final Hit[] results;
    public final String spellingSuggestion;

    public TextSearch(Hit[] results, String spellingSuggestion) {
        this.results = results;
        this.spellingSuggestion = spellingSuggestion;
    }

    public static class Hit {

        public final String uri;
        public final String title;

        public final String text;

        public final String image;
        public final Integer imageWidth;
        public final Integer imageHeight;

        public final String titleHighlighted;
        public final String textHighlighted;

        public Hit(String uri, String title, String text, String image, Integer imageWidth, Integer imageHeight, String titleHighlighted, String textHighlighted) {
            this.uri = uri;
            this.title = title;
            this.text = text;
            this.image = image;
            this.imageWidth = imageWidth;
            this.imageHeight = imageHeight;
            this.titleHighlighted = titleHighlighted;
            this.textHighlighted = textHighlighted;
        }
    }

    public static String escapeQuery(String query) {
        return RESERVED_QUERY_CHARS.matcher(query).replaceAll("\\\\$0");
    }

    private static final Pattern WHITESPACE = Pattern.compile("\\s");
    private static final Pattern RESERVED_QUERY_CHARS = Pattern.compile("[" + Pattern.quote("+-&|!(){}[]^\"~*?:\\/") + "]");
}

