from django.db import transaction, connection
from rdflib import plugin, URIRef
from rdflib.store import Store, NO_STORE, VALID_STORE
from rdflib.graph import ConjunctiveGraph
import hashlib
from django.conf import settings
from django.db import transaction


default_identifier = URIRef(settings.RDFLIB_STORE_GRAPH_URI)        

def rdfstore():
    pgplugin = plugin.get('PostgreSQL', Store)
    store = pgplugin(identifier=default_identifier)
    store.open()





# def default_config_string():
#     if len(settings.DATABASES.keys()) == 1:
#         dblabel = 'default'
#     else:
#         dblabel = 'rdfstore'
#     cfgstr = "host=%s user=%s password=%s dbname=%s" % (
#         settings.DATABASES[dblabel]['HOST'],
#         settings.DATABASES[dblabel]['USER'],
#         settings.DATABASES[dblabel]['PASSWORD'],
#         settings.DATABASES[dblabel]['NAME'],
#         )
#     return cfgstr


# def load_fixture(fixture, store, identifier):
#     g = ConjunctiveGraph(store, identifier=identifier)
#     g.parse(fixture)


# def init_store(identifier=default_identifier, fixture=None, cfgstr=None):
#     if not cfgstr:
#         cfgstr = default_config_string()
#     pgplugin = plugin.get('PostgreSQL', Store)
#     store = pgplugin(identifier=identifier)
#     store.open()
# #    store._db = connection
# #    store.configuration = cfgstr
#     # rt = store.open(cfgstr,create=False)
#     # if rt == NO_STORE:
#     #     print "intializing rdflib store tables"
#     #     store.open(cfgstr,create=True)
#     # else:
#     #     assert rt == VALID_STORE,"The underlying store is corrupted"

#     if fixture:
#         load_fixture(fixture, store, identifier)
#         return store
