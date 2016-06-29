package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenAnnotation;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.util.iterator.ExtendedIterator;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Annotations {

    public static Model graph(String uri, Model source, Model target) {
        annotations(source, source.createResource(uri))
                .forEachRemaining(annotation -> Projects.traversal(annotation, target, Projects::allNeighbors));

        return target;
    }

    public static Model graph(SemanticStore store, String project, String rootUri) {
        return store.read((source, target) -> {
            target.add(source.createResource(project).listProperties());

            graph(rootUri, source, target);
        });
    }

    public static ExtendedIterator<Resource> annotations(Model model, Resource reference) {
        return model.listSubjectsWithProperty(OpenAnnotation.hasSource, reference)
                .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasTarget, reference))
                .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasBody, reference))
                .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasSelector, reference));
    }
}
