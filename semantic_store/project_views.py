from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound

from rdflib.graph import Graph, ConjunctiveGraph
import rdflib

from .validators import ProjectValidator
from .rdfstore import rdfstore
from .namespaces import ns

from semantic_store.models import ProjectPermission
from semantic_store.namespaces import NS, bind_namespaces
from semantic_store.projects import create_project_graph, create_project_user_graph, update_project_graph
from semantic_store.permissions import Permission

from semantic_store import uris

from settings_local import SITE_ATTRIBUTES

from django.contrib.auth.models import User

from rdflib import BNode, Literal, URIRef


def create_project_from_request(request):
    g = Graph()
    bind_namespaces(g)
    try:
        g.parse(data=request.body)
    except:
        return HttpResponse(status=400, content="Unable to parse serialization.")

    # Register plugins for querying graph
    rdflib.plugin.register(
    'sparql', rdflib.query.Processor,
    'rdfextras.sparql.processor', 'Processor')
    rdflib.plugin.register(
    'sparql', rdflib.query.Result,
    'rdfextras.sparql.query', 'SPARQLQueryResult')

    host = SITE_ATTRIBUTES['hostname']

    # Query for the new project URI, added user(s), and title
    query = g.query("""SELECT ?uri ?user ?title
                    WHERE {
                        ?uri rdf:type dcmitype:Collection .
                        ?uri rdf:type ore:Aggregation .
                        ?user ore:aggregates ?uri .
                        ?uri dc:title ?title .
                    }""", initNs = ns)

    # Description needs to be referenced inside the try-except and outside
    # # declared as None type because create_project knows not to do anything
    # # if no description is found    
    description = None

    # Query for description wrapped in try-except statement
    # Description is an optional field, so it should not break things if it
    # # does not exist
    try:
        query2 = g.query("""SELECT ?description
                         WHERE{
                            ?uri rdf:type ore:Aggregation .
                            ?uri dcterms:description ?description .
                         }""", initNs = ns)

        for q in query2:
            t = tuple(q)
            descripton = t[0]
    except Exception, e:
        pass

     
    for q in query:
        t = tuple(q)
        identifier = t[0]

        for n in t[1].split("/"):
            name = n
        
        title = t[2]

        create_project(name, identifier, host, title = title, description = description)
        create_project_user_graph(host, name, identifier)
        # If you want to see/manipulate the new data, uncomment the following
        #main_graph = ConjunctiveGraph(store=rdfstore(), identifier=identifier)


def create_project(username, project_identifier, host, title, description):
    g = Graph()
    bind_namespaces(g)
    project = BNode()
    g.add((project, NS.rdf['type'], NS.dcmitype['Collection']))
    g.add((project, NS.rdf['type'], NS.ore['Aggregation']))
    g.add((project, NS.dc['title'], Literal(title)))
    if (description):
        g.add((project, NS.dcterm['description'], Literal(description)))

    create_project_graph(g, project, project_identifier, host, title, username)

    ProjectPermission.objects.create(identifier=project_identifier,
                                     user=User.objects.get(username = username),
                                     permission=Permission.read_write)


# Restructured read_project
# Previously, when hitting multiple project urls in quick succession, a 500 
# # error occurred occassionally since the graph with the information about
# # all projects wasn't closed before the next url was hit
def read_project(request, uri):
    uri = uris.uri('semantic_store_projects', uri=uri)
    project_g = Graph(store=rdfstore(), identifier=uri)

    print "Reading project using graph identifier %s" % uri
    
    if len(project_g) >0:
        return HttpResponse(project_g.serialize(), mimetype='text/xml')
    else:
        return HttpResponseNotFound()


def update_project(request, uri):
    input_graph = Graph()
    bind_namespaces(input_graph)

    try:
        input_graph.parse(data=request.body)
    except rdflib.exceptions.ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    project_graph = update_project_graph(input_graph, uri)

    return HttpResponse(project_graph.serialize(), status=201, mimetype='text/xml')


def delete_project(request, uri):
    # Not implemented
    return HttpResponse(status=501)
