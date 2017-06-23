package edu.drew.dm.rdf;

import edu.drew.dm.CanvasResource;
import edu.drew.dm.data.Images;
import edu.drew.dm.ProjectResource;
import edu.drew.dm.TextResource;
import edu.drew.dm.user.UserResource;
import edu.drew.dm.util.IO;
import org.apache.jena.rdf.model.Model;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.annotation.Annotation;
import java.lang.reflect.Type;
import javax.ws.rs.NotFoundException;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.ext.MessageBodyReader;
import javax.ws.rs.ext.MessageBodyWriter;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class ModelReaderWriter implements MessageBodyReader<Model>, MessageBodyWriter<Model> {

    @SuppressWarnings("unused")
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
                UserResource::internalize,
                Images::internalize
        );
    }

    public static Model externalize(Model model, UriInfo ui) {
        model.removeAll(null, OpenArchivesTerms.isDescribedBy, null);

        UserResource.externalize(model, ui);
        ProjectResource.externalize(model, ui);
        CanvasResource.externalize(model, ui);
        TextResource.externalize(model, ui);
        Images.externalize(model, ui);

        return model;
    }
}
