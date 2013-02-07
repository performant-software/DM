from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef, RDF
from rdflib.namespace import Namespace

from .namespaces import NS, ns


def is_complete_anno(g, anno_uri):
    anno_uri = URIRef(anno_uri)
    # MUST have a resource associated with the class oa:Annotation
    if not (anno_uri, NS.rdf['type'], NS.oa['Annotation']) in g:
        return False
    # MUST be 1 or more oa:hasTarget relationships
    if not (anno_uri, NS.oa['hasTarget'], None) in g:
        return False
    return True


def has_body(g, anno_uri):
    if not (anno_uri, NS.oa['hasBody'], None) in g:
        return False
    return True


def is_complete_embedded_body(g, anno_uri):
    # TODO: implement this
    return False

def valid_anno(g, anno_uri):
    if not is_complete_anno(g, anno_uri):
        return False

    if has_body(g, anno_uri):
        if is_embedded_body(g, anno_uri):
            if not is_complete_embedded_body(g, anno_uri):
                return False

        
    
    
    
