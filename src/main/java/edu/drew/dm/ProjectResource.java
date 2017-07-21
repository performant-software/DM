package edu.drew.dm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import edu.drew.dm.data.Images;
import edu.drew.dm.data.Index;
import edu.drew.dm.data.ProjectBundle;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.data.TextIndexSuggestion;
import edu.drew.dm.data.TextSearch;
import edu.drew.dm.rdf.ModelReaderWriter;
import edu.drew.dm.rdf.Models;
import edu.drew.dm.rdf.OpenArchivesTerms;
import edu.drew.dm.rdf.Perm;
import edu.drew.dm.rdf.SharedCanvas;
import edu.drew.dm.rdf.TypeBasedTraversal;
import edu.drew.dm.user.EmailAddress;
import edu.drew.dm.user.UserAuthorization;
import edu.drew.dm.user.User;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.DC_11;
import org.apache.jena.vocabulary.RDF;
import org.glassfish.grizzly.http.server.Request;
import org.glassfish.grizzly.http.server.Session;

import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import javax.inject.Inject;
import javax.ws.rs.Consumes;
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
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.StreamingOutput;
import javax.ws.rs.core.UriInfo;

import static edu.drew.dm.data.SemanticDatabase.merge;
import static edu.drew.dm.user.UserResource.userResource;
import static java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME;
import static java.time.temporal.ChronoUnit.MINUTES;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/projects")
public class ProjectResource {

    private static final Logger LOG = Configuration.logger(ProjectResource.class);

    private final SemanticDatabase db;
    private final Index index;
    private final Images images;
    private final Dashboard dashboard;
    private final ObjectMapper objectMapper;
    private final UserAuthorization authorization;
    private final Request request;

    @Inject
    public ProjectResource(SemanticDatabase db,
                           Index index,
                           Images images,
                           Dashboard dashboard,
                           ObjectMapper objectMapper,
                           UserAuthorization authorization,
                           Request request) {
        this.db = db;
        this.index = index;
        this.images = images;
        this.dashboard = dashboard;
        this.objectMapper = objectMapper;
        this.authorization = authorization;
        this.request = request;
    }

    @Path("/dashboard")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public JsonNode readDashboard(@Context SecurityContext securityCtx, @Context UriInfo ui) {
        return db.read((SemanticDatabase.Transaction<JsonNode>) model -> {
            final ObjectNode currentProjects = objectMapper.createObjectNode();
            dashboard.currentProjects().forEach((id, openProject) -> {
                final URI user = openProject.user;
                final String userName = user.getSchemeSpecificPart();

                ObjectNode userNode = (ObjectNode) currentProjects.get(userName);
                if (userNode == null) {
                    final Resource userResource = model.getResource(user.toString());
                    userNode = currentProjects.putObject(userName)
                            .put("url", userResource(ui, user))
                            .put(
                                    "name",
                                    userResource.getRequiredProperty(FOAF.name).getString()
                            )
                            .put(
                                    "mail",
                                    EmailAddress.parse(userResource.getRequiredProperty(FOAF.mbox)
                                            .getResource().getURI())
                            );
                }

                userNode.withArray("projects").addObject()
                        .put("uri", openProject.project)
                        .put("url", projectResource(ui, openProject.project))
                        .put("session", id);
            });
            return currentProjects;
        });
    }

    @Path("/dashboard")
    @POST
    public Response changeDashboard(@FormParam("project") String uri) {
        final Session session = request.getSession(false);
        if (session != null) {
            dashboard.registerCurrentProject(
                    session.getIdInternal(),
                    Optional.ofNullable(User.get(request)).orElse(User.GUEST),
                    uri
            );
        }
        return Response.noContent().build();
    }
    
