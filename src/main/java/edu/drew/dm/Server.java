package edu.drew.dm;

import au.com.bytecode.opencsv.CSVReader;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import edu.drew.dm.data.FileSystem;
import edu.drew.dm.data.Index;
import edu.drew.dm.data.ProjectBundle;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.http.Accounts;
import edu.drew.dm.http.Authentication;
import edu.drew.dm.http.Canvases;
import edu.drew.dm.http.Images;
import edu.drew.dm.http.Locks;
import edu.drew.dm.http.ModelReaderWriter;
import edu.drew.dm.http.Projects;
import edu.drew.dm.http.Texts;
import edu.drew.dm.http.Users;
import edu.drew.dm.http.Workspace;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.semantics.OpenAnnotation;
import edu.drew.dm.semantics.SharedCanvas;
import edu.drew.dm.task.FlattenImageDirectory;
import edu.drew.dm.task.Indexing;
import edu.drew.dm.task.SemanticDatabaseBackup;
import edu.drew.dm.task.UserbaseInitialization;
import it.sauronsoftware.cron4j.Scheduler;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.ResIterator;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.util.iterator.ExtendedIterator;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.glassfish.grizzly.http.CompressionConfig;
import org.glassfish.grizzly.http.server.CLStaticHttpHandler;
import org.glassfish.grizzly.http.server.HttpHandlerRegistration;
import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.grizzly.http.server.NetworkListener;
import org.glassfish.grizzly.http.server.ServerConfiguration;
import org.glassfish.hk2.utilities.Binder;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.grizzly2.httpserver.GrizzlyHttpServerFactory;
import org.glassfish.jersey.jackson.JacksonFeature;
import org.glassfish.jersey.media.multipart.MultiPartFeature;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.server.mvc.freemarker.FreemarkerMvcFeature;

import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.ServiceUnavailableException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriBuilder;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.ext.ContextResolver;

