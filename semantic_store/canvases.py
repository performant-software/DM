from django.db import transaction

from rdflib.exceptions import ParserError
from rdflib import Literal, URIRef, Graph
from rdflib.plugins.sparql import prepareQuery

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris, users
from semantic_store.utils import parse_request_into_graph, NegotiatedGraphResponse, metadata_triples, list_subgraph, timed_block
from semantic_store.annotations import resource_annotation_subgraph, canvas_annotation_lists, annotation_list_items, annotation_subgraph
from semantic_store.specific_resources import specific_resources_subgraph

def canvas_and_images_graph(graph, canvas_uri):
    canvas_uri = URIRef(canvas_uri)

    canvas_graph = Graph()
    canvas_graph += graph.triples((canvas_uri, None, None))

    qres = graph.query("""SELECT ?image_anno ?image WHERE {
        ?image_anno a oa:Annotation .
        ?image_anno oa:hasTarget %s .
        ?image_anno oa:hasBody ?image .
        ?image a ?type .
        FILTER(?type = dcmitype:Image || ?type = dms:Image || ?type = dms:ImageChoice) .
    }""" % (canvas_uri.n3()), initNs=ns)

    for image_anno, image in qres:
        canvas_graph += graph.triples_choices(([image_anno, image], None, None))

    return canvas_graph

def all_canvases_and_images_graph(graph):
    canvas_graph = Graph()

    qres = graph.query("""SELECT DISTINCT ?canvas ?image_anno ?image WHERE {
        ?canvas a ?canvasType .
        ?image a ?imageType .
        FILTER(?canvasType = sc:Canvas || ?canvasType = dms:Canvas) .
        FILTER(?imageType = dcmitype:Image || ?imageType = dms:Image || ?imageType = dms:ImageChoice) .
        ?image_anno a oa:Annotation .
        ?image_anno oa:hasTarget ?canvas .
        ?image_anno oa:hasBody ?image .
    }""", initBindings={}, initNs=ns)

    for canvas, image_anno, image in qres:
        canvas_graph += graph.triples_choices(([canvas, image_anno, image], None, None))

    return canvas_graph

def anno_lists_subgraph(graph, canvas_uri, project_uri):
    subgraph = Graph()

    lists_uri = graph.value(canvas_uri, NS.sc.hasLists)
    if lists_uri:
        subgraph += list_subgraph(graph, lists_uri)

        for anno_list in canvas_annotation_lists(graph, canvas_uri):
            subgraph += list_subgraph(graph, anno_list)

            hasAnnotations_uri = graph.value(anno_list, NS.sc.hasAnnotations)
            if hasAnnotations_uri:
                subgraph += list_subgraph(graph, hasAnnotations_uri)

                for anno in annotation_list_items(graph, anno_list):
                    subgraph += annotation_subgraph(graph, anno)

                    for s, p, resource in graph.triples_choices((anno, [NS.oa.hasBody, NS.oa.hasTarget], None)):
                        if (resource, NS.rdf.type, NS.cnt.ContentAsText) in graph and (resource, NS.rdf.type, NS.dcmitype.Text) not in graph:
                            transcription_url = URIRef(uris.url('semantic_store_canvas_transcription', project_uri=project_uri, canvas_uri=canvas_uri, transcription_uri=resource))
                            subgraph.add((resource, NS.ore.isDescribedBy, transcription_url))

    return subgraph

def canvas_subgraph(graph, canvas_uri, project_uri):
    canvas_uri = URIRef(canvas_uri)

    canvas_graph = Graph()

    canvas_graph += canvas_and_images_graph(graph, canvas_uri)

    canvas_graph += resource_annotation_subgraph(graph, canvas_uri)

    canvas_graph += anno_lists_subgraph(graph, canvas_uri, project_uri)

    canvas_graph += specific_resources_subgraph(graph, canvas_uri, project_uri)

    return canvas_graph

def generate_canvas_graph(project_uri, canvas_uri):
    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    db_project_graph = Graph(store=rdfstore(), identifier=project_identifier)

    project_graph = db_project_graph

    memory_graph = Graph()
    memory_graph += canvas_subgraph(project_graph, canvas_uri, project_uri)

    for text in memory_graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        if (text, NS.ore.isDescribedBy, None) not in memory_graph:
            text_url = uris.url('semantic_store_project_texts', project_uri=project_uri, text_uri=text)
            memory_graph.add((text, NS.ore.isDescribedBy, text_url))

    for canvas in memory_graph.subjects(NS.rdf.type, NS.sc.Canvas):
        if (canvas, NS.ore.isDescribedBy, None) not in memory_graph:
            canvas_url = uris.url('semantic_store_project_canvases', project_uri=project_uri, canvas_uri=canvas)
            memory_graph.add((canvas, NS.ore.isDescribedBy, canvas_url))

    return memory_graph

def update_canvas_graph(project_uri, canvas_uri):
    identifier = uris.uri("semantic_store_project_canvases", project_uri=project_uri, canvas_uri=canvas_uri)
    canvas_graph = Graph(rdfstore(), identifier=identifier)

    for t in generate_canvas_graph(project_uri, canvas_uri):
        canvas_graph.add(t)

        return canvas_graph

def read_canvas(request, project_uri, canvas_uri):
    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    db_project_graph = Graph(store=rdfstore(), identifier=project_identifier)

    return canvas_subgraph(db_project_graph, canvas_uri, project_uri)

def update_canvas(project_uri, canvas_uri, input_graph):
    project_uri = URIRef(project_uri)
    canvas_uri = URIRef(canvas_uri)

    project_identifier = uris.uri('semantic_store_projects', uri=project_uri)
    project_graph = Graph(store=rdfstore(), identifier=project_identifier)
    project_metadata_g = Graph(rdfstore(), identifier=uris.project_metadata_graph_identifier(project_uri))

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

    for t in input_graph:
        if t in project_graph:
            project_graph.remove(t)
            project_metadata_g.remove(t)
            removed_graph.add(t)

    return removed_graph

def create_canvas_from_upload(graph, uploaded_image, uri, user=None, title=None):
    graph.add((uri, NS.rdf.type, NS.sc.Canvas))

    if title:
        graph.add((uri, NS.dc.title, Literal(title)))
        graph.add((uri, NS.rdfs.label, Literal(title)))

    if user:
        user_uri = users.user_uri(user=user)
        graph.add((uri, NS.dc.creator, user_uri))

    image_uri = uris.absolutize(uploaded_image.imagefile.url)
    graph.add((image_uri, NS.rdf.type, NS.dcmitype.Image))

    width = Literal(uploaded_image.imagefile.width)
    height = Literal(uploaded_image.imagefile.height)
    graph.add((image_uri, NS.exif.width, width))
    graph.add((image_uri, NS.exif.height, height))
    graph.add((uri, NS.exif.width, width))
    graph.add((uri, NS.exif.height, height))

    anno_uri = uris.uuid()
    graph.add((anno_uri, NS.rdf.type, NS.oa.Annotation))
    graph.add((anno_uri, NS.oa.motivatedBy, NS.sc.painting))
    graph.add((anno_uri, NS.oa.hasBody, image_uri))
    graph.add((anno_uri, NS.oa.hasTarget, uri))

    return graph