    @Path("/{uri}")
    @GET
    public Model read(@PathParam("uri") String uri, @Context UriInfo ui) {
        authorization.checkReadAccess(uri);

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
                            CanvasResource.imageAnnotations(part, target);
                        }
                    });

            TypeBasedTraversal.ofList(project).into(target);
        });
    }

    @POST
    public Model create(Model model) {
        LOG.info(() -> Models.n3(model));
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("uri") String uri, Model model, @Context UriInfo ui) {
        return db.merge(model);
    }

    @Path("/{uri}/synchronize")
    @PUT
    @Consumes("application/x-www-form-urlencoded")
    @Produces("application/json")
    public JsonNode synchronize(
            @PathParam("uri") String uri,
            @FormParam("update") String update,
            @FormParam("remove") String remove) {
        long start = System.currentTimeMillis();

        authorization.checkLogin();
        
        final Model updateModel = ModelReaderWriter.read(new StringReader(update), "TTL");
        final Model removalModel = ModelReaderWriter.read(new StringReader(remove), "TTL");

        LOG.fine(() -> Models.n3(updateModel));
        LOG.fine(() -> Models.n3(removalModel));

        db.write(target -> {
            merge(target, updateModel);
            target.remove(removalModel);
            return null;
        });

        return objectMapper.createObjectNode()
                .put("timeMs", System.currentTimeMillis() - start);
    }

    @Path("/{uri}")
    @DELETE
    public Model delete(@PathParam("uri") String uri) {
        authorization.checkAdminAccess(uri);

        final Model removed = db.write(model -> {
            final Resource project = model.createResource(uri);
            final Model toRemove = TypeBasedTraversal.ofProject(project).into(Models.create());

            model.listSubjectsWithProperty(RDF.type, FOAF.Agent)
                    .forEachRemaining(user -> user.listProperties()
                            .filterDrop(stmt -> project.equals(stmt.getObject()))
                            .forEachRemaining(toRemove::remove));

            model.remove(toRemove);
            return toRemove;
        });

        final Set<Resource> orphanedImages = db.read(source -> removed
                .listSubjectsWithProperty(RDF.type, DCTypes.Image)
                .filterDrop(source::containsResource)
                .toSet());
        orphanedImages.forEach(images::delete);

        return removed;
    }

    @Path("/{uri}/cleanup")
    @Produces(MediaType.TEXT_PLAIN)
    @POST
    public String cleanup(@PathParam("uri") String uri) {
        authorization.checkUpdateAccess(uri);
        return String.format("%d orphaned text removed, %d orphaned annotations removed.", 0, 0);
    }

    @Path("/{uri}/share")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode isShared(@PathParam("uri") String uri) {
        authorization.checkReadAccess(uri);
        return objectMapper.createObjectNode().put("public", (boolean) db.read(source ->
                source.containsAll(publishedProject(uri))
        ));
    }

    @Path("/{uri}/share")
    @Produces(MediaType.APPLICATION_JSON)
    @POST
    public JsonNode share(@PathParam("uri") String uri) {
        authorization.checkAdminAccess(uri);
        db.merge(publishedProject(uri));
        return objectMapper.createObjectNode().put("success", true);
    }

    @Path("/{uri}/share")
    @Produces(MediaType.APPLICATION_JSON)
    @DELETE
    public JsonNode revokeShare(@PathParam("uri") String uri) {
        authorization.checkAdminAccess(uri);
        db.remove(publishedProject(uri));
        return objectMapper.createObjectNode().put("success", true);
    }

    private static Model publishedProject(String uri) {
        final Model model = Models.create();
        final Resource projectResource = model.createResource(uri);

        model.createResource(User.GUEST.uri.toString())
                .addProperty(Perm.hasPermissionOver, projectResource)
                .addProperty(Perm.mayRead, projectResource);

        return model;
    }

    @Path("/{uri}/search")
    @Produces(MediaType.APPLICATION_JSON)
    @GET
    public JsonNode search(@PathParam("uri") String project, @QueryParam("q") @DefaultValue("") String query, @QueryParam("limit") @DefaultValue("2000") int limit, @Context UriInfo ui) throws Exception {
        authorization.checkReadAccess(project);

        final TextSearch search = TextSearch.execute(index, project, query, limit);
        final ObjectNode response = objectMapper.createObjectNode();

        Stream.of(search.results)
                .map(hit -> {
                    final String image = hit.image == null
                            ? null
                            : Images.imageResource(ui, hit.image);

                    final String url = image == null
                            ? TextResource.textResource(ui, project, hit.uri)
                            : CanvasResource.canvasResource(ui, project, hit.uri);

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
        authorization.checkReadAccess(uri);
        return TextIndexSuggestion.lookup(index, uri, prefix, 10).stream()
                .collect(objectMapper::createArrayNode, ArrayNode::add, ArrayNode::addAll);
    }

    @Path("/{uri}/download")
    @GET
    public Response download(@PathParam("uri") String uri) {
        authorization.checkReadAccess(uri);
        return Response.ok()
                .type(new MediaType("application", "zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, String.format(
                        "attachment; filename=\"%s_%s.zip\"",
                        SAFE_CHARS.matcher(title(uri)).replaceAll("_"),
                        ISO_LOCAL_DATE_TIME.format(LocalDateTime.now().truncatedTo(MINUTES))
                ))
                .entity((StreamingOutput) output -> {
                    try (ProjectBundle bundle = ProjectBundle.create(uri, db, images)) {
                        bundle.asZip(output);
                    } catch (Throwable t) {
                        Configuration.logger(ProjectResource.class).log(Level.WARNING, t, t::getMessage);
                    }
                })
                .build();
    }

    private String title(String uri) {
        return db.read(source -> Optional.ofNullable(source.createResource(uri).getProperty(DC_11.title))
                .map(Statement::getString).orElse(uri));
    }

    private static final Pattern SAFE_CHARS = Pattern.compile("[^A-Za-z0-9]");
    
    @Path("/{uri}/removed")
    @POST
    public Response cleanupLinks(@PathParam("uri") String uri, @FormParam("uuids") String uuids) {
        authorization.checkUpdateAccess(uri);
        Logger.getLogger(ProjectResource.class.getName()).fine(() -> uuids);
        return Response.noContent().build();
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
                .path(ProjectResource.class)
                .path(ProjectResource.class, "read")
                .resolveTemplate("uri", uri)
                .build().toString();
    }

}
