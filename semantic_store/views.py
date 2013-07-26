from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseBadRequest, HttpResponseNotFound
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db import transaction, IntegrityError
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef
from rdflib.util import guess_format

from semantic_store import collection
from semantic_store.models import ProjectPermission
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import negotiated_graph_response, parse_request_into_graph
from semantic_store.rdfstore import rdfstore, default_identifier
from semantic_store.annotation_views import create_or_update_annotations, get_annotations, search_annotations
from semantic_store.projects import create_project_from_request, create_project, read_project, update_project, delete_triples_from_project
from semantic_store import uris
from semantic_store.users import read_user, update_user, remove_triples_from_user

from project_texts import create_project_text_from_request, read_project_text, update_project_text_from_request, remove_project_text

from os import listdir

@login_required
def projects(request, uri=None):
    if request.method == 'POST':
        if uri:
            return HttpResponse(status=400, 
                                content="Project create request may not specify URI.")
        return create_project_from_request(request) 
    elif request.method == 'GET':
        if not uri:
            return HttpResponse(status=400, 
                                content="Project read request must specify URI.")
        return read_project(request, uri)
    elif request.method == 'PUT':
        if not uri:
            return HttpResponse(status=400, 
                                content="Project update request must specify URI.")
        return update_project(request, uri)
    elif request.method == 'DELETE':
        if not uri:
            return HttpResponse(status=400, 
                                content="Project delete request must specify URI.")
        return delete_project(request, uri)
    else:
        return HttpResponseNotAllowed(['POST', 'PUT', 'DELETE', 'GET'])


@csrf_exempt
def annotations(request, dest_graph_uri=None, anno_uri=None):
    if request.method == 'POST':
        if anno_uri:
            return HttpResponse(status=400, 
                                content="Annotation URI not permitted in create.")
        return create_or_update_annotations(request, dest_graph_uri, anno_uri)
    elif request.method == 'PUT':
        return create_or_update_annotations(request, dest_graph_uri, anno_uri)
    elif request.method == 'DELETE':
        # todo: implement delete annotations
        pass
    elif request.method == 'GET':
        if anno_uri:
            return get_annotations(request, dest_graph_uri, [anno_uri])
        else:
            search_uri = request.GET.get('uri', None)
            if search_uri:
                return search_annotations(request, dest_graph_uri, search_uri)
            else:
                return get_annotations(request, dest_graph_uri)
    else:
        return HttpResponseNotAllowed(['POST', 'PUT', 'DELETE', 'GET'])

@csrf_exempt        
def project_annotations(request, project_uri=None, anno_uri=None):
    return annotations(request, project_uri, anno_uri)

def resources(request, uri, ext=None):
    if request.user.is_authenticated():
        perms = ProjectPermission.objects.filter(user=request.user)
    else:
        perms = []

    uri = uri.rstrip('/')
    store_g = Graph(store=rdfstore(), identifier=URIRef(uri))
    g = Graph()
    g += store_g
    store_g.close()
    if len(g) > 0:
        for i in perms:
            anno_uri = settings.URI_MINT_BASE \
                + "/projects/" + i.identifier \
                + "/resources/" + uri \
                + "/annotations/"
            anno_url = reverse('semantic_store_project_annotations', 
                               kwargs={'project_uri': i.identifier}) \
                               + "?uri=" + uri
            g.add((URIRef(uri), NS.ore['aggregates'], URIRef(anno_uri)))
            g.add((URIRef(anno_uri), NS.ore['isDescribedBy'], URIRef(anno_url)))
            g.add((URIRef(anno_uri), NS.rdf['type'], NS.ore['Aggregation']))
            g.add((URIRef(anno_uri), NS.rdf['type'], NS.rdf['List']))
            g.add((URIRef(anno_uri), NS.rdf['type'], NS.dms['AnnotationList']))
        return negotiated_graph_response(request, g)
    else:
        main_graph_store = ConjunctiveGraph(store=rdfstore(), 
                                      identifier=default_identifier)
        main_graph = Graph()
        main_graph += main_graph_store
        main_graph_store.close()
        g = Graph()
        bind_namespaces(g)
        for t in main_graph.triples((URIRef(uri), None, None)):
            g.add(t)
        if len(g) > 0:
            return negotiated_graph_response(request, g)
        else:
            return HttpResponseNotFound()

@csrf_exempt
def import_old_data(request):
    everything_graph = Graph()
    bind_namespaces(everything_graph)
    host = request.get_host()

    # Either gather post data (must be one project/user graph at a time)
    if request.method == 'POST':
        parse_request_into_graph(request, everything_graph)

        add_all_users(everything_graph)

        # Create each user's default project
        # Due to the structure of the data when exported from the old system, this also
        #  add each annotation to the project as an aggregated resource
        create_project(everything_graph, host)

    # or serialize from a folder, where each file is one project/user graph
    else:
        i = 0
        for file_name in listdir("output/"):
            try:
                everything_graph.parse("output/" + file_name, format=guess_format(file_name) or 'turtle')
            except Exception as e:
                print "Failed to decode file '%s' with error message '%s'"%(file_name, e.args[-1])
            else:
                add_all_users(everything_graph)
                create_project(everything_graph, host)
        

    return HttpResponse("I finished migrating data without errors.")

DEFAULT_PASSWORD_STRING="DefaultPassword"

# Ensure users exist in the database before creating projects about them
# If the user with given username does not exist, creates it with DEFAULT_PASSWORD_STRING
#  as their password
def add_all_users(graph):
    bind_namespaces(graph)
    query = graph.query("""SELECT ?user ?email
                        WHERE {
                            ?user perm:hasPermissionOver ?project .
                            ?user foaf:mbox ?email .
                            ?user rdf:type foaf:Agent
                        }""", initNs = ns)

    for q in query:
        username = ""
        # Remove username from customized uri
        s = q[0].split("/")[-1]
        username = s.split("'),")[0]

        email = q[1].split("mailto:")[-1]

        try:
            u = User.objects.create_user(username, email, DEFAULT_PASSWORD_STRING)
        except IntegrityError:
            transaction.rollback_unless_managed()
            print "User '%s' already existed in the database, and was not created."%(username)
        else:
            u.save()
            print "User '%s' was created successfully."%(username)


def remove_project_triples(request, uri):
    g = delete_triples_from_project(request, uri)
    return negotiated_graph_response(request, g)


def project_texts(request, project_uri, text_uri):
    if request.method == 'POST':
        g = create_project_text_from_request(request, project_uri)
        return negotiated_graph_response(request, g)
    elif request.method == 'GET':
        g = read_project_text(project_uri, text_uri)
        return negotiated_graph_response(request, g)
    elif request.method == 'PUT':
        g = update_project_text_from_request(request, project_uri, text_uri)
        return negotiated_graph_response(request, g)
    elif request.method == 'DELETE':
        g = remove_project_text(project_uri, text_uri)
        return negotiated_graph_response(request, g)
    else:
        return HttpResponseNotAllowed(['POST', 'PUT', 'DELETE', 'GET'])


# @login_required
def users(request, username=None):
    if request.method == 'GET':
        return read_user(request, username)
    elif request.method == 'PUT':
        if not username:
            return HttpResponse(status=400, 
                                content="User update request must specify username.")
        return update_user(request, username)
    else:
        return HttpResponseNotAllowed(['PUT', 'GET'])

def remove_user_triples(request, username):
    g = remove_triples_from_user(request, username)
    return negotiated_graph_response(request, g)
