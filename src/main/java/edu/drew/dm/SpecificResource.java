package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenAnnotation;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.vocabulary.RDF;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class SpecificResource {

    public static Model sourcedAt(Resource resource, Model target) {
        resource.getModel().listSubjectsWithProperty(OpenAnnotation.hasSource, resource)
                .filterKeep(subject -> subject.hasProperty(RDF.type, OpenAnnotation.SpecificResource))
                .forEachRemaining(sr -> {
                    target.add(sr.listProperties());
                    target.add(sr.getPropertyResourceValue(OpenAnnotation.hasSelector).listProperties());
                });
        return target;
    }

    public static Model targetedAt(Resource resource, Model target) {
        resource.getModel().listSubjectsWithProperty(OpenAnnotation.hasTarget, resource)
            .filterKeep(subject -> subject.hasProperty(RDF.type, OpenAnnotation.Annotation))
            .forEachRemaining(annotation -> {
                target.add(annotation.listProperties());
                Projects.traversal(annotation, target, Projects::allNeighbors);
            });

        return target;
    }
}
