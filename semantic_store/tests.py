import os

import uuid

from django.utils import unittest
from django.utils.encoding import iri_to_uri
from django.utils.http import urlquote, urlquote_plus
from django.test.client import Client
from django.core.urlresolvers import reverse
from django.conf import settings

from rdflib.graph import ConjunctiveGraph, Graph
from rdflib import plugin, URIRef, Literal, BNode
from rdflib.store import Store, NO_STORE, VALID_STORE
from .namespaces import NS, ns, bind_namespaces
import rdfstore


def validate_return_anno(testcase, response, g, anno, body=None):
    rg = Graph()
    rg.parse(data=response.content)
    annotations = list(rg.subjects(NS.rdf['type'], NS.oa['Annotation']))
    testcase.assertEqual(len(annotations), 1)
    bodies = list(rg.subjects(NS.rdf['type'], NS.dctypes['Text']))
    testcase.assertEqual(len(bodies), 1)
    for s, p, o in g:
        if s == anno:
            s = annotations[0]
        elif s == body:
            s = bodies[0]
        if o == anno:
            o = annotations[0]
        elif o == body:
            o = bodies[0]
        testcase.assertTrue((s, p, o) in rg)
    testcase.assertTrue(len(list(rg.objects(annotations[0], NS.oa['annotatedAt'])))>0)

class TestProjects(unittest.TestCase):
    def test_add_manuscript_to_user_project(self):
        url = reverse('semantic_store_projects', 
                      kwargs=dict(identifier=self.project))
        g = Graph()
        bind_namespaces(g)
        project = BNode()
        title = Literal("This is a project title")
        g.add((project, NS.rdf['type'], NS.dms['Manifest']))
        g.add((project, NS.rdf['type'], NS.ore['Aggregation']))
        g.add((project, NS.dc['title'], title))
        g.add((project, NS.ore['aggregates'], self.manuscript))
        for t in self.g.triples((self.manuscript, NS.rdf['type'], None)):
            g.add(t)
        for t in self.g.triples((self.manuscript, NS.ore['isDescribedBy'], None)):
            g.add(t)

    def test_create_user_project(self):
        url = reverse('semantic_store_projects', kwargs=dict())
        g = Graph()
        bind_namespaces(g)
        project = BNode()
        title = Literal("This is a project title")
        g.add((project, NS.rdf['type'], NS.dcmitype['Collection']))
        g.add((project, NS.rdf['type'], NS.ore['Aggregation']))
        g.add((project, NS.dc['title'], title))
        data = g.serialize(initNs=ns)
        response = self.client.post(url, data=data, content_type="text/xml")
        self.assertEqual(response.status_code, 201)

        self.assertGreater(len(response.content), 0)
        response_g = Graph()
        response_g.parse(data=response.content)
        uris = list(response_g.subjects(NS.dc['title'], title))
        self.assertGreater(len(uris), 0)

        uri_assigned = uris[0]
        self.assertTrue((uri_assigned, NS.rdf['type'], NS.dcmitype['Collection']) \
                            in response_g)
        self.assertTrue((uri_assigned, NS.rdf['type'], NS.ore['Aggregation']) \
                            in response_g)
        print response_g.serialize()


    def partial_manuscript_graph(self, uri):
        manuscript_g = Graph()
        for s, p, o in self.g.triples((uri, NS.ore['aggregates'][:3], None)):
            manuscript_g.add((s, p, o))
            for t in self.g.triples((o, NS.rdf['type'], None)):
                manuscript_g.add(t)
            for t in self.g.triples((o, NS.ore['isDescribedBy'], None)):
                manuscript_g.add(t)
        for t in self.g.triples((uri, NS.rdf['type'], None)):
            manuscript_g.add(t)
        for t in self.g.triples((uri, NS.ore['isDescribedBy'], None)):
            manuscript_g.add(t)
        for t in self.g.triples((uri, NS.tei['institution'], None)):
            manuscript_g.add(t) 
        for t in  self.g.triples((uri, NS.dc['title'], None)):
            manuscript_g.add(t) 
        for t in self.g.triples((uri, NS.tei['country'], None)):
            manuscript_g.add(t) 
        for t in self.g.triples((uri, NS.dc['identifier'], None)):
            manuscript_g.add(t) 
        for t in self.g.triples((uri, NS.tei['repository'], None)):
            manuscript_g.add(t) 
        return manuscript_g
            
    def setUp(self):
        self.client = Client()
        root_uri = "http://dm.drew.edu/"
        self.project = URIRef(uuid.uuid4())
        fixture_filename = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                                        "semantic_store_test_fixture.xml")
        self.g = ConjunctiveGraph(rdfstore.rdfstore(),
                                  identifier=rdfstore.default_identifier)
        self.g.parse(fixture_filename)
        self.manuscript = URIRef("http://openmanifests.s3-website-us-east-1."+
                                 "amazonaws.com/BeineckeMS10/Manifest")
        self.partial_manuscript_g = self.partial_manuscript_graph(self.manuscript)

    def tearDown(self):
        self.g.close()


