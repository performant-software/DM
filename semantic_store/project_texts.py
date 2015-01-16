from django.db import transaction
from django.http import HttpResponse, HttpResponseForbidden
from django.core.exceptions import ObjectDoesNotExist

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import Literal, URIRef

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import parse_request_into_graph, NegotiatedGraphResponse
from semantic_store.models import Text
from semantic_store.users import has_permission_over
from semantic_store.annotations import resource_annotation_subgraph
from semantic_store.specific_resources import specific_resources_subgraph

from datetime import datetime

from bs4 import BeautifulSoup, Comment

import logging
logger = logging.getLogger(__name__)

def sanitized_content(content):
    soup = BeautifulSoup(content)

    for comment in soup.find_all(text=lambda text: isinstance(text, Comment)):
        comment.extract()

    for script in soup.find_all('script'):
        script.extract()

    # Scrub javascript event attributes
    for tag in soup.find_all(True):
        for attr in tag.attrs.keys():
            if attr.startswith('on'):
                del tag.attrs[attr]

    # Scrub javascript links
    for a in soup.find_all('a'):
        if 'href' in a.attrs and a['href'].startswith('javascript:'):
            a.replace_with(unicode(s) for s in a.contents)

    content = ''.join(unicode(s) for s in soup.find('body').contents)

    content = content.replace("'", "&#39;")

    logger.debug("$$$$$$$$ content after the replace AT THE END:")
    logger.debug(content)

    return content

# Create a project from a (POST) request to a specified project
# This function parses the data and then sends it to create_project_text which accepts a
# graph object instead of a request object
def create_project_text_from_request(request, project_uri, request_text_uri):
    if request.user.is_authenticated():
        if has_permission_over(project_uri, user=request.user, permission=NS.perm.mayUpdate):
            try:
                logger.debug('!!!!!!!!!!!!!!! project_texts.py - create_project_text_from_request')
                g = parse_request_into_graph(request)
            except (ParserError, SyntaxError) as e:
                logger.debug('!!!!!!!!!!!!!!! project_texts.py - create_project_text_from_request - EXCEPTION !!!!!!!!')
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)
            else:
                logger.debug('!!!!!!!!!!!!!!! project_texts.py - create_project_text_from_request - ELSE !!!!!!!!')
                text_uri = URIRef(uris.uuid())
                logger.debug("uris.uuid(): %s", uris.uuid())
                logger.debug("text_uri: %s", text_uri)
                logger.debug('!!!!!!!!!!!!!!! project_texts.py - create_project_text_from_request - CREATING TEXT... !!!!!!!!')
                update_project_text(g, project_uri, text_uri, request.user)
                logger.debug('!!!!!!!!!!!!!!! project_texts.py - create_project_text_from_request - CREATING TEXT COMPLETE !!!!!!!!')
                logger.debug('!!!!!!!!!!!!!!! project_texts.py - create_project_text_from_request - UPDATING... !!!!!!!!')
                update_project_text(g, project_uri, request_text_uri, request.user)
                logger.debug('!!!!!!!!!!!!!!! project_texts.py - create_project_text_from_request - UPDATING COMPLETE !!!!!!!!')
                return NegotiatedGraphResponse(request, read_project_text(project_uri, text_uri))
        else:
            return HttpResponseForbidden()
    else:
        return HttpResponse(status=401)

def overwrite_text_graph_from_model(text_uri, project_uri, text_g):
    try:
        text = Text.objects.get(identifier=text_uri, valid=True, project=project_uri)
    except ObjectDoesNotExist:
        pass
    else:
        text_g.add((text_uri, NS.rdf.type, NS.dctypes.Text))
        text_g.add((text_uri, NS.rdf.type, NS.cnt.ContentAsChars))

        text_g.set((text_uri, NS.dc.title, Literal(text.title)))
        text_g.set((text_uri, NS.rdfs.label, Literal(text.title)))
        text_g.set((text_uri, NS.cnt.chars, Literal(text.content)))

        text_g.set((text_uri, NS.dc.modified, Literal(text.timestamp)))

    return text_g

