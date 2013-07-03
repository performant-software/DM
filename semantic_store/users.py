from django.contrib.auth.models import User

from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound

from rdflib.graph import Graph
from rdflib.exceptions import ParserError

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import bind_namespaces,NS
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response, parse_into_graph

def read_user(request, username=None):
    if username:
        try:
            User.objects.get(username=username)
        except Exception as e:
            return HttpResponseNotFound()
        else:
            user_graph_identifier = uris.uri('semantic_store_users', username=username)
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
        parse_into_graph(input_graph, data=request.body)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    graph = update_project_graph(input_graph, uri)

    return negotiated_graph_response(request, graph, status=201)

def update_user_graph(g, username):
    # Check user logged has permissions to do this
    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_users', username=username)
        print "Updating project using graph identifier %s" % uri
        graph = Graph(store=rdfstore(), identifier=uri)
        bind_namespaces(graph)

        # for t in 

        for triple in g:
            graph.add(triple)

        return graph

def remove_triples_from_user(request, username):
    g = Graph()
    bind_namespaces(g)
    removed = Graph()
    bind_namespaces(removed)

    try:
        parse_into_graph(g, data=request.body)
    except ParserError:
        return HttpResponse(status=400, content="Unable to parse serialization.")

    uri = uris.uri('semantic_store_users', username=username)
    graph = Graph(store=rdfstore(), identifier=uri)

    with transaction.commit_on_success():            
        for t in g:
            if t in graph:
                graph.remove(t)
                removed.add(t)

    return removed

def add_triple(username, s, p, o, host):
    # check permissions
    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_users', username=username)
        graph = Graph(store=rdfstore(), identifier=uri)
        graph.add((s,p,o))
        graph.set((o, NS.ore['isDescribedBy'],uris.url(host, "semantic_store_projects", uri=o)))

def remove_triple(username, s, p, o, host):
    # check permissions
    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_users', username=username)
        graph = Graph(store=rdfstore(), identifier=uri)
        graph.remove((s,p,o))
        graph.remove((o, NS.ore['isDescribedBy'],uris.url(host, "semantic_store_projects", uri=o)))

