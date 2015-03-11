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
from django.core.exceptions import ObjectDoesNotExist

from rdflib import Graph, ConjunctiveGraph, URIRef
from rdflib.util import guess_format
import rdflib.plugin

from semantic_store.models import PublicProject
from semantic_store import collection, permissions, manuscripts
from semantic_store.models import ProjectPermission, UploadedImage
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import NegotiatedGraphResponse, JsonResponse, parse_request_into_graph, RDFLIB_SERIALIZER_FORMATS, get_title, metadata_triples
from semantic_store.rdfstore import rdfstore
from semantic_store.annotation_views import create_or_update_annotations
from semantic_store.projects import create_project_from_request, delete_project, link_removed, create_project, read_project, update_project, cleanup_orphans, delete_triples_from_project, get_project_graph, project_export_graph, get_project_metadata_graph
from semantic_store import uris
from semantic_store.users import read_user, update_user, remove_triples_from_user
from semantic_store.canvases import read_canvas, update_canvas, remove_canvas_triples, create_canvas_from_upload
from semantic_store.specific_resources import read_specific_resource, update_specific_resource
from semantic_store.annotations import resource_annotation_subgraph

from semantic_store.project_texts import create_project_text_from_request, read_project_text, update_project_text_from_request, remove_project_text

from semantic_store import text_search

from os import listdir
import random
import string
import logging
logger = logging.getLogger(__name__)

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
        delete_project(uri)
        return HttpResponse(status=200, content="Project successfully deleted")
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
    else:
        return HttpResponseNotAllowed(['POST', 'PUT', 'DELETE', 'GET'])

        
def project_annotations(request, project_uri=None, anno_uri=None):
    return annotations(request, project_uri, anno_uri)

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

def token_generator(size=8 ):
    return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(size))

def generate_public_token():
    while True:
        key = token_generator()
        if PublicProject.objects.filter(key=key).count() == 0:
            return key
    
def project_share(request, uri):
    if request.method == 'GET':   
        #
        # Get project phblic share status
        try:
            pub = PublicProject.objects.get(identifier=uri)
            url = "%spublished/key/%s" % (settings.BASE_URL, pub.key)
            resp = {'public': 'true', 'url':url}
            return JsonResponse(resp)
        except ObjectDoesNotExist:
            resp = {'public': False}
            return JsonResponse(resp)
    elif request.method == 'POST':  
        #
        # Generate a public access token / URL for a project
        key = generate_public_token()
        pub = PublicProject.objects.create(identifier=uri, key=key)
        url = "%spublished/key/%s" % (settings.BASE_URL, key)
        
        # create a guest user for this project
        new_name = "guest_%s" % key
        user = User.objects.create_user(new_name, "", "pass")
        ProjectPermission.objects.create(user=user, identifier=uri, permission="r")
        
        resp = {'success': 'true', 'url': url}
        return JsonResponse(resp)
    elif request.method == 'DELETE':   
        #
        # Revoke public access token / URL for a project
        for p in PublicProject.objects.filter(identifier=uri): 
            uname = "guest_%s" % p.key
            User.objects.filter(username=uname).delete();
            ProjectPermission.objects.filter(identifier=p.identifier).delete()
            p.delete();
        return HttpResponse(status=200)
    else:
        return HttpResponseNotAllowed(('GET', 'POST', 'DELETE'))


def cleanup_project_orphans(request, uri):
    return cleanup_orphans(request, uri)

def cleanup_removed_link(request, uri ):
    uuids = request.POST.get('uuids', '')
    return link_removed(request, uri, uuids)

@check_project_resource_permissions
def project_texts(request, project_uri, text_uri):
    if request.method == 'POST':
        return create_project_text_from_request(request, project_uri, text_uri)
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
        logger.debug('!!!!!!!!!!!!!!! views.py - project_canvases')
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
        logger.debug('!!!!!!!!!!!!!!! views.py - specific_resource_graph')
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
            bind_namespaces(export_graph)
            yield export_graph.serialize(format=format)

        project_title = get_title(db_project_graph, project_uri) or u'untitled project'

        response = StreamingHttpResponse(serialization_iterator(project_uri, format), mimetype='text/%s' % extension)
        response['Content-Disposition'] = 'attachment; filename=%s.%s' % (slugify(project_title), extension)

        return response

