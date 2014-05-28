from django.db import transaction, IntegrityError
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseForbidden
from django.contrib.auth.models import User

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import URIRef, Literal

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import NegotiatedGraphResponse, parse_request_into_graph, metadata_triples, print_triples
from semantic_store.users import PERMISSION_PREDICATES, user_graph, user_metadata_graph
from semantic_store.project_texts import sanitized_content, text_graph_from_model
from semantic_store import project_texts, canvases, permissions, manuscripts
from semantic_store.models import ProjectPermission

from datetime import datetime

PROJECT_TYPES = (NS.dcmitype.Collection, NS.ore.Aggregation, NS.foaf.Project, NS.dm.Project)

def get_project_graph(project_uri):
    """Returns the database graph used to store general information about the project with the given uri"""
    return Graph(store=rdfstore(), identifier=uris.uri('semantic_store_projects', uri=project_uri))

def get_project_metadata_graph(project_uri):
    """
    Returns the database graph used as a cache to be returned when just the project contents overview is requested
    This should essentially contain the project title and description, what it aggregates, and just enough information
    for a GUI to render those contents (titles for texts, titles and image annos for canvases, etc.)
    """
    return Graph(store=rdfstore(), identifier=uris.project_metadata_graph_identifier(project_uri))

def create_project_from_request(request):
    """Takes a graph via an http request, and creates a project in the database (and the metadata cache) from an input graph"""
    try:
        g = parse_request_into_graph(request)
    except (ParserError, SyntaxError) as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    create_project(g)
    return HttpResponse("Successfully created the project.")

def create_project(g):
    """Creates a project in the database (and the metadata cache) from an input graph"""
    query = g.query("""SELECT ?uri ?user
                    WHERE {
                        ?user perm:hasPermissionOver ?uri .
                        ?user rdf:type foaf:Agent .
                    }""", initNs=ns)

    for uri in g.subjects(NS.rdf.type, NS.dm.Project):
        user = g.value(None, NS.perm.hasPermissionOver, uri)
        user_obj = User.objects.get(username=user.split('/')[-1])

        project_identifier = uris.uri('semantic_store_projects', uri=uri)
        project_g = Graph(store=rdfstore(), identifier=project_identifier)

        for text_uri in g.subjects(NS.rdf.type, NS.dcmitype.Text):
            text_graph = Graph()
            text_graph += g.triples((text_uri, None, None))
            project_texts.update_project_text(text_graph, uri, text_uri, user_obj)

        for t in g:
            project_g.add(t)

        for text_uri in g.subjects(NS.rdf.type, NS.dcmitype.Text):
            project_g.remove((text_uri, NS.cnt.chars, None))

        url = uris.url('semantic_store_projects', uri=uri)
        project_g.set((uri, NS.dcterms['created'], Literal(datetime.utcnow())))

        if user:
            project_g.remove((user, None, None))
            username = user.split("/")[-1]
            permissions.grant_full_project_permissions(username, uri)

        add_project_types(project_g, uri)
        build_project_metadata_graph(uri)

        print "Successfully created project with uri " + uri

def add_is_described_bys(request, project_uri, graph):
    for text in graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        text_url = uris.url("semantic_store_project_texts", project_uri=project_uri, text_uri=text)
        graph.add((text, NS.ore.isDescribedBy, text_url))

    for canvas in graph.subjects(NS.rdf.type, NS.sc.Canvas):
        canvas_url = uris.url("semantic_store_project_canvases", project_uri=project_uri, canvas_uri=canvas)
        graph.add((canvas, NS.ore.isDescribedBy, canvas_url))

    for manuscript in graph.subjects(NS.rdf.type, NS.sc.Manifest):
        manuscript_url = uris.url("semantic_store_project_manuscripts", project_uri=project_uri, manuscript_uri=manuscript)
        graph.add((manuscript, NS.ore.isDescribedBy, manuscript_url))

def build_project_metadata_graph(project_uri):
    """
    Takes an entire project graph (with every triple in the project in it), and builds out the metadata cache graph with just
    enough information to render the project in a GUI.
    This should really only be called when importing a full project from a file, or to rebuild the cache. The cache should otherwise
    be maintained with each update, as it is very expensive to rebuild this cache.
    """
    metadata_graph = get_project_metadata_graph(project_uri)
    project_graph = get_project_graph(project_uri)

    metadata_graph += metadata_triples(project_graph, project_uri)

    for aggregate_uri in project_graph.objects(project_uri, NS.ore.aggregates):
        metadata_graph.add((project_uri, NS.ore.aggregates, aggregate_uri))

        if ((aggregate_uri, NS.rdf.type, NS.sc.Canvas) in project_graph or
            (aggregate_uri, NS.rdf.type, NS.dms.Canvas) in project_graph):
            for t in canvases.canvas_and_images_graph(project_graph, aggregate_uri):
                metadata_graph.add(t)
        elif (aggregate_uri, NS.rdf.type, NS.dcmitype.Text) in project_graph:
            for t in metadata_triples(project_graph, aggregate_uri):
                metadata_graph.add(t)
        else:
            for t in metadata_triples(project_graph, aggregate_uri):
                metadata_graph.add(t)

    return metadata_graph

