package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenAnnotation;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import edu.drew.dm.vocabulary.SharedCanvas;
import org.apache.jena.arq.querybuilder.SelectBuilder;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
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

    public static Model model(Model model, SemanticStore store, String uri) throws ParseException {
        return model(model, store, uri, null);
    }

    public static Model model(Model model, SemanticStore store, String projectUri, String canvasUri) throws ParseException {
        final SelectBuilder canvasQuery = Sparql.selectTriples()
                .addWhere(projectUri, OpenArchivesTerms.aggregates, "?canvas")
                .addWhere("?s", OpenAnnotation.hasTarget, "?canvas");

        final SelectBuilder imageQuery = Sparql.selectTriples()
                .addWhere("?s", RDF.type, "?imageType")
                .addWhere("?imageAnnotation", OpenAnnotation.hasTarget, "?canvas")
                .addWhere("?imageAnnotation", OpenAnnotation.hasBody, "?s")
                .addWhere(projectUri, OpenArchivesTerms.aggregates, "?canvas")
                .addFilter(Sparql.propertyFilter("?imageType", "dcmitype:Image", "dms:Image", "dms:ImageChoice"));

        if (canvasUri != null) {
            final String filterUri = "<" + canvasUri.toString() + ">";
            store.query(
                    Sparql.selectTriples()
                        .addWhere("?s", RDF.type, SharedCanvas.Canvas)
                        .addFilter("?s = " + filterUri)
                    .build(),
                    Sparql.resultSetInto(model)
            );
            canvasQuery.addFilter("?canvas = " + filterUri);
            imageQuery.addFilter("?canvas = " + filterUri);
        }

        store.query(canvasQuery.build(), Sparql.resultSetInto(model));
        store.query(imageQuery.build(), Sparql.resultSetInto(model));

        return model;
    }
}
