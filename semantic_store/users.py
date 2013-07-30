from django.contrib.auth.models import User

from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound

from rdflib.graph import Graph
from rdflib.exceptions import ParserError

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import bind_namespaces,NS
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response, parse_request_into_graph

def read_user(request, username=None):
    if username:
        username.strip("/")
        try:
            User.objects.get(username=username)
        except Exception as e:
            return HttpResponseNotFound()
        else:
            user_graph_identifier = uris.uri('semantic_store_users', username=username)
            print "reading info on user with identifier %s"%user_graph_identifier
            g = Graph(store=rdfstore(), identifier=user_graph_identifier)
            return negotiated_graph_response(request, g)
    else:
        g = Graph()
        bind_namespaces(g)
        for u in User.objects.filter():
            user_graph_identifier = uris.uri('semantic_store_users', username=u.username)
            g += Graph(store=rdfstore(), identifier=user_graph_identifier)

        return negotiated_graph_response(request, g)

def update_user(request, username):
    input_graph = Graph()
    bind_namespaces(input_graph)

    try:
        parse_request_into_graph(request, input_graph)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    graph = update_user_graph(input_graph, username)

    return negotiated_graph_response(request, graph, status=200)

def update_user_graph(g, username):
    # Check user has permissions to do this
    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_users', username=username)
        print "Updating user using graph identifier %s" % uri
        graph = Graph(store=rdfstore(), identifier=uri)
        bind_namespaces(graph)

        for triple in g:
            graph.add(triple)

        return graph

def remove_triples_from_user(request, username):
    g = Graph()
    bind_namespaces(g)
    removed = Graph()
    bind_namespaces(removed)

    try:
        parse_request_into_graph(request, g)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    uri = uris.uri('semantic_store_users', username=username)
    graph = Graph(store=rdfstore(), identifier=uri)

    for s,p,o in g:
        if(remove_triple(username, s,p,o)):
            removed.add((s,p,o))

    return removed

def add_triple(username, s, p, o, host):
    # todo: check validity of username? (won't break anywhere)
    # todo: check permissions
    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_users', username=username)
        graph = Graph(store=rdfstore(), identifier=uri)
        graph.add((s,p,o))

        # If adding a project, you need to know where to find the project
        # Using set prevents multiple isDescribedBy triples from forming
        if p==NS.perm.hasPermissionOver:
            graph.set((o, NS.ore['isDescribedBy'],uris.url(host, "semantic_store_projects", uri=o)))

def remove_triple(username, s, p, o):
    # todo: check validity of username? (will return false)
    # todo: check permissions
    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_users', username=username)
        graph = Graph(store=rdfstore(), identifier=uri)
        if ((s,p,o)) in graph:
            graph.remove((s,p,o))
            return True

    return False

