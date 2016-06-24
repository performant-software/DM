package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenAnnotation;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import edu.drew.dm.vocabulary.SharedCanvas;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

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
@Path("/store/projects/{projectUri}/canvases")
public class Canvases {

    private final SemanticStore store;

    @Inject
    public Canvases(SemanticStore store) {
        this.store = store;
    }

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("projectUri") String project, @PathParam("uri") String canvas, @Context UriInfo ui) throws ParseException {
        return Models.identifiers2Locators(Canvases.model(
                Annotations.graph(store, project, canvas),
                store,
                project,
                canvas
        ), ui);
    }

    @Path("/{uri}/specific_resource/{resourceUri}")
    @GET
    public Model readSpecificResource(@PathParam("projectUri") String project, @PathParam("uri") String canvas, @PathParam("resourceUri") String resourceUri, @Context UriInfo ui) throws ParseException {
        return Models.identifiers2Locators(Annotations.graph(store, project, resourceUri), ui);
    }

    @Path("/{uri}")
    @PUT
    public Model update() {
        throw Server.NOT_IMPLEMENTED;
    }

    public static Model identifiers2Locators(Model model, UriInfo ui) {
        model.listSubjectsWithProperty(RDF.type, SharedCanvas.Canvas).forEachRemaining(canvas -> {
            model.removeAll(canvas, OpenArchivesTerms.isDescribedBy, null);
            model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, canvas).forEachRemaining(project -> {
                model.add(
                        canvas,
                        OpenArchivesTerms.isDescribedBy,
                        model.createResource(canvasResource(ui, project.getURI(), canvas.getURI()))
                );

                model.listSubjectsWithProperty(RDF.type, OpenAnnotation.SpecificResource).forEachRemaining(sr -> {
                    model.removeAll(sr, OpenArchivesTerms.isDescribedBy, null);
                    model.add(
                            sr,
                            OpenArchivesTerms.isDescribedBy,
                            model.createResource(specificResource(ui, project.getURI(), canvas.getURI(), sr.getURI()))
                    );
                });
            });
        });
        return model;
    }

    private static String specificResource(UriInfo ui, String projectUri, String canvasUri, String resourceUri) {
        return Server.baseUri(ui)
                .path(Canvases.class)
                .path(Canvases.class, "readSpecificResource")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", canvasUri)
                .resolveTemplate("resourceUri", resourceUri)
                .build().toString();
    }

    private static String canvasResource(UriInfo ui, String projectUri, String uri) {
        return Server.baseUri(ui)
                .path(Canvases.class)
                .path(Canvases.class, "read")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", uri)
                .build().toString();
    }

    public static Model model(Model model, SemanticStore store, String uri) {
        return model(model, store, uri, null);
    }

    public static Model model(Model model, SemanticStore store, String projectUri, String canvasUri) {
        return store.read(ds  -> {
            ds.getDefaultModel().createResource(projectUri).listProperties(OpenArchivesTerms.aggregates)
                    .mapWith(stmt -> stmt.getObject().asResource())
                    .filterKeep(part -> part.hasProperty(RDF.type, SharedCanvas.Canvas))
                    .filterKeep(canvas -> canvasUri == null ? true : canvasUri.equals(canvas.getURI()))
                    .forEachRemaining(canvas -> {
                        model.add(canvas.listProperties());

                        canvas.getModel().listSubjectsWithProperty(OpenAnnotation.hasTarget, canvas)
                                .forEachRemaining(annotation -> {
                                    model.add(annotation.listProperties());
                                    final Resource body = annotation.getPropertyResourceValue(OpenAnnotation.hasBody);
                                    if (DCTypes.Image.equals(body.getPropertyResourceValue(RDF.type))) {
                                        model.add(body.listProperties());
                                    }
                                });
                    });
            return model;
        });
    }
}
