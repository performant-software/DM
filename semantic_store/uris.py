from uuid import uuid4
from urlparse import urljoin
from django.core.urlresolvers import reverse
from django.conf import settings

from rdflib import URIRef

def uri(viewname, **kwargs):
    uri = URIRef(settings.URI_MINT_BASE
                 + reverse(viewname, kwargs=kwargs))
    return uri

def url(host, viewname, **kwargs):
    url = URIRef("http://" 
                 + host
                 + reverse(viewname, kwargs=kwargs))
    return url

def uuid():
    return URIRef(uuid4().urn)

def project_metadata_graph_identifier(project_uri):
    return URIRef(uri('semantic_store_projects', uri=project_uri) + '/metadata')