package edu.drew.dm;

import edu.drew.dm.vocabulary.Perm;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTerms;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.DC_11;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import javax.ws.rs.NotFoundException;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.ext.MessageBodyReader;
import javax.ws.rs.ext.MessageBodyWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.annotation.Annotation;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Models {

    public static final Map<String, String> PREFIXES = new HashMap<>();

    static {
        PREFIXES.put("rdf", RDF.uri);
        PREFIXES.put("rdfs", RDFS.uri);
        PREFIXES.put("dc", DC_11.NS);
        PREFIXES.put("dcterms", DCTerms.NS);
        PREFIXES.put("dctypes", DCTypes.NS);
        PREFIXES.put("foaf", FOAF.NS);

        PREFIXES.put("exif", "http://www.w3.org/2003/12/exif/ns#");
        PREFIXES.put("oa", "http://www.w3.org/ns/oa#");
        PREFIXES.put("cnt08", "http://www.w3.org/2008/content#");
        PREFIXES.put("prov", "http://www.w3.org/ns/prov#");
        PREFIXES.put("skos", "http://www.w3.org/2004/02/skos/core#");
        PREFIXES.put("trig", "http://www.w3.org/2004/03/trix/rdfg-1/");
        PREFIXES.put("cnt", "http://www.w3.org/2011/content#");

        PREFIXES.put("dm", "http://dm.drew.edu/ns/");
        PREFIXES.put("dms", "http://dms.stanford.edu/ns/");
        PREFIXES.put("sc", "http://www.shared-canvas.org/ns/");
        PREFIXES.put("ore", "http://www.openarchives.org/ore/terms/");
        PREFIXES.put("perm", Perm.NS);
        PREFIXES.put("tei", "http://www.tei-c.org/ns/1.0/");
    }

    public static Model create() {
        final Model model = ModelFactory.createDefaultModel();
        model.setNsPrefixes(PREFIXES);
        return model;
    }

    public static class Reader implements MessageBodyReader<Model> {

        @Override
        public boolean isReadable(Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType) {
            return Model.class.isAssignableFrom(type);
        }

        @Override
        public Model readFrom(Class<Model> type, Type genericType, Annotation[] annotations, MediaType mediaType, MultivaluedMap<String, String> httpHeaders, InputStream entityStream) throws IOException, WebApplicationException {
            String lang = null;
            if (mediaType.isCompatible(MediaType.valueOf("application/rdf+xml"))) {
                lang = "RDF/XML";
            }
            if (mediaType.isCompatible(MediaType.valueOf("text/turtle"))) {
                lang = "TTL";
            }
            if (mediaType.isCompatible(MediaType.valueOf("text/rdf+n3"))) {
                lang = "N3";
            }
            if (mediaType.isCompatible(MediaType.valueOf("text/plain"))) {
                lang = "N-TRIPLE";
            }
            return create().read(entityStream, "", lang);
        }

    }

    public static class Writer implements MessageBodyWriter<Model> {

        @Override
        public boolean isWriteable(Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType) {
            return Model.class.isAssignableFrom(type);
        }

        @Override
        public long getSize(Model model, Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType) {
            return -1;
        }

        @Override
        public void writeTo(Model model, Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType, MultivaluedMap<String, Object> httpHeaders, OutputStream entityStream) throws IOException, WebApplicationException {
            if (model.isEmpty()) {
                throw new NotFoundException();
            }
            String lang = "N-TRIPLE";
            if (mediaType.isCompatible(MediaType.valueOf("application/rdf+xml"))) {
                lang = "RDF/XML";
            }
            if (mediaType.isCompatible(MediaType.valueOf("text/turtle"))) {
                lang = "TTL";
            }
            if (mediaType.isCompatible(MediaType.valueOf("text/rdf+n3"))) {
                lang = "N3";
            }
            if (mediaType.isCompatible(MediaType.valueOf("text/plain"))) {
                lang = "N-TRIPLE";
            }
            if (mediaType.isCompatible(MediaType.valueOf("application/n-triples"))) {
                lang = "N-TRIPLE";
            }
            if (mediaType.isCompatible(MediaType.valueOf("text/n-triples"))) {
                lang = "N-TRIPLE";
            }

            model.write(entityStream, lang);
        }
    }
}
