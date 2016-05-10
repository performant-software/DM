package edu.drew.dm;

import org.apache.jena.arq.querybuilder.SelectBuilder;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDFS;

import java.util.HashMap;
import java.util.Map;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Sparql {

    private static final Map<String, String> PREFIXES = new HashMap<>();

    static {
        PREFIXES.put("rdfs", RDFS.uri);
        PREFIXES.put("foaf", FOAF.NS);
    }

    public static SelectBuilder select() {
        return new SelectBuilder().addPrefixes(PREFIXES);
    }

    public static SemanticStore.QueryResultHandler<Model> resultSetModel(String subjectVar, String propertyVar, String objectVar) {
        return (resultSet -> {
            final Model model = ModelFactory.createDefaultModel();
            resultSet.forEachRemaining(qs -> model.add(
                    qs.getResource(subjectVar).inModel(model),
                    model.createProperty(qs.getResource(propertyVar).getURI()),
                    qs.get(objectVar).inModel(model)
            ));
            return model;
        });
    }

    public static SemanticStore.QueryResultHandler<Model> resultSetModel() {
        return resultSetModel("s", "p", "o");
    }

}
