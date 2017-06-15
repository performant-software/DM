package edu.drew.dm.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.apis.GoogleApi20;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.typesafe.config.Config;
import edu.drew.dm.http.User;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import javax.ws.rs.core.UriInfo;

public class GoogleAuthenticationProvider implements AuthenticationProvider {

    private final Config config;
    private final ObjectMapper objectMapper;
    private OAuth20Service service;

    public GoogleAuthenticationProvider(Config config, ObjectMapper objectMapper) {
        this.config = config;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getKey() {
        return "google";
    }

    @Override
    public String getDescription() {
        return "Google";
    }

    @Override
    public Config config() {
        return config;
    }

    @Override
    public OAuth20Service oauthService(UriInfo ui) {
        if (service == null) {
            service = new ServiceBuilder()
                    .apiKey(config.getString("auth.oauth.google.key"))
                    .apiSecret(config.getString("auth.oauth.google.secret"))
                    .scope("profile email")
                    .callback(oauthCallbackUri(ui))
                    .build(GoogleApi20.instance());
        }
        return service;
    }

    @Override
    public ObjectMapper objectMapper() {
        return objectMapper;
    }

    @Override
    public String profileUrl() {
        return "https://people.googleapis.com/v1/people/me";
    }

    @Override
    public User parseProfile(JsonNode profile) {
        final List<String> emailAddresses = new ArrayList<>();
        profile.path("emailAddresses").forEach(email -> emailAddresses.add(email.path("value").asText()));

        return new User(
                User.uri(getKey(), profile.path("resourceName").asText().replaceAll("/+", ":")),
                profile.path("names").path(0).path("displayName").asText(),
                emailAddresses
        );
    }
}
