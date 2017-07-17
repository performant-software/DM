package edu.drew.dm.user;

import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.rdf.Perm;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.glassfish.grizzly.http.server.Request;

import java.util.Optional;
import javax.inject.Inject;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;

public class UserAuthorization {

    private final SemanticDatabase db;
    private final Request request;

    @Inject
    public UserAuthorization(SemanticDatabase db, @Context  Request request) {
        this.db = db;
        this.request = request;
    }

    public void checkReadAccess(String projectUri) {
        checkAccess(projectUri, Perm.mayRead);
    }

    public void checkUpdateAccess(String projectUri) {
        checkAccess(projectUri, Perm.mayUpdate);
    }

    public void checkAdminAccess(String projectUri) {
        checkAccess(projectUri, Perm.mayAdminister);
    }

    public void checkAccess(String projectUri, Property permission) {
        final boolean hasAccess = db.read(model -> {
            final Resource project = model.createResource(projectUri);
            final Resource user = model.createResource(user().uri.toString());
            return user.hasProperty(permission, project);
        });

        if (!hasAccess) {
            throw new WebApplicationException(Response.Status.FORBIDDEN);
        }
    }

    public void checkLogin() {
        if (user().isGuest()) {
            throw new WebApplicationException(Response.Status.FORBIDDEN);
        }
    }

    public User user() {
        return Optional.ofNullable(User.get(request)).orElse(User.GUEST);
    }
}
