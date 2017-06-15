package edu.drew.dm.http;

import edu.drew.dm.auth.AuthenticationProvider;
import edu.drew.dm.auth.AuthenticationProviderRegistry;
import org.glassfish.grizzly.http.server.Request;
import org.glassfish.grizzly.http.server.Session;
import org.glassfish.jersey.server.ContainerRequest;
import org.glassfish.jersey.server.mvc.Template;

import java.net.URI;
import javax.inject.Inject;
import javax.inject.Provider;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

/**
 * Login/Logout routine for OAuth2-based authentication.
 *
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/accounts")
public class Accounts {

    private final Provider<Request> requestProvider;
    private final AuthenticationProviderRegistry authenticationProviders;

    @Inject
    public Accounts(Provider<Request> requestProvider,
                    AuthenticationProviderRegistry authenticationProviders) {
        this.requestProvider = requestProvider;
        this.authenticationProviders = authenticationProviders;
    }

    @Path("/login")
    @GET
    public Response login(@Context ContainerRequest cr,
                          @Context UriInfo ui,
                          @QueryParam("provider") String providerKey) {
        if (providerKey == null) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }

        final AuthenticationProvider provider = authenticationProviders.lookup(providerKey);
        return Response.temporaryRedirect(
                URI.create(provider.oauthService(ui).getAuthorizationUrl())
        ).build();
    }

    @Path("/logout")
    @GET
    public Response logout(@Context UriInfo ui) {
        requestProvider.get().getSession().setValid(false);
        return Workspace.redirectToHomepage(ui);
    }

    @Path("/oauth-callback/{provider}")
    @GET
    public Response oauthCallback(@PathParam("provider") String provider,
                                  @QueryParam("code") String code,
                                  @Context UriInfo ui) {
        final Session session = requestProvider.get().getSession();
        session.setAttribute(User.class.getName(), authenticationProviders.lookup(provider).user(ui, code));
        return Workspace.redirectToHomepage(ui);
    }
}
