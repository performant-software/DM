from optparse import make_option
import datetime
import pprint

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.core.urlresolvers import reverse
from django.db import transaction

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef, RDF
from rdflib.namespace import Namespace

import rdfstore
from semantic_store import collection


class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('--purge',
                    dest='purge',
                    help="Purge all triples for this collection and re-harvest."),
        make_option('--url',
                    default=None,
                    dest='url',
                    help="Collection URL (required)"),
        make_option('--uri',
                    default=None,
                    dest='uri',
                    help="Collection URI (required)"),
        make_option('--store_host',
                    default=None,
                    dest='store_host',
                    help="Store hostname and port (if other than 80) (required)"))
        make_option('--store_host',
                    default=None,
                    dest='store_host',
                    help="Store hostname and port (if other than 80) (required)"))

    def handle(self, *args, **options):
        rep_url = options['url']
        rep_uri = options['uri']
        store_host = self.clean_store_host(options['store_host'])
        manifest_file = options['manifest_file']
        if ((not col_url) or (not manifest_file) or (not col_uri) or 
            (not store_host)):
            print "url or manifest_file and uri arguments are required."
            exit(0)
        harvest_repository(col_url, col_uri, store_host, manifest_file)
        
                
