import rdflib
from django.conf import settings
from semantic_store import config_string, init_rdf_store


def setup_store(identifier="rdfstore_test"):
    graph = init_rdf_store(identifier)
    return graph

def teardown_store(graph, identifer="rdfstore_test"):
    graph.store.destroy(config_string())
