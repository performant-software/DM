package edu.drew.dm;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;

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

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Models {

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
            return ModelFactory.createDefaultModel().read(entityStream, "", lang);
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
