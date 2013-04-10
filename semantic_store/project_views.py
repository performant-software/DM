from django.db import transaction
from django.http import HttpResponse

from rdflib.graph import Graph, ConjunctiveGraph
import rdflib

from .validators import ProjectValidator
from .rdfstore import rdfstore
from .namespaces import ns

from semantic_store.models import ProjectPermission
from semantic_store.namespaces import NS, bind_namespaces
from semantic_store.projects import create_project_graph
from semantic_store.permissions import Permission

from settings_local import SITE_ATTRIBUTES

from django.contrib.auth.models import User

from rdflib import BNode, Literal


def create_project_from_request(request):
    g = Graph()
    bind_namespaces(g)
    try:
        g.parse(data=request.body)
    except:
        return HttpResponse(status=400, content="Unable to parse serialization.")

    #Register plugins for querying graph
    rdflib.plugin.register(
    'sparql', rdflib.query.Processor,
    'rdfextras.sparql.processor', 'Processor')
    rdflib.plugin.register(
    'sparql', rdflib.query.Result,
    'rdfextras.sparql.query', 'SPARQLQueryResult')

    #Query for the new project URI
    query = g.query("""SELECT ?uri ?user
                    WHERE {
                        ?uri rdf:type dcmitype:Collection .
                        ?uri rdf:type ore:Aggregation .
                        ?user ore:aggregates ?uri .
                    }""", initNs = ns)
    indentifier = None
    user = None
     
    for q in query:
        t = tuple(q)
        identifier = t[0]

        # This method takes the username out of the uri
        # This method fails if "/" is an acceptable character in a username
        name = None
        for n in t[1].split("/"):
            name = n
        user = User.objects.get(username = name)

        #create_project(user, indentifier, host, title = title, description = description)
        ProjectPermission.objects.create(identifier=identifier,
                                     user=user,
                                     permission=Permission.read_write)
        main_graph = ConjunctiveGraph(store=rdfstore(), identifier=identifier)


# Consider abstracting above method to this one so that the management command
# is welcome to call this method with the given parameters (to avoid duplication)
# errors/inconsistent coding 
def create_project(user, project_identifier, host, title = Literal("Default project"), description = None):
    g = Graph()
    bind_namespaces(g)
    project = BNode()
    g.add((project, NS.rdf['type'], NS.dcmitype['Collection']))
    g.add((project, NS.rdf['type'], NS.ore['Aggregation']))
    g.add((project, NS.dc['title'], Literal(title)))
    if (description):
        g.add((project, NS.dcterm['description'], description))
    create_project_graph(g, project, project_identifier, host, user.email)
    ProjectPermission.objects.create(identifier=project_identifier,
                                     user=user,
                                     permission=Permission.read_write)

def read_project(request, uri):
    pass


def update_project(request, uri):
    pass


def delete_project(request, uri):
    pass
