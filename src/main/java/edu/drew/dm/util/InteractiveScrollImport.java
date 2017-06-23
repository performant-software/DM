package edu.drew.dm.util;

import edu.drew.dm.rdf.Models;
import edu.drew.dm.rdf.Content;
import edu.drew.dm.rdf.OpenArchivesTerms;
import edu.drew.dm.rdf.Perm;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.DC_11;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.io.File;
import java.io.FilterWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.function.Function;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class InteractiveScrollImport {

    public static void main(String[] args) {
        final File dataDir = Stream.of(args).map(File::new).filter(File::isDirectory).findFirst().orElseThrow(IllegalArgumentException::new);

        final Model model = Models.create();

        final File[] tripleFiles = dataDir.listFiles(f -> {
            return f.getName().endsWith(".ttl");
        });

        for (File tripleFile : tripleFiles) {
            model.read(tripleFile.toURI().toString());
        }

        model.removeAll(null, OpenArchivesTerms.isDescribedBy, null);

        Models.renameResources(model, (Function<Resource, String>) resource -> {
            try {
                final String uri = resource.getURI();
                return uri.startsWith("file:") ? new URI("image", uri.substring(uri.lastIndexOf("/") + 1), null).toString() : uri;
            } catch (URISyntaxException e) {
                throw new RuntimeException(e);
            }
        });

        model.listSubjectsWithProperty(RDF.type, DCTypes.Text)
                .forEachRemaining(text -> {
                    text.addProperty(RDF.type, Content.ContentAsText);
                    text.addProperty(RDFS.label, text.getRequiredProperty(DC_11.title).getObject().asLiteral().getString());
                });

        model.listSubjectsWithProperty(RDF.type, FOAF.Project)
                .forEachRemaining(project -> {
                    project.removeAll(DC_11.title);

                    project.addProperty(RDFS.label, "Interactive Scrolls");
                    project.addProperty(DC_11.title, "Interactive Scrolls");

                    model.add(
                            model.createResource("user:lou"),
                            Perm.hasPermissionOver,
                            project
                    );
                });


        try (final FilterWriter writer = new FilterWriter(new PrintWriter(System.out)) {
            @Override
            public void close() throws IOException {
                this.out.flush();
            }
        }) {
            model.write(writer, "N3");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
