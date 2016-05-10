package edu.drew.dm;

import it.sauronsoftware.cron4j.Scheduler;
import joptsimple.NonOptionArgumentSpec;
import joptsimple.OptionParser;
import joptsimple.OptionSet;
import joptsimple.OptionSpec;
import joptsimple.ValueConverter;
import joptsimple.util.PathConverter;
import org.glassfish.grizzly.http.server.CLStaticHttpHandler;
import org.glassfish.grizzly.http.server.HttpHandlerRegistration;
import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.grizzly.http.server.ServerConfiguration;
import org.glassfish.grizzly.http.server.StaticHttpHandler;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.grizzly2.httpserver.GrizzlyHttpServerFactory;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.server.mvc.freemarker.FreemarkerMvcFeature;

import javax.ws.rs.GET;
import javax.ws.rs.ServiceUnavailableException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriBuilder;
import javax.ws.rs.core.UriInfo;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Server {

    private static final OptionParser OPTION_PARSER = new OptionParser();

    private static final OptionSpec<Void> HELP_OPT = OPTION_PARSER.accepts("help").forHelp();

    private static final OptionSpec<Path> DATA_DIR_OPT = OPTION_PARSER
            .accepts("data").withRequiredArg().withValuesConvertedBy(new PathConverter()).defaultsTo(Paths.get("dm"));

    private static final OptionSpec<Integer> PORT_OPT = OPTION_PARSER
            .accepts("port").withRequiredArg().ofType(Integer.class).defaultsTo(8080);

    private static final OptionSpec<String> CONTEXT_PATH_OPT = OPTION_PARSER
            .accepts("context-path").withRequiredArg().ofType(String.class).defaultsTo("")
            .withValuesConvertedBy(new ValueConverter<String>() {
                @Override
                public String convert(String value) {
                    return value.replaceAll("/$", "");
                }

                @Override
                public Class<? extends String> valueType() {
                    return String.class;
                }

                @Override
                public String valuePattern() {
                    return null;
                }
            });

    public static final NonOptionArgumentSpec<Path> INIT_FILES_OPT = OPTION_PARSER.nonOptions()
            .withValuesConvertedBy(new PathConverter());


    public static void main(String[] args) throws Exception {
        final OptionSet optionSet = OPTION_PARSER.parse(args);
        if (optionSet.has(HELP_OPT)) {
            OPTION_PARSER.printHelpOn(System.err);
            return;
        }

        Logging.configure();

        final SemanticStore semanticStore = semanticStore(optionSet);

        scheduler().schedule("0 */12 * * *", semanticStore.datasetDumpTask());

        httpServer(optionSet, semanticStore);

        Thread.sleep(Long.MAX_VALUE);
    }

    private static void shutdownHook(Runnable hook) {
        Runtime.getRuntime().addShutdownHook(new Thread(hook));
    }

    private static SemanticStore semanticStore(OptionSet optionSet) {
        final File storeDir = DATA_DIR_OPT.value(optionSet).toFile();
        final List<String> initialData = INIT_FILES_OPT.values(optionSet)
                .stream().map(p -> p.toUri().toString()).collect(Collectors.toList());

        final SemanticStore semanticStore = new SemanticStore(storeDir).withInitialData(initialData);
        shutdownHook(semanticStore::close);

        return semanticStore;
    }

    private static Scheduler scheduler() {
        final Scheduler scheduler = new Scheduler();
        scheduler.setDaemon(true);
        scheduler.start();
        shutdownHook(scheduler::stop);
        return scheduler;
    }

    private static HttpServer httpServer(OptionSet optionSet, SemanticStore semanticStore) throws IOException {
        final ResourceConfig webAppConfig = new ResourceConfig()
                .register(FreemarkerMvcFeature.class)
                .property(FreemarkerMvcFeature.TEMPLATE_BASE_PATH, "/template/")
                .register(new AbstractBinder() {
                    @Override
                    protected void configure() {
                        bind(semanticStore).to(SemanticStore.class);
                    }
                })
                .register(Models.Reader.class)
                .register(Models.Writer.class)
                .register(Authentication.class)
                .register(Logout.class)
                .register(Root.class)
                .register(Users.class)
                .register(Projects.class)
                .register(Workspace.class);

        final URI base = UriBuilder.fromUri("http://localhost/")
                .path(CONTEXT_PATH_OPT.value(optionSet) + "/")
                .port(PORT_OPT.value(optionSet))
                .build();

        final HttpServer server = GrizzlyHttpServerFactory.createHttpServer(base, webAppConfig);

        final String contextPath = optionSet.valueOf(CONTEXT_PATH_OPT);
        final ServerConfiguration serverConfig = server.getServerConfiguration();

        serverConfig.addHttpHandler(
                new CLStaticHttpHandler(Server.class.getClassLoader(), "/static/"),
                HttpHandlerRegistration.builder().contextPath(contextPath + "/static").build()
        );
        serverConfig.addHttpHandler(
                new StaticHttpHandler(semanticStore.getImages().getAbsolutePath()),
                HttpHandlerRegistration.builder().contextPath(contextPath + "/media/user_images/uploaded_images").build()
        );

        shutdownHook(server::shutdown);
        server.start();

        return server;
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

}
