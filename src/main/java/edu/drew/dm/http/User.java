package edu.drew.dm.http;

import javax.ws.rs.core.SecurityContext;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.Principal;
import java.util.Base64;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class User implements SecurityContext, Principal {

    public static final User GUEST = new User("guest", "Guest", "User", "guest@dm.local", false, "guest");

    public final String account;
    public final String firstName;
    public final String lastName;
    public final String email;
    public final boolean admin;
    public final String password;

    public User(String account, String firstName, String lastName, String email, boolean admin, String password) {
        this.account = account;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.admin = admin;
        this.password = password;
    }

    public String getAccount() {
        return account;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public boolean isAdmin() {
        return admin;
    }

    public boolean isGuest() { return "guest".equals(account); }

    public String uri() {
        return uri(account);
    }

    public String mbox() {
        return mbox(email);
    }

    @Override
    public Principal getUserPrincipal() {
        return this;
    }

    public boolean isSuperuser() {
        return isUserInRole("admin");
    }

    @Override
    public boolean isUserInRole(String role) {
        return admin && "admin".equalsIgnoreCase(role);
    }

    @Override
    public boolean isSecure() {
        return false;
    }

    @Override
    public String getAuthenticationScheme() {
        return BASIC_AUTH;
    }

    @Override
    public String getName() {
        return account;
    }

    public static String uri(String name) {
        try {
            return new URI("user", name, null).toString();
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

    public static String passwordHash(String password) {
        try {

            final MessageDigest md = MessageDigest.getInstance("SHA-256");
            final byte[] digest = md.digest(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
