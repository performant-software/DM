package edu.drew.dm.user.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.apis.GitHubApi;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.typesafe.config.Config;
import edu.drew.dm.user.User;

import javax.ws.rs.core.UriInfo;

public class GitHubAuthenticationProvider extends AuthenticationProvider {

    private OAuth20Service service;

    public GitHubAuthenticationProvider(Config config, ObjectMapper objectMapper) {
        super(config, objectMapper);
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
    public OAuth20Service oauthService(UriInfo ui) {
        if (service == null) {
            service = new ServiceBuilder()
                    .apiKey(config.getString("auth.oauth.github.key"))
                    .apiSecret(config.getString("auth.oauth.github.secret"))
                    .scope("user:email")
                    .callback(oauthCallbackUri(ui))
                    .build(GitHubApi.instance());
        }
        return service;
    }

    @Override
    protected String profileUrl() {
        return "https://api.github.com/user";
    }

    @Override
    protected User parseProfile(JsonNode profile) {
        final String login = profile.path("login").asText();
        final JsonNode name = profile.path("name");
        final JsonNode email = profile.path("email");

        return new User(
                User.uri(getKey(), login),
                name.isTextual() ? name.asText() : login,
                email.isTextual() ? email.asText() : String.format("%s@github.local", login)
        );
    }
}
