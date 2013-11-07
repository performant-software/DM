from django.db import transaction

from rdflib import Literal, URIRef, Graph
from rdflib.plugins.sparql import prepareQuery

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import metadata_triples, timed_block

def resource_annotation_subgraph(graph, resource_uri):
    subgraph = Graph()

    annos = list(graph.subjects(NS.oa.hasTarget, resource_uri)) + list(graph.subjects(NS.oa.hasBody, resource_uri))
    for anno in annos:
        subgraph += graph.triples((anno, None, None))

        for resource in list(graph.objects(anno, NS.oa.hasBody)) + list(graph.objects(anno, NS.oa.hasTarget)):
            if (resource, NS.rdf.type, NS.oa.SpecificResource) in graph:
                source = graph.value(resource, NS.oa.hasSource)
                selector = graph.value(resource, NS.oa.hasSelector)
                subgraph += metadata_triples(graph, source)
                subgraph += graph.triples((resource, None, None))
                subgraph += graph.triples((selector, None, None))
            else:
                subgraph += metadata_triples(graph, resource)

    return subgraph

def blank_annotation_uris(graph):
    for uri in graph.subjects(NS.rdf.type, NS.oa.Annotation):
        if len(graph.triples((uri, NS.oa.hasTarget, None))) + len(graph.triples((uri, NS.oa.hasBody, None))) == 0:
            yield uri
