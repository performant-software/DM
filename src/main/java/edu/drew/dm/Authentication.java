package edu.drew.dm;

import com.sun.org.apache.regexp.internal.RE;
import com.sun.xml.internal.messaging.saaj.util.Base64;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import javax.inject.Inject;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.Response;
import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Authentication implements ContainerRequestFilter {

    private final String[] PUBLIC_PATHS = { "/static", "/media" };
    private final SemanticStore store;

    @Inject
    public Authentication(SemanticStore store) {
        this.store = store;
    }


    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        final String path = requestContext.getUriInfo().getPath();

        if (path.isEmpty() || Stream.of(PUBLIC_PATHS).anyMatch(prefix -> path.startsWith(prefix))) {
            return;
        }


        final String auth = requestContext.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (auth == null) {
            throw UNAUTHORIZED;
        }

        final String userPassword = Base64.base64Decode(auth.replaceFirst("[Bb]asic ", ""));
        final int colonIdx = userPassword.indexOf(":");

        final String user = colonIdx > 0
                ? userPassword.substring(0, colonIdx)
                : userPassword;

        @SuppressWarnings("unused")
        final String password = colonIdx >= 0 && colonIdx < userPassword.length()
                ? userPassword.substring(colonIdx + 1)
                : userPassword;


        final List<User> agents = store.read(model -> model
                .listSubjectsWithProperty(RDF.type, FOAF.Agent)
                .filterKeep(agent -> agent.hasProperty(RDFS.label, user))
                .mapWith(agent -> {
                    final String label = agent.getProperty(RDFS.label).getObject().asLiteral().getString();
                    final URI mail = URI.create(agent.getProperty(FOAF.mbox).getObject().asResource().toString());
                    return new User(
                            label,
                            agent.getURI(),
                            label,
                            label,
                            mail.getSchemeSpecificPart()
                    );
                })
                .toList());

        if (!agents.isEmpty()) {
            requestContext.setSecurityContext(agents.stream().findFirst().orElseThrow(IllegalStateException::new));
            return;
        }

        throw UNAUTHORIZED;
    }

    public static WebApplicationException unauthorized(String realm) {
        return new WebApplicationException(
                Response.status(Response.Status.UNAUTHORIZED)
                        .header(HttpHeaders.WWW_AUTHENTICATE, String.format("Basic realm=\"%s\"", REALM))
                        .build()
        );
    }

    public static final String REALM = "DM";
    public static final WebApplicationException UNAUTHORIZED = unauthorized(REALM);

}

