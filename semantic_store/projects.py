from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound
from django.contrib.auth.models import User

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import URIRef, Literal

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response, parse_request_into_graph
from semantic_store.users import add_triple, remove_triple
from semantic_store.project_texts import sanitized_content

from datetime import datetime

PROJECT_TYPES = [NS.dcmitype.Collection, NS.ore.Aggregation, NS.foaf.Project, NS.dm.Project]

def create_project_from_request(request):
    g = Graph()
    bind_namespaces(g)

    host = request.get_host()

    try:
        parse_request_into_graph(request, g)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    create_project(g, host)
    return HttpResponse("Successfully created the project.")

def create_project(g, host):
    sanitize_texts(g)

    with transaction.commit_on_success():
        for user in g.subjects(NS.rdf.type, NS.foaf.Agent):
            username = user.split("/")[-1]

            for project in g.objects(user, NS.perm.hasPermissionOver):
                project_uri = uris.uri('semantic_store_projects', uri=project)
                project_g = Graph(store=rdfstore(), identifier=project_uri)
                bind_namespaces(project_g)

                project_g += g

                url = uris.url(host, 'semantic_store_projects', uri=project)
                project_g.set((project_uri, NS.dcterms.created, Literal(datetime.utcnow())))

                for t in g.triples((user, None, None)):
                    project_g.remove(t)

                check_project_types(project_g, project_uri)

                create_project_user_graph(host, username, project_uri)

                project_g.close()

def get_project_graph_for_response(request, project_uri):
    uri = uris.uri('semantic_store_projects', uri=project_uri)
    store_g = Graph(store=rdfstore(), identifier=uri)

    # Work with a memory graph so triples can be removed
    project_g = Graph()
    bind_namespaces(project_g)
    project_g += store_g

    for text in project_g.subjects(NS.rdf['type'], NS.dcmitype.Text):
        for t in project_g.triples((text, NS.cnt.chars, None)):
            project_g.remove(t)
        text_url = uris.url(request.get_host(), "semantic_store_project_texts", project_uri=project_uri, text_uri=text)
        project_g.add((text, NS.ore.isDescribedBy, text_url))

    store_g.close()

    return project_g

def read_project(request, project_uri):
    project_g = get_project_graph_for_response(request, project_uri)
    
    if len(project_g) >0:
        return negotiated_graph_response(request, project_g, close_graph=True)
    else:
        project_g.close()
        return HttpResponseNotFound()


def update_project(request, uri):
    input_graph = Graph()
    bind_namespaces(input_graph)

    try:
        parse_request_into_graph(request, input_graph)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    project_graph = update_project_graph(input_graph, uri,request.get_host())
    project_graph.close()

    input_graph.close()

    return HttpResponse(status=200)

def update_project_graph(g, identifier, host):
    predicate = NS.perm['hasPermissionOver']
    for subj, obj in g.subject_objects(predicate):
        username = subj.split("/")[-1]
        
        add_triple(username,subj,predicate,obj, host)

        g.remove((subj,predicate,obj))


    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_projects', uri=identifier)
        project_g = Graph(store=rdfstore(), identifier=uri)
        # bind_namespaces(project_g) # This was causing a database error

        print "Updating project using graph identifier %s"%(uri)

        for triple in g:
            project_g.add(triple)

        return project_g

def delete_project(uri):
    identifier = uris.uri("semantic_store_projects", project_uri=uri)
    graph = Graph(store=rdfstore(), identifier=identifier)
    for t in graph:
        graph.remove()

    # todo: consider other permissions
    for user in User.objects.all():
        username = user.username
        user_uri = uris.uri("semantic_store_users", username=username)
        remove_triple(username, user_uri, NS.perm.hasPermissionOver, uri)

    graph.close()

    return HttpResponse("Successfully deleted project with uri %s."%uri, status=200)

