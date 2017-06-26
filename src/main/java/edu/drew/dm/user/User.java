package edu.drew.dm.user;

import edu.drew.dm.Logging;
import edu.drew.dm.data.SemanticDatabase;
import org.apache.jena.rdf.listeners.StatementListener;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;
import org.glassfish.grizzly.http.server.Request;

import java.net.URI;
import java.net.URISyntaxException;
import java.security.Principal;
import java.util.Optional;
import javax.ws.rs.core.SecurityContext;

import static edu.drew.dm.user.EmailAddress.mbox;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class User implements SecurityContext, Principal {

    public static final URI GUEST_URI = uri("dm", "guest");

    public static final User GUEST = new User(GUEST_URI, "Guest", "guest@dm.local");

    public final URI uri;
    public final String displayName;
    public final String[] emailAddresses;


    public User(URI uri, String displayName, String... emailAddresses) {
        this.uri = uri;
        this.displayName = displayName;
        this.emailAddresses = new String[emailAddresses.length];
        for (int ec = 0, el = emailAddresses.length; ec < el; ec++) {
            this.emailAddresses[ec] = EmailAddress.normalize(emailAddresses[ec]);
        }
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
        return emailAddresses.length == 0 ? null : emailAddresses[0];
    }

    public static URI uri(String realm, String id) {
        try {
            return new URI("user", String.join(":", realm, id), null);
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    public SemanticDatabase updateIn(SemanticDatabase db) {
        return db.write(model -> {
            updateIn(model);
            return db;
        });
    }

    public Model updateIn(Model model) {
        final Resource resource = model.createResource(uri.toString());

        resource.removeAll(RDFS.label);
        resource.removeAll(FOAF.name);
        resource.removeAll(FOAF.mbox);

        resource.addProperty(RDF.type, FOAF.Agent)
                .addProperty(RDFS.label, getName())
                .addProperty(FOAF.name, getDisplayName());

        for (String emailAddress : emailAddresses) {
            resource.addProperty(FOAF.mbox, model.createResource(mbox(emailAddress)));
        }

        return new UserDataMigration(this).execute(model);
    }

    public static User get(Request request) {
        return Optional.ofNullable(request.getSession(false))
                .map(session -> (User) session.getAttribute(User.class.getName()))
                .orElse(null);
    }

    public static void set(Request request, User user) {
        request.getSession().setAttribute(User.class.getName(), user);
    }

    public static void remove(Request request) {
        Optional.ofNullable(request.getSession(false))
                .ifPresent(session -> session.removeAttribute(User.class.getName()));
    }
}
