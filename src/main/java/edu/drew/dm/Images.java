package edu.drew.dm;

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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Images {

    public static Model identifiers2Locators(Model model, UriInfo ui) {
        return Models.renameResources(model, (r -> {
            final String uri = r.getURI();
            final URI parsed = URI.create(uri);
            return "image".equals(parsed.getScheme()) ? imageResource(ui, parsed.getSchemeSpecificPart()) : uri;
        }));
    }

    public static String locators2Identifiers(Resource resource) {
        try {
            final String uri = resource.getURI();
            final Matcher imageMatcher = IMAGE_URI.matcher(uri);
            return imageMatcher.find() ? new URI("image", imageMatcher.group(1), null).toString() : uri;
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    public static String imageResource(UriInfo ui, String path) {
        return Server.baseUri(ui)
                .path("/images")
                .path(path)
                .build().toString();
    }

    public static Resource imageResource(Model model, String name) {
        try {
            return model.createResource(new URI("image", name, null).toString());
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    private static final Pattern IMAGE_URI = Pattern.compile("media/user_images/(.+)$");

    public static File create(SemanticStore store, String fileName, InputStream contents) throws IOException {
        final HashSet<String> existing = new HashSet<>(Arrays.asList(store.getImages().list()));

        for (int fn = 0; fn < 1000; fn++) {
            if (existing.contains(fileName)) {
                if (fn > 0) {
                    fileName = String.format("%d_%s", fn, fileName);
                }
                continue;
            }
            final File file = new File(store.getImages(), fileName);
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
