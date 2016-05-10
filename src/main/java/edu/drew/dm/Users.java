package edu.drew.dm;

import edu.drew.dm.vocabulary.Perm;
import org.apache.jena.graph.NodeFactory;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

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
@Path("/store/users")
public class Users {

    private final SemanticStore store;

    @Inject
    public Users(SemanticStore store) {
        this.store = store;
    }


    @Path("/{user}")
    @GET
    public Model read(@PathParam("user") String user, @Context UriInfo ui) {
        final Model model = ModelFactory.createDefaultModel();

        store.query(
                Sparql.select()
                        .addVar("?s").addVar("?p").addVar("?o")
                        .addWhere("?s", "?p", "?o")
                        .addWhere("?s", RDF.type, FOAF.Agent)
                        .addWhere("?s", RDFS.label, NodeFactory.createLiteral(user))
                        .build(),
                Sparql.resultSetInto(model)
        );

        store.query(
                Sparql.select()
                        .addVar("?s").addVar("?p").addVar("?o")
                        .addWhere("?s", "?p", "?o")
                        .addWhere("?s", RDF.type, DCTypes.Collection)
                        .addWhere("?agent", RDF.type, FOAF.Agent)
                        .addWhere("?agent", RDFS.label, NodeFactory.createLiteral(user))
                        .addWhere("?agent", Perm.hasPermissionOver, "?s")
                        .build(),
                Sparql.resultSetInto(model)
        );

        Projects.linked(model, ui);

        return model;
    }


    @Path("/{user}")
    @PUT
    public Model update(@PathParam("user") String user, Model model) {
        throw Server.NOT_IMPLEMENTED;
    }
}
