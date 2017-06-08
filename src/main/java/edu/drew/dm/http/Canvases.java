package edu.drew.dm.http;

import edu.drew.dm.Server;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.semantics.Exif;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.semantics.OpenAnnotation;
import edu.drew.dm.semantics.OpenArchivesTerms;
import edu.drew.dm.semantics.SharedCanvas;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.DC_11;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;

import java.awt.Dimension;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/projects/{projectUri}/canvases")
public class Canvases {

    private final SemanticDatabase store;
    private final Images images;

    @Inject
    public Canvases(SemanticDatabase store, Images images) {
        this.store = store;
        this.images = images;
    }

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("projectUri") String projectUri, @PathParam("uri") String uri, @Context UriInfo ui) {
        return store.read((source, target) -> Annotations.SCOPE.copy(source.createResource(uri), target));
    }

    @Path("/{uri}")
    @POST
    public Model create(@PathParam("projectUri") String project, @PathParam("uri") String canvas, Model model) {
        return store.merge(model);
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("projectUri") String project, @PathParam("uri") String canvas, Model model) {
        return store.merge(model);
    }

    @Path("/{uri}/specific_resource/{resourceUri}")
    @GET
    public Model readSpecificResource(@PathParam("projectUri") String projectUri, @PathParam("uri") String canvasUri, @PathParam("resourceUri") String resourceUri, @Context UriInfo ui) throws ParseException {
        return store.read((source, target) -> Annotations.SPECIFIC_RESOURCE_SCOPE.copy(source.createResource(resourceUri), target));
    }

    @Path("/create")
    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Model create(@PathParam("projectUri") String project,
                        @FormDataParam("title") @DefaultValue("") String title,
                        @FormDataParam("image_file") FormDataContentDisposition imageFileMetadata,
                        @FormDataParam("image_file") InputStream imageFileContents,
                        @Context UriInfo ui) throws IOException {

        final File imageFile = images.create(imageFileMetadata.getFileName(), imageFileContents);
        final Dimension imageDimension = Images.dimension(imageFile);

        final Model model = Models.create();

        final Resource canvas = Models.uuid(model)
                .addProperty(RDF.type, SharedCanvas.Canvas);

        if (!title.isEmpty()) {
            canvas.addProperty(RDFS.label, title)
                    .addProperty(DC_11.title, title)
                    .addProperty(Exif.width, model.createTypedLiteral(imageDimension.getWidth()))
                    .addProperty(Exif.height, model.createTypedLiteral(imageDimension.getHeight()));
        }

        final Resource image = model.createResource(Images.imageUri(imageFile.getName()))
                .addProperty(RDF.type, DCTypes.Image)
                .addProperty(Exif.width, model.createTypedLiteral(imageDimension.getWidth()))
                .addProperty(Exif.height, model.createTypedLiteral(imageDimension.getHeight()));

        Models.uuid(model)
                .addProperty(RDF.type, OpenAnnotation.Annotation)
                .addProperty(OpenAnnotation.motivatedBy, SharedCanvas.painting)
                .addProperty(OpenAnnotation.hasBody, image)
                .addProperty(OpenAnnotation.hasTarget, canvas);

        model.createResource(project)
                .addProperty(OpenArchivesTerms.aggregates, canvas);

        return store.merge(model);
    }

    public static Model externalize(Model model, UriInfo ui) {
        model.listSubjectsWithProperty(RDF.type, SharedCanvas.Canvas).forEachRemaining(canvas -> {
            model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, canvas).forEachRemaining(project -> {
                model.add(
                        canvas,
                        OpenArchivesTerms.isDescribedBy,
                        model.createResource(canvasResource(ui, project.getURI(), canvas.getURI()))
                );

                model.listSubjectsWithProperty(RDF.type, OpenAnnotation.SpecificResource).forEachRemaining(sr -> {
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

    public static String canvasResource(UriInfo ui, String projectUri, String uri) {
        return Server.baseUri(ui)
                .path(Canvases.class)
                .path(Canvases.class, "read")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", uri)
                .build().toString();
    }

    public static Model imageAnnotations(Resource canvas, Model target) {
        canvas.getModel().listSubjectsWithProperty(OpenAnnotation.hasTarget, canvas)
                .forEachRemaining(annotation -> {
                    target.add(annotation.listProperties());
                    final Resource body = annotation.getPropertyResourceValue(OpenAnnotation.hasBody);
                    if (DCTypes.Image.equals(body.getPropertyResourceValue(RDF.type))) {
                        target.add(body.listProperties());
                    }
                });
        return target;
    }
}
