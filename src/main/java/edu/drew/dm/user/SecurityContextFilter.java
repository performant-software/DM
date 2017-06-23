package edu.drew.dm.user;

import org.glassfish.grizzly.http.server.Request;

import java.io.IOException;
import java.util.stream.Stream;
import javax.annotation.Priority;
import javax.inject.Inject;
import javax.inject.Provider;
import javax.ws.rs.Priorities;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Priority(Priorities.AUTHENTICATION)
public class SecurityContextFilter implements ContainerRequestFilter {

    private final String[] PUBLIC_PATHS = { "static", "media", "workspace", "accounts/login", "accounts/oauth-callback" };

    private final String[] PRIVATE_PATHS = { "accounts", "debug" };

    private final Provider<Request> requestProvider;

    @Inject
    public SecurityContextFilter(Provider<Request> requestProvider) {
        this.requestProvider = requestProvider;
    }


    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        final Request request = requestProvider.get();
        final User authenticated = User.get(request);
        if (authenticated != null) {
            requestContext.setSecurityContext(authenticated);
            return;
        }

        final UriInfo ui = requestContext.getUriInfo();
        final String path = ui.getPath();
        if (path.isEmpty() || Stream.of(PUBLIC_PATHS).anyMatch(path::startsWith)) {
            requestContext.setSecurityContext(User.GUEST);
            return;
        }

        if (Stream.of(PRIVATE_PATHS).noneMatch(path::startsWith)) {
            requestContext.setSecurityContext(User.GUEST);
            return;
        }

        throw new WebApplicationException(Response.Status.FORBIDDEN);
    }
}