import static edu.drew.dm.semantics.OpenAnnotation.SpecificResource;
import static edu.drew.dm.semantics.OpenAnnotation.hasBody;
import static edu.drew.dm.semantics.OpenAnnotation.hasSource;
import static edu.drew.dm.semantics.OpenAnnotation.hasTarget;
import static edu.drew.dm.semantics.SharedCanvas.Canvas;
import static org.apache.jena.vocabulary.DCTypes.Text;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Server {

    public static void main(String[] args) throws Exception {
        Logging.configure();
        final Logger log = Logging.inClass(Server.class);

        final Config config = ConfigFactory.load();
        log.fine(() -> String.format(
                "Configuration: %s",
                config.root().render()
        ));
        
        final File storeDir = new File(config.getString("data.dir"));
        final FileSystem fs = new FileSystem(storeDir);

        final SemanticDatabase db = new SemanticDatabase(fs);
        shutdownHook(db::close);

        final Images images = new Images(fs);
        FlattenImageDirectory.execute(images, db);

        if (db.isEmpty()) {
            for (String arg : args) {
                final Path file = Paths.get(arg);
                try (ProjectBundle bundle = ProjectBundle.create(file)) {
                    log.info(() -> String.format("Import project from %s", file));
                    bundle.writeTo(db, images);
                }
            }
        }

        UserbaseInitialization.initGuestAccess(db);
        try (CSVReader usersCsv = new CSVReader(new InputStreamReader(Server.class.getResourceAsStream("/users.csv"), StandardCharsets.UTF_8))) {
            UserbaseInitialization.execute(db, usersCsv);
        }
        if (config.hasPath("auth.users")) {
            final Path users = Paths.get(config.getString("auth.users"));
            if (users != null) {
                try (CSVReader usersCsv = new CSVReader(Files.newBufferedReader(users))) {
                    UserbaseInitialization.execute(db, usersCsv);
                }
            }
        }

        final Index index = new Index(fs, db).initialized();
        
        final Scheduler scheduler = scheduler();
        scheduler.schedule("0 * * * *", new SemanticDatabaseBackup(fs, db));
        scheduler.schedule("* * * * *", new Indexing(db, index));

        httpServer(config, images, new AbstractBinder() {
            @Override
            protected void configure() {
                bind(db).to(SemanticDatabase.class);
                bind(index).to(Index.class);
                bind(images).to(Images.class);
            }
        });

        Thread.sleep(Long.MAX_VALUE);
    }

    private static void shutdownHook(Runnable hook) {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                hook.run();
            } catch (Throwable t) {
                t.printStackTrace();
            }
        }));
    }

    private static Scheduler scheduler() {
        final Scheduler scheduler = new Scheduler();
        scheduler.setDaemon(true);
        scheduler.start();
        shutdownHook(scheduler::stop);
        return scheduler;
    }

    private static HttpServer httpServer(Config config, Images images, Binder dependencyBinder) throws IOException {
        final ObjectMapper objectMapper = new ObjectMapper();
        final ResourceConfig webAppConfig = new ResourceConfig()
                .register(FreemarkerMvcFeature.class)
                .property(FreemarkerMvcFeature.TEMPLATE_BASE_PATH, "/template/")
                .register(JacksonFeature.class)
                .register(MultiPartFeature.class)
                .register(dependencyBinder)
                .register(new AbstractBinder() {
                    @Override
                    protected void configure() {
                        bind(objectMapper).to(ObjectMapper.class);
                    }
                })
                .register((ContextResolver<ObjectMapper>) type -> objectMapper)
                .register(ModelReaderWriter.class)
                .register(Authentication.class)
                .register(Accounts.class)
                .register(Root.class)
                .register(Workspace.class)
                .register(Locks.class)
                .register(Users.class)
                .register(Projects.class)
                .register(Canvases.class)
                .register(Texts.class)
                .register(Debug.class);

        final String contextPath = config.getString("http.context-path").replaceAll("/+$", "");

        final URI base = UriBuilder.fromUri("http://0.0.0.0/")
                .path(contextPath + "/")
                .port(config.getInt("http.port"))
                .build();

        final HttpServer server = GrizzlyHttpServerFactory.createHttpServer(base, webAppConfig, false);

        for (NetworkListener listener : server.getListeners()) {
            // use an unbounded worker thread pool, assuming that handler work is mostly I/O bound
            listener.getTransport().getWorkerThreadPoolConfig().setMaxPoolSize(Integer.MAX_VALUE);

            if (config.getBoolean("http.gzip")) {
                final CompressionConfig compressionConfig = listener.getCompressionConfig();
                compressionConfig.setCompressionMode(CompressionConfig.CompressionMode.ON);
                compressionConfig.setCompressionMinSize(860); // http://webmasters.stackexchange.com/questions/31750/what-is-recommended-minimum-object-size-for-gzip-performance-benefits
                compressionConfig.setCompressableMimeTypes("application/javascript", "application/json", "application/xml", "text/css", "text/html", "text/javascript", "text/plain", "text/turtle", "text/xml");
            }
        }

        final ServerConfiguration serverConfig = server.getServerConfiguration();

        serverConfig.addHttpHandler(
                new CLStaticHttpHandler(Server.class.getClassLoader(), "/static/"),
                HttpHandlerRegistration.builder().contextPath(contextPath + "/static").build()
        );
        serverConfig.addHttpHandler(
                images,
                HttpHandlerRegistration.builder().contextPath(contextPath + "/images").build()
        );

        shutdownHook(server::shutdown);
        server.start();

        return server;
    }

    public static UriBuilder baseUri(UriInfo ui) {
        final URI baseUri = ui.getBaseUri();

        final int port = baseUri.getPort();
        final String scheme = baseUri.getScheme();

        final boolean standardPort = (
                "http".equals(scheme) && port == 80 || "https".equals(scheme) && port == 443
        );

        return ui.getBaseUriBuilder().port(standardPort ? -1 : port);
    }

    public static final ServiceUnavailableException NOT_IMPLEMENTED = new ServiceUnavailableException("Not implemented");

    @javax.ws.rs.Path("/")
    public static class Root {

        @GET
        public Response redirect(@Context UriInfo ui) {
            return Response.status(Response.Status.TEMPORARY_REDIRECT)
                    .location(ui.getBaseUriBuilder().path(Workspace.class).build())
                    .build();
        }

    }

    @javax.ws.rs.Path("/debug")
    public static class Debug {

        private final SemanticDatabase db;

        @Inject
        public Debug(SemanticDatabase db) {
            this.db = db;
        }

        @javax.ws.rs.Path("/orphans")
        @GET
        public Model orphanedTexts() {
            return db.read((source, target) -> {
                for (Resource type : Arrays.asList(Text, SpecificResource, Canvas)) {
                    ExtendedIterator<Resource> it = source.listResourcesWithProperty(RDF.type, type);
                    for (Property annotationRelation : Arrays.asList(hasSource, hasBody, hasTarget)) {
                        it = it.filterDrop(r -> source.listResourcesWithProperty(annotationRelation, r).hasNext());
                    }
                    it.forEachRemaining(r -> target.add(r.listProperties()));
                }
            });
        }
    }


}
