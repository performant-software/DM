from rdflib import RDF, Graph, URIRef
from rdflib.namespace import Namespace
from collections import namedtuple

from django.conf import settings

ns = {
    'rdf': RDF,
    'dms': Namespace("http://dms.stanford.edu/ns/"),
    'sc': Namespace("http://www.shared-canvas.org/ns/"),
    'ore': Namespace("http://www.openarchives.org/ore/terms/"),
    'dc': Namespace("http://purl.org/dc/elements/1.1/"),
    'dcmitype': Namespace("http://purl.org/dc/dcmitype/"),
    'exif': Namespace("http://www.w3.org/2003/12/exif/ns#"),
    'tei': Namespace("http://www.tei-c.org/ns/1.0/"),
    'oa': Namespace("http://www.w3.org/ns/oa#"),
    'cnt08': Namespace("http://www.w3.org/2008/content#"),
    'cnt': Namespace("http://www.w3.org/2011/content#"),
    'dcterms': Namespace("http://purl.org/dc/terms/"),
    'dctypes': Namespace("http://purl.org/dc/dcmitype/"),
    'foaf': Namespace("http://xmlns.com/foaf/0.1/"),
    'prov': Namespace("http://www.w3.org/ns/prov#"),
    'rdfs': Namespace("http://www.w3.org/2000/01/rdf-schema#"),
    'skos': Namespace("http://www.w3.org/2004/02/skos/core#"),
    'trig': Namespace("http://www.w3.org/2004/03/trix/rdfg-1/"),
    'perm': Namespace("http://vocab.ox.ac.uk/perm#"),
    'dm': Namespace("http://dm.drew.edu/ns/")
}

_ns_named_tuple = namedtuple('ns_named_tuple', ns.keys())
NS = _ns_named_tuple(**ns)
    

def bind_namespaces(g):
    for prefix, namespace in ns.items():
        if (prefix, namespace) not in g.namespaces():
            g.bind(prefix, namespace, True)

    return g

OLD_OA_BASE = 'http://www.openannotation.org/ns/'
NEW_OA_BASE = 'http://www.w3.org/ns/oa#'

def update_oa(graph):
    def update_term(term):
        if isinstance(term, URIRef):
            uri_string = unicode(term)
            if uri_string.startswith(OLD_OA_BASE):
                return URIRef(NEW_OA_BASE + uri_string[len(OLD_OA_BASE):])
            else:
                return term
        else:
            return term

    temp_graph = Graph()
    temp_graph += graph

    for triple in graph:
        graph.remove(triple)

    for s, p, o in temp_graph:
        graph.add((update_term(s), update_term(p), update_term(o)))

    return graph

def update_old_namespaces(graph):
    return update_oa(graph)