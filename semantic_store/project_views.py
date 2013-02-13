from django.db import transaction
from django.http import HttpResponse

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef

from .validators import ProjectValidator
from .rdfstore import rdfstore
from .namespaces import ns



def create_project(request):
    g = Graph()
    try:
        g.parse(data=request.body)
    except:
        return HttpResponse(status=400, content="Unable to parse serialization.")
    project_uris
    
    validator = ProjectValidator(g, project)
    main_graph = ConjunctiveGraph(store=rdfstore(), identifier=default_identifier)

def read_project(request, uri):
    pass


def update_project(request, uri):
    pass


def delete_project(request, uri):
    pass
