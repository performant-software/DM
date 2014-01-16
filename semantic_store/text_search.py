from haystack.query import SearchQuerySet
from haystack.inputs import AutoQuery

from rdflib import Graph, URIRef, Literal

from semantic_store import uris, project_texts, utils, projects
from semantic_store.models import Text

def search_result_to_dict(result, project_uri):
    stored_fields = result.get_stored_fields()

    d = {
        'uri': stored_fields['identifier'],
        'url': uris.url('semantic_store_project_texts', project_uri=project_uri, text_uri=stored_fields['identifier']),
        'title': stored_fields['title'],
        'score': result.score,
        'highlighted': result.highlighted,
    }

    return d

def get_response(project_uri, query_string):
    d = {
        'results': list(),
    }

    project_graph = projects.get_project_graph(project_uri)
    graph = Graph()

    query_set = SearchQuerySet().models(Text).filter(
        content=AutoQuery(query_string), project__exact=project_uri
    ).highlight()

    d['spelling_suggestion'] = query_set.spelling_suggestion()

    for result in query_set:
        d['results'].append(search_result_to_dict(result, project_uri))

        graph += utils.metadata_triples(project_graph, result.get_stored_fields()['identifier'])

    d['n3'] = graph.serialize(format='n3')

    return d