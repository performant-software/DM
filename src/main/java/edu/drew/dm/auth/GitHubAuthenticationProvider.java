package edu.drew.dm.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.apis.GitHubApi;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.typesafe.config.Config;
import edu.drew.dm.http.User;

import javax.ws.rs.core.UriInfo;

public class GitHubAuthenticationProvider implements AuthenticationProvider {

    private final Config config;
    private final ObjectMapper objectMapper;

    private OAuth20Service service;

    public GitHubAuthenticationProvider(Config config, ObjectMapper objectMapper) {
        this.config = config;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getKey() {
        return "github";
    }

    @Override
    public String getDescription() {
        return "GitHub";
    }

    @Override
    public Config config() {
        return config;
    }

    @Override
    public ObjectMapper objectMapper() {
        return objectMapper;
    }

    @Override
    public String profileUrl() {
        return "https://api.github.com/user";
    }

    @Override
    public User parseProfile(JsonNode profile) {
        return new User(
                User.uri(getKey(), profile.path("login").asText()),
                profile.path("name").asText(),
                profile.path("email").asText()
        );
    }

    @Override
    public OAuth20Service oauthService(UriInfo ui) {
        if (service == null) {
            service = new ServiceBuilder()
                    .apiKey(config.getString("auth.oauth.github.key"))
                    .apiSecret(config.getString("auth.oauth.github.secret"))
                    .scope("user")
                    .callback(oauthCallbackUri(ui))
                    .build(GitHubApi.instance());
        }
        return service;
    }
}
