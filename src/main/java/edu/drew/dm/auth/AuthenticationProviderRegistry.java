package edu.drew.dm.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.typesafe.config.Config;

import java.util.LinkedHashMap;
import java.util.Optional;

public class AuthenticationProviderRegistry extends LinkedHashMap<String, AuthenticationProvider> {

    public AuthenticationProviderRegistry(Config config, ObjectMapper objectMapper) {
        addIfConfigured(new GoogleAuthenticationProvider(config, objectMapper));
        addIfConfigured(new GitHubAuthenticationProvider(config, objectMapper));
        addIfConfigured(new PerformantAuthenticationProvider(config, objectMapper));
    }

    public AuthenticationProvider lookup(String provider) {
        return Optional.ofNullable(get(provider)).orElseThrow(IllegalArgumentException::new);
    }


    private void addIfConfigured(AuthenticationProvider provider) {
        if (provider.isConfigured()) {
            put(provider.getKey(), provider);
        }
    }
}
