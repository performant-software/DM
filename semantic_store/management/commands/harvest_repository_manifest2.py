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

from semantic_store.namespaces import ns


col_res_attributes = (ns['dc']['title'], 
                      ns['rdf']['type'], 
                      ns['dc']['identifier'], 
                      ns['tei']['repository'],
                      ns['tei']['settlement'], 
                      ns['tei']['idno'], 
                      ns['tei']['institution'],
                      ns['tei']['country'])


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


    def localize_describes(self, uri, url, g):
        for t in g.triples((URIRef(url), ns['ore']['describes'], URIRef(uri))):
            g.remove(t)
        for t in g.triples((URIRef(uri), ns['ore']['isDescribedBy'], URIRef(url))):
            g.remove(t)
        local_rel_url = reverse('semantic_store_manifest' , kwargs={'uri': str(uri)})
        local_abs_url = "http://%s%s" % (self.store_host, local_rel_url)
        g.add((URIRef(uri), ns['ore']['isDescribedBy'], URIRef(local_abs_url)))

    def clean_store_host(self, store_host):
        store_host = store_host.rstrip("/")
        store_host = store_host.replace("http://", "")
        return store_host

    def handle(self, *args, **options):
        rep_url = options['url']
        rep_uri = options['uri']
        self.store_host = self.clean_store_host(options['store_host'])
        if (not rep_url) or (not rep_uri) or (not self.store_host):
            print "url and uri arguments are required."
            exit(0)
        
        with transaction.commit_on_success():
            rep_g = Graph(store=rdfstore.rdfstore(), identifier=URIRef(rep_uri))
            collection.fetch_and_parse(rep_url, rep_g)
            self.localize_describes(rep_uri, rep_url, rep_g)
            agg_uris_urls = collection.aggregated_uris_urls(rep_uri, rep_g)
            for agg_uri, agg_url in agg_uris_urls:
                self.localize_describes(agg_uri, agg_url, rep_g)
#        print col_g.serialize()
        
                
