package edu.drew.dm.task;

import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.http.User;
import edu.drew.dm.semantics.Models;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class UserbaseInitialization {

    public static SemanticDatabase initGuestAccess(SemanticDatabase db) {
        final Model guestModel = Models.create();

        final User g = User.GUEST;
        guestModel.createResource(g.uri.toString())
                .addProperty(RDF.type, FOAF.Agent)
                .addProperty(RDFS.label, g.getName())
                .addProperty(FOAF.name, g.getDisplayName())
                .addProperty(FOAF.mbox, guestModel.createResource(User.mbox(g.getEmailAddress())));

        db.merge(guestModel);
        return db;
    }

}
