from rdflib import Graph

from .GraphView import GraphView
from semantic_store.namespaces import NS, bind_namespaces
from semantic_store.validators import ProjectValidator
from semantic_store.rdfstore import rdfstore
from semantic_store.projects import create_project_graph
from semantic_store import uris


class ProjectView(GraphView):
    http_method_names = ['get', 'post']

    def new_nodes(self, g):
        subjs = g.subjects(NS.rdf['type'], NS.dcmitype['Collection'])
        return subjs

    def no_nodes_found(self, g):
        return "No nodes with %s of %s" % (NS.rdf['type'], NS.dcmitype['Collection'])

    def validator(self, request):
        dest_graph_uri = uris.uri('semantic_store_projects')
        dest_graph = Graph(store=rdfstore(), identifier=dest_graph_uri)
        project_validator = ProjectValidator(dest_graph, "Project")
        return project_validator
    
    def add_node(self, g, node, identifier):
        if self.request.user.is_authenticated():
            user_name = request.user.user_name
        else:
            user_name = None

        project_g = Graph()
        bin
        project_g = create_project_graph(self.request.get_host(), 
                                         user_name)
        return project_g
            
    def get(self, *args, **kwargs):
        return self.serialized_graph('semantic_store_projects', **kwargs)
