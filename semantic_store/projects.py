from datetime import datetime

from django.core.urlresolvers import reverse
from django.conf import settings
from django.db import transaction

from rdflib import Graph, URIRef, Literal
from .namespaces import NS
from semantic_store import uris

from semantic_store.rdfstore import rdfstore

def create_project_graph(g, node, identifier, host, user_email=None):
    with transaction.commit_on_success():
        allprojects_uri = uris.uri('semantic_store_projects')
        allprojects_g = Graph(store=rdfstore(), identifier=allprojects_uri)

        uri = uris.uri('semantic_store_projects', identifier=identifier)
        project_g = Graph(store=rdfstore(), identifier=uri)

        for s, p, o in g.triples((node, NS.rdf['type'], None)):
            allprojects_g.add((identifier, p, o))
        url = uris.url(host, 'semantic_store_projects', identifier=identifier)
        allprojects_g.add((identifier, NS.ore['isDescribedBy'], url))

        project_g.add((identifier, NS.ore['isDescribedBy'], url))
        project_g.add((identifier, NS.dcterms['created'], Literal(datetime.utcnow())))
        project_g.add((identifier, p, o))
        if user_email:
            project_g.add((identifier, NS.dcterms['creator'], URIRef(user_email)))

        for s, p, o in g.triples((node, None, None)):
            project_g.add((identifier, p, o))
        for agg in g.objects(node, NS.ore['aggregates']):
            for t in g.triples((agg, None, None)):
                project_g.add(t)
        return project_g
    
