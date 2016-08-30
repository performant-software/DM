package edu.drew.dm.http;

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

    private final String[] PUBLIC_PATHS = { "static", "media", "workspace" };

    private final String[] PRIVATE_PATHS = { "accounts" };

    private final SemanticDatabase store;
    private final Provider<Request> requestProvider;

    @Inject
    public Authentication(SemanticDatabase store, Provider<Request> requestProvider) {
        this.store = store;
        this.requestProvider = requestProvider;
    }


    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        final String path = requestContext.getUriInfo().getPath();

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

        String auth = Optional.ofNullable(requestContext.getHeaderString(HttpHeaders.AUTHORIZATION)).orElse("");
        if (auth.isEmpty() && Stream.of(PRIVATE_PATHS).noneMatch(path::startsWith)) {
            requestContext.setSecurityContext(User.GUEST);
            return;
        }

        final String userPassword = new String(Base64.getDecoder().decode(auth.replaceFirst("[Bb]asic ", "").getBytes(UTF_8)), UTF_8);
        final int colonIdx = userPassword.indexOf(":");

        final String user = colonIdx > 0
                ? userPassword.substring(0, colonIdx)
                : "";

        @SuppressWarnings("unused")
        final String password = colonIdx >= 0 && colonIdx < userPassword.length()
                ? userPassword.substring(colonIdx + 1)
                : "";


        if (user.isEmpty() || password.isEmpty()) {
            throw unauthorized(REALM);
        }

        final String passwordHash = User.passwordHash(password);
        final User agent = store.read(ds -> {
            final ExtendedIterator<User> users = ds.getDefaultModel().listSubjectsWithProperty(RDFS.label, user)
                    .filterKeep(subject -> subject.hasProperty(RDF.type, FOAF.Agent))
                    .filterKeep(subject -> subject.inModel(SemanticDatabase.passwords(ds)).hasProperty(DigitalMappaemundi.password, passwordHash))
                    .mapWith(subject -> new User(
                            user,
                            Optional.ofNullable(subject.getProperty(FOAF.firstName))
                                    .map(Statement::getObject)
                                    .map(RDFNode::asLiteral)
                                    .map(Literal::getString)
                                    .orElse(user),
                            Optional.ofNullable(subject.getProperty(FOAF.surname))
                                    .map(Statement::getObject)
                                    .map(RDFNode::asLiteral)
                                    .map(Literal::getString)
                                    .orElse(user),
                            Optional.ofNullable(subject.getPropertyResourceValue(FOAF.mbox))
                                    .map(Resource::getURI)
                                    .map(uri -> URI.create(uri).getSchemeSpecificPart())
                                    .orElseThrow(IllegalStateException::new),
                            true,
                            ""
                    ));
            return (users.hasNext() ? users.next() : null);
        });

        if (agent == null) {
            throw unauthorized(REALM);
        }

        request.getSession(true).setAttribute(User.class.getName(), agent);
        requestContext.setSecurityContext(agent);
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

