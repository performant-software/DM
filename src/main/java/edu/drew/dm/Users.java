package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenArchivesTerms;
import edu.drew.dm.vocabulary.Perm;
import org.apache.jena.graph.Node;
import org.apache.jena.graph.NodeFactory;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
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
import java.io.StringWriter;
import java.net.URI;
import java.util.logging.Logger;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/users")
public class Users {

    private static final Logger LOG = Logger.getLogger(Users.class.getName());

    private final SemanticStore store;

    @Inject
    public Users(SemanticStore store) {
        this.store = store;
    }


    @Path("/{user}")
    @GET
    public Model read(@PathParam("user") String user, @Context UriInfo ui) throws ParseException {
        final Model userDesc = Models.create();
        final Node userLiteral = NodeFactory.createLiteral(user);

        store.query(
                Sparql.selectTriples()
                        .addWhere("?s", RDF.type, FOAF.Agent)
                        .addWhere("?s", RDFS.label, userLiteral)
                        .build(),
                Sparql.resultSetInto(userDesc)
        );

        store.query(
                Sparql.selectTriples()
                        .addWhere("?s", RDF.type, DCTypes.Collection)
                        .addWhere("?agent", RDF.type, FOAF.Agent)
                        .addWhere("?agent", RDFS.label, userLiteral)
                        .addWhere("?agent", Perm.hasPermissionOver, "?s")
                        .addFilter(Sparql.basicProperties("?p"))
                        .build(),
                Sparql.resultSetInto(userDesc)
        );

        return Models.linked(userDesc, ui);
    }

    @Path("/{user}")
    @PUT
    public Model update(@PathParam("user") String user, Model model) {
        LOG.fine(() -> {
            final StringWriter modelStr = new StringWriter();
            model.write(modelStr, "N3");
            return modelStr.toString();
        });

        return model;
    }

    public static Model linked(Model model, UriInfo ui) {
        model.listSubjectsWithProperty(RDF.type, FOAF.Agent).forEachRemaining(agent -> {
            model.removeAll(
                    agent,
                    OpenArchivesTerms.isDescribedBy,
                    null
            );
            model.add(
                    agent,
                    OpenArchivesTerms.isDescribedBy,
                    model.createResource(userResource(ui, agent.getRequiredProperty(RDFS.label).getString()))
            );
        });
        return Models.renameResources(model, (r -> {
            final String uri = r.getURI();
            final URI parsed = URI.create(uri);
            return "user".equals(parsed.getScheme()) ? userResource(ui, parsed.getSchemeSpecificPart()) : uri;
        }));
    }

    private static String userResource(UriInfo ui, String user) {
        return Server.baseUri(ui)
                .path(Users.class)
                .path(Users.class, "read")
                .resolveTemplate("user", user)
                .build().toString();
    }


}
