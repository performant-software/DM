from django.db import transaction

from rdflib import Literal, URIRef, Graph

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import metadata_triples
from semantic_store.annotations import resource_annotation_subgraph
from semantic_store import uris

def specific_resource_subgraph(graph, specific_resource):
    specific_resource_graph = Graph()

    specific_resource_graph += graph.triples((specific_resource, None, None))
    specific_resource_graph += resource_annotation_subgraph(graph, specific_resource)

    for selector in graph.objects(specific_resource, NS.oa.hasSelector):
        specific_resource_graph += graph.triples((selector, None, None))

    return specific_resource_graph

def specific_resources_subgraph(graph, source_uri):
    specific_resources_graph = Graph()

    qres = graph.query("""SELECT ?specific_resource ?selector WHERE {
        ?specific_resource a oa:SpecificResource .
        ?specific_resource oa:hasSource ?source .
        ?specific_resource oa:hasSelector ?selector .
    }""", initNs=ns, initBindings={'source': source_uri})

    for specific_resource, selector in qres:
        specific_resources_graph += graph.triples((specific_resource, None, None))
        specific_resources_graph += graph.triples((selector, None, None))
        specific_resources_graph += resource_annotation_subgraph(graph, specific_resource)

    return specific_resources_graph

def read_specific_resource(project_uri, specific_resource, source):
    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    project_graph = Graph(store=rdfstore(), identifier=project_identifier)

    memory_project_graph = Graph()
    memory_project_graph += project_graph

    memory_graph = Graph()
    memory_graph += specific_resources_subgraph(memory_project_graph, URIRef(source))

    return memory_graph

