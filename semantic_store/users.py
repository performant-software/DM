from django.contrib.auth.models import User

from django.db import transaction
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseForbidden

from rdflib.graph import Graph, URIRef, ConjunctiveGraph
from rdflib.exceptions import ParserError

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import bind_namespaces,NS
from semantic_store import uris
from semantic_store.utils import negotiated_graph_response, parse_request_into_graph, metadata_triples

PERMISSION_PREDICATES = (
    NS.perm.hasPermissionOver,
    NS.perm.mayRead,
    NS.perm.mayUpdate,
    NS.perm.mayDelete,
    NS.perm.mayAugment,
    NS.perm.mayAdminister
)

def read_user(request, username=None):
    if username:
        username.strip("/")
        try:
            user = User.objects.get(username=username)
        except Exception as e:
            return HttpResponseNotFound()
        else:
            user_graph_identifier = uris.uri('semantic_store_users', username=username)
            print "reading info on user with identifier %s"%user_graph_identifier
            g = Graph(store=rdfstore(), identifier=user_graph_identifier)

            memory_graph = Graph()
            for t in g:
                memory_graph.add(t)

            if user.email:
                memory_graph.add((URIRef(user_graph_identifier), NS.foaf.mbox, URIRef("mailto:" + user.email)))

            # Add metadata info about projects
            for project in g.objects(None, NS.perm.hasPermissionOver):
                project_graph_identifier = uris.uri('semantic_store_projects', uri=project)
                project_graph = Graph(store=rdfstore(), identifier=project_graph_identifier)

                project_url = uris.url(request.get_host(), "semantic_store_projects", uri=project)
                memory_graph.add((project, NS.ore.isDescribedBy, URIRef(project_url)))

                for t in metadata_triples(project_graph, project):
                    memory_graph.add(t)

            return negotiated_graph_response(request, memory_graph, close_graph=True)
    else:
        return read_all_users(request)

def read_all_users(request):
    g = Graph()
    bind_namespaces(g)
    for u in User.objects.filter():
        user_graph_identifier = uris.uri('semantic_store_users', username=u.username)
        user_graph = Graph(store=rdfstore(), identifier=user_graph_identifier)

        for t in metadata_triples(user_graph, URIRef(user_graph_identifier)):
            g.add(t)

        user_graph.close()

    return negotiated_graph_response(request, g)

def permission_updates_are_allowed(request, input_graph):
    for perm_predicate in PERMISSION_PREDICATES:
        for user, p, project in input_graph.triples((None, perm_predicate, None)):
            has_admin_permissions = has_permission_over(request.user.username, project, NS.perm.mayAdminister)
            is_unowned_project = (None, NS.perm.mayAdminister, project) not in ConjunctiveGraph(store=rdfstore())

            project_graph = Graph(store=rdfstore(), identifier=uris.uri('semantic_store_projects', uri=project))
            is_empty_project = (project, NS.ore.aggregates, None) not in project_graph

            if not has_admin_permissions and not is_unowned_project and not is_empty_project:
                return False

    return True

def update_user(request, username):
    if request.user.is_authenticated():
        try:
            input_graph = parse_request_into_graph(request)
        except ParserError as e:
            return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

        if permission_updates_are_allowed(request, input_graph):
            graph = update_user_graph(request, input_graph, username)

            return negotiated_graph_response(request, graph, status=200, close_graph=True)
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

def update_user_graph(request, g, username):
    added_graph = Graph()

    with transaction.commit_on_success():
        user = uris.uri('semantic_store_users', username=username)
        user_graph = Graph(store=rdfstore(), identifier=user)

        if URIRef(uris.uri('semantic_store_users', username=username)) == user:
            if (user, NS.dm.lastOpenProject, None) in g:
                user_graph.remove((user, NS.dm.lastOpenProject, None))

        for triple in g.triples((user, None, None)):
            if is_allowed_update_triple(triple, unicode(user).strip('/').split('/')[-1], request):
                user_graph.add(triple)
                added_graph.add(triple)
            else:
                print "Triple %s was rejected to be added to user graph %s" % (triple, user)

    return added_graph

def remove_triples_from_user(request, username):
    g = Graph()
    removed = Graph()

    try:
        parse_request_into_graph(request, g)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    uri = uris.uri('semantic_store_users', username=username)
    graph = Graph(store=rdfstore(), identifier=uri)

    with transaction.commit_on_success():
        for t in g:
            if is_allowed_update_triple(t, username, request):
                graph.remove(t)
                removed.add(t)
            else:
                print "Triple %s was rejected to be removed from user graph" % unicode(triple)

    graph.close()
    g.close()

    return negotiated_graph_response(request, removed, status=200, close_graph=True)

def remove_triple(username, s, p, o):
    # todo: check validity of username? (will return false)
    # todo: check permissions
    with transaction.commit_on_success():
        uri = uris.uri('semantic_store_users', username=username)
        graph = Graph(store=rdfstore(), identifier=uri)
        if ((s,p,o)) in graph:
            graph.remove((s,p,o))
            graph.close()
            return True
    graph.close()
    return False

def has_permission_over(username, project_uri, permission=NS.perm.hasPermissionOver):
    user_uri = URIRef(uris.uri('semantic_store_users', username=username))
    user_graph = Graph(store=rdfstore(), identifier=user_uri)

    ret = (user_uri, URIRef(permission), URIRef(project_uri)) in user_graph

    user_graph.close()

    return ret

