package edu.drew.dm.http;

import edu.drew.dm.Server;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.semantics.DigitalMappaemundi;
import org.apache.jena.rdf.model.Literal;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.util.iterator.ExtendedIterator;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;
import org.glassfish.grizzly.http.server.Request;

import javax.annotation.Priority;
import javax.inject.Inject;
import javax.inject.Provider;
import javax.ws.rs.Priorities;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import java.io.IOException;
import java.net.URI;
import java.util.Base64;
import java.util.Optional;
import java.util.stream.Stream;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Priority(Priorities.AUTHENTICATION)
public class Authentication implements ContainerRequestFilter {

    private final String[] PUBLIC_PATHS = { "static", "media", "workspace", "accounts/oauth" };

    private final String[] PRIVATE_PATHS = { "accounts", "debug" };

    private final SemanticDatabase store;
    private final Provider<Request> requestProvider;

    @Inject
    public Authentication(SemanticDatabase store, Provider<Request> requestProvider) {
        this.store = store;
        this.requestProvider = requestProvider;
    }


    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        final UriInfo ui = requestContext.getUriInfo();
        final String path = ui.getPath();

        final Request request = requestProvider.get();

        final User authenticated = Optional.ofNullable(request.getSession(false))
                .map(session -> (User) session.getAttribute(User.class.getName()))
                .orElse(null);

        if (authenticated != null) {
            requestContext.setSecurityContext(authenticated);
            return;
        }

        if (path.isEmpty() || Stream.of(PUBLIC_PATHS).anyMatch(path::startsWith)) {
            requestContext.setSecurityContext(User.GUEST);
            return;
        }

        if (Stream.of(PRIVATE_PATHS).noneMatch(path::startsWith)) {
            requestContext.setSecurityContext(User.GUEST);
            return;
        }

        try {
            throw new WebApplicationException(Response.temporaryRedirect(Server.baseUri(ui)
                    .path(Accounts.class)
                    .path(Accounts.class.getMethod("oauth", UriInfo.class))
                    .build()
            ).build());
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        }
    }

    static WebApplicationException unauthorized(String realm) {
        return new WebApplicationException(
                Response.status(Response.Status.UNAUTHORIZED)
                        .header(HttpHeaders.WWW_AUTHENTICATE, String.format("Basic realm=\"%s\"", realm))
                        .build()
        );
    }

    static final String REALM = "DM";

}

