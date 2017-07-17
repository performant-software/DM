package edu.drew.dm;

import com.typesafe.config.Config;
import edu.drew.dm.data.FileSystem;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.rdf.Perm;
import edu.drew.dm.user.User;
import org.apache.jena.rdf.model.ResIterator;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Optional;
import java.util.logging.Logger;

public class AdminUserCreation {

    public static void main(String[] args) throws IOException {
        Configuration.logging();

        final Logger log = Configuration.logger(AdminUserCreation.class);
        final Config config = Configuration.application();

        final ArrayDeque<String> argDeque = new ArrayDeque<>(Arrays.asList(args));
        final String name = requiredArg(argDeque, args);
        final String displayName = requiredArg(argDeque, args);
        final String emailAddress = requiredArg(argDeque, args);

        try (SemanticDatabase db = new SemanticDatabase(new FileSystem(config))) {
            db.write(model -> {
                final URI userUri = User.uri("dm", name);
                new User(userUri, displayName, emailAddress).updateIn(model);

                final Resource user = model.createResource(userUri.toString());
                final ResIterator projects = model.listSubjectsWithProperty(
                        RDF.type, DCTypes.Collection
                );

                projects.forEachRemaining(project -> Perm.ALL_PROPERTIES.forEach(perm -> {
                    log.info(() -> String.format("[%s] [%s] [%s]", user, perm, project));
                    user.addProperty(perm, project);
                }));
                return db;
            });
        }
    }

    private static String requiredArg(ArrayDeque<String> deque, String[] args) {
        final String arg = deque.poll();
        if (arg == null) {
            System.err.println(String.join("\n",
                    "Usage: $ARG0 <userName> <userDisplayName> <userEmail>",
                    "",
                    "e.g. $ARG0 john 'John Doe' john@domain.local",
                    ""
            ));
            throw new IllegalArgumentException(Arrays.toString(args));
        }
        return arg;
    }
}
