from rdflib import plugin, URIRef
from rdflib.plugin import register
from rdflib.store import Store
from django.conf import settings


register('PostgreSQL', Store, 'semantic_store.PostgreSQL', 'PostgreSQL')

default_identifier = URIRef(settings.RDFLIB_STORE_GRAPH_URI)        

def rdfstore():
    pgplugin = plugin.get('PostgreSQL', Store)
    store = pgplugin(identifier=default_identifier)
    store.open()
    return store


