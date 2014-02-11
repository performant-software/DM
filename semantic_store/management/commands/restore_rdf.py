from django.core.management.base import BaseCommand
from optparse import make_option

from semantic_store.rdfstore import rdfstore

import urllib
import os

from rdflib import Graph, URIRef, Literal
from rdflib.util import guess_format

class Command(BaseCommand):
    """
    Restores all graphs in the rdfstore from the contents of a backup directory (as generated from the backup_rdf command)

    Graphs are identified using the folling format:
    <url encoded graph uri>.<serialization format>
    """

    option_list = BaseCommand.option_list + (
        make_option('-i', '--input', dest='directory', help='Directory from which to read RDF serializations'),
    )

    def handle(self, directory, *args, **kwargs):
        store = rdfstore()

        for filename in os.listdir(directory):
            full_path = os.path.join(directory, filename)
            if os.path.isfile(full_path) and not filename.startswith('.'):
                context = URIRef(urllib.unquote(filename[:filename.rfind('.')]))
                graph = Graph(store, context)
                graph.parse(full_path, format=guess_format(filename))
