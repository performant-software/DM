from rdflib import plugin, URIRef, Literal
from rdflib.store import Store
from django.conf import settings

plugin.register('SQLAlchemy', Store, 'rdflib_sqlalchemy.SQLAlchemy', 'SQLAlchemy')

default_identifier = URIRef(settings.RDFLIB_STORE_GRAPH_URI)   

store = plugin.get('SQLAlchemy', Store)(identifier=default_identifier)
store.open(Literal(settings.RDFLIB_DB_URI))     

def rdfstore():
    return store
