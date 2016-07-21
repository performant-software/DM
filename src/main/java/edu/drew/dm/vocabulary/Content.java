package edu.drew.dm.vocabulary;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Content {

    private static final Model model = ModelFactory.createDefaultModel();

    public static final String NS = "http://www.w3.org/2011/content#";

    public static Resource ContentAsText = model.createResource(NS + "ContentAsText");

    public static Property chars = model.createProperty(NS, "chars");
}
