package edu.drew.dm.user;

import edu.drew.dm.Server;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.rdf.Models;
import edu.drew.dm.rdf.OpenArchivesTerms;
import edu.drew.dm.rdf.Perm;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.net.URI;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.UriInfo;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/users")
public class UserResource {

    private final SemanticDatabase store;

    @Inject
    public UserResource(SemanticDatabase store) {
        this.store = store;
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
                                .filterKeep(subject -> subject.hasProperty(RDF.type, DCTypes.Collection))
                                .forEachRemaining(project -> target.add(project.listProperties()));
                    });
        });
    }

    @Path("/{user}")
    @PUT
    public Model update(@PathParam("user") String user, Model model, @Context  UriInfo ui) throws ParseException {
        return store.merge(model);
    }

    @Path("/{uri}/remove_triples")
    @PUT
    public Model remove(@PathParam("uri") String uri, Model model, @Context UriInfo ui) {
        return store.remove(model);
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

    private static String userResource(UriInfo ui, URI user) {
        return Server.baseUri(ui)
                .path(UserResource.class)
                .path(UserResource.class, "read")
                .resolveTemplate("user", user.getSchemeSpecificPart())
                .build().toString();
    }


}
