from uuid import uuid4
from urlparse import urljoin
from django.core.urlresolvers import reverse
from django.conf import settings
from semantic_store.namespaces import NS

from rdflib import URIRef

def uri(viewname, **kwargs):
    uri = URIRef(settings.URI_MINT_BASE
                 + reverse(viewname, kwargs=kwargs))
    return uri

def url(viewname, **kwargs):
    url = URIRef("http://" 
                 + settings.STORE_HOST
                 + reverse(viewname, kwargs=kwargs))
    return url

def uuid():
    return URIRef(uuid4().urn)

def project_metadata_graph_identifier(project_uri):
    return URIRef(uri('semantic_store_projects', uri=project_uri) + '/metadata')

def add_is_described_bys(graph, project_uri):
    for uri in graph.subjects(NS.rdf.type, NS.sc.Canvas):
        canvas_url = URIRef(url('semantic_store_project_canvases', project_uri=project_uri, canvas_uri=uri))
        graph.add((uri, NS.ore.isDescribedBy, canvas_url))

    for uri in graph.subjects(NS.rdf.type, NS.dc.Text):
        text_url = URIRef(url('semantic_store_project_texts', project_uri=project_uri, text_uri=uri))
        graph.add((uri, NS.ore.isDescribedBy, text_url))

    for uri in graph.subjects(NS.rdf.type, NS.oa.SpecificResource):
        source = graph.value(uri, NS.oa.hasSource, None)
        if (source, NS.rdf.type, NS.sc.Canvas) in graph:
            canvas_url = URIRef(url("semantic_store_canvas_specific_resource", project_uri=project_uri, canvas_uri=source, specific_resource=uri))
            graph.add((uri, NS.ore.isDescribedBy, canvas_url))
        elif (source, NS.rdf.type, NS.dcmitype.Text) in graph:
            text_url = URIRef(url("semantic_store_text_specific_resource", project_uri=project_uri, text_uri=source, specific_resource=uri))
            graph.add((uri, NS.ore.isDescribedBy, text_url))

    return graph
