package edu.drew.dm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import edu.drew.dm.vocabulary.OpenAnnotation;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import edu.drew.dm.vocabulary.Perm;
import edu.drew.dm.vocabulary.SharedCanvas;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import javax.inject.Inject;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;
import java.util.function.Predicate;
import java.util.logging.Logger;
import java.util.stream.IntStream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/projects")
public class Projects {

    private final SemanticStore store;
    private final ObjectMapper objectMapper;

    @Inject
    public Projects(SemanticStore store, ObjectMapper objectMapper) {
        this.store = store;
        this.objectMapper = objectMapper;
    }

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("uri") String uri, @Context UriInfo ui) {
        return store.read((source, target) -> {
            final Resource project = source.createResource(uri);

            target.add(project.listProperties());

            project.getModel().listSubjectsWithProperty(Perm.hasPermissionOver, project)
                    .forEachRemaining(agent -> target.add(agent.listProperties()));


            project.getModel().listObjectsOfProperty(project, OpenArchivesTerms.aggregates)
                    .mapWith(RDFNode::asResource)
                    .forEachRemaining(part -> {
                        target.add(part.listProperties());
                        if (part.hasProperty(RDF.type, SharedCanvas.Canvas)) {
                            Canvases.imageAnnotations(part, target);
                        }
                    });
        });
    }

    @POST
    public Model create(Model model) {
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("uri") String uri, Model model, @Context  UriInfo ui) {
        return store.merge(model);
    }

    @Path("/{uri}/cleanup")
    @Produces(MediaType.TEXT_PLAIN)
    @POST
    public String cleanup(@PathParam("uri") String uri) {
        return String.format("%d orphaned text removed, %d orphaned annotations removed.", 0, 0);
    }

    @Path("/{uri}/share")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode isShared(@PathParam("uri") String uri) {
        return objectMapper.createObjectNode().put("public", false);
    }

    @Path("/{uri}/share")
    @Produces(MediaType.APPLICATION_JSON)
    @POST
    public JsonNode share(@PathParam("uri") String uri) {
        return objectMapper.createObjectNode().put("success", false);
    }

    @Path("/{uri}/share")
    @Produces(MediaType.APPLICATION_JSON)
    @DELETE
    public JsonNode revokeShare(@PathParam("uri") String uri) {
        return objectMapper.createObjectNode().put("success", true);
    }

    @Path("/{uri}/search")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode search(@PathParam("uri") String uri, @QueryParam("q") @DefaultValue("") String query) {
        final ObjectNode result = objectMapper.createObjectNode();

        result.putArray("results")
                .addObject()
                .put("uri", "http://www.google.de/")
                .put("url", "http://www.google.de/")
                .put("title", "Google")
                .put("highlighted_title", "Google")
                .put("text", "Google")
                .put("highlighted_text", "Google");

        // optional, only in case of a suggestion
        result.put("spelling_suggestion", query);

        return result ;
    }

    @Path("/{uri}/search_autocomplete")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode autocomplete(@PathParam("uri") String uri, @QueryParam("q") @DefaultValue("") String prefix) {
        return IntStream.range(0, 10)
                .mapToObj(i -> String.format("%s_%02d", prefix, i))
                .collect(objectMapper::createArrayNode, ArrayNode::add, ArrayNode::addAll);
    }

    @Path("/{uri}/download.ttl")
    @GET
    public Model download(@PathParam("uri") String uri) {
        return store.read((source, target) -> {
            graph(source.createResource(uri), target, r -> false);
        });
    }

    @Path("/{uri}/removed")
    @POST
    public Model cleanupLinks(@FormParam("uuids") String uuids) {
        Logger.getLogger(Projects.class.getName()).fine(() -> uuids);
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}/remove_triples")
    @PUT
    public Model deleteContents(@PathParam("uri") String uri, Model model, @Context  UriInfo ui) {
        return store.remove(model);
    }

    @Path("/{uri}")
    @DELETE
    public Model delete(@PathParam("uri") String uri) {
        throw Server.NOT_IMPLEMENTED;
    }

    public static Model identifiers2Locators(Model model, UriInfo ui) {
        model.listSubjectsWithProperty(RDF.type, DCTypes.Collection).forEachRemaining(project -> {
            model.add(
                    project,
                    OpenArchivesTerms.isDescribedBy,
                    model.createResource(projectResource(ui, project.getURI()))
            );
        });
        return model;
    }

    private static String projectResource(UriInfo ui, String uri) {
        return Server.baseUri(ui)
                .path(Projects.class)
                .path(Projects.class, "read")
                .resolveTemplate("uri", uri)
                .build().toString();
    }

    public static Model graph(Resource root, Model target, Predicate<Resource> stopAt) {
        final Queue<Resource> frontier = new LinkedList<>(Collections.singleton(root));
        final Set<Resource> visited = new HashSet<>();
        while (!frontier.isEmpty()) {
            final Resource resource = frontier.remove();
            target.add(resource.listProperties());
            visited.add(resource);
            if (!stopAt.test(resource)) {
                frontier(resource).stream().filter(r -> !visited.contains(r) && !stopAt.test(r)).forEach(frontier::add);
            }
        }
        return target;
    }

    private static Set<Resource> frontier(Resource r) {
        final Model model = r.getModel();
        final Set<Resource> resourceTypes = model.listObjectsOfProperty(r, RDF.type).mapWith(RDFNode::asResource).toSet();
        if (resourceTypes.contains(FOAF.Agent)) {
            return Collections.emptySet();
        }
        if (resourceTypes.contains(DCTypes.Collection)) {
            return r.listProperties(OpenArchivesTerms.aggregates)
                    .mapWith(Statement::getObject).mapWith(RDFNode::asResource)
                    .andThen(model.listSubjectsWithProperty(Perm.hasPermissionOver, r))
                    .toSet();
        }
        if (resourceTypes.contains(DCTypes.Image)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasBody, r).toSet();
        }
        if (resourceTypes.contains(SharedCanvas.Canvas) || resourceTypes.contains(DCTypes.Text)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasSource, r)
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r))
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasBody, r))
                    .andThen(model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, r))
                    .toSet();
        }
        if (resourceTypes.contains(OpenAnnotation.SpecificResource)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r)
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasBody, r))
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSelector).mapWith(RDFNode::asResource))
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSource).mapWith(RDFNode::asResource))
                    .toSet();
        }
        if (resourceTypes.contains(OpenAnnotation.Annotation)) {
            return r.listProperties(OpenAnnotation.hasTarget)
                    .andThen(r.listProperties(OpenAnnotation.hasBody))
                    .mapWith(Statement::getObject)
                    .mapWith(RDFNode::asResource)
                    .toSet();
        }
        if (resourceTypes.contains(OpenAnnotation.TextQuoteSelector) || resourceTypes.contains(OpenAnnotation.SvgSelector)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasSelector, r)
                    .toSet();
        }
        return Collections.emptySet();
    }
}
