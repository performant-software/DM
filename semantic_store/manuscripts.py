from rdflib.graph import Graph
from rdflib import URIRef

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS


def canvases(uri):
    g = Graph(store=rdfstore(), identifier=URIRef(uri))
    
    subjs = [str(i) for i in g.subjects(NS.rdf['type'], NS.sc['Canvas'])]
    if len(subjs) == 0:
        subjs = [str(i) for i in g.subjects(NS.rdf['type'], NS.dms['Canvas'])]

    # g.close()

    return subjs
