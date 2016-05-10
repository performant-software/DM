package edu.drew.dm;

import org.apache.jena.graph.NodeFactory;
import org.apache.jena.query.QuerySolution;
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
import java.util.Base64;
import java.util.stream.Stream;

import static java.nio.charset.StandardCharsets.UTF_8;

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

        if (path.isEmpty() || Stream.of(PUBLIC_PATHS).anyMatch(path::startsWith)) {
            return;
        }


        final String auth = requestContext.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (auth == null) {
            throw UNAUTHORIZED;
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
            throw UNAUTHORIZED;
        }

        final User agent = store.query(
                Sparql.select()
                        .addVar("?label").addVar("?agent").addVar("?mailbox")
                        .addWhere("?agent", RDF.type, FOAF.Agent)
                        .addWhere("?agent", RDFS.label, "?label")
                        .addWhere("?agent", FOAF.mbox, "?mailbox")
                        .addWhere("?agent", RDFS.label, NodeFactory.createLiteral(user))
                        .build(),
                resultSet -> {
                    if (resultSet.hasNext()) {
                        final QuerySolution qs = resultSet.next();
                        final String name = qs.getLiteral("label").toString();
                        return new User(
                                name,
                                qs.getResource("agent").getURI(),
                                name,
                                name,
                                URI.create(qs.getResource("mailbox").getURI()).getSchemeSpecificPart()
                        );
                    }
                    return null;
                }
        );

        if (agent != null) {
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

