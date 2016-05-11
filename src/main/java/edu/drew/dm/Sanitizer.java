package edu.drew.dm;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;
import java.util.function.Function;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Sanitizer {

    private static final Logger LOG = Logger.getLogger(Sanitizer.class.getName());

    public static SemanticStore clean(SemanticStore store) {
        final long startTime = System.currentTimeMillis();
        return store.write(dataset -> {

            final Model model = dataset.getDefaultModel();

            Models.renameResources(model,
                    new Function<Resource, String>() {

                        final Pattern userPattern = Pattern.compile("/store/users/(.+)$");

                        @Override
                        public String apply(Resource resource) {
                            try {
                                final String uri = resource.getURI();
                                final Matcher userMatcher = userPattern.matcher(uri);
                                return userMatcher.find() ? new URI("user", userMatcher.group(1), null).toString() : uri;
                            } catch (URISyntaxException e) {
                                throw new RuntimeException(e);
                            }
                        }
                    },
                    new Function<Resource, String>() {

                        final Pattern imagePattern = Pattern.compile("media/user_images/(.+)$");

                        @Override
                        public String apply(Resource resource) {
                            try {
                                final String uri = resource.getURI();
                                final Matcher imageMatcher = imagePattern.matcher(uri);
                                return imageMatcher.find() ? new URI("image", imageMatcher.group(1), null).toString() : uri;
                            } catch (URISyntaxException e) {
                                throw new RuntimeException(e);
                            }
                        }
                    }
            );

            LOG.fine(() -> String.format("%s sanitized in %s" , store, Duration.ofMillis(System.currentTimeMillis() - startTime)));

            return store;
        });
    }
}
