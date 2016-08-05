package edu.drew.dm.semantics;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;

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

    public static final Set<Property> ALL_PROPERTIES = new HashSet<>();

    public static final Set<Property> USER_PERMISSIONS = new HashSet<>();
    public static final Set<Property> ADMIN_PERMISSIONS = new HashSet<>();

    static {
        USER_PERMISSIONS.add(hasPermissionOver);
        USER_PERMISSIONS.add(mayRead);
        USER_PERMISSIONS.add(mayUpdate);
        USER_PERMISSIONS.add(mayDelete);
        USER_PERMISSIONS.add(mayAugment);

        ADMIN_PERMISSIONS.add(mayAdminister);

        ALL_PROPERTIES.addAll(USER_PERMISSIONS);
        ALL_PROPERTIES.addAll(ADMIN_PERMISSIONS);
    }
}
