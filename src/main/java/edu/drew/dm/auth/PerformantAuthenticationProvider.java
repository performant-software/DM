package edu.drew.dm.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.builder.api.DefaultApi20;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.typesafe.config.Config;
import edu.drew.dm.http.User;

import javax.ws.rs.core.UriBuilder;
import javax.ws.rs.core.UriInfo;

public class PerformantAuthenticationProvider implements AuthenticationProvider {

    private final Config config;
    private final String baseUri;
    private final ObjectMapper objectMapper;

    private OAuth20Service service;

    public PerformantAuthenticationProvider(Config config, ObjectMapper objectMapper) {
        this.config = config;
        this.baseUri = config.hasPath("auth.oauth.performant.uri")
                ? config.getString("auth.oauth.performant.uri")
                : "";
        this.objectMapper = objectMapper;
    }

    @Override
    public String getKey() {
        return "performant";
    }

    @Override
    public String getDescription() {
        return "Performant Software";
    }

    @Override
    public Config config() {
        return config;
    }

    @Override
    public OAuth20Service oauthService(UriInfo ui) {
        if (service == null) {
            service = new ServiceBuilder()
                    .apiKey(config.getString("auth.oauth.performant.key"))
                    .apiSecret(config.getString("auth.oauth.performant.secret"))
                    .callback(oauthCallbackUri(ui))
                    .build(new DefaultApi20() {
                        @Override
                        public String getAccessTokenEndpoint() {
                            return UriBuilder.fromUri(baseUri).path("/oauth/token").build().toString();
                        }

                        @Override
                        protected String getAuthorizationBaseUrl() {
                            return UriBuilder.fromUri(baseUri).path("/oauth/authorize").build().toString();
                        }
                    });
        }
        return service;
    }

    @Override
    public ObjectMapper objectMapper() {
        return objectMapper;
    }

    @Override
    public String profileUrl() {
        return UriBuilder.fromUri(this.baseUri).path("api/me.json").build().toString();
    }

    @Override
    public User parseProfile(JsonNode profile) {
        final JsonNode user = profile.path("user");
        final String email = user.path("email").asText();

        return new User(
                email,
                user.path("first_name").asText(),
                user.path("last_name").asText(),
                email,
                false,
                ""
        );
    }
}
