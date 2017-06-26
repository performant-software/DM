package edu.drew.dm.user;

import java.net.URI;
import java.net.URISyntaxException;

public class EmailAddress {

    public static String normalize(String email) {
        return email.toLowerCase();
    }

    public static String mbox(String email) {
        try {
            return new URI("mailto", email, null).toString();
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    public static String parse(String mbox) {
        final URI uri = URI.create(mbox);
        if (!"mailto".equals(uri.getScheme())) {
            throw new IllegalArgumentException(mbox);
        }
        return uri.getSchemeSpecificPart();
    }
}
