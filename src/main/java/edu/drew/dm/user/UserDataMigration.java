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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static edu.drew.dm.user.EmailAddress.mbox;
import static edu.drew.dm.user.EmailAddress.normalize;
import static edu.drew.dm.user.EmailAddress.parse;
import static edu.drew.dm.user.User.uri;

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

    public static SemanticDatabase ensureRealm(SemanticDatabase db) {
        return db.write(model -> {
            Models.renameResources(model, r -> {
                final String uriStr = r.getURI();
                final URI uri = URI.create(uriStr);
                if (!"user".equals(uri.getScheme())) {
                    return uriStr;
                }
                final String name = uri.getSchemeSpecificPart();
                if (name.indexOf(":") > 0) {
                    return uriStr;
                }

                return uri("dm", name).toString();
            });
            return db;
        });

    }

    public static SemanticDatabase removeGuestsLastOpenedProject(SemanticDatabase db) {
        return db.write(model -> {
            model.createResource(User.GUEST_URI.toString())
                    .removeAll(DigitalMappaemundi.lastOpenProject);
            return db;
        });
    }

    public static SemanticDatabase mergeAccounts(SemanticDatabase db) {
        final Map<String, String> accountMapping = new LinkedHashMap<>();
        accountMapping.put(
                uri("dm", "asmittman@csuchico.edu").toString(),
                uri("dm", "asamittman").toString()
        );
        accountMapping.put(
                uri("dm", "mfoys@drew.edu").toString(),
                uri("dm", "martin").toString()
        );
        accountMapping.put(
                uri("dm", "admin").toString(),
                uri("dm", "martin").toString()
        );
        accountMapping.put(
                uri("dm", "lou").toString(),
                uri("dm", "gregor").toString()
        );

        final Map<String, String> mboxMapping = new LinkedHashMap<>();
        mboxMapping.put(
                mbox("asmittman@mail.csuchico.edu"),
                mbox("asmittman@csuchico.edu")
        );

        return db.write(model -> {
            accountMapping.forEach((from, to) -> {
                final Resource fromResource = model.createResource(from);
                final Resource toResource = model.createResource(to);

                Perm.ALL_PROPERTIES.forEach(perm -> fromResource
                        .listProperties(perm)
                        .mapWith(Statement::getObject)
                        .toSet()
                        .forEach(project -> toResource.addProperty(perm, project)));

                fromResource.removeProperties();
            });

            mboxMapping.forEach((from, to) -> model
                    .listSubjectsWithProperty(FOAF.mbox, model.createResource(from))
                    .toSet()
                    .forEach(account -> {
                        account.removeAll(FOAF.mbox);
                        account.addProperty(FOAF.mbox, model.createResource(to));
                    })
            );
            return db;
        });
    }

    public static SemanticDatabase migrateNamingSchema(SemanticDatabase db) {
        return db.write(model -> {
            model.listSubjectsWithProperty(RDF.type, FOAF.Agent)
                    .filterKeep(user -> !user.hasProperty(FOAF.name))
                    .forEachRemaining(user -> {
                        final Property[] nameProperties = new Property[] {
                                FOAF.firstName,
                                FOAF.surname,
                                model.createProperty(FOAF.NS, "lastName")
                        };

                        final String name = Stream.of(nameProperties)
                                .map(p -> Optional.ofNullable(user.getProperty(p))
                                        .map(Statement::getString).orElse(""))
                                .map(String::trim)
                                .filter(nc -> !nc.isEmpty())
                                .collect(Collectors.joining(" "))
                                .trim();

                        final String schemedLabel = URI.create(user.getURI()).getSchemeSpecificPart();

                        user.removeAll(RDFS.label);
                        user.addProperty(RDFS.label, schemedLabel);

                        user.addProperty(
                                FOAF.name,
                                name.isEmpty() ? schemedLabel : name
                        );

                        for (Property nameProperty : nameProperties) {
                            user.removeAll(nameProperty);
                        }
                    });
            return db;
        });
    }

    public static SemanticDatabase normalizeEmailAddresses(SemanticDatabase db) {
        return db.write(model -> {
            final List<Statement> mboxStatements = model
                    .listStatements(null, FOAF.mbox, (RDFNode) null)
                    .toList();

            for (Statement stmt : mboxStatements) {
                stmt.changeObject(model.createResource(mbox(normalize(parse(
                        stmt.getResource().getURI()
                )))));
            }

            return db;
        });
    }

}
