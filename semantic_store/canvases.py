from django.db import transaction

from rdflib.exceptions import ParserError
from rdflib import Literal, URIRef, Graph
from rdflib.plugins.sparql import prepareQuery

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import parse_request_into_graph, NegotiatedGraphResponse, metadata_triples
from semantic_store.annotations import resource_annotation_subgraph
from semantic_store.specific_resources import specific_resources_subgraph

canvas_and_images_graph_prepared_query = prepareQuery("""SELECT ?image_anno ?image WHERE {
    ?image_anno a oa:Annotation .
    ?image_anno oa:hasTarget ?canvas .
    ?image_anno oa:hasBody ?image .
    { ?image a dcmitype:Image . } UNION { ?image a dms:Image . } UNION {?image a dms:ImageChoice . } .
}""", initNs=ns)
# Gathers all data needed to display a given canvas (no annotations)
def canvas_and_images_graph(graph, canvas_uri):
    canvas_uri = URIRef(canvas_uri)

    canvas_graph = Graph()
    canvas_graph += graph.triples((canvas_uri, None, None))

    qres = graph.query(canvas_and_images_graph_prepared_query, initBindings={'canvas': canvas_uri})

    for image_anno, image in qres:
        canvas_graph += graph.triples((image_anno, None, None))
        canvas_graph += graph.triples((image, None, None))

    return canvas_graph

all_canvases_and_images_graph_prepared_query = prepareQuery("""SELECT DISTINCT ?canvas ?image_anno ?image WHERE {
    { ?canvas a sc:Canvas .} UNION { ?canvas a dms:Canvas .} .
    { ?image a dcmitype:Image . } UNION { ?image a dms:Image . } UNION {?image a dms:ImageChoice . } .
    ?image_anno a oa:Annotation .
    ?image_anno oa:hasTarget ?canvas .
    ?image_anno oa:hasBody ?image .
}""", initNs=ns)
# Gathers all data needed to display all canvases in a graph (no annotations)
def all_canvases_and_images_graph(graph):
    canvas_graph = Graph()

    qres = graph.query(all_canvases_and_images_graph_prepared_query, initBindings={})

    for canvas, image_anno, image in qres:
        canvas_graph += graph.triples((canvas, None, None))
        canvas_graph += graph.triples((image_anno, None, None))
        canvas_graph += graph.triples((image, None, None))

    return canvas_graph

# Gathers everything needed to display canvas, with annotations
def canvas_subgraph(graph, canvas_uri, project_uri):
    canvas_uri = URIRef(canvas_uri)

    canvas_graph = Graph()

    canvas_graph += canvas_and_images_graph(graph, canvas_uri)

    canvas_graph += resource_annotation_subgraph(graph, canvas_uri)

    canvas_graph += specific_resources_subgraph(graph, canvas_uri, project_uri)

    return canvas_graph

# Gathers everything needed to display a canvas and ensures that references in annotations point to actual data
def generate_canvas_graph(project_uri, canvas_uri):
    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    db_project_graph = Graph(store=rdfstore(), identifier=project_identifier)

    # Why did I do this? trying to copy to memory? (thecoloryes)
    project_graph = db_project_graph

    memory_graph = Graph()
    memory_graph += canvas_subgraph(project_graph, canvas_uri, project_uri)

    # isDescribedBy checking -- is this necessary? if so, is there a more efficient way to do this? 
    # Ensures texts have isDescribedBy triples
    for text in memory_graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        if (text, NS.ore.isDescribedBy, None) not in memory_graph:
            text_url = uris.url('semantic_store_project_texts', project_uri=project_uri, text_uri=text)
            memory_graph.add((text, NS.ore.isDescribedBy, text_url))
    # Ensures canvases have isDescribedBy triples
    for canvas in memory_graph.subjects(NS.rdf.type, NS.sc.Canvas):
        if (canvas, NS.ore.isDescribedBy, None) not in memory_graph:
            canvas_url = uris.url('semantic_store_project_canvases', project_uri=project_uri, canvas_uri=canvas)
            memory_graph.add((canvas, NS.ore.isDescribedBy, canvas_url))

    return memory_graph

# Creates the cached version of the canvas graph from info in the project
def create_canvas_graph(project_uri, canvas_uri):
    identifier = uris.uri("semantic_store_project_canvases", project_uri=project_uri, canvas_uri=canvas_uri)
    canvas_graph = Graph(rdfstore(), identifier=identifier)

    with transaction.commit_on_success():
        for t in generate_canvas_graph(project_uri, canvas_uri):
            canvas_graph.add(t)

        return canvas_graph

# Reads canvas from cache if possible; if not, creates cache
def read_canvas(request, project_uri, canvas_uri):
    identifier = uris.uri("semantic_store_project_canvases", project_uri=project_uri, canvas_uri=canvas_uri)
    graph = Graph(rdfstore(), identifier=identifier)
    
    if len(graph)==0:
            graph = create_canvas_graph(project_uri, canvas_uri)

    return graph

# Updates the canvas data in the project graph
# SHOULD: Also update the cached canvas graph
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

# Removes triples about canvas from project graph
# SHOULD: Also remove triples from canvas cache
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
