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
    )

    def handle(self, *args, **options):
        username = options['username']

        email = options['email']
        password = options['password']
        if (not (username and email and password)):
            print "Username, email, and password arguments are required."
            exit(0)

        with transaction.commit_on_success():
            user = User.objects.create_user(username, email, password)

                
