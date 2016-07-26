package edu.drew.dm;

import javax.ws.rs.core.SecurityContext;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.Principal;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class User implements SecurityContext, Principal {

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

}
