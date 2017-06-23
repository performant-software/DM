package edu.drew.dm.http;

import edu.drew.dm.semantics.Models;
import edu.drew.dm.semantics.OpenArchivesTerms;
import edu.drew.dm.user.Users;
import edu.drew.dm.util.IO;
import org.apache.jena.rdf.model.Model;

import javax.ws.rs.NotFoundException;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.UriInfo;
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
public class ModelReaderWriter implements MessageBodyReader<Model>, MessageBodyWriter<Model> {

    @Context
    private UriInfo ui;

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
        return internalize(Models.create().read(new IO.NonClosingInputStream(entityStream), "", lang));
    }

    @Override
    public void writeTo(Model model, Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType, MultivaluedMap<String, Object> httpHeaders, OutputStream entityStream) throws IOException, WebApplicationException {
        if (model.isEmpty()) {
            throw new NotFoundException();
        }

        String lang = "N3";
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

        externalize(model, ui).write(new IO.NonClosingOutputStream(entityStream), lang);
    }

    @Override
    public long getSize(Model model, Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType) {
        return -1;
    }

    @Override
    public boolean isReadable(Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType) {
        return Model.class.isAssignableFrom(type);
    }

    @Override
    public boolean isWriteable(Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType) {
        return Model.class.isAssignableFrom(type);
    }

    public static Model internalize(Model model) {
        model.removeAll(null, OpenArchivesTerms.isDescribedBy, null);

        return Models.renameResources(model,
                Users::internalize,
                Images::internalize
        );
    }

    public static Model externalize(Model model, UriInfo ui) {
        model.removeAll(null, OpenArchivesTerms.isDescribedBy, null);

        Users.externalize(model, ui);
        Projects.externalize(model, ui);
        Canvases.externalize(model, ui);
        Texts.externalize(model, ui);
        Images.externalize(model, ui);

        return model;
    }
}
