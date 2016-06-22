package edu.drew.dm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import edu.drew.dm.vocabulary.Perm;
import org.apache.jena.graph.Node;
import org.apache.jena.graph.NodeFactory;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
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
    public Model read(@PathParam("uri") String uri, @Context UriInfo ui) throws ParseException {
        final Node projectUri = NodeFactory.createURI(uri);
        final Model projectDesc = Models.create();

        Projects.model(projectDesc, store, projectUri);

        store.query(
                Sparql.selectTriples()
                        .addWhere("?s", Perm.hasPermissionOver, projectUri)
                        .build(),
                Sparql.resultSetInto(projectDesc)
        );

        store.query(
                Sparql.selectTriples()
                        .addWhere(projectUri, OpenArchivesTerms.aggregates, "?s")
                        .addFilter(Sparql.basicProperties("?p"))
                        .build(),
                Sparql.resultSetInto(projectDesc)
        );

        Canvases.model(projectDesc, store, projectUri);

        return Models.identifiers2Locators(projectDesc, ui);
    }

    @POST
    public Model create(Model model) {
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("uri") String uri, Model model, @Context  UriInfo ui) {
        final Model generalizedModel = Models.locators2Identifiers(model);
        store.merge(generalizedModel, Collections.singleton(OpenArchivesTerms.aggregates));
        return Models.identifiers2Locators(generalizedModel, ui);
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

    @Path("/{uri}/removed")
    @POST
    public Model cleanupLinks(@FormParam("uuids") String uuids) {
        Logger.getLogger(Projects.class.getName()).fine(() -> uuids);
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}/remove_triples")
    @PUT
    public Model deleteContents(@PathParam("uri") String uri, Model model, @Context  UriInfo ui) {
        final Model generalizedModel = Models.locators2Identifiers(model);
        store.remove(generalizedModel);
        return Models.identifiers2Locators(generalizedModel, ui);
    }

    @Path("/{uri}")
    @DELETE
    public Model delete(@PathParam("uri") String uri) {
        throw Server.NOT_IMPLEMENTED;
    }

    public static Model model(Model model, SemanticStore store, Node projectUri) throws ParseException {
        return store.read(ds -> model.add(ds.getDefaultModel().createResource(projectUri.getURI()).listProperties()));
    }

    public static Model identifiers2Locators(Model model, UriInfo ui) {
        model.listSubjectsWithProperty(RDF.type, DCTypes.Collection).forEachRemaining(project -> {
            model.removeAll(
                    project,
                    OpenArchivesTerms.isDescribedBy,
                    null
            );
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
