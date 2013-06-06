from datetime import datetime

from django.core.urlresolvers import reverse
from django.conf import settings
from django.db import transaction

from rdflib import Graph, URIRef, Literal
from semantic_store.namespaces import NS, bind_namespaces
from semantic_store import uris

from semantic_store.rdfstore import rdfstore

def create_project_graph(g, node, identifier, host, title, user_email=None):
    with transaction.commit_on_success():
        allprojects_uri = uris.uri('semantic_store_projects')
        allprojects_g = Graph(store=rdfstore(), identifier=allprojects_uri)
        bind_namespaces(allprojects_g)
        
        #print "all projects", allprojects_g.serialize()

        uri = uris.uri('semantic_store_projects', uri=identifier)
        project_g = Graph(store=rdfstore(), identifier=uri)
        bind_namespaces(project_g)
        #print "new project", project_g.serialize()

        for s, p, o in g.triples((node, NS.rdf['type'], None)):
            allprojects_g.add((identifier, p, o))
        url = uris.url(host, 'semantic_store_projects', uri=identifier)
        allprojects_g.add((identifier, NS.ore['isDescribedBy'], url))
        #print "all projects", allprojects_g.serialize()

        allprojects_g.add((identifier, NS.dc['title'], Literal(title)))

        project_g.add((identifier, NS.ore['isDescribedBy'], url))
        project_g.add((identifier, NS.dcterms['created'], Literal(datetime.utcnow())))
        project_g.add((identifier, p, o))
        if user_email:
            project_g.add((identifier, NS.dcterms['creator'], URIRef(user_email)))

        #print "new project", project_g.serialize()

        for s, p, o in g.triples((node, None, None)):
            project_g.add((identifier, p, o))
        for agg in g.objects(node, NS.ore['aggregates']):
            for t in g.triples((agg, None, None)):
                project_g.add(t)

        #print "all projects", allprojects_g.serialize()
        #print "new project", project_g.serialize()
        return project_g


# Creates a graph identified by user of the projects belonging to the user, which
# # can be found at the descriptive url of the user (/store/user/<username>)
# The graph houses the uri of all of the user's projects and the url where more info
# # can be found about each project
def create_project_user_graph(host, user, project):
    with transaction.commit_on_success():
        identifier = uris.uri('semantic_store_users', username=user)
        g = Graph(store=rdfstore(), identifier = identifier)
        bind_namespaces(g)
        g.add((identifier, NS.ore['aggregates'], project))
        g.add((project, NS.ore['isDescribedBy'], uris.url(host, "semantic_store_projects", uri=project)))
        return g.serialize()
