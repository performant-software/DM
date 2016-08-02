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
import java.io.IOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;
import java.util.function.Function;
import java.util.logging.Logger;
import java.util.stream.Stream;

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
    public Model update(@PathParam("uri") String uri, Model model, @Context UriInfo ui) {
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
    public JsonNode search(@PathParam("uri") String uri, @QueryParam("q") @DefaultValue("") String query, @Context UriInfo ui) throws Exception {

        final boolean singleWordQuery = query.matches("[A-Za-z0-9]+");

        final ObjectNode result = objectMapper.createObjectNode();

        final ArrayNode results = result.putArray("results");

        store.index().search(uri, singleWordQuery ? String.format("title:%s^10 OR text:%s", query, query) : query, 100, hit -> {

            results.addObject()
                    .put("uri", hit.uri)
                    .put("url", Texts.textResource(ui, uri, hit.uri))
                    .put("title", hit.title)
                    .put("highlighted_title", hit.titleHighlighted.isEmpty() ? hit.title : hit.titleHighlighted)
                    .put("text", hit.text)
                    .put("highlighted_text", hit.textHighlighted);
        });

        if (results.size() == 0 && singleWordQuery) {
            Stream.of(store.index().suggest(uri, query, 10)).findFirst().ifPresent(suggestion -> result.put("spelling_suggestion", suggestion));
        }

        return result;
    }

    @Path("/{uri}/search_autocomplete")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode autocomplete(@PathParam("uri") String uri, @QueryParam("q") @DefaultValue("") String prefix) throws IOException {
        return Stream.of(store.index().suggest(uri, prefix, 10))
                .collect(objectMapper::createArrayNode, ArrayNode::add, ArrayNode::addAll);
    }

    @Path("/{uri}/download.ttl")
    @GET
    public Model download(@PathParam("uri") String uri) {
        return store.read((source, target) -> traversal(source.createResource(uri), target, Projects::allNeighbors));
    }

    @Path("/{uri}/removed")
    @POST
    public Model cleanupLinks(@FormParam("uuids") String uuids) {
        Logger.getLogger(Projects.class.getName()).fine(() -> uuids);
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}/remove_triples")
    @PUT
    public Model deleteContents(@PathParam("uri") String uri, Model model, @Context UriInfo ui) {
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

    public static Model traversal(Resource root, Model target, Function<Resource, Stream<Resource>> adjacentNodes) {
        final Queue<Resource> frontier = new LinkedList<>(Collections.singleton(root));
        final Set<Resource> visited = new HashSet<>();
        while (!frontier.isEmpty()) {
            final Resource resource = frontier.remove();
            target.add(resource.listProperties());
            visited.add(resource);
            adjacentNodes.apply(resource).filter(r -> !visited.contains(r)).forEach(frontier::add);
        }
        return target;
    }

    public static Stream<Resource> annotationContext(Resource r) {
        final Model model = r.getModel();
        final Set<Resource> resourceTypes = model.listObjectsOfProperty(r, RDF.type).mapWith(RDFNode::asResource).toSet();

        if (resourceTypes.contains(SharedCanvas.Canvas) || resourceTypes.contains(DCTypes.Text)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasSource, r)
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r))
                    .andThen(model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, r))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.SpecificResource)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r)
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSelector).mapWith(RDFNode::asResource))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.Annotation)) {
            return r.listProperties(OpenAnnotation.hasTarget)
                    .andThen(r.listProperties(OpenAnnotation.hasBody))
                    .mapWith(Statement::getObject)
                    .mapWith(RDFNode::asResource)
                    .toSet().stream();
        }
        return Stream.empty();
    }

    public static Stream<Resource> resourceContext(Resource r) {
        final Model model = r.getModel();
        final Set<Resource> resourceTypes = model.listObjectsOfProperty(r, RDF.type).mapWith(RDFNode::asResource).toSet();

        if (resourceTypes.contains(OpenAnnotation.SpecificResource)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasBody, r)
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSource).mapWith(RDFNode::asResource))
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSelector).mapWith(RDFNode::asResource))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.Annotation)) {
            return r.listProperties(OpenAnnotation.hasTarget)
                    .mapWith(Statement::getObject)
                    .mapWith(RDFNode::asResource)
                    .toSet().stream();
        }
        return Stream.empty();
    }

    public static Stream<Resource> allNeighbors(Resource r) {
        final Model model = r.getModel();
        final Set<Resource> resourceTypes = model.listObjectsOfProperty(r, RDF.type).mapWith(RDFNode::asResource).toSet();

        if (resourceTypes.contains(DCTypes.Collection)) {
            return r.listProperties(OpenArchivesTerms.aggregates)
                    .mapWith(Statement::getObject).mapWith(RDFNode::asResource)
                    .andThen(model.listSubjectsWithProperty(Perm.hasPermissionOver, r))
                    .toSet()
                    .stream();
        }
        if (resourceTypes.contains(DCTypes.Image)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasBody, r).toSet().stream();
        }
        if (resourceTypes.contains(SharedCanvas.Canvas) || resourceTypes.contains(DCTypes.Text)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasSource, r)
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r))
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasBody, r))
                    .andThen(model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, r))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.SpecificResource)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r)
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasBody, r))
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSelector).mapWith(RDFNode::asResource))
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSource).mapWith(RDFNode::asResource))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.Annotation)) {
            return r.listProperties(OpenAnnotation.hasTarget)
                    .andThen(r.listProperties(OpenAnnotation.hasBody))
                    .mapWith(Statement::getObject)
                    .mapWith(RDFNode::asResource)
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.TextQuoteSelector) || resourceTypes.contains(OpenAnnotation.SvgSelector)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasSelector, r)
                    .toSet().stream();
        }
        return Stream.empty();
    }
}
