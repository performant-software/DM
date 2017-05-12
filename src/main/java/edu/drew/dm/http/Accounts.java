package edu.drew.dm.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.apis.GoogleApi20;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.builder.api.DefaultApi20;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.typesafe.config.Config;
import edu.drew.dm.Server;
import org.glassfish.grizzly.http.server.Request;
import org.glassfish.jersey.server.ContainerRequest;
import org.glassfish.jersey.server.mvc.Template;

import java.net.URI;
import java.util.Map;
import java.util.stream.Stream;
import javax.inject.Inject;
import javax.inject.Provider;
import javax.ws.rs.BadRequestException;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriBuilder;
import javax.ws.rs.core.UriInfo;

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
    private final Config config;
    private final ObjectMapper objectMapper;

    @Inject
    public Accounts(Provider<Request> requestProvider, Config config, ObjectMapper objectMapper) {
        this.requestProvider = requestProvider;
        this.config = config;
        this.objectMapper = objectMapper;
    }

    @Path("/login")
    @Produces("text/html")
    @Template(name = "/login.ftl")
    @GET
    public Map<String, Object> login(@Context ContainerRequest cr, @Context UriInfo ui, @QueryParam("provider") String provider) {
        if (provider != null) {
            throw new WebApplicationException(Response.temporaryRedirect(
                    URI.create(authenticationService(provider, ui).getAuthorizationUrl())
            ).build());
        }

        final Map<String, Object> model = Templates.model(cr);
        model.put("providers", availableAuthenticationServices());
        return model;
    }

    @Path("/logout")
    @GET
    public Response logout(@Context UriInfo ui,
                           @QueryParam("ts")@DefaultValue("0") long timestamp,
                           @HeaderParam(HttpHeaders.USER_AGENT) String userAgent) {
        requestProvider.get().getSession().setValid(false);
        return Workspace.redirectToHomepage(ui);

    }

    private String[] availableAuthenticationServices() {
        return Stream.of("google", "performant")
                .filter(this::authenticationServiceConfigured)
                .toArray(String[]::new);
    }

    private boolean authenticationServiceConfigured(String name) {
        final String configPathPrefix = String.join(".", "auth", "oauth", name);
        return config.hasPath(String.join(".", configPathPrefix, "key")) &&
                config.hasPath(String.join(".", configPathPrefix, "secret"));
    }

    private OAuth20Service authenticationService(String provider, UriInfo ui) {
        switch (provider) {
            case "google":
                if (authenticationServiceConfigured("google")) {
                    return new ServiceBuilder()
                            .apiKey(config.getString("auth.oauth.google.key"))
                            .apiSecret(config.getString("auth.oauth.google.secret"))
                            .scope("profile email")
                            .callback(oauthCallbackUri(provider, ui))
                            .build(GoogleApi20.instance());
                }
                break;
            case "performant":
                if (authenticationServiceConfigured("performant")) {
                    final UriBuilder baseUri = UriBuilder.fromUri(config.getString("auth.oauth.performant.uri"));
                    return new ServiceBuilder()
                            .apiKey(config.getString("auth.oauth.performant.key"))
                            .apiSecret(config.getString("auth.oauth.performant.secret"))
                            .callback(oauthCallbackUri(provider, ui))
                            .build(new DefaultApi20() {
                                @Override
                                public String getAccessTokenEndpoint() {
                                    return baseUri.path("oauth/token").build().toString();
                                }

                                @Override
                                protected String getAuthorizationBaseUrl() {
                                    return baseUri.path("/oauth/authorize").build().toString();
                                }
                            });
                }
                break;
        }
        throw new BadRequestException(provider);
    }

    @Path("/oauth-callback/{provider}")
    @GET
    public Response oauthCallback(@PathParam("provider") String provider, @QueryParam("code") String code, @Context UriInfo ui) throws Exception {
        final OAuth20Service authService = authenticationService(provider, ui);
        final OAuth2AccessToken accessToken = authService.getAccessToken(code);

        /*
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
                    profile.path("emailAddresses").path(0).path("value").asText(),
                    false,
                    accessToken.getAccessToken()
            ));
         }
         */
        
        return Workspace.redirectToHomepage(ui);
    }

    private String oauthCallbackUri(String provider, UriInfo ui) {
        try {
            return Server.baseUri(ui)
                    .path(getClass())
                    .path(getClass().getMethod("oauthCallback", String.class, String.class, UriInfo.class))
                    .build(provider).toString();
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        }
    }

}
