package edu.drew.dm.user;

import com.typesafe.config.Config;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import edu.drew.dm.Server;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.rdf.Models;
import edu.drew.dm.rdf.OpenArchivesTerms;
import edu.drew.dm.rdf.Perm;
import edu.drew.dm.Configuration;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.net.URI;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Arrays;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/users")
public class UserResource {

    private final SemanticDatabase store;
    private final ObjectMapper objectMapper;
    private final UserAuthorization authorization;
    private final Config config;

    @Inject
    public UserResource(SemanticDatabase db, ObjectMapper objectMapper, UserAuthorization authorization) {
        this.store = db;
        this.objectMapper = objectMapper;
        this.authorization = authorization;
        this.config = Configuration.application();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public synchronized JsonNode list(@Context UriInfo ui) {
        return store.read(model -> {
            final ArrayNode users = objectMapper.createArrayNode();
            model.listSubjectsWithProperty(RDF.type, FOAF.Agent)
                    .mapWith(User::new)
                    .forEachRemaining(user -> {
                        for (String emailAddress : user.emailAddresses) {
                            users.addObject()
                                    .put("id", user.getName())
                                    .put("uri", userResource(ui, user.uri))
                                    .put("name", user.getDisplayName())
                                    .put("email", emailAddress);
                        }
                    });
            return users;
        });
    }


    @Path("/{user}")
    @GET
    public Model read(@PathParam("user") String user, @Context UriInfo ui) {
        return store.read((source, target) -> {
            source.listSubjectsWithProperty(RDFS.label, user)
                    .filterKeep(subject -> subject.hasProperty(RDF.type, FOAF.Agent))
                    .forEachRemaining(agent -> {
                        target.add(agent.listProperties());

                        agent.getModel().listObjectsOfProperty(agent, Perm.hasPermissionOver)
                                .mapWith(RDFNode::asResource)
                                .filterDrop(subject -> Arrays.asList(config.getString("hide.uris").split(",")).contains(subject.getURI()))
                                .filterKeep(subject -> subject.hasProperty(RDF.type, DCTypes.Collection))
                                .forEachRemaining(project -> target.add(project.listProperties()));
                    });
        });
    }

    @Path("/superuser")
    @GET
    public String superuser() {
        return config.getString("superuser.id");
    }

    public static Model externalize(Model model, UriInfo ui) {
        model.listSubjectsWithProperty(RDF.type, FOAF.Agent).forEachRemaining(agent -> {
            model.add(
                    agent,
                    OpenArchivesTerms.isDescribedBy,
                    model.createResource(userResource(ui, URI.create(agent.getURI())))
            );
        });
        return Models.renameResources(model, (r -> {
            final String uri = r.getURI();
            final URI parsed = URI.create(uri);
            return "user".equals(parsed.getScheme()) ? userResource(ui, parsed) : uri;
        }));
    }

    public static String internalize(Resource resource) {
        final String uri = resource.getURI();
        final Matcher userMatcher = USER_URI.matcher(uri);
        return userMatcher.find()
                ? User.uri(userMatcher.group(1), userMatcher.group(2)).toString()
                : uri;
    }

    private static final Pattern USER_URI = Pattern.compile("/store/users/([^:]+):(.+)$");

    public static String userResource(UriInfo ui, URI user) {
        return Server.baseUri(ui)
                .path(UserResource.class)
                .path(UserResource.class, "read")
                .resolveTemplate("user", user.getSchemeSpecificPart())
                .build().toString();
    }
}
