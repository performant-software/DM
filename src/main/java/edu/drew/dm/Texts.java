package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenAnnotation;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.SimpleSelector;
import org.apache.jena.rdf.model.Statement;
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
import java.util.Collections;

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
    public Model read(@PathParam("projectUri") String project, @PathParam("uri") String text, @Context UriInfo ui) throws ParseException {
        return Models.identifiers2Locators(Annotations.graph(store, project, text), ui);
    }

    @Path("/{uri}")
    @POST
    public Model create(@PathParam("projectUri") String project, @PathParam("uri") String text, Model model, @Context UriInfo ui) throws ParseException {
        final Model generalizedModel = Models.locators2Identifiers(model);
        store.create(generalizedModel);
        return Models.identifiers2Locators(generalizedModel, ui);
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("projectUri") String project, @PathParam("uri") String text, Model model, @Context UriInfo ui) throws ParseException {
        final Model generalizedModel = Models.locators2Identifiers(model);
        store.merge(generalizedModel, Collections.emptySet());
        return Models.identifiers2Locators(generalizedModel, ui);
    }

    @Path("/{uri}/specific_resource/{resourceUri}")
    @GET
    public Model readSpecificResource(@PathParam("projectUri") String project, @PathParam("uri") String text, @PathParam("resourceUri") String resourceUri, @Context UriInfo ui) throws ParseException {
        return Models.identifiers2Locators(Annotations.graph(store, project, resourceUri), ui);
    }

    public static Model identifiers2Locators(Model model, UriInfo ui) {
        model.listSubjectsWithProperty(RDF.type, DCTypes.Text).forEachRemaining(text -> {
            model.removeAll(text, OpenArchivesTerms.isDescribedBy, null);
            model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, text).forEachRemaining(project -> {
                model.add(
                        text,
                        OpenArchivesTerms.isDescribedBy,
                        model.createResource(textResource(ui, project.getURI(), text.getURI()))
                );
                model.listSubjectsWithProperty(RDF.type, OpenAnnotation.SpecificResource).forEachRemaining(sr -> {
                    model.removeAll(sr, OpenArchivesTerms.isDescribedBy, null);
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

    private static String textResource(UriInfo ui, String projectUri, String uri) {
        return Server.baseUri(ui)
                .path(Texts.class)
                .path(Texts.class, "read")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", uri)
                .build().toString();
    }

    private static String specificResource(UriInfo ui, String projectUri, String textUri, String resourceUri) {
        return Server.baseUri(ui)
                .path(Canvases.class)
                .path(Canvases.class, "readSpecificResource")
                .resolveTemplate("projectUri", projectUri)
                .resolveTemplate("uri", textUri)
                .resolveTemplate("resourceUri", resourceUri)
                .build().toString();
    }
}
