from django.core.management.base import BaseCommand
from django.db import transaction

from django.contrib.auth.models import User

from semantic_store import uris

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns
from rdflib import Graph, URIRef, Literal

class Command(BaseCommand):
    option_list = BaseCommand.option_list

    def handle(self, *args, **options):
        store = rdfstore()

        for u in User.objects.filter():
            user_graph_identifier = uris.uri('semantic_store_users', username=u.username)
            user_graph = Graph(store=store, identifier=user_graph_identifier)

            print 'Updating user graph %s' % user_graph_identifier

            for project in user_graph.objects(None, NS.perm.hasPermissionOver):
                project_graph_identifier = uris.uri('semantic_store_projects', uri=project)
                project_graph = Graph(store=store, identifier=project_graph_identifier)

                if (len(list(project_graph.triples((project, NS.rdf.type, NS.ore.Aggregation))))):
                    with transaction.commit_on_success():
                        print '-Updating project graph %s' % project
                        project_graph.add((project, NS.rdf.type, NS.foaf.Project))
                        project_graph.add((project, NS.rdf.type, NS.dm.Project))

