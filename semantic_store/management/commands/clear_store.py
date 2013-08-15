from django.core.management.base import BaseCommand
from django.db import transaction
from semantic_store.rdfstore import rdfstore, default_identifier
from rdflib.graph import ConjunctiveGraph


class Command(BaseCommand):

    def handle(self, *args, **options):
        with transaction.commit_on_success():        
            main_graph = ConjunctiveGraph(rdfstore(), 
                                          identifier=default_identifier)
            for t in main_graph.triples((None, None, None)):
                main_graph.remove(t)

            main_graph.close()
