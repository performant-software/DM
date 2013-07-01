from django.db import transaction
from django.http import HttpResponse

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import Literal, URIRef

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris

from datetime import datetime

# Create project text using data in a properly-formatted graph
# Can handle multiple texts, but only one project 
def create_project_text(g, project_uri):
    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=project_uri)
    project_g = Graph(rdfstore(), identifier=project_uri)

    # Get content and title out of request
    q = g.query("""SELECT ?title ?content 
                WHERE {
                    ?t dc:title ?title .
                    ?t cnt:chars ?content . 
                    ?t rdf:type cnt:ContentAsText .
                }""", initNs=ns)

    # Create an empty graph and bind namespaces
    return_graph = Graph()
    bind_namespaces(return_graph)

    with transaction.commit_on_success():
        # Using create_text_graph, add info to project graph and empty graph
        for title, content in q:
            project_g += create_text_graph(title, content)
            return_graph += create_text_graph(title, content)

        # Return graph of all added texts
        return return_graph

# Create a project from a (POST) request to a specified project
# This function parses the data and then sends it to create_project_text which accepts a
#  graph object instead of a request object
def create_project_text_from_request(request, project_uri):
    # Create empty graph and bind namespaces
    g = Graph()
    bind_namespaces(g)

    # Parse body of request, catching ParserError which breaks request
    try:
        g.parse(data=request.body)
    except ParserError:
        return HttpResponse(status=400, content="Unable to parse serialization.")
    else:
        # On successful parse, send to basic method
        return create_project_text(g, project_uri)

# Abstraction of creating the triples about a text
# Needs a title and content, but functions independently from a project since projects
#  and texts are not directly linked (they are linked through annotations)
def create_text_graph(title, content):
    # Create text uri
    text_uri=uris.uuid()

    # Create an empty graph and bind namespaces
    text_g = Graph()
    bind_namespaces(text_g)

    # Add text type(s)
    text_g.add((text_uri, NS.rdf['type'], NS.dctypes['Text']))
    text_g.add((text_uri, NS.rdf['type'], NS.cnt['ContentAsText']))

    # Add specific text data
    text_g.add((text_uri, NS.cnt['chars'], Literal(content)))
    text_g.add((text_uri, NS.dc['title'], Literal(title)))
    text_g.add((text_uri, NS.dcterms['created'], Literal(datetime.utcnow())))

    # No need to link project and text directly
    # Linking is handled via annotations

    # Return graph with properly formatted data
    return text_g

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

    # Get content and title out of request
    q = g.query("""SELECT ?content ?title
                WHERE{
                    ?t cnt:chars ?content .
                    ?t dc:title ?title .
                    ?t rdf:type dctypes:Text .
                }""", initNs=ns, initBindings={'t': text_uri})

    with transaction.commit_on_success():
        for content, title in q:
            # Replace content & title data in project graph
            project_g.set((text_uri, NS.cnt['chars'], Literal(content)))
            project_g.set((text_uri, NS.dc['title'], Literal(title)))

    # Return (updated) data about graph
    return read_project_text(p_uri, t_uri)

# Updates a project's text to match data in a (PUT) request
# This function parses the data and then sends it to update_project_text which accepts a
#  graph object instead of a request object
def update_project_text_from_request(request, project_uri, text_uri):
    # Create empty graph and bind namespaces
    g = Graph()
    bind_namespaces(g)

    # Parse body of request, catching ParserError which breaks request
    try:
        g.parse(data=request.body)
    except ParserError:
        return HttpResponse(status=400, content="Unable to parse serialization.")
    else:
        # On successful parse, send to basic method
        return update_project_text(g, project_uri, text_uri)


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
        for t in project_g.triples((text_uri, None, None)):
            # Add triple about text to empty graph
            deleted_g.add(t)

            # Delete triple about text from project graph
            project_g.remove(t)

        # Return serialized graph with triples removed 
        return deleted_g



