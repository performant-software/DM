package edu.drew.dm.rdf;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Exif {

    private static final Model model = ModelFactory.createDefaultModel();

    public static final String NS = "http://www.w3.org/2003/12/exif/ns#";

    public static final Property width = model.createProperty(NS, "width");

    public static final Property height = model.createProperty(NS, "height");


}
