from django.core.management.base import BaseCommand
from optparse import make_option
import os

from rdflib import Graph, URIRef, Literal

from semantic_store import permissions

class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('-u', '--username', dest='username', help='The username of the user to grant permissions to'),
        make_option('-p', '--project_uri', dest='project', help='The URI of the project to which the user should have full permissions'),
    )

    def handle(self, username, project, *args, **options):
        if username and project:
            permissions.grant_full_project_permissions(username, URIRef(project))
        else:
            print "Username (-u) and Project URI (-p) are required paramaters"
