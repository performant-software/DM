package edu.drew.dm.http;

import edu.drew.dm.auth.AuthenticationProviderRegistry;
import freemarker.template.Configuration;
import org.glassfish.jersey.server.ContainerRequest;
import org.glassfish.jersey.server.mvc.freemarker.FreemarkerDefaultConfigurationFactory;
import org.jvnet.hk2.annotations.Optional;

import java.net.URI;
import java.util.HashMap;
import javax.inject.Inject;
import javax.servlet.ServletContext;
import javax.ws.rs.core.Context;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Templates {

    private final AuthenticationProviderRegistry authenticationProviders;
    private final ContainerRequest request;

    @Inject
    public Templates(AuthenticationProviderRegistry authenticationProviders, @Context ContainerRequest request) {
        this.authenticationProviders = authenticationProviders;
        this.request = request;
    }


    public Model model() {
        final URI baseUri = request.getUriInfo().getBaseUri();

        return new Model()
                .add("local", baseUri.getHost().startsWith("localhost"))
                .add("cp", baseUri.getRawPath().replaceAll("/$", ""))
                .add("authenticationProviders", authenticationProviders)
                .add("user", request.getSecurityContext());
    }

    private static class Model extends HashMap<String, Object> {

        public Model add(String key, Object value) {
            put(key, value);
            return this;
        }
        
    }

    public static class ConfigurationFactory extends FreemarkerDefaultConfigurationFactory {

        @Inject
        public ConfigurationFactory(@Optional ServletContext servletContext) {
            super(servletContext);
            configuration.setURLEscapingCharset("UTF-8");
        }
        
    }
}
