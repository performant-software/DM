from rdflib import plugin, URIRef, Literal
from rdflib.store import Store
from django.conf import settings

default_identifier = URIRef(settings.RDFLIB_STORE_GRAPH_URI)        

def rdfstore():
    store = plugin.get('SQLAlchemy', Store)(identifier=default_identifier)
    store.open(Literal(settings.RDFLIB_DB_URI))
    return store
