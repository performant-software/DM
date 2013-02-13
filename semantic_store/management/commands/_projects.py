from rdflib import BNode, Literal
from rdflib.graph import Graph

from semantic_store.models import ProjectPermission
from semantic_store.namespaces import NS, bind_namespaces
from semantic_store.projects import create_project_graph
from semantic_store.permissions import Permission


def create_project(user, project_identifier, title, host):
    g = Graph()
    bind_namespaces(g)
    project = BNode()
    title = Literal("Default project")
    g.add((project, NS.rdf['type'], NS.dcmitype['Collection']))
    g.add((project, NS.rdf['type'], NS.ore['Aggregation']))
    g.add((project, NS.dc['title'], title))
    create_project_graph(g, project, project_identifier, host, user.email)
    ProjectPermission.objects.create(identifier=project_identifier,
                                     user=user,
                                     permission=Permission.read_write)


def delete_project(user, project_identifier):
    pass
#    project_view.delete_node(project_identifier)
