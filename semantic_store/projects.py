from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import Literal

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response, parse_into_graph
from semantic_store.users import add_triple, remove_triple

from datetime import datetime


def create_project_from_request(request):
    g = Graph()
    bind_namespaces(g)

    host = request.get_host()

    try:
        parse_into_graph(g, data=request.body)
    except:
        return HttpResponse(status=400, content="Unable to parse serialization.")

    create_project(g, host)

def create_project(g, host):
    bind_namespaces(g)
    query = g.query("""SELECT ?uri ?user
                    WHERE {
                        ?user perm:hasPermissionOver ?uri .
                    }""", initNs = ns)

    for uri, user in query:
        with transaction.commit_on_success():
            username = user.split("/")[-1]

            project_uri = uris.uri('semantic_store_projects', uri=uri)
            project_g = Graph(store=rdfstore(), identifier=project_uri)
            bind_namespaces(project_g)

            project_g += g

            url = uris.url(host, 'semantic_store_projects', uri=uri)
            project_g.set((uri, NS.dcterms['created'], Literal(datetime.utcnow())))

            # Deletes permissions triples, which should not be stored in project graph
            project_g.remove((None,NS.perm['hasPermissionOver'],uri))

        create_project_user_graph(host, username, uri)


# Restructured read_project
# Previously, when hitting multiple project urls in quick succession, a 500 
#  error occurred occassionally since the graph with the information about
#  all projects wasn't closed before the next url was hit
def read_project(request, uri):
    uri = uris.uri('semantic_store_projects', uri=uri)
    project_g = Graph(store=rdfstore(), identifier=uri)
    
    if len(project_g) >0:
        return negotiated_graph_response(request, project_g)
    else:
        return HttpResponseNotFound()


def update_project(request, uri):
    input_graph = Graph()
    bind_namespaces(input_graph)

    try:
        parse_into_graph(input_graph, data=request.body)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    project_graph = update_project_graph(input_graph, uri,request.get_host())

    return negotiated_graph_response(request, project_graph, status=201)

def update_project_graph(g, identifier, host):
    predicate = NS.perm['hasPermissionOver']
    for subj, obj in g.subject_objects(predicate):
        username = subj.split("/")[-1]
        
        add_triple(username,subj,predicate,obj, host)

        g.remove((subj,predicate,obj))

    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_projects', uri=identifier)
        project_g = Graph(store=rdfstore(), identifier=uri)
        bind_namespaces(project_g)

        for triple in g:
            project_g.add(triple)

        return project_g

def delete_project(request, uri):
    # Not implemented
    return HttpResponse(status=501)

# Creates a graph identified by user of the projects belonging to the user, which
#  can be found at the descriptive url of the user (/store/user/<username>)
# The graph houses the uri of all of the user's projects and the url where more info
#  can be found about each project
def create_project_user_graph(host, user, project):
    with transaction.commit_on_success():
        user_uri = uris.uri('semantic_store_users', username=user)
        g = Graph(store=rdfstore(), identifier = user_uri)
        bind_namespaces(g)
        g.add((project, NS.ore['isDescribedBy'], uris.url(host, "semantic_store_projects", uri=project)))

        # Permissions triple allows read-only permissions if/when necessary
        # <http://vocab.ox.ac.uk/perm/index.rdf> for definitions
        g.add((user_uri, NS.perm['hasPermissionOver'], project))
        g.add((user_uri, NS.perm['mayRead'], project))
        g.add((user_uri, NS.perm['mayUpdate'], project))
        g.add((user_uri, NS.perm['mayDelete'], project))
        g.add((user_uri, NS.perm['mayAugment'], project))
        g.add((user_uri, NS.perm['mayAdminister'], project))

        g.add((user_uri, NS.rdf['type'], NS.foaf['Agent']))
        return g.serialize()


def delete_triples_from_project(request, uri):
    g = Graph()
    bind_namespaces(g)
    removed = Graph()
    bind_namespaces(removed)

    try:
        parse_into_graph(g, data=request.body)
    except:
        return HttpResponse(status=400, content="Unable to parse serialization.")

    project_uri = uris.uri('semantic_store_projects', uri=uri)
    project_g = Graph(store=rdfstore(), identifier=project_uri)

    predicate = NS.perm['hasPermissionOver']
    for subj, obj in g.subject_objects(predicate):
        username = subj.split("/")[-1]
        
        remove_triple(username,subj,predicate,obj,request.get_host())

        g.remove((subj,predicate,obj))

    with transaction.commit_on_success():
        for t in g:
            if t in project_g:
                project_g.remove(t)
                removed.add(t)

    return removed


