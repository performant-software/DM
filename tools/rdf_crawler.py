import cookielib
import logging
import multiprocessing
from rdflib import Graph, URIRef, Namespace
import Queue
import sys
import threading
import urllib2

ORE = Namespace('http://www.openarchives.org/ore/terms/')

def read_graph_from_url(url, url_opener, format='turtle'):
    g = Graph()

    try:
        f = url_opener.open(url)
        raw_content = f.read()
    except urllib2.HTTPError as e:
        logging.error('%s: %s', e, e.read())
        raise e
    except urllib2.URLError as e:
        logging.error(e)
        raise e

    g.parse(data=raw_content, format=format)

    return g

def crawl(seed_url, url_opener, format='turtle'):
    seed_url = URIRef(seed_url)
    aggregated_graph = Graph()

    logging.debug('Started with seed %s', seed_url)

    visited = set()
    frontier = set([seed_url])
    failed = set()

    while frontier:
        current_url = frontier.pop()
        logging.info('Crawling %s', current_url)

        try:
            current_graph = read_graph_from_url(current_url, url_opener, format)
        except urllib2.URLError as e:
            failed.add(current_url)
            continue
        finally:
            visited.add(current_url)

        for node_url in current_graph.objects(None, ORE.isDescribedBy):
            if node_url not in visited:
                frontier.add(node_url)

        aggregated_graph += current_graph

    if failed:
        logging.warning('Failed URLs: %s', ', '.join(failed))

    return aggregated_graph

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print "usage: rdf_crawler.py <seed_url> <output_filename>"
        print ("... when prompted, enter the full contents of the cookie your "
               "browser is sending with requests after logging in")
        sys.exit(1)

    logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)

    cookie = raw_input('Cookie: ')
    opener = urllib2.build_opener()
    opener.addheaders.append(('Cookie', cookie))
    opener.addheaders.append(('Host', 'dm.drew.edu'))
    opener.addheaders.append(('Accept', 'text/turtle'))

    g = crawl(sys.argv[1], opener, format='turtle')
    g.serialize(sys.argv[2], format='turtle')
