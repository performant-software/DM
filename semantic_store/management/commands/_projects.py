from semantic_store.models import ProjectPermission
from semantic_store.projects import create_project_graph, create_project, delete_project
from semantic_store.permissions import Permission


def create_project(user, project_identifier, title, host):
    graph = create_project_graph(host, user.username, title, project = project_identifier)
    create_project(graph, host)

    ProjectPermission.objects.create(identifier=project_identifier,
                                     user=user,
                                     permission=Permission.read_write)


def delete_project(user, project_identifier):
    delete_project(project_identifier)