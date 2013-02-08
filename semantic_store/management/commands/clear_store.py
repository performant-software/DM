import pprint
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from semantic_store import rdfstore
from rdflib import URIRef
from rdflib.graph import ConjunctiveGraph
from django.conf import settings


class Command(BaseCommand):

    def handle(self, *args, **options):
        with transaction.commit_on_success():        
            main_graph = ConjunctiveGraph(rdfstore.rdfstore(), 
                                          identifier=rdfstore.default_identifier)
            for t in main_graph.triples((None, None, None)):
                main_graph.remove(t)
#        main_graph.commit()
