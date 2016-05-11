package edu.drew.dm.vocabulary;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Resource;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class SharedCanvas {

    private static final Model model = ModelFactory.createDefaultModel();

    public static final String NS = "http://www.shared-canvas.org/ns/";

    public static final Resource Canvas = model.createResource(NS + "Canvas");

}
