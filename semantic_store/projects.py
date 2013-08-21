from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseForbidden
from django.contrib.auth.models import User

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import URIRef, Literal

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response, parse_request_into_graph
from semantic_store.users import remove_triple, has_permission_over, PERMISSION_PREDICATES
from semantic_store.project_texts import sanitized_content

from datetime import datetime

PROJECT_TYPES = [NS.dcmitype.Collection, NS.ore.Aggregation, NS.foaf.Project, NS.dm.Project]

def create_project_from_request(request):
    host = request.get_host()

    try:
        g = parse_request_into_graph(request)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    create_project(g, host)
    return HttpResponse("Successfully created the project.")

def create_project(g, host):
    query = g.query("""SELECT ?uri ?user
                    WHERE {
                        ?user perm:hasPermissionOver ?uri .
                        ?user rdf:type foaf:Agent .
                    }""", initNs=ns)

    for uri, user in query:
        sanitize_texts(g)

        project_uri = uris.uri('semantic_store_projects', uri=uri)
        project_g = Graph(store=rdfstore(), identifier=project_uri)

        with transaction.commit_on_success():
            for t in g:
                project_g.add(t)

            url = uris.url(host, 'semantic_store_projects', uri=uri)
            project_g.set((uri, NS.dcterms['created'], Literal(datetime.utcnow())))

            for t in g.triples((user, None, None)):
                project_g.remove(t)

            check_project_types(project_g, project_uri)

        username = user.split("/")[-1]
        create_project_user_graph(host, username, uri)

        print "Successfully created project with uri " + uri


def read_project(request, project_uri):
    if request.user.is_authenticated():
        if has_permission_over(request.user.username, project_uri, NS.perm.mayRead):
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

            # Add info about users which have permissions over the project
            # This should be indexed in the future for scalability
            for u in User.objects.all():
                user_graph_identifier = uris.uri('semantic_store_users', username=u.username)
                user_graph = Graph(store=rdfstore(), identifier=user_graph_identifier)

                if (URIRef(user_graph_identifier), NS.perm.hasPermissionOver, URIRef(project_uri)) in user_graph:
                    for predicate in PERMISSION_PREDICATES:
                        for t in user_graph.triples((URIRef(user_graph_identifier), predicate, URIRef(project_uri))):
                            project_g.add(t)
                        for t in user_graph.triples((URIRef(user_graph_identifier), NS.ore.isDescribedBy, None)):
                            project_g.add(t)

                user_graph.close()
            
            if len(project_g) >0:
                return negotiated_graph_response(request, project_g)
            else:
                return HttpResponseNotFound()
        else:
            return HttpResponseForbidden('User "%s" does not have read permissions over project "%s"' % (request.user.username, project_uri))
    else:
        return HttpResponse(status=401)


def update_project(request, uri):
    if request.user.is_authenticated():
        if has_permission_over(request.user.username, uri, NS.perm.mayUpdate):
            try:
                input_graph = parse_request_into_graph(request)
            except ParserError as e:
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

            project_graph = update_project_graph(input_graph, uri,request.get_host())

            return negotiated_graph_response(request, project_graph, status=201)
        else:
            return HttpResponseForbidden('User "%s" does not have update permissions over project "%s"' % (request.user.username, uri))
    else:
        return HttpResponse(status=401)

def update_project_graph(g, identifier, host):
    uri = uris.uri('semantic_store_projects', uri=identifier)

    with transaction.commit_on_success():
        project_g = Graph(store=rdfstore(), identifier=uri)

        #Prevent duplicate metadata
        if (URIRef(identifier), NS.dc.title, None) in g:
            project_g.remove((URIRef(identifier), NS.dc.title, None))
        if (URIRef(identifier), NS.rdfs.label, None) in g:
            project_g.remove((URIRef(identifier), NS.rdfs.label, None))
        if (URIRef(identifier), NS.dcterms.description, None) in g:
            project_g.remove((URIRef(identifier), NS.dcterms.description, None))

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

    return HttpResponse("Successfully deleted project with uri %s."%uri)

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

def save_project_user_graph(graph, username, host):
    with transaction.commit_on_success():
        user_uri = uris.uri('semantic_store_users', username=username)
        user_graph = Graph(store=rdfstore(), identifier=user_uri)

        for s,p,o in graph.triples((user_uri, None, None)):
            user_graph.add((s,p,o))

            if p==NS.perm.hasPermissionOver:
                url = uris.url(host, "semantic_store_projects", uri=o)
                user_graph.add((o, NS.ore.isDescribedBy,url))

        for project in graph.triples((user_uri, NS.ore.hasPermissionOver, None)):
            user_graph.add((project, NS.ore.isDescribedBy, uris.url(host, "semantic_store_projects", uri=project)))


def delete_triples_from_project(request, uri):
    if request.user.is_authenticated():
        if has_permission_over(request.user.username, uri, NS.perm.mayUpdate):
            g = Graph()
            removed = Graph()
            bind_namespaces(removed)

            try:
                parse_request_into_graph(request, g)
            except ParserError as e:
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

            project_uri = uris.uri('semantic_store_projects', uri=uri)
            project_g = Graph(store=rdfstore(), identifier=project_uri)

            with transaction.commit_on_success():
                for t in g:
                    if t in project_g:
                        project_g.remove(t)
                        removed.add(t)

            return negotiated_graph_response(request, removed, close_graph=True)
        else:
            return HttpResponseForbidden('User "%s" does not have update permissions over project "%s"' % (request.user.username, uri))
    else:
        return HttpResponse(status=401)


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

