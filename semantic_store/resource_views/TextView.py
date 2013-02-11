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


class TextView(GraphView):
    uri_mint_path = 'texts'
    permit_post_identifier = False

    def update_text(self, *args, **kwargs):
        content = self.request.body
        title = self.request.GET.get('title', "")
        purpose = self.request.GET.get('purpose', "")
        project = kwargs['project']
        identifier = if kwargs['identifier']: kwargs['identifier'] else uuid.uuid4()

        Text.objects.create(title=title, content=content, identifier=identifier)
        if project:
            g = Graph(store=rdfstore(), identifier=project)
        else:
            g = Graph(store=rdfstore())
        text_uri = URIRef("%s/%s/%s" % (settings.URI_MINT_BASE, 
                                        TextView.uri_mint_path,
                                        identifier))
        g.add((text_uri, NS.rdf['type'], NS.dctypes['text']))
            

    def post(self, *args, **kwargs):
        return update_text(args, kwargs)

    def put(self, *args, **kwargs):
        return update_text(args, kwargs)
        
        
