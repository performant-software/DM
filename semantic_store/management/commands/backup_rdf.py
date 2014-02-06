from django.core.management.base import BaseCommand
from optparse import make_option

from semantic_store.rdfstore import rdfstore

import urllib
import os

from rdflib import Graph, URIRef, Literal
from rdflib.util import guess_format

class Command(BaseCommand):
    """Exports all graphs in the rdf store to files in a given directory"""

    option_list = BaseCommand.option_list + (
        make_option('-o', '--output', dest='directory', help='Directory in which to output RDF serializations'),
        make_option('--format', dest='format', help='Serialization format', default='ttl'),
        make_option('--overwrite', dest='overwrite', help='Overwrite the contents of the directory', default=False, action='store_true'),
    )

    def handle(self, directory, format, overwrite, *args, **kwargs):
        store = rdfstore()

        if not os.path.isdir(directory):
            os.mkdir(directory)

        if not overwrite and len(os.listdir(directory)) > 0:
            raise Exception('The directory "%s" is not empty, and the --overwrite flag was not set' % directory)

        if format.startswith('.'):
            format = format[1:]

        for context in store.contexts():
            graph = Graph(store, context)
            filename = urllib.quote(context, '')
            
            graph.serialize(os.path.abspath(os.path.join(directory, '%s.%s' % (filename, format))))
