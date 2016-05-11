package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenAnnotation;
import edu.drew.dm.vocabulary.OpenArchivesTerms;
import org.apache.jena.graph.Node;
import org.apache.jena.graph.NodeFactory;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import javax.inject.Inject;
import javax.ws.rs.DELETE;
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
@Path("/store/projects")
public class Projects {

    private final SemanticStore store;

    @Inject
    public Projects(SemanticStore store) {
        this.store = store;
    }

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("uri") String uri, @Context UriInfo ui) throws ParseException {
        final Node projectUri = NodeFactory.createURI(uri);
        final Model projectDesc = Models.create();

        store.query(
                Sparql.selectTriples()
                        .addFilter("?s = <" + projectUri + ">")
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

        store.query(
                Sparql.selectTriples()
                        .addWhere(projectUri, OpenArchivesTerms.aggregates, "?canvas")
                        .addWhere("?s", OpenAnnotation.hasTarget, "?canvas")
                        .build(),
                Sparql.resultSetInto(projectDesc)
        );

        store.query(
                Sparql.selectTriples()
                        .addWhere("?s", RDF.type, "?imageType")
                        .addWhere("?imageAnnotation", OpenAnnotation.hasTarget, "?canvas")
                        .addWhere("?imageAnnotation", OpenAnnotation.hasBody, "?s")
                        .addWhere(projectUri, OpenArchivesTerms.aggregates, "?canvas")
                        .addFilter(Sparql.propertyFilter("?imageType", "dcmitype:Image", "dms:Image", "dms:ImageChoice"))
                        .build(),
                Sparql.resultSetInto(projectDesc)
        );

        return Models.linked(projectDesc, ui);
    }

    @POST
    public Model create(Model model) {
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}")
    @PUT
    public Model update(@PathParam("uri") String uri, Model model) {
        throw Server.NOT_IMPLEMENTED;
    }

    @Path("/{uri}")
    @DELETE
    public Model delete(@PathParam("uri") String uri) {
        throw Server.NOT_IMPLEMENTED;
    }

    public static Model linked(Model model, UriInfo ui) {
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
        return ui.getBaseUriBuilder()
                .path(Projects.class)
                .path(Projects.class, "read")
                .resolveTemplate("uri", uri)
                .build().toString();
    }
}
