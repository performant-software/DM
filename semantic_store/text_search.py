from haystack.query import SearchQuerySet
from haystack.inputs import AutoQuery
from haystack.utils import Highlighter

from rdflib import Graph, URIRef, Literal

from semantic_store import uris, project_texts, utils, projects, annotations
from semantic_store.models import Text
from semantic_store.namespaces import NS

CSS_RESULT_MATCH_CLASS = 'sc-SearchResultItem-match-highlight'

class TitleHighlighter(Highlighter):
    def find_window(self, highlight_locations):
        return 0, self.max_length

def search_result_to_dict(result, project_uri, highlighter, title_highlighter):
    stored_fields = result.get_stored_fields()

    d = {
        'uri': stored_fields['identifier'],
        'url': uris.url('semantic_store_project_texts', project_uri=project_uri, text_uri=stored_fields['identifier']),
        'type': NS.dctypes.Text,
        'title': stored_fields['title'],
        'score': result.score,
        'highlighted_text': highlighter.highlight(result.text),
        'highlighted_title': title_highlighter.highlight(stored_fields['title']),
    }

    return d

def get_response(project_uri, query_string, include_n3=True):
    d = {
        'results': list(),
    }

    project_graph = projects.get_project_graph(project_uri)
    graph = Graph()

    query_set = SearchQuerySet().models(Text).filter(
        content=AutoQuery(query_string), project__exact=project_uri
    )

    highlighter = Highlighter(query_string, html_tag='span', css_class=CSS_RESULT_MATCH_CLASS)
    title_highlighter = TitleHighlighter(query_string, html_tag='span', css_class=CSS_RESULT_MATCH_CLASS)

    d['spelling_suggestion'] = query_set.spelling_suggestion()

    for result in query_set:
        text_uri = URIRef(result.get_stored_fields()['identifier'])

        if annotations.has_annotation_link(project_graph, text_uri) or projects.is_top_level_project_resource(project_uri, text_uri):
            d['results'].append(search_result_to_dict(result, project_uri, highlighter, title_highlighter))

            if include_n3:
                graph += utils.metadata_triples(project_graph, text_uri)

    if include_n3:
        d['n3'] = graph.serialize(format='n3')

    return d

def get_autocomplete(project_uri, query_string):
    query_set = SearchQuerySet().models(Text).filter(project__exact=project_uri).autocomplete(content_auto=query_string)[:7]
    return [result.title for result in query_set]
