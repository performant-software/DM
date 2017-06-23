package edu.drew.dm.user.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.typesafe.config.Config;
import edu.drew.dm.Server;
import edu.drew.dm.user.AuthenticationResource;
import edu.drew.dm.user.User;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutionException;
import javax.ws.rs.core.UriInfo;

public abstract class AuthenticationProvider {

    protected final Config config;
    protected final ObjectMapper objectMapper;

    protected AuthenticationProvider(Config config, ObjectMapper objectMapper) {
        this.config = config;
        this.objectMapper = objectMapper;
    }

    public abstract String getKey();

    public abstract String getDescription();

    public abstract OAuth20Service oauthService(UriInfo ui);

    public boolean isConfigured() {
        final String configPathPrefix = String.join(".", "auth", "oauth", getKey());
        return config.hasPath(String.join(".", configPathPrefix, "key")) &&
                config.hasPath(String.join(".", configPathPrefix, "secret"));
    }


    public String oauthCallbackUri(UriInfo ui) {
        try {
            return Server.baseUri(ui)
                    .path(AuthenticationResource.class)
                    .path(AuthenticationResource.class.getMethod("oauthCallback", String.class, String.class, UriInfo.class))
                    .build(getKey()).toString();
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        }
    }

    public User user(UriInfo ui, String authCode) {
        try {
            final OAuth20Service authService = oauthService(ui);
            final OAuth2AccessToken accessToken = authService.getAccessToken(authCode);

            final OAuthRequest profileRequest = new OAuthRequest(Verb.GET, profileUrl());
            authService.signRequest(accessToken, profileRequest);

            try (InputStream profileStream = authService.execute(profileRequest).getStream()) {
                return parseProfile(objectMapper.readTree(profileStream));
            }
        } catch (IOException | InterruptedException | ExecutionException e) {
            throw new RuntimeException(e);
        }

    }

    protected abstract String profileUrl();

    protected abstract User parseProfile(JsonNode profile);
}
