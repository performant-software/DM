from rdflib import URIRef, BNode

from .namespaces import NS


class BaseValidator(object):
    def __init__(self, dest_graph, display_name):
        self._dest_graph = dest_graph
        self._display_name = display_name
        self.failure = ""
        self._failures = []
        self.__nonzero__ = False
    
    def fail(self, node):
        self.failure = "%s:\n" % node
        for i in self._failures:
            self.failure += "%s\n" % i
        self.__nonzero__ = False
        return False
        
    def succeed(self, node):
        self.failure = ""
        self._failures = []
        self.__nonzero__ = True
        return True

    def has_types(self, g, node, types):
        all_types = True
        for rdftype in types:
            if not (node, NS.rdf['type'], rdftype) in g:
                all_types = False
                self._failures.append("%s must have type %s." % 
                                      (self._display_name, rdftype))
        return all_types

    def has_title(self, g, node, title=None):
        if not (node, NS.dc['title'], title) in g:
            if title:
                self._failures.append("%s must have a %s property of %s." % 
                                      (self._display_name, NS.dc['title'], title))
            else:
                self._failures.append("%s must have a %s property." % 
                                      (self._display_name, NS.dc['title']))
            return False
        return True


class ProjectValidator(BaseValidator):
    def valid(self, g, project):
        self.has_types(g, project, (NS.dcmitype['Collection'], NS.ore['Aggregation'],))
        self.has_title(g, project)
        return self


class AnnotationValidator(BaseValidator):
    def exists(self, anno_uri):
        if (anno_uri, None, None) in self._dest_graph:
            self._failures.append("Annotation %s already exists in collection %s." \
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


    def valid(self, g, anno_uri):
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
    
    
