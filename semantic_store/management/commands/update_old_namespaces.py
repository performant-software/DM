from django.core.management.base import BaseCommand

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import update_old_namespaces, NS

from rdflib import Graph

class Command(BaseCommand):
    option_list = BaseCommand.option_list

    def handle(self, *args, **options):
        store = rdfstore()

        print 'About to update every graph in the store... go grab some coffee.'

        for identifier in store.contexts():
            print '- Updating graph with identifier %s' % identifier
            graph = Graph(store=store, identifier=identifier)
            update_old_namespaces(graph)
            graph.bind('oa', NS.oa)