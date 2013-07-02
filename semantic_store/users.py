from django.contrib.auth.models import User

from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound

from rdflib.graph import Graph
from rdflib.exceptions import ParserError

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import bind_namespaces
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
    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_users', username=username)
        print "Updating project using graph identifier %s" % uri
        graph = Graph(store=rdfstore(), identifier=uri)
        bind_namespaces(graph)

        for triple in g:
            graph.add(triple)

        return graph

