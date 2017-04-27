package edu.drew.dm.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import edu.drew.dm.Logging;
import edu.drew.dm.Server;
import edu.drew.dm.data.Index;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.semantics.OpenAnnotation;
import edu.drew.dm.semantics.OpenArchivesTerms;
import edu.drew.dm.semantics.Perm;
import edu.drew.dm.semantics.SharedCanvas;
import edu.drew.dm.semantics.Traversal;
import edu.drew.dm.task.ProjectBundle;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.DC_11;
import org.apache.jena.vocabulary.RDF;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;
import java.util.regex.Pattern;
import java.util.stream.Stream;
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
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import javax.ws.rs.core.UriInfo;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/projects")
public class Projects {

    private final SemanticDatabase db;
    private final Index index;
    private final Images images;
    private final ObjectMapper objectMapper;

    @Inject
    public Projects(SemanticDatabase db, Index index, Images images, ObjectMapper objectMapper) {
        this.db = db;
        this.index = index;
        this.images = images;
        this.objectMapper = objectMapper;
    }

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("uri") String uri, @Context UriInfo ui) {
        return db.read((source, target) -> {
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
        return db.merge(model);
    }

    @Path("/{uri}")
    @DELETE
    public Model delete(@PathParam("uri") String uri) {
        final Model removed = db.write(ds -> {
            final Model model = ds.getDefaultModel();
            final Resource project = model.createResource(uri);
            final Model toRemove = SCOPE.copy(project, Models.create());

            model.listSubjectsWithProperty(RDF.type, FOAF.Agent)
                    .forEachRemaining(user -> user.listProperties()
                            .filterDrop(stmt -> project.equals(stmt.getObject()))
                            .forEachRemaining(toRemove::remove));

            SemanticDatabase.logged("-", toRemove);
            model.remove(toRemove);
            return toRemove;
        });

        final Set<Resource> orphanedImages = db.read(ds -> removed.listSubjectsWithProperty(RDF.type, DCTypes.Image).filterDrop(image -> ds.getDefaultModel().containsResource(image)).toSet());
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
        return objectMapper.createObjectNode().put("public", (boolean) db.read(ds ->
                ds.getDefaultModel().containsAll(publishedProject(uri))
        ));
    }

    @Path("/{uri}/share")
    @Produces(MediaType.APPLICATION_JSON)
    @POST
    public JsonNode share(@PathParam("uri") String uri) {
        db.merge(publishedProject(uri));
        return objectMapper.createObjectNode().put("success", true);
    }

    @Path("/{uri}/share")
    @Produces(MediaType.APPLICATION_JSON)
    @DELETE
    public JsonNode revokeShare(@PathParam("uri") String uri) {
        db.remove(publishedProject(uri));
        return objectMapper.createObjectNode().put("success", true);
    }

    private static Model publishedProject(String uri) {
        final Model model = Models.create();
        final Resource projectResource = model.createResource(uri);

        model.createResource(User.GUEST.uri())
                .addProperty(Perm.hasPermissionOver, projectResource)
                .addProperty(Perm.mayRead, projectResource);

        return model;
    }

    @Path("/{uri}/search")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode search(@PathParam("uri") String uri, @QueryParam("q") @DefaultValue("") String query, @QueryParam("limit") @DefaultValue("2000") int limit, @Context UriInfo ui) throws Exception {
        final Index.Search search = index.search(uri, query, limit);
        final ObjectNode response = objectMapper.createObjectNode();

        Stream.of(search.results)
                .map(hit -> {
                    final String image = hit.image == null
                            ? null
                            : Images.imageResource(ui, hit.image);

                    final String url = image == null
                            ? Texts.textResource(ui, uri, hit.uri)
                            : Canvases.canvasResource(ui, uri, hit.uri);

                    return objectMapper.createObjectNode()
                            .put("uri", hit.uri)
                            .put("url", url)
                            .put("title", hit.title)
                            .put("highlighted_title", hit.titleHighlighted.isEmpty() ? hit.title : hit.titleHighlighted)
                            .put("text", hit.text)
                            .put("image", image)
                            .put("imageWidth", hit.imageWidth)
                            .put("imageHeight", hit.imageHeight )
                            .put("highlighted_text", hit.textHighlighted.isEmpty() ? hit.text : hit.textHighlighted);
                })
                .collect(() -> response.putArray("results"), ArrayNode::add, ArrayNode::addAll);

        // FIXME: spell checking is not project-scoped
        /*
        Optional.ofNullable(search.spellingSuggestion)
                .ifPresent(suggestion -> response.put("spelling_suggestion", suggestion));
        */

        return response;
    }

    @Path("/{uri}/search_autocomplete")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode autocomplete(@PathParam("uri") String uri, @QueryParam("q") @DefaultValue("") String prefix) throws IOException {
        return Stream.of(index.suggest(uri, prefix, 10))
                .collect(objectMapper::createArrayNode, ArrayNode::add, ArrayNode::addAll);
    }

    @Path("/{uri}/download")
    @GET
    public Response download(@PathParam("uri") String uri) {
        final Model project = db.read((source, target) -> SCOPE.copy(source.createResource(uri), target));

        final String title = Optional.ofNullable(project.createResource(uri).getProperty(DC_11.title))
                .map(label -> label.getLiteral().getString())
                .orElse(uri);

        project.listSubjectsWithProperty(RDF.type, FOAF.Agent)
                .forEachRemaining(agent -> project.remove(agent.listProperties()));

        final String escapedTitle = Pattern.compile("[^A-Za-z0-9]").matcher(title).replaceAll("_");

        return Response.ok()
                .type(new MediaType("application", "zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, String.format(
                        "attachment; filename=\"%s_%s.zip\"",
                        escapedTitle,
                        DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(LocalDateTime.now().truncatedTo(ChronoUnit.MINUTES))
                ))
                .entity((StreamingOutput) output -> ProjectBundle.write(images, project, output))
                .build();
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
        return db.remove(model);
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

    public static Traversal SCOPE = new Traversal()
            .configureType(
                    DCTypes.Collection,
                    Collections.singleton(Perm.hasPermissionOver),
                    Collections.singleton(OpenArchivesTerms.aggregates)
            )
            .configureType(
                    DCTypes.Image,
                    Collections.singleton(OpenAnnotation.hasBody),
                    Collections.emptySet()
            )
            .configureType(
                    SharedCanvas.Canvas,
                    Arrays.asList(OpenAnnotation.hasSource, OpenAnnotation.hasTarget, OpenAnnotation.hasBody, OpenArchivesTerms.aggregates),
                    Collections.emptySet()
            )
            .configureType(
                    DCTypes.Text,
                    Arrays.asList(OpenAnnotation.hasSource, OpenAnnotation.hasTarget, OpenAnnotation.hasBody, OpenArchivesTerms.aggregates),
                    Collections.emptySet()
            )
            .configureType(
                    OpenAnnotation.SpecificResource,
                    Arrays.asList(OpenAnnotation.hasTarget, OpenAnnotation.hasBody),
                    Arrays.asList(OpenAnnotation.hasSelector, OpenAnnotation.hasSource)
            )
            .configureType(
                    OpenAnnotation.Annotation,
                    Collections.emptySet(),
                    Arrays.asList(OpenAnnotation.hasTarget, OpenAnnotation.hasBody)
            )
            .configureType(
                    OpenAnnotation.TextQuoteSelector,
                    Collections.singleton(OpenAnnotation.hasSelector),
                    Collections.emptySet()
            )
            .configureType(
                    OpenAnnotation.SvgSelector,
                    Collections.singleton(OpenAnnotation.hasSelector),
                    Collections.emptySet()
            );

}
