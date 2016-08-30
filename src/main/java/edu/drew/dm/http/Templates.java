package edu.drew.dm.http;

import org.glassfish.jersey.server.ContainerRequest;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Templates {

    public static Map<String, Object> model(ContainerRequest cr) {
        final URI baseUri = cr.getUriInfo().getBaseUri();

        final Map<String, Object> model = new HashMap<>();
        model.put("local", baseUri.getHost().startsWith("localhost"));
        model.put("cp", baseUri.getRawPath().replaceAll("/$", ""));
        model.put("user", cr.getSecurityContext());
        return model;
    }
}
