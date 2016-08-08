package edu.drew.dm.semantics;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.util.iterator.ExtendedIterator;
import org.apache.jena.util.iterator.NullIterator;
import org.apache.jena.vocabulary.RDF;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.function.Consumer;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Traversal {

    private Map<Resource, Set<Property>> outgoing = new HashMap<>();
    private Map<Resource, Set<Property>> incoming = new HashMap<>();

    public Traversal configureType(Resource type, Collection<Property> incomingProperties, Collection<Property> outgoingProperties) {
        this.incoming.computeIfAbsent(type, t -> new HashSet<>()).addAll(incomingProperties);
        this.outgoing.computeIfAbsent(type, t -> new HashSet<>()).addAll(outgoingProperties);
        return this;
    }

    public void visit(Resource start, Consumer<Resource> consumer) {
        final Queue<Resource> frontier = new LinkedList<>(Collections.singleton(start));
        final Set<Resource> visited = new HashSet<>();
        while (!frontier.isEmpty()) {
            final Resource resource = frontier.remove();
            if (!visited.contains(resource)) {
                consumer.accept(resource);
                visited.add(resource);
                nextOf(resource).filterDrop(visited::contains).forEachRemaining(frontier::add);
            }
        }
    }

    public Model copy(Resource start, Model target) {
        visit(start, resource -> target.add(resource.listProperties()));
        return target;
    }

    public ExtendedIterator<Resource> nextOf(Resource r) {
        ExtendedIterator<Resource> next = new NullIterator<>();
        final Model model = r.getModel();
        for (Statement typeStmt : r.listProperties(RDF.type).toList()) {
            final Resource type = typeStmt.getObject().asResource();
            for (Property outgoingProperty : outgoing.getOrDefault(type, Collections.emptySet())) {
                next = next.andThen(model.listObjectsOfProperty(r, outgoingProperty).mapWith(RDFNode::asResource));
            }
            for (Property incomingProperty : incoming.getOrDefault(type, Collections.emptySet())) {
                next = next.andThen(model.listResourcesWithProperty(incomingProperty, r).mapWith(RDFNode::asResource));
            }
        }
        return next;
    }

}
