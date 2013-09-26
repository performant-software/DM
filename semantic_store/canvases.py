from django.db import transaction

from rdflib.exceptions import ParserError
from rdflib import Literal, URIRef, Graph

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import parse_request_into_graph, negotiated_graph_response, metadata_triples
from semantic_store.annotations import resource_annotation_subgraph
from semantic_store.specific_resources import specific_resources_subgraph

def canvas_and_images_graph(graph, canvas_uri):
    canvas_uri = URIRef(canvas_uri)

    canvas_graph = Graph()
    canvas_graph += graph.triples((canvas_uri, None, None))

    qres = graph.query("""SELECT ?image_anno ?image WHERE {
        ?image_anno a oa:Annotation .
        ?image_anno oa:hasTarget ?canvas .
        ?image_anno oa:hasBody ?image .
        { ?image a dcmitype:Image . } UNION { ?image a dms:Image . } UNION {?image a dms:ImageChoice . } .
    }""", initNs=ns, initBindings={'canvas': canvas_uri})

    for image_anno, image in qres:
        canvas_graph += graph.triples((image_anno, None, None))
        canvas_graph += graph.triples((image, None, None))

    return canvas_graph

def all_canvases_and_images_graph(graph):
    canvas_graph = Graph()

    qres = graph.query("""SELECT DISTINCT ?canvas ?image_anno ?image WHERE {
        { ?canvas a sc:Canvas .} UNION { ?canvas a dms:Canvas .} .
        { ?image a dcmitype:Image . } UNION { ?image a dms:Image . } UNION {?image a dms:ImageChoice . } .
        ?image_anno a oa:Annotation .
        ?image_anno oa:hasTarget ?canvas .
        ?image_anno oa:hasBody ?image .
    }""", initNs=ns, initBindings={})

    for canvas, image_anno, image in qres:
        canvas_graph += graph.triples((canvas, None, None))
        canvas_graph += graph.triples((image_anno, None, None))
        canvas_graph += graph.triples((image, None, None))

    return canvas_graph

def canvas_subgraph(graph, canvas_uri):
    canvas_uri = URIRef(canvas_uri)

    canvas_graph = Graph()

    canvas_graph += canvas_and_images_graph(graph, canvas_uri)

    canvas_graph += resource_annotation_subgraph(graph, canvas_uri)

    canvas_graph += specific_resources_subgraph(graph, canvas_uri)

    return canvas_graph

def read_canvas(request, project_uri, canvas_uri):
    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    project_graph = Graph(store=rdfstore(), identifier=project_identifier)

    memory_project_graph = Graph()
    memory_project_graph += project_graph

    memory_graph = Graph()
    memory_graph += canvas_subgraph(memory_project_graph, canvas_uri)

    for text in memory_graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        if (text, NS.ore.isDescribedBy, None) not in memory_graph:
            text_url = URIRef(uris.url(request.get_host(), 'semantic_store_project_texts', project_uri=project_uri, text_uri=text))
            memory_graph.add((text, NS.ore.isDescribedBy, text_url))

    for canvas in memory_graph.subjects(NS.rdf.type, NS.sc.Canvas):
        if (canvas, NS.ore.isDescribedBy, None) not in memory_graph:
            canvas_url = URIRef(uris.url(request.get_host(), 'semantic_store_project_canvases', project_uri=project_uri, canvas_uri=canvas))
            memory_graph.add((canvas, NS.ore.isDescribedBy, canvas_url))

    return memory_graph

def update_canvas(project_uri, canvas_uri, input_graph):
    project_uri = URIRef(project_uri)
    canvas_uri = URIRef(canvas_uri)

    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    project_graph = Graph(store=rdfstore(), identifier=project_identifier)
    project_metadata_g = Graph(rdfstore(), identifier=uris.project_metadata_graph_identifier(project_uri))

    with transaction.commit_on_success():
        if (canvas_uri, NS.dc.title, None) in input_graph:
            project_graph.remove((canvas_uri, NS.dc.title, None))
            project_metadata_g.remove((canvas_uri, NS.dc.title, None))
        if (canvas_uri, NS.rdfs.label, None) in input_graph:
            project_graph.remove((canvas_uri, NS.rdfs.label, None))
            project_metadata_g.remove((canvas_uri, NS.rdfs.label, None))

        project_graph += input_graph
        project_metadata_g += canvas_and_images_graph(input_graph, canvas_uri)

    return project_graph

def remove_canvas_triples(project_uri, canvas_uri, input_graph):
    project_graph = Graph(store=rdfstore(), identifier=canvas_identifier)
    project_metadata_g = Graph(rdfstore(), identifier=uris.project_metadata_graph_identifier(project_uri))

    removed_graph = Graph()

    with transaction.commit_on_success():
        for t in input_graph:
            if t in project_graph:
                project_graph.remove(t)
                project_metadata_g.remove(t)
                removed_graph.add(t)

        return removed_graph
