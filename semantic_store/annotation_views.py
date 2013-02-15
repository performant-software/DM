from datetime import datetime

from django.db import transaction
from django.http import HttpResponse

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef, Literal

from .validators import AnnotationValidator
from .rdfstore import rdfstore, default_identifier
from .namespaces import NS, ns
from semantic_store import uris


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

def valid_annotations(dest_g, annotations_g, anno_uris):
    validator = AnnotationValidator(dest_g, "Annotation")
    for a in anno_uris:
        if not validator.valid(annotations_g, a):
            return validator
    return validator

def bfs(collector, universe, frontier):
    if not frontier:
        return collector
    uri = frontier[0]
    frontier = frontier[1:] if len(frontier) > 1 else []
    for s, p, o in universe.triples((uri, None, None)):
        frontier.append(o)
        collector.add((s, p, o))
    return bfs(collector, universe, frontier)

def annotation_graph(g, anno_uri):
    return bfs(Graph(), g, [anno_uri])

def update_annotation(request, dest_g, annotations_g, anno_uri):
    old_anno_g = annotation_graph(dest_g, anno_uri)
    for t in old_anno_g:
        dest_g.remove(t)
    new_anno_g = annotation_graph(annotations_g, anno_uri)
    new_anno_g.add((anno_uri, NS.oa['annotatedAt'], Literal(datetime.utcnow())))
    if request.user.is_authenticated():
        user_uri = uris.uri('semantic_store_users', username=username)
        new_anno_g.add((anno_uri, NS.oa['annotatedBy'], user_uri))
        new_anno_g.add((user_uri, NS.rdf['type'], NS.foaf['Person']))
        new_anno_g.add((user_uri, NS.foaf['name'], Literal(request.user.username)))
        new_anno_g.add((user_uri, NS.foaf['mbox'], 
                        URIRef("mailto:" + request.user.email)))
    for t in new_anno_g:
        dest_g.add(t)
    return new_anno_g

def create_annotations(request, dest_graph_uri=None, anno_uri=None):
    if anno_uri:
        return HttpResponse(status=400, 
                            content="Annotation URI not permitted in create request.")
    print "before destination_graph"
    dest_g = destination_graph(dest_graph_uri)
    print "before annotations_g"
    annotations_g = Graph()
    try:
        annotations_g.parse(data=request.body)
    except:
        return HttpResponse(status=400, content="Unable to parse serialization.")
    print "before annotation_uris"
    anno_uris = annotation_uris(annotations_g)
    if not anno_uris:
        return HttpResponse(status=400, 
                            content="No %s nodes found." % URIRef(NS.oa['Annotation']))

    if not valid_annotations(dest_g, annotations_g, anno_uris):
        return HttpResponse(status=400, content=validator.failure)

    with transaction.commit_on_success():
        for i in anno_uris:
            stored_g = update_annotation(request, dest_g, annotations_g, i)

    return HttpResponse(stored_g.serialize(), status=201)
