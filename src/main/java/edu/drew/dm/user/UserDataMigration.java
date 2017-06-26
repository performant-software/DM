package edu.drew.dm.user;

import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.rdf.Models;

import java.net.URI;

public class UserDataMigration {

    private final User user;

    public UserDataMigration(User user) {
        this.user = user;
    }

    public static void ensureRealm(SemanticDatabase db) {
        db.write((SemanticDatabase.Transaction<Void>) ds -> {
            Models.renameResources(ds.getDefaultModel(), r -> {
                final String uriStr = r.getURI();
                final URI uri = URI.create(uriStr);
                if (!"user".equals(uri.getScheme())) {
                    return uriStr;
                }
                final String name = uri.getSchemeSpecificPart();
                if (name.indexOf(":") > 0) {
                    return uriStr;
                }

                return User.uri("dm", name).toString();
            });
            return null;
        });

    }

}
