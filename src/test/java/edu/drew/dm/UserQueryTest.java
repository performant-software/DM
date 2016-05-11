package edu.drew.dm;

import org.apache.jena.graph.NodeFactory;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;
import org.junit.Test;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class UserQueryTest extends SemanticStoreTestBase {

    @Test
    public void queryUser() {
        final Model userModel = Models.create();
        semanticStore.query(
                Sparql.selectTriples()
                        .addWhere("?s", RDF.type, FOAF.Agent)
                        .addWhere("?s", RDFS.label, NodeFactory.createLiteral("lou"))
                        .build(),
                Sparql.resultSetInto(userModel)
        );
        userModel.write(System.out);
    }

}
