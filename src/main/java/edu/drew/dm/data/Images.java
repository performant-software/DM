package edu.drew.dm.data;

import edu.drew.dm.Logging;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.Server;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.ws.rs.core.UriInfo;
import java.awt.Dimension;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author <a href="http://gregor.middelbl.net/">Gregor Middell</a>
 */
public class Images {

    private static final Logger LOG = Logging.inClass(Images.class);

    public final File baseDirectory;

    public Images(FileSystem fs) {
        this.baseDirectory = fs.images();
    }

    public File create(String fileName, InputStream contents) throws IOException {
        final HashSet<String> existing = new HashSet<>(Arrays.asList(baseDirectory.list()));

        for (int fn = 0; fn < 1000; fn++) {
            if (existing.contains(fileName)) {
                if (fn > 0) {
                    fileName = String.format("%d_%s", fn, fileName);
                }
                continue;
            }
            final File file = new File(baseDirectory, fileName);
            try (BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(file))) {
                while (true) {
                    int read = contents.read();
                    if (read == -1) {
                        break;
                    }
                    out.write(read);
                }
            }
            return file;
        }
        throw new IllegalStateException();
    }

    public void delete(Resource resource) {
        final File image = new File(baseDirectory, URI.create(resource.getURI()).getSchemeSpecificPart());
        if (image.isFile()) {
            final boolean deleted = image.delete();
            LOG.fine(() -> String.format("Delete %s: %s", image, deleted));
        }
    }

    public static String internalize(Resource resource) {
        try {
            final String uri = resource.getURI();
            final Matcher imageMatcher = IMAGE_URI.matcher(uri);
            return imageMatcher.find() ? new URI("image", imageMatcher.group(1), null).toString() : uri;
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    public static void externalize(Model model, UriInfo ui) {
        Models.renameResources(model, (r -> {
            final String uri = r.getURI();
            final URI parsed = URI.create(uri);
            if (!"image".equals(parsed.getScheme())) {
                return uri;
            }
            return Server.baseUri(ui)
                    .path("/images")
                    .path(parsed.getSchemeSpecificPart())
                    .build().toString();
        }));
    }

    public static Resource imageResource(Model model, String name) {
        try {
            return model.createResource(new URI("image", name, null).toString());
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    private static final Pattern IMAGE_URI = Pattern.compile("media/user_images/(.+)$");

    public static Dimension dimension(File imageFile) throws IOException {
        try (ImageInputStream imageInputStream = ImageIO.createImageInputStream(imageFile)) {
            final Iterator<ImageReader> imageReaders = ImageIO.getImageReaders(imageInputStream);
            ImageReader imageReader = null;
            try {
                if (imageReaders.hasNext()) {
                    imageReader = imageReaders.next();
                    imageReader.setInput(imageInputStream);
                    return new Dimension(
                            imageReader.getWidth(0),
                            imageReader.getHeight(0)
                    );
                }
            } finally {
                if (imageReader != null) {
                    imageReader.dispose();
                }
            }
        }
        throw new IllegalArgumentException(imageFile.toString());
    }
}
