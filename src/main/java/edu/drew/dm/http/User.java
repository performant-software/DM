package edu.drew.dm.http;

import java.net.URI;
import java.net.URISyntaxException;
import java.security.Principal;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import javax.ws.rs.core.SecurityContext;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class User implements SecurityContext, Principal {

    public static final URI GUEST_URI = uri("dm", "guest");

    public static final User GUEST = new User(GUEST_URI, "Guest", "guest@dm.local");

    public final URI uri;
    public final String displayName;
    public final List<String> emailAddresses;


    public User(URI uri, String displayName, List<String> emailAddresses) {
        this.uri = uri;
        this.displayName = displayName;
        this.emailAddresses = emailAddresses;
    }
    public User(URI uri, String displayName, String emailAddress) {
        this(uri, displayName, Collections.singletonList(emailAddress));
    }

    public boolean isGuest() { return GUEST_URI.equals(uri); }

    @Override
    public Principal getUserPrincipal() {
        return this;
    }

    @Override
    public boolean isUserInRole(String role) {
        return false;
    }

    @Override
    public boolean isSecure() {
        return false;
    }

    @Override
    public String getAuthenticationScheme() {
        return FORM_AUTH;
    }

    @Override
    public String getName() {
        return uri.getSchemeSpecificPart();
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getEmailAddress() {
        final Iterator<String> it = emailAddresses.iterator();
        return (it.hasNext() ? it.next() : null);
    }

    public static URI uri(String realm, String id) {
        try {
            return new URI("user", String.join(":", realm, id), null);
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    public static String mbox(String email) {
        try {
            return new URI("mailto", email, null).toString();
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }
}
