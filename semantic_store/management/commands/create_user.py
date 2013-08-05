from optparse import make_option

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction

from rdflib.graph import Graph
from rdflib import Literal

from semantic_store import rdfstore
from semantic_store.namespaces import NS
from semantic_store import uris
from _projects import create_project


class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('--username',
                    dest='username',
                    help="Username for new user"),
        make_option('--email',
                    dest='email',
                    help="Email address for new user"),
        make_option('--password',
                    default=None,
                    dest='password',
                    help="Password for new user"),
        make_option('--store_host',
                    default=None,
                    dest='store_host',
                    help="Store hostname and port (if other than 80) (required)"))

    def handle(self, *args, **options):
        username = options['username']

        email = options['email']
        password = options['password']
        store_host = options['store_host']
        if (not (username and email and password and store_host)):
            print "Username, email, password, and store_host arguments are required."
            exit(0)

        with transaction.commit_on_success():
            user = User.objects.create_user(username, email, password)
        
            project_identifier = uris.uuid()
            project_url = uris.url(store_host, 'semantic_store_projects', 
                                   uri=project_identifier)
            title = "Default project"
            create_project(user, project_identifier, title, store_host)

            user_identifier = uris.uri('semantic_store_users', username=username)
            print user_identifier
            user_url = uris.url(store_host, 'semantic_store_users', username=username)
            user_g = Graph(store=rdfstore.rdfstore(), identifier=user_identifier)

            user_g.add((user_identifier, NS.ore['aggregates'], project_identifier))
            user_g.add((user_identifier, NS.perm['hasPermissionOver'], project_identifier))
            user_g.add((user_identifier, NS.perm['mayRead'], project_identifier))
            user_g.add((user_identifier, NS.perm['mayUpdate'], project_identifier))
            user_g.add((user_identifier, NS.perm['mayDelete'], project_identifier))
            user_g.add((user_identifier, NS.perm['mayAugment'], project_identifier))
            user_g.add((user_identifier, NS.perm['mayAdminister'], project_identifier))
            user_g.add((project_identifier, NS.dc['title'], Literal(title))) 
            user_g.add((project_identifier, NS.rdf['type'], NS.dcmitype['Collection']))
            user_g.add((project_identifier, NS.rdf['type'], NS.ore['Aggregation']))
            user_g.add((project_identifier, NS.ore['isDescribedBy'], project_url))

            user_g.add((user_identifier, NS.rdf['type'], NS.dcmitype['Collection']))
            user_g.add((user_identifier, NS.rdf['type'], NS.ore['Aggregation']))
            user_g.add((user_identifier, NS.rdf['type'], NS.foaf['Agent']))
            user_g.add((user_identifier, NS.ore['isDescribedBy'], user_url))

            user_g.close()

                
