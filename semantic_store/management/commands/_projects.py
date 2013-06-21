from rdflib import BNode, Literal
from rdflib.graph import Graph

from datetime import datetime

from semantic_store.models import ProjectPermission
from semantic_store.namespaces import NS, bind_namespaces
from semantic_store.projects import create_project_graph
from semantic_store.permissions import Permission
from semantic_store.uri import uuid


def create_project(user, project_identifier, title, host):
    create_project_graph(host, user.username, title, project = identifier)
    ProjectPermission.objects.create(identifier=project_identifier,
                                     user=user,
                                     permission=Permission.read_write)


def delete_project(user, project_identifier):
    pass
#    project_view.delete_node(project_identifier)