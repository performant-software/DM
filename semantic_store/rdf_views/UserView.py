from datetime import datetime

from django.core.urlresolvers import reverse
from django.contrib.auth.models import User
from django.conf import settings
from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseNotFound

from rdflib import Graph, Literal, URIRef

from .GraphView import GraphView
from semantic_store.namespaces import NS, ns
from semantic_store.validators import ProjectValidator
from semantic_store.rdfstore import rdfstore
from semantic_store.projects import create_project_graph
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
            return HttpResponse(status=403)
    
        
