package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenArchivesTerms;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.core.UriInfo;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/projects")
public class Projects {

    @Path("/{uri}")
    @GET
    public Model read(@PathParam("uri") String uri) {
        return ModelFactory.createDefaultModel();
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
        model.listSubjectsWithProperty(RDF.type, DCTypes.Collection).forEachRemaining(project -> model.add(
                project,
                OpenArchivesTerms.isDescribedBy,
                model.createResource(ui.getBaseUriBuilder()
                        .path(Projects.class)
                        .path(Projects.class, "read")
                        .resolveTemplate("uri", project.getURI())
                        .build().toString()
                )
        ));
        return model;
    }
}
