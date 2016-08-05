package edu.drew.dm.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import edu.drew.dm.Logging;
import edu.drew.dm.Server;
import edu.drew.dm.data.Images;
import edu.drew.dm.data.Index;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.semantics.OpenArchivesTerms;
import edu.drew.dm.semantics.Perm;
import edu.drew.dm.semantics.SharedCanvas;
import edu.drew.dm.semantics.Traversals;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
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
import java.io.IOException;
import java.util.Set;
import java.util.logging.Logger;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/projects")
public class Projects {

    private final SemanticDatabase store;
    private final Index index;
    private final Images images;
    private final ObjectMapper objectMapper;

    @Inject
    public Projects(SemanticDatabase store, Index index, Images images, ObjectMapper objectMapper) {
        this.store = store;
        this.index = index;
        this.images = images;
        this.objectMapper = objectMapper;
    }

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("uri") String uri, @Context UriInfo ui) {
        return store.read((source, target) -> {
            final Resource project = source.createResource(uri);

            target.add(project.listProperties());

            source.listSubjectsWithProperty(Perm.hasPermissionOver, project)
                    .forEachRemaining(agent -> target.add(agent.listProperties()));


            source.listObjectsOfProperty(project, OpenArchivesTerms.aggregates)
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
        Logging.inClass(getClass()).info(() -> Models.n3(model));
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("uri") String uri, Model model, @Context UriInfo ui) {
        return store.merge(model);
    }

    @Path("/{uri}")
    @DELETE
    public Model delete(@PathParam("uri") String uri) {
        final Model removed = store.write(ds -> {
            final Model model = ds.getDefaultModel();
            final Resource project = model.createResource(uri);
            final Model toRemove = Models.create().add(SemanticDatabase.traverse(Traversals::projectContext, project, Models.create()));

            model.listSubjectsWithProperty(RDF.type, FOAF.Agent)
                    .forEachRemaining(user -> user.listProperties()
                            .filterDrop(stmt -> project.equals(stmt.getObject()))
                            .forEachRemaining(toRemove::remove));

            model.remove(toRemove);
            return toRemove;
        });

        final Set<Resource> orphanedImages = store.read(ds -> removed.listSubjectsWithProperty(RDF.type, DCTypes.Image).filterDrop(image -> ds.getDefaultModel().containsResource(image)).toSet());
        orphanedImages.forEach(images::delete);

        return removed;
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

        index.search(uri, singleWordQuery ? String.format("title:%s^10 OR text:%s", query, query) : query, 100, hit -> {

            results.addObject()
                    .put("uri", hit.uri)
                    .put("url", Texts.textResource(ui, uri, hit.uri))
                    .put("title", hit.title)
                    .put("highlighted_title", hit.titleHighlighted.isEmpty() ? hit.title : hit.titleHighlighted)
                    .put("text", hit.text)
                    .put("highlighted_text", hit.textHighlighted);
        });

        if (results.size() == 0 && singleWordQuery) {
            Stream.of(index.suggest(uri, query, 10)).findFirst().ifPresent(suggestion -> result.put("spelling_suggestion", suggestion));
        }

        return result;
    }

    @Path("/{uri}/search_autocomplete")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode autocomplete(@PathParam("uri") String uri, @QueryParam("q") @DefaultValue("") String prefix) throws IOException {
        return Stream.of(index.suggest(uri, prefix, 10))
                .collect(objectMapper::createArrayNode, ArrayNode::add, ArrayNode::addAll);
    }

    @Path("/{uri}/download.ttl")
    @GET
    public Model download(@PathParam("uri") String uri) {
        return store.read((source, target) -> SemanticDatabase.traverse(Traversals::projectContext, source.createResource(uri), target));
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

    public static Model externalize(Model model, UriInfo ui) {
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

}
