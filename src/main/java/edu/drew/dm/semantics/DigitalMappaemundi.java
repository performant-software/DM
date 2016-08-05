package edu.drew.dm.semantics;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class DigitalMappaemundi {

    private static final Model model = ModelFactory.createDefaultModel();

    public static final String NS = "http://dm.drew.edu/ns/";

    public static final Property lastOpenProject = model.createProperty(NS, "lastOpenProject");

}
