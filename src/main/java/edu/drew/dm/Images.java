package edu.drew.dm;

import org.apache.jena.rdf.model.Model;

import javax.ws.rs.core.UriInfo;
import java.net.URI;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Images {

    public static Model linked(Model model, UriInfo ui) {
        return Models.renameResources(model, (r -> {
            final String uri = r.getURI();
            final URI parsed = URI.create(uri);
            return "image".equals(parsed.getScheme()) ? imageResource(ui, parsed.getSchemeSpecificPart()) : uri;
        }));
    }

    public static String imageResource(UriInfo ui, String path) {
        return ui.getBaseUriBuilder()
                .path("/images")
                .path(path)
                .build().toString();

    }
}
