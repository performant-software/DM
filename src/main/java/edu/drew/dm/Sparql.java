package edu.drew.dm;

import org.apache.jena.arq.querybuilder.SelectBuilder;
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

}
