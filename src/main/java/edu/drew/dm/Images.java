package edu.drew.dm;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;

import javax.ws.rs.core.UriInfo;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Images {

    public static Model identifiers2Locators(Model model, UriInfo ui) {
        return Models.renameResources(model, (r -> {
            final String uri = r.getURI();
            final URI parsed = URI.create(uri);
            return "image".equals(parsed.getScheme()) ? imageResource(ui, parsed.getSchemeSpecificPart()) : uri;
        }));
    }

    public static String locators2Identifiers(Resource resource) {
        try {
            final String uri = resource.getURI();
            final Matcher imageMatcher = IMAGE_URI.matcher(uri);
            return imageMatcher.find() ? new URI("image", imageMatcher.group(1), null).toString() : uri;
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    public static String imageResource(UriInfo ui, String path) {
        return Server.baseUri(ui)
                .path("/images")
                .path(path)
                .build().toString();

    }

    private static final Pattern IMAGE_URI = Pattern.compile("media/user_images/(.+)$");
}