def text_graph_from_model(text_uri, project_uri):
    text_g = Graph()

    return overwrite_text_graph_from_model(text_uri, project_uri, text_g)

# Returns serialized data about a given text in a given project
# Although intended to be used with a GET request, works independent of a request
def read_project_text(project_uri, text_uri):
    # Correctly format project uri and get project graph
    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    project_g = Graph(rdfstore(), identifier=project_identifier)

    # Make text uri URIRef (so Graph will understand)
    text_uri = URIRef(text_uri)

    # Create an empty graph and bind namespaces
    text_g = Graph()
    bind_namespaces(text_g)

    text_g += resource_annotation_subgraph(project_g, text_uri)

    text_g += specific_resources_subgraph(project_g, text_uri, project_uri)

    overwrite_text_graph_from_model(text_uri, project_uri, text_g)

    # Return graph about text
    return text_g

# Updates a project text based on data in the supplied graph
# Uses different name for arguments so that (unchanged) arguments can be passed to the 
# read_project_text method to return the updated data
def update_project_text(g, p_uri, t_uri, user):
    logger.debug("************* Updating project")
    # Correctly format project uri and get project graph
    project_uri = uris.uri('semantic_store_projects', uri=p_uri)
    logger.debug("!!!!!!!!!!!!!! Here 1")
    project_g = Graph(rdfstore(), identifier=project_uri)
    logger.debug("!!!!!!!!!!!!!! Here 2")
    project_metadata_g = Graph(rdfstore(), identifier=uris.project_metadata_graph_identifier(p_uri))
    logger.debug("!!!!!!!!!!!!!! Here 3")
    text_uri = URIRef(t_uri)
    logger.debug("!!!!!!!!!!!!!! Here 4")

    title = g.value(text_uri, NS.dc.title) or g.value(text_uri, NS.rdfs.label) or Literal("")
    logger.debug("!!!!!!!!!!!!!! Here 5")
    content_value = g.value(text_uri, NS.cnt.chars)
    logger.debug("!!!!!!!!!!!!!! Here 6")
    logger.debug("g: %s", g)
    logger.debug("g.value: %s", g.value)
    logger.debug("text_uri: %s", text_uri)
    logger.debug("NS.cnt.chars: %s", NS.cnt.chars)
    logger.debug("content_value: %s", content_value)
    if content_value:
        content = sanitized_content(content_value)
        logger.debug("!!!!!!!!!!!!!! Here 6.1")
    else:
        content = ''
        logger.debug("!!!!!!!!!!!!!! Here 6.2")

    with transaction.commit_on_success():
        logger.debug("!!!!!!!!!!!!!! Here 7")
        for t in Text.objects.filter(identifier=t_uri, valid=True):
            logger.debug("!!!!!!!!!!!!!! Here 8")
            t.valid = False
            logger.debug("!!!!!!!!!!!!!! Here 9")
            t.save()
            logger.debug("!!!!!!!!!!!!!! Here 10")
            # While it looks like this would be better with a QuerySet update, we need to fire the save
            # events to keep the search index up to date. In all forseeable cases, this should only execute
            # for one Text object anyway.

        text = Text.objects.create(identifier=t_uri, title=title, content=content, last_user=user, project=p_uri)
        logger.debug("!!!!!!!!!!!!!! Here 11")

        project_g.add((text_uri, NS.rdf.type, NS.dctypes.Text))
        logger.debug("!!!!!!!!!!!!!! Here 12")
        project_g.set((text_uri, NS.dc.title, title))
        logger.debug("!!!!!!!!!!!!!! Here 13")
        project_g.set((text_uri, NS.rdfs.label, title))
        logger.debug("!!!!!!!!!!!!!! Here 14")

        text_url = URIRef(uris.url('semantic_store_project_texts', project_uri=p_uri, text_uri=text_uri))
        logger.debug("!!!!!!!!!!!!!! Here 15")
        project_g.set((text_uri, NS.ore.isDescribedBy, text_url))
        logger.debug("!!!!!!!!!!!!!! Here 16")

        if (URIRef(p_uri), NS.ore.aggregates, text_uri) in project_metadata_g:
            logger.debug("!!!!!!!!!!!!!! Here 16.1")
            project_metadata_g.add((text_uri, NS.rdf.type, NS.dctypes.Text))
            logger.debug("!!!!!!!!!!!!!! Here 16.2")
            project_metadata_g.set((text_uri, NS.dc.title, title))
            logger.debug("!!!!!!!!!!!!!! Here 16.3")
            project_metadata_g.set((text_uri, NS.rdfs.label, title))
            logger.debug("!!!!!!!!!!!!!! Here 16.4")

    logger.debug("!!!!!!!!!!!!!! Here 17")
    specific_resource_triples = specific_resources_subgraph(g, text_uri, p_uri)
    logger.debug("!!!!!!!!!!!!!! Here 18")
    for t in specific_resource_triples:
        logger.debug("!!!!!!!!!!!!!! Here 19")
        project_g.add(t)

    for t in g.triples((None, NS.rdf.type, NS.oa.TextQuoteSelector)):
        logger.debug("!!!!!!!!!!!!!! Here 20")
        project_g.set(t)

