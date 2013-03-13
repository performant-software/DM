from django.core.urlresolvers import reverse
from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef, Literal, BNode

from .validators import AnnotationValidator
from .rdfstore import rdfstore, default_identifier
from .namespaces import NS, ns, bind_namespaces
from semantic_store import uris


def canvases(uri):
    g = Graph(store=rdfstore(), identifier=URIRef(uri))
    subjs = [str(i) for i in g.subjects(NS.rdf['type'], NS.sc['Canvas'])]
    if len(subjs) == 0:
        subjs = [str(i) for i in g.subjects(NS.rdf['type'], NS.dms['Canvas'])]
    return subjs
