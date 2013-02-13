from datetime import datetime

from django.core.urlresolvers import reverse
from django.contrib.auth.models import User
from django.conf import settings

from rdflib import Graph, Literal, URIRef

from .GraphView import GraphView
from semantic_store.namespaces import NS, ns
from semantic_store.validators import ProjectValidator
from semantic_store.rdfstore import rdfstore


class ProjectView(GraphView):
    uri_mint_path = 'projects'

    def new_nodes(self, g):
        subjs = g.subjects(NS.rdf['type'], NS.dcmitype['Collection'])
        return subjs

    def no_nodes_found(self, g):
        return "No nodes with %s of %s" % (NS.rdf['type'], NS.dcmitype['Collection'])

    def validator(self, request):
        dest_graph = Graph(store=rdfstore(), 
                           identifier=reverse('semantic_store_projects'))
        project_validator = ProjectValidator(dest_graph, "Project")
        return project_validator

    def add_node(self, g, node, identifier):
        allprojects_uri = URIRef(reverse('semantic_store_projects'))
        allprojects_g = Graph(store=rdfstore(), identifier=allprojects_uri)

        project_g = Graph(store=rdfstore(), identifier=identifier)
        project_uri = URIRef("%s/%s/%s" % (settings.URI_MINT_BASE, 
                                           ProjectView.uri_mint_path,
                                           identifier))

        url = URIRef(self.request.get_host() \
                         + reverse('semantic_store_projects', 
                                   kwargs=dict(identifier=identifier)))

        for s, p, o in g.triples((node, NS.rdf['type'], None)):
            allprojects_g.add((project_uri, p, o))
        allprojects_g.add((project_uri, NS.ore['isDescribedBy'], url))

        project_g.add((project_uri, NS.ore['isDescribedBy'], url))
        project_g.add((project_uri, NS.dcterms['created'], Literal(datetime.utcnow())))
        project_g.add((project_uri, p, o))
        if self.request.user.is_authenticated():
            project_g.add((project_uri, NS.dcterms['creator'],
                           URIRef(self.request.user.email)))
        
        for s, p, o in g.triples((node, None, None)):
            project_g.add((project_uri, p, o))
        for agg in g.objects(node, NS.ore['aggregates']):
            for t in g.triples((agg, None, None)):
                project_g.add(t)
        return project_g
            
        
