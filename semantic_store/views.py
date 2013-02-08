from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseBadRequest, \
    HttpResponseNotFound
from django.conf import settings
from django.db import connection, transaction

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef, RDF
from rdflib.namespace import Namespace

import collection
import rdfstore

from namespaces import ns
from validators import AnnotationValidator


def annotation_uris(g):
    query = \
    """SELECT ?uri
       WHERE {
           ?uri rdf:type oa:Annotation;
       }
       
    """
    qres = g.query(query, initNs=ns)
    # tuples in case of context; no context so strip 
    uris = [i[0] for i in qres]
    return uris


def annotations(request, collection=None, uri=None):
    if request.method == 'POST':
        validator = AnnotationValidator()
        g = Graph()
        g.parse(data=request.body)
        with transaction.commit_on_success():
            for a in annotation_uris(g):
                if not validator.validate(g, a):
                    return HttpResponse(status=400, content=validator.failure)
        return HttpResponse(status=201)
    elif request.method == 'PUT':
        pass
    elif request.method == 'DELETE':
        pass
    elif request.method == 'GET':
        pass
    else:
        return HttpResponseNotAllowed(['POST', 'PUT', 'DELETE', 'GET'])
        

def manifest(request, uri, ext=None):
    uri = uri.rstrip('/')
    print uri
    try:
        manifest_g = Graph(store=rdfstore.rdfstore(), identifier=URIRef(uri))
        if len(manifest_g) > 0:
            return HttpResponse(manifest_g.serialize(), mimetype='text/xml')
        else:
            return HttpResponseNotFound()
    except Exception as e:
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
