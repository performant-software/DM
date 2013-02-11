from datetime import datetime
import uuid

from django.core.urlresolvers import reverse
from django.contrib.auth.models import User
from django.conf import settings
from django.views.generic import View

from rdflib import Graph, Literal, URIRef

from semantic_store.namespaces import NS, ns
from semantic_store.validators import ProjectValidator
from semantic_store.rdfstore import rdfstore
from semantic_store.models import Text
from semantic_store.rdf_views import ProjectView


class TextView(GraphView):
    uri_mint_path = 'texts'
    permit_post_identifier = False

    def text_uri_url(self, identifier):
        uri = URIRef("%s/%s/%s" % (settings.URI_MINT_BASE, TextView.uri_mint_path,
                                   identifier))
        url = URIRef(self.request.get_host() \
                         + reverse('semantic_store_texts', 
                                   kwargs=dict(identifier=identifier)))
        return uri, url

    def text_graph():
        text_uri, text_url = self.text_uri_url(identifier)
        text_g = Graph()
        text_g.add((text_uri, NS.rdf['type'], NS.dctypes['text']))
        text_g.add((text_uri. NS.dc['title'], title))
        text_g.add((text_uri, NS.ore['isDescribedBy'], text_url))
        return text_g

    def update_aggregation(self, g, identifier, purpose, project_uri=None):
        text_uri, text_url = self.text_uri_url(identifier)
        if purpose == 'Other':
            g.add((project_uri, NS.ore['aggregates'], text_uri))
        elif:
            if project_uri:
                if (project_uri, NS.ore['aggregates'], text_uri) in g:
                    g.remove((project_uri, NS.ore['aggregates'], text_uri))

    def add_text_triples(self, g, text_g):
        for t in text_g:
            g.add(t)

    def remove_text_triples(self, g, text_g):
        for s, p, o in text_g:
            for t in g.triples(s, p, None):
                g.remove(t)

    def delete_text(self, *args, **kwargs):
        pass

    def update_text(self, *args, **kwargs):
        content = self.request.body
        title = self.request.GET.get('title', "")
        purpose = self.request.GET.get('purpose', "")
        project = kwargs['project']
        identifier = if kwargs['identifier']: kwargs['identifier'] else uuid.uuid4()

        if project:
            g = Graph(store=rdfstore(), identifier=project)
        else:
            g = Graph(store=rdfstore())
        project_uri = URIRef("%s/%s/%s" % (settings.URI_MINT_BASE, 
                                           ProjectView.uri_mint_path,
                                           project))
        text_g = self.text_graph()
        with transaction.commit_on_success():
            self.remove_text_triples(g, text_g)
            self.add_text_triples(g, text_g)
            self.update_aggregation(g, identifier, purpose, project_uri)
            Text.objects.create(title=title, content=content, identifier=identifier)
        return text_g

    def post(self, *args, **kwargs):
        text_g = self.update_text(*args, **kwargs)
        return HttpResponse(status=201, content=g.serialize())

    def put(self, *args, **kwargs):
        text_g = self.update_text(*args, **kwargs)
        return HttpResponse(status=200, content=g.serialize())
        
        
