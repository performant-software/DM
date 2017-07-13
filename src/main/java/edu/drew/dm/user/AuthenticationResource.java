package edu.drew.dm.user;

import edu.drew.dm.Dashboard;
import edu.drew.dm.WorkspaceResource;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.user.auth.AuthenticationProvider;
import edu.drew.dm.user.auth.AuthenticationProviderRegistry;
import org.glassfish.grizzly.http.server.Request;
import org.glassfish.jersey.server.ContainerRequest;

import java.net.URI;
import java.util.Optional;
import javax.inject.Inject;
import javax.inject.Provider;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

/**
 * Login/Logout routine for OAuth2-based authentication.
 *
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/accounts")
public class AuthenticationResource {

    private final SemanticDatabase db;
    private final Dashboard dashboard;
    private final Provider<Request> requestProvider;
    private final AuthenticationProviderRegistry authenticationProviders;

    @Inject
    public AuthenticationResource(SemanticDatabase db,
                                  Dashboard dashboard,
                                  Provider<Request> requestProvider,
                                  AuthenticationProviderRegistry authenticationProviders) {
        this.db = db;
        this.dashboard = dashboard;
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
        final Request request = requestProvider.get();

        Optional.ofNullable(request.getSession(false))
                .ifPresent(session -> dashboard.removeCurrentProjects(session.getIdInternal()));

        User.remove(request);
        
        return WorkspaceResource.redirectTo(ui);
    }

    @Path("/oauth-callback/{provider}")
    @GET
    public Response oauthCallback(@PathParam("provider") String provider,
                                  @QueryParam("code") String code,
                                  @Context UriInfo ui) {
        final User user = authenticationProviders.lookup(provider).user(ui, code);

        user.updateIn(db);
        User.set(requestProvider.get(), user);

        return WorkspaceResource.redirectTo(ui);
    }
}
