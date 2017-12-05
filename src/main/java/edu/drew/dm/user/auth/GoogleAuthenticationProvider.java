package edu.drew.dm.user.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.apis.GoogleApi20;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.typesafe.config.Config;
import edu.drew.dm.user.User;

import java.util.ArrayList;
import java.util.List;
import javax.ws.rs.core.UriInfo;

public class GoogleAuthenticationProvider extends AuthenticationProvider {

    private OAuth20Service service;

    public GoogleAuthenticationProvider(Config config, ObjectMapper objectMapper) {
        super(config, objectMapper);
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
    protected String profileUrl() {
        return "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses";
    }

    @Override
    protected User parseProfile(JsonNode profile) {
        final List<String> emailAddresses = new ArrayList<>();
        profile.path("emailAddresses").forEach(email -> emailAddresses.add(email.path("value").asText()));

        return new User(
                User.uri(getKey(), profile.path("resourceName").asText().replaceAll("/+", ":")),
                profile.path("names").path(0).path("displayName").asText(),
                emailAddresses.toArray(new String[emailAddresses.size()])
        );
    }
}
