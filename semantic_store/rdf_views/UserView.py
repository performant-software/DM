from django.contrib.auth.models import User

from rdflib import Graph

from .GraphView import GraphView
from semantic_store.namespaces import bind_namespaces
from semantic_store.rdfstore import rdfstore
from semantic_store import uris

class UserView(GraphView):
    http_method_names = ['get']

    def get(self, *args, **kwargs):
        request = args[0]
        username = kwargs['username']
        if username: # and (username == request.user.username):
            user_graph_identifier = uris.uri('semantic_store_users', username=username)
            g = Graph(store=rdfstore(), identifier=user_graph_identifier)
            return HttpResponse(content=g.serialize(), mimetype='text/xml')
        else:
            g = Graph()
            bind_namespaces(g)
            for u in User.objects.filter():
                user_graph_identifier = uris.uri('semantic_store_users', username=u.username)
                g += Graph(store=rdfstore(), identifier=user_graph_identifier)

            return HttpResponse(content=g.serialize(), mimetype='text/xml')
