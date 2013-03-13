from rdflib import RDF
from rdflib.namespace import Namespace
from collections import namedtuple

ns = dict(
    rdf=RDF,
    dms=Namespace("http://dms.stanford.edu/ns/"),
    sc=Namespace("http://www.shared-canvas.org/ns/"),
    ore=Namespace("http://www.openarchives.org/ore/terms/"),
    dc=Namespace("http://purl.org/dc/elements/1.1/"),
    dcmitype=Namespace("http://purl.org/dc/dcmitype/"),
    exif=Namespace("http://www.w3.org/2003/12/exif/ns#"),
    tei=Namespace("http://www.tei-c.org/ns/1.0/"),
    oa=Namespace("http://www.openannotation.org/ns/"),
    cnt08=Namespace("http://www.w3.org/2008/content#"),
    cnt=Namespace("http://www.w3.org/2011/content#"),
    dcterms=Namespace("http://purl.org/dc/terms/"),
    dctypes=Namespace("http://purl.org/dc/dcmitype/"),
    foaf=Namespace("http://xmlns.com/foaf/0.1/"),
    prov=Namespace("http://www.w3.org/ns/prov#"),
    rdfs=Namespace("http://www.w3.org/2000/01/rdf-schema#"),
    skos=Namespace("http://www.w3.org/2004/02/skos/core#"),
    trig=Namespace("http://www.w3.org/2004/03/trix/rdfg-1/"),
    )

_ns_prefixes = ns.keys()
_ns_named_tuple = namedtuple('ns_named_tuple', _ns_prefixes)
NS = _ns_named_tuple(**ns)

# class NS(object):
#     rdf=RDF
#     dms=Namespace("http://dms.stanford.edu/ns/")
#     sc=Namespace("http://www.shared-canvas.org/ns/")
#     ore=Namespace("http://www.openarchives.org/ore/terms/")
#     dc=Namespace("http://purl.org/dc/elements/1.1/")
#     dcmitype=Namespace("http://purl.org/dc/dcmitype/")
#     exif=Namespace("http://www.w3.org/2003/12/exif/ns#")
#     tei=Namespace("http://www.tei-c.org/ns/1.0/")
#     oa=Namespace("http://www.openannotation.org/ns/"),
#     cnt=Namespace("http://www.w3.org/2011/content#")
#     dcterms=Namespace("http://purl.org/dc/terms/")
#     dctypes=Namespace("http://purl.org/dc/dcmitype/")
#     foaf=Namespace("http://xmlns.com/foaf/0.1/")
#     prov=Namespace("http://www.w3.org/ns/prov#")
#     rdfs=Namespace("http://www.w3.org/2000/01/rdf-schema#")
#     skos=Namespace("http://www.w3.org/2004/02/skos/core#")
#     trig=Namespace("http://www.w3.org/2004/03/trix/rdfg-1/")
    

def bind_namespaces(g):
    existing_namespaces = g.namespaces()
    for prefix, namespace in ns.items():
        if prefix not in existing_namespaces:
            g.bind(prefix, namespace)
    
