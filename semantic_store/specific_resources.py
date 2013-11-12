from django.db import transaction

from rdflib import Literal, URIRef, Graph
from rdflib.plugins.sparql import prepareQuery

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store.utils import metadata_triples
from semantic_store.annotations import resource_annotation_subgraph
from semantic_store import uris

def specific_resource_subgraph(graph, specific_resource):
    specific_resource_graph = Graph()

    specific_resource_graph += graph.triples((specific_resource, None, None))
    specific_resource_graph += resource_annotation_subgraph(graph, specific_resource)

    for selector in graph.objects(specific_resource, NS.oa.hasSelector):
        specific_resource_graph += graph.triples((selector, None, None))

    return specific_resource_graph

def specific_resources_subgraph(graph, source_uri, project_uri):
    specific_resources_graph = Graph()

    if (source_uri, NS.rdf.type, NS.sc.Canvas) in graph:
        source_type = NS.sc.Canvas
    elif (source_uri, NS.rdf.type, NS.dcmitype.Text) in graph:
        source_type = NS.dcmitype.Text

    for specific_resource in graph.subjects(NS.oa.hasSource, source_uri):
        selector = graph.value(specific_resource, NS.oa.hasSelector)
        specific_resources_graph += graph.triples((specific_resource, None, None))
        specific_resources_graph += graph.triples((selector, None, None))

        # Add appropriate ore:isDescribedBy triples for each Specific Resource so the client can request annotations on that specific resource as needed
        if source_type == NS.sc.Canvas:
            specific_resources_graph.add((specific_resource, NS.ore.isDescribedBy, URIRef(uris.url("semantic_store_canvas_specific_resource", project_uri=project_uri, canvas_uri=source_uri, specific_resource=specific_resource))))
        elif source_type == NS.dcmitype.Text:
            specific_resources_graph.add((specific_resource, NS.ore.isDescribedBy, URIRef(uris.url("semantic_store_text_specific_resource", project_uri=project_uri, text_uri=source_uri, specific_resource=specific_resource))))

    return specific_resources_graph

def read_specific_resource(project_uri, specific_resource, source):
    specific_resource = URIRef(specific_resource)

    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    db_project_graph = Graph(store=rdfstore(), identifier=project_identifier)

    project_graph = db_project_graph

    return_graph = Graph()

    return_graph += project_graph.triples((specific_resource, None, None))

    selectors = project_graph.objects(specific_resource, NS.oa.hasSelector)
    for selector in selectors:
        return_graph += project_graph.triples((selector, None, None))

    if (URIRef(source), NS.rdf.type, NS.sc.Canvas) in project_graph:
        return_graph.add((specific_resource, NS.ore.isDescribedBy, URIRef(uris.url("semantic_store_canvas_specific_resource", project_uri=project_uri, canvas_uri=source, specific_resource=specific_resource))))
    elif (URIRef(source), NS.rdf.type, NS.dcmitype.Text) in project_graph:
        return_graph.add((specific_resource, NS.ore.isDescribedBy, URIRef(uris.url("semantic_store_text_specific_resource", project_uri=project_uri, text_uri=source, specific_resource=specific_resource))))

    return_graph += resource_annotation_subgraph(project_graph, specific_resource)

    return return_graph

def update_specific_resource(graph, project_uri, specific_resource_uri):
    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    db_project_graph = Graph(store=rdfstore(), identifier=project_identifier)

    with transaction.commit_on_success():
        for t in specific_resource_subgraph(graph, specific_resource_uri):
            db_project_graph.add(t)

            for selector in graph.objects(specific_resource_uri, NS.oa.hasSelector):
                for i in graph.triples((selector, None, None)):
                    db_project_graph.set(i)

def blank_specific_resources(graph):
    for uri in graph.subjects(NS.rdf.type, NS.oa.SpecificResource):
        if len(graph.triples((uri, NS.oa.hasSelector, None))) == 0 or len(graph.triples((uri, NS.oa.hasSource, None))) == 0:
            yield uri
