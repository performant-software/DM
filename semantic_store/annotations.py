from django.db import transaction

from rdflib import Literal, URIRef, Graph
from rdflib.plugins.sparql import prepareQuery

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import metadata_triples, timed_block

from itertools import chain

def anno_resource_metadata_subgraph(graph, resource):
    """
    Returns a graph containing the information necessary to render a summary of a resource within
    a UI's linked annotations view
    """

    subgraph = Graph()

    if (resource, NS.rdf.type, NS.oa.SpecificResource) in graph:
        source = graph.value(resource, NS.oa.hasSource)
        selector = graph.value(resource, NS.oa.hasSelector)

        if source:
            subgraph += metadata_triples(graph, source)
            
        subgraph += graph.triples_choices(([i for i in (resource, selector) if i is not None], None, None))
    elif (resource, NS.rdf.type, NS.cnt.ContentAsText) in graph and (resource, NS.rdf.type, NS.dcmitype.Text) not in graph:
        subgraph += graph.triples((resource, None, None))
    else:
        subgraph += metadata_triples(graph, resource)

    return subgraph

def annotation_subgraph(graph, anno):
    subgraph = Graph()

    subgraph += graph.triples((anno, None, None))

    for s, p, resource in graph.triples_choices((anno, [NS.oa.hasBody, NS.oa.hasTarget], None)):
        subgraph += anno_resource_metadata_subgraph(graph, resource)

    return subgraph

def resource_annotation_subgraph(graph, resource_uri):
    print "RESOURCE ANNOTATION SUBGRAPH"
    subgraph = Graph()

    a = []
    for anno, p, o in graph.triples_choices((None, [NS.oa.hasTarget, NS.oa.hasBody], resource_uri)):
        try:
            a.index(anno)
            continue
        except ValueError as e:
            print "ANNO: %s" % anno
            a.append( anno )
        subgraph += annotation_subgraph(graph, anno)

    return subgraph

def is_blank_annotation(graph, uri):
    return not ((uri, NS.oa.hasTarget, None) in graph or (uri, NS.oa.hasBody, None) in graph)

def blank_annotation_uris(graph):
    for uri in graph.subjects(NS.rdf.type, NS.oa.Annotation):
        if is_blank_annotation(graph, uri):
            yield uri

def remove_blank_annotations(graph):
    for uri in blank_annotation_uris(graph):
        graph.remove((uri, None, None))

def has_annotation_link(graph, uri):
    """Returns true if there is an annotation in the graph which has the given uri as a target or body"""
    uri = URIRef(uri)

    return (None, NS.oa.hasBody, uri) in graph or (None, NS.oa.hasTarget, uri) in graph

def canvas_annotation_lists(graph, canvas_uri):
    for list_uri in graph.items(graph.value(canvas_uri, NS.sc.hasLists)):
        yield list_uri

def annotation_list_items(graph, list_uri):
    for anno_uri in graph.items(graph.value(list_uri, NS.sc.hasAnnotations)):
        yield anno_uri
