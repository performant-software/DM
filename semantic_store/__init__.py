from rdflib import plugin, URIRef
from rdflib.store import Store
from django.conf import settings
from .urls import urlpatterns as urls


def config_string():
    if len(settings.DATABASES.keys()) == 1:
        dblabel = 'default'
    else:
        dblabel = 'rdfstore'
    cfgstr = "host=%s user=%s password=%s dbname=%s" % (
        settings.DATABASES[dblabel]['HOST'],
        settings.DATABASES[dblabel]['USER'],
        settings.DATABASES[dblabel]['PASSWORD'],
        settings.DATABASES[dblabel]['NAME'],
        )
    return cfgstr

def rdf_store(identifier=settings.RDFLIB_STORE_IDENTIFIER):
    pgplugin = plugin.get('PostgreSQL', Store)
    store = pgplugin(identifier=identifier)
    return store

main_graph_identifier = URIRef(settings.RDFLIB_STORE_GRAPH_URI)        