# Updates a project's text to match data in a (PUT) request
# This function parses the data and then sends it to update_project_text which accepts a
# graph object instead of a request object
def update_project_text_from_request(request, project_uri, text_uri):
    logger.debug("************** update_project_text_from_request")
    logger.debug("%%%%%%%%%%%%%% request.body:")
    logger.debug("\r" + request.body)
    logger.debug("%%%%%%%%%%%%%% project_uri:")
    logger.debug("\r" + project_uri)
    logger.debug("%%%%%%%%%%%%%% text_uri:")
    logger.debug("\r" + text_uri)
    if request.user.is_authenticated():
        if has_permission_over(project_uri, user=request.user, permission=NS.perm.mayUpdate):
            try:
                logger.debug('!!!!!!!!!!!!!!! project_texts.py - update_project_text_from_request')
                g = parse_request_into_graph(request)
            except (ParserError, SyntaxError) as e:
                return HttpResponse(status=400, content="Unable to parse serialization. %s" % e)
            else:
                # On successful parse, send to basic method
                update_project_text(g, project_uri, text_uri, request.user)
                return HttpResponse(status=204)
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
    project_metadata_g = Graph(rdfstore(), identifier=uris.project_metadata_graph_identifier(p_uri))

    # Make text uri a URIRef (so Graph will understand)
    text_uri = URIRef(text_uri)

    with transaction.commit_on_success():
        for t in specific_resources_subgraph(project_g, text_uri, project_uri):
            project_g.remove(t)

        for t in project_g.triples((text_uri, None, None)):
            # Delete triple about text from project graph
            project_g.remove(t)
            project_metadata_g.remove(t)

        project_g.remove((URIRef(project_uri), NS.ore.aggregates, text_uri))

        for text in Text.objects.filter(identifier=text_uri, valid=True).only('valid'):
            text.valid = False
            text.save()

class NoNonemptyTextVersion(Exception):
    """
    Exception for the restore_latest_nonempty_text_version function
    Raised when no non-empty version of the text can be found
    """
    pass

def restore_latest_nonempty_text_version(text_uri, project_uri):
    """
    Iterates through all saved versions of a text starting with the most recent,
    and makes the most recent version which is not empty (as determined by plain
    text converted content) the valid version of the Text.
    """

    def restore(text):
        for t in Text.objects.filter(identifier=text_uri, valid=True):
            t.valid = False
            t.save()

        text.valid = True
        text.save()

    with transaction.commit_on_success():
        for t in Text.objects.filter(identifier=text_uri).order_by('-timestamp'):
            if len(t.plain_content()) > 0:
                if not t.valid:
                    restore(t)
                break
        else:
            raise NoNonemptyTextVersion()

def restore_all_blank_texts(project_uri):
    for t in Text.objects.filter(project=project_uri, valid=True):
        try:
            restore_latest_nonempty_text_version(t.identifier, project_uri)
        except NoNonemptyTextVersion:
            pass
