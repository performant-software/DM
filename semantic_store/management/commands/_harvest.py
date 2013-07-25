from django.core.urlresolvers import reverse
from django.db import transaction

from rdflib.graph import Graph
from rdflib import URIRef

from semantic_store.rdfstore import rdfstore
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


def clean_store_host(store_host):
    store_host = store_host.rstrip("/")
    store_host = store_host.replace("http://", "")
    return store_host


def localize_describes(store_host, uri, url, g):
    if url:
        for t in g.triples((URIRef(url), ns['ore']['describes'], None)):
            g.remove(t)
    for t in g.triples((URIRef(uri), ns['ore']['isDescribedBy'], URIRef(url) if url else None)):
        g.remove(t)
    local_rel_url = reverse('semantic_store_resources' , kwargs={'uri': str(uri)})
    local_abs_url = "http://%s%s" % (store_host, local_rel_url)
    g.add((URIRef(uri), ns['ore']['isDescribedBy'], URIRef(local_abs_url)))


def harvest_collection(col_url, col_uri, store_host, manifest_file=None):
    store_host = clean_store_host(store_host)
    with transaction.commit_on_success():        
        col_g = Graph(store=rdfstore(), identifier=URIRef(col_uri))
        collection.fetch_and_parse(col_url, col_g, manifest_file=manifest_file)
        localize_describes(store_host, col_uri, col_url, col_g)

        res_uris_urls = collection.aggregated_uris_urls(col_uri, col_g)
        for res_uri, res_url in res_uris_urls:
            res_g = Graph(store=rdfstore(), identifier=URIRef(res_uri))
            collection.fetch_and_parse(res_url, res_g)
            for pred in col_res_attributes:
                for t in res_g.triples((res_uri, pred, None)):
                    col_g.add(t)

            aggr_uris_urls = collection.aggregated_uris_urls(res_uri, res_g)
            for aggr_uri, aggr_url in aggr_uris_urls:
                if aggr_url:
                    collection.fetch_and_parse(aggr_url, res_g)
                    localize_describes(store_host, aggr_uri, aggr_url, res_g)
                    localize_describes(store_host, aggr_uri, aggr_url, col_g)

            seq_uris_urls = collection.aggregated_seq_uris_urls(res_uri, res_g)
            for seq_uri, seq_url in seq_uris_urls:
                page_uris_urls = collection.aggregated_uris_urls(seq_uri, res_g)
                for page_uri, page_url in page_uris_urls:
                    localize_describes(store_host, page_uri, page_url, res_g)
            localize_describes(store_host, res_uri, res_url, res_g)
            localize_describes(store_host, res_uri, res_url, col_g)


def harvest_repository(rep_uri, rep_url, store_host, manifest_file=None):
    store_host = clean_store_host(store_host)
    with transaction.commit_on_success():
        rep_g = Graph(store=rdfstore(), identifier=URIRef(rep_uri))
        collection.fetch_and_parse(rep_url, rep_g)
        localize_describes(store_host, rep_uri, rep_url, rep_g)
        agg_uris_urls = collection.aggregated_uris_urls(rep_uri, rep_g)
        for agg_uri, agg_url in agg_uris_urls:
            harvest_collection(agg_url, agg_uri, store_host, manifest_file)
    
