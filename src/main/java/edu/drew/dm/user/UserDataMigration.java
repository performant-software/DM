package edu.drew.dm.user;

import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.rdf.DigitalMappaemundi;
import edu.drew.dm.rdf.Models;
import edu.drew.dm.rdf.Perm;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static edu.drew.dm.user.EmailAddress.mbox;
import static edu.drew.dm.user.EmailAddress.normalize;
import static edu.drew.dm.user.EmailAddress.parse;

public class UserDataMigration {

    private final User user;
    private final String userUri;

    public UserDataMigration(User user) {
        this.user = user;
        this.userUri = this.user.uri.toString();
    }

    public Model execute(Model model) {
        final Resource userRes = model.createResource(userUri);

        for (int ec = user.emailAddresses.length - 1; ec >= 0; ec--) {

            final Resource mailbox = model.createResource(mbox(user.emailAddresses[ec]));
            final List<Resource> otherSubjects = model.listSubjectsWithProperty(FOAF.mbox, mailbox)
                    .filterKeep(res -> res.hasProperty(RDF.type, FOAF.Agent))
                    .filterDrop(userRes::equals)
                    .toList();

            for (Resource otherSubject : otherSubjects) {
                final List<Statement> permissions = otherSubject.listProperties()
                        .filterKeep(stmt -> Perm.NS.equals(stmt.getPredicate().getNameSpace()))
                        .toList();

                for (Statement permission : permissions) {
                    model.add(
                            userRes,
                            permission.getPredicate(),
                            permission.getObject()
                    );
                }

                final Statement lastProject = otherSubject.getProperty(
                        DigitalMappaemundi.lastOpenProject
                );
                if (lastProject != null) {
                    userRes.removeAll(DigitalMappaemundi.lastOpenProject)
                            .addProperty(DigitalMappaemundi.lastOpenProject, lastProject.getResource());
                }

                otherSubject.removeProperties();

                for (Statement stmt : model.listStatements(null, null, otherSubject).toList()) {
                    stmt.changeObject(userRes);
                }

            }

        }
        return model;
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

    public static void migrateNamingSchema(SemanticDatabase db) {
        db.write((SemanticDatabase.Transaction<Void>) ds -> {
            ds.getDefaultModel().listSubjectsWithProperty(RDF.type, FOAF.Agent)
                    .filterKeep(user -> !user.hasProperty(FOAF.name))
                    .forEachRemaining(user -> {
                        final Property[] nameProperties = new Property[] {
                                FOAF.firstName,
                                FOAF.surname,
                                ds.getDefaultModel().createProperty(FOAF.NS, "lastName")
                        };

                        final String name = Stream.of(nameProperties)
                                .map(p -> Optional.ofNullable(user.getProperty(p))
                                        .map(Statement::getString).orElse(""))
                                .map(String::trim)
                                .filter(nc -> !nc.isEmpty())
                                .collect(Collectors.joining(" "))
                                .trim();

                        user.addProperty(
                                FOAF.name,
                                name.isEmpty()
                                        ? user.getRequiredProperty(RDFS.label).getString()
                                        : name
                        );

                        for (Property nameProperty : nameProperties) {
                            user.removeAll(nameProperty);
                        }
                    });
            return null;
        });
    }

    public static void normalizeEmailAddresses(SemanticDatabase db) {
        db.write((SemanticDatabase.Transaction<Void>) ds -> {
            final Model model = ds.getDefaultModel();

            final List<Statement> mboxStatements = model
                    .listStatements(null, FOAF.mbox, (RDFNode) null)
                    .toList();

            for (Statement stmt : mboxStatements) {
                stmt.changeObject(model.createResource(mbox(normalize(parse(
                        stmt.getResource().getURI()
                )))));
            }

            return null;
        });
    }

}
