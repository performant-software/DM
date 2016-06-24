package edu.drew.dm;

import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.util.iterator.ExtendedIterator;
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
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Authentication implements ContainerRequestFilter {

    private final String[] PUBLIC_PATHS = { "/static", "/media" };

    // FIXME: add cache expiration
    private Map<String, User> cache = new ConcurrentHashMap<>();

    private final SemanticStore store;

    @Inject
    public Authentication(SemanticStore store) {
        this.store = store;
    }


    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        final String path = requestContext.getUriInfo().getPath();

        if (path.isEmpty() || Stream.of(PUBLIC_PATHS).anyMatch(path::startsWith)) {
            return;
        }

        final String auth = requestContext.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (auth == null) {
            throw UNAUTHORIZED;
        }

        User agent = cache.get(auth);
        if (agent == null) {
            final String userPassword = new String(Base64.getDecoder().decode(auth.replaceFirst("[Bb]asic ", "").getBytes(UTF_8)), UTF_8);
            final int colonIdx = userPassword.indexOf(":");

            final String user = colonIdx > 0
                    ? userPassword.substring(0, colonIdx)
                    : "";

            @SuppressWarnings("unused")
            final String password = colonIdx >= 0 && colonIdx < userPassword.length()
                    ? userPassword.substring(colonIdx + 1)
                    : "";


            if (user.isEmpty() || password.isEmpty() || !user.equals(password)) {
                throw UNAUTHORIZED;
            }

            agent = store.read(ds -> {
                final ExtendedIterator<User> users = ds.getDefaultModel().listSubjectsWithProperty(RDFS.label, user)
                        .filterKeep(subject -> subject.hasProperty(RDF.type, FOAF.Agent))
                        .mapWith(subject -> new User(
                                user,
                                subject.getURI(),
                                user,
                                user,
                                Optional.ofNullable(subject.getPropertyResourceValue(FOAF.mbox))
                                        .map(Resource::getURI)
                                        .map(uri -> URI.create(uri).getSchemeSpecificPart())
                                        .orElseThrow(IllegalStateException::new)
                        ));
                return (users.hasNext() ? users.next() : null);
            });
        }

        if (agent != null) {
            cache.put(auth, agent);
            requestContext.setSecurityContext(agent);
            return;
        }

        throw UNAUTHORIZED;
    }

    public static WebApplicationException unauthorized(String realm) {
        return new WebApplicationException(
                Response.status(Response.Status.UNAUTHORIZED)
                        .header(HttpHeaders.WWW_AUTHENTICATE, String.format("Basic realm=\"%s\"", realm))
                        .build()
        );
    }

    public static final String REALM = "DM";
    public static final WebApplicationException UNAUTHORIZED = unauthorized(REALM);

}

