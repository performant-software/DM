package edu.drew.dm;

import javax.ws.rs.core.SecurityContext;
import java.security.Principal;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class User implements SecurityContext, Principal {

    private final String account;
    private final String firstName;
    private final String lastName;
    private final String email;

    public User(String account) {
        this(account, "Joe", "Doe", "te@st.com");
    }

    public User(String account, String firstName, String lastName, String email) {
        this.account = account;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
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

    @Override
    public Principal getUserPrincipal() {
        return this;
    }

    public boolean isSuperuser() {
        return isUserInRole("ADMIN");
    }

    @Override
    public boolean isUserInRole(String role) {
        return true;
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
}
