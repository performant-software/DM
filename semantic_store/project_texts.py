from django.db import transaction
from django.http import HttpResponse, HttpResponseForbidden
from django.core.exceptions import ObjectDoesNotExist

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import Literal, URIRef

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import parse_request_into_graph, negotiated_graph_response
from semantic_store.models import Text
from semantic_store.users import has_permission_over
from semantic_store.annotations import resource_annotation_subgraph
from semantic_store.specific_resources import specific_resources_subgraph

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

# Create a project from a (POST) request to a specified project
# This function parses the data and then sends it to create_project_text which accepts a
#  graph object instead of a request object
def create_project_text_from_request(request, project_uri):
    if request.user.is_authenticated():
        if has_permission_over(username, project_uri, NS.perm.mayUpdate):
            try:
                g = parse_request_into_graph(request)
            except ParserError as e:
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)
            else:
                text_uri = URIRef(uris.uuid())
                update_project_text(g, project_uri, text_uri, request.user)
                return negotiated_graph_response(request, read_project_text(project_uri, text_uri), close_graph=True)
        else:
            return HttpResponseForbidden()
    else:
        return HttpResponse(status=401)

# Returns serialized data about a given text in a given project
# Although intended to be used with a GET request, works independent of a request
def read_project_text(project_uri, text_uri):
    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=project_uri)
    project_g = Graph(rdfstore(), identifier=project_uri)

    memory_project_g = Graph()
    memory_project_g += project_g

    project_g.close()

    # Make text uri URIRef (so Graph will understand)
    text_uri = URIRef(text_uri)

    # Create an empty graph and bind namespaces
    text_g = Graph()
    bind_namespaces(text_g)

    text_g.add((text_uri, NS.rdf.type, NS.dctypes.Text))
    text_g.add((text_uri, NS.rdf.type, NS.cnt.ContentAsChars))

    try:
        text = Text.objects.get(identifier=text_uri, valid=True)
    except ObjectDoesNotExist:
        pass
    else:
        text_g.set((text_uri, NS.dc.title, Literal(text.title)))
        text_g.set((text_uri, NS.rdfs.label, Literal(text.title)))
        text_g.set((text_uri, NS.cnt.chars, Literal(text.content)))

    text_g += resource_annotation_subgraph(memory_project_g, text_uri)

    text_g += specific_resources_subgraph(memory_project_g, text_uri)

    # Return graph about text
    return text_g

# Updates a project text based on data in the supplied graph
# Uses different name for arguments so that (unchanged) arguments can be passed to the 
#  read_project_text method to return the updated data
def update_project_text(g, p_uri, t_uri, user):
    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=p_uri)
    project_g = Graph(rdfstore(), identifier=project_uri)
    text_uri = URIRef(t_uri)

    title = g.value(text_uri, NS.dc.title) or g.value(text_uri, NS.rdfs.label) or Literal("")
    content = g.value(text_uri, NS.cnt.chars) or Literal("")

    with transaction.commit_on_success():
        for text in Text.objects.filter(identifier=t_uri, valid=True).only('valid'):
            text.valid = False
            text.save()

        text = Text.objects.create(identifier=t_uri, title=title, content=sanitized_content(content), last_user=user)

        project_g.add((text_uri, NS.rdf.type, NS.dctypes.Text))
        project_g.set((text_uri, NS.dc.title, title))
        project_g.set((text_uri, NS.rdfs.label, title))

        for t in specific_resources_subgraph(g, text_uri):
            project_g.add(t)

        for t in g.triple((None, NS.rdf.type, NS.oa.TextQuoteSelector)):
            project_g.set(t)

    project_g.close()

# Updates a project's text to match data in a (PUT) request
# This function parses the data and then sends it to update_project_text which accepts a
#  graph object instead of a request object
def update_project_text_from_request(request, project_uri, text_uri):
    if request.user.is_authenticated():
        if has_permission_over(request.user.username, project_uri, NS.perm.mayUpdate):
            try:
                g = parse_request_into_graph(request)
            except ParserError:
                return HttpResponse(status=400, content="Unable to parse serialization.")
            else:
                # On successful parse, send to basic method
                update_project_text(g, project_uri, text_uri, request.user)
                return read_project_text(project_uri, text_uri)
        else:
            return HttpResponseForbidden()
    else:
        return HttpResponse(status=401)


# Removes all data from a given project about a given text
# Although intended to be user with a DELETE request, works independently of a request
def remove_project_text(project_uri, text_uri):
    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=project_uri)
    project_g = Graph(rdfstore(), identifier=project_uri)

    # Make text uri a URIRef (so Graph will understand)
    text_uri = URIRef(text_uri)

    with transaction.commit_on_success():
        for t in specific_resources_subgraph(project_g, text_uri):
            project_g.remove(t)

        for t in project_g.triples((text_uri, None, None)):
            # Delete triple about text from project graph
            project_g.remove(t)

        project_g.remove((URIRef(project_uri), NS.ore.aggregates, text_uri))

        Text.objects.filter(identifier=text_uri).delete()

    project_g.close()



