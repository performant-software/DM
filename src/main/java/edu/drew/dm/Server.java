package edu.drew.dm;

import org.glassfish.grizzly.http.server.CLStaticHttpHandler;
import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.jersey.grizzly2.httpserver.GrizzlyHttpServerFactory;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.server.mvc.freemarker.FreemarkerMvcFeature;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.RedirectionException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriBuilder;
import javax.ws.rs.core.UriInfo;
import java.io.IOException;
import java.io.InputStream;
import java.util.logging.LogManager;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Server {

    public static void main(String[] args) throws IOException {
        if (System.getProperty("java.util.logging.config.file", "").isEmpty()) {
            try (InputStream logConfig = Server.class.getResourceAsStream("/logging.properties")) {
                LogManager.getLogManager().readConfiguration(logConfig);
            }
        }

        final String contextPath = "";
        final int port = 8080;

        final HttpServer server = GrizzlyHttpServerFactory.createHttpServer(
                UriBuilder.fromUri("http://localhost/").path(contextPath + "/").port(port).build(),
                new ResourceConfig()
                        .register(FreemarkerMvcFeature.class)
                        .property(FreemarkerMvcFeature.TEMPLATE_BASE_PATH, "/template/")
                        .register(Root.class)
                        .register(Workspace.class)
        );

        server.getServerConfiguration().addHttpHandler(
                new CLStaticHttpHandler(Server.class.getClassLoader(), "/static/"),
                contextPath + "/static"
        );

        server.start();
    }

    @Path("/")
    public static class Root {

        @GET
        public Response redirect(@Context UriInfo ui) {
            return Response.status(Response.Status.TEMPORARY_REDIRECT)
                    .location(ui.getBaseUriBuilder().path(Workspace.class).build())
                    .build();
        }

    }

}
