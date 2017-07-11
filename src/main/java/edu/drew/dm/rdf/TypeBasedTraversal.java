package edu.drew.dm.rdf;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.util.iterator.ExtendedIterator;
import org.apache.jena.util.iterator.NullIterator;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class TypeBasedTraversal extends Traversal {

    private final Map<Resource, Set<Property>> incoming = new HashMap<>();
    private final Map<Resource, Set<Property>> outgoing = new HashMap<>();

    public TypeBasedTraversal(Resource start) {
        super(start);
    }

    public TypeBasedTraversal configureType(Resource type, Collection<Property> incomingProperties, Collection<Property> outgoingProperties) {
        this.incoming.computeIfAbsent(type, t -> new HashSet<>()).addAll(incomingProperties);
        this.outgoing.computeIfAbsent(type, t -> new HashSet<>()).addAll(outgoingProperties);
        return this;
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

    public static TypeBasedTraversal ofList(Resource start) {
        return new TypeBasedTraversal(start)
                .configureType(
                        RDF.List,
                        Collections.emptySet(),
                        Arrays.asList(RDF.first, RDF.rest)
                );
    }

    public static TypeBasedTraversal ofProject(Resource start) {
        return new TypeBasedTraversal(start)
                .configureType(
                        DCTypes.Collection,
                        Collections.singleton(Perm.hasPermissionOver),
                        Collections.singleton(OpenArchivesTerms.aggregates)
                )
                .configureType(
                        RDF.List,
                        Collections.emptySet(),
                        Arrays.asList(RDF.first, RDF.rest)
                )
                .configureType(
                        DCTypes.Image,
                        Collections.singleton(OpenAnnotation.hasBody),
                        Collections.emptySet()
                )
                .configureType(
                        SharedCanvas.Canvas,
                        Arrays.asList(OpenAnnotation.hasSource, OpenAnnotation.hasTarget, OpenAnnotation.hasBody, OpenArchivesTerms.aggregates),
                        Collections.emptySet()
                )
                .configureType(
                        DCTypes.Text,
                        Arrays.asList(OpenAnnotation.hasSource, OpenAnnotation.hasTarget, OpenAnnotation.hasBody, OpenArchivesTerms.aggregates),
                        Collections.emptySet()
                )
                .configureType(
                        OpenAnnotation.SpecificResource,
                        Arrays.asList(OpenAnnotation.hasTarget, OpenAnnotation.hasBody),
                        Arrays.asList(OpenAnnotation.hasSelector, OpenAnnotation.hasSource)
                )
                .configureType(
                        OpenAnnotation.Annotation,
                        Collections.emptySet(),
                        Arrays.asList(OpenAnnotation.hasTarget, OpenAnnotation.hasBody)
                )
                .configureType(
                        OpenAnnotation.TextQuoteSelector,
                        Collections.singleton(OpenAnnotation.hasSelector),
                        Collections.emptySet()
                )
                .configureType(
                        OpenAnnotation.SvgSelector,
                        Collections.singleton(OpenAnnotation.hasSelector),
                        Collections.emptySet()
                );
    }

    public static TypeBasedTraversal ofSpecificResource(Resource start) {
        return new TypeBasedTraversal(start)
                .configureType(
                        OpenAnnotation.SpecificResource,
                        Collections.singleton(OpenAnnotation.hasBody),
                        Arrays.asList(OpenAnnotation.hasSource, OpenAnnotation.hasSelector)
                )
                .configureType(
                        OpenAnnotation.Annotation,
                        Collections.emptySet(),
                        Collections.singleton(OpenAnnotation.hasTarget)
                );
    }

    public static TypeBasedTraversal ofAnnotations(Resource start) {
        return new TypeBasedTraversal(start)
                .configureType(
                        SharedCanvas.Canvas,
                        Arrays.asList(OpenAnnotation.hasBody, OpenAnnotation.hasSource, OpenAnnotation.hasTarget, OpenArchivesTerms.aggregates),
                        Collections.emptySet()
                )
                .configureType(
                        DCTypes.Text,
                        Arrays.asList(OpenAnnotation.hasBody, OpenAnnotation.hasSource, OpenAnnotation.hasTarget, OpenArchivesTerms.aggregates),
                        Collections.emptySet()
                )
                .configureType(
                        OpenAnnotation.SpecificResource,
                        Collections.singleton(OpenAnnotation.hasTarget),
                        Arrays.asList(OpenAnnotation.hasSelector)
                )
                .configureType(
                        OpenAnnotation.Annotation,
                        Collections.emptySet(),
                        Arrays.asList(OpenAnnotation.hasBody, OpenAnnotation.hasTarget)
                );
    }
}
