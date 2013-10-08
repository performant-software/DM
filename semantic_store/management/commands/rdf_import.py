from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction, IntegrityError
from optparse import make_option
import os

from rdflib import Graph, URIRef, Literal
from rdflib.util import guess_format

from semantic_store.projects import create_project
from semantic_store.namespaces import ns, NS

class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('-f', '--filename', dest='filename', help='RDF file to parse'),
        make_option('-d', '--directory', dest='directory', help='Directory in which to look for RDF files to parse'),
    )

    DEFAULT_PASSWORD_STRING = 'password'

    def parse_file(self, filename):
        print '- Parsing %s' % filename

        graph = Graph()
        graph.parse(filename, format=guess_format(filename) or 'turtle')

        self.add_all_users(graph)
        create_project(graph)

        print '-- Done.'

    def add_all_users(self, graph):
        query = graph.query("""SELECT ?user ?email
        WHERE {
            ?user perm:hasPermissionOver ?project .
            ?user foaf:mbox ?email .
            ?user rdf:type foaf:Agent
        }""", initNs = ns)

        for q in query:
            username = ""
            # Remove username from customized uri
            s = q[0].split("/")[-1]
            username = s.split("'),")[0]

            email = q[1].split("mailto:")[-1]

            try:
                u = User.objects.create_user(username, email, self.DEFAULT_PASSWORD_STRING)
            except IntegrityError:
                transaction.rollback_unless_managed()
                print "User '%s' already existed in the database, and was not created." % username
            else:
                u.save()
                print "User '%s' was created successfully." % username

    def handle(self, filename, directory, store_host, *args, **options):
        if filename:
            self.parse_file(os.path.join(os.getcwd(), filename))

        if directory:
            qualified_directory_path = os.listdir(os.path.join(os.getcwd(), directory))
            for filename in qualified_directory_path:
                if filename.startswith('.'):
                    continue
                self.parse_file(os.path.join(qualified_directory_path, filename))
