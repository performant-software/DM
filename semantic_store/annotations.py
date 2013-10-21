from django.db import transaction

from rdflib import Literal, URIRef, Graph
from rdflib.plugins.sparql import prepareQuery

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import metadata_triples

annotation_subgraph_prepared_query = prepareQuery("""SELECT ?anno ?anno_res ?source ?selector WHERE {
    ?anno a oa:Annotation .
    {
        ?anno oa:hasTarget ?resource .
        ?anno oa:hasBody ?anno_res .
    } UNION {
        ?anno oa:hasBody ?resource .
        ?anno oa:hasTarget ?anno_res .
    } OPTIONAL {
        ?anno_res oa:hasSource ?source .
        ?anno_res oa:hasSelector ?selector .
    }
}""", initNs=ns)

def resource_annotation_subgraph(graph, resource_uri):
    subgraph = Graph()

    qres = graph.query(annotation_subgraph_prepared_query, initBindings={'resource': resource_uri})

    for anno, anno_res, source, selector in qres:
        subgraph += graph.triples((anno, None, None))

        if source and selector:
            subgraph += metadata_triples(graph, source)
            subgraph += graph.triples((selector, None, None))
            subgraph += graph.triples((anno_res, None, None))
        else:
            subgraph += metadata_triples(graph, anno_res)

    return subgraph

