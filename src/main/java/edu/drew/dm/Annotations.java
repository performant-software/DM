package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenAnnotation;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelExtract;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.rdf.model.StatementBoundary;
import org.apache.jena.rdf.model.StatementBoundaryBase;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.util.iterator.ExtendedIterator;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Annotations {

    public static Model graph(String uri, Model source, Model target) {
        annotations(source, source.createResource(uri))
                .forEachRemaining(annotation -> new ModelExtract(PROJECT_BOUNDARY).extractInto(target, annotation, source));

        return target;
    }

    public static Model graph(SemanticStore store, String project, String rootUri) {
        return store.read(ds -> {
            final Model source = ds.getDefaultModel();
            final Model target = Models.create();

            target.add(source.createResource(project).listProperties());

            graph(rootUri, source, target);

            return target;
        });
    }

    public static ExtendedIterator<Resource> annotations(Model model, Resource reference) {
        return model.listSubjectsWithProperty(OpenAnnotation.hasSource, reference)
                .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasTarget, reference))
                .andThen(model.listSubjectsWithProperty(OpenAnnotation.hasBody, reference));
    }

    public static StatementBoundary PROJECT_BOUNDARY = new StatementBoundaryBase() {
        @Override
        public boolean stopAt(Statement s) {
            final Resource type = s.getSubject().getPropertyResourceValue(RDF.type);
            return (type != null && Stream.of(FOAF.Agent, DCTypes.Collection).anyMatch(type::equals));
        }
    };
}
