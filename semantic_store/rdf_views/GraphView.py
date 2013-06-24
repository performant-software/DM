import uuid

from django.http import HttpResponse, HttpResponseNotFound
from django.views.generic import View

from rdflib import Graph, ConjunctiveGraph, BNode, URIRef

from semantic_store import uris
from semantic_store.rdfstore import rdfstore
from semantic_store.utils import negotiated_graph_response


class GraphView(View):
    http_method_names = ['post']
    permit_post_identifier = False

    def new_nodes(self, g):
        raise NotImplementedError()

    def no_nodes_found(self, g):
        raise NotImplementedError()

    def validator(self, request):
        raise NotImplementedError()

    def add_node(self, g, node, uri):
        raise NotImplementedError

    def add_triples(self, g, item_g):
        for t in item_g:
            g.add(t)

    def remove_triples(self, g, item_g):
        for s, p, o in item_g:
            for t in g.triples(s, p, None):
                g.remove(t)

    def create_nodes(self, g):
        num_nodes = 0
        graphs = []
        identifiers = []
        nodes = self.new_nodes(g)
        for n in nodes:
            num_nodes += 1
            if type(n) is BNode:
                identifier = URIRef(uuid.uuid4())
            else:
                identifier = n
            identifiers.append(identifier)
            graphs.append(self.add_node(g, n, identifier))
        if num_nodes is 1:
            return graphs[0]
        else:
            nodes_g = Graph()
            g = Graph()
            aggregation = BNode()
            for i in identifiers:
                g.add((aggregation, NS.ore['aggregates'], i))
            nodes_g += g
            for g in graphs:
                nodes_g += g
            return nodes_g

    def serialized_graph(self, view, request, **kwargs):
        graph_uri = uris.uri(view, **kwargs)
        g = Graph(store=rdfstore(), identifier=graph_uri)
        if len(g) == 0:
            return HttpResponseNotFound(mimetype='text/n3')
        return negotiated_graph_response(request, graph)
            
    def post(self, *args, **kwargs):
        self.request = args[0]
        if not self.__class__.permit_post_identifier:
            identifier = kwargs['identifier']
            if identifier:
                return HttpResponse(status=400, 
                                    content="URI not permitted in create request.")
        g = Graph()
        try:
            g.parse(data=self.request.body)
        except:
            return HttpResponse(status=400, content="Unable to parse serialization.")
        nodes = self.new_nodes(g)
        if not nodes:
            return HttpResponse(status=400, content=self.no_nodes_found())
        validator = self.validator(self.request)
        for n in nodes:
            if not validator.valid(g, n):
                return HttpResponse(status=400, content=validator.failure)

        created_graph = self.create_nodes(g)
        return negotiated_graph_response(self.request, created_graph, status=201)