def read_project(request, project_uri):
    """Returns a HttpResponse of the cached project metadata graph"""
    project_uri = URIRef(project_uri)

    if request.user.is_authenticated():
        if permissions.has_permission_over(project_uri, user=request.user, permission=NS.perm.mayRead):
            identifier = uris.uri('semantic_store_projects', uri=project_uri)
            store_metadata_graph = get_project_metadata_graph(project_uri)
            ret_graph = Graph()
            ret_graph += store_metadata_graph

            add_is_described_bys(request, project_uri, ret_graph)

            for permission in ProjectPermission.objects.filter(identifier=project_uri):
                user = permission.user
                user_uri = uris.uri('semantic_store_users', username=user.username)
                perm_uri = permissions.PERMISSION_URIS_BY_MODEL_VALUE[permission.permission]

                ret_graph += user_metadata_graph(user=user)
                ret_graph.add((user_uri, NS.perm.hasPermissionOver, project_uri))
                ret_graph.add((user_uri, perm_uri, project_uri))
            
            if len(ret_graph) > 0:
                return NegotiatedGraphResponse(request, ret_graph)
            else:
                return HttpResponseNotFound()
        else:
            return HttpResponseForbidden('User "%s" does not have read permissions over project "%s"' % (request.user.username, project_uri))
    else:
        return HttpResponse(status=401)


def update_project(request, uri):
    """Updates the project and metadata graph from a put or post request"""
    if request.user.is_authenticated():
        if permissions.has_permission_over(uri, user=request.user, permission=NS.perm.mayUpdate):
            try:
                input_graph = parse_request_into_graph(request)
            except (ParserError, SyntaxError) as e:
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

            update_project_graph(input_graph, URIRef(uri))

            return HttpResponse(status=204)
        else:
            return HttpResponseForbidden('User "%s" does not have update permissions over project "%s"' % (request.user.username, uri))
    else:
        return HttpResponse('Unauthorized', status=401)

def update_project_graph(g, identifier):
    """Updates the main project graph and the metadata graph from an input graph"""

    uri = uris.uri('semantic_store_projects', uri=identifier)

    project_g = get_project_graph(identifier)
    project_metadata_g = get_project_metadata_graph(identifier)

    #Prevent duplicate metadata
    if (URIRef(identifier), NS.dc.title, None) in g:
        project_g.remove((URIRef(identifier), NS.dc.title, None))
        project_metadata_g.remove((URIRef(identifier), NS.dc.title, None))
    if (URIRef(identifier), NS.rdfs.label, None) in g:
        project_g.remove((URIRef(identifier), NS.rdfs.label, None))
        project_metadata_g.remove((URIRef(identifier), NS.rdfs.label, None))
    if (URIRef(identifier), NS.dcterms.description, None) in g:
        project_g.remove((URIRef(identifier), NS.dcterms.description, None))
        project_metadata_g.remove((URIRef(identifier), NS.dcterms.description, None))

    for triple in g:
        project_g.add(triple)

    for triple in metadata_triples(g, identifier):
        project_metadata_g.add(triple)

    for triple in g.triples((identifier, NS.ore.aggregates, None)):
        project_metadata_g.add(triple)

        aggregate_uri = triple[2]

        project_metadata_g += metadata_triples(project_g, aggregate_uri)
        project_metadata_g += metadata_triples(g, aggregate_uri)

def delete_project(uri):
    """Deletes a project with the given URI. (Cascades project permissions as well)"""
    project_graph = get_project_graph(uri)
    metadata_graph = get_project_metadata_graph(uri)
    
    with transaction.commit_on_success():
        project_graph.remove((None, None, None))
        metadata_graph.remove((None, None, None))

        ProjectPermission.objects.filter(identifier=uri).delete()

def delete_triples_from_project(request, uri):
    """Deletes the triples in a graph provided by a request object from the project graph.
    Returns an HttpResponse of all the triples which were successfully removed from the graph."""
    if request.user.is_authenticated():
        if permissions.has_permission_over(uri, user=request.user, permission=NS.perm.mayUpdate):
            removed = Graph()
            bind_namespaces(removed)

            try:
                g = parse_request_into_graph(request)
            except (ParserError, SyntaxError) as e:
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

            project_g = get_project_graph(uri)
            project_metadata_g = get_project_metadata_graph(uri)

            for t in g:
                if t in project_g:
                    project_g.remove(t)
                    removed.add(t)
                project_metadata_g.remove(t)

            return NegotiatedGraphResponse(request, removed)
        else:
            return HttpResponseForbidden('User "%s" does not have update permissions over project "%s"' % (request.user.username, uri))
    else:
        return HttpResponse(status=401)


# Create the project graph, with all of the required data, and sends it to be saved
# Used for the the create project management command and some part of ProjectView
# # Have we made ProjectView obsolete since we now export data in RDF?
def create_project_graph(host, user, title, project):
    if not project:
        project = uris.uuid()
    elif not (type(project) == URIRef):
        project = URIRef(project)
    g = Graph()
    bind_namespaces(g)
    if not title:
        title = "Default Project"
    g.add((project, NS.rdf.type, NS.foaf.Project))
    g.add((project, NS.rdf.type, NS.dm.Project))
    g.add((project, NS.rdf['type'], NS.dcmitype['Collection']))
    g.add((project, NS.rdf['type'], NS.ore['Aggregation']))
    g.add((project, NS.dc['title'], Literal(title)))
    g.add((project, NS.dcterms['created'], Literal(datetime.utcnow())))

    return g

def add_project_types(graph, project_uri):
    project_uri = URIRef(project_uri)

    for t in PROJECT_TYPES:
        graph.add((project_uri, NS.rdf.type, t))

def project_export_graph(project_uri):
    db_project_graph = get_project_graph(project_uri)
    db_metadata_graph = get_project_metadata_graph(project_uri)
    export_graph = Graph()
    export_graph += db_project_graph
    export_graph += db_metadata_graph

    for text_uri in export_graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        export_graph += text_graph_from_model(text_uri, project_uri)

    return export_graph

def is_top_level_project_resource(project_uri, uri):
    db_project_graph = get_project_graph(project_uri)
    return (URIRef(project_uri), NS.ore.aggregates, uri) in db_project_graph

