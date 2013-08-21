from django.db import transaction
from django.http import HttpResponse

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import Literal, URIRef

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import parse_request_into_graph

from datetime import datetime

from bs4 import BeautifulSoup, Comment

def sanitized_content(content):
    soup = BeautifulSoup(content)

    for comment in soup.find_all(text=lambda text: isinstance(text, Comment)):
        comment.extract()

    for script in soup.find_all('script'):
        script.extract()

    content = ''.join(unicode(s) for s in soup.find('body').contents)

    return content

# Create project text using data in a properly-formatted graph
# Can handle multiple texts, but only one project 
def create_project_text(g, project_uri):
    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=project_uri)
    project_g = Graph(rdfstore(), identifier=project_uri)

    text_uri = URIRef(uris.uuid())

    with transaction.commit_on_success():
        project_g.add((text_uri, NS.dcterms.created, Literal(datetime.utcnow())))
        update_project_text(g, project_uri, text_uri)
        return read_project_text(project_uri, text_uri)

# Create a project from a (POST) request to a specified project
# This function parses the data and then sends it to create_project_text which accepts a
#  graph object instead of a request object
def create_project_text_from_request(request, project_uri):
    # Create empty graph and bind namespaces
    g = Graph()
    bind_namespaces(g)

    # Parse body of request, catching ParserError which breaks request
    try:
        parse_request_into_graph(request, g)
    except ParserError as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)
    else:
        # On successful parse, send to basic method
        return create_project_text(g, project_uri)

# Returns serialized data about a given text in a given project
# Although intended to be used with a GET request, works independent of a request
def read_project_text(project_uri, text_uri):
    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=project_uri)
    project_g = Graph(rdfstore(), identifier=project_uri)

    # Make text uri URIRef (so Graph will understand)
    text_uri = URIRef(text_uri)

    # Create an empty graph and bind namespaces
    text_g = Graph()
    bind_namespaces(text_g)

    # Add all triples with text as subject to graph
    for t in project_g.triples((text_uri,None, None)):
        text_g.add(t)

    # Add specific resources
    for specific_resource in project_g.subjects(NS.oa.hasSource, text_uri):
        for t in project_g.triples((specific_resource, None, None)):
            text_g.add(t)
        selector = project_g.value(specific_resource, NS.oa.hasSelector, None)
        for t in project_g.triples((selector, None, None)):
            text_g.set(t)

    project_g.close()

    # Return graph about text
    return text_g

# Updates a project text based on data in the supplied graph
# Uses different name for arguments so that (unchanged) arguments can be passed to the 
#  read_project_text method to return the updated data
def update_project_text(g, p_uri, t_uri):
    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=p_uri)
    project_g = Graph(rdfstore(), identifier=project_uri)
    text_uri = URIRef(t_uri)

    title = g.value(text_uri, NS.dc.title) or g.value(text_uri, NS.rdfs.label) or Literal("")
    content = g.value(text_uri, NS.cnt.chars) or Literal("")

    with transaction.commit_on_success():
        project_g.add((text_uri, NS.rdf.type, NS.dctypes.Text))
        project_g.set((text_uri, NS.dc.title, title))
        project_g.set((text_uri, NS.rdfs.label, title))
        project_g.set((text_uri, NS.cnt.chars, Literal(sanitized_content(content))))

        for specific_resource in g.subjects(NS.oa.hasSource, text_uri):
            for t in g.triples((specific_resource, None, None)):
                project_g.add(t)
            selector = g.value(specific_resource, NS.oa.hasSelector, None)
            for t in g.triples((selector, None, None)):
                project_g.set(t)

    project_g.close()

# Updates a project's text to match data in a (PUT) request
# This function parses the data and then sends it to update_project_text which accepts a
#  graph object instead of a request object
def update_project_text_from_request(request, project_uri, text_uri):
    # Create empty graph and bind namespaces
    g = Graph()
    bind_namespaces(g)

    # Parse body of request, catching ParserError which breaks request
    try:
        parse_request_into_graph(request, g)
    except ParserError:
        return HttpResponse(status=400, content="Unable to parse serialization.")
    else:
        # On successful parse, send to basic method
        update_project_text(g, project_uri, text_uri)
        return read_project_text(project_uri, text_uri)


# Removes all data from a given project about a given text
# Although intended to be user with a DELETE request, works independently of a request
def remove_project_text(project_uri, text_uri):
    # Create an empty graph and bind namespaces
    deleted_g = Graph()
    bind_namespaces(deleted_g)

    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=project_uri)
    project_g = Graph(rdfstore(), identifier=project_uri)

    # Make text uri a URIRef (so Graph will understand)
    text_uri = URIRef(text_uri)

    with transaction.commit_on_success():
        for specific_resource in project_g.subjects(NS.oa.hasSource, text_uri):
            selector = g.value(specific_resource, NS.oa.hasSelector, None)
            for t in project_g.triples((selector, None, None)):
                deleted_g.add(t)
                project_g.remove(t)
            for t in project_g.triples((specific_resource, None, None)):
                deleted_g.add(t)
                project_g.remove(t)

        for t in project_g.triples((text_uri, None, None)):
            # Add triple about text to empty graph
            deleted_g.add(t)

            # Delete triple about text from project graph
            project_g.remove(t)

    project_g.close()
    deleted_g.close()



