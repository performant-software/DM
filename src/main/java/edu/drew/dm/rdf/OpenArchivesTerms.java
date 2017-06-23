package edu.drew.dm.rdf;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class OpenArchivesTerms {

    private static final Model model = ModelFactory.createDefaultModel();

    public static final String NS = "http://www.openarchives.org/ore/terms/";

    public static final Property aggregates = model.createProperty(NS, "aggregates");

    public static final Property isDescribedBy = model.createProperty(NS, "isDescribedBy");
}
