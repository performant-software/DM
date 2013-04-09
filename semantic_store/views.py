from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseBadRequest, \
    HttpResponseNotFound
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef

from semantic_store import collection
from semantic_store.models import ProjectPermission
from semantic_store.namespaces import NS
from .rdfstore import rdfstore, default_identifier

from .namespaces import bind_namespaces, ns
from .validators import AnnotationValidator
from .annotation_views import create_or_update_annotations, get_annotations, \
    search_annotations
from .project_views import create_project_from_request, read_project, update_project, delete_project


def repositories(request, uri=None):
    pass


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

def manuscripts(request, uri=None):
    pass

def manuscript_annotations(request, uri=None):
    pass

def manuscript_collections(request, uri=None):
    pass

def manuscript_collection_annotations(request, uri=None):
    pass

def collections(request, uri=None):
    pass

def collection_annotations(request, uri=None):
    pass

def users(request, username=None):
    pass

def user_annotations(request, username=None):
    pass

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
    try:
        g = Graph(store=rdfstore(), identifier=URIRef(uri))
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
            return HttpResponse(g.serialize(), mimetype='text/xml')
        else:
            main_graph = ConjunctiveGraph(store=rdfstore(), 
                                          identifier=default_identifier)
            g = Graph()
            bind_namespaces(g)
            for t in main_graph.triples((URIRef(uri), None, None)):
                g.add(t)
            if len(g) > 0:
                return HttpResponse(g.serialize(), mimetype='text/xml')
            else:
                return HttpResponseNotFound()
    except Exception as e:
        print e
        connection._rollback()
        raise e


def add_working_resource(request, uri):
    if request.method == 'POST':
        rdfstr = request.body
        g = rdflib.Graph()
        g.parse(data=rdfstr)
        qres = collection.resource_url(uri, g)
        if len(qres) > 0:
            (manifest_url,) = list(qres)[0]
            collection.fetch_and_parse(manifest_url, g)
            collection.harvest_resource_triples(g, res_uri=uri, res_url=manifest_url)
            for (s, p, o) in g:
                graph.add((s, p, o))
            return HttpResponse()
        return HttpResponseBadRequest("Expected well-formed rdf as request body.")
    elif request.method == 'GET':
        return HttpResponseNotAllowed(['POST', 'GET'])
    else:
        return HttpResponseNotAllowed(['POST', 'GET'])
