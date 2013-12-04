from django.core.urlresolvers import reverse
from django.http import (
    HttpResponse,
    HttpResponseNotAllowed,
    HttpResponseBadRequest,
    HttpResponseNotFound,
    HttpResponseForbidden,
    StreamingHttpResponse
)
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db import transaction, IntegrityError
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.base import View
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.utils.decorators import method_decorator

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef
from rdflib.util import guess_format
import rdflib.plugin

from semantic_store import collection, permissions
from semantic_store.models import ProjectPermission
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import NegotiatedGraphResponse, parse_request_into_graph, RDFLIB_SERIALIZER_FORMATS, get_title
from semantic_store.rdfstore import rdfstore, default_identifier
from semantic_store.annotation_views import create_or_update_annotations, get_annotations, search_annotations
from semantic_store.projects import create_project_from_request, create_project, read_project, update_project, delete_triples_from_project, get_project_graph, project_export_graph
from semantic_store import uris
from semantic_store.users import read_user, update_user, remove_triples_from_user
from semantic_store.canvases import read_canvas, update_canvas, remove_canvas_triples
from semantic_store.specific_resources import read_specific_resource, update_specific_resource

from project_texts import create_project_text_from_request, read_project_text, update_project_text_from_request, remove_project_text

from os import listdir

def check_project_resource_permissions(fn):
    def inner(request, *args, **kwargs):
        project_uri = kwargs['project_uri'] if 'project_uri' in kwargs else kwargs['uri']

        if request.user.is_authenticated():
            if request.method == 'GET' or request.method == 'HEAD':
                if permissions.has_permission_over(project_uri, user=request.user, permission=NS.perm.mayRead):
                    return fn(request, *args, **kwargs)
                else:
                    return HttpResponseForbidden()
            elif request.method in ('POST', 'PUT', 'DELETE'):
                if permissions.has_permission_over(project_uri, user=request.user, permission=NS.perm.mayUpdate):
                    return fn(request, *args, **kwargs)
                else:
                    return HttpResponseForbidden()
        else:
            return HttpResponse(status=401)
    return inner

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
        return NegotiatedGraphResponse(request, g)
    else:
        main_graph_store = ConjunctiveGraph(store=rdfstore(), 
                                      identifier=default_identifier)
        main_graph = Graph()
        main_graph += main_graph_store
        g = Graph()
        bind_namespaces(g)
        for t in main_graph.triples((URIRef(uri), None, None)):
            g.add(t)
        if len(g) > 0:
            return NegotiatedGraphResponse(request, g)
        else:
            return HttpResponseNotFound()

def import_old_data(request):
    everything_graph = Graph()
    bind_namespaces(everything_graph)

    # Either gather post data (must be one project/user graph at a time)
    if request.method == 'POST':
        parse_request_into_graph(request, everything_graph)

        add_all_users(everything_graph)

        # Create each user's default project
        # Due to the structure of the data when exported from the old system, this also
        #  add each annotation to the project as an aggregated resource
        create_project(everything_graph)

    # or serialize from a folder, where each file is one project/user graph
    else:
        i = 0
        for file_name in listdir("output/"):
            if file_name.startswith('.'):
                continue

            try:
                everything_graph.parse("output/" + file_name, format=guess_format(file_name) or 'turtle')
            except Exception as e:
                print "Failed to decode file '%s' with error message '%s'"%(file_name, e.args[-1])
            else:
                add_all_users(everything_graph)
                create_project(everything_graph)
        

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
    return delete_triples_from_project(request, uri)

@check_project_resource_permissions
def project_texts(request, project_uri, text_uri):
    if request.method == 'POST':
        return create_project_text_from_request(request, project_uri)
    elif request.method == 'GET':
        g = read_project_text(project_uri, text_uri)
        return NegotiatedGraphResponse(request, g)
    elif request.method == 'PUT':
        return update_project_text_from_request(request, project_uri, text_uri)
    elif request.method == 'DELETE':
        remove_project_text(project_uri, text_uri)
        return HttpResponse(status=204)
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
    return remove_triples_from_user(request, username)

@check_project_resource_permissions
def project_canvases(request, project_uri, canvas_uri):
    if request.method == 'GET':
        return NegotiatedGraphResponse(request, read_canvas(request, project_uri, canvas_uri))
    elif request.method == 'PUT':
        input_graph = parse_request_into_graph(request)
        return NegotiatedGraphResponse(request, update_canvas(project_uri, canvas_uri, input_graph))
    else:
        return HttpResponseNotAllowed(('GET', 'PUT'))

@check_project_resource_permissions
def remove_project_canvas_triples(request, project_uri, canvas_uri):
    if request.method == 'PUT':
        return NegotiatedGraphResponse(request, remove_canvas_triples(project_uri, canvas_uri, input_graph))
    else:
        return HttpResponseNotAllowed(('PUT'))

@check_project_resource_permissions
def text_specific_resource(request, project_uri, text_uri, specific_resource):
    if request.method == 'GET' or request.method == 'PUT':
        return specific_resource_graph(request, project_uri, specific_resource, text_uri)
    else:
        return HttpResponseNotAllowed(('GET', 'PUT'))

@check_project_resource_permissions
def canvas_specific_resource(request, project_uri, canvas_uri, specific_resource):
    if request.method == 'GET' or request.method == 'PUT':
        return specific_resource_graph(request, project_uri, specific_resource, canvas_uri)
    else:
        return HttpResponseNotAllowed(('GET', 'PUT'))

# @check_project_resource_permissions
def specific_resource_graph(request, project_uri, specific_resource, source):
    if request.method == 'GET':
        return NegotiatedGraphResponse(request, read_specific_resource(project_uri, specific_resource, source))
    elif request.method == 'PUT':
        g = parse_request_into_graph(request)
        update_specific_resource(g, URIRef(project_uri), URIRef(specific_resource))

class ProjectDownload(View):
    @method_decorator(check_project_resource_permissions)
    def get(self, request, project_uri, extension):
        format = 'turtle' if extension.lower() == 'ttl' else extension
        if format not in RDFLIB_SERIALIZER_FORMATS:
            return HttpResponseBadRequest()

        project_uri = URIRef(project_uri)
        db_project_graph = get_project_graph(project_uri)

        def serialization_iterator(project_uri, format):
            yield ''
            export_graph = project_export_graph(project_uri)
            yield export_graph.serialize(format=format)

        project_title = get_title(db_project_graph, project_uri) or u'untitled project'

        response = StreamingHttpResponse(serialization_iterator(project_uri, format), mimetype='text/%s' % extension)
        response['Content-Disposition'] = 'attachment; filename=%s.%s' % (slugify(project_title), extension)

        return response