# Creates a graph identified by user of the projects belonging to the user, which
#  can be found at the descriptive url of the user (/store/user/<username>)
# The graph houses the uri of all of the user's projects and the url where more info
#  can be found about each project
def create_project_user_graph(host, user, project):
    user_uri = uris.uri('semantic_store_users', username=user)
    g = Graph()
    bind_namespaces(g)

    # Permissions triples allow more specific permissions, but only hasPermissionOver
    #  is being checked at the moment.
    # <http://vocab.ox.ac.uk/perm/index.rdf> for definitions
    g.add((user_uri, NS.perm['hasPermissionOver'], project))
    g.add((user_uri, NS.perm['mayRead'], project))
    g.add((user_uri, NS.perm['mayUpdate'], project))
    g.add((user_uri, NS.perm['mayDelete'], project))
    g.add((user_uri, NS.perm['mayAugment'], project))
    g.add((user_uri, NS.perm['mayAdminister'], project))

    g.add((user_uri, NS.dm.lastOpenProject, project))

    g.add((user_uri, NS.rdf['type'], NS.foaf['Agent']))

    save_project_user_graph(g, user, host)

    g.close()

def save_project_user_graph(graph, username, host):
    with transaction.commit_on_success():
        user_uri = uris.uri('semantic_store_users', username=username)
        user_graph = Graph(store=rdfstore(), identifier=user_uri)
        bind_namespaces(user_graph)

        for s,p,o in graph.triples((user_uri, None, None)):
            user_graph.add((s,p,o))

            if p==NS.perm.hasPermissionOver:
                url = uris.url(host, "semantic_store_projects", uri=o)
                user_graph.add((o, NS.ore.isDescribedBy,url))

        for project in graph.triples((user_uri, NS.ore.hasPermissionOver, None)):
            user_graph.add((project, NS.ore.isDescribedBy, uris.url(host, "semantic_store_projects", uri=project)))

    user_graph.close()


def delete_triples_from_project(request, uri):
    g = Graph()
    bind_namespaces(g)
    removed = Graph()
    bind_namespaces(removed)

    try:
        parse_request_into_graph(request, g)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    project_uri = uris.uri('semantic_store_projects', uri=uri)
    project_g = Graph(store=rdfstore(), identifier=project_uri)

    predicate = NS.perm['hasPermissionOver']
    for subj, obj in g.subject_objects(predicate):
        username = subj.split("/")[-1]
        
        remove_triple(username,subj,predicate,obj,request.get_host())

        g.remove((subj,predicate,obj))

    with transaction.commit_on_success():
        for t in g:
            if t in project_g:
                project_g.remove(t)
                removed.add(t)

    project_g.close()

    return removed


# Create the project graph, with all of the required data, and sends it to be saved
# Used for the the create project management command and some part of ProjectView
# # Have we made ProjectView obsolete since we now export data in RDF?
def create_project_graph(host, user, title, project):
    if not project:
        project = uris.uuid()
    elif not (type(project) == URIRef):
        project = URIRef(project)
    g = Graph()
    bind_namespaces(g)
    if not title:
        title = "Default Project"
    g.add((project, NS.rdf.type, NS.foaf.Project))
    g.add((project, NS.rdf.type, NS.dm.Project))
    g.add((project, NS.rdf['type'], NS.dcmitype['Collection']))
    g.add((project, NS.rdf['type'], NS.ore['Aggregation']))
    g.add((project, NS.dc['title'], Literal(title)))
    g.add((project, NS.dcterms['created'], Literal(datetime.utcnow())))

    user_uri = uris.uri('semantic_store_users', username=user)

    g.add((user_uri, NS.perm['hasPermissionOver'], project))
    g.add((user_uri, NS.rdf['type'], NS.foaf['Agent']))

    return g

def sanitize_texts(graph):
    for text in graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        for content in graph.objects(text, NS.cnt.chars):
            graph.remove((text, NS.cnt.chars, content))

            graph.add((text, NS.cnt.chars, Literal(sanitized_content(content))))

def check_project_types(graph, project_uri):
    if not type(project_uri) == URIRef:
        project_uri = URIRef(project_uri)

    types_to_add = PROJECT_TYPES

    for s,p,o in graph.triples((project_uri, NS.rdf.type, None)):
        if o not in PROJECT_TYPES:
            graph.remove((s,p,o))
        else:
            types_to_add.remove(o)

    for typ in types_to_add:
        graph.add((project_uri, NS.rdf.type, typ))

