package edu.drew.dm;

import java.time.Duration;
import java.util.logging.Logger;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Sanitizer {

    private static final Logger LOG = Logger.getLogger(Sanitizer.class.getName());

    public static SemanticStore clean(SemanticStore store) {
        final long startTime = System.currentTimeMillis();
        try {
            return store.write(ds -> {
                Models.locators2Identifiers(ds.getDefaultModel());
                return store;
            });
        } finally {
            LOG.fine(() -> String.format("%s sanitized in %s" , store, Duration.ofMillis(System.currentTimeMillis() - startTime)));
        }
    }
}
