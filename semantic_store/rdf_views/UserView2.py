from django.contrib.auth.models import User

from rdflib import Graph

from .GraphView import GraphView
from semantic_store.namespaces import bind_namespaces, NS
from semantic_store.rdfstore import rdfstore
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response

from django.http import HttpResponse

import time

class UserView(GraphView):
    http_method_names = ['get']

    def get(self, *args, **kwargs):
        def get_info_about_project(project_uri):
            identifier = uris.uri('semantic_store_projects', uri=project_uri)
            graph = Graph()
            bind_namespaces(graph)

            project_g = Graph(rdfstore(), identifier=identifier)

            for t in project_g.triples((project_uri, NS.dc['title'], None)):
                graph.add(t)
            for t in project_g.triples((project_uri, NS.dcterms['description'], None)):
                graph.add(t)
            for t in project_g.triples((project_uri, NS.dcterms['created'], None)):
                graph.add(t)

            project_g.close()

            return graph
            
        def get_info_about_all_projects(graph, user_uri):
            g = Graph()
            bind_namespaces(g)

            for project in graph.objects(user_uri, NS.perm['hasPermissionOver']):
                time.sleep(1)
                for t in get_info_about_project(project):
                    g.add(t)

            return g

        request = args[0]
        username = kwargs['username']
        if username: # and (username == request.user.username):
            user_graph_identifier = uris.uri('semantic_store_users', username=username)
            store_graph = Graph(store=rdfstore(), identifier=user_graph_identifier)

            memory_graph = Graph()
            bind_namespaces(memory_graph)
            memory_graph += store_graph

            store_graph.close()

            # memory_graph += get_info_about_all_projects(memory_graph, user_graph_identifier)
            return negotiated_graph_response(request, memory_graph)
        else:
            g = Graph()
            bind_namespaces(g)
            for u in User.objects.filter():
                user_graph_identifier = uris.uri('semantic_store_users', username=u.username)
                g += Graph(store=rdfstore(), identifier=user_graph_identifier)

            return negotiated_graph_response(request, g)

