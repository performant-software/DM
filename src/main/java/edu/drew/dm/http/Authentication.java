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

    private final Map<String, User> cache = new ConcurrentHashMap<>();

    private final SemanticDatabase store;

    @Inject
    public Authentication(SemanticDatabase store) {
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


            if (user.isEmpty() || password.isEmpty()) {
                throw UNAUTHORIZED;
            }

            final String passwordHash = User.passwordHash(password);
            agent = store.read(ds -> {
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

