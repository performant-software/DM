package edu.drew.dm;

import org.apache.jena.graph.NodeFactory;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import java.util.Collections;

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
    public Model readUser(@PathParam("user") String user) {
        return store.query(
                Sparql.select()
                        .addVar("?s").addVar("?p").addVar("?o")
                        .addWhere("?s", "?p", "?o")
                        .addWhere("?s", RDF.type, FOAF.Agent)
                        .addWhere("?s", RDFS.label, NodeFactory.createLiteral(user))
                        .build(),
                Sparql.resultSetModel()
        );
    }


    @Path("/{username}")
    @PUT
    public Model updateUser(@PathParam("username") String userName, Model model) {
        throw Server.NOT_IMPLEMENTED;
    }
}
