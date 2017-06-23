package edu.drew.dm;

import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.rdf.Annotations;
import edu.drew.dm.rdf.OpenAnnotation;
import edu.drew.dm.rdf.OpenArchivesTerms;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.UriInfo;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/projects/{projectUri}/texts")
public class TextResource {


    private final SemanticDatabase db;

    @Inject
    public TextResource(SemanticDatabase db) {
        this.db = db;
    }

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("projectUri") String projectUri, @PathParam("uri") String uri, @Context UriInfo ui) throws ParseException {
        return db.read((source, target) -> Annotations.SCOPE.copy(source.createResource(uri), target));
    }

    @Path("/{uri}/specific_resource/{resourceUri}")
    @GET
    public Model readSpecificResource(@PathParam("projectUri") String projectUri, @PathParam("uri") String textUri, @PathParam("resourceUri") String resourceUri, @Context UriInfo ui) throws ParseException {
        return db.read((source, target) -> Annotations.SPECIFIC_RESOURCE_SCOPE.copy(source.createResource(resourceUri), target));
    }

    @Path("/{uri}")
    @POST
    public Model create(@PathParam("projectUri") String project, @PathParam("uri") String text, Model model, @Context UriInfo ui) throws ParseException {
        return db.merge(model);
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("projectUri") String project, @PathParam("uri") String text, Model model, @Context UriInfo ui) throws ParseException {
        return db.merge(model);
    }

    public static Model externalize(Model model, UriInfo ui) {
        model.listSubjectsWithProperty(RDF.type, DCTypes.Text).forEachRemaining(text -> {
            model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, text).forEachRemaining(project -> {
                model.add(
                        text,
                        OpenArchivesTerms.isDescribedBy,
                        model.createResource(textResource(ui, project.getURI(), text.getURI()))
                );
                model.listSubjectsWithProperty(RDF.type, OpenAnnotation.SpecificResource).forEachRemaining(sr -> {
                    model.add(
                            sr,
                            OpenArchivesTerms.isDescribedBy,
                            model.createResource(specificResource(ui, project.getURI(), text.getURI(), sr.getURI()))
                    );
                });
            });
        });
        return model;
    }

    public static String textResource(UriInfo ui, String projectUri, String uri) {
        return Server.baseUri(ui)
                .path(TextResource.class)
                .path(TextResource.class, "read")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", uri)
                .build().toString();
    }

    private static String specificResource(UriInfo ui, String projectUri, String textUri, String resourceUri) {
        return Server.baseUri(ui)
                .path(TextResource.class)
                .path(TextResource.class, "readSpecificResource")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", textUri)
                .resolveTemplate("resourceUri", resourceUri)
                .build().toString();
    }
}
