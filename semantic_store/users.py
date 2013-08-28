from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.db import transaction, IntegrityError
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseForbidden

from rdflib import Graph, URIRef, ConjunctiveGraph, Literal
from rdflib.exceptions import ParserError

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import bind_namespaces,NS
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response, parse_request_into_graph, metadata_triples
from semantic_store.models import ProjectPermission
from semantic_store.permissions import (
    PERMISSION_URIS_BY_MODEL_VALUE,
    PERMISSION_MODEL_VALUES_BY_URI,
    PERMISSION_PREDICATES,
    grant_read_permissions,
    grant_write_permissions,
    grant_admin_permissions,
    is_unowned_project,
    has_permission_over
)

USER_GRAPH_IDENTIFIER = URIRef('http://dm.drew.edu/store/users')

def user_metadata_graph(username=None, user=None):
    if user is None:
        user = User.objects.get(username=username)
    if username is None:
        username = user.username

    graph = Graph()
    user_uri = URIRef(uris.uri('semantic_store_users', username=username))

    graph.add((user_uri, NS.rdf.type, NS.foaf.Agent))
    graph.add((user_uri, NS.rdfs.label, Literal(username)))

    if user.email:
        graph.add((user_uri, NS.foaf.mbox, URIRef("mailto:" + user.email)))

    return graph

def user_graph(request, username=None, user=None):
    if user is None:
        user = User.objects.get(username=username)
    if username is None:
        username = user.username

    user_graph = Graph(store=rdfstore(), identifier=USER_GRAPH_IDENTIFIER)

    user_uri = URIRef(uris.uri('semantic_store_users', username=username))
    graph = Graph()

    graph += user_metadata_graph(user=user)

    graph += user_graph.triples((user_uri, NS.dm.lastOpenProject, None)):

    for permission in ProjectPermission.objects.filter(user=user):
        perm_uri = PERMISSION_URIS_BY_MODEL_VALUE[permission.permission]
        project_uri = URIRef(permission.identifier)

        graph.add((user_uri, NS.perm.hasPermissionOver, project_uri))
        graph.add((user_uri, perm_uri, project_uri))

    # Add metadata info about projects
    for project in graph.objects(user_uri, NS.perm.hasPermissionOver):
        project_graph_identifier = uris.uri('semantic_store_projects', uri=project)
        project_graph = Graph(store=rdfstore(), identifier=project_graph_identifier)

        project_url = uris.url(request.get_host(), "semantic_store_projects", uri=project)
        graph.add((project, NS.ore.isDescribedBy, URIRef(project_url)))

        for t in metadata_triples(project_graph, project):
            graph.add(t)

    #TODO: dm:lastOpenProject

    return graph

def read_user(request, username=None):
    if username:
        username.strip("/")
        try:
            user = User.objects.get(username=username)
        except Exception as e:
            return HttpResponseNotFound()
        else:
            graph = user_graph(request, user=user)

            return negotiated_graph_response(request, graph, close_graph=True)
    else:
        return read_all_users(request)

def read_all_users(request):
    g = Graph()
    bind_namespaces(g)
    for u in User.objects.filter():
        g += user_metadata_graph(user=u)

    return negotiated_graph_response(request, g)

def permission_updates_are_allowed(request, input_graph):
    for perm_predicate in PERMISSION_PREDICATES:
        for user, p, project in input_graph.triples((None, perm_predicate, None)):
            has_admin_permissions = has_permission_over(project, user=request.user, permission=NS.perm.mayAdminister)

            project_graph = Graph(store=rdfstore(), identifier=uris.uri('semantic_store_projects', uri=project))
            is_empty_project = (project, NS.ore.aggregates, None) not in project_graph

            if not has_admin_permissions and not is_unowned_project() and not is_empty_project:
                return False

    return True

def update_user(request, username):
    if request.user.is_authenticated():
        try:
            input_graph = parse_request_into_graph(request)
        except ParserError as e:
            return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

        if permission_updates_are_allowed(request, input_graph):
            user_uri = URIRef(uris.uri('semantic_store_users', username=username))
            user_graph = Graph(store=rdfstore(), identifier=USER_GRAPH_IDENTIFIER)

            with transaction.commit_on_success():
                try:
                    user = User.objects.get(username=username)
                except ObjectDoesNotExist:
                    return HttpResponse('User %s does not exist' % (username), status=400)
                else:
                    for t in input_graph.triples((user_uri, NS.dm.lastOpenProject, None)):
                        user_graph.set(t)

                    for project in input_graph.objects(user_uri, NS.perm.mayRead):
                        grant_read_permissions(project, user=user)

                    for project in input_graph.objects(user_uri, NS.perm.mayUpdate):
                        grant_write_permissions(project, user=user)

                    for project in input_graph.objects(user_uri, NS.perm.mayAdminister):
                        grant_admin_permissions(project, user=user)

            return HttpResponse(status=204)
        else:
            return HttpResponseForbidden('The PUT graph contained permissions updates which were not allowed')
    else:
        return HttpResponse(status=401)

ALLOWED_USER_UPDATE_PREDICATES = PERMISSION_PREDICATES + (NS.dm.lastOpenProject,)

def is_allowed_update_triple(triple, username, request=None):
    uri = URIRef(uris.uri('semantic_store_users', username=username))

    subject = triple[0]
    predicate = triple[1]
    obj = triple[2]

    if request is not None:
        if triple[1] == NS.dm.lastOpenProject:
            # Ensure a user can only set their own last opened project
            return (subject == uri and request.user.username == username)
        else:
            return predicate in PERMISSION_PREDICATES
    else:
        return predicate in ALLOWED_USER_UPDATE_PREDICATES

def remove_triples_from_user(request, username):
    removed = Graph()
    user = User.objects.get(username=username)

    try:
        input_graph = parse_request_into_graph(request)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    with transaction.commit_on_success():
        for t in input_graph:
            if is_allowed_update_triple(t, username, request):
                removed.add(t)
                user_uri, perm, project = t

                revoke_permission_by_uri(perm, project, user=user)
            else:
                print "Triple %s was rejected to be removed from user graph" % unicode(triple)

    return HttpResponse(status=204)

