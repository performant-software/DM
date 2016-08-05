package edu.drew.dm.semantics;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import java.util.Set;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Traversals {

    public static Stream<Resource> projectContext(Resource r) {
        final Model model = r.getModel();
        final Set<Resource> resourceTypes = model.listObjectsOfProperty(r, RDF.type).mapWith(RDFNode::asResource).toSet();

        if (resourceTypes.contains(DCTypes.Collection)) {
            return r.listProperties(OpenArchivesTerms.aggregates)
                    .mapWith(Statement::getObject).mapWith(RDFNode::asResource)
                    .andThen(model.listSubjectsWithProperty(Perm.hasPermissionOver, r))
                    .toSet()
                    .stream();
        }
        if (resourceTypes.contains(DCTypes.Image)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasBody, r).toSet().stream();
        }
        if (resourceTypes.contains(SharedCanvas.Canvas) || resourceTypes.contains(DCTypes.Text)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasSource, r)
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r))
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasBody, r))
                    .andThen(model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, r))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.SpecificResource)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r)
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasBody, r))
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSelector).mapWith(RDFNode::asResource))
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSource).mapWith(RDFNode::asResource))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.Annotation)) {
            return r.listProperties(OpenAnnotation.hasTarget)
                    .andThen(r.listProperties(OpenAnnotation.hasBody))
                    .mapWith(Statement::getObject)
                    .mapWith(RDFNode::asResource)
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.TextQuoteSelector) || resourceTypes.contains(OpenAnnotation.SvgSelector)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasSelector, r)
                    .toSet().stream();
        }
        return Stream.empty();
    }

    public static Stream<Resource> resourceContext(Resource r) {
        final Model model = r.getModel();
        final Set<Resource> resourceTypes = model.listObjectsOfProperty(r, RDF.type).mapWith(RDFNode::asResource).toSet();

        if (resourceTypes.contains(OpenAnnotation.SpecificResource)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasBody, r)
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSource).mapWith(RDFNode::asResource))
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSelector).mapWith(RDFNode::asResource))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.Annotation)) {
            return r.listProperties(OpenAnnotation.hasTarget)
                    .mapWith(Statement::getObject)
                    .mapWith(RDFNode::asResource)
                    .toSet().stream();
        }
        return Stream.empty();
    }

    public static Stream<Resource> annotationContext(Resource r) {
        final Model model = r.getModel();
        final Set<Resource> resourceTypes = model.listObjectsOfProperty(r, RDF.type).mapWith(RDFNode::asResource).toSet();

        if (resourceTypes.contains(SharedCanvas.Canvas) || resourceTypes.contains(DCTypes.Text)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasSource, r)
                    .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r))
                    .andThen(model.listSubjectsWithProperty(OpenArchivesTerms.aggregates, r))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.SpecificResource)) {
            return model.listSubjectsWithProperty(OpenAnnotation.hasTarget, r)
                    .andThen(model.listObjectsOfProperty(r, OpenAnnotation.hasSelector).mapWith(RDFNode::asResource))
                    .toSet().stream();
        }
        if (resourceTypes.contains(OpenAnnotation.Annotation)) {
            return r.listProperties(OpenAnnotation.hasTarget)
                    .andThen(r.listProperties(OpenAnnotation.hasBody))
                    .mapWith(Statement::getObject)
                    .mapWith(RDFNode::asResource)
                    .toSet().stream();
        }
        return Stream.empty();
    }

}
