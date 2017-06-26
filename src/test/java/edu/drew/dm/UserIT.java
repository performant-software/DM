package edu.drew.dm;

import edu.drew.dm.rdf.Models;
import edu.drew.dm.user.User;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DC;
import org.apache.jena.vocabulary.RDF;
import org.junit.Test;

import static edu.drew.dm.user.UserDataMigration.ensureRealm;
import static edu.drew.dm.user.UserDataMigration.migrateNamingSchema;
import static edu.drew.dm.user.UserDataMigration.normalizeEmailAddresses;

public class UserIT extends BaseIT {

    @Test
    public void readUsers() {
        ensureRealm(db);
        migrateNamingSchema(db);
        normalizeEmailAddresses(db);

        final User gremid = new User(
                User.uri("performant", "gregor.middell@pagina.gmbh"),
                "Gregor Middell",
                "gregor.middell@pagina.gmbh",
                "gregor@middell.net"
        );

        gremid.updateIn(db);

        log.info(() -> Models.n3(db.read((source, target) -> {
            source.listSubjectsWithProperty(RDF.type, FOAF.Agent).forEachRemaining(user -> {
                source.listStatements(null, null, user)
                        .andThen(source.listStatements(user, null, (RDFNode) null))
                        .filterDrop(stmt -> DC.creator.equals(stmt.getPredicate()))
                        .forEachRemaining(target::add);
            });
        })));
    }
}
