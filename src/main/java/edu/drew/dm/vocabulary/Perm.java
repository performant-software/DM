package edu.drew.dm.vocabulary;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Perm {

    private static final Model model = ModelFactory.createDefaultModel();

    public static final String NS = "http://vocab.ox.ac.uk/perm#";

    public static final Property hasPermissionOver = model.createProperty(NS, "hasPermissionOver");

    public static final Property mayRead = model.createProperty(NS, "mayRead");

    public static final Property mayUpdate = model.createProperty(NS, "mayUpdate");

    public static final Property mayDelete = model.createProperty(NS, "mayDelete");

    public static final Property mayAugment = model.createProperty(NS, "mayAugment");

    public static final Property mayAdminister = model.createProperty(NS, "mayAdminister");

    public static final Set<Property> ALL_PROPERTIES = new HashSet<>(Arrays.asList(
            hasPermissionOver,
            mayRead,
            mayUpdate,
            mayDelete,
            mayAugment,
            mayAdminister
    ));
}
