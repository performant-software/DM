from django.db import transaction, connection
from rdflib import plugin, URIRef
from rdflib.plugin import register
from rdflib.store import Store, NO_STORE, VALID_STORE
from rdflib.graph import ConjunctiveGraph
#import rdflib_postgresql
import hashlib
from django.conf import settings
from .decorators import run_once
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
#    cfgstr = config_string()
    pgplugin = plugin.get('PostgreSQL', Store)
    store = pgplugin(identifier=identifier)
#    store.open()
#    store._db = connection
#    store.configuration = cfgstr
    # rt = store.open(cfgstr,create=False)
    # if rt == NO_STORE:
    #     print "intializing rdflib store tables"
    #     store.open(cfgstr,create=True)
    # else:
    #     assert rt == VALID_STORE,"The underlying store is corrupted"
    return store

#store = rdf_store()
main_graph_identifier = URIRef(settings.RDFLIB_STORE_GRAPH_URI)        
#main_graph = ConjunctiveGraph(store, identifier=main_graph_identifier)

#register('PostgreSQL', Store, 'semantic_store.PostgreSQL', 'PostgreSQL')

# try:
#     with transaction.commit_on_success():
#         from utils import create_custom_namespaces
#         create_custom_namespaces()
# except:
#     pass
