package edu.drew.dm.data;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

public class TextIndexSuggestion {

    public static List<String> lookup(Index index, String project, String prefix, int limit) {
        try {
            return index.textIndexSuggester.suggest(project, prefix, limit);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
