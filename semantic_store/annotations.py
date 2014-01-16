from django.db import transaction

from rdflib import Literal, URIRef, Graph
from rdflib.plugins.sparql import prepareQuery

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import metadata_triples, timed_block

from itertools import chain

def resource_annotation_subgraph(graph, resource_uri):
    subgraph = Graph()

    annos = chain(graph.subjects(NS.oa.hasTarget, resource_uri), graph.subjects(NS.oa.hasBody, resource_uri))
    for anno in annos:
        subgraph += graph.triples((anno, None, None))

        for resource in chain(graph.objects(anno, NS.oa.hasBody), graph.objects(anno, NS.oa.hasTarget)):
            if (resource, NS.rdf.type, NS.oa.SpecificResource) in graph:
                source = graph.value(resource, NS.oa.hasSource)
                selector = graph.value(resource, NS.oa.hasSelector)
                subgraph += metadata_triples(graph, source)
                subgraph += graph.triples((resource, None, None))
                subgraph += graph.triples((selector, None, None))
            else:
                subgraph += metadata_triples(graph, resource)

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
