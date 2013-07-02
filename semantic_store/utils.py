from django.http import HttpResponse
from rdflib import Graph, URIRef

RDFQUERY_SERIALIZER_FORMATS = set((
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


def negotiated_graph_response(request, graph, **kwargs):
    mimetypes = accept_mimetypes(request.META['HTTP_ACCEPT'])

    for mimetype in mimetypes:
        format = mimetype[mimetype.rfind('/') + 1:].strip()

        if format in RDFQUERY_SERIALIZER_FORMATS:
            return HttpResponse(graph.serialize(format=format), mimetype=mimetype)

    return HttpResponse(graph.serialize(format='xml'), mimetype='text/xml', **kwargs)

def parse_into_graph(graph, **kwargs):
    temp_graph = Graph()
    temp_graph.parse(**kwargs)
    for triple in temp_graph:
        graph.add(triple)