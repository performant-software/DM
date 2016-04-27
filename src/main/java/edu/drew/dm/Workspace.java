package edu.drew.dm;

import org.glassfish.jersey.server.mvc.Template;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.ServiceUnavailableException;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/workspace/")
public class Workspace {

    @GET
    @Produces("text/html")
    @Template(name = "/fluid_workspace/workspace.ftl")
    public Map<String, Object> workspace() {
        final Map<String, Object> model = new HashMap<>();
        model.put("cp", "");
        model.put("useCompiledJs", true);
        return model;
    }

    @Path("project_forward/")
    public Response projectForward() {
        throw new ServiceUnavailableException("Not implemented");

    }

    @Path("add_image/")
    public Response addImage() {
        throw new ServiceUnavailableException("Not implemented");
    }

    @Path("upload_image/")
    public Response uploadImage() {
        throw new ServiceUnavailableException("Not implemented");
    }
}
