package edu.drew.dm;

import org.apache.jena.arq.querybuilder.SelectBuilder;
import org.apache.jena.rdf.model.Model;

import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Sparql {

    public static SelectBuilder select() {
        return new SelectBuilder().addPrefixes(Models.PREFIXES);
    }

    public static SelectBuilder selectTriples() {
        return select()
                .addVar("?s").addVar("?p").addVar("?o")
                .addWhere("?s", "?p", "?o");
    }

    public static String propertyFilter(String propertyVar, String... acceptedValues) {
        return Stream.of(acceptedValues).map(value -> String.join(" = ", propertyVar, value)).collect(Collectors.joining(" || "));
    }

    public static String basicProperties(String propertyVar) {
        return propertyFilter(propertyVar,
                "rdf:type",
                "rdfs:label",
                "dc:title",
                "dcterms:description",
                "exif:width",
                "exif:height",
                "oa:exact",
                "ore:isDescribedBy"
        );
    }
    public static SemanticStore.QueryResultHandler<Model> resultSetInto(Model model, String subjectVar, String propertyVar, String objectVar) {
        return (resultSet -> {
            resultSet.forEachRemaining(qs -> model.add(
                    qs.getResource(subjectVar).inModel(model),
                    model.createProperty(qs.getResource(propertyVar).getURI()),
                    qs.get(objectVar).inModel(model)
            ));
            return model;
        });
    }

    public static SemanticStore.QueryResultHandler<Model> resultSetInto(Model model) {
        return resultSetInto(model, "s", "p", "o");
    }

}
