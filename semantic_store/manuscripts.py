from rdflib.graph import Graph, URIRef
from rdflib import URIRef

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS

from semantic_store.utils import metadata_triples, list_subgraph


def canvases(uri):
    g = Graph(store=rdfstore(), identifier=URIRef(uri))
    
    subjs = [str(i) for i in g.subjects(NS.rdf['type'], NS.sc['Canvas'])]
    if len(subjs) == 0:
        subjs = [str(i) for i in g.subjects(NS.rdf['type'], NS.dms['Canvas'])]

    return subjs

# Note(tandres) ^^ this is probably old code and safe to delete


def sequences(graph, manuscript_uri):
    for sequence in graph.items(graph.value(manuscript_uri, NS.sc.hasSequences)):
        yield sequence

def sequence_canvases(graph, sequence_uri):
    for canvas in graph.items(graph.value(sequence_uri, NS.sc.hasCanvases)):
        yield canvas

def manuscript_subgraph(graph, manuscript_uri):
    subgraph = Graph()

    subgraph += graph.triples((manuscript_uri, None, None))
    subgraph += list_subgraph(graph, graph.value(manuscript_uri, NS.sc.hasSequences))

    for sequence in sequences(graph, manuscript_uri):
        subgraph += graph.triples((sequence, None, None))
        subgraph += list_subgraph(graph, graph.value(sequence, NS.sc.hasCanvases))
        for canvas in sequence_canvases(graph, sequence):
            subgraph += metadata_triples(graph, canvas)

    return subgraph
