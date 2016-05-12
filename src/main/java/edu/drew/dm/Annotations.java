package edu.drew.dm;

import edu.drew.dm.vocabulary.OpenAnnotation;
import org.apache.jena.graph.Node;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelExtract;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.rdf.model.StatementBoundaryBase;
import org.apache.jena.sparql.lang.sparql_11.ParseException;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import java.util.Set;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Annotations {

    public static Model model(Model model, SemanticStore store, Node uri) throws ParseException {
        return store.read(ds -> {
            final Model storeModel = ds.getDefaultModel();

            final Resource resource = storeModel.createResource(uri.getURI());
            final Set<Resource> annotations = storeModel.listSubjectsWithProperty(OpenAnnotation.hasSource, resource)
                    .andThen(storeModel.listSubjectsWithProperty(OpenAnnotation.hasTarget, resource))
                    .andThen(storeModel.listSubjectsWithProperty(OpenAnnotation.hasBody, resource))
                    .toSet();

            for (Resource annotation : annotations) {
                new ModelExtract(new StatementBoundaryBase() {
                    @Override
                    public boolean stopAt(Statement s) {
                        final Resource type = s.getSubject().getPropertyResourceValue(RDF.type);
                        return (type != null && Stream.of(FOAF.Agent, DCTypes.Collection).anyMatch(type::equals));
                    }
                }).extractInto(model, annotation, storeModel);
            }

            return model;
        });
    }
}
