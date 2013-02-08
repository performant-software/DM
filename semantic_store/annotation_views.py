from django.db import transaction
from django.http import HttpResponse

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef

from .validators import AnnotationValidator
from .rdfstore import rdfstore
from .namespaces import ns


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


def destination_graph(dest_graph_uri=None):
    if dest_graph_uri:
        dest_g = Graph(store=rdfstore(), identifier=URIRef(dest_graph_uri))
    else:
        dest_g = ConjunctiveGraph(store=rdfstore(), identifier=default_identifier)
    return dest_g


def valid_annotations(dest_graph_uri, anno_g, anno_uris):
    dest_g = destination_graph(dest_graph_uri)
    validator = AnnotationValidator(dest_g)
    for a in anno_uris:
        if not validator.validate(anno_g, a):
            return validator
    return validator


def create_annotations(request, dest_graph_uri=None, anno_uri=None):
    if anno_uri:
        return HttpResponse(status=400, 
                            content="Annotation URI not permitted in create request.")

    anno_g = Graph()
    try:
        anno_g.parse(data=request.body)
    except:
        return HttpResponse(status=400, content="Unable to parse serialization.")
    anno_uris = annotation_uris(anno_g)
    if not anno_uris:
        return HttpResponse(status=400, 
                            content="No %s nodes found." % URIRef(NS.oa['Annotation']))

    if not valid_annotations(dest_graph_uri, anno_g, anno_uris):
        return HttpResponse(status=400, content=validator.failure)

    with transaction.commit_on_success():
        pass

    return HttpResponse(status=201)
