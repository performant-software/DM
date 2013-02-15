from optparse import make_option
import datetime
import pprint
import uuid

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.db import transaction

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef, Literal
from rdflib.namespace import Namespace

from semantic_store.rdfstore import rdfstore, default_identifier
from semantic_store import collection
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.rdf_views import UserView, ProjectView
from semantic_store import uris
from _projects import create_project


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
                    help="Uri of resource to be added"),)

    def handle(self, *args, **options):
        username = options['username']
        project_title = options['project_title']
        res_uri = options['res_uri']
        if (not (username and project_title and res_uri)):
            print "Username, project, and res are required arguments."
            exit(0)
        user_uri = uris.uri('semantic_store_users', username=username)
        user_g = Graph(store=rdfstore(), identifier=user_uri)
        query = """SELECT DISTINCT ?project
                   WHERE {
                       <%s> ore:aggregates ?project .
                       ?project dc:title "%s" .
                   }""" % (user_uri, project_title)
        qres = user_g.query(query, initNs=ns)
        results = list(qres)
        if len(results) == 0:
            print "No such project (%s) found for user, '%s'" % \
                (project_title, username)
            exit(0)
        project_identifier = results[0][0]
        with transaction.commit_on_success():
            uri = uris.uri('semantic_store_projects', identifier=project_identifier)
            project_g = Graph(store=rdfstore(), identifier=uri)
            project_g.add((project_identifier, NS.ore['aggregates'], URIRef(res_uri)))
            main_g = ConjunctiveGraph(store=rdfstore(), identifier=default_identifier)
            for t in main_g.triples((URIRef(res_uri), NS.dc['title'], None)):
                project_g.add(t)
            for t in main_g.triples((URIRef(res_uri), NS.ore['isDescribedBy'], None)):
                project_g.add(t)
            for t in main_g.triples((URIRef(res_uri), NS.rdf['type'], None)):
                project_g.add(t)
                


                
