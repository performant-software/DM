package edu.drew.dm;

import org.apache.jena.arq.querybuilder.SelectBuilder;
import org.apache.jena.graph.NodeFactory;
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
        semanticStore.query(
                Sparql.select()
                        .addVar("?s").addVar("?p").addVar("?o")
                        .addWhere("?s", "?p", "?o")
                        .addWhere("?s", RDF.type, FOAF.Agent)
                        .addWhere("?s", RDFS.label, NodeFactory.createLiteral("lou"))
                        .build(),
                (SemanticStore.QueryResultHandler<Void>) resultSet -> {
                    resultSet.forEachRemaining(qs -> System.out.println(String.join(", ", qs.getResource("s").toString(), qs.getResource("p").toString(), qs.get("o").toString())));
                    return null;
                }
        );
    }

}
