import os

from django.utils import unittest
from django.test.client import Client
from django.core.urlresolvers import reverse
from django.conf import settings

from rdflib.graph import ConjunctiveGraph, Graph
from rdflib import plugin, URIRef, Literal, BNode
from rdflib.store import Store, NO_STORE, VALID_STORE
from .namespaces import NS, ns, bind_namespaces
import rdfstore


class TestSingleComment(unittest.TestCase):

    def test_annotation_embedded_textual_body(self):
        url = reverse('semantic_store_annotations', 
                      kwargs=dict(collection=self.collection_uri))
        g = Graph()
        bind_namespaces(g)
        annoBNode = BNode()
        bodyBNode = BNode()
        g.add((annoBNode, NS.rdf['type'], NS.oa['Annotation']))
        g.add((annoBNode, NS.oa['hasTarget'], self.canvas))
        g.add((annoBNode, NS.oa['hasBody'], bodyBNode))
        g.add((bodyBNode, NS.rdf['type'], NS.dctypes['Text']))
        g.add((bodyBNode, NS.rdf['type'], NS.cnt['ContentAsText']))
        g.add((bodyBNode, NS.cnt['chars'], self.shortText))
        g.add((bodyBNode, NS.dc['format'], Literal("text/plain")))
        data = g.serialize(initNs=ns)

        response = self.client.post(url, data=data, content_type="text/xml")

        # Check that the response is 200 OK.
        self.assertEqual(response.status_code, 200)


    def tearDown(self):
        self.g.close()
        

    def setUp(self):
        self.client = Client()
        self.root_uri = "http://dm.drew.edu/"
        self.collection_uri = "http://dm.drew.edu/testproject"
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
