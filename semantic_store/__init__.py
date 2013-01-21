from django.db import transaction
from rdflib import plugin, URIRef
from rdflib.store import Store, NO_STORE, VALID_STORE
from rdflib.graph import ConjunctiveGraph as Graph
import hashlib
from django.conf import settings
from .decorators import run_once


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

def init_rdf_store(identifier=settings.RDFLIB_STORE_IDENTIFIER):
    cfgstr = config_string()
    pgplugin = plugin.get('PostgreSQL', Store)
    store = pgplugin(identifier=identifier)
    rt = store.open(cfgstr,create=False)
    if rt == NO_STORE:
        print "intializing rdflib store tables"
        store.open(configString,create=True)
    else:
        assert rt == VALID_STORE,"The underlying store is corrupted"

    graph = Graph(store, identifier = URIRef(settings.RDFLIB_STORE_GRAPH_URI))
    return graph

graph = init_rdf_store()
print "Number triples in rdflib store:", len(graph)

# try:
#     with transaction.commit_on_success():
#         from utils import create_custom_namespaces
#         create_custom_namespaces()
# except:
#     pass
