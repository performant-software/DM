package edu.drew.dm;

import com.sun.org.apache.regexp.internal.RE;
import com.sun.xml.internal.messaging.saaj.util.Base64;

import javax.ws.rs.WebApplicationException;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.Response;
import java.io.IOException;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Authentication implements ContainerRequestFilter {

    private final String[] PUBLIC_PATHS = { "/static", "/media" };

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
        if (userPassword.equals("admin:admin")) {
            requestContext.setSecurityContext(new User("admin"));
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

