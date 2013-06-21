from django.http import HttpResponse, HttpResponseNotFound

from rdflib import Graph, URIRef

from .ProjectView import ProjectView
from semantic_store.namespaces import NS
from semantic_store.rdfstore import rdfstore
from semantic_store import uris


class ProjectTextView(ProjectView):
    http_method_names = ['get', 'post', 'put']
    view = 'semantic_store_project_texts'

    def text_graph(self, uri, url, title):
        text_g = Graph()
        text_g.add((URIRef(uri), NS.rdf['type'], NS.dctypes['Text']))
        text_g.add((URIRef(uri), NS.dc['title'], Literal(title)))
        text_g.add((URIRef(uri), NS.ore['isDescribedBy'], URIRef(url)))
        return text_g

    def update_text(self, *args, **kwargs):
        request = args[0]
        project_identifier = URIRef(kwargs['identifier'])
        if kwargs['text_identifier']: 
            identifier = URIRef(kwargs['text_identifier'])
        else:
            identifier = uris.uuid()
        content = request.body
        title = request.GET.get('title', "")

        alltexts_uri = uris.uri(self.view, **kwargs)
        alltexts_g = Graph(store=rdfstore(), identifier=alltexts_uri)

        text_uri = uris.uri('semantic_store_texts', **kwargs)
        text_url = uris.url(request.get_host, 'semantic_store_texts', **kwargs)

        text_g = self.text_graph(text_uri, text_url, title)
#        with transaction.commit_on_success():
        self.remove_text_triples(alltexts_g, text_g)
        self.add_text_triples(alltexts_g, text_g)
        t = (project_identifier, NS.ore['aggregates'], identifier) 
        if t not in alltexts_g:
            alltexts_g.add(t)
        # append only so always create
        Text.objects.create(title=title, content=content, 
                            identifier=str(identifier))
        return text_g

    def get(self, *args, **kwargs):
        project_identifier = kwargs['identifier']
        if 'text_identifier' in kwargs:
            text_identifier = kwargs['text_identifier']
            try:
                text = Text.objects.get(identifier=text_identifier)
                return HttpResponse(text.content)
            except:
                return HttpResponseNotFound()
        else:
            return self.serialized_graph('semantic_store_project_texts', **kwargs)

    def post(self, *args, **kwargs):
        text_g = self.update_text(*args, **kwargs)
        return HttpResponse(status=201, content=g.serialize())

    def put(self, *args, **kwargs):
        text_g = self.update_text(*args, **kwargs)
        return HttpResponse(status=200, content=g.serialize())
