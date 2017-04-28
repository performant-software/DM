package edu.drew.dm.data;

import edu.drew.dm.http.Images;
import edu.drew.dm.http.ModelReaderWriter;
import edu.drew.dm.http.Projects;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.util.IO;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Stream;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import static java.util.stream.Collectors.groupingBy;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class ProjectBundle implements Closeable {

    private static final Lang RDF_LANG = Lang.TTL;
    private static final String RDF_ENTRY = "project.ttl";

    private final Path dir;

    public ProjectBundle() throws IOException {
        this(Files.createTempDirectory(ProjectBundle.class.getName()));
    }

    public ProjectBundle(Path dir) {
        this.dir = dir;
    }

    public Stream<Path> contents() throws IOException {
        return Files.walk(dir).sorted().filter(Files::isRegularFile);
    }

    public Stream<Path> tripleFiles() throws IOException {
        return contents().filter(ProjectBundle::isTurtleFile);
    }

    public Stream<Path> imagesFiles() throws IOException {
        return contents().filter(((Predicate<Path>) ProjectBundle::isTurtleFile).negate());
    }

    public void writeTo(SemanticDatabase db, Images images) throws IOException {
        final Model project = Models.create();

        for (Path tripleFile : tripleFiles().toArray(Path[]::new)) {
            try (InputStream tripleStream = Files.newInputStream(tripleFile)) {
                project.read(tripleStream, "", RDF_LANG.getName());
            }
        }

        ModelReaderWriter.internalize(project);

        final Map<String, List<Path>> bundledImages = imagesFiles()
                .collect(groupingBy(img -> img.toFile().getName()));

        bundledImages.keySet().retainAll(referencedImages(project));

        final Map<String, String> renamedImages = new HashMap<>();
        for (Map.Entry<String, List<Path>> image : bundledImages.entrySet()) {
            final String imageName = image.getKey();
            final Path firstImageFile = image.getValue().get(0);
            try (InputStream imageStream = Files.newInputStream(firstImageFile)) {
                final String importedName = images.create(imageName, imageStream).getName();
                if (!importedName.equals(imageName)) {
                    renamedImages.put(imageName, importedName);
                }
            }
        }
        if (!renamedImages.isEmpty()) {
            Models.renameResources(project, r -> {
                final String uri = r.getURI();
                final URI parsed = URI.create(uri);
                if (!"image".equals(parsed.getScheme())) {
                    return uri;
                }
                final String imageName = parsed.getSchemeSpecificPart();
                return Images.imageUri(renamedImages.getOrDefault(imageName, imageName));
            });
        }

        db.merge(project);
    }

    public void asZip(OutputStream stream) throws IOException {
        final long now = System.currentTimeMillis();

        try (ZipOutputStream zip = new ZipOutputStream(new IO.NonClosingOutputStream(stream))) {
            zip.setLevel(Deflater.BEST_COMPRESSION);

            for (Path content : contents().toArray(Path[]::new)) {
                final ZipEntry zipEntry = new ZipEntry(dir.relativize(content).toString());
                zipEntry.setTime(now);
                zip.putNextEntry(zipEntry);
                Files.copy(content, new IO.NonClosingOutputStream(zip));
                zip.closeEntry();
            }
        }
    }

    @Override
    public void close() throws IOException {
        IO.delete(dir);
    }

    public static ProjectBundle create(Path file) throws IOException {
        if (!Files.isRegularFile(file)) {
            throw new IllegalArgumentException(file.toString());
        }
        if (isZipFile(file)) {
            final ProjectBundle bundle = new ProjectBundle();
            try (ZipInputStream zip = new ZipInputStream(Files.newInputStream(file))) {
                ZipEntry entry;
                while ((entry = zip.getNextEntry()) != null) {
                    if (entry.isDirectory()) {
                        continue;
                    }

                    final Path target = bundle.dir.resolve(entry.getName());

                    IO.directory(target.getParent());
                    Files.copy(new IO.NonClosingInputStream(zip), target);
                }
            }
            return bundle;
        } else if (isTurtleFile(file)) {
            final ProjectBundle bundle = new ProjectBundle();
            Files.copy(file, bundle.dir.resolve(file.getFileName()));
            return bundle;
        }

        throw new IllegalArgumentException(file.toString());
    }

    public static ProjectBundle create(String projectUri, SemanticDatabase db, Images images) throws IOException {
        final Model project = db.read((source, target) -> Projects.SCOPE.copy(
                source.createResource(projectUri), target
        ));
        project.listSubjectsWithProperty(RDF.type, FOAF.Agent)
                .forEachRemaining(agent -> project.remove(agent.listProperties()));

        final ProjectBundle bundle = new ProjectBundle();

        try (OutputStream ttlStream = Files.newOutputStream(bundle.dir.resolve(RDF_ENTRY))) {
            RDFDataMgr.write(ttlStream, project, RDF_LANG);
        }

        for (String imageName : referencedImages(project)) {
            final Path source = images.imageFile(imageName).toPath();
            if (Files.isRegularFile(source)) {
                final Path target = bundle.dir.resolve(source.getFileName());
                Files.copy(source, target);
            }
        }

        return bundle;
    }

    private static boolean isZipFile(Path file) throws IOException {
        try (InputStream fileStream = Files.newInputStream(file)) {
            try (ZipInputStream zipStream = new ZipInputStream(fileStream)) {
                if (zipStream.getNextEntry() != null) {
                    return true;
                }
            } catch (IOException e) {
                return false;
            }
        }
        return false;
    }

    private static boolean isTurtleFile(Path path) {
        return path.toFile().getName().toLowerCase().endsWith(".ttl");
    }

    private static Set<String> referencedImages(Model project) {
        return project.listSubjectsWithProperty(RDF.type, DCTypes.Image)
                .mapWith(Resource::getURI)
                .filterKeep(uri -> "image".equals(URI.create(uri).getScheme()))
                .mapWith(Images::imageName)
                .toSet();
    }
}
