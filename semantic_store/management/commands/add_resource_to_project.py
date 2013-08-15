from optparse import make_option

from django.core.management.base import BaseCommand
from django.db import transaction

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef
from rdflib.resource import Resource

from semantic_store.rdfstore import rdfstore, default_identifier
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris

from collections import defaultdict


class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('--username',
                    dest='username',
                    help="Username for new user"),
        make_option('--project',
                    dest='project_title',
                    help="Title of project"),
        make_option('--res',
                    dest='res_uri',
                    help="Uri of resource to be added"))

    def project_uris_by_title(self, user_graph, user_uri):
        projectsByTitle = defaultdict(list)
        bind_namespaces(user_graph)
        for row in user_graph.query("""
                SELECT DISTINCT ?project ?title WHERE {
                    ?user ore:aggregates ?project .
                    OPTIONAL {?project dc:title ?title .}
                }
            """, initNs = ns, initBindings={'user': URIRef(user_uri)}):
            project_uri = uris.uri('semantic_store_projects', uri=row[0])
            project_graph = Graph(store=rdfstore(), identifier=project_uri)

            project_resource = Resource(project_graph, URIRef(row[0]))
            titles = list(project_resource.objects(predicate=NS.dc['title']))

            if len(titles) == 0 and row[1]:
                # The project graph doesn't have a title triple, but the user graph does, so use that
                projectsByTitle[unicode(row[1])].append(row[0])
            else:
                # Use the project graph's title triples (preferred)
                for title in titles:
                    projectsByTitle[unicode(title)].append(row[0])

        project_graph.close()

        return projectsByTitle

    def handle(self, *args, **options):
        username = options['username']
        project_title = options['project_title']
        res_uri = options['res_uri']
        if (not (username and project_title and res_uri)):
            print "Username, project, and res are required arguments."
            exit(0)
        user_uri = uris.uri('semantic_store_users', username=username)
        user_g = Graph(store=rdfstore(), identifier=user_uri)

        # Project title data is stored in the named graph for that project, so we need
        # to query those graphs rather than just the user graph
        projectsByTitle = self.project_uris_by_title(user_g, user_uri)
        user_g.close()
        print "projectsByTitle: %s" % projectsByTitle.items()
        
        if project_title not in projectsByTitle:
            print "No such project with title '%s' found for user '%s'" % \
                (project_title, username)
            print "User %s has projects entitled %s" % (username, projectsByTitle.keys())
            exit(0)
        
        project_uris = projectsByTitle[project_title]
        if len(project_uris) > 1:
            print "More than one project with that title exists."
            exit(0)
        else:
            project_identifier = project_uris[0]

            with transaction.commit_on_success():
                uri = uris.uri('semantic_store_projects', uri=project_identifier)
                project_g = Graph(store=rdfstore(), identifier=uri)
                project_g.add((project_identifier, NS.ore['aggregates'], URIRef(res_uri)))
                main_g = ConjunctiveGraph(store=rdfstore(), identifier=default_identifier)
                for t in main_g.triples((URIRef(res_uri), NS.dc['title'], None)):
                    project_g.add(t)
                for t in main_g.triples((URIRef(res_uri), NS.ore['isDescribedBy'], None)):
                    project_g.add(t)
                for t in main_g.triples((URIRef(res_uri), NS.rdf['type'], None)):
                    project_g.add(t)
                project_g.close()
                


                
