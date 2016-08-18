package edu.drew.dm.http;

import edu.drew.dm.Logging;
import edu.drew.dm.Server;
import edu.drew.dm.data.FileSystem;
import edu.drew.dm.semantics.Models;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.glassfish.grizzly.http.server.Request;
import org.glassfish.grizzly.http.server.Response;
import org.glassfish.grizzly.http.server.StaticHttpHandler;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.ws.rs.core.UriInfo;
import java.awt.Dimension;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author <a href="http://gregor.middelbl.net/">Gregor Middell</a>
 */
public class Images extends StaticHttpHandler {

    private static final Logger LOG = Logging.inClass(Images.class);

    private static final int THUMBNAIL_SIZE = 100;

    public final File baseDirectory;

    private final String convertPath;

    public Images(FileSystem fs) {
        super(fs.images().getPath());
        setFileCacheEnabled(false);
        this.baseDirectory = fs.images();
        this.convertPath = detectConvertPath();
    }

    @Override
    protected boolean handle(String uri, Request request, Response response) throws Exception {
        final File imageFile = (uri == null ? null : new File(baseDirectory, uri));
        if (imageFile == null || !imageFile.canRead()) {
            return super.handle(uri, request, response);
        }
        final String widthStr = request.getParameter("w");
        final String heightStr = request.getParameter("h");
        if (widthStr == null || heightStr == null) {
            return super.handle(uri, request, response);
        }

        final int width = Integer.parseInt(widthStr);
        final int height = Integer.parseInt(heightStr);

        uri = thumbnailOf(imageFile)
                .filter(thumb -> width < THUMBNAIL_SIZE && height < THUMBNAIL_SIZE)
                .map(thumb -> {
                    final String thumbUri = baseDirectory.toPath().relativize(thumb.toPath()).toString();
                    return thumbUri;
                })
                .orElse(uri);

        return super.handle(uri, request, response);
    }

    private static String detectConvertPath() {
        for (String detectionCommand : new String[] { "which convert", "where convert.exe" }) {
            try {

                final Process process = Runtime.getRuntime().exec(detectionCommand);
                try (BufferedReader processReader = new BufferedReader(new InputStreamReader(process.getInputStream(), Charset.defaultCharset()))) {
                    final CompletableFuture<Optional<String>> path = CompletableFuture.supplyAsync(() -> processReader.lines()
                            .map(String::trim)
                            .filter(l -> l.toLowerCase().contains("convert"))
                            .findFirst());
                    process.waitFor();
                    final String convertPath = path.get().get();
                    LOG.info(() -> "Detected ImageMagick's convert at '" + convertPath + "'");
                    return convertPath;
                }
            } catch (Throwable t) {
                LOG.log(Level.FINE, detectionCommand, t);
            }
        }
        return null;
    }

    public Optional<File> thumbnailOf(File image) throws IOException {
        final File thumbnail = thumbnailFileOf(image);

        if (!thumbnail.isFile() && convertPath != null) {
            synchronized (this) {
                final Process convert = new ProcessBuilder(
                        convertPath,
                        image.getPath(),
                        "-resize",
                        String.format("%dx%d", THUMBNAIL_SIZE, THUMBNAIL_SIZE),
                        thumbnail.getPath()
                ).start();
                try {
                    convert.waitFor();
                } catch (InterruptedException e) {
                    // ignored
                }
            }
        }

        return Optional.of(thumbnail).filter(File::exists);
    }

    public File thumbnailFileOf(File image) {
        final String[] fileNameComponents = imageFileNameComponents(image);
        return new File(image.getParentFile(), String.format("%s_thumb.%s", fileNameComponents));
    }

    private static String[] imageFileNameComponents(File image) {
        final String imageFileName = image.getName();

        final int dotIdx = imageFileName.lastIndexOf('.');
        if (dotIdx > 0 && dotIdx < (imageFileName.length() - 1)) {
            return new String[] {
                imageFileName.substring(0, dotIdx),
                imageFileName.substring(dotIdx + 1)
            };
        }
        throw new IllegalArgumentException(image.toString());
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

            thumbnailOf(file).orElseThrow(IllegalArgumentException::new);
            return file;
        }
        throw new IllegalStateException();
    }

    public void delete(Resource resource) {
        final File image = new File(baseDirectory, URI.create(resource.getURI()).getSchemeSpecificPart());

        final Boolean imageDeleted = Optional.of(image).filter(File::isFile).map(File::delete).orElse(false);
        final boolean thumbnailDeleted = Optional.of(thumbnailFileOf(image)).filter(File::isFile).map(File::delete).orElse(false);

        LOG.fine(() -> String.format("Delete %s: %s/%s", image, imageDeleted, thumbnailDeleted));
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
