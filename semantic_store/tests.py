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


class TestCreateSingleAnnotation(unittest.TestCase):

    def test_embedded_textual_body_bnode(self):
        url = reverse('semantic_store_annotations', 
                      kwargs=dict(dest_graph_uri=self.dest_graph_uri))
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

    def test_embedded_textual_body_uuids(self):
        url = reverse('semantic_store_annotations', 
                      kwargs=dict(dest_graph_uri=self.dest_graph_uri))
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


    def test_specific_target_bnode(self):
        # See http://www.openannotation.org/spec/core/specific.html#Specific
        # and http://www.openannotation.org/spec/core/publishing.html#Embedding
        url = reverse('semantic_store_annotations', 
                      kwargs=dict(dest_graph_uri=self.dest_graph_uri))
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
        url = reverse('semantic_store_annotations', 
                      kwargs=dict(dest_graph_uri=self.dest_graph_uri))
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
        self.root_uri = "http://dm.drew.edu/"
        self.dest_graph_uri = uuid.uuid4()
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
