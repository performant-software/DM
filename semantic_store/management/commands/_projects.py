from semantic_store.models import ProjectPermission
from semantic_store.projects import create_project_graph
import semantic_store.projects
import semantic_store.permissions


def create_project(user, project_identifier, title, host):
    graph = create_project_graph(host, user.username, title, project = project_identifier)
    semantic_store.projects.create_project(graph, host)

    ProjectPermission.objects.create(identifier=project_identifier,
                                     user=user,
                                     permission=Permission.read_write)


def delete_project(user, project_identifier):
    semantic_store.projects.delete_project(project_identifier)