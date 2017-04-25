package edu.drew.dm.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.apis.GoogleApi20;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth20Service;
import edu.drew.dm.Server;
import org.glassfish.grizzly.http.server.Request;
import org.glassfish.grizzly.http.server.Session;

import javax.inject.Inject;
import javax.inject.Provider;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.RedirectionException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import java.io.InputStream;
import java.net.URI;
import java.util.Optional;

import static java.lang.System.getenv;
import static java.util.Objects.requireNonNull;

/**
 * Login/Logout routine for HTTP-based authentication.
 *
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 *
 * @see <a href="http://www.berenddeboer.net/rest/authentication.html#permanent-logout">berenddeboer.net</a>
 * @see <a href="http://trac-hacks.org/wiki/TrueHttpLogoutPatch">trac-hacks.org</a>
 */
@Path("/accounts")
public class Accounts {

    private final Provider<Request> requestProvider;
    private final ObjectMapper objectMapper;

    @Inject
    public Accounts(Provider<Request> requestProvider, ObjectMapper objectMapper) {
        this.requestProvider = requestProvider;
        this.objectMapper = objectMapper;
    }

    @Path("/login")
    @GET
    public Response login(@Context UriInfo ui) {
        return Response.temporaryRedirect(Server.baseUri(ui).path(Workspace.class).build()).build();
    }

    @Path("/logout")
    @GET
    public Response logout(@Context UriInfo ui,
                           @QueryParam("ts")@DefaultValue("0") long timestamp,
                           @HeaderParam(HttpHeaders.USER_AGENT) String userAgent) {
        requestProvider.get().getSession().setValid(false);
        return Response.temporaryRedirect(Server.baseUri(ui).path(Workspace.class).build()).build();

    }

    @Path("/oauth/")
    @GET
    public Response oauth(@Context UriInfo ui) throws Exception {
        return Response.temporaryRedirect(URI.create(authService(ui).getAuthorizationUrl())).build();
    }

    @Path("/oauth-callback/")
    @GET
    public Response oauthCallback(@QueryParam("code") String code, @Context UriInfo ui) throws Exception {
        final OAuth20Service authService = authService(ui);
        final OAuth2AccessToken accessToken = authService.getAccessToken(code);

        final OAuthRequest profileRequest = new OAuthRequest(Verb.GET, "https://people.googleapis.com/v1/people/me");
        authService.signRequest(accessToken, profileRequest);

        try (InputStream profileStream = authService.execute(profileRequest).getStream()) {
            final JsonNode profile = objectMapper.readTree(profileStream);
            final JsonNode name = profile.path("names").path(0);

            final Session session = requestProvider.get().getSession();

            session.setAttribute(User.class.getName(), new User(
                    profile.path("nicknames").path(0).path("value").asText(),
                    name.path("givenName").asText(),
                    name.path("familyName").asText(),
                    "user@google.com",
                    false,
                    accessToken.getAccessToken()
            ));

            return Response.temporaryRedirect(Server.baseUri(ui).path(Workspace.class).build()).build();
        }
    }

    protected OAuth20Service authService(UriInfo ui) throws NoSuchMethodException {
        return new ServiceBuilder()
                .apiKey(requireNonNull(getenv("OAUTH_API_KEY")))
                .apiSecret(requireNonNull(getenv("OAUTH_API_SECRET")))
                .scope("profile")
                .callback(Server.baseUri(ui)
                        .path(getClass())
                        .path(getClass().getMethod("oauthCallback", String.class, UriInfo.class))
                        .build().toString())
                .build(GoogleApi20.instance());
    }
}