class TestPublicSingleAnnotation(unittest.TestCase):
    def test_embedded_textual_body_bnode(self):
        url = reverse('semantic_store_annotations', kwargs=dict())
        g = Graph()
        bind_namespaces(g)
        anno = BNode()
        body = BNode()
        g.add((anno, NS.rdf['type'], NS.oa['Annotation']))
        g.add((anno, NS.oa['hasTarget'], self.canvas))
        g.add((anno, NS.oa['hasBody'], body))
        g.add((body, NS.rdf['type'], NS.dctypes['Text']))
        g.add((body, NS.rdf['type'], NS.cnt['ContentAsText']))
        g.add((body, NS.cnt['chars'], self.shortText))
        g.add((body, NS.dc['format'], Literal("text/plain")))
        data = g.serialize(initNs=ns)
        response = self.client.post(url, data=data, content_type="text/xml")
        self.assertEqual(response.status_code, 201)
        validate_return_anno(self, response, g, anno, body)

    def test_embedded_textual_body_uuids(self):
        url = reverse('semantic_store_annotations', kwargs=dict())
        g = Graph()
        bind_namespaces(g)
        anno = URIRef(uuid.uuid4())
        body = URIRef(uuid.uuid4())
        g.add((anno, NS.rdf['type'], NS.oa['Annotation']))
        g.add((anno, NS.oa['hasTarget'], self.canvas))
        g.add((anno, NS.oa['hasBody'], body))
        g.add((body, NS.rdf['type'], NS.dctypes['Text']))
        g.add((body, NS.rdf['type'], NS.cnt['ContentAsText']))
        g.add((body, NS.cnt['chars'], self.shortText))
        g.add((body, NS.dc['format'], Literal("text/plain")))
        data = g.serialize(initNs=ns)
        response = self.client.post(url, data=data, content_type="text/xml")
        self.assertEqual(response.status_code, 201)
        validate_return_anno(self, response, g, anno, body)

    def test_body_uri(self):
        url = reverse('semantic_store_annotations', kwargs=dict())
        g = Graph()
        bind_namespaces(g)
        anno = URIRef(uuid.uuid4())
        body = URIRef(uuid.uuid4())
        g.add((anno, NS.rdf['type'], NS.oa['Annotation']))
        g.add((anno, NS.oa['hasTarget'], self.canvas))
        g.add((anno, NS.oa['hasBody'], body))
        g.add((body, NS.rdf['type'], NS.dctypes['Text']))
        data = g.serialize(initNs=ns)
        response = self.client.post(url, data=data, content_type="text/xml")
        self.assertEqual(response.status_code, 201)
        validate_return_anno(self, response, g, anno, body)

    def test_specific_target_bnode(self):
        # See http://www.openannotation.org/spec/core/specific.html#Specific
        # and http://www.openannotation.org/spec/core/publishing.html#Embedding
        url = reverse('semantic_store_annotations', kwargs=dict())
        g = Graph()
        bind_namespaces(g)
        anno = BNode()
        target = BNode()
        svg = BNode()
        g.add((anno, NS.rdf['type'], NS.oa['Annotation']))
        g.add((anno, NS.oa['hasTarget'], target))
        g.add((target, NS.rdf['type'], NS.oa['SpecificResource']))
        g.add((target, NS.oa['hasSelector'], svg))
        g.add((svg, NS.rdf['type'], NS.oa['SvgSelector']))
        g.add((svg, NS.rdf['type'], NS.cnt['ContentAsText']))
        g.add((svg, NS.cnt['chars'], 
               Literal("<circle cx='300' cy='200' r='100'/>")))
        g.add((svg, NS.cnt['characterEncoding'], Literal("utf-8")))
        data = g.serialize(initNs=ns)
        response = self.client.post(url, data=data, content_type="text/xml")
        self.assertEqual(response.status_code, 201)

    def test_specific_target_uuid(self):
        # See http://www.openannotation.org/spec/core/specific.html#Specific
        # and http://www.openannotation.org/spec/core/publishing.html#Embedding
        url = reverse('semantic_store_annotations', kwargs=dict())
        g = Graph()
        bind_namespaces(g)
        anno = URIRef(uuid.uuid4())
        target = URIRef(uuid.uuid4())
        svg = URIRef(uuid.uuid4())
        g.add((anno, NS.rdf['type'], NS.oa['Annotation']))
        g.add((anno, NS.oa['hasTarget'], target))
        g.add((target, NS.rdf['type'], NS.oa['SpecificResource']))
        g.add((target, NS.oa['hasSelector'], svg))
        g.add((svg, NS.rdf['type'], NS.oa['SvgSelector']))
        g.add((svg, NS.rdf['type'], NS.cnt['ContentAsText']))
        g.add((svg, NS.cnt['chars'], 
               Literal("<circle cx='300' cy='200' r='100'/>")))
        g.add((svg, NS.cnt['characterEncoding'], Literal("utf-8")))
        data = g.serialize(initNs=ns)
        response = self.client.post(url, data=data, content_type="text/xml")
        self.assertEqual(response.status_code, 201)

    def tearDown(self):
        self.g.close()

    def setUp(self):
        self.client = Client()
        fixture_filename = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                                        "semantic_store_test_fixture.xml")
        self.g = ConjunctiveGraph(rdfstore.rdfstore(),
                                  identifier=rdfstore.default_identifier)
        self.g.parse(fixture_filename)
        canvases = self.g.subjects(URIRef(NS.rdf['type']), URIRef(NS.dms['Canvas']))
        self.canvas = list(canvases)[0]
        self.shortText = Literal("This is a short text.")
        self.longText = """
                        Information concerning the general content type (Text, Image, Audio, Video etc) of the Annotation's related resources is useful to applications. This is expressed using typing of the Body and Target resources, and thereby allows the client to easily determine if and how it can render the resource without maintaining a long list of media types. For example, an HTML5 based client can use the information that the Target resource is an image to generate a <img> element with the appropriate src attribute, rather than having to maintain a list of all of the image media types. The creator of the Annotation may also not know the exact media type of the Body or Target, but should at least be able to provide this general class.
                        """

class TestAuthenticatedSingleAnnotation(unittest.TestCase):
    pass
