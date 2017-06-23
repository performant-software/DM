package edu.drew.dm;

import org.glassfish.jersey.server.mvc.Template;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import java.util.Map;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/workspace/")
public class WorkspaceResource {
    
    private final Templates templates;

    @Inject
    public WorkspaceResource(Templates templates) {
        this.templates = templates;
    }

    @GET
    @Produces("text/html")
    @Template(name = "/workspace.ftl")
    public Map<String, Object> workspace() {
        return templates.model();
    }

    @Path("project_forward/")
    public Response projectForward() {
        throw Server.NOT_IMPLEMENTED;

    }

    @Path("add_image/")
    public Response addImage() {
        throw Server.NOT_IMPLEMENTED;

    }

    @Path("upload_image/")
    public Response uploadImage() {
        throw Server.NOT_IMPLEMENTED;
    }

    public static Response redirectTo(UriInfo ui) {
        return Response.temporaryRedirect(Server.baseUri(ui).path(WorkspaceResource.class).build()).build();
    }
}
