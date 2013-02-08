from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef, BNode, Literal, RDF
from rdflib.namespace import Namespace

from .namespaces import NS, ns


class AnnotationValidator(object):
    def __init__(self, dest_graph):
        self.failure = ""
        self._dest_graph = dest_graph
        self._failures = []
        self.__nonzero__ = False

    def exists(self, anno_uri):
        if (anno_uri, None, None) in self._dest_graph:
            self._failures.append("Annotation %s exists in collection %s." \
                                      % (anno_uri, self._dest_graph.identifier))
            return False

    def has_anno_class(self, g, anno_uri):
        t = (anno_uri, NS.rdf['type'], NS.oa['Annotation'])
        if not ((anno_uri, NS.rdf['type'], NS.oa['Annotation']) in g):
            self._failures.append("Expected class designation %s" %
                                  NS.oa['Annotation'])
            return False
        return True

    def bodies(self, g, anno_uri):
        return g.objects(anno_uri, NS.oa['hasBody'])

    def targets(self, g, anno_uri):
        return g.objects(anno_uri, NS.oa['hasTarget'])

    def valid_body(self, g, anno_uri, body):
        if (type(body) is not BNode) and (type(body) is not URIRef):
            self._failures.append("Body not rdf.")
            return False
        if (body, NS.rdf['type'], NS.cnt['ContentAsText']) in g:
            cnt_chars = g.objects(body, NS.cnt['chars'])
            num_cnt_chars = len(list(cnt_chars))
            if num_cnt_chars != 1:
                msg = "Embedded body MUST have exactly one % property. It has %s " % \
                    (NS.cnt['chars'], num_cnt_chars)
                self._failures.append(msg)
                return False
        return True

    def valid_target(self, g, anno_uri, target):
        if (type(target) is not BNode) and (type(target) is not URIRef):
            self._failures.append("Target not rdf.")
            return False
        return True

    def fail(self, anno_uri):
        self.failure = "%s:\n" % anno_uri
        for i in self._failures:
            self.failure += "%s\n" % i
        self.__nonzero__ = False
        return False
        
    def succeed(self, anno_uri):
        self.failure = ""
        self._failures = []
        self.__nonzero__ = True
        return True

    def validate(self, g, anno_uri):
        if self.exists(anno_uri):
            return self.fail(anno_uri)
            
        if not self.has_anno_class(g, anno_uri):
            return self.fail(anno_uri)

        one_target = False
        for target in self.targets(g, anno_uri):
            one_target = True
            if not self.valid_target(g, anno_uri, target):
                return self.fail(anno_uri)
        if not one_target:
            return self.fail(anno_uri)

        for body in self.bodies(g, anno_uri):
            if not self.valid_body(g, anno_uri, body):
                return self.fail(anno_uri)

        return self.succeed(anno_uri)
    
    
