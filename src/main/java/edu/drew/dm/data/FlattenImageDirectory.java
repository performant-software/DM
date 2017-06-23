package edu.drew.dm.data;

import edu.drew.dm.Logging;
import edu.drew.dm.rdf.Models;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class FlattenImageDirectory {

    private static final Logger LOG = Logging.inClass(FlattenImageDirectory.class);

    public static void execute(Images images, SemanticDatabase db) throws IOException {
        final Path basePath = images.baseDirectory.toPath();

        final Path[] imagePaths = Files.walk(basePath)
                .map(Path::toFile).filter(File::isFile).map(File::toPath)
                .filter(p -> !p.getParent().equals(basePath))
                .toArray(Path[]::new);

        final Map<String, String> moved = new HashMap<>();
        for (Path imagePath : imagePaths) {
            final Path imageFileName = imagePath.getFileName();
            Files.move(imagePath, basePath.resolve(imageFileName));
            moved.put(basePath.relativize(imagePath).toString(), imageFileName.toString());
        }

        if (moved.isEmpty()) {
            return;
        }

        moved.forEach((from, to) -> LOG.info(() -> String.format("%s --> %s", from, to)));
        db.write(ds -> Models.renameResources(ds.getDefaultModel(), r -> {
            final String resourceUri = r.getURI();
            final URI uri = URI.create(resourceUri);
            if (!"image".equals(uri.getScheme())) {
                return resourceUri;
            }
            final String to = moved.get(uri.getSchemeSpecificPart());
            return (to == null ? resourceUri : Images.imageUri(to));
        }));
    }
}
