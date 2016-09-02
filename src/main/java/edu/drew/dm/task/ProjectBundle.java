package edu.drew.dm.task;

import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.http.Images;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.util.IO;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ResIterator;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class ProjectBundle {

    private static final String TTL_ENTRY_NAME = "project.ttl";

    public static void read(SemanticDatabase db, Images images, InputStream inputStream) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(new IO.NonClosingInputStream(inputStream))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                final String entryName = entry.getName();
                if (!TTL_ENTRY_NAME.equals(entryName)) {
                    final File imageFile = images.imageFile(entryName);
                    if (!imageFile.isFile()) {
                        try (BufferedOutputStream fileStream = new BufferedOutputStream(new FileOutputStream(imageFile))) {
                            IO.copy(new IO.NonClosingInputStream(zip), fileStream);
                        }
                    }
                } else {
                    final Model project = Models.create();
                    RDFDataMgr.read(project, inputStream, Lang.NQUADS);
                    db.merge(project);
                }
            }
        }
    }

    public static void write(Images images, Model project, OutputStream outputStream) throws IOException {
        final long now = System.currentTimeMillis();

        try (ZipOutputStream zip = new ZipOutputStream(new IO.NonClosingOutputStream(outputStream))) {
            zip.setLevel(Deflater.BEST_COMPRESSION);

            for (final ResIterator projectImages = project.listSubjectsWithProperty(RDF.type, DCTypes.Image); projectImages.hasNext(); ) {
                final File imageFile = images.imageFile(projectImages.next());

                try (BufferedInputStream imageStream = new BufferedInputStream(new FileInputStream(imageFile))) {
                    final ZipEntry imageEntry = new ZipEntry(imageFile.getName());
                    imageEntry.setTime(imageFile.lastModified());
                    zip.putNextEntry(imageEntry);
                    IO.copy(imageStream, zip);
                    zip.closeEntry();
                }
            }

            final ZipEntry ttlEntry = new ZipEntry(TTL_ENTRY_NAME);
            ttlEntry.setTime(now);
            zip.putNextEntry(ttlEntry);
            RDFDataMgr.write(new IO.NonClosingOutputStream(zip), project, Lang.NQUADS);
            zip.closeEntry();
        }
    }
}
