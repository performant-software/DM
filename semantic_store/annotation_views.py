from datetime import datetime

from django.core.urlresolvers import reverse
from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound

from rdflib.graph import Graph
from rdflib import URIRef, Literal, BNode
from rdflib.exceptions import ParserError

from semantic_store.validators import AnnotationValidator
from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, bind_namespaces
from semantic_store import uris
from semantic_store import manuscripts
from semantic_store.utils import NegotiatedGraphResponse, parse_request_into_graph

def graph():
    g = Graph()
    bind_namespaces(g)
    return g

def annotation_uris(g):
    uris = g.subjects(NS.rdf['type'], NS.oa['Annotation'])
    return list(uris)

def destination_graph(dest_graph_uri=None):
    if dest_graph_uri:
        dest_g = Graph(store=rdfstore(), identifier=URIRef(dest_graph_uri))
    else:
        uri = reverse('semantic_store_annotations')
        dest_g = Graph(store=rdfstore(), identifier=URIRef(uri))
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
    return bfs(graph(), g, [anno_uri])

def annotation_ancestors(search_g, node):
    if len(list(search_g.triples((node, NS.rdf['type'], NS.oa['Annotation'])))):
        return [node]
    all_nodes = []
    for s, p, o in search_g.triples((None, None, node)):
        for i in annotation_ancestors(search_g, s):
            all_nodes.append(i)
    return all_nodes

def update_annotation(request, dest_g, annotations_g, anno_uri):
    old_anno_g = annotation_graph(dest_g, anno_uri)
    for t in old_anno_g:
        dest_g.remove(t)
    new_anno_g = annotation_graph(annotations_g, anno_uri)
    new_anno_g.add((anno_uri, NS.oa['annotatedAt'], Literal(datetime.utcnow())))
    if request.user.is_authenticated():
        user_uri = uris.uri('semantic_store_users', username=request.user.username)
        new_anno_g.add((anno_uri, NS.oa['annotatedBy'], user_uri))
        new_anno_g.add((user_uri, NS.rdf['type'], NS.foaf['Person']))
        new_anno_g.add((user_uri, NS.foaf['name'], Literal(request.user.username)))
        new_anno_g.add((user_uri, NS.foaf['mbox'], 
                        URIRef("mailto:" + request.user.email)))
    for t in new_anno_g:
        dest_g.add(t)
    return new_anno_g

def create_or_update_annotations(request, dest_graph_uri=None, anno_uri=None):
    dest_g = destination_graph(dest_graph_uri)
    annotations_g = graph()
    try:
        parse_request_into_graph(request, annotations_g)
    except (ParserError, SyntaxError) as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)
    anno_uris = annotation_uris(annotations_g)
    if not anno_uris:
        return HttpResponse(status=400, 
                            content="No %s nodes found." % URIRef(NS.oa['Annotation']))

    if not valid_annotations(dest_g, annotations_g, anno_uris):
        return HttpResponse(status=400, content=validator.failure)

    with transaction.commit_on_success():
        for i in anno_uris:
            stored_g = update_annotation(request, dest_g, annotations_g, i)

    return NegotiatedGraphResponse(request, stored_g, status=201)
