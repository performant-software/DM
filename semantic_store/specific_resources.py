from django.db import transaction

from rdflib import Literal, URIRef, Graph

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import metadata_triples
from semantic_store.annotations import resource_annotation_subgraph

def specific_resource_subgraph(graph, specific_resource):
    specific_resource_graph = Graph()

    specific_resource_graph += graph.triples((specific_resource, None, None))
    specific_resource_graph += resource_annotation_subgraph(graph, specific_resource)

    for selector in graph.objects(specific_resource, NS.oa.hasSelector):
        specific_resource_graph += graph.triples((selector, None, None))

    return specific_resource_graph

def specific_resources_subgraph(graph, source_uri):
    specific_resources_graph = Graph()

    for specific_resource in graph.subjects(NS.oa.hasSource, source_uri):
        specific_resources_graph += specific_resource_subgraph(graph, specific_resource)

    return specific_resources_graph