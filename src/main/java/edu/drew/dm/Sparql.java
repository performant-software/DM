package edu.drew.dm;

import edu.drew.dm.vocabulary.Perm;
import org.apache.jena.arq.querybuilder.SelectBuilder;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTerms;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.DC_11;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.util.HashMap;
import java.util.Map;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Sparql {

    private static final Map<String, String> PREFIXES = new HashMap<>();

    static {
        PREFIXES.put("rdf", RDF.uri);
        PREFIXES.put("rdfs", RDFS.uri);
        PREFIXES.put("dc", DC_11.NS);
        PREFIXES.put("dcterms", DCTerms.NS);
        PREFIXES.put("dctypes", DCTypes.NS);
        PREFIXES.put("foaf", FOAF.NS);

        PREFIXES.put("exif", "http://www.w3.org/2003/12/exif/ns#");
        PREFIXES.put("oa", "http://www.w3.org/ns/oa#");
        PREFIXES.put("cnt08", "http://www.w3.org/2008/content#");
        PREFIXES.put("prov", "http://www.w3.org/ns/prov#");
        PREFIXES.put("skos", "http://www.w3.org/2004/02/skos/core#");
        PREFIXES.put("trig", "http://www.w3.org/2004/03/trix/rdfg-1/");
        PREFIXES.put("cnt", "http://www.w3.org/2011/content#");

        PREFIXES.put("dm", "http://dm.drew.edu/ns/");
        PREFIXES.put("dms", "http://dms.stanford.edu/ns/");
        PREFIXES.put("sc", "http://www.shared-canvas.org/ns/");
        PREFIXES.put("ore", "http://www.openarchives.org/ore/terms/");
        PREFIXES.put("perm", Perm.NS);
        PREFIXES.put("tei", "http://www.tei-c.org/ns/1.0/");
    }

    public static SelectBuilder select() {
        return new SelectBuilder().addPrefixes(PREFIXES);
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
