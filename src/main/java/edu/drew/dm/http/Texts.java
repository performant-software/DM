package edu.drew.dm.http;

import edu.drew.dm.SemanticStore;
import edu.drew.dm.Server;
import edu.drew.dm.vocabulary.OpenAnnotation;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
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
public class Texts {


    private final SemanticStore store;

    @Inject
    public Texts(SemanticStore store) {
        this.store = store;
    }

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("projectUri") String projectUri, @PathParam("uri") String uri, @Context UriInfo ui) throws ParseException {
        return store.read((source, target) -> {

            final Resource project = source.createResource(projectUri);
            final Resource text = source.createResource(uri);

            Projects.traversal(text, target, Projects::annotationContext);
        });
    }

    @Path("/{uri}")
    @POST
    public Model create(@PathParam("projectUri") String project, @PathParam("uri") String text, Model model, @Context UriInfo ui) throws ParseException {
        return store.create(model);
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("projectUri") String project, @PathParam("uri") String text, Model model, @Context UriInfo ui) throws ParseException {
        return store.merge(model);
    }

    @Path("/{uri}/specific_resource/{resourceUri}")
    @GET
    public Model readSpecificResource(@PathParam("projectUri") String projectUri, @PathParam("uri") String textUri, @PathParam("resourceUri") String resourceUri, @Context UriInfo ui) throws ParseException {
        return store.read((source, target) -> {
            final Resource project = source.createResource(projectUri);
            final Resource text = source.createResource(textUri);
            final Resource resource = source.createResource(resourceUri);

            //if (project.hasProperty(OpenArchivesTerms.aggregates, text) && resource.hasProperty(OpenAnnotation.hasSource, text)) {
                Projects.traversal(resource, target, Projects::resourceContext);
            //}
        });
    }

    public static Model identifiers2Locators(Model model, UriInfo ui) {
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
                .path(Texts.class)
                .path(Texts.class, "read")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", uri)
                .build().toString();
    }

    private static String specificResource(UriInfo ui, String projectUri, String textUri, String resourceUri) {
        return Server.baseUri(ui)
                .path(Texts.class)
                .path(Texts.class, "readSpecificResource")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", textUri)
                .resolveTemplate("resourceUri", resourceUri)
                .build().toString();
    }
}
