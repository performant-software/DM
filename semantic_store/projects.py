from django.db import transaction, IntegrityError
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseForbidden
from django.contrib.auth.models import User

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import URIRef, Literal

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response, parse_request_into_graph, metadata_triples
from semantic_store.users import PERMISSION_PREDICATES, user_graph, user_metadata_graph
from semantic_store.project_texts import sanitized_content
from semantic_store import project_texts
from semantic_store import canvases
from semantic_store.models import ProjectPermission
from semantic_store import permissions

from datetime import datetime

PROJECT_TYPES = (NS.dcmitype.Collection, NS.ore.Aggregation, NS.foaf.Project, NS.dm.Project)

def create_project_from_request(request):
    host = request.get_host()

    try:
        g = parse_request_into_graph(request)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    create_project(g, host)
    return HttpResponse("Successfully created the project.")

def create_project(g, host):
    query = g.query("""SELECT ?uri ?user
                    WHERE {
                        ?user perm:hasPermissionOver ?uri .
                        ?user rdf:type foaf:Agent .
                    }""", initNs=ns)

    for uri, user in query:
        project_identifier = uris.uri('semantic_store_projects', uri=uri)
        project_g = Graph(store=rdfstore(), identifier=project_identifier)

        user_obj = User.objects.get(username=user.strip('/').split('/')[-1])

        with transaction.commit_on_success():
            for t in g:
                project_g.add(t)

            for aggregate_uri in g.objects(uri, NS.ore.aggregates):
                if (aggregate_uri, NS.rdf.type, NS.dcmitype.Text) in g:
                    project_g.remove((aggregate_uri, NS.cnt.chars, None))

                    text_graph = Graph()
                    for t in g.triples((aggregate_uri, None, None)):
                        text_graph.add(t)
                    project_texts.update_project_text(text_graph, uri, aggregate_uri, user_obj)

            url = uris.url(host, 'semantic_store_projects', uri=uri)
            project_g.set((uri, NS.dcterms['created'], Literal(datetime.utcnow())))

            for t in g.triples((user, None, None)):
                project_g.remove(t)

            add_project_types(project_g, uri)
            build_project_metadata_graph(uri)

        username = user.split("/")[-1]
        permissions.grant_full_project_permissions(username, uri)

        print "Successfully created project with uri " + uri

def add_is_described_bys(request, project_uri, graph):
    for text in graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        text_url = uris.url(request.get_host(), "semantic_store_project_texts", project_uri=project_uri, text_uri=text)
        graph.add((text, NS.ore.isDescribedBy, text_url))

    for canvas in graph.subjects(NS.rdf.type, NS.sc.Canvas):
        canvas_url = uris.url(request.get_host(), "semantic_store_project_canvases", project_uri=project_uri, canvas_uri=canvas)
        graph.add((canvas, NS.ore.isDescribedBy, canvas_url))

def read_project(project_uri):
    metadata_graph = Graph(store=rdfstore(), identifier=uris.project_metadata_graph_identifier(project_uri))
    project_graph = Graph(store=rdfstore(), identifier=uris.uri('semantic_store_projects', uri=project_uri))
    project_memory_graph = Graph()
    project_memory_graph += project_graph

    with transaction.commit_on_success():
        for t in metadata_triples(project_memory_graph, project_uri):
            metadata_graph.add(t)

        for aggregate_uri in project_memory_graph.objects(project_uri, NS.ore.aggregates):
            metadata_graph.add((project_uri, NS.ore.aggregates, aggregate_uri))

            if ((aggregate_uri, NS.rdf.type, NS.sc.Canvas) in project_memory_graph or
                (aggregate_uri, NS.rdf.type, NS.dms.Canvas) in project_memory_graph):
                for t in canvases.canvas_and_images_graph(project_memory_graph, aggregate_uri):
                    metadata_graph.add(t)
            elif (aggregate_uri, NS.rdf.type, NS.dcmitype.Text) in project_memory_graph:
                for t in metadata_triples(project_memory_graph, aggregate_uri):
                    metadata_graph.add(t)
            else:
                for t in metadata_triples(project_memory_graph, aggregate_uri):
                    metadata_graph.add(t)

        return metadata_graph

def read_project(request, project_uri):
    project_uri = URIRef(project_uri)

    if request.user.is_authenticated():
        if permissions.has_permission_over(project_uri, user=request.user, permission=NS.perm.mayRead):
            identifier = uris.uri('semantic_store_projects', uri=project_uri)
            store_metadata_graph = Graph(rdfstore(), identifier=uris.project_metadata_graph_identifier(project_uri))
            ret_graph = Graph()
            ret_graph += store_metadata_graph

            for permission in ProjectPermission.objects.filter(identifier=project_uri):
                user = permission.user
                user_uri = uris.uri('semantic_store_users', username=user.username)
                perm_uri = permissions.PERMISSION_URIS_BY_MODEL_VALUE[permission.permission]

                ret_graph += user_metadata_graph(user=user)
                ret_graph.add((user_uri, NS.perm.hasPermissionOver, project_uri))
                ret_graph.add((user_uri, perm_uri, project_uri))
            
            if len(ret_graph) > 0:
                return negotiated_graph_response(request, ret_graph)
            else:
                return HttpResponseNotFound()
        else:
            return HttpResponseForbidden('User "%s" does not have read permissions over project "%s"' % (request.user.username, project_uri))
    else:
        return HttpResponse(status=401)


def update_project(request, uri):
    if request.user.is_authenticated():
        if permissions.has_permission_over(uri, user=request.user, permission=NS.perm.mayUpdate):
            try:
                input_graph = parse_request_into_graph(request)
            except ParserError as e:
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

            project_graph = update_project_graph(input_graph, uri,request.get_host())

            return negotiated_graph_response(request, project_graph, status=201)
        else:
            return HttpResponseForbidden('User "%s" does not have update permissions over project "%s"' % (request.user.username, uri))
    else:
        return HttpResponse(status=401)

def update_project_graph(g, identifier, host):
    uri = uris.uri('semantic_store_projects', uri=identifier)

    with transaction.commit_on_success():
        project_g = Graph(store=rdfstore(), identifier=uri)
        project_metadata_g = Graph(rdfstore(), identifier=uris.project_metadata_graph_identifier(identifier))

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

        return project_g

def delete_project(uri):
    identifier = uris.uri("semantic_store_projects", project_uri=uri)
    graph = Graph(store=rdfstore(), identifier=identifier)
    for t in graph:
        graph.remove()

    User.objects.filter(identifier=uri).delete()

    return HttpResponse("Successfully deleted project with uri %s."%uri)

def delete_triples_from_project(request, uri):
    if request.user.is_authenticated():
        if permissions.has_permission_over(uri, user=request.user, permission=NS.perm.mayUpdate):
            g = Graph()
            removed = Graph()
            bind_namespaces(removed)

            try:
                parse_request_into_graph(request, g)
            except ParserError as e:
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

            project_uri = uris.uri('semantic_store_projects', uri=uri)
            project_g = Graph(store=rdfstore(), identifier=project_uri)
            project_metadata_g = Graph(store=rdfstore(), identifier=uris.project_metadata_graph_identifier(uri))

            with transaction.commit_on_success():
                for t in g:
                    if t in project_g:
                        project_g.remove(t)
                        removed.add(t)
                    project_metadata_g.remove(t)

            return negotiated_graph_response(request, removed, close_graph=True)
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

