from django.http import HttpResponse
from django.conf import settings
from django.utils import simplejson
from rdflib import Graph, URIRef, Literal, BNode
from semantic_store.namespaces import NS, bind_namespaces
from datetime import datetime
from contextlib import contextmanager
import re
from uuid import uuid4
from rdflib.exceptions import ParserError

import logging
logger = logging.getLogger(__name__)

METADATA_PREDICATES = [
    NS.rdf.type,
    NS.ore.isDescribedBy,
    NS.rdfs.label,
    NS.dc.title,
    NS.dcterms.description,
    NS.exif.width,
    NS.exif.height,
    NS.oa.exact
]

RDFLIB_SERIALIZER_FORMATS = set((
    'n3',
    'nquads',
    'nt',
    'pretty',
    'trig',
    'trix',
    'turtle',
    'xml',
))

def accept_mimetypes(accept_string):
    accept_parts = accept_string.split(',')
    accept_parts = (s.strip() for s in accept_parts)

    for part in accept_parts:
        index_of_semicolon = part.rfind(';')
        format = part[:index_of_semicolon] if index_of_semicolon != -1 else part
        yield format

class NegotiatedGraphResponse(HttpResponse):
    default_format = 'turtle'
    default_type = 'text'

    def __init__(self, request, graph, *args, **kwargs):
        mimetypes = list(accept_mimetypes(request.META['HTTP_ACCEPT']))

        if settings.DEBUG and mimetypes[0].strip().lower().endswith('html'):
            format = NegotiatedGraphResponse.default_format
            kwargs['mimetype'] = '%s/%s' % (NegotiatedGraphResponse.default_type, NegotiatedGraphResponse.default_format)
        else:
            for mimetype in mimetypes:
                format = mimetype[mimetype.rfind('/') + 1:].strip().lower()

                if format in RDFLIB_SERIALIZER_FORMATS:
                    kwargs['mimetype'] = '%s/%s' % (NegotiatedGraphResponse.default_type, NegotiatedGraphResponse.default_format)
                    break
            else:
                format = NegotiatedGraphResponse.default_format
                kwargs['mimetype'] = '%s/%s' % (NegotiatedGraphResponse.default_type, NegotiatedGraphResponse.default_format)

        super(NegotiatedGraphResponse, self).__init__(self, *args, **kwargs)

        bind_namespaces(graph)
        self.content = graph.serialize(format=format)

        # Note(tandres): Tried this to make it more memory efficient, but I encountered infinite recursion in django's HttpResponse write method
        # graph.serialize(self, format=format)

class JsonResponse(HttpResponse):
    def __init__(self, content, mimetype='application/json', *args, **kwargs):
        super(JsonResponse, self).__init__(mimetype=mimetype, *args, **kwargs)
        if settings.DEBUG:
            simplejson.dump(content, self, indent=4)
        else:
            simplejson.dump(content, self)

def parse_into_graph(graph=None, *args, **kwargs):
    if graph is None:
        graph = Graph()
        temp_graph = graph
    else:
        temp_graph = Graph()

    temp_graph.parse(*args, **kwargs)
    graph += temp_graph

    return graph

def parse_request_into_graph(request, graph=None):
    mimetype = request.META['CONTENT_TYPE']

    format = mimetype[mimetype.rfind('/') + 1:].strip()

    index_of_semicolon = format.rfind(';')
    if index_of_semicolon != -1:
        format = format[:index_of_semicolon]

    if format.startswith('rdf+'):
        format = format[4:]
        
    body = request.body.replace("&#39;","")
    
    try:
        gph = parse_into_graph(graph, format=format, data=body)
        print "PARSED"
    except (ParserError, SyntaxError) as e:
        print "IT BROKE %s" % e
        print body
        raise e
        
    return gph

def metadata_triples(graph, subject=None):
    for t in graph.triples_choices((subject, METADATA_PREDICATES, None)):
        yield t

def list_subgraph(graph, l):
    """
    Returns a graph of all the rdf:first, rdf:rest triples necessary to define
    a list, but not the items themselves.
    """
    assert l is not None

    subgraph = Graph()

    chain = set([l])
    while l:
        subgraph += graph.triples((l, None, None))
        l = graph.value(l, NS.rdf.rest)

        if l in chain:
            raise ValueError("List contains a loop")
        chain.add(l)

    return subgraph

def get_title(graph, subject):
    return graph.value(subject, NS.dc.title) or graph.value(subject, NS.rdfs.label)

def set_title(graph, subject, title):
    title = Literal(title)
    graph.set((subject, NS.dc.title, title))
    graph.set((subject, NS.rdfs.label, title))

@contextmanager
def timed_block(description='untitled operation'):
    start_time = datetime.now()
    yield
    end_time = datetime.now()
    print '- %s excecuted in %ss' % (description, end_time-start_time)

def print_triples(triples):
    """Prints a turtle serialization of an iterable of triples"""
    g = Graph()
    bind_namespaces(g)
    g += triples

    serialization = g.serialize(format='turtle')

    # Remove the @prefix section for easier readability
    last_match = None
    for match in re.finditer('^@prefix.+\.$', serialization, flags=re.MULTILINE):
        last_match = match

    if last_match:
        print serialization[last_match.end() + 1:].strip('\n')
    else:
        print serialization

def b_nodes(graph):
    for s in graph.subjects(None, None):
        if isinstance(s, BNode):
            yield s

def urnify_bnodes(graph):
    for b_node in b_nodes(graph):
        urn = URIRef(uuid4().urn)

        for t in graph.triples((b_node, None, None)):
            graph.remove(t)
            graph.add((urn, t[1], t[2]))

        for t in graph.triples((None, None, b_node)):
            graph.remove(t)
            graph.add((t[0], t[1], urn))

    return graph

def line_column_string_insert(line_number, column_number, s, insert):
    builder = []
    counter = 0
    for line in s.split('\n'):
        counter += 1

        if counter == line_number:
            builder.append(u'%s%s%s' % (line[:column_number - 1], insert, line[column_number - 1:]))
        else:
            builder.append(line)

    return '\n'.join(builder)

def line_numbered_string(s):
    builder = []
    counter = 1
    for line in s.split('\n'):
        builder.append(u"{:>4}: {}\n".format(counter, line))
        counter += 1

    return u''.join(builder)

