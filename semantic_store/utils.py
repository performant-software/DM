from django.http import HttpResponse
from rdflib import Graph
from semantic_store.namespaces import NS

METADATA_PREDICATES = (
    NS.rdf.type,
    NS.ore.isDescribedBy,
    NS.rdfs.label,
    NS.dc.title,
    NS.exif.width,
    NS.exif.height,
    NS.oa.exact
)

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


def negotiated_graph_response(request, graph, close_graph=False, **kwargs):
    mimetypes = accept_mimetypes(request.META['HTTP_ACCEPT'])

    for mimetype in mimetypes:
        format = mimetype[mimetype.rfind('/') + 1:].strip()

        if format in RDFLIB_SERIALIZER_FORMATS:
            serialization = graph.serialize(format=format)

            if close_graph:
                graph.close()

            return HttpResponse(serialization, mimetype=mimetype, **kwargs)

    serialization = graph.serialize(format='turtle')

    if close_graph:
        graph.close()

    return HttpResponse(serialization, mimetype='text/turtle', **kwargs)

def parse_into_graph(graph, **kwargs):
    temp_graph = Graph()
    temp_graph.parse(**kwargs)
    for triple in temp_graph:
        graph.add(triple)

def parse_request_into_graph(request, graph):
    mimetype = request.META['CONTENT_TYPE']

    format = mimetype[mimetype.rfind('/') + 1:].strip()

    index_of_semicolon = format.rfind(';')
    if index_of_semicolon != -1:
        format = format[:index_of_semicolon]

    if format.startswith('rdf+'):
        format = format[4:]

    parse_into_graph(graph, format=format, data=request.body)