class TextSearch(View):
    @method_decorator(check_project_resource_permissions)
    def get(self, request, project_uri):
        try:
            query = request.GET['q']
        except KeyError:
            return HttpResponseBadRequest('"q" (search query string) is a required GET parameter')
        return JsonResponse(text_search.get_response(project_uri, query))

class SearchAutocomplete(View):
    @method_decorator(check_project_resource_permissions)
    def get(self, request, project_uri):
        try:
            query = request.GET['q']
        except KeyError:
            return HttpResponseBadRequest('"q" (search query string) is a required GET parameter')

        return JsonResponse(text_search.get_autocomplete(project_uri, query))

class Manuscript(View):
    def manuscript_graph(self, manuscript_uri, project_uri):
        project_graph = get_project_graph(project_uri)
        subgraph = manuscripts.manuscript_subgraph(project_graph, manuscript_uri)

        for canvas in subgraph.subjects(NS.rdf.type, NS.sc.Canvas):
            if (canvas, NS.ore.isDescribedBy, None) not in subgraph:
                canvas_url = uris.url('semantic_store_project_canvases', project_uri=project_uri, canvas_uri=canvas)
                subgraph.add((canvas, NS.ore.isDescribedBy, canvas_url))

        return subgraph

    @method_decorator(check_project_resource_permissions)
    def get(self, request, project_uri, manuscript_uri=None):
        project_uri = URIRef(project_uri)

        project_graph = get_project_graph(project_uri)

        if manuscript_uri:
            manuscript_uri = URIRef(manuscript_uri)
            return NegotiatedGraphResponse(request, self.manuscript_graph(manuscript_uri, project_uri))
        else:
            graph = Graph()

            for manuscript in project_graph.subjects(NS.rdf.type, NS.sc.Manifest):
                graph += self.manuscript_graph(manuscript, project_uri)

            return NegotiatedGraphResponse(request, graph)

class CanvasTranscription(View):
    @method_decorator(check_project_resource_permissions)
    def get(self, request, project_uri, canvas_uri, transcription_uri):
        project_uri = URIRef(project_uri)
        canvas_uri = URIRef(canvas_uri)

        if transcription_uri:
            transcription_uri = URIRef(transcription_uri)

            project_graph = get_project_graph(project_uri)

            return NegotiatedGraphResponse(request, resource_annotation_subgraph(project_graph, transcription_uri))

class CanvasUpload(View):
    @method_decorator(check_project_resource_permissions)
    def post(self, request, project_uri):    
        project_uri = URIRef(project_uri)
        project_graph = get_project_graph(project_uri)
        project_metadata_graph = get_project_metadata_graph(project_uri)
        canvas_graph = Graph()

        image_file = request.FILES['image_file']
        title = request.POST.get('title', '')
        uri = uris.uuid()

        if hasattr(settings, 'MAX_IMAGE_UPLOAD_FILE_SIZE') and image_file.size > settings.MAX_IMAGE_UPLOAD_FILE_SIZE:
            return HttpResponse(status=406)
        if not image_file.content_type.startswith('image/'):
            return HttpResponse(status=406)

        uploaded = UploadedImage.objects.create(imagefile=image_file, owner=request.user)
        create_canvas_from_upload(canvas_graph, uploaded, uri, request.user, title)

        # Make the canvas a top level project resource
        canvas_graph.add((project_uri, NS.ore.aggregates, uri))

        project_graph += canvas_graph
        project_metadata_graph += canvas_graph

        canvas_graph += metadata_triples(project_metadata_graph, project_uri)
        canvas_graph += project_metadata_graph.triples((project_uri, NS.ore.aggregates, None))

        return NegotiatedGraphResponse(request, canvas_graph)
