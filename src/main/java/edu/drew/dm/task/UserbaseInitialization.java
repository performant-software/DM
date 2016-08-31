package edu.drew.dm.task;

import au.com.bytecode.opencsv.CSVReader;
import edu.drew.dm.semantics.DigitalMappaemundi;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.http.User;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.semantics.Perm;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Set;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class UserbaseInitialization {

    public static SemanticDatabase initGuestAccess(SemanticDatabase db) {
        final Model guestModel = Models.create();

        guestModel.createResource(User.GUEST.uri())
                .addProperty(RDF.type, FOAF.Agent)
                .addProperty(RDFS.label, User.GUEST.account)
                .addProperty(FOAF.firstName, User.GUEST.firstName)
                .addProperty(FOAF.surname, User.GUEST.lastName)
                .addProperty(FOAF.mbox, guestModel.createResource(User.GUEST.mbox()));

        db.merge(guestModel);
        return db;
    }

    public static SemanticDatabase execute(SemanticDatabase db, CSVReader csv) {
        try {
            final User[] users = csv.readAll().stream()
                    .skip(1)
                    .map(user -> new User(
                            user[0],
                            user[1],
                            user[2],
                            user[3],
                            Boolean.parseBoolean(user[4]),
                            User.passwordHash(user[5])
                    ))
                    .filter(User::isGuest)
                    .toArray(User[]::new);

            final Set<Resource> projects = db.read((source, target) -> target.add(source.listStatements(null, RDF.type, DCTypes.Collection))).listSubjects().toSet();

            final Model userModel = Models.create();
            final Model passwordModel = Models.create();

            for (User user : users) {
                final Resource userResource = userModel.createResource(user.uri())
                        .addProperty(RDF.type, FOAF.Agent)
                        .addProperty(RDFS.label, user.account)
                        .addProperty(FOAF.firstName, user.firstName)
                        .addProperty(FOAF.surname, user.lastName)
                        .addProperty(FOAF.mbox, userModel.createResource(user.mbox()));

                passwordModel.createResource(user.uri())
                        .addProperty(DigitalMappaemundi.password, user.password);

                for (Resource project : projects) {
                    for (Property permission : Perm.USER_PERMISSIONS) {
                        userResource.addProperty(permission, project);
                    }
                    if (user.admin) {
                        for (Property permission : Perm.ADMIN_PERMISSIONS) {
                            userResource.addProperty(permission, project);
                        }

                    }
                }
            }

            db.merge(userModel);
            db.write(ds -> SemanticDatabase.merge(SemanticDatabase.passwords(ds), passwordModel));

            return db;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
