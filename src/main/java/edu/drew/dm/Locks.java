package edu.drew.dm;

import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/store/lock")
public class Locks {


    @Path("/{uri}")
    @GET
    public Response isLocked(@PathParam("uri") String uri) {
        return Response.ok("{\"locked\": \"false\"}", MediaType.APPLICATION_JSON_TYPE).build();

    }

    @Path("/{uri}")
    @POST
    public Response lock(@PathParam("uri") String uri) {
        return Response.ok().build();

    }

    @Path("/{uri}")
    @DELETE
    public Response unlock(@PathParam("uri") String uri) {
        return Response.ok().build();

    }

    @DELETE
    public Response unlockAll() {
        return Response.ok().build();
    }
}